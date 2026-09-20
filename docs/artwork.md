# Artwork provenance

Tool: built-in `image_gen` via the imagegen skill. The original output was copied into `public/art/night-drift.png` and is retained as the master. A WebP encoding at `public/art/night-drift.webp` (same resolution, about 99 KB) is referenced by the local fixture and homepage fallback.

Final generation prompt:

> Use case: stylized-concept. Asset type: wide hero illustration for an original browser gaming portal, Night Arcade. Create a premium cinematic stylized 3D racing game key art, wide landscape 16:9. An electric mint-green low polygon retro sports coupe drifting on a sweeping elevated asphalt racetrack above pastel peach clouds, dramatic curving striped barriers, tall angular teal mountains and thin glowing track lines, orange setting sun, powder blue and pale lavender sky. Strong perspective, dynamic speed, crisp realistic toy materials, crafted game environment, beautiful ambient occlusion and soft dramatic lighting. Car on right half, road sweeps from lower right toward upper left. Left third has moody dark blue atmospheric space suitable for white headline overlay. No lettering, no logos, no watermarks, no UI, no recognizable existing game or branded vehicle. Designed to crop at 2.6:1 retaining the mint car near right center.

Other cover artwork is repository-native SVG authored by `scripts/make-fixtures.mjs` for fictional fixtures. It is replaced by real provider artwork upon live import. Fonts are bundled from the OFL-licensed Outfit and DM Sans packages in node_modules.
