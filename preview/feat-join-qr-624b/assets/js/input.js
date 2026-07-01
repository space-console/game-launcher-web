// Unified input layer.
//
// Normalises three input sources into a single stream of intents
// (up/down/left/right/enter/back) so the rest of the app never cares
// whether the user is on a TV remote, a keyboard, or a gamepad:
//
//   1. Keyboard / TV remote  — keydown, incl. platform-specific Back keys.
//   2. Gamepad API           — D-pad + face buttons, polled each frame.
//                              (Also the seam for AirConsole-style phone pads.)

// Platform Back/Return key codes. Standard browsers send Escape (27) or the
// browser's history back; TV platforms use vendor codes:
//   webOS  → 461,  Tizen → 10009,  some Android TV remotes → 4.
const BACK_KEYS = new Set([27, 8, 461, 10009, 4]);

const KEY_MAP = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  Enter: "enter", " ": "enter",
  // WASD for desktop testing.
  w: "up", a: "left", s: "down", d: "right",
};

export class Input {
  constructor() {
    this.handlers = new Set();
    this._gpPrev = {};
    this._onKey = this._onKey.bind(this);
    this._poll = this._poll.bind(this);
  }

  /** Subscribe to intents. handler(intent: string) => void. Returns unsubscribe. */
  on(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  start() {
    window.addEventListener("keydown", this._onKey);
    if ("getGamepads" in navigator) requestAnimationFrame(this._poll);
    return this;
  }

  _emit(intent) {
    for (const h of this.handlers) h(intent);
  }

  _onKey(e) {
    if (BACK_KEYS.has(e.keyCode)) {
      e.preventDefault();
      this._emit("back");
      return;
    }
    const intent = KEY_MAP[e.key];
    if (intent) {
      e.preventDefault();
      this._emit(intent);
    }
  }

  _poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad) continue;
      // Standard mapping: 12 up, 13 down, 14 left, 15 right, 0 = A, 1 = B.
      this._edge(pad.index, "up", pressed(pad, 12) || axis(pad, 1) < -0.5);
      this._edge(pad.index, "down", pressed(pad, 13) || axis(pad, 1) > 0.5);
      this._edge(pad.index, "left", pressed(pad, 14) || axis(pad, 0) < -0.5);
      this._edge(pad.index, "right", pressed(pad, 15) || axis(pad, 0) > 0.5);
      this._edge(pad.index, "enter", pressed(pad, 0));
      this._edge(pad.index, "back", pressed(pad, 1));
    }
    requestAnimationFrame(this._poll);
  }

  // Emit only on the rising edge so a held button doesn't spam intents.
  _edge(padIndex, intent, isDown) {
    const key = padIndex + ":" + intent;
    if (isDown && !this._gpPrev[key]) this._emit(intent);
    this._gpPrev[key] = isDown;
  }
}

function pressed(pad, i) {
  const b = pad.buttons[i];
  return b ? b.pressed || b.value > 0.5 : false;
}
function axis(pad, i) {
  return pad.axes[i] || 0;
}
