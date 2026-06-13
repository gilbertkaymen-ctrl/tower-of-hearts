# Bea & the Tower of Hearts ♥

A chibi third-person adventure made for Beatrice, by Kaymen.
Bea and her Persian cat Sausage journey through a dream-world built from love
to find Kay at the top of an Eiffel-style Tower of Hearts.

## How to play

**Easiest:** double-click `index.html`. That's it — everything (including the 3D engine) is local.

**Or with a local server** (slightly nicer, avoids any browser file restrictions):

```
node serve.js
```

then open http://localhost:8321

## Controls

| Key | Action |
|---|---|
| WASD / Arrows | Move |
| Shift | Run |
| E / Space | Talk · Interact · Advance dialogue |
| M | Mute |
| F | Toggle FPS counter |

## The quest

1. Read the shining letter under the old oak tree.
2. Find Bea's friends in the village — Porsha, Althea and Hailee — and ask them about Kay.
3. Collect the 7 heart blossoms (each one is a reason).
4. Light the 3 heart lanterns by the bridge.
5. Cross the singing river and reach the Tower of Hearts.

## Project layout

```
index.html        game page + UI
css/style.css     HUD, dialogue, title/end screens
js/lib/three.min.js   Three.js r149 (vendored, offline)
js/audio.js       procedural music + sound effects
js/models.js      Blender-sculpted character meshes (auto-generated)
js/characters.js  chibi builders: Bea, Kay, Sausage, villagers
tools/build_models.py  Blender script that sculpts + exports js/models.js
js/world.js       Lumière Vale: terrain, village, river, forest, tower
js/ui.js          dialogue / objectives / toasts / screens
js/main.js        game loop, movement, quests, ending cutscene
GAME_DESIGN.md    full design document + roadmap
serve.js          tiny optional dev server
```

Personalize it: the 7 love-reasons live in `js/main.js` (`REASONS`) and all
dialogue is plain text in the same file — edit freely.

## Regenerating the sculpted models

Character hair, clothes and Sausage's fluffy body are sculpted by Blender
(headless) and baked into `js/models.js`. After editing `tools/build_models.py`:

```
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --factory-startup --python tools\build_models.py
```

If `js/models.js` is missing the game silently falls back to the older
procedural shapes, so the game always runs.
