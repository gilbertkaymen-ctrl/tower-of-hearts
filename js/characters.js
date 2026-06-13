/* ============ Chibi character builders (BDSP-style: toon shading + painted faces) ============ */
const Chars = (() => {

  /* shared 4-step toon ramp */
  const rampTex = (() => {
    const data = new Uint8Array([
      128, 128, 128, 255,
      180, 180, 180, 255,
      230, 230, 230, 255,
      255, 255, 255, 255
    ]);
    const t = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  })();

  const mat = (c, opts = {}) =>
    new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: rampTex }, opts));

  const css = h => '#' + h.toString(16).padStart(6, '0');
  function shade(hex, f) { // f<1 darker, f>1 lighter
    const c = new THREE.Color(hex);
    c.r = Math.min(1, c.r * f); c.g = Math.min(1, c.g * f); c.b = Math.min(1, c.b * f);
    return '#' + c.getHexString();
  }

  function sphere(r, material, sx = 1, sy = 1, sz = 1, seg = 24) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(12, seg * 0.7 | 0)), material);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    return m;
  }

  function capsule(r, len, material) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), material);
    m.castShadow = true;
    return m;
  }

  function lathe(pts, material, phiStart, phiLength) {
    const v = pts.map(p => new THREE.Vector2(p[0], p[1]));
    const m = new THREE.Mesh(
      new THREE.LatheGeometry(v, 28, phiStart || 0, phiLength || Math.PI * 2), material);
    m.castShadow = true;
    return m;
  }

  /* Blender-sculpted part from js/models.js (null -> caller falls back to procedural) */
  const partGeoCache = {};
  function partMesh(name, material) {
    const d = (typeof MODELS !== 'undefined' && MODELS) ? MODELS[name] : null;
    if (!d) return null;
    let geo = partGeoCache[name];
    if (!geo) {
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(d.p, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(d.n, 3));
      geo.setIndex(d.i);
      partGeoCache[name] = geo;
    }
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true;
    return m;
  }

  /* ---------- painted anime face on a canvas texture ---------- */
  function ellipse(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); }

  function faceTexture(o) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = o.skin; g.fillRect(0, 0, 512, 512);

    const cx = 256, ey = 268, gap = o.gap || 57;
    const eyeW = o.eyeW || 23, eyeH = o.eyeH || 31;
    const dark = o.line || '#33231d';
    g.lineCap = 'round';

    // blush first (under everything)
    if (o.blush) {
      [-1, 1].forEach(s => {
        const bg = g.createRadialGradient(cx + s * 104, 306, 4, cx + s * 104, 306, 30);
        bg.addColorStop(0, 'rgba(255,135,160,0.55)');
        bg.addColorStop(1, 'rgba(255,135,160,0)');
        g.fillStyle = bg;
        g.fillRect(cx + s * 104 - 32, 272, 64, 64);
      });
    }
    if (o.freckles) {
      g.fillStyle = 'rgba(190,120,80,0.5)';
      [-1, 1].forEach(s => [0, 1, 2].forEach(i => {
        ellipse(g, cx + s * (88 + i * 13), 300 + (i % 2) * 7, 3.2, 3.2); g.fill();
      }));
    }

    if (o.closedEyes) {
      g.strokeStyle = dark; g.lineWidth = 10;
      [-1, 1].forEach(s => {
        g.beginPath(); g.arc(cx + s * gap, ey + 8, 24, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      });
    } else {
      [-1, 1].forEach(s => {
        const ex = cx + s * gap;
        g.fillStyle = '#ffffff';
        ellipse(g, ex, ey, eyeW + 4, eyeH + 4); g.fill();
        const ig = g.createLinearGradient(0, ey - eyeH, 0, ey + eyeH);
        ig.addColorStop(0, o.eyeTop || shade(o.eyeHex, 0.45));
        ig.addColorStop(0.55, o.eye);
        ig.addColorStop(1, shade(o.eyeHex, 1.5));
        g.fillStyle = ig;
        ellipse(g, ex, ey + 2, eyeW, eyeH); g.fill();
        g.fillStyle = dark;
        ellipse(g, ex, ey + 4, eyeW * 0.42, eyeH * 0.48); g.fill();
        g.fillStyle = '#ffffff';
        ellipse(g, ex - eyeW * 0.34, ey - eyeH * 0.34, 8.5, 9.5); g.fill();
        ellipse(g, ex + eyeW * 0.32, ey + eyeH * 0.42, 4, 4.5); g.fill();
        // upper lashline
        g.strokeStyle = dark; g.lineWidth = o.lashes ? 12 : 9;
        g.beginPath();
        g.ellipse(ex, ey, eyeW + 5, eyeH + 5, 0, Math.PI * 1.12, Math.PI * 1.88);
        g.stroke();
        if (o.lashes) {
          g.lineWidth = 7;
          g.beginPath();
          g.moveTo(ex + s * (eyeW + 4), ey - eyeH * 0.55);
          g.lineTo(ex + s * (eyeW + 17), ey - eyeH * 0.85);
          g.stroke();
        }
      });
    }

    // brows
    g.strokeStyle = o.brow || dark; g.lineWidth = o.thickBrows ? 10 : 6.5;
    [-1, 1].forEach(s => {
      g.beginPath();
      g.arc(cx + s * gap, ey - 26, 27, Math.PI * 1.25, Math.PI * 1.75);
      g.stroke();
    });

    // mouth
    if (o.openSmile) {
      g.fillStyle = '#a34850';
      g.beginPath(); g.arc(cx, 330, 16, 0, Math.PI); g.closePath(); g.fill();
      g.fillStyle = '#ff97a6';
      g.beginPath(); g.arc(cx, 342, 8, Math.PI, 0); g.closePath(); g.fill();
    } else {
      g.strokeStyle = o.mouthColor || '#8a4a4a'; g.lineWidth = 7;
      g.beginPath(); g.arc(cx, 318, 15, Math.PI * 0.18, Math.PI * 0.82); g.stroke();
    }

    if (o.facialHair) {
      const fh = '#241a12';
      // full mustache band above the mouth
      g.strokeStyle = fh; g.lineWidth = 14;
      g.beginPath(); g.arc(cx, 322, 26, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
      // goatee + chin patch
      g.fillStyle = fh;
      ellipse(g, cx, 352, 23, 17); g.fill();
      ellipse(g, cx - 26, 336, 7, 12); g.fill();
      ellipse(g, cx + 26, 336, 7, 12); g.fill();
      // soft beard shadow along the jaw
      g.fillStyle = 'rgba(36,26,18,0.18)';
      ellipse(g, cx, 340, 52, 34); g.fill();
    }

    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }

  /* ---------- generic chibi person ----------
     opts: skin, hair, top, bottom, dress, dressColor, jacket, longHair, shortHair,
           hairBun, facialHair, eyeColor, scale, lashes, openSmile, closedEyes,
           freckles, thickBrows, shoe */
  function makeChibi(o) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const skinM = mat(o.skin), hairM = mat(o.hair, { side: THREE.DoubleSide }), topM = mat(o.top);

    /* legs */
    const legs = [];
    [-1, 1].forEach(s => {
      const hip = new THREE.Group();
      hip.position.set(s * 0.13, 0.42, 0);
      const leg = capsule(0.085, 0.16, mat(o.bottom));
      leg.position.y = -0.18;
      const shoe = sphere(0.1, mat(o.shoe || 0xfff5f0), 1, 0.7, 1.25, 14);
      shoe.position.set(0, -0.33, 0.04);
      hip.add(leg, shoe);
      body.add(hip);
      legs.push(hip);
    });

    /* torso: dress / jacket / plain */
    if (o.dress) {
      const skirt = (o.skirtModel && partMesh(o.skirtModel, mat(o.dressColor))) || lathe([
        [0.02, 0.30], [0.50, 0.30], [0.47, 0.36], [0.37, 0.52], [0.30, 0.66], [0.25, 0.74]
      ], mat(o.dressColor));
      body.add(skirt);
      const bodice = lathe([
        [0.29, 0.62], [0.27, 0.78], [0.295, 0.92], [0.23, 1.03], [0.155, 1.10], [0.0, 1.12]
      ], topM);
      body.add(bodice);
    } else if (o.jacket) {
      const jacketModel = o.jacketModel && partMesh(o.jacketModel, topM);
      if (jacketModel) {
        body.add(jacketModel);   // sculpted jacket already includes collar + hood bundle
      } else {
        const jacket = lathe([
          [0.05, 0.40], [0.345, 0.40], [0.365, 0.56], [0.335, 0.80], [0.30, 0.96], [0.21, 1.06], [0.0, 1.09]
        ], topM);
        body.add(jacket);
        const hood = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.085, 10, 18, Math.PI * 1.4), mat(shade(o.top, 0.8)));
        hood.position.set(0, 1.02, -0.2);
        hood.rotation.x = Math.PI / 2 + 0.45;
        hood.rotation.z = Math.PI * 0.3;
        hood.castShadow = true;
        body.add(hood);
      }
      // zipper
      const zip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.52, 0.02), mat(shade(o.top, 0.55)));
      zip.position.set(0, 0.74, 0.33);
      body.add(zip);
    } else {
      const torso = sphere(0.34, topM, 1, 1.12, 0.88);
      torso.position.y = 0.66;
      body.add(torso);
    }

    /* arms */
    const arms = [];
    const armM = (o.dress && !o.sleeves) ? skinM : topM;
    [-1, 1].forEach(s => {
      const sh = new THREE.Group();
      sh.position.set(s * (o.jacket ? 0.34 : 0.30), 0.88, 0);
      if (o.dress) {
        const puff = sphere(0.105, topM, 1, 0.95, 1, 12);
        puff.position.y = -0.02;
        sh.add(puff);
      }
      const arm = capsule(0.066, 0.2, armM);
      arm.position.y = -0.16;
      const hand = sphere(0.07, skinM, 1, 1, 1, 12);
      hand.position.y = -0.32;
      sh.add(arm, hand);
      sh.rotation.z = s * 0.24;
      body.add(sh);
      arms.push(sh);
    });

    /* head with painted face */
    const headGrp = new THREE.Group();
    headGrp.position.y = 1.26;
    body.add(headGrp);

    const faceTex = faceTexture({
      skin: css(o.skin),
      eye: css(o.eyeColor || 0x4a2e1e), eyeHex: o.eyeColor || 0x4a2e1e,
      brow: shade(o.hair, 0.7),
      lashes: o.lashes, blush: o.blush !== false && !o.facialHair,
      openSmile: o.openSmile, closedEyes: o.closedEyes,
      freckles: o.freckles, facialHair: o.facialHair, thickBrows: o.thickBrows || o.facialHair,
      eyeW: o.eyeW, eyeH: o.eyeH
    });
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 36, 26),
      mat(0xffffff, { map: faceTex })
    );
    head.rotation.y = -Math.PI / 2;     // face texture is centered at u=0.5 -> bring it to +Z
    head.castShadow = true;
    headGrp.add(head);

    /* hair: sculpted Blender piece if available, else shell + bangs */
    const hairBits = [];
    const modelHair = o.hairModel && partMesh(o.hairModel, hairM);
    if (modelHair) {
      modelHair.scale.setScalar(1.045);   // keep hair proud of the scalp everywhere
      headGrp.add(modelHair);
      if (o.longHair) hairBits.push(modelHair);   // gentle sway while walking
    } else {

    // tilted shell: rim rises above the eyes in front, drops to the nape behind
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.505, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.58), hairM);
    shell.position.set(0, 0.06, -0.03);
    shell.rotation.x = -0.5;
    shell.castShadow = true;
    headGrp.add(shell);

    const bangDefs = o.shortHair
      ? [[-0.26, 0.28, 0.33, 0.10], [0, 0.31, 0.37, 0.11], [0.26, 0.28, 0.33, 0.10]]
      : [[-0.31, 0.24, 0.315, 0.115], [-0.16, 0.28, 0.355, 0.125], [0, 0.29, 0.37, 0.13],
         [0.16, 0.28, 0.355, 0.125], [0.31, 0.24, 0.315, 0.115]];
    bangDefs.forEach(b => {
      const bang = sphere(b[3], hairM, 1, 1.18, 0.72, 14);
      bang.position.set(b[0], b[1], b[2]);
      headGrp.add(bang);
    });

    if (o.longHair) {
      // back curtain: half-lathe hugging the back of the head down to the waist
      const back = lathe([
        [0.10, -1.02], [0.30, -0.88], [0.44, -0.52], [0.52, -0.08], [0.50, 0.22], [0.30, 0.42], [0.0, 0.5]
      ], hairM, Math.PI / 2, Math.PI);
      headGrp.add(back);
      hairBits.push(back);
      // side locks framing the face
      [-1, 1].forEach(s => {
        const lock = capsule(0.085, 0.46, hairM);
        lock.position.set(s * 0.40, -0.26, 0.16);
        lock.rotation.z = s * 0.07;
        lock.rotation.x = -0.06;
        headGrp.add(lock);
        hairBits.push(lock);
      });
    }
    } // end procedural-hair fallback
    if (o.hairBun) {
      const bun = sphere(0.18, hairM);
      bun.position.set(0, 0.40, -0.32);
      headGrp.add(bun);
    }

    if (o.scale) root.scale.setScalar(o.scale);
    root.userData = { body, headGrp, arms, legs, hairBits, baseY: 0 };
    return root;
  }

  /* ---------- the cast ---------- */
  function makeBea() {
    return makeChibi({
      skin: 0xffe6cf, hair: 0x2b211e, eyeColor: 0x4a3020,
      top: 0xfff5f7, bottom: 0xffe3d0,
      dress: true, dressColor: 0xff9fb6,
      shoe: 0xffffff, longHair: true,
      lashes: true, openSmile: true,
      hairModel: 'beaHair', skirtModel: 'beaSkirt'
    });
  }

  function makeKay() {
    return makeChibi({
      skin: 0xc08a5e, hair: 0x4a3220, eyeColor: 0x3a281a,
      top: 0x4a6b66, bottom: 0x2e3138, shoe: 0xe8e4dc,
      jacket: true, shortHair: true, facialHair: true, scale: 1.07,
      eyeW: 19, eyeH: 25,
      hairModel: 'kayHair', jacketModel: 'kayJacket'
    });
  }

  /* ---------- Sausage, the white Persian ---------- */
  function catFaceTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#fdfcfa'; g.fillRect(0, 0, 512, 512);
    g.lineCap = 'round';
    const cx = 256, ey = 258, gap = 55;

    [-1, 1].forEach(s => {
      const ex = cx + s * gap;
      // big round copper eyes
      const ig = g.createRadialGradient(ex, ey - 6, 4, ex, ey, 26);
      ig.addColorStop(0, '#e8a44f'); ig.addColorStop(1, '#9c5d22');
      g.fillStyle = ig;
      ellipse(g, ex, ey, 24, 26); g.fill();
      g.fillStyle = '#241a12';
      ellipse(g, ex, ey + 2, 10, 18); g.fill();         // soft vertical pupil
      g.fillStyle = '#ffffff';
      ellipse(g, ex - 8, ey - 9, 7, 8); g.fill();
      ellipse(g, ex + 8, ey + 10, 3.5, 4); g.fill();
      g.strokeStyle = '#5e4a3e'; g.lineWidth = 5;
      g.beginPath(); g.ellipse(ex, ey, 25, 27, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    });
    // squished pink nose + ω mouth
    g.fillStyle = '#f2899c';
    g.beginPath();
    g.moveTo(cx - 11, 300); g.lineTo(cx + 11, 300); g.lineTo(cx, 314); g.closePath(); g.fill();
    g.strokeStyle = '#b08585'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(cx, 314); g.lineTo(cx, 322); g.stroke();
    g.beginPath(); g.arc(cx - 11, 322, 11, 0, Math.PI * 0.9); g.stroke();
    g.beginPath(); g.arc(cx + 11, 322, 11, Math.PI * 0.1, Math.PI); g.stroke();
    // whisker freckles
    g.fillStyle = 'rgba(150,130,120,0.6)';
    [-1, 1].forEach(s => [0, 1, 2].forEach(i => {
      ellipse(g, cx + s * (78 + i * 14), 308 + (i % 2) * 9, 2.5, 2.5); g.fill();
    }));
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }

  function makeCat() {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const furM = mat(0xfdfcfa);
    const modelBody = partMesh('catBody', furM);
    if (modelBody) {
      body.add(modelBody);   // sculpted fluffy body incl. ruff + legs
    } else {
      const torso = sphere(0.3, furM, 1.05, 0.85, 1.35);
      torso.position.set(0, 0.3, 0);
      body.add(torso);
      const fluff = sphere(0.2, furM, 1.15, 0.95, 0.85);
      fluff.position.set(0, 0.27, 0.3);
      body.add(fluff);
      [-1, 1].forEach(s => {
        const h = sphere(0.16, furM, 1, 1, 1.1, 14);
        h.position.set(s * 0.17, 0.24, -0.26);
        body.add(h);
      });
    }

    const headGrp = new THREE.Group();
    headGrp.position.set(0, 0.58, 0.34);
    body.add(headGrp);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 22), mat(0xffffff, { map: catFaceTexture() }));
    head.scale.set(1.08, 0.97, 0.8);
    head.rotation.y = -Math.PI / 2;
    head.castShadow = true;
    headGrp.add(head);

    // cheek + crown floof
    [-1, 1].forEach(s => {
      const cheek = sphere(0.105, furM, 1.15, 0.85, 0.7, 12);
      cheek.position.set(s * 0.21, -0.09, 0.08);
      headGrp.add(cheek);
    });
    const crown = sphere(0.17, furM, 1.3, 0.7, 1, 14);
    crown.position.set(0, 0.2, -0.04);
    headGrp.add(crown);

    // ears
    [-1, 1].forEach(s => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.14, 10), furM);
      ear.position.set(s * 0.16, 0.27, -0.03);
      ear.rotation.z = s * -0.32;
      ear.castShadow = true;
      headGrp.add(ear);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.085, 8), mat(0xffc4cf));
      inner.position.set(s * 0.155, 0.265, 0.005);
      inner.rotation.z = s * -0.32;
      headGrp.add(inner);
    });

    // legs (sculpted body already includes them)
    if (!modelBody) {
      [-1, 1].forEach(s => {
        [0.22, -0.28].forEach(z => {
          const leg = capsule(0.055, 0.1, furM);
          leg.position.set(s * 0.14, 0.1, z);
          body.add(leg);
        });
      });
    }

    // plumed tail
    const tailGrp = new THREE.Group();
    tailGrp.position.set(0, 0.38, -0.42);
    const modelTail = partMesh('catTail', furM);
    if (modelTail) {
      tailGrp.add(modelTail);
    } else {
      [[0, 0.03, -0.06, 0.085], [0, 0.16, -0.13, 0.105], [0, 0.31, -0.17, 0.12], [0, 0.46, -0.16, 0.105]].forEach(p => {
        const seg = sphere(p[3], furM);
        seg.position.set(p[0], p[1], p[2]);
        tailGrp.add(seg);
      });
    }
    body.add(tailGrp);

    root.userData = { body, headGrp, tailGrp, baseY: 0 };
    return root;
  }

  /* ---------- animation helpers ---------- */
  function walkAnim(char, time, moving, runMult = 1) {
    const u = char.userData;
    if (!u || !u.body) return;
    if (moving) {
      const s = Math.sin(time * 10 * runMult);
      if (u.arms) { u.arms[0].rotation.x = s * 0.65; u.arms[1].rotation.x = -s * 0.65; }
      if (u.legs) { u.legs[0].rotation.x = -s * 0.55; u.legs[1].rotation.x = s * 0.55; }
      u.body.position.y = Math.abs(Math.sin(time * 10 * runMult)) * 0.06;
      if (u.hairBits) u.hairBits.forEach((h, i) => { h.rotation.x = Math.sin(time * 10 * runMult + i) * 0.07 - 0.03; });
    } else {
      if (u.arms) { u.arms[0].rotation.x *= 0.85; u.arms[1].rotation.x *= 0.85; }
      if (u.legs) { u.legs[0].rotation.x *= 0.85; u.legs[1].rotation.x *= 0.85; }
      u.body.position.y = Math.sin(time * 2.2) * 0.015;
      if (u.hairBits) u.hairBits.forEach(h => { h.rotation.x *= 0.9; });
    }
  }

  function catAnim(cat, time, moving) {
    const u = cat.userData;
    if (!u) return;
    u.tailGrp.rotation.x = Math.sin(time * (moving ? 6 : 2.4)) * 0.22 - 0.1;
    u.tailGrp.rotation.z = Math.sin(time * (moving ? 5 : 1.8)) * 0.25;
    u.body.position.y = moving ? Math.abs(Math.sin(time * 11)) * 0.05 : Math.sin(time * 2) * 0.012;
    u.headGrp.rotation.z = Math.sin(time * 1.3) * 0.05;
  }

  return { makeChibi, makeBea, makeKay, makeCat, walkAnim, catAnim, mat, sphere, rampTex };
})();
