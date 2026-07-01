// Space Console launcher — entry point.
// Renders the catalog, wires input → spatial navigation → launch, and shows
// the AirConsole-style player roster.

import { games } from "./games.js?v=f61fccb4-fc82-4ca1-b8b9-ac4cbdd1f39f";
import { SpatialNav } from "./spatial-nav.js?v=f61fccb4-fc82-4ca1-b8b9-ac4cbdd1f39f";
import { Input } from "./input.js?v=f61fccb4-fc82-4ca1-b8b9-ac4cbdd1f39f";
import { PlayerSession } from "./players.js?v=f61fccb4-fc82-4ca1-b8b9-ac4cbdd1f39f";

const nav = new SpatialNav();
const input = new Input();
const session = new PlayerSession();

const grid = document.getElementById("gameGrid");
const hero = document.getElementById("hero");
const gameFrame = document.getElementById("gameFrame");

// Launcher mode: "menu" drives spatial navigation; "game" means a game is
// running in the shell iframe and intents are relayed to it instead.
let mode = "menu";

// ---- Render game tiles ----------------------------------------------------
function renderGames() {
  grid.innerHTML = "";
  for (const game of games) {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.dataset.focusable = "";
    tile.dataset.gameId = game.id;
    tile.setAttribute("role", "listitem");
    tile.setAttribute("tabindex", "-1");
    tile.setAttribute("aria-label", game.title);
    tile.style.backgroundImage = game.art;
    tile.innerHTML = `
      <div class="tile__body">
        <div class="tile__title">${escapeHtml(game.title)}</div>
        <div class="tile__players">${playersLabel(game)}</div>
      </div>`;

    tile.addEventListener("sn:focus", () => renderHero(game));
    tile.addEventListener("click", () => launch(game));
    grid.appendChild(tile);
  }
}

// ---- Hero (reflects the focused game) ------------------------------------
function renderHero(game) {
  hero.style.backgroundImage = game.art;
  hero.innerHTML = `
    <div class="hero__inner">
      <div class="hero__tag">${escapeHtml(game.tagline)}</div>
      <h1 class="hero__title">${escapeHtml(game.title)}</h1>
      <p class="hero__desc">${escapeHtml(game.description)}</p>
      <div class="hero__meta">
        <span>${playersLabel(game)}</span>
        <span>Press Enter to launch</span>
      </div>
    </div>`;
}

// ---- Game shell -----------------------------------------------------------
// Launch into a persistent iframe instead of navigating away, so the page —
// and with it the live WebRTC controller links — survives the launch. The
// launcher relays controller intents into the running game over postMessage.
function launch(game) {
  openGame(game);
  console.info("[launcher] launching", game.id);
}

function openGame(game) {
  gameFrame.src = game.url;
  gameFrame.hidden = false;
  mode = "game";
  // Focus the frame so local keyboard/remote input reaches the game, not the
  // menu underneath. Phone-controller intents are relayed explicitly below.
  gameFrame.focus();
}

function closeGame() {
  gameFrame.hidden = true;
  gameFrame.removeAttribute("src"); // unload the game and free its resources
  mode = "menu";
  nav.focusInitial();
}

// Relay a gameplay intent into the running game. The game injects it via its
// shared Input layer (input.emit), identical to a local key/pad/touch press.
function relayToGame(intent) {
  if (!gameFrame.contentWindow) return;
  gameFrame.contentWindow.postMessage({ type: "sc:intent", intent }, location.origin);
}

// ---- Player roster (AirConsole-style) ------------------------------------
function renderPlayers(players) {
  const list = document.getElementById("playerList");
  list.innerHTML = players
    .map(
      (p) =>
        `<li class="player"><span class="player__dot"></span>${escapeHtml(p.name)}</li>`
    )
    .join("");
}

// ---- Clock ----------------------------------------------------------------
function tickClock() {
  const el = document.getElementById("clock");
  const now = new Date();
  el.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ---- Wire input -----------------------------------------------------------
// One handler for every intent source — local input (keyboard / remote / pad)
// and intents relayed from a phone controller over the peer connection.
function handleIntent(intent) {
  // While a game runs, the launcher owns exit (Back returns to the menu) and
  // relays every other intent into the game rather than moving the hidden menu.
  if (mode === "game") {
    if (intent === "back") closeGame();
    else relayToGame(intent);
    return;
  }
  switch (intent) {
    case "up": nav.move("up"); break;
    case "down": nav.move("down"); break;
    case "left": nav.move("left"); break;
    case "right": nav.move("right"); break;
    case "enter": nav.activate(); break;
    case "back": onBack(); break;
  }
}

input.on(handleIntent);

function onBack() {
  if (location.hash) {
    location.hash = "";
    nav.focusInitial();
  }
  // At the root there is nowhere to go back to; TV OS handles app exit.
}

// ---- Boot -----------------------------------------------------------------
function boot() {
  renderGames();
  nav.focusInitial();

  session.addEventListener("ready", (e) => {
    document.getElementById("roomCode").textContent = e.detail.roomCode;
  });
  session.addEventListener("change", (e) => renderPlayers(e.detail.players));
  session.addEventListener("intent", (e) => handleIntent(e.detail.intent));
  session.addEventListener("error", () => {
    document.getElementById("roomCode").textContent = "offline";
  });
  session.connect();

  input.start();
  tickClock();
  setInterval(tickClock, 15000);

  // Re-assert focus after layout changes (resize / orientation on tablets).
  window.addEventListener("resize", () => nav.focusInitial());
}

// "1 player" when the seat count is fixed at one, "N–M players" otherwise.
function playersLabel(game) {
  if (game.minPlayers === game.maxPlayers) {
    return `${game.minPlayers} player${game.minPlayers === 1 ? "" : "s"}`;
  }
  return `${game.minPlayers}–${game.maxPlayers} players`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

boot();
