import * as THREE from 'three';

// ───────────────────────── 색상 팔레트 (파스텔) ─────────────────────────
export const PASTEL = {
  pink: 0xffb3c6, peach: 0xffd6a5, lemon: 0xfff3b0, mint: 0xb9f6ca, sky: 0xa0e7e5, lavender: 0xc9b6ff,
  grass: 0x9fe6a3, grassDark: 0x7fd78a, earth: 0xe9b98f, earthDark: 0xcf9a6d, cream: 0xfff8ec, white: 0xffffff,
};
const RAINBOW = [0xff9fbe, 0xffb98a, 0xffe680, 0x9fe79f, 0x8fe0f0, 0xa98bff, 0xf0b3ff];

export const ISLAND_RADIUS = 25;
const SKY_KEYS = [
  // t, top, horizon, light, fog
  { t: 0.0, top: 0x1b1a3f, hor: 0x46407a, sun: 0x8f8fd6, amb: 0.35 },
  { t: 0.22, top: 0x7a6cd6, hor: 0xffb3a1, sun: 0xffc9a0, amb: 0.7 },
  { t: 0.5, top: 0x8ec5ff, hor: 0xffe1f0, sun: 0xffffff, amb: 1.0 },
  { t: 0.78, top: 0xb58cff, hor: 0xffb37a, sun: 0xffc49a, amb: 0.75 },
  { t: 1.0, top: 0x1b1a3f, hor: 0x46407a, sun: 0x8f8fd6, amb: 0.35 },
];

function lerpColor(a, b, t) { return new THREE.Color(a).lerp(new THREE.Color(b), t); }
function skyAt(t) {
  t = ((t % 1) + 1) % 1;
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    const A = SKY_KEYS[i], B = SKY_KEYS[i + 1];
    if (t >= A.t && t <= B.t) {
      const k = (t - A.t) / (B.t - A.t);
      const s = k * k * (3 - 2 * k);
      return { top: lerpColor(A.top, B.top, s), hor: lerpColor(A.hor, B.hor, s), sun: lerpColor(A.sun, B.sun, s), amb: A.amb + (B.amb - A.amb) * s };
    }
  }
  return { top: new THREE.Color(SKY_KEYS[2].top), hor: new THREE.Color(SKY_KEYS[2].hor), sun: new THREE.Color(0xffffff), amb: 1 };
}

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, ...extra });

