# Triple Play — maintenance

The learning game served at `/learn` is a vendored copy of
[rc22-dev/TriplePlay](https://github.com/rc22-dev/TriplePlay) at
`platform/apps/web/public/triple-play/`. It is now managed entirely from
this workspace.

## Layout

| Path | Role |
|---|---|
| `platform/apps/web/public/triple-play/index.html` | upstream entrypoint |
| `platform/apps/web/public/triple-play/styles.css` | upstream styles |
| `platform/apps/web/public/triple-play/app.js`     | upstream game logic |
| `platform/apps/web/app/learn/page.tsx`            | Next.js wrapper (iframe + chrome) |
| `platform/apps/web/app/learn/ATTRIBUTION.md`      | upstream attribution + license note |
| `platform/scripts/tripleplay.ps1`                 | sync / diff / push CLI |

## Remotes

A `tripleplay` git remote is configured at this workspace's repo root,
pointing at upstream:

```
tripleplay  https://github.com/rc22-dev/TriplePlay.git
```

Add a personal fork remote if you intend to push improvements back:

```pwsh
git remote add tripleplay-fork https://github.com/<you>/TriplePlay.git
```

## Workflow

All commands run from anywhere inside the workspace. The script resolves
the repo root itself.

```pwsh
# Show what's in sync vs modified
./platform/scripts/tripleplay.ps1 status

# Diff vendored copy against upstream/main
./platform/scripts/tripleplay.ps1 diff

# Pull latest upstream into the vendored folder (shows diff, prompts)
./platform/scripts/tripleplay.ps1 pull

# Push local edits to YOUR fork as a clean subtree commit
./platform/scripts/tripleplay.ps1 push -ForkRemote tripleplay-fork
```

### Editing flow

1. Edit files directly in `platform/apps/web/public/triple-play/`.
2. Run `pnpm --filter web dev` and verify at `/learn`.
3. Commit normally in this repo — those commits live alongside platform
   code and ship as static assets.
4. (Optional) When ready to share upstream:
   `./platform/scripts/tripleplay.ps1 push -ForkRemote tripleplay-fork`,
   then open a PR from your fork to `rc22-dev/TriplePlay`.

### Pulling upstream updates

`pull` shows a diff per file first, then prompts before overwriting. If
you have local edits, resolve conflicts manually:

1. Run `./platform/scripts/tripleplay.ps1 diff` and copy the upstream
   changes you want.
2. Or accept upstream wholesale (`pull -Yes`), then re-apply your edits
   from `git log -- platform/apps/web/public/triple-play/`.

## Why subtree push, not subtree pull?

`git subtree pull` would force a merge commit into this repo's history
every time upstream changes — noisy and not worth it for ~150 KB of
static assets. The `pull` subcommand instead does a clean blob copy from
`tripleplay/main`, so upstream changes land as a single ordinary commit
in your normal review flow.

`push` does use `git subtree split` because that's the only safe way to
produce a fork-shaped commit without rewriting this repo's history.
