/* ============ Bea & the Tower of Hearts — main game ============ */
(() => {
  const G = {
    state: 'TITLE',          // TITLE | PLAY | CUTSCENE | END
    stage: -1,               // quest stage
    heartsFound: 0,
    keys: {},
    time: 0,
    gateOpen: false,
    muted: false
  };
  window.GAME = G; // debug handle

  let renderer, scene, camera, clock;
  let world, bea, cat, kay = null;
  let npcs = [], interactables = [];
  let heartBursts = [];
  let stepTimer = 0, fpsAcc = 0, fpsFrames = 0;
  let catMoving = false, beaMoving = false;
  let ending = null;
  let heartSpriteMat = null;

  const TOTAL_BLOSSOMS = 7;
  const REASONS = [
    'Reason #1: Your laugh turns bad days into good ones.',
    'Reason #2: You make the smallest moments feel like adventures.',
    'Reason #3: Your kindness finds everyone around you.',
    'Reason #4: You believed in me before I believed in myself.',
    'Reason #5: Home is wherever you are.',
    'Reason #6: You make snowstorms feel warm.',
    'Reason #7: You never stop searching for the people you love.'
  ];

  /* ================= INIT ================= */
  function init() {
    UI.init();

    if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300);

    world = World.build(scene);

    // ----- characters -----
    bea = Chars.makeBea();
    bea.position.set(0, 0, 72);
    scene.add(bea);
    G.bea = bea; G.camera = camera; // debug/test handles

    cat = Chars.makeCat();
    cat.position.set(1.6, 0, 73.5);
    scene.add(cat);

    buildNPCs();
    buildInteractables();

    camera.position.set(0, 7.6, 81.5);
    camera.lookAt(0, 1.2, 71);

    // ----- input -----
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', e => { G.keys[e.code] = false; });
    window.addEventListener('resize', onResize);

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', () => location.reload());

    clock = new THREE.Clock();
    renderer.setAnimationLoop(loop);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    G.keys[e.code] = true;
    if (e.code === 'KeyM') {
      const m = AudioMan.toggleMute();
      UI.toast(m ? 'Sound muted' : 'Sound on');
    }
    if (e.code === 'KeyF') {
      const f = document.getElementById('fps');
      f.style.display = f.style.display === 'none' ? '' : 'none';
    }
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
      if (UI.dialogueActive()) { UI.advance(); return; }
      if (G.state === 'PLAY' && e.code !== 'Enter') tryInteract();
    }
  }

  /* ================= GAME START ================= */
  function startGame() {
    AudioMan.init();
    AudioMan.startMusic();
    UI.hideTitle();
    UI.fadeIn();
    UI.showHUD();
    G.state = 'PLAY';

    setTimeout(() => {
      UI.startDialogue([
        { name: 'Sausage', text: 'Mrrow... You’re awake! You were whispering his name in your sleep again.' },
        { name: 'Bea', text: 'Kay...! The wind — it sounded just like his voice. Sausage, this place... it feels stitched together from our memories.' },
        { name: 'Sausage', text: 'Then love will be our compass. Look — something is glittering under the old oak tree!' }
      ], () => setStage(0));
      UI.toast('WASD to move · Shift to run · E to interact · M to mute', false, 6000);
    }, 1300);
  }

  /* ================= QUESTS ================= */
  function setStage(n) {
    G.stage = n;
    switch (n) {
      case 0: UI.setObjective('Find the shining letter under the old oak tree.'); break;
      case 1: UI.setObjective('Ask Bea’s friends in the village about Kay. (0/3)'); break;
      case 2:
        UI.setObjective('Collect the 7 heart blossoms.');
        UI.setHearts(0, TOTAL_BLOSSOMS);
        break;
      case 3: UI.setObjective('Light the 3 heart lanterns by the bridge.'); break;
      case 4:
        UI.setObjective('Cross the bridge and reach the Tower of Hearts.');
        world.portal.visible = true;
        break;
    }
  }

  function buildNPCs() {
    const defs = [
      {
        name: 'Porsha', x: -2.5, z: 24.5, rotY: 0.6,
        opts: { skin: 0x8a5a3c, hair: 0x16100c, top: 0xffd166, bottom: 0x8a5a3c, dress: true, dressColor: 0xff9a3c, hairBun: true, scale: 0.97, lashes: true, eyeColor: 0x2e1c12 },
        lines: [
          { name: 'Porsha', text: 'BEA!! Girl, you’re really here! A tower-building dreamboat came through asking what makes you laugh.' },
          { name: 'Porsha', text: 'I told him: everything, if Porsha’s telling the story. He went north with a hammer and the BIGGEST grin.' }
        ]
      },
      {
        name: 'Althea', x: 9.5, z: 19, rotY: -0.8,
        opts: { skin: 0xd9a368, hair: 0x1d1511, top: 0xffffff, bottom: 0xd9a368, dress: true, dressColor: 0x4fb0a5, longHair: true, scale: 0.97, lashes: true, eyeColor: 0x33231a },
        lines: [
          { name: 'Althea', text: 'Bea! He asked me what home feels like to you. I said: warm rice, slow Sundays, and someone humming in the kitchen.' },
          { name: 'Althea', text: 'He wrote every word in a little notebook with your name on the cover. The blossoms he planted are waiting for you!' }
        ]
      },
      {
        name: 'Hailee', x: -9, z: 27.5, rotY: 0.9,
        opts: { skin: 0xffe6d8, hair: 0xe8c87a, top: 0xffffff, bottom: 0xffe6d8, dress: true, dressColor: 0xb49ae8, longHair: true, scale: 0.97, lashes: true, eyeColor: 0x4a76b8 },
        lines: [
          { name: 'Hailee', text: 'Oh my gosh, BEA! He showed us the tower plans — there’s a glowing heart on top, can you believe it?' },
          { name: 'Hailee', text: 'We all promised to keep it secret until you woke up. Surprise! Now go get your man.' }
        ]
      }
    ];
    npcs = defs.map(d => {
      const g = Chars.makeChibi(d.opts);
      g.position.set(d.x, 0, d.z);
      g.rotation.y = d.rotY;
      scene.add(g);
      world.solids.push({ x: d.x, z: d.z, r: 0.55 });
      return Object.assign({ grp: g }, d);
    });
  }

  function buildInteractables() {
    interactables = [];

    // the letter
    interactables.push({
      x: world.letter.x, z: world.letter.z, r: 1.6, label: 'Read the letter',
      active: () => G.stage === 0,
      act: () => {
        UI.startDialogue([
          { name: 'Kay’s Letter', text: '“My Bea — if you found this, then dreams really do carry mail. I’m here: past the village, across the singing river, where I built something tall enough for you to find me.”' },
          { name: 'Kay’s Letter', text: '“Your friends helped me plan all of this. Find them in the village first — then follow the heart blossoms. Every single one is a reason I love you. — Kay ♥”' },
          { name: 'Sausage', text: 'Your friends are here too?! Mrrow — to the village! Porsha, Althea and Hailee are waiting!' }
        ], () => {
          world.letter.grp.visible = false;
          AudioMan.collect();
          setStage(1);
        });
      }
    });

    // heart blossoms
    world.blossoms.forEach((b, i) => {
      interactables.push({
        x: b.x, z: b.z, r: 1.4, label: 'Pick the heart blossom', auto: true,
        active: () => G.stage >= 2 && !b.taken,
        act: () => {
          b.taken = true;
          b.grp.visible = false;
          G.heartsFound++;
          UI.setHearts(G.heartsFound, TOTAL_BLOSSOMS);
          UI.toast(REASONS[G.heartsFound - 1], true, 4200);
          AudioMan.collect();
          spawnHearts(b.x, 1.2, b.z, 7);
          if (G.heartsFound >= TOTAL_BLOSSOMS) {
            setTimeout(() => {
              UI.startDialogue([
                { name: 'Sausage', text: 'Full hearts! Mrrow~ The old lanterns by the bridge only wake for a heart that is full.' },
                { name: 'Bea', text: 'Then let’s go light them. Hold on, Kay — I’m coming.' }
              ], () => setStage(3));
            }, 700);
          }
        }
      });
    });

    // lanterns
    world.lanterns.forEach(L => {
      interactables.push({
        x: L.x, z: L.z, r: 1.7, label: 'Light the lantern',
        active: () => !L.lit,
        act: () => {
          if (G.stage < 3) {
            UI.startDialogue([
              { name: 'Bea', text: 'The lantern is cold... it’s waiting for something. There’s a carving: “only a full heart may kindle me.”' }
            ]);
            return;
          }
          L.lit = true;
          L.boxM.color.setHex(0xffe9b8);
          L.boxM.emissive.setHex(0xffc46b);
          L.glow.visible = true;
          AudioMan.chime();
          spawnHearts(L.x, 2, L.z, 5);
          const litCount = world.lanterns.filter(l => l.lit).length;
          if (litCount >= 3) {
            setTimeout(openGate, 600);
          } else {
            UI.toast(litCount + ' of 3 lanterns lit', false, 2200);
          }
        }
      });
    });

    // sealed gate flavour
    interactables.push({
      x: 0, z: -5.2, r: 2.2, label: 'Inspect the gate',
      active: () => !G.gateOpen,
      act: () => UI.startDialogue([
        { name: 'Bea', text: 'A gate of hearts seals the bridge. The carving reads: “Full hearts light the way across the singing river.”' }
      ])
    });

    // Sausage (contextual hints)
    interactables.push({
      x: 0, z: 0, r: 1.3, label: 'Talk to Sausage', isCat: true,
      active: () => G.state === 'PLAY',
      act: () => {
        AudioMan.meow();
        const hints = {
          0: 'Mrrow~ The glitter came from under the big oak tree, just east of where you woke!',
          1: 'Your friends are in the village square — Porsha, Althea and Hailee! Each of them talked to Kay!',
          2: 'I can smell the blossoms — sweet like strawberries! Some grow near the village, some by the river. (' + G.heartsFound + '/7 so far!)',
          3: 'The three lanterns stand by the bridge, south of the river. Light every one!',
          4: 'The tower is just north, through the whispering forest. He’s waiting, Bea!'
        };
        UI.startDialogue([{ name: 'Sausage', text: hints[Math.max(0, G.stage)] || 'Purrrr...' }]);
      }
    });

    // Bea's friends (story beat: talk to all three)
    npcs.forEach(n => {
      interactables.push({
        x: n.x, z: n.z, r: 1.8, label: 'Talk to ' + n.name,
        active: () => G.stage >= 1,
        act: () => UI.startDialogue(n.lines, () => {
          if (G.stage !== 1 || n.talked) return;
          n.talked = true;
          AudioMan.collect();
          spawnHearts(n.x, 1.6, n.z, 5);
          const c = npcs.filter(m => m.talked).length;
          if (c >= npcs.length) {
            setTimeout(() => {
              UI.startDialogue([
                { name: 'Sausage', text: 'Three friends, three pieces of his plan! Mrrow — now follow the heart blossoms he planted!' },
                { name: 'Bea', text: 'Seven blossoms, seven reasons. I’m coming, Kay.' }
              ], () => setStage(2));
            }, 600);
          } else {
            UI.setObjective('Ask Bea’s friends in the village about Kay. (' + c + '/3)');
            UI.toast(n.name + ' ♥ — ' + c + ' of 3 friends found', false, 2600);
          }
        })
      });
    });
  }

  function openGate() {
    G.gateOpen = true;
    AudioMan.open();
    UI.startDialogue([
      { name: 'Sausage', text: 'The river is singing! The gate is opening, Bea — the way north is clear!' },
      { name: 'Bea', text: 'He’s close. I can feel it, like a heartbeat in the ground.' }
    ], () => {
      setStage(4);
      AudioMan.fanfare();
      G.gateSinking = true;
    });
  }

  /* ================= INTERACTION ================= */
  function nearestInteractable() {
    let best = null, bestD = 1e9;
    for (const it of interactables) {
      if (!it.active()) continue;
      const ix = it.isCat ? cat.position.x : it.x;
      const iz = it.isCat ? cat.position.z : it.z;
      const d = Math.hypot(bea.position.x - ix, bea.position.z - iz);
      if (d < it.r && d < bestD) { best = it; bestD = d; }
    }
    return best;
  }

  function tryInteract() {
    const it = nearestInteractable();
    if (it && !it.auto) it.act();
  }

  /* ================= MOVEMENT & COLLISION ================= */
  function blocked(x, z) {
    // world bounds
    if (Math.abs(x) > 92 || z > 88 || z < -86) return true;
    // river (except bridge corridor)
    const R = world.river;
    if (z > R.zMin && z < R.zMax && Math.abs(x) > R.bridgeHalf) return true;
    // gate (until opened)
    if (!G.gateOpen && z > -7.2 && z < -4.2 && Math.abs(x) < 3) return true;
    // circle solids
    for (const s of world.solids) {
      const dx = x - s.x, dz = z - s.z;
      if (dx * dx + dz * dz < (s.r + 0.42) * (s.r + 0.42)) return true;
    }
    return false;
  }

  function movePlayer(dt) {
    let ax = 0, az = 0;
    if (G.keys['KeyW'] || G.keys['ArrowUp']) az -= 1;
    if (G.keys['KeyS'] || G.keys['ArrowDown']) az += 1;
    if (G.keys['KeyA'] || G.keys['ArrowLeft']) ax -= 1;
    if (G.keys['KeyD'] || G.keys['ArrowRight']) ax += 1;

    beaMoving = (ax !== 0 || az !== 0);
    if (!beaMoving) return;

    const run = (G.keys['ShiftLeft'] || G.keys['ShiftRight']) ? 1.7 : 1;
    const speed = 4.2 * run;
    const len = Math.hypot(ax, az);
    ax /= len; az /= len;

    const nx = bea.position.x + ax * speed * dt;
    const nz = bea.position.z + az * speed * dt;
    if (!blocked(nx, bea.position.z)) bea.position.x = nx;
    if (!blocked(bea.position.x, nz)) bea.position.z = nz;

    // face movement direction (shortest-arc lerp)
    const target = Math.atan2(ax, az);
    let diff = target - bea.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    bea.rotation.y += diff * Math.min(1, dt * 14);

    // footsteps
    stepTimer -= dt;
    if (stepTimer <= 0) { AudioMan.step(); stepTimer = run > 1 ? 0.22 : 0.34; }
  }

  function moveCat(dt) {
    // follow a spot behind Bea
    const back = 1.5;
    const tx = bea.position.x - Math.sin(bea.rotation.y) * back + 0.6;
    const tz = bea.position.z - Math.cos(bea.rotation.y) * back + 0.3;
    const dx = tx - cat.position.x, dz = tz - cat.position.z;
    const d = Math.hypot(dx, dz);
    catMoving = d > 0.9;
    if (catMoving) {
      const sp = Math.min(7.5, 2.5 + d * 2.2);
      cat.position.x += (dx / d) * sp * dt;
      cat.position.z += (dz / d) * sp * dt;
      const targ = Math.atan2(dx, dz);
      let diff = targ - cat.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cat.rotation.y += diff * Math.min(1, dt * 10);
    }
  }

  /* ================= HEART PARTICLES ================= */
  function heartMat() {
    if (heartSpriteMat) return heartSpriteMat;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#ff6f9e';
    g.beginPath();
    g.moveTo(32, 56);
    g.bezierCurveTo(8, 38, 4, 22, 14, 13);
    g.bezierCurveTo(24, 5, 32, 14, 32, 20);
    g.bezierCurveTo(32, 14, 40, 5, 50, 13);
    g.bezierCurveTo(60, 22, 56, 38, 32, 56);
    g.fill();
    heartSpriteMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
    return heartSpriteMat;
  }

  function spawnHearts(x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(heartMat().clone());
      s.position.set(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6);
      const sc = 0.25 + Math.random() * 0.3;
      s.scale.setScalar(sc);
      s.userData = {
        vx: (Math.random() - 0.5) * 1.6,
        vy: 1.6 + Math.random() * 1.6,
        vz: (Math.random() - 0.5) * 1.6,
        life: 1.6 + Math.random() * 0.6
      };
      scene.add(s);
      heartBursts.push(s);
    }
  }

  function updateHearts(dt) {
    for (let i = heartBursts.length - 1; i >= 0; i--) {
      const s = heartBursts[i], u = s.userData;
      u.life -= dt;
      if (u.life <= 0) { scene.remove(s); heartBursts.splice(i, 1); continue; }
      s.position.x += u.vx * dt;
      s.position.y += u.vy * dt;
      s.position.z += u.vz * dt;
      u.vy -= 1.2 * dt;
      s.material.opacity = Math.min(1, u.life);
    }
  }

  /* ================= ENDING CUTSCENE ================= */
  function startEnding() {
    G.state = 'CUTSCENE';
    UI.hidePrompt();
    UI.setObjective('♥');
    ending = { phase: 0, t: 0 };

    kay = Chars.makeKay();
    kay.position.set(4.2, 0, -70);
    kay.rotation.y = Math.PI * 0.75;
    scene.add(kay);

    world.portal.visible = false;
    // Bea steps to her mark
    ending.beaFrom = bea.position.clone();
    ending.beaTo = new THREE.Vector3(-0.9, 0, -63.4);
    ending.kayFrom = kay.position.clone();
    ending.kayTo = new THREE.Vector3(0.9, 0, -63.4);
  }

  function updateEnding(dt) {
    ending.t += dt;
    const e = ending;

    if (e.phase === 0) {           // both walk to their marks
      const k = Math.min(1, e.t / 3.2);
      const ease = k * k * (3 - 2 * k);
      kay.position.lerpVectors(e.kayFrom, e.kayTo, ease);
      bea.position.lerpVectors(e.beaFrom, e.beaTo, Math.min(1, ease * 1.4));
      Chars.walkAnim(kay, G.time, k < 1);
      Chars.walkAnim(bea, G.time, ease < 0.7);
      // face each other
      kay.rotation.y = Math.atan2(bea.position.x - kay.position.x, bea.position.z - kay.position.z);
      bea.rotation.y = Math.atan2(kay.position.x - bea.position.x, kay.position.z - bea.position.z);
      if (k >= 1) {
        e.phase = 1;
        AudioMan.chime();
        UI.startDialogue([
          { name: 'Kay', text: 'Bea.' },
          { name: 'Bea', text: '...Kay? KAY!' },
          { name: 'Kay', text: 'You found me. I knew you would. I built this tower out of every “I love you” I never got to say out loud.' },
          { name: 'Bea', text: 'I crossed meadows, a singing river, and a whole dream to get here.' },
          { name: 'Kay', text: 'Then let’s make the next part easy. No more towers. No more searching. Just... home.' },
          { name: 'Sausage', text: 'Mrrow... (Finally.)' }
        ], () => { e.phase = 2; e.t = 0; });
      }
    } else if (e.phase === 2) {    // embrace + hearts
      const k = Math.min(1, e.t / 1.2);
      bea.position.x = -0.9 + k * 0.55;
      kay.position.x = 0.9 - k * 0.55;
      if (!e.burst && k >= 1) {
        e.burst = true;
        AudioMan.fanfare();
        spawnHearts(0, 1.6, -63.4, 26);
      }
      if (e.t > 3.2) {
        e.phase = 3;
        UI.fadeOutWhite();
      }
    } else if (e.phase === 3 && e.t > 5.8) {
      e.phase = 4;
      G.state = 'END';
      AudioMan.stopMusic();
      UI.showEnd();
    }
    Chars.catAnim(cat, G.time, false);
  }

  /* ================= MAIN LOOP ================= */
  function loop() {
    const dt = Math.min(clock.getDelta(), 0.05);
    G.time += dt;
    const t = G.time;

    // FPS counter
    fpsAcc += dt; fpsFrames++;
    if (fpsAcc >= 0.5) { UI.setFPS(Math.round(fpsFrames / fpsAcc)); fpsAcc = 0; fpsFrames = 0; }

    if (G.state === 'PLAY') {
      if (!UI.dialogueActive()) {
        movePlayer(dt);
        // auto-pickups + prompt
        const it = nearestInteractable();
        if (it) {
          if (it.auto) it.act();
          else UI.showPrompt(it.label);
        } else UI.hidePrompt();

        // finale trigger
        if (G.stage === 4 && Math.hypot(bea.position.x, bea.position.z + 62.5) < 2.4) {
          startEnding();
        }
      } else {
        beaMoving = false;
      }
      moveCat(dt);
      Chars.walkAnim(bea, t, beaMoving, (G.keys['ShiftLeft'] || G.keys['ShiftRight']) ? 1.35 : 1);
      Chars.catAnim(cat, t, catMoving);
    } else if (G.state === 'CUTSCENE') {
      updateEnding(dt);
    } else if (G.state === 'TITLE') {
      // gentle drift on title screen
      if (!G.freezeCam) camera.position.x = Math.sin(t * 0.12) * 2;
    }

    /* ----- ambient world animation (always) ----- */
    if (G.gateSinking && world.gate.visible) {
      world.gate.position.y -= dt * 1.1;
      if (world.gate.position.y < -2.6) world.gate.visible = false;
    }
    world.waterTex.offset.x += dt * 0.05;
    world.waterTex2.offset.x -= dt * 0.032;
    // drifting cherry petals
    const pe = world.petals;
    const parr = pe.pts.geometry.attributes.position.array;
    for (let i = 0; i < pe.data.length; i++) {
      const d = pe.data[i];
      d.y -= d.sp * dt;
      if (d.y < 0.1) d.y = 7.5;
      parr[i * 3] = d.x + Math.sin(t * 0.8 + d.ph) * 0.9;
      parr[i * 3 + 1] = d.y;
      parr[i * 3 + 2] = d.z + Math.cos(t * 0.6 + d.ph) * 0.5;
    }
    pe.pts.geometry.attributes.position.needsUpdate = true;
    world.clouds.forEach(c => {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 115) c.position.x = -115;
    });
    world.blossoms.forEach((b, i) => {
      if (b.taken) return;
      b.heart.rotation.y += dt * 1.6;
      b.heart.position.y = 0.85 + Math.sin(t * 2 + i) * 0.1;
    });
    world.letter.glow.material.opacity = 0.55 + Math.sin(t * 3) * 0.3;
    world.topHeart.rotation.y += dt * 0.8;
    if (world.portal.visible) {
      world.portalRing.rotation.z += dt * 0.6;
      world.portalHeart.rotation.y += dt * 1.4;
      world.portal.scale.setScalar(1 + Math.sin(t * 2.4) * 0.04);
    }
    // sparkles bobbing
    const sp = world.sparkles;
    const arr = sp.pts.geometry.attributes.position.array;
    for (let i = 0; i < sp.base.length; i++) {
      arr[i * 3 + 1] = sp.base[i][1] + Math.sin(t * 1.4 + sp.base[i][3]) * 0.3;
    }
    sp.pts.geometry.attributes.position.needsUpdate = true;

    // NPCs idle + face Bea when near
    npcs.forEach((n, i) => {
      Chars.walkAnim(n.grp, t + i * 1.7, false);
      const d = Math.hypot(bea.position.x - n.x, bea.position.z - n.z);
      if (d < 4) {
        const targ = Math.atan2(bea.position.x - n.x, bea.position.z - n.z);
        let diff = targ - n.grp.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        n.grp.rotation.y += diff * Math.min(1, dt * 5);
      }
    });

    updateHearts(dt);

    /* ----- camera & shadow follow ----- */
    if (G.state !== 'TITLE' && !G.freezeCam) {
      const px = bea.position.x, pz = bea.position.z;
      camera.position.x += (px - camera.position.x) * Math.min(1, dt * 5);
      camera.position.z += (pz + 9.5 - camera.position.z) * Math.min(1, dt * 5);
      camera.position.y += (7.6 - camera.position.y) * Math.min(1, dt * 5);
      camera.lookAt(camera.position.x, 1.0, camera.position.z - 9.5 - 1.5);
      world.sun.position.set(px + 18, 30, pz + 12);
      world.sun.target.position.set(px, 0, pz);
    }

    renderer.render(scene, camera);
  }

  init();
})();
