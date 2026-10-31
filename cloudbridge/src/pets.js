import * as THREE from 'three';

const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...extra });
const DARK = 0x3a3350;

// 색상이 흰색이면 그림자 대비를 위해 아주 살짝 크림색으로
function bodyColor(hex) {
  const c = new THREE.Color(hex);
  if (c.r > 0.95 && c.g > 0.95 && c.b > 0.95) c.setHex(0xfff6ee);
  return c;
}

// 원시 도형만으로 만든 귀여운 로우폴리 아바타
export function buildPet(species, colorHex) {
  const col = bodyColor(colorHex);
  const g = new THREE.Group();
  const bodyM = mat(col);
  const belly = mat(0xfff8f0);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), bodyM);
  body.scale.set(1, 0.85, 1.25); body.position.y = 0.55; g.add(body);
  const tummy = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), belly);
  tummy.scale.set(1, 0.8, 1.1); tummy.position.set(0, 0.42, 0.28); g.add(tummy);

  const head = new THREE.Group();
  head.position.set(0, 1.0, 0.45);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), bodyM); head.add(skull);
  const eyeGeo = new THREE.SphereGeometry(0.06, 8, 6);
  [-0.16, 0.16].forEach((x) => {
    const e = new THREE.Mesh(eyeGeo, mat(DARK)); e.position.set(x, 0.06, 0.37); head.add(e);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), mat(0xffffff)); sh.position.set(x + 0.02, 0.09, 0.42); head.add(sh);
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0xffa3bd)); blush.position.set(x * 1.6, -0.06, 0.32); blush.scale.z = 0.3; head.add(blush);
  });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(species === 'bird' ? 0xffb347 : 0x54485f));
  nose.position.set(0, -0.04, 0.42); head.add(nose);

  const earM = bodyM;
  if (species === 'dog') {
    [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), earM); e.scale.set(0.6, 1.5, 0.5); e.position.set(s * 0.36, 0.05, 0.05); head.add(e); });
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.5, 6), bodyM); tail.position.set(0, 0.8, -0.6); tail.rotation.x = -0.9; g.add(tail); g.userData.tail = tail;
  } else if (species === 'cat') {
    [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 6), earM); e.position.set(s * 0.24, 0.36, 0); head.add(e); });
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 6), bodyM); tail.position.set(0, 0.75, -0.65); tail.rotation.x = -0.5; g.add(tail); g.userData.tail = tail;
    [-0.3, 0.3].forEach((x) => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.012, 0.012), mat(0xffffff)); w.position.set(x, -0.03, 0.4); head.add(w); });
  } else if (species === 'rabbit') {
    [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.45, 4, 8), earM); e.position.set(s * 0.17, 0.55, -0.05); e.rotation.z = s * -0.15; head.add(e);
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.35, 4, 8), mat(0xffb3c6)); inner.position.set(s * 0.17, 0.55, 0.02); inner.rotation.z = s * -0.15; head.add(inner); });
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(0xffffff)); tail.position.set(0, 0.5, -0.6); g.add(tail); g.userData.tail = tail;
  } else if (species === 'bird') {
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 6), mat(0xffb347)); beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.05, 0.5); head.add(beak); nose.visible = false;
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 6), mat(0xffe680)); crest.position.set(0, 0.5, -0.05); crest.rotation.x = -0.4; head.add(crest);
    [-1, 1].forEach((s) => { const w = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), bodyM); w.scale.set(0.35, 0.9, 1.1); w.position.set(s * 0.45, 0.6, -0.05); g.add(w); if (s === 1) g.userData.wingR = w; else g.userData.wingL = w; });
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.5), bodyM); tail.position.set(0, 0.55, -0.7); tail.rotation.x = 0.4; g.add(tail); g.userData.tail = tail;
  } else if (species === 'hamster') {
    [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), earM); e.position.set(s * 0.26, 0.33, -0.05); head.add(e); });
    body.scale.set(1.15, 0.9, 1.1); head.position.y = 0.95;
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), bodyM); tail.position.set(0, 0.45, -0.6); g.add(tail); g.userData.tail = tail;
  } else {
    [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), earM); e.position.set(s * 0.3, 0.3, -0.02); head.add(e); });
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), bodyM); tail.position.set(0, 0.5, -0.6); g.add(tail); g.userData.tail = tail;
  }
  g.add(head); g.userData.head = head;

  // 다리
  const legN = species === 'bird' ? 2 : 4;
  const legGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.3, 6);
  const legs = [];
  for (let i = 0; i < legN; i++) {
    const l = new THREE.Mesh(legGeo, species === 'bird' ? mat(0xffb347) : bodyM);
    const x = (i % 2 ? 0.2 : -0.2), z = legN === 4 ? (i < 2 ? 0.28 : -0.28) : 0.05;
    l.position.set(x, 0.15, z); g.add(l); legs.push(l);
  }
  g.userData.legs = legs;

  // 작은 후광 (떠난 아이들은 살짝 빛난다)
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 8, 24), mat(0xfff1c9, { emissive: 0xffe9a8, emissiveIntensity: 1.2 }));
  halo.rotation.x = Math.PI / 2; halo.position.set(0, 1.62, 0.4); g.add(halo); g.userData.halo = halo;

  // 가짜 그림자
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshBasicMaterial({ color: 0x3a3350, transparent: true, opacity: 0.16 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; g.add(shadow); g.userData.shadow = shadow;

  g.scale.setScalar(species === 'hamster' ? 0.55 : species === 'bird' ? 0.7 : species === 'rabbit' ? 0.8 : 1);
  return g;
}

export function animatePet(g, t, moving, happy) {
  const u = g.userData;
  const bob = moving ? Math.abs(Math.sin(t * 9)) * 0.14 : Math.sin(t * 2) * 0.02;
  g.children.forEach((c) => { if (c !== u.shadow) c.position.y = (c.userData.baseY ??= c.position.y) + bob + (happy ? Math.abs(Math.sin(t * 7)) * 0.25 : 0); });
  if (u.tail) u.tail.rotation.z = Math.sin(t * (happy ? 16 : 5)) * (happy ? 0.6 : 0.25);
  if (u.head) { u.head.rotation.z = Math.sin(t * 1.3) * 0.08; u.head.rotation.y = happy ? Math.sin(t * 6) * 0.2 : 0; }
  if (u.halo) u.halo.rotation.z = t * 0.8;
  if (u.wingL) { u.wingL.rotation.z = Math.sin(t * 10) * 0.3 * (moving ? 1 : 0.2); u.wingR.rotation.z = -u.wingL.rotation.z; }
  if (u.legs && moving) u.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 10 + (i % 2) * Math.PI) * 0.6; });
  else if (u.legs) u.legs.forEach((l) => (l.rotation.x = 0));
}

