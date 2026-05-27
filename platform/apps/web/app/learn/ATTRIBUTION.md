# Triple Play — Upstream Attribution

This folder contains a vendored copy of the **Triple Play Baseball** learning
game, integrated into the platform web app as a standalone static experience
served from `/triple-play/`.

- Upstream repository: https://github.com/rc22-dev/TriplePlay
- Live demo: https://rc22-dev.github.io/TriplePlay/
- Upstream license note: "Free educational tool. Feel free to use, share, and
  modify for personal and educational purposes." (see `README.md` in this
  folder for the upstream README as shipped).

## Integration notes

- Files are served as static assets from `apps/web/public/triple-play/`
  (`index.html`, `styles.css`, `app.js`).
- The Next.js route `/learn` (see `apps/web/app/learn/page.tsx`) wraps the
  game in a full-height iframe so it inherits site chrome (header / nav /
  footer) while keeping the upstream game self-contained.
- Do **not** edit `app.js` / `index.html` / `styles.css` in place for feature
  work — instead, fork upstream-style changes into a new module under
  `packages/` (e.g. a future `packages/learning-game/`) and re-vendor.

## Updating

To pull a new upstream version:

```pwsh
git clone https://github.com/rc22-dev/TriplePlay.git tmp-tripleplay
Copy-Item tmp-tripleplay/index.html,tmp-tripleplay/styles.css,tmp-tripleplay/app.js,tmp-tripleplay/README.md `
  platform/apps/web/public/triple-play/ -Force
Remove-Item -Recurse -Force tmp-tripleplay
```