// 캔버스 텍스처 라벨
function makeLabel(text, { font = 'bold 44px sans-serif', pad = 24, bg = 'rgba(255,255,255,0.92)', fg = '#3a3350', accent = '#b79cff' } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  c.width = Math.max(64, w); c.height = 88;
  const g = c.getContext('2d');
  g.font = font;
  g.fillStyle = bg;
  const r = 36;
  g.beginPath(); g.roundRect(0, 4, c.width, 80, r); g.fill();
  g.fillStyle = accent; g.beginPath(); g.arc(pad, 44, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = fg; g.textBaseline = 'middle';
  g.fillText(text, pad + 18, 46);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  const scale = 0.0052;
  sp.scale.set(c.width * scale, c.height * scale, 1);
  return sp;
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 900);
    this.camera.position.set(0, 8, 30);
    this.timeMode = 'auto'; // auto | day | sunset | night
    this.timeOfDay = 0.5;
    this.night = 0;
    this.interactables = [];
    this.stars = new Map(); // memorialId -> group
    this.glowTex = glowTexture();
    this.animated = [];
    this.bridgeSamples = [];

    this._lights();
    this._sky();
    this._island();
    this._bridge();
    this._clouds();
    this._lanterns();
    this._petals();
    this._fireflies();
    this._starfield();
    this._deco();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ───────────── 조명 / 하늘 ─────────────
  _lights() {
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xffd6e8, 0.9);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.6);
    this.sun.position.set(30, 50, 20);
    this.amb = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(this.hemi, this.sun, this.amb);
  }
  _sky() {
    const geo = new THREE.SphereGeometry(420, 32, 16);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color(0x8ec5ff) }, hor: { value: new THREE.Color(0xffe1f0) } },
      vertexShader: `varying vec3 vp; void main(){ vp = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 hor; varying vec3 vp; void main(){ float h = normalize(vp).y; float k = smoothstep(-0.15, 0.55, h); gl_FragColor = vec4(mix(hor, top, k), 1.0); }`,
    });
    this.sky = new THREE.Mesh(geo, this.skyMat);
    this.scene.add(this.sky);
    this.scene.fog = new THREE.Fog(0xffe1f0, 80, 330);
  }

  // ───────────── 섬 ─────────────
  _island() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_RADIUS + 1, ISLAND_RADIUS - 5, 7, 56, 1), [std(PASTEL.earth), std(PASTEL.grass), std(PASTEL.earthDark)]);
    body.position.y = -3.5;
    g.add(body);
    // 아래 매달린 뿌리 돌
    for (let i = 0; i < 9; i++) {
      const r = 2 + Math.random() * 3;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), std(i % 2 ? PASTEL.earthDark : 0xd8a07a, { flatShading: true }));
      const a = Math.random() * Math.PI * 2, d = Math.random() * 14;
      rock.position.set(Math.cos(a) * d, -8 - Math.random() * 6, Math.sin(a) * d);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      g.add(rock);
    }
    // 풀 언덕
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, d = 6 + Math.random() * 16;
      const m = new THREE.Mesh(new THREE.SphereGeometry(1.5 + Math.random() * 2.2, 12, 8), std(i % 3 ? PASTEL.grassDark : 0xb6f0a8));
      m.position.set(Math.cos(a) * d, -0.9, Math.sin(a) * d); m.scale.y = 0.45; g.add(m);
    }
    // 길
    const path = new THREE.Mesh(new THREE.RingGeometry(9.5, 11.5, 64), std(PASTEL.cream));
    path.rotation.x = -Math.PI / 2; path.position.y = 0.03; g.add(path);
    const path2 = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 16), std(PASTEL.cream));
    path2.rotation.x = -Math.PI / 2; path2.position.set(17, 0.03, 0); path2.rotation.z = Math.PI / 2; g.add(path2);
    const path3 = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 12), std(PASTEL.cream));
    path3.rotation.x = -Math.PI / 2; path3.position.set(0, 0.03, 16); g.add(path3);
    // 꽃 (인스턴스)
    const count = 220;
    const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.9 }), count);
    const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5), std(0x7fd78a), count);
    const dummy = new THREE.Object3D(); const col = new THREE.Color();
    const palette = [0xff9fbe, 0xffb98a, 0xfff3b0, 0xffffff, 0xc9b6ff, 0xa0e7e5];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 23;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (d > 9 && d < 12) { dummy.position.set(0, -5, 0); } else dummy.position.set(x, 0.45, z);
      dummy.scale.setScalar(0.8 + Math.random() * 0.6); dummy.updateMatrix();
      head.setMatrixAt(i, dummy.matrix);
      head.setColorAt(i, col.setHex(palette[i % palette.length]));
      dummy.position.y -= 0.2; dummy.scale.setScalar(1); dummy.updateMatrix();
      stem.setMatrixAt(i, dummy.matrix);
    }
    head.instanceColor.needsUpdate = true;
    g.add(head, stem);
    // 롤리팝 나무
    const treeCols = [PASTEL.pink, PASTEL.mint, PASTEL.lavender, PASTEL.peach];
    [[-20, 4], [-18, -14], [20, 14], [8, -20], [-8, -21], [21, -8], [-21, 12]].forEach(([x, z], i) => {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 2.6, 8), std(0xcf9a6d));
      trunk.position.y = 1.3;
      const crown = new THREE.Mesh(new THREE.SphereGeometry(1.9 + (i % 3) * 0.3, 14, 10), std(treeCols[i % 4]));
      crown.position.y = 3.6;
      t.add(trunk, crown); t.position.set(x, 0, z); g.add(t);
      this.animated.push({ obj: crown, fn: (o, t0) => { o.scale.y = 1 + Math.sin(t0 * 1.2 + i) * 0.025; } });
    });
    this.scene.add(g);
    this.island = g;
  }

  // ───────────── 구름다리 (무지개 산책로) ─────────────
  _bridge() {
    const pts = [new THREE.Vector3(22, -0.3, 0), new THREE.Vector3(34, 2.5, 0), new THREE.Vector3(50, 10, 0), new THREE.Vector3(68, 20, 0), new THREE.Vector3(84, 27.5, 0), new THREE.Vector3(96, 30, 0)];
    this.bridgeCurve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3);
    for (let i = 0; i <= 240; i++) {
      const p = this.bridgeCurve.getPoint(i / 240);
      this.bridgeSamples.push([p.x, p.y]);
    }
    const g = new THREE.Group();
    RAINBOW.forEach((c, i) => {
      const off = (i - 3) * 0.62;
      const pts2 = pts.map((p) => new THREE.Vector3(p.x, p.y, p.z + off));
      const curve = new THREE.CatmullRomCurve3(pts2, false, 'catmullrom', 0.3);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.34, 10, false), std(c, { emissive: c, emissiveIntensity: 0.18 }));
      g.add(tube);
    });
    // 난간 구슬
    const beadGeo = new THREE.SphereGeometry(0.22, 8, 6);
    for (let i = 0; i <= 40; i++) {
      const p = this.bridgeCurve.getPoint(i / 40);
      for (const s of [-1, 1]) {
        const b = new THREE.Mesh(beadGeo, std(0xffffff, { emissive: 0xfff1c9, emissiveIntensity: 0.6 }));
        b.position.set(p.x, p.y + 1.1, p.z + s * 2.45);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 5), std(0xffffff));
        post.position.set(p.x, p.y + 0.55, p.z + s * 2.45);
        g.add(b, post);
      }
    }
    // 다리 아래 구름 받침
    for (let i = 1; i < 6; i++) {
      const p = this.bridgeCurve.getPoint(i / 6);
      const cl = this._cloud(3.2 + Math.random() * 1.5, 0xffffff);
      cl.position.set(p.x, p.y - 2.3, p.z + (Math.random() - 0.5) * 2);
      g.add(cl);
      this.animated.push({ obj: cl, fn: (o, t) => { o.position.y = p.y - 2.3 + Math.sin(t * 0.6 + i) * 0.35; } });
    }
    // 저편 구름 정거장 + 빛의 문
    const station = new THREE.Group();
    const base = this._cloud(7.5, 0xffffff); base.scale.y = 0.55; station.add(base);
    const gate = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.35, 12, 48), std(0xffffff, { emissive: 0xffe9ff, emissiveIntensity: 0.9 }));
    gate.position.set(3, 8.2, 0); gate.rotation.y = Math.PI / 2; station.add(gate);
    const gateGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xfff0ff, transparent: true, opacity: 0.8, depthWrite: false }));
    gateGlow.scale.set(11, 11, 1); gateGlow.position.copy(gate.position); station.add(gateGlow);
    station.position.set(98, 26.6, 0);
    g.add(station);
    this.animated.push({ obj: gate, fn: (o, t) => { o.rotation.z = t * 0.25; } });
    this.scene.add(g);
    this.stationPos = new THREE.Vector3(97, 31.4, 0);
    this.interactables.push({ id: 'gate', kind: 'gate', pos: new THREE.Vector3(99, 31.4, 0), radius: 5, label: '빛의 문 앞에 서기' });
    this.interactables.push({ id: 'bridge', kind: 'bridge', pos: new THREE.Vector3(26, 0.4, 0), radius: 3.2, label: '구름다리 안내 읽기' });
  }

  bridgeHeightAt(x) {
    const s = this.bridgeSamples;
    if (x <= s[0][0]) return s[0][1];
    if (x >= s[s.length - 1][0]) return s[s.length - 1][1];
    let lo = 0, hi = s.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (s[mid][0] <= x) lo = mid; else hi = mid; }
    const [x0, y0] = s[lo], [x1, y1] = s[hi];
    const k = (x - x0) / Math.max(1e-6, x1 - x0);
    return y0 + (y1 - y0) * k;
  }

  // 걸을 수 있는 높이. 못 가는 곳이면 null
  groundHeight(x, z) {
    const d = Math.hypot(x, z);
    if (d <= ISLAND_RADIUS) return 0;
    if (x >= 21 && x <= 97 && Math.abs(z) <= 2.1) return this.bridgeHeightAt(x) + 0.4;
    if (Math.hypot(x - 98, z) <= 7.2) return 30.6 + 0.8;
    return null;
  }

  // ───────────── 구름 ─────────────
  _cloud(size, color) {
    const g = new THREE.Group();
    const mat = std(color, { emissive: color, emissiveIntensity: 0.06 });
    const n = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const r = size * (0.45 + Math.random() * 0.4);
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat);
      m.position.set((Math.random() - 0.5) * size * 1.4, (Math.random() - 0.5) * size * 0.35, (Math.random() - 0.5) * size * 0.8);
      g.add(m);
    }
    return g;
  }
  _clouds() {
    this.clouds = [];
    const tints = [0xffffff, 0xfff2f7, 0xf3f0ff, 0xeefcff, 0xfff8ea];
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 42 + Math.random() * 150;
      const c = this._cloud(4 + Math.random() * 7, tints[i % tints.length]);
      c.position.set(Math.cos(a) * d, -22 + Math.random() * 60, Math.sin(a) * d);
      if (c.position.x > 20 && Math.abs(c.position.z) < 14 && c.position.y > -6 && c.position.y < 38) c.position.z += 24; // 다리 시야 확보
      c.userData.speed = 0.25 + Math.random() * 0.6;
      this.scene.add(c); this.clouds.push(c);
    }
    // 섬 바로 아래 큰 구름
    for (let i = 0; i < 6; i++) {
      const c = this._cloud(10 + Math.random() * 6, 0xffffff);
      const a = (i / 6) * Math.PI * 2;
      c.position.set(Math.cos(a) * 14, -13 - Math.random() * 4, Math.sin(a) * 14);
      this.scene.add(c);
      this.animated.push({ obj: c, fn: (o, t) => { o.position.y = -13 + Math.sin(t * 0.5 + i) * 0.8; } });
    }
  }

  // ───────────── 떠오르는 등불 ─────────────
  _lanterns() {
    this.lanterns = [];
    const geo = new THREE.BoxGeometry(0.55, 0.8, 0.55);
    for (let i = 0; i < 26; i++) {
      const c = RAINBOW[i % RAINBOW.length];
      const m = new THREE.Mesh(geo, std(c, { emissive: c, emissiveIntensity: 0.9 }));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: c, transparent: true, opacity: 0.55, depthWrite: false }));
      glow.scale.set(3, 3, 1);
      m.add(glow);
      this._resetLantern(m, true);
      this.scene.add(m); this.lanterns.push(m);
    }
  }
  _resetLantern(m, initial) {
    const a = Math.random() * Math.PI * 2, d = 28 + Math.random() * 30;
    m.position.set(Math.cos(a) * d, initial ? -10 + Math.random() * 60 : -12, Math.sin(a) * d);
    m.userData.speed = 0.9 + Math.random() * 1.2;
    m.userData.phase = Math.random() * 10;
  }

  // ───────────── 꽃잎 ─────────────
  _petals() {
    const count = 160;
    this.petals = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.28, 0.2), new THREE.MeshBasicMaterial({ color: 0xffc2d6, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }), count);
    this.petalData = [];
    for (let i = 0; i < count; i++) {
      this.petalData.push({ x: (Math.random() - 0.5) * 50, y: Math.random() * 18, z: (Math.random() - 0.5) * 50, s: 0.6 + Math.random() * 0.8, p: Math.random() * 10 });
    }
    this.scene.add(this.petals);
  }

  // ───────────── 반딧불 (밤) ─────────────
  _fireflies() {
    const n = 90;
    const pos = new Float32Array(n * 3);
    this.fireflyData = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * 22;
      const o = { x: Math.cos(a) * d, y: 0.8 + Math.random() * 3, z: Math.sin(a) * d, p: Math.random() * 10 };
      this.fireflyData.push(o); pos.set([o.x, o.y, o.z], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.fireflyMat = new THREE.PointsMaterial({ color: 0xfff6a8, size: 0.55, map: this.glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.fireflies = new THREE.Points(geo, this.fireflyMat);
    this.scene.add(this.fireflies);
  }
  _starfield() {
    const n = 900; const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random(), v = Math.random();
      const th = u * Math.PI * 2, ph = Math.acos(1 - v) * 0.6; // 상반구
      const r = 380;
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, map: this.glowTex, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.starfield = new THREE.Points(geo, this.starMat);
    this.scene.add(this.starfield);
  }

  // ───────────── 건물 / 나무 / 우체통 / 벤치 ─────────────
  _deco() {
    // 휴게소 본관
    const b = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(9, 4.2, 6.5), std(0xfff1b8));
    wall.position.y = 2.1; b.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 3.4, 4), std(0xffa6c3, { flatShading: true }));
    roof.position.y = 5.9; roof.rotation.y = Math.PI / 4; b.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 0.2), std(0xb79cff));
    door.position.set(0, 1.2, 3.3); b.add(door);
    [[-2.8, 2.5], [2.8, 2.5]].forEach(([x, y]) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, 0.2), std(0xa0e7e5, { emissive: 0xa0e7e5, emissiveIntensity: 0.3 }));
      w.position.set(x, y, 3.3); b.add(w);
    });
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2, 0.9), std(0xffd6a5)); chimney.position.set(2.6, 6.2, -1); b.add(chimney);
    const sign = makeLabel('구름다리 휴게소 · 힐링 라운지'); sign.position.set(0, 8.3, 0); b.add(sign);
    // 깃발
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), std(0xffffff)); pole.position.set(-4.2, 7.5, 2.5); b.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), std(0xff9fbe, { side: THREE.DoubleSide })); flag.position.set(-3.4, 9, 2.5); b.add(flag);
    this.animated.push({ obj: flag, fn: (o, t) => { o.rotation.y = Math.sin(t * 3) * 0.3; } });
    b.position.set(-14, 0, -10); b.rotation.y = 0.5;
    this.scene.add(b);
    this.interactables.push({ id: 'lounge', kind: 'lounge', pos: new THREE.Vector3(-12.3, 0, -6.9), radius: 4.2, label: '힐링 라운지 들어가기' });

    // 기억의 나무
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.5, 6, 10), std(0xcf9a6d)); trunk.position.y = 3; tree.add(trunk);
    const crowns = [[0, 7.5, 0, 4.4, 0xffb3c6], [-2.6, 6.4, 1.2, 3, 0xffc9d9], [2.4, 6.8, -1, 3.2, 0xffd6e8], [0.6, 9.8, 1.6, 2.6, 0xfff0f5]];
    crowns.forEach(([x, y, z, r, c], i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), std(c)); m.position.set(x, y, z); tree.add(m);
      this.animated.push({ obj: m, fn: (o, t) => { o.position.y = y + Math.sin(t * 0.9 + i) * 0.12; } });
    });
    // 잎 메시지 반짝이
    this.treeLeaves = new THREE.Group();
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xfff6c8, transparent: true, opacity: 0.8, depthWrite: false }));
      const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 3;
      s.position.set(Math.cos(a) * r, 6 + Math.random() * 4.5, Math.sin(a) * r); s.scale.set(1.1, 1.1, 1); s.userData.p = Math.random() * 10;
      this.treeLeaves.add(s);
    }
    tree.add(this.treeLeaves);
    const treeLabel = makeLabel('기억의 나무'); treeLabel.position.set(0, 13, 0); tree.add(treeLabel);
    tree.position.set(12, 0, -12);
    this.scene.add(tree);
    this.interactables.push({ id: 'tree', kind: 'tree', pos: new THREE.Vector3(12, 0, -12), radius: 5.5, label: '기억의 나무에 잎 달기' });

    // 하늘 우체통
    const mb = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6), std(0xffffff)); post.position.y = 0.7; mb.add(post);
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.8), std(0xff8fb1)); box.position.y = 1.85; mb.add(box);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.1, 12, 1, false, 0, Math.PI), std(0xff6f9c)); lid.rotation.z = Math.PI / 2; lid.position.y = 2.3; mb.add(lid);
    const flagM = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.25), std(0xffe680)); flagM.position.set(0.6, 2.2, 0); mb.add(flagM);
    const mbLabel = makeLabel('하늘 우체통'); mbLabel.position.set(0, 3.6, 0); mb.add(mbLabel);
    mb.position.set(-7, 0, 11);
    this.scene.add(mb);
    this.interactables.push({ id: 'mailbox', kind: 'mailbox', pos: new THREE.Vector3(-7, 0, 11), radius: 3.2, label: '하늘로 편지 부치기' });

    // 벤치들
    [[-3, 15, 0], [4, -16, Math.PI], [-18, 5, Math.PI / 2]].forEach(([x, z, ry]) => {
      const bench = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.7), std(0xfff8ec)); seat.position.y = 0.55; bench.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.12), std(0xfff8ec)); back.position.set(0, 0.95, -0.3); bench.add(back);
      [-1, 1].forEach((s) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.6), std(0xcf9a6d)); leg.position.set(s * 1, 0.27, 0); bench.add(leg); });
      bench.position.set(x, 0, z); bench.rotation.y = ry; this.scene.add(bench);
    });

    // 입구 간판
    const entry = makeLabel('🐾 구름다리 휴게소에 오신 걸 환영해요'); entry.position.set(0, 3.8, 21); this.scene.add(entry);
    const garden = makeLabel('별빛 정원'); garden.position.set(6, 5.2, 9); this.scene.add(garden);
  }

  // ───────────── 추모 별 ─────────────
  starSlot(i) {
    const a = i * 2.39996 + 0.6;
    const r = 2.4 + 1.55 * Math.sqrt(i + 0.6);
    return new THREE.Vector3(6 + Math.cos(a) * r, 0, 9 + Math.sin(a) * r);
  }
  addStar(m, index) {
    if (this.stars.has(m.id)) return this.stars.get(m.id);
    const g = new THREE.Group();
    const color = new THREE.Color(m.color);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.5, 14), std(PASTEL.cream));
    ped.position.y = 0.25; g.add(ped);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 8, 32), std(color.getHex(), { emissive: color.getHex(), emissiveIntensity: 0.5 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.52; g.add(ring);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 1.2, roughness: 0.4 }));
    orb.position.y = 1.9; g.add(orb);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: color, transparent: true, opacity: 0.75, depthWrite: false }));
    glow.scale.set(3.6, 3.6, 1); glow.position.y = 1.9; g.add(glow);
    const label = makeLabel(`${m.name}`, { accent: m.color === '#ffffff' ? '#b79cff' : m.color }); label.position.y = 3.3; g.add(label);
    const decor = new THREE.Group(); g.add(decor);
    g.userData = { memorialId: m.id, orb, glow, decor, phase: Math.random() * 10 };
    const pos = this.starSlot(index);
    g.position.copy(pos);
    this.scene.add(g);
    this.stars.set(m.id, g);
    this.interactables.push({ id: m.id, kind: 'star', pos: pos.clone(), radius: 2.6, label: `${m.name}의 별 살펴보기`, memorialId: m.id });
    this.refreshStarDecor(m);
    return g;
  }
  removeStar(id) {
    const g = this.stars.get(id); if (!g) return;
    this.scene.remove(g); this.stars.delete(id);
    this.interactables = this.interactables.filter((it) => it.memorialId !== id);
  }
  refreshStarDecor(m) {
    const g = this.stars.get(m.id); if (!g) return;
    const d = g.userData.decor;
    while (d.children.length) d.remove(d.children[0]);
    const flowers = Math.min(10, Math.ceil(m.offerings.flower / 3));
    for (let i = 0; i < flowers; i++) {
      const a = (i / flowers) * Math.PI * 2 + 0.3;
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), std([0xff9fbe, 0xffe680, 0xffffff, 0xc9b6ff][i % 4]));
      f.position.set(Math.cos(a) * 1.35, 0.35, Math.sin(a) * 1.35); d.add(f);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 4), std(0x7fd78a)); s.position.set(Math.cos(a) * 1.35, 0.17, Math.sin(a) * 1.35); d.add(s);
    }
    const candles = Math.min(6, Math.ceil(m.offerings.candle / 4));
    for (let i = 0; i < candles; i++) {
      const a = (i / candles) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.35, 8), std(0xfff8ec)); c.position.set(Math.cos(a) * 0.6, 0.67, Math.sin(a) * 0.6); d.add(c);
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffc46b, transparent: true, depthWrite: false })); fl.scale.set(0.5, 0.5, 1); fl.position.set(Math.cos(a) * 0.6, 0.95, Math.sin(a) * 0.6); d.add(fl);
    }
    const treats = Math.min(5, Math.ceil(m.offerings.treat / 4));
    for (let i = 0; i < treats; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.18), std(0xe9b98f)); b.position.set(-1.2 + i * 0.35, 0.08, 1.5); b.rotation.y = i * 0.5; d.add(b);
    }
    // 쓰다듬기 → 하트 반짝이 크기
    const pats = Math.min(1, m.offerings.pat / 80);
    g.userData.glow.scale.set(3.6 + pats * 1.4, 3.6 + pats * 1.4, 1);
  }

  // 반짝 효과 (헌화 등)
  burst(pos, color = 0xffffff, count = 18) {
    const group = new THREE.Group();
    const parts = [];
    for (let i = 0; i < count; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, depthWrite: false }));
      s.scale.set(0.7, 0.7, 1);
      s.position.copy(pos);
      s.userData.v = new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 3, (Math.random() - 0.5) * 3);
      group.add(s); parts.push(s);
    }
    this.scene.add(group);
    let life = 0;
    this.animated.push({ obj: group, fn: (o, t, dt) => {
      life += dt;
      for (const s of parts) { s.position.addScaledVector(s.userData.v, dt); s.userData.v.y -= 3 * dt; s.material.opacity = Math.max(0, 1 - life / 1.4); }
      if (life > 1.5) { this.scene.remove(o); o.userData.dead = true; }
    } });
  }

  // ───────────── 시간 ─────────────
  cycleTime() {
    const order = ['auto', 'day', 'sunset', 'night'];
    this.timeMode = order[(order.indexOf(this.timeMode) + 1) % order.length];
    return this.timeMode;
  }
  _computeTime(t) {
    if (this.timeMode === 'day') return 0.5;
    if (this.timeMode === 'sunset') return 0.79;
    if (this.timeMode === 'night') return 0.02;
    // auto: 실제 시각 기준 + 아주 느린 흐름
    const d = new Date();
    const h = d.getHours() + d.getMinutes() / 60;
    return (h / 24 + 0.0) % 1;
  }

  update(dt, t) {
    this.timeOfDay += (this._computeTime(t) - this.timeOfDay) * Math.min(1, dt * 0.8);
    const s = skyAt(this.timeOfDay);
    this.skyMat.uniforms.top.value.copy(s.top);
    this.skyMat.uniforms.hor.value.copy(s.hor);
    this.scene.fog.color.copy(s.hor);
    this.sun.color.copy(s.sun); this.sun.intensity = 0.5 + 1.2 * s.amb;
    this.hemi.intensity = 0.35 + 0.65 * s.amb; this.amb.intensity = 0.1 + 0.2 * s.amb;
    const ang = this.timeOfDay * Math.PI * 2 - Math.PI / 2;
    this.sun.position.set(Math.cos(ang) * 60, Math.max(8, Math.sin(ang) * 60), 25);
    this.night = THREE.MathUtils.clamp(1 - (s.amb - 0.35) / 0.5, 0, 1);
    this.starMat.opacity = this.night * 0.95;
    this.fireflyMat.opacity = this.night * 0.95;

    for (const c of this.clouds) { c.position.x += c.userData.speed * dt; if (c.position.x > 200) c.position.x = -200; }
    for (const l of this.lanterns) {
      l.position.y += l.userData.speed * dt; l.position.x += Math.sin(t * 0.7 + l.userData.phase) * dt * 0.4;
      l.rotation.y += dt * 0.3;
      if (l.position.y > 70) this._resetLantern(l, false);
    }
    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.petalData.length; i++) {
      const p = this.petalData[i];
      p.y -= dt * (0.6 + p.s * 0.5); p.x += Math.sin(t * 1.3 + p.p) * dt * 0.8;
      if (p.y < -1) { p.y = 16 + Math.random() * 4; p.x = (Math.random() - 0.5) * 50; p.z = (Math.random() - 0.5) * 50; }
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(t * 1.2 + p.p, t * 0.7 + p.p, 0); dummy.scale.setScalar(p.s); dummy.updateMatrix();
      this.petals.setMatrixAt(i, dummy.matrix);
    }
    this.petals.instanceMatrix.needsUpdate = true;
    if (this.night > 0.05) {
      const arr = this.fireflies.geometry.attributes.position.array;
      for (let i = 0; i < this.fireflyData.length; i++) {
        const f = this.fireflyData[i];
        arr[i * 3] = f.x + Math.sin(t * 0.8 + f.p) * 1.2; arr[i * 3 + 1] = f.y + Math.sin(t * 1.4 + f.p * 2) * 0.5; arr[i * 3 + 2] = f.z + Math.cos(t * 0.6 + f.p) * 1.2;
      }
      this.fireflies.geometry.attributes.position.needsUpdate = true;
    }
    for (const g of this.stars.values()) {
      const u = g.userData;
      u.orb.position.y = 1.9 + Math.sin(t * 1.6 + u.phase) * 0.15;
      u.glow.position.y = u.orb.position.y;
      u.orb.rotation.y += dt * 0.5;
      u.glow.material.opacity = 0.6 + Math.sin(t * 2.2 + u.phase) * 0.15 + this.night * 0.2;
    }
    for (const s of this.treeLeaves.children) s.material.opacity = 0.5 + Math.sin(t * 2 + s.userData.p) * 0.35;
    for (let i = this.animated.length - 1; i >= 0; i--) {
      const a = this.animated[i];
      a.fn(a.obj, t, dt);
      if (a.obj.userData && a.obj.userData.dead) this.animated.splice(i, 1);
    }
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
