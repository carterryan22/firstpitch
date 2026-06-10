# App icons

These are referenced from `/manifest.webmanifest` and the iOS `apple-touch-icon`
meta tag. The PNGs here are generated from the First Pitch brand mark by
`platform/scripts/generate-app-icons.cjs` (run `node platform/scripts/generate-app-icons.cjs`
with `sharp` installed). To rebrand, edit that script or drop replacement PNGs
of the same sizes.

Required sizes:

| File                          | Size      | Use                                  |
| ----------------------------- | --------- | ------------------------------------ |
| `icon-192.png`                | 192×192   | PWA install (Android, Chrome)        |
| `icon-512.png`                | 512×512   | PWA splash / install                 |
| `icon-maskable-512.png`       | 512×512   | PWA maskable (safe area 80% center)  |
| `apple-touch-icon.png`        | 180×180   | iOS "Add to Home Screen"             |
| `apple-touch-icon-167.png`    | 167×167   | iPad Pro home screen                 |
| `apple-touch-icon-152.png`    | 152×152   | iPad home screen                     |
| `apple-touch-icon-120.png`    | 120×120   | iPhone home screen                   |

The fallback `icon.svg` is rendered by `app/icon.svg` and used by browsers that
prefer vector icons; keep it in sync with the raster exports.

To regenerate from a single 1024×1024 source on macOS / Linux:

```sh
for s in 120 152 167 180 192 512; do
  sips -z $s $s icon-source.png --out icon-${s}.png
done
mv icon-180.png apple-touch-icon.png
cp icon-180.png apple-touch-icon-180.png
mv icon-167.png apple-touch-icon-167.png
mv icon-152.png apple-touch-icon-152.png
mv icon-120.png apple-touch-icon-120.png
```
