// Space Console launcher — entry point.
// Renders the catalog, wires input → spatial navigation → launch, and shows
// the AirConsole-style player roster.

import { games } from "./games.js?v=d8cf3de2-1c34-4b88-9ece-231f92ad1cf0";
import { SpatialNav } from "./spatial-nav.js?v=d8cf3de2-1c34-4b88-9ece-231f92ad1cf0";
import { Input } from "./input.js?v=d8cf3de2-1c34-4b88-9ece-231f92ad1cf0";
import { PlayerSession } from "./players.js?v=d8cf3de2-1c34-4b88-9ece-231f92ad1cf0";

const nav = new SpatialNav();
const input = new Input();
const session = new PlayerSession();

const grid = document.getElementById("gameGrid");
const hero = document.getElementById("hero");

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
        <div class="tile__players">${game.minPlayers}–${game.maxPlayers} players</div>
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
        <span>${game.minPlayers}–${game.maxPlayers} players</span>
        <span>Press Enter to launch</span>
      </div>
    </div>`;
}

function launch(game) {
  // Hand off to the game. Same-origin games can be route changes; external
  // ones a full navigation. Kept simple for v1.
  if (game.url.startsWith("#")) location.hash = game.url.slice(1);
  else location.href = game.url;
  console.info("[launcher] launching", game.id);
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
input.on((intent) => {
  switch (intent) {
    case "up": nav.move("up"); break;
    case "down": nav.move("down"); break;
    case "left": nav.move("left"); break;
    case "right": nav.move("right"); break;
    case "enter": nav.activate(); break;
    case "back": onBack(); break;
  }
});

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
  session.connect();

  input.start();
  tickClock();
  setInterval(tickClock, 15000);

  // Re-assert focus after layout changes (resize / orientation on tablets).
  window.addEventListener("resize", () => nav.focusInitial());
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

boot();
