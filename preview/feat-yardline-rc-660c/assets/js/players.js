// Player session — the WebRTC *hub*. The TV is the "screen"; phones join as
// "controllers" by entering a short room code. This module registers the room
// with the signaling service, accepts each phone as its own peer connection
// (star topology — the TV holds N connections), and re-emits the intents they
// send as `intent` events. The UI renders from the same `ready` / `change`
// events as before (plus `error` if the relay is unreachable).
//
// Gameplay intents arrive over each phone's DataChannel peer-to-peer; the
// signaling service is only used to set the connections up.

// RTCPeerConnection config. Defaults to free public STUN; an optional TURN relay
// can be added per device WITHOUT code changes via query params (mirrors ?signal=):
//   ?turn=turn:<host>:3478&turnuser=<u>&turncred=<p>   add a TURN server
//   ?relay=1                                           force relay-only (to verify TURN)
// The same URL points at a local coturn now or a hosted/college TURN later.
function rtcConfig() {
  const q = new URLSearchParams(location.search);
  const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
  const turn = q.get("turn");
  if (turn) {
    // Comma-separated list → one server with multiple URLs (ICE tries each).
    const urls = turn.split(",").map((s) => s.trim()).filter(Boolean);
    iceServers.push({ urls, username: q.get("turnuser") || "", credential: q.get("turncred") || "" });
  }
  const config = { iceServers };
  if (q.get("relay") === "1") config.iceTransportPolicy = "relay";
  return config;
}

export class PlayerSession extends EventTarget {
  constructor() {
    super();
    this.players = [];
    this.roomCode = makeRoomCode(); // proposed; the server confirms it on connect
    this._ws = null;
    this._peers = new Map(); // guestId -> { pc, dc, name, slot, pendingIce: [] }
    this._count = 0;
    this._slots = new Map();      // guestId -> seat number (1-based)
    this._seatByName = new Map(); // name -> seat, so a rejoin restores the seat
    this._leadId = null;          // the "lead" player who drives the launcher menu
    this._controls = null;        // latest control layout to hand new/all controllers
  }

  /** The lead player's id — the one allowed to navigate menus and switch games. */
  get leadId() { return this._leadId; }

  /**
   * Seat for a controller. A rejoining player (same name, and their old seat now
   * free) gets their seat back — so P1 who dropped mid-game returns as P1.
   * Otherwise the smallest free seat.
   */
  _allocSlot(id, name) {
    if (this._slots.has(id)) return this._slots.get(id);
    const taken = new Set(this._slots.values());
    const key = normName(name);
    let slot;
    if (key && this._seatByName.has(key) && !taken.has(this._seatByName.get(key))) {
      slot = this._seatByName.get(key); // restore this player's former seat
    } else {
      slot = 1;
      while (taken.has(slot)) slot++;
    }
    this._slots.set(id, slot);
    if (key) this._seatByName.set(key, slot);
    return slot;
  }

  /** Set the active control layout and push it to every connected controller. */
  setControls(msg) {
    this._controls = msg;
    const data = JSON.stringify(msg);
    for (const peer of this._peers.values()) {
      if (peer.dc && peer.dc.readyState === "open") {
        try { peer.dc.send(data); } catch { /* channel closing */ }
      }
    }
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
    const pc = new RTCPeerConnection(rtcConfig());
    const peer = { pc, dc: null, name: name || `Player ${++this._count}`, pendingIce: [] };
    this._peers.set(id, peer);

    pc.addEventListener("icecandidate", (e) => {
      if (e.candidate) this._signal(id, { ice: e.candidate });
    });
    pc.addEventListener("datachannel", (e) => {
      peer.dc = e.channel;
      // Only count a controller as present once its channel is actually open.
      peer.dc.addEventListener("open", () => {
        this._add({ id, name: peer.name });
        // Hand the newcomer the current control layout so it renders the right pad.
        if (this._controls) {
          try { peer.dc.send(JSON.stringify(this._controls)); } catch { /* closing */ }
        }
      });
      peer.dc.addEventListener("message", (m) => {
        // Two payload shapes share this channel:
        //  - bare string intents ("up", "enter", "gas:release") — every game;
        //  - a compact analog frame `{t:"a",s,g,b,h}` — driving games only.
        // Analog frames are JSON objects marked t:"a"; anything else is an intent
        // string, so existing games are untouched.
        const analog = parseAnalog(m.data);
        if (analog) {
          this.dispatchEvent(new CustomEvent("analog", {
            detail: {
              steer: analog.s, throttle: analog.g, brake: analog.b, handbrake: !!analog.h,
              from: id, slot: peer.slot || 1,
            },
          }));
        } else {
          this.dispatchEvent(new CustomEvent("intent", {
            detail: { intent: String(m.data), from: id, slot: peer.slot || 1, lead: id === this._leadId },
          }));
        }
      });
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
    player.slot = this._allocSlot(player.id, player.name);
    const peer = this._peers.get(player.id);
    if (peer) peer.slot = player.slot; // so relayed intents carry the seat
    this.players.push(player);
    if (!this._leadId) this._leadId = player.id; // first in becomes lead
    this._emitChange();
  }

  _remove(id) {
    this.players = this.players.filter((p) => p.id !== id);
    this._slots.delete(id); // free the seat (the name→seat map keeps it for rejoin)
    // If the lead left, promote the earliest remaining player (P1 leaves → P2 leads).
    if (id === this._leadId) this._leadId = this.players.length ? this.players[0].id : null;
    this._emitChange();
  }

  // Stamp the current lead onto each player and announce the roster.
  _emitChange() {
    this.players.sort((a, b) => a.slot - b.slot);
    for (const p of this.players) p.lead = p.id === this._leadId;
    this.dispatchEvent(new CustomEvent("change", { detail: { players: this.players } }));
  }
}

// Decode an analog controller frame, or null if the payload is a plain intent
// string. Frames are JSON objects tagged `t:"a"`; the `{` fast-path avoids
// JSON.parse on the common intent-string case.
function parseAnalog(data) {
  if (typeof data !== "string" || data.charCodeAt(0) !== 123 /* { */) return null;
  try {
    const o = JSON.parse(data);
    return o && o.t === "a" ? o : null;
  } catch {
    return null;
  }
}

// Normalize a display name for seat-restore matching (case/space-insensitive).
// Empty/absent names don't reserve a seat (nothing to match a rejoin against).
function normName(name) {
  return (name || "").trim().toLowerCase();
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

// Where the signaling service lives. Defaults to the page's OWN origin
// (host:port), so serving the app + signaling from one server (web-api with
// STATIC_DIR) just works — and phones can reach it, since iOS only lets page JS
// reach the origin host:port. Override with ?signal=ws://<host>:<port> when the
// signaling service runs on a different host/port.
function signalingUrl() {
  const override = new URLSearchParams(location.search).get("signal");
  if (override) return override;
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host || "localhost:8080"}`;
}
