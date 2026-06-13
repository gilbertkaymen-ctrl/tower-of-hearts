/* ============ World: Lumière Vale — meadow, village, river, forest, tower ============ */
const World = (() => {

  // deterministic RNG so the world is always the same
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(20260611);

  const mat = (c, opts = {}) =>
    new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: Chars.rampTex }, opts));

  /* ---------- canvas helpers ---------- */
  function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, inner); grad.addColorStop(1, outer);
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function makeGlowSprite(color, size) {
    const m = new THREE.SpriteMaterial({
      map: glowTexture(), color, transparent: true, opacity: 0.85,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    const s = new THREE.Sprite(m);
    s.scale.setScalar(size);
    return s;
  }

  /* ---------- heart geometry ---------- */
  function makeHeartGeo(scale, depth) {
    const s = new THREE.Shape();
    s.moveTo(25, 25);
    s.bezierCurveTo(25, 25, 20, 0, 0, 0);
    s.bezierCurveTo(-30, 0, -30, 35, -30, 35);
    s.bezierCurveTo(-30, 55, -10, 77, 25, 95);
    s.bezierCurveTo(60, 77, 80, 55, 80, 35);
    s.bezierCurveTo(80, 35, 80, 0, 50, 0);
    s.bezierCurveTo(35, 0, 25, 25, 25, 25);
    const geo = new THREE.ExtrudeGeometry(s, { depth: depth, bevelEnabled: true, bevelSize: 3, bevelThickness: 3, bevelSegments: 2 });
    geo.center();
    geo.rotateZ(Math.PI);
    geo.scale(scale, scale, scale);
    return geo;
  }

  /* ---------- sky dome ---------- */
  function buildSky(scene) {
    const c = document.createElement('canvas'); c.width = 16; c.height = 512;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0.0, '#2e97ee');
    gr.addColorStop(0.40, '#73c4ff');
    gr.addColorStop(0.62, '#b4e2ff');
    gr.addColorStop(0.78, '#e4f5ff');
    gr.addColorStop(1.0, '#ffe4ea');
    g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(255, 24, 14),
      new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false })
    );
    scene.add(sky);
    return sky;
  }

  /* ---------- ground with painted path ---------- */
  const PATH_PTS = [
    [0, 82], [0, 60], [-2, 46], [0, 32], [0, 22], [0, 10],
    [0, -2], [0, -12], [0, -22], [1, -36], [2.5, -50], [0, -63], [0, -74]
  ];

  function buildGround(scene) {
    const SIZE = 200, RES = 2048;
    const c = document.createElement('canvas'); c.width = c.height = RES;
    const g = c.getContext('2d');
    const K = RES / 200;
    const px = (x, z) => [(x + 100) * K, (z + 100) * K];

    // grass base + large soft tone blotches
    g.fillStyle = '#5cb33e'; g.fillRect(0, 0, RES, RES);
    for (let i = 0; i < 70; i++) {
      const x = rng() * RES, y = rng() * RES, r = 90 + rng() * 240;
      const grd = g.createRadialGradient(x, y, 10, x, y, r);
      const col = rng() < 0.5 ? '74,160,48' : '120,205,80';
      grd.addColorStop(0, 'rgba(' + col + ',0.35)');
      grd.addColorStop(1, 'rgba(' + col + ',0)');
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // fine mottle
    for (let i = 0; i < 5200; i++) {
      g.fillStyle = rng() < 0.5 ? 'rgba(72,158,50,0.42)' : 'rgba(130,212,86,0.38)';
      const s = 5 + rng() * 18;
      g.fillRect(rng() * RES, rng() * RES, s, s);
    }
    // grass blade ticks
    g.strokeStyle = 'rgba(52,132,38,0.5)'; g.lineWidth = 2.4; g.lineCap = 'round';
    for (let i = 0; i < 2400; i++) {
      const x = rng() * RES, y = rng() * RES, a = (rng() - 0.5) * 0.9;
      g.beginPath(); g.moveTo(x, y);
      g.lineTo(x + Math.sin(a) * 8, y - 8 - rng() * 5);
      g.stroke();
    }
    // darker forest floor (north band)
    g.fillStyle = 'rgba(58,128,52,0.34)';
    const [, fz] = px(0, -20);
    g.fillRect(0, 0, RES, fz);
    for (let i = 0; i < 90; i++) { // blotchy edge
      const x = rng() * RES;
      g.beginPath(); g.arc(x, fz + rng() * 24, 16 + rng() * 30, 0, 7); g.fill();
    }

    // sandy plazas + cobble dots + ring
    function plaza(cxz, r) {
      const [cx, cz] = px(cxz[0], cxz[1]);
      g.fillStyle = '#e4c684';
      g.beginPath(); g.arc(cx, cz, r, 0, 7); g.fill();
      g.strokeStyle = 'rgba(190,150,95,0.65)'; g.lineWidth = 9;
      g.beginPath(); g.arc(cx, cz, r - 10, 0, 7); g.stroke();
      g.fillStyle = 'rgba(198,162,106,0.4)';
      for (let i = 0; i < 130; i++) {
        const a = rng() * 6.28, d = rng() * (r - 26);
        g.beginPath(); g.arc(cx + Math.cos(a) * d, cz + Math.sin(a) * d, 5 + rng() * 7, 0, 7); g.fill();
      }
    }
    plaza([0, 22], 156);
    plaza([0, -71], 176);

    // path: soft edge pass then core, plus pebbles
    function paintPath(radius, style) {
      g.fillStyle = style;
      for (let i = 0; i < PATH_PTS.length - 1; i++) {
        const a = PATH_PTS[i], b = PATH_PTS[i + 1];
        const steps = 40;
        for (let s = 0; s <= steps; s++) {
          const x = a[0] + (b[0] - a[0]) * (s / steps);
          const z = a[1] + (b[1] - a[1]) * (s / steps);
          const [cx, cz] = px(x, z);
          g.beginPath(); g.arc(cx, cz, radius, 0, 7); g.fill();
        }
      }
    }
    paintPath(32, 'rgba(186,148,94,0.6)');
    paintPath(25, '#e0b873');
    g.fillStyle = 'rgba(170,134,88,0.6)';
    for (let i = 0; i < PATH_PTS.length - 1; i++) {
      const a = PATH_PTS[i], b = PATH_PTS[i + 1];
      for (let s = 0; s < 40; s++) {
        const x = a[0] + (b[0] - a[0]) * rng();
        const z = a[1] + (b[1] - a[1]) * rng();
        const [cx, cz] = px(x, z);
        g.beginPath();
        g.arc(cx + (rng() - 0.5) * 38, cz + (rng() - 0.5) * 38, 0.8 + rng() * 1.4, 0, 7);
        g.fill();
      }
    }

    // riverbank sand
    g.fillStyle = '#e6d2a0';
    const [, bz1] = px(0, -7.4); const [, bz2] = px(0, -16.6);
    g.fillRect(0, bz1 - 10, RES, 14); g.fillRect(0, bz2 - 4, RES, 14);

    // flower patches in the meadow
    const petalCols = ['#ffd9e8', '#fff3b8', '#ffffff', '#ffc4d6', '#e8d4ff'];
    for (let i = 0; i < 110; i++) {
      const fx = rng() * RES, fz2 = ((rng() * 0.42) + 0.56) * RES;
      const n = 4 + (rng() * 4 | 0);
      for (let j = 0; j < n; j++) {
        g.fillStyle = petalCols[(rng() * petalCols.length) | 0];
        const ox = fx + (rng() - 0.5) * 26, oz = fz2 + (rng() - 0.5) * 26;
        g.beginPath(); g.arc(ox, oz, 2 + rng() * 2, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,240,160,0.9)';
        g.beginPath(); g.arc(ox, oz, 0.9, 0, 7); g.fill();
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(SIZE, SIZE),
      new THREE.MeshToonMaterial({ map: tex, gradientMap: Chars.rampTex })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  /* ---------- river + bridge ---------- */
  function buildRiver(scene) {
    function waterCanvas(alpha) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64;
      const g = c.getContext('2d');
      if (alpha) { g.clearRect(0, 0, 256, 64); }
      else { g.fillStyle = '#36a8dd'; g.fillRect(0, 0, 256, 64); }
      g.strokeStyle = 'rgba(255,255,255,' + (alpha ? 0.55 : 0.35) + ')';
      g.lineWidth = 2; g.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const y = rng() * 64, x = rng() * 256, len = 18 + rng() * 36;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + len * 0.5, y + (rng() - 0.5) * 5, x + len, y);
        g.stroke();
      }
      const t = new THREE.CanvasTexture(c);
      t.encoding = THREE.sRGBEncoding;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    }

    const tex = waterCanvas(false);
    tex.repeat.set(12, 1);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 9.4),
      new THREE.MeshToonMaterial({ map: tex, gradientMap: Chars.rampTex })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.03, -12);
    scene.add(water);

    const tex2 = waterCanvas(true);
    tex2.repeat.set(16, 1);
    const water2 = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 9.4),
      new THREE.MeshBasicMaterial({ map: tex2, transparent: true, opacity: 0.5, depthWrite: false })
    );
    water2.rotation.x = -Math.PI / 2;
    water2.position.set(0, 0.05, -12);
    scene.add(water2);

    // foam strips on both banks
    [-7.55, -16.45].forEach(z => {
      const foam = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 0.42),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false })
      );
      foam.rotation.x = -Math.PI / 2;
      foam.position.set(0, 0.06, z);
      scene.add(foam);
    });

    // bridge
    const wood = mat(0xa8744a), woodDark = mat(0x84562f);
    const bridge = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.18, 13), wood);
    deck.position.set(0, 0.12, -12);
    deck.castShadow = deck.receiveShadow = true;
    bridge.add(deck);
    // plank lines
    for (let i = -5; i <= 5; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(4.62, 0.02, 0.08), woodDark);
      plank.position.set(0, 0.215, -12 + i * 1.15);
      bridge.add(plank);
    }
    [-1, 1].forEach(sx => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 13), woodDark);
      rail.position.set(sx * 2.1, 0.95, -12);
      bridge.add(rail);
      [-6, -3, 0, 3, 6].forEach(z => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 8), woodDark);
        post.position.set(sx * 2.1, 0.55, -12 + z);
        post.castShadow = true;
        bridge.add(post);
      });
    });
    scene.add(bridge);
    return { waterTex: tex, waterTex2: tex2 };
  }

  /* ---------- gate of hearts ---------- */
  function buildGate(scene) {
    const gate = new THREE.Group();
    const wood = mat(0xc98a52);
    [-1, 1].forEach(s => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.0, 10), wood);
      post.position.set(s * 2.3, 1.0, 0);
      post.castShadow = true;
      gate.add(post);
    });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.6, 8), wood);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.55, 0);
    gate.add(bar);
    const heartGeo = makeHeartGeo(0.0035, 10);
    const heartM = mat(0xff7ba2, { emissive: 0xff7ba2, emissiveIntensity: 0.35 });
    for (let i = -2; i <= 2; i++) {
      const h = new THREE.Mesh(heartGeo, heartM);
      h.position.set(i * 0.8, 1.18 - Math.abs(i) * 0.07, 0);
      gate.add(h);
    }
    gate.position.set(0, 0, -5.2);
    scene.add(gate);
    return gate;
  }

  /* ---------- trees (instanced, green / deep-forest / pink blossom) ---------- */
  function buildTrees(scene, solids) {
    const spots = [];
    // forest band
    for (let i = 0; i < 60; i++) {
      const x = (rng() * 2 - 1) * 80;
      const z = -22 - rng() * 32;
      if (Math.abs(x - (z < -45 ? 2.5 : 1)) < 7) continue;
      if (Math.hypot(x, z + 71) < 16) continue;
      spots.push([x, z, 0.9 + rng() * 0.5, 'deep']);
    }
    // meadow scatter (some pink blossoms)
    for (let i = 0; i < 26; i++) {
      const x = (rng() * 2 - 1) * 85;
      const z = 38 + rng() * 48;
      if (Math.abs(x) < 8) continue;
      spots.push([x, z, 0.8 + rng() * 0.45, rng() < 0.35 ? 'pink' : 'green']);
    }
    // village ring
    [[-20, 24, 'pink'], [20, 30, 'green'], [-19, 12, 'green'], [22, 16, 'pink']].forEach(p =>
      spots.push([p[0], p[1], 1, p[2]]));

    const palettes = {
      green: [0x58b84c, 0x74d263, 0x49a843],
      deep: [0x3f9a44, 0x57b054, 0x35853f],
      pink: [0xff9ec4, 0xffb6d2, 0xf08bb4]
    };

    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 1.6, 8);
    const folGeo = new THREE.SphereGeometry(1, 14, 11);
    const trunks = new THREE.InstancedMesh(trunkGeo, mat(0x82593a), spots.length);
    trunks.castShadow = true;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    spots.forEach((p, i) => {
      dummy.position.set(p[0], 0.8 * p[2], p[1]);
      dummy.scale.setScalar(p[2]);
      dummy.rotation.set(0, rng() * 6.28, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      solids.push({ x: p[0], z: p[1], r: 0.65 * p[2] });
    });
    scene.add(trunks);

    for (let layer = 0; layer < 3; layer++) {
      const inst = new THREE.InstancedMesh(folGeo, mat(0xffffff), spots.length);
      inst.castShadow = true;
      spots.forEach((p, i) => {
        const s = p[2];
        dummy.position.set(
          p[0] + (layer === 1 ? 0.4 * s : layer === 2 ? -0.35 * s : 0),
          (1.9 + layer * 0.55) * s,
          p[1] + (layer === 1 ? 0.25 * s : layer === 2 ? -0.3 * s : 0)
        );
        dummy.scale.setScalar((1.05 - layer * 0.18) * s);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        const jitter = 0.92 + rng() * 0.16;
        color.setHex(palettes[p[3]][layer]).multiplyScalar(jitter);
        inst.setColorAt(i, color);
      });
      scene.add(inst);
    }

    // the big oak by the spawn
    const oak = new THREE.Group();
    const oakTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 3.2, 10), mat(0x82593a));
    oakTrunk.position.y = 1.6; oakTrunk.castShadow = true;
    oak.add(oakTrunk);
    [[0, 4.4, 0, 2.2, 0x58b84c], [1.3, 3.8, 0.5, 1.5, 0x74d263], [-1.2, 3.9, -0.4, 1.6, 0x49a843], [0.2, 3.6, 1.2, 1.3, 0x65c457]].forEach(p => {
      const f = new THREE.Mesh(folGeo, mat(p[4]));
      f.position.set(p[0], p[1], p[2]);
      f.scale.setScalar(p[3]);
      f.castShadow = true;
      oak.add(f);
    });
    oak.position.set(9, 0, 66);
    scene.add(oak);
    solids.push({ x: 9, z: 66, r: 1.3 });
  }

  /* ---------- flowers (instanced) ---------- */
  function buildFlowers(scene) {
    const N = 300;
    const stemGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.3, 5);
    const headGeo = new THREE.SphereGeometry(0.09, 8, 6);
    const stems = new THREE.InstancedMesh(stemGeo, mat(0x44a040), N);
    const heads = new THREE.InstancedMesh(headGeo, mat(0xffffff), N);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const palette = [0xff8fb5, 0xfff2a0, 0xffffff, 0xc9a0ff, 0xffb6c9];
    for (let i = 0; i < N; i++) {
      let x, z;
      if (rng() < 0.7) { x = (rng() * 2 - 1) * 60; z = 40 + rng() * 45; }
      else { x = (rng() * 2 - 1) * 40; z = -2 - rng() * 4; }
      if (Math.abs(x) < 1.6) x += 3 * Math.sign(x || 1);
      dummy.position.set(x, 0.15, z);
      dummy.rotation.set(0, 0, (rng() - 0.5) * 0.3);
      dummy.updateMatrix();
      stems.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 0.33;
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
      heads.setColorAt(i, color.setHex(palette[(rng() * palette.length) | 0]));
    }
    scene.add(stems, heads);
  }

  /* ---------- decorative picket fences (no collision; low + gappy) ---------- */
  function buildFences(scene) {
    const fenceM = mat(0xfff2e0);
    const segs = [
      [-3.4, 66, 72], [3.4, 66, 72],   // near spawn
      [-3.4, 40, 46], [3.4, 40, 46]    // village entrance
    ];
    const posts = [];
    segs.forEach(s => {
      for (let z = s[1]; z <= s[2]; z += 1.5) posts.push([s[0], z]);
    });
    const postGeo = new THREE.BoxGeometry(0.13, 0.72, 0.13);
    const inst = new THREE.InstancedMesh(postGeo, fenceM, posts.length);
    inst.castShadow = true;
    const dummy = new THREE.Object3D();
    posts.forEach((p, i) => {
      dummy.position.set(p[0], 0.36, p[1]);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    scene.add(inst);
    segs.forEach(s => {
      [0.5, 0.24].forEach(y => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, s[2] - s[1] + 0.4), fenceM);
        rail.position.set(s[0], y, (s[1] + s[2]) / 2);
        rail.castShadow = true;
        scene.add(rail);
      });
    });
  }

  /* ---------- bushes & rocks ---------- */
  function buildBushesRocks(scene, solids) {
    const bushGeo = new THREE.SphereGeometry(1, 10, 8);
    const bushSpots = [];
    [[-12, 30], [13, 28], [-11, 15], [13, 13]].forEach(h => { // hug the houses
      bushSpots.push([h[0] - 2.6, h[1] + 1.5, 0.55], [h[0] + 2.7, h[1] - 1.2, 0.45]);
    });
    for (let i = 0; i < 14; i++) {
      const x = (rng() * 2 - 1) * 70, z = 36 + rng() * 48;
      if (Math.abs(x) < 6) continue;
      bushSpots.push([x, z, 0.4 + rng() * 0.45]);
    }
    const bushes = new THREE.InstancedMesh(bushGeo, mat(0x3e9a48), bushSpots.length);
    bushes.castShadow = true;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    bushSpots.forEach((b, i) => {
      dummy.position.set(b[0], b[2] * 0.55, b[1]);
      dummy.scale.set(b[2] * 1.3, b[2] * 0.8, b[2] * 1.3);
      dummy.rotation.set(0, rng() * 6.28, 0);
      dummy.updateMatrix();
      bushes.setMatrixAt(i, dummy.matrix);
      color.setHex(0x3e9a48).multiplyScalar(0.9 + rng() * 0.25);
      bushes.setColorAt(i, color);
    });
    scene.add(bushes);

    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockSpots = [];
    for (let i = 0; i < 16; i++) {
      const x = (rng() * 2 - 1) * 80, z = (rng() * 2 - 1) * 84;
      if (Math.abs(x) < 5) continue;
      if (z > -16.6 && z < -7.4) continue; // not in the river
      rockSpots.push([x, z, 0.25 + rng() * 0.5]);
    }
    const rocks = new THREE.InstancedMesh(rockGeo, mat(0xb0b4ba), rockSpots.length);
    rocks.castShadow = true;
    rockSpots.forEach((r, i) => {
      dummy.position.set(r[0], r[2] * 0.4, r[1]);
      dummy.scale.set(r[2], r[2] * 0.7, r[2]);
      dummy.rotation.set(rng() * 0.4, rng() * 6.28, rng() * 0.4);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
      color.setHex(0xb0b4ba).multiplyScalar(0.85 + rng() * 0.3);
      rocks.setColorAt(i, color);
      if (r[2] > 0.5) solids.push({ x: r[0], z: r[1], r: r[2] });
    });
    scene.add(rocks);
  }

  /* ---------- village houses + lamps ---------- */
  function buildVillage(scene, solids) {
    const defs = [
      { x: -12, z: 30, w: 5, c: 0xfff1dc, roof: 0xff8f7a, rot: 0.5 },
      { x: 13, z: 28, w: 5.5, c: 0xfde8ff, roof: 0x9aa7ff, rot: -0.5 },
      { x: -11, z: 15, w: 4.6, c: 0xfffbe8, roof: 0x7fcf8a, rot: 0.9 },
      { x: 13, z: 13, w: 4.6, c: 0xffe8e8, roof: 0xffc46b, rot: -0.9 }
    ];
    defs.forEach(d => {
      const h = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(d.w, 2.6, d.w * 0.85), mat(d.c));
      base.position.y = 1.3;
      base.castShadow = base.receiveShadow = true;
      h.add(base);
      // timber trim
      const trim = new THREE.Mesh(new THREE.BoxGeometry(d.w + 0.06, 0.18, d.w * 0.85 + 0.06), mat(0xa8744a));
      trim.position.y = 2.52;
      h.add(trim);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(d.w * 0.82, 2, 4), mat(d.roof));
      roof.position.y = 3.55;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      h.add(roof);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.1), mat(0x8a5a38));
      door.position.set(0, 0.75, d.w * 0.425 + 0.02);
      h.add(door);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), mat(0xffd97a, { emissive: 0xffd97a, emissiveIntensity: 0.3 }));
      knob.position.set(0.28, 0.78, d.w * 0.425 + 0.08);
      h.add(knob);
      [-1, 1].forEach(s => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.1),
          mat(0xfff4cc, { emissive: 0xffe9a8, emissiveIntensity: 0.45 }));
        win.position.set(s * d.w * 0.28, 1.7, d.w * 0.425 + 0.02);
        h.add(win);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.12), mat(0xffffff));
        frame.position.set(s * d.w * 0.28, 1.32, d.w * 0.425 + 0.04);
        h.add(frame);
      });
      h.position.set(d.x, 0, d.z);
      h.rotation.y = d.rot;
      scene.add(h);
      solids.push({ x: d.x, z: d.z, r: d.w * 0.62 });
    });

    // street lamps around the plaza
    [[-6.5, 29], [6.5, 29], [-6.5, 15], [6.5, 15]].forEach(p => {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.3, 8), mat(0x3c4452));
      pole.position.y = 1.15;
      pole.castShadow = true;
      lamp.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10),
        mat(0xfff0c0, { emissive: 0xffe9a8, emissiveIntensity: 0.8 }));
      bulb.position.y = 2.42;
      lamp.add(bulb);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.16, 8), mat(0x3c4452));
      cap.position.y = 2.6;
      lamp.add(cap);
      const glow = makeGlowSprite(0xffe9b0, 1.4);
      glow.material.opacity = 0.5;
      glow.position.y = 2.42;
      lamp.add(glow);
      lamp.position.set(p[0], 0, p[1]);
      scene.add(lamp);
      solids.push({ x: p[0], z: p[1], r: 0.25 });
    });

    // village sign
    const sign = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.4, 8), mat(0x8a5a38));
    post.position.y = 0.7;
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.1), mat(0xc98a52));
    board.position.y = 1.3;
    sign.add(post, board);
    sign.position.set(3, 0, 34);
    sign.rotation.y = -0.3;
    scene.add(sign);
  }

  /* ---------- quest lanterns ---------- */
  function buildLanterns(scene, solids) {
    const defs = [[-5, -3.2], [0, -2.6], [5, -3.2]];
    return defs.map(d => {
      const grp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.7, 8), mat(0x4a4458));
      pole.position.y = 0.85;
      pole.castShadow = true;
      grp.add(pole);
      const boxM = mat(0x8a8496, { emissive: 0x000000, emissiveIntensity: 1 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.34), boxM);
      box.position.y = 1.9;
      box.castShadow = true;
      grp.add(box);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.24, 4), mat(0x4a4458));
      cap.position.y = 2.22; cap.rotation.y = Math.PI / 4;
      grp.add(cap);
      const heart = new THREE.Mesh(makeHeartGeo(0.0018, 10), mat(0xff7ba2, { emissive: 0xff7ba2, emissiveIntensity: 0.3 }));
      heart.position.y = 2.45;
      grp.add(heart);
      const glow = makeGlowSprite(0xffd9a0, 2.6);
      glow.position.y = 1.9;
      glow.visible = false;
      grp.add(glow);
      grp.position.set(d[0], 0, d[1]);
      scene.add(grp);
      solids.push({ x: d[0], z: d[1], r: 0.3 });
      return { grp, boxM, glow, lit: false, x: d[0], z: d[1] };
    });
  }

  /* ---------- the Tower of Hearts ---------- */
  function buildTower(scene, solids) {
    const tower = new THREE.Group();
    const bronz = mat(0x9c6840);
    const bronzDark = mat(0x7e5232);

    function beam(p1, p2, thick, material) {
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const len = dir.length();
      const m = new THREE.Mesh(new THREE.BoxGeometry(thick, len, thick), material || bronz);
      m.position.copy(p1).addScaledVector(dir, 0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      m.castShadow = true;
      return m;
    }
    const V = (x, y, z) => new THREE.Vector3(x, y, z);

    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    corners.forEach(c => {
      tower.add(beam(V(c[0] * 4.6, 0, c[1] * 4.6), V(c[0] * 2.1, 8, c[1] * 2.1), 0.8));
      solids.push({ x: c[0] * 4.6, z: -71 + c[1] * 4.6, r: 1.0 });
    });
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      tower.add(beam(V(a[0] * 3.4, 3.8, a[1] * 3.4), V(b[0] * 3.4, 3.8, b[1] * 3.4), 0.3, bronzDark));
      tower.add(beam(V(a[0] * 2.1, 8, a[1] * 2.1), V(b[0] * 2.1, 8, b[1] * 2.1), 0.35, bronzDark));
      tower.add(beam(V(a[0] * 4.2, 1, a[1] * 4.2), V(b[0] * 2.6, 7, b[1] * 2.6), 0.16, bronzDark));
      tower.add(beam(V(b[0] * 4.2, 1, b[1] * 4.2), V(a[0] * 2.6, 7, a[1] * 2.6), 0.16, bronzDark));
    }
    const plat1 = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 5.4), bronz);
    plat1.position.y = 8.2; plat1.castShadow = true;
    tower.add(plat1);

    corners.forEach(c => tower.add(beam(V(c[0] * 2.0, 8.4, c[1] * 2.0), V(c[0] * 1.0, 13.5, c[1] * 1.0), 0.5)));
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      tower.add(beam(V(a[0] * 1.55, 11, a[1] * 1.55), V(b[0] * 1.55, 11, b[1] * 1.55), 0.2, bronzDark));
    }
    const plat2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.4, 2.8), bronz);
    plat2.position.y = 13.7; plat2.castShadow = true;
    tower.add(plat2);

    corners.forEach(c => tower.add(beam(V(c[0] * 0.95, 13.9, c[1] * 0.95), V(c[0] * 0.35, 18.2, c[1] * 0.35), 0.32)));
    const plat3 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 1.4), bronz);
    plat3.position.y = 18.3; plat3.castShadow = true;
    tower.add(plat3);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 2.2, 8), bronz);
    spire.position.y = 19.5;
    tower.add(spire);

    const topHeart = new THREE.Mesh(
      makeHeartGeo(0.012, 10),
      mat(0xff5f96, { emissive: 0xff5f96, emissiveIntensity: 0.9 })
    );
    topHeart.position.y = 21.2;
    tower.add(topHeart);
    const topGlow = makeGlowSprite(0xff9fc0, 6);
    topGlow.position.y = 21.2;
    tower.add(topGlow);

    tower.position.set(0, 0, -71);
    scene.add(tower);
    return { tower, topHeart };
  }

  /* ---------- portal ---------- */
  function buildPortal(scene) {
    const portal = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.7, 0.13, 12, 40),
      mat(0xff7ba2, { emissive: 0xff7ba2, emissiveIntensity: 0.8 })
    );
    ring.position.y = 1.9;
    portal.add(ring);
    const heart = new THREE.Mesh(
      makeHeartGeo(0.011, 12),
      mat(0xffb6d0, { emissive: 0xff8fb5, emissiveIntensity: 0.9 })
    );
    heart.position.y = 1.9;
    portal.add(heart);
    const glow = makeGlowSprite(0xffb6d0, 3.6);
    glow.material.opacity = 0.5;
    glow.position.y = 1.9;
    portal.add(glow);
    portal.position.set(0, 0, -62.5);
    portal.visible = false;
    scene.add(portal);
    return { portal, ring, heart };
  }

  /* ---------- heart blossoms ---------- */
  const BLOSSOM_SPOTS = [
    [6, 58], [-8, 52], [15, 42], [-15, 34], [5, 8], [-7, 2], [11, -1]
  ];
  function buildBlossoms(scene) {
    const geo = makeHeartGeo(0.0045, 12);
    return BLOSSOM_SPOTS.map(p => {
      const grp = new THREE.Group();
      const heart = new THREE.Mesh(geo, mat(0xff6f9e, { emissive: 0xff6f9e, emissiveIntensity: 0.55 }));
      heart.position.y = 0.85;
      heart.castShadow = true;
      grp.add(heart);
      const glow = makeGlowSprite(0xffaac8, 1.7);
      glow.position.y = 0.85;
      grp.add(glow);
      grp.position.set(p[0], 0, p[1]);
      scene.add(grp);
      return { grp, heart, x: p[0], z: p[1], taken: false };
    });
  }

  /* ---------- the letter ---------- */
  function buildLetter(scene) {
    const grp = new THREE.Group();
    const paper = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.02, 0.36),
      mat(0xfffdf0, { emissive: 0xfff8d0, emissiveIntensity: 0.25 })
    );
    paper.position.y = 0.06;
    paper.rotation.y = 0.4;
    grp.add(paper);
    const seal = new THREE.Mesh(makeHeartGeo(0.0012, 8), mat(0xe2476f, { emissive: 0xe2476f, emissiveIntensity: 0.4 }));
    seal.position.set(0, 0.09, 0);
    seal.rotation.x = -Math.PI / 2;
    grp.add(seal);
    const glow = makeGlowSprite(0xfff2b0, 1.6);
    glow.position.y = 0.35;
    grp.add(glow);
    grp.position.set(7.4, 0, 64);
    scene.add(grp);
    return { grp, glow, x: 7.4, z: 64 };
  }

  /* ---------- clouds, sparkles, falling petals ---------- */
  function buildClouds(scene) {
    const clouds = [];
    const cm = new THREE.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.94, gradientMap: Chars.rampTex });
    for (let i = 0; i < 9; i++) {
      const grp = new THREE.Group();
      const n = 3 + ((rng() * 2) | 0);
      for (let j = 0; j < n; j++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(1.6 + rng() * 1.6, 10, 8), cm);
        s.position.set(j * 2.2 - n, rng() * 0.6, rng() * 1.6 - 0.8);
        s.scale.y = 0.55;
        grp.add(s);
      }
      grp.position.set((rng() * 2 - 1) * 100, 24 + rng() * 9, (rng() * 2 - 1) * 90);
      grp.userData.speed = 0.4 + rng() * 0.5;
      scene.add(grp);
      clouds.push(grp);
    }
    return clouds;
  }

  function buildSparkles(scene) {
    const N = 70;
    const pos = new Float32Array(N * 3);
    const base = [];
    for (let i = 0; i < N; i++) {
      const x = (rng() * 2 - 1) * 60;
      const z = -20 - rng() * 38;
      const y = 0.5 + rng() * 2.2;
      base.push([x, y, z, rng() * 6.28]);
      pos.set([x, y, z], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.22, map: glowTexture(), color: 0xffd9ec, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    }));
    scene.add(pts);
    return { pts, base };
  }

  function petalTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.translate(32, 32); g.rotate(0.6);
    g.fillStyle = '#ffc2d6';
    g.beginPath(); g.ellipse(0, 0, 11, 19, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath(); g.ellipse(-3, -5, 4, 9, 0.3, 0, 7); g.fill();
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  function buildPetals(scene) {
    const N = 130;
    const pos = new Float32Array(N * 3);
    const data = [];
    for (let i = 0; i < N; i++) {
      const d = {
        x: (rng() * 2 - 1) * 85,
        y: 0.5 + rng() * 7,
        z: (rng() * 2 - 1) * 85,
        sp: 0.45 + rng() * 0.6,
        ph: rng() * 6.28
      };
      data.push(d);
      pos.set([d.x, d.y, d.z], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.3, map: petalTexture(), transparent: true, alphaTest: 0.15,
      depthWrite: false, sizeAttenuation: true
    }));
    scene.add(pts);
    return { pts, data };
  }

  /* ---------- build everything ---------- */
  function build(scene) {
    const solids = [];

    scene.background = new THREE.Color(0x73c4ff);
    scene.fog = new THREE.Fog(0xc2e6fa, 58, 145);

    const hemi = new THREE.HemisphereLight(0xdff2ff, 0x55a83a, 0.55);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.05);
    sun.position.set(18, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -28; sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28; sun.shadow.camera.bottom = -28;
    sun.shadow.camera.far = 90;
    sun.shadow.bias = -0.001;
    scene.add(sun); scene.add(sun.target);

    buildSky(scene);
    buildGround(scene);
    const { waterTex, waterTex2 } = buildRiver(scene);
    const gate = buildGate(scene);
    buildTrees(scene, solids);
    buildFlowers(scene);
    buildFences(scene);
    buildBushesRocks(scene, solids);
    buildVillage(scene, solids);
    const lanterns = buildLanterns(scene, solids);
    const { topHeart } = buildTower(scene, solids);
    const { portal, ring, heart: portalHeart } = buildPortal(scene);
    const blossoms = buildBlossoms(scene);
    const letter = buildLetter(scene);
    const clouds = buildClouds(scene);
    const sparkles = buildSparkles(scene);
    const petals = buildPetals(scene);

    return {
      solids, sun, waterTex, waterTex2, gate, lanterns, topHeart,
      portal, portalRing: ring, portalHeart,
      blossoms, letter, clouds, sparkles, petals,
      makeHeartGeo, makeGlowSprite,
      river: { zMin: -16.6, zMax: -7.4, bridgeHalf: 2.2 }
    };
  }

  return { build };
})();
