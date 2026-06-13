# Bea & the Tower of Hearts — Game Design Document

*A chibi third-person adventure for the browser, in the visual spirit of Pokémon Brilliant Diamond / Shining Pearl.*
*Made for Beatrice ("Bea") by Kaymen ("Kay").*

---

## 1. High Concept

Bea wakes in **Lumière Vale**, a bright fantasy world stitched together from her and Kay's shared
memories. Kay is somewhere in this world — and he has built something enormous so she can find him.
Guided by **Sausage**, her white flat-faced Persian cat, Bea follows a trail of love letters, heart
blossoms and lanterns north to an Eiffel-style **Tower of Hearts**. Love is literally the fuel of
the journey: hearts open gates, light lanterns, and power the finale.

- **Genre:** third-person chibi adventure (top-down ¾ camera, BDSP style)
- **Platform:** web browser, 60 FPS target, zero install
- **Length:** 10–20 minutes (Chapter One)
- **Tone:** bright, warm, romantic, gently funny

## 2. Story

### Act 1 — Awakening (meadow)
Bea wakes in a flower meadow with Sausage. Something glitters under the old oak: a sealed letter
from Kay. *"Follow the heart blossoms. Every single one is a reason I love you."*

### Act 2 — The Village (friends + heart blossoms)
Kay's letter sends Bea to the village, where **her real friends are waiting**: Porsha (who told
Kay what makes Bea laugh), Althea (who told him what home feels like to her), and Hailee (who
saw the tower plans and kept the secret). Talking to all three unlocks the next step: collecting
the **7 heart blossoms**, each revealing one of Kay's reasons (including *"You make snowstorms
feel warm"* — that night on the slopes).

### Act 3 — The Singing River (lanterns)
A **gate of hearts** seals the only bridge. Three heart lanterns on the south bank only kindle
for "a full heart" — Bea's seven blossoms. Lighting all three sinks the gate and opens the way
north through the whispering forest.

### Act 4 — Arriving at the Eiffel Tower
The forest thins, sparkles drift between the trees, and the **Tower of Hearts** rises over the
plaza — a lattice tower in the Eiffel silhouette, crowned with a slowly turning, glowing heart.
A pink portal ring shimmers at its base. As Bea steps into it, Kay walks out from behind the
tower's leg. Reunion, embrace, a burst of hearts, fade to white.

### Ending — Home (Chapter Two, planned)
The white fade will eventually resolve into an **exact replica of Kay's room** — the real one.
Bea steps out of the dream and into home. *(Blocked on reference photos of the room; the current
build ends on a "To be continued" card that sets this up.)*

## 3. Gameplay Loop

1. **Explore** a hand-built overworld (meadow → village → river → forest → tower).
2. **Talk** to NPCs and Sausage for hints and story.
3. **Collect** heart objectives (blossoms, lanterns) that gate progress.
4. **Unlock** the next region; clear objective text always shows the current goal.
5. **Finish** at the tower; cutscene + ending screen.

## 4. Mechanics & Controls

| Input | Action |
|---|---|
| WASD / Arrow keys | Move (camera-relative) |
| Shift (hold) | Run |
| E / Space | Interact, advance dialogue |
| M | Mute / unmute |
| F | Toggle FPS counter |

- **Companion AI:** Sausage follows with smoothed pursuit, wags her tail, and meows when talked to.
- **Auto-pickup:** blossoms collect on touch; structural interactions (letter, lanterns, NPCs) use a prompt.
- **Collision:** circle colliders (trees, houses, NPCs, tower legs) + river/gate area blocks, resolved per-axis so you slide along walls.
- **Quest state machine:** 4 stages, each with an objective line, dialogue beats and world changes (gate sinks, portal appears).

## 5. Environment — Lumière Vale

