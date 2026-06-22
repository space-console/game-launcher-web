// Player session — the WebRTC *hub*. The TV is the "screen"; phones join as
// "controllers" by entering a short room code. This module registers the room
// with the signaling service, accepts each phone as its own peer connection
// (star topology — the TV holds N connections), and re-emits the intents they
// send as `intent` events. The UI renders from the same `ready` / `change`
// events as before (plus `error` if the relay is unreachable).
//
// Gameplay intents arrive over each phone's DataChannel peer-to-peer; the
// signaling service is only used to set the connections up.

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export class PlayerSession extends EventTarget {
  constructor() {
    super();
    this.players = [];
    this.roomCode = makeRoomCode(); // proposed; the server confirms it on connect
    this._ws = null;
    this._peers = new Map(); // guestId -> { pc, dc, name, pendingIce: [] }
    this._count = 0;
  }

  /** Register the room and begin accepting controllers. */
  connect() {
    const ws = new WebSocket(signalingUrl());
    this._ws = ws;
    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ type: "create", code: this.roomCode }));
    });
    ws.addEventListener("message", (ev) => this._onMessage(JSON.parse(ev.data)));
    ws.addEventListener("error", () => {
      this.dispatchEvent(new CustomEvent("error", { detail: { reason: "signal-unreachable" } }));
    });
    return this;
  }

  async _onMessage(msg) {
    if (msg.type === "created") {
      this.roomCode = msg.code;
      this.dispatchEvent(new CustomEvent("ready", { detail: { roomCode: this.roomCode } }));
      return;
    }
    if (msg.type === "join") {
      this._addPeer(msg.from, msg.name);
      return;
    }
    if (msg.type === "leave") {
      this._dropPeer(msg.from);
      return;
    }
    if (msg.type === "signal") {
      const peer = this._peers.get(msg.from);
      if (!peer) return;
      const { pc } = peer;
      if (msg.data.sdp) {
        // The phone is the offerer; we answer.
        await pc.setRemoteDescription(msg.data.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this._signal(msg.from, { sdp: pc.localDescription });
        for (const c of peer.pendingIce) await pc.addIceCandidate(c);
        peer.pendingIce = [];
      } else if (msg.data.ice) {
        if (pc.remoteDescription) await pc.addIceCandidate(msg.data.ice);
        else peer.pendingIce.push(msg.data.ice); // buffer until the offer arrives
      }
    }
  }

  _addPeer(id, name) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const peer = { pc, dc: null, name: name || `Player ${++this._count}`, pendingIce: [] };
    this._peers.set(id, peer);

    pc.addEventListener("icecandidate", (e) => {
      if (e.candidate) this._signal(id, { ice: e.candidate });
    });
    pc.addEventListener("datachannel", (e) => {
      peer.dc = e.channel;
      // Only count a controller as present once its channel is actually open.
      peer.dc.addEventListener("open", () => this._add({ id, name: peer.name }));
      peer.dc.addEventListener("message", (m) =>
        this.dispatchEvent(new CustomEvent("intent", { detail: { intent: String(m.data), from: id } }))
      );
      peer.dc.addEventListener("close", () => this._dropPeer(id));
    });
    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") this._dropPeer(id);
    });
  }

  _dropPeer(id) {
    const peer = this._peers.get(id);
    if (!peer) return;
    try { peer.pc.close(); } catch { /* already closing */ }
    this._peers.delete(id);
    this._remove(id);
  }

  _signal(to, data) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ type: "signal", to, data }));
    }
  }

  _add(player) {
    if (this.players.some((p) => p.id === player.id)) return;
    this.players.push(player);
    this.dispatchEvent(new CustomEvent("change", { detail: { players: this.players } }));
  }

  _remove(id) {
    this.players = this.players.filter((p) => p.id !== id);
    this.dispatchEvent(new CustomEvent("change", { detail: { players: this.players } }));
  }
}

// A,2..9 minus easily-confused characters (no 0/O/1/I) — easy to type on a phone.
function makeRoomCode(len = 4) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  // crypto.getRandomValues is widely supported on TV browsers; fall back if not.
  const buf = new Uint32Array(len);
  if (globalThis.crypto && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < len; i++) code += alphabet[buf[i] % alphabet.length];
  } else {
    for (let i = 0; i < len; i++) code += alphabet[(i * 7 + 3) % alphabet.length];
  }
  return code;
}

// Where the signaling service lives. Defaults to the page's host on :8080 so
// serving the launcher from a LAN IP lets phones reach it automatically;
// override with ?signal=ws://<host>:<port>.
function signalingUrl() {
  const override = new URLSearchParams(location.search).get("signal");
  if (override) return override;
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.hostname || "localhost"}:8080`;
}
