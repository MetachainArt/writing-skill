import * as THREE from 'three';

const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...extra });

export class Player {
  constructor(world, joystickEl) {
    this.world = world;
    this.pos = new THREE.Vector3(0, 0, 18);
    this.yaw = Math.PI; // 바라보는 방향
    this.camYaw = 0; this.camPitch = 0.42; this.camDist = 9;
    this.keys = new Set();
    this.joy = { active: false, x: 0, y: 0, id: null };
    this.speed = 6;
    this.locked = false;
    this.mesh = this._build();
    this.mesh.position.copy(this.pos);
    world.scene.add(this.mesh);
    this._bind(joystickEl);
    this.camTarget = new THREE.Vector3();
    this.camPos = new THREE.Vector3();
  }
  _build() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.7, 6, 12), mat(0xc9b6ff)); body.position.y = 0.95; g.add(body);
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.11, 8, 20), mat(0xff9fbe)); scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.35; g.add(scarf);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 12), mat(0xfff0e6)); head.position.y = 1.95; g.add(head);
    [-0.16, 0.16].forEach((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(0x3a3350)); e.position.set(x, 2.0, 0.42); g.add(e);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0xffa3bd)); b.position.set(x * 1.8, 1.9, 0.36); b.scale.z = 0.3; g.add(b); });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.47, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), mat(0xffd6a5)); hair.position.y = 2.0; g.add(hair);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.6, 8), mat(0xa0e7e5)); hat.position.y = 2.6; g.add(hat); this.hat = hat;
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshBasicMaterial({ color: 0x3a3350, transparent: true, opacity: 0.16 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; g.add(shadow);
    this.bodyParts = [body, scarf, head, hair, hat];
    return g;
  }
  _bind(joy) {
    addEventListener('keydown', (e) => { if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return; this.keys.add(e.key.toLowerCase()); if ([' ', 'arrowup', 'arrowdown'].includes(e.key.toLowerCase())) e.preventDefault(); });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());
    // 카메라 드래그
    const canvas = this.world.canvas;
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => { if (e.target !== canvas) return; drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (!drag || drag.id !== e.pointerId) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; this.camYaw -= dx * 0.0065; this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.004, 0.12, 1.1); });
    const end = (e) => { if (drag && drag.id === e.pointerId) drag = null; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', (e) => { this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.01, 4.5, 18); }, { passive: true });
    // 조이스틱
    if (joy) {
      const stick = joy.querySelector('.stick');
      const R = 36;
      const set = (e) => { const r = joy.getBoundingClientRect(); let x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2); const d = Math.hypot(x, y); if (d > R) { x = x / d * R; y = y / d * R; } this.joy.x = x / R; this.joy.y = y / R; stick.style.transform = `translate(${x}px, ${y}px)`; };
      joy.addEventListener('pointerdown', (e) => { this.joy.active = true; this.joy.id = e.pointerId; joy.setPointerCapture(e.pointerId); set(e); });
      joy.addEventListener('pointermove', (e) => { if (this.joy.active && e.pointerId === this.joy.id) set(e); });
      const stop = (e) => { if (e.pointerId !== this.joy.id) return; this.joy.active = false; this.joy.x = this.joy.y = 0; stick.style.transform = ''; };
      joy.addEventListener('pointerup', stop); joy.addEventListener('pointercancel', stop);
    }
  }
  teleport(v) { this.pos.set(v.x, this.world.groundHeight(v.x, v.z) ?? 0, v.z); this.mesh.position.copy(this.pos); this.camPos.set(0, 0, 0); }
  update(dt, t) {
    let ix = 0, iz = 0;
    if (!this.locked) {
      const k = this.keys;
      if (k.has('w') || k.has('arrowup')) iz -= 1;
      if (k.has('s') || k.has('arrowdown')) iz += 1;
      if (k.has('a') || k.has('arrowleft')) ix -= 1;
      if (k.has('d') || k.has('arrowright')) ix += 1;
      if (this.joy.active) { ix += this.joy.x; iz += this.joy.y; }
    }
    const len = Math.hypot(ix, iz);
    const moving = len > 0.08;
    if (moving) {
      if (len > 1) { ix /= len; iz /= len; }
      const cy = this.camYaw;
      const dx = ix * Math.cos(cy) - iz * Math.sin(cy);
      const dz = ix * Math.sin(cy) + iz * Math.cos(cy);
      const sp = this.speed * (this.keys.has('shift') ? 1.5 : 1);
      const nx = this.pos.x + dx * sp * dt, nz = this.pos.z + dz * sp * dt;
      let h = this.world.groundHeight(nx, nz);
      if (h === null) {
        // 벽 따라 미끄러지기
        if (this.world.groundHeight(nx, this.pos.z) !== null) { h = this.world.groundHeight(nx, this.pos.z); this.pos.x = nx; }
        else if (this.world.groundHeight(this.pos.x, nz) !== null) { h = this.world.groundHeight(this.pos.x, nz); this.pos.z = nz; }
      } else { this.pos.x = nx; this.pos.z = nz; }
      if (h !== null) this.pos.y += (h - this.pos.y) * Math.min(1, dt * 12);
      const target = Math.atan2(dx, dz);
      let diff = target - this.yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.yaw += diff * Math.min(1, dt * 10);
    }
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw;
    const bob = moving ? Math.abs(Math.sin(t * 10)) * 0.12 : Math.sin(t * 2) * 0.02;
    this.bodyParts.forEach((p) => { p.position.y = (p.userData.baseY ??= p.position.y) + bob; });
    this.mesh.rotation.z = moving ? Math.sin(t * 10) * 0.04 : 0;
    // 카메라
    const cam = this.world.camera;
    const off = new THREE.Vector3(Math.sin(this.camYaw) * Math.cos(this.camPitch), Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch)).multiplyScalar(this.camDist);
    const want = this.pos.clone().add(off).add(new THREE.Vector3(0, 1.2, 0));
    if (this.camPos.lengthSq() === 0) this.camPos.copy(want);
    this.camPos.lerp(want, Math.min(1, dt * 6));
    // 섬 지면 아래로 카메라가 뚫리지 않게
    const gh = this.world.groundHeight(this.camPos.x, this.camPos.z);
    if (gh !== null && this.camPos.y < gh + 1.2) this.camPos.y = gh + 1.2;
    cam.position.copy(this.camPos);
    this.camTarget.lerp(this.pos.clone().add(new THREE.Vector3(0, 1.6, 0)), Math.min(1, dt * 8));
    cam.lookAt(this.camTarget);
    return moving;
  }
}
