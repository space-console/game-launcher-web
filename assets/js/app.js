// Space Console launcher — entry point.
// Renders the catalog, wires input → spatial navigation → launch, and shows
// the AirConsole-style player roster.

import { games, CATEGORY_ORDER } from "./games.js?v=3edafc5f-d473-4416-82fc-da34f61f46dd";
import { SpatialNav } from "./spatial-nav.js?v=3edafc5f-d473-4416-82fc-da34f61f46dd";
import { Input } from "./input.js?v=3edafc5f-d473-4416-82fc-da34f61f46dd";
import { PlayerSession } from "./players.js?v=3edafc5f-d473-4416-82fc-da34f61f46dd";
import { Stats } from "./stats.js?v=3edafc5f-d473-4416-82fc-da34f61f46dd";

const nav = new SpatialNav();
const input = new Input();
const session = new PlayerSession();

const grid = document.getElementById("gameGrid");
const hero = document.getElementById("hero");
const heroContent = document.getElementById("heroContent");
const gameFrame = document.getElementById("gameFrame");

// Launcher mode: "menu" drives spatial navigation; "game" means a game is
// running in the shell iframe and intents are relayed to it instead.
let mode = "menu";
// The game currently running in the shell, so we can attribute its stats
// (plays, scores, results) to the right game_id when it reports them.
let currentGame = null;

// Control layouts pushed to phones (Back is always present on the controller).
// Menu + undeclared games use the d-pad; a game overrides via sc:controls.
const MENU_CONTROLS = { type: "controls", profile: "dpad", buttons: [{ id: "enter", label: "Select" }] };
const GAME_CONTROLS = { type: "controls", profile: "dpad", buttons: [{ id: "enter", label: "A" }] };

// Active category filter ("All" shows every row). Set by the filter chips.
let activeCategory = "All";

// ---- Filter chips ---------------------------------------------------------
// A row of category filters above the rails. Focusable so a TV remote reaches
// them; selecting one narrows the rails to that category.
function renderFilters() {
  const bar = document.getElementById("filters");
  if (!bar) return;
  bar.innerHTML = "";
  for (const name of ["All", ...CATEGORY_ORDER]) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "filter" + (name === activeCategory ? " is-active" : "");
    chip.dataset.focusable = "";
    chip.dataset.filter = name;
    chip.setAttribute("tabindex", "-1");
    chip.setAttribute("aria-pressed", String(name === activeCategory));
    chip.textContent = name;
    chip.addEventListener("click", () => selectFilter(name));
    bar.appendChild(chip);
  }
}

function selectFilter(name) {
  if (name === activeCategory) return;
  activeCategory = name;
  renderFilters();
  renderGames();
  focusFirstTile(); // move onto the first tile of the now-filtered list
}

// Focus the first game tile (not a filter chip), so the hero reflects a game on
// load and after filtering. Filters remain reachable by pressing Up.
function focusFirstTile() {
  const first = grid.querySelector(".tile[data-focusable]");
  if (first) nav.focus(first);
  else nav.focusInitial();
}

// ---- Render game tiles ----------------------------------------------------
// Games are grouped into one horizontal rail per category (CATEGORY_ORDER),
// so the catalog reads as a few labelled rows instead of one long scroll.
function renderGames() {
  grid.innerHTML = "";
  const byCategory = groupByCategory(games);
  for (const category of CATEGORY_ORDER) {
    if (activeCategory !== "All" && category !== activeCategory) continue;
    const list = byCategory.get(category);
    if (!list || !list.length) continue;

    const rail = document.createElement("section");
    rail.className = "rail";
    rail.setAttribute("aria-label", category);

    const title = document.createElement("h2");
    title.className = "rail__title";
    title.textContent = category;
    rail.appendChild(title);

    const track = document.createElement("div");
    track.className = "rail__track";
    track.setAttribute("role", "list");
    for (const game of list) track.appendChild(makeTile(game));
    rail.appendChild(track);

    grid.appendChild(rail);
  }
}

// Group the flat catalog into category → games, preserving catalog order within
// each category. Categories not in CATEGORY_ORDER simply won't render.
function groupByCategory(list) {
  const map = new Map();
  for (const game of list) {
    if (!map.has(game.category)) map.set(game.category, []);
    map.get(game.category).push(game);
  }
  return map;
}

function makeTile(game) {
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.dataset.focusable = "";
  tile.dataset.gameId = game.id;
  tile.setAttribute("role", "listitem");
  tile.setAttribute("tabindex", "-1");
  tile.setAttribute("aria-label", game.title);
  // Real game screenshot on top, gradient as fallback if the image is missing.
  tile.style.backgroundImage = `url("${game.thumb}"), ${game.art}`;
  tile.innerHTML = `
    <div class="tile__body">
      <div class="tile__title">${escapeHtml(game.title)}</div>
      <div class="tile__players">${playersLabel(game)}</div>
    </div>`;

  tile.addEventListener("sn:focus", () => renderHero(game));
  tile.addEventListener("click", () => launch(game));
  return tile;
}

