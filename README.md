# misterkd.com

One-page personal brand site for **Kadir Demir — Mister KD**, food & beverage product developer: all 45 creations stand on six shelves ("The Shelf", October 2026). Static HTML/CSS/JS, deployed by GitHub Pages from `main` — push to deploy.

`assets/creations.js` is the product manifest. The product markup in `index.html` and the resized images in `derived/` are generated from it by build scripts kept in the private **panito** handoff folder (`tools/misterkd/`; ask Enes Kiymaz). Do not edit `CNAME` or `.nojekyll`.

## Direct edits, 4 November 2026 (not yet in the panito build scripts)

These were made straight in this repo. Port them to `tools/misterkd/` before regenerating, or a rebuild will undo them:

- **Proof:** the hero's second ticket is now the Expo West 2026 award (was "45 creations on the shelf"); a "My creations are stocked at" rail (Migros · Trendyol · Hepsiburada · Decathlon Hong Kong) sits under the tickets; the Smarter Snacks and Bite & More bays carry `bay__proof` tickets.
- **Cut-outs:** `bm-protein-pancake-8pack`, `bm-vegan-puff-barbecue`, `-vegetable` and `-chili-lime` now have `-cut` files (+ `derived/c/*-cut-{200..800}.webp`), are `cut: true` in `assets/creations.js` and use `pack--pouch` instead of the framed `pack--plate`.
- **The brief:** sends through Web3Forms once a real `access_key` is in the form; until then (and whenever sending fails) it opens a pre-filled email to the address in the form's `data-fallback-email`, with a "Copy my brief" button.
- **Privacy:** new `privacy.html`, linked from the brief and the footer.
