# First-person weapon artwork

- File: `speargun-hands.png` (1536 × 1024, RGBA).
- Created on 2026-11-19 with the built-in OpenAI `image_gen` tool, with `transparent_background: true`.
- This is AI-generated photographic-style artwork, not a photograph of real equipment or a third-party licensed model.
- Original generation prompt: `speargun-hands.prompt.txt`.
- `build.mjs` embeds the PNG as a data URI in both production and development HTML. No remote asset requests or separate files are needed to play the built game offline.
- `weapon.js` precomputes local mesh-deformed finger/trigger and band patches from this image, animates the exposed spear point during release/reload, and applies breathing, swim sway and recoil. The PNG itself is unchanged. It is a first-person 2D viewmodel, not a rotatable 3D asset. Projectile movement, hit detection and damage are still simulated in 3D.
