# game-launcher-web

Web-based party-game launcher for **Space Console** — a 10-foot TV UI (webOS,
Android TV, tvOS) and desktop browsers, AirConsole-style. The **TV is the
screen**; phones are the controllers (see the `game-controller` repo).

Zero-build, zero-backend static site — plain ES modules, no bundler, no
framework. Open `index.html` and it runs.

```sh
npm install     # dev server only
npm run dev      # http://localhost:5173 (auto-reload)
```

## Documentation

All docs live in the **wiki** repo (the org-wide hub), not here:

- Service docs: `wiki/docs/services/game-launcher-web/`
- How we build, deploy, and review across repos: `wiki/docs/way-of-working.md`

Published site (per branch): `main` deploys to the Pages root; feature branches
get a preview at `/preview/<branch-slug>-<hash>/`. Scripts are cache-busted at
deploy time (`npm run build` → `_dist/`); local `npm run dev` stays build-free.
