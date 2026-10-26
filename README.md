# Chronos & Canopy

Landing page for vintage cameras with layered parallax scenery, a focus simulator and a shutter effect.

## Run

Open `index.html` in a browser. No build step.

## Files

- `index.html` – page structure
- `style.css` – styles, parallax layers, shutter animation
- `script.js` – parallax engine, generated scenery, focus simulator, shutter
- `backup-original/` – the version before the parallax rework

## Tweaking

- **Layer depth:** change `data-speed` on a `.layer` (0 = fixed, 1 = moves with page, above 1 = closer).
- **Camera photos:** swap the image URLs in the `.camera-card` blocks.
- **Reduced motion:** parallax is disabled automatically for users who request it.
