// Stats client — the launcher (the "screen") is the one device that sees every
// game and every player, so it's where console-wide metrics are recorded. These
// helpers POST small beacons to web-api's stats API (same origin as the app in
// single-origin serving), which writes them to the SQLite store.
//
// Every call is fire-and-forget: a game must never stall or fail because the
// stats write didn't land, so errors are swallowed. Uses sendBeacon when the
// page might be unloading, else fetch.

function beacon(path, body) {
  try {
    const url = `${location.origin}${path}`;
    const json = JSON.stringify(body);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([json], { type: "application/json" }));
    } else {
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: json, keepalive: true })
        .catch(() => {});
    }
  } catch { /* stats are best-effort; never break gameplay */ }
}

export const Stats = {
  /** A game was launched (popularity + solo-vs-group signal). */
  play(gameId, roomCode, playerCount) {
    beacon("/api/play", { gameId, roomCode, playerCount });
  },

  /** A leaderboard game finished with a score. */
  score(gameId, playerName, score, roomCode) {
    beacon("/api/score", { gameId, playerName, score, roomCode });
  },

  /** A 2-player game finished (win or draw). */
  result(gameId, outcome, winnerSlot, winnerName, players, roomCode) {
    beacon("/api/result", { gameId, outcome, winnerSlot, winnerName, players, roomCode });
  },
};
