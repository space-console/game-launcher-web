# game-launcher-web

The **TV/screen** app for **Space Console** — a web-based, AirConsole-style
party-game launcher for 10-foot UIs (webOS, Android TV, tvOS) and desktop
browsers. The TV shows the menu and runs the games; phones are the controllers
(see the `game-controller` repo).

The launcher:

- shows a game menu (category rails, filter chips, thumbnails) and launches a
  game into a **persistent iframe shell**, so the WebRTC links survive switching
  between games;
- pairs with phones over **WebRTC**, brokered by the `web-api` signaling service —
  it shows a scan-to-join QR / room code, then relays each controller's input into
  the running game;
- keeps an AirConsole-style **player roster** (seats, names, a lead crown);
- fires fire-and-forget **stats beacons** to `web-api` as games are played.

Zero-build, zero-backend static site — plain ES modules, no bundler, no
framework. Open `index.html` and it runs.

```sh
npm install     # dev tooling only
npm run dev     # http://localhost:5173 (auto-reload)
```

For real phones the launcher, the controller and the signaling socket must share
**one origin** (iOS Safari only lets page JS reach the host:port it loaded from).
The `web-api` repo serves all of them together — see its README for single-origin
local dev and the one-service Render deploy.

## How input reaches a game

The launcher speaks one **intent vocabulary** (`up/down/left/right/enter/back`)
across keyboard, TV remote, gamepad, and relayed phone controllers. The running
game lives in the iframe shell; the two exchange `postMessage`:

| Direction | Message | Meaning |
| --- | --- | --- |
| shell → game | `sc:intent {intent, player}` | a button press, tagged with the sender's seat |
| shell → game | `sc:analog {steer, throttle, brake, handbrake, player}` | a continuous driving frame (steering games) |
| shell → game | `sc:players {players}` | the current roster |
| game → shell | `sc:controls {profile, buttons}` | the phone pad the game wants (`dpad` / `buttons` / `analog` + aux) |
| game → shell | `sc:gameover {kind, …}` | a score / 2-player result for the stats store |
| game → shell | `sc:back` | exit to the menu |

## Documentation

All docs live in the **wiki** repo (the org-wide hub), not here:

- Service docs: `wiki/docs/services/game-launcher-web/`
- How we build, deploy, and review across repos: `wiki/docs/way-of-working.md`

Published site (per branch): `main` deploys to the Pages root; feature branches
get a preview at `/preview/<branch-slug>-<hash>/`. Scripts are cache-busted at
deploy time (`npm run build` → `_dist/`); local `npm run dev` stays build-free.
