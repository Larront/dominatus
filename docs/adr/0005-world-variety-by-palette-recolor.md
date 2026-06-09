# World variety comes from recolouring shared layer shaders, not a shader per world type

The world generator needs many world archetypes (ice, desert, death, verdant, barren, river-terran,
and more) on top of the original ocean / lava / hive. The PixelPlanets port already proves these are
not distinct shader programs: ocean, lava, and hive are the *same* six generic layer shaders
(`base`, `land`, `cloud`, `crater`, `river`, `atmo`) stacked in different combinations with
different colour uniforms. So `recipe()` becomes a **data-driven archetype registry** — each
archetype is a layer list plus a palette — and adding a world type is **data, not shader code**. An
archetype carries both a pool of `type` labels (with variants, so two ice worlds don't read alike)
and its render recipe; the generator rolls one and writes both, which then stay independently
editable on the world (the `type` text and `render` key remain separate columns).

**Gas Giant** and **Asteroid** were the two cases we expected to need newly ported shaders. In the
event both were achievable from the existing layers: the gas giant is the `cloud` layer with its
`stretch` cranked up, which flattens the noise into horizontal storm bands over a banded `base`;
the asteroid is a heavily-cratered, atmosphere-less `base`+`crater` body. Neither is a verbatim
Deep-Fold port. The asteroid in particular reads as the *largest body* in a cluster, not a true
many-rock *field* — that silhouette genuinely can't be faked with a single circular body, so a
ported asteroid-field shader remains the one open improvement if the approximation isn't enough.
The line still holds: recolour/recombine when the shared layers can carry it; reach for a new
shader only when the silhouette can't be faked — we just found that line sits past the gas giant.

Black hole, galaxy, and bare star are **deliberately excluded** as archetypes: a World is a body
warbands *contend to control* (CONTEXT.md), which none of those are, and the star is already the
fixed system centrepiece.

## Status

accepted

## Consequences

- `recipe()` resolves a render key against the archetype registry instead of a hardcoded switch;
  the registry is the single source for both an archetype's visual and its `type`-label pool.
- The DB still stores `type` (text) and `render` (key) as separate editable columns — generated
  together, drift-corrected by hand if the arbiter wants a label the visual doesn't imply.
- Every current archetype, Gas Giant and Asteroid included, is a registry entry over the existing
  layer shaders — no new GLSL was added. A true asteroid-*field* shader is deferred (see above).