- **South meadow:** spawn, old oak, letter, flower fields.
- **Village:** 4 pastel cottages, 3 NPCs, sandy plaza.
- **Singing River:** animated water, wooden bridge, gate of hearts, 3 heart lanterns.
- **Whispering Forest:** ~60 instanced trees, drifting pink sparkles.
- **Tower plaza:** Eiffel-style lattice tower (~21 units tall) with glowing heart finial and portal.
- **Sky:** gradient sky dome, drifting clouds, falling cherry petals everywhere, distance fog that hazes the far-off tower until you approach it.
- **Dressing:** white picket fences, street lamps, bushes, rocks, pink blossom trees, plank-lined bridge, cobbled plazas — density is what sells the style.

## 6. Audio Design (100% procedural, Web Audio API)

- **Music:** cheerful 4-bar chiptune loop in C major (I–vi–IV–V), triangle melody + sine bass + sparkle pings, scheduled with a look-ahead sequencer. No audio files to download.
- **SFX:** dialogue blips, collect arpeggios, lantern chimes, gate-opening riser, reunion fanfare, footsteps (filtered noise), and a real-ish synthesized **meow**.
- Starts on first user gesture (browser autoplay policy), master mute on M.

## 7. Technical Stack

| Layer | Choice | Why |
|---|---|---|
| Renderer | Three.js r149 (vendored locally, classic build) | runs offline from a double-click, no build step, no CDN dependency |
| Shading | Toon-ramp (cel) shading + ACES filmic tone mapping + sRGB pipeline | the BDSP look: stepped soft shadows, rich saturated color |
| Faces | Hand-painted 512² canvas textures (eyes, lashes, brows, blush, facial hair) | expressive anime faces instead of geometry-only features |
| Language | Vanilla JS (5 small modules) | zero toolchain, easy to hack on |
| UI | DOM + CSS | crisp text, free animations, accessible |
| Audio | Web Audio API | zero asset downloads |
| Models | Procedural primitives (spheres/capsules/boxes) | tiny payload, cohesive chibi style |
| Server | optional `node serve.js` | only needed for dev preview; the game also runs from `index.html` directly |

**Why browser (and not a native engine):** for this scope, the browser is the *better* choice —
instant sharing (send Bea a link or folder), no install, and the simple chibi art style is far
below WebGL's performance ceiling. A native engine (Godot/Unity) only becomes worth it if you
later want console-quality lighting, gamepad rumble, or Steam distribution.

## 8. Performance / Optimization Strategy (60 FPS)

Measured ~165 FPS on the dev machine (uncapped); 60 FPS is comfortably met.

- **Instanced rendering** for trees (1 draw call per layer), flowers and sparkles — the whole scene stays under ~120 draw calls.
- **Canvas-painted ground texture** (one 1024² texture) instead of thousands of decoration meshes.
- **One shadow-casting light** with a tight 56×56-unit shadow frustum that follows the player (crisp shadows, small 2048 map).
- **Fog + far-plane culling** to bound overdraw; pixel ratio capped at 1.75 for high-DPI screens.
- **No per-frame allocations** in the hot loop; delta-time clamped so tab-switches never explode physics.
- Procedural audio & models → total download ≈ 0.7 MB (mostly Three.js itself).

## 9. Roadmap

- **v1.0 (this build):** full Chapter One playable loop, title→ending.
- **v1.1 — Polish:** gamepad + touch controls, save/checkpoint (localStorage), more idle animations (Sausage grooming), ambient birdsong, photo-mode.
- **v1.2 — The Room ending:** replica of Kay's real room built from reference photos; the white fade resolves into it; final scene + credits.
- **v1.3 — Side content:** snow-mountain memory area (the ski trip!), fetch-quests for villagers, hidden hearts with more reasons.
- **v2.0 — Chapter Two: Home:** playable journey back, two-player local co-op (Bea & Kay).

## 10. What I Need From You

1. **Reference photos of the room** for the v1.2 ending replica.
2. Any **inside jokes / real reasons** to swap into the 7 heart-blossom messages (`REASONS` in `js/main.js` — they're plain text, easy to edit).
3. Optional: a couple more photos of you both (no hats!) if you want me to tune the chibi faces further.