// 별 주변을 거닐다가 방문자가 오면 다가와 반긴다
export class PetAgent {
  constructor(mesh, home, memorialId) {
    this.mesh = mesh; this.home = home.clone(); this.memorialId = memorialId;
    this.pos = home.clone().add(new THREE.Vector3(1.6, 0, 1));
    this.target = this.pos.clone();
    this.timer = Math.random() * 2;
    this.state = 'wander'; this.moving = false; this.happy = false; this.yaw = 0;
    this.speed = 1.3;
    this.mesh.position.copy(this.pos);
    this.paused = false;
    this.following = false; // 산책 중
    this.returning = false; // 산책 끝나고 집으로
    this.sniffTimer = 0;
  }
  startWalk() { this.following = true; this.returning = false; }
  endWalk() { this.following = false; this.returning = true; }
  _pickTarget() {
    const a = Math.random() * Math.PI * 2, r = 1.4 + Math.random() * 2.6;
    this.target.set(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
    if (this.target.length() > 23.5) this.target.copy(this.home);
  }
  update(dt, t, playerPos, groundFn) {
    if (this.paused) return;
    const nearHome = Math.hypot(playerPos.x - this.home.x, playerPos.z - this.home.z);
    if (this.following) {
      // 산책: 보호자 뒤를 따라오고, 가끔 멈춰 냄새를 맡는다
      this.state = 'walk';
      const dir = new THREE.Vector3(playerPos.x - this.pos.x, 0, playerPos.z - this.pos.z);
      const d = dir.length();
      this.sniffTimer -= dt;
      if (this.sniffTimer < -2.2) this.sniffTimer = 5 + Math.random() * 7;
      const sniffing = this.sniffTimer < 0 && d < 6;
      if (d > 1.6 && !sniffing) {
        dir.normalize();
        const sp = d > 5 ? this.speed * 5.5 : this.speed * 2.4;
        const step = Math.min(d - 1.4, sp * dt);
        const nx = this.pos.x + dir.x * step, nz = this.pos.z + dir.z * step;
        // 걸을 수 있는 곳으로만 (다리 폭 밖으로 떨어지지 않게)
        if (!groundFn || groundFn(nx, nz) !== null) { this.pos.x = nx; this.pos.z = nz; }
        else { this.pos.x += (playerPos.x - this.pos.x) * Math.min(1, dt * 3); this.pos.z += (playerPos.z - this.pos.z) * Math.min(1, dt * 3); }
        this.moving = true; this.yaw = Math.atan2(dir.x, dir.z);
      } else { this.moving = false; if (d < 2.2) this.yaw = Math.atan2(dir.x, dir.z); }
      this.happy = d < 2.0 && !sniffing;
      if (groundFn) { const h = groundFn(this.pos.x, this.pos.z); if (h !== null) this.pos.y += (h - this.pos.y) * Math.min(1, dt * 10); }
      if (d > 14) { this.pos.set(playerPos.x, playerPos.y, playerPos.z); } // 너무 멀어지면 바로 곁으로
    } else if (this.returning) {
      this.state = 'return';
      const dir = new THREE.Vector3().subVectors(this.home, this.pos); dir.y = 0;
      const d = dir.length();
      if (d < 1.2) { this.returning = false; this.pos.y = 0; this._pickTarget(); }
      else { dir.normalize(); this.pos.addScaledVector(dir, this.speed * 2.4 * dt); this.moving = true; this.yaw = Math.atan2(dir.x, dir.z); if (groundFn) { const h = groundFn(this.pos.x, this.pos.z); if (h !== null) this.pos.y += (h - this.pos.y) * Math.min(1, dt * 10); } }
      this.happy = false;
    } else if (nearHome < 6) {
      this.state = 'greet';
      const dir = new THREE.Vector3(playerPos.x - this.pos.x, 0, playerPos.z - this.pos.z);
      const d = dir.length();
      this.happy = d < 2.2;
      if (d > 1.5) { dir.normalize(); this.pos.addScaledVector(dir, Math.min(d - 1.4, this.speed * 1.6 * dt)); this.moving = true; this.yaw = Math.atan2(dir.x, dir.z); }
      else { this.moving = false; this.yaw = Math.atan2(dir.x, dir.z); }
    } else {
      this.state = 'wander'; this.happy = false;
      this.timer -= dt;
      const dir = new THREE.Vector3().subVectors(this.target, this.pos); dir.y = 0;
      const d = dir.length();
      if (d < 0.25 || this.timer <= 0) { if (this.timer <= 0) { this._pickTarget(); this.timer = 2.5 + Math.random() * 4; } this.moving = false; }
      else { dir.normalize(); this.pos.addScaledVector(dir, this.speed * dt); this.moving = true; this.yaw = Math.atan2(dir.x, dir.z); }
    }
    this.mesh.position.copy(this.pos);
    const ry = this.mesh.rotation.y;
    let diff = this.yaw - ry; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.mesh.rotation.y = ry + diff * Math.min(1, dt * 8);
    animatePet(this.mesh, t + this.home.x, this.moving, this.happy);
  }
}
