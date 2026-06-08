// Player / controller session — the AirConsole-style seam.
//
// The TV is the "screen"; phones join as "controllers" by entering a short
// room code at a join URL. This module owns the room code and the roster of
// connected players, and exposes a tiny event API the UI renders from.
//
// The transport is intentionally abstracted: `connect()` is a stub today
// (so the launcher runs with no backend). Drop in a WebSocket / WebRTC /
// AirConsole client there later without touching the UI.

export class PlayerSession extends EventTarget {
  constructor() {
    super();
    this.players = [];
    this.roomCode = makeRoomCode();
  }

  /** Begin accepting controllers. Replace the body with a real transport. */
  connect() {
    // TODO: open transport, register the room, resolve when the screen is live.
    // The transport should call _add()/_remove() as controllers come and go.
    this.dispatchEvent(new CustomEvent("ready", { detail: { roomCode: this.roomCode } }));
    return this;
  }

  _add(player) {
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