// ---- Hero (reflects the focused game) ------------------------------------
function renderHero(game) {
  hero.style.backgroundImage = game.art;
  // Write into the persistent content div so the scan-to-join QR aside survives.
  heroContent.innerHTML = `
    <div class="hero__inner">
      <div class="hero__tag"><span class="hero__glyph" aria-hidden="true">${game.icon || ""}</span>${escapeHtml(game.tagline)}</div>
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
  currentGame = game;
  // Log the launch for popularity stats (which games get played, solo vs. group).
  Stats.play(game.id, session.roomCode, session.players.length);
  // Default in-game pad until the game declares its own layout (sc:controls).
  session.setControls(GAME_CONTROLS);
  showHud(true); // room code + QR + roster overlay, for rejoin during play
  // The game frame loads async; hand it the roster once it's ready to listen.
  gameFrame.addEventListener("load", broadcastRoster, { once: true });
  // Focus the frame so local keyboard/remote input reaches the game, not the
  // menu underneath. Phone-controller intents are relayed explicitly below.
  gameFrame.focus();
}

function closeGame() {
  gameFrame.hidden = true;
  gameFrame.removeAttribute("src"); // unload the game and free its resources
  mode = "menu";
  currentGame = null;
  showHud(false);
  session.setControls(MENU_CONTROLS); // back to the menu pad
  nav.focusInitial();
}

// Hand the running game the current roster (seat → name → lead) so it can label
// turns by name. Sent on game load and whenever the roster changes mid-game.
function broadcastRoster() {
  if (mode !== "game" || !gameFrame.contentWindow) return;
  gameFrame.contentWindow.postMessage({ type: "sc:players", players: roster() }, location.origin);
}

// Messages from the running game (and only it): a control-layout declaration,
// or an end-of-game stats report.
window.addEventListener("message", (e) => {
  const msg = e.data;
  if (!msg || e.source !== gameFrame.contentWindow) return; // only the running game
  if (msg.type === "sc:controls") {
    session.setControls({ type: "controls", profile: msg.profile, buttons: msg.buttons || [] });
  } else if (msg.type === "sc:gameover") {
    reportGameOver(msg);
  } else if (msg.type === "sc:back") {
    closeGame(); // game asked the shell to exit (local Back inside the iframe)
  }
});

// A game just ended; attach the launcher's context (game id, room, player names)
// to the game's own report and persist it to the stats store.
function reportGameOver(msg) {
  if (!currentGame) return;
  const game = currentGame.id;
  const room = session.roomCode;
  if (msg.kind === "score") {
    Stats.score(game, primaryPlayerName(), msg.score, room);
  } else if (msg.kind === "result") {
    Stats.result(game, msg.outcome, msg.winnerSlot, nameForSlot(msg.winnerSlot), roster(), room);
  }
}

// Score games attribute to the primary controller (seat 1); "Guest" if nobody's
// on a phone (e.g. local keyboard play).
function primaryPlayerName() {
  return nameForSlot(1) || "Guest";
}
function nameForSlot(slot) {
  const p = session.players.find((pl) => pl.slot === slot);
  return p ? p.name : null;
}
function roster() {
  return session.players.map((p) => ({ slot: p.slot, name: p.name, lead: !!p.lead }));
}

// Relay a gameplay intent into the running game, tagged with the sender's seat.
// The game injects it via its shared Input layer, identical to a local press;
// same-screen multiplayer games read the seat to route input per player.
function relayToGame(intent, slot) {
  if (!gameFrame.contentWindow) return;
  gameFrame.contentWindow.postMessage({ type: "sc:intent", intent, player: slot || 1 }, location.origin);
}

// Relay a continuous analog frame (steering + pedals) from a phone's analog pad
// into the running game. Only meaningful while a game is up; ignored on the menu.
function relayAnalogToGame(detail) {
  if (mode !== "game" || !gameFrame.contentWindow) return;
  gameFrame.contentWindow.postMessage({
    type: "sc:analog",
    steer: detail.steer, throttle: detail.throttle, brake: detail.brake, handbrake: detail.handbrake,
    player: detail.slot || 1,
  }, location.origin);
}

// ---- Player roster (AirConsole-style) ------------------------------------
// Rendered both on the menu (top bar) and, during a game, in the shell HUD. The
// lead player (drives menus / switches games) wears a crown.
function playerItems(players) {
  return players
    .map((p) => `<li class="player">
      <span class="player__dot"></span>
      <span class="player__seat">P${p.slot}</span>
      ${escapeHtml(p.name)}${p.lead ? ' <span class="player__lead" title="Lead — switches games">👑</span>' : ""}
    </li>`)
    .join("");
}

function renderPlayers(players) {
  document.getElementById("playerList").innerHTML = playerItems(players);
  // Keep the in-game HUD roster + player dots in sync while a game is running.
  const hudRoster = document.getElementById("hudRoster");
  if (hudRoster) hudRoster.innerHTML = playerItems(players);
  const hudDots = document.getElementById("hudDots");
  if (hudDots) {
    hudDots.innerHTML = players.map(() => `<li class="gamehud__dot"></li>`).join("");
  }
}

// ---- Scan-to-join QR -------------------------------------------------------
// Encode the controller URL with the room baked in, so a phone scans straight
// onto the pad. Built from the page's own origin, so it works on LAN, over a
// tunnel, or in production without any config.
function buildQr(box, roomCode) {
  if (!box || typeof window.qrcode !== "function") return;
  // Straight to the controller. (This used to point at the untracked dev helper
  // /t.html, which existed only to inject TURN credentials by hand; the controller
  // now gets those from the server at /api/ice, and /t.html isn't in a deploy.)
  const joinUrl = `${location.origin}/game-controller/?room=${encodeURIComponent(roomCode)}`;
  const qr = window.qrcode(0, "M");
  qr.addData(joinUrl);
  qr.make();
  box.innerHTML = qr.createSvgTag({ scalable: true, margin: 1 });
}

function renderJoinQr(roomCode) {
  document.getElementById("joinUrl").textContent = location.host;
  buildQr(document.getElementById("joinQr"), roomCode);
  const aside = document.getElementById("heroJoin");
  if (aside) aside.hidden = false; // reveal once the QR is drawn
  // Prime the in-game HUD QR + code too, so it's ready the moment a game opens.
  document.getElementById("hudCode").textContent = roomCode;
  buildQr(document.getElementById("hudQr"), roomCode);
}

// ---- In-game HUD -----------------------------------------------------------
// A small overlay above the running game: the room code, an expandable QR, and
// the live roster. Lets a dropped player rejoin mid-game (they keep their seat)
// without anyone leaving the game or touching the launcher menu.
function showHud(on) {
  const hud = document.getElementById("gameHud");
  if (hud) hud.hidden = !on;
  // Open the QR panel by default so it's visible on a TV (no pointer to expand
  // it). Pointer users can collapse it to a small room-code chip to free the
  // corner. Either way a dropped player can rejoin without leaving the game.
  setHudPanel(on);
}
function setHudPanel(open) {
  document.getElementById("hudPanel").hidden = !open;
  document.getElementById("hudChip").setAttribute("aria-expanded", String(open));
}
function toggleHudPanel() {
  setHudPanel(document.getElementById("hudPanel").hidden);
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
function handleIntent(intent, slot = 1, isLead = true) {
  // While a game runs, the launcher owns exit (Back returns to the menu) and
  // relays every other intent into the game rather than moving the hidden menu.
  // Every seat's input is relayed (multiplayer games route it per player).
  if (mode === "game") {
    if (intent === "back") closeGame();
    else relayToGame(intent, slot);
    return;
  }
  // On the menu, only the lead player navigates and launches — so a second
  // controller can't fight over the cursor. Local input (the TV operator) is
  // always allowed. If the lead leaves, the promoted player takes over here.
  if (!isLead) return;
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
  renderFilters();
  renderGames();
  focusFirstTile();

  // Reuse this tab's previous room code (sessionStorage) so a launcher reload or
  // return-from-background reclaims the SAME code instead of minting a new one —
  // the server hands it back if the old room was freed, so phones stay valid.
  try {
    const saved = sessionStorage.getItem("sc.hostRoom");
    if (saved) session.roomCode = saved;
  } catch { /* private mode */ }

  session.addEventListener("ready", (e) => {
    try { sessionStorage.setItem("sc.hostRoom", e.detail.roomCode); } catch { /* private mode */ }
    document.getElementById("roomCode").textContent = e.detail.roomCode;
    renderJoinQr(e.detail.roomCode);
  });
  session.addEventListener("change", (e) => {
    renderPlayers(e.detail.players);
    broadcastRoster(); // keep the running game's turn-by-name labels current
  });
  session.addEventListener("intent", (e) => handleIntent(e.detail.intent, e.detail.slot, e.detail.lead));
  session.addEventListener("analog", (e) => relayAnalogToGame(e.detail));
  session.addEventListener("error", () => {
    document.getElementById("roomCode").textContent = "offline";
  });
  session.setControls(MENU_CONTROLS); // controllers join to the menu pad
  session.connect();

  // In-game HUD: tap/click the room chip to reveal the rejoin QR + roster.
  document.getElementById("hudChip").addEventListener("click", toggleHudPanel);

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
