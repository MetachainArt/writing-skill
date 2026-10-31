import * as THREE from 'three';
import { buildPet, animatePet } from './pets.js';

// 새 별이 생길 때: 아이가 빛의 문에서 구름다리를 건너 자기 별로 걸어가는 장면
export function runCeremony({ world, player, memorial, starPos, onDone, onCaption }) {
  const pet = buildPet(memorial.species, memorial.color);
  world.scene.add(pet);
  player.locked = true;
  const cam = world.camera;
  const start = world.stationPos.clone();
  const bridgeEnd = new THREE.Vector3(22.5, 0.2, 0);
  const total = 11.5;
  let t = 0;
  const t0 = performance.now();
  const captions = [
    [0, `${memorial.name}이(가) 빛의 문을 지나 구름다리로 나왔어요`],
    [4.5, '천천히, 다리를 건너는 중…'],
    [8.6, `별빛 정원에 ${memorial.name}의 자리가 생겼어요`],
  ];
  let ci = 0;
  const lookAt = new THREE.Vector3();
  const camPos = cam.position.clone();
  const tick = (dt, now) => {
    t = (performance.now() - t0) / 1000; // 벽시계 기준: 저사양에서도 길이가 일정
    while (ci < captions.length && t >= captions[ci][0]) { onCaption(captions[ci][1]); ci++; }
    let pos, next;
    if (t < 8) {
      // 다리 끝(1) → 섬(0)
      const k = Math.min(1, t / 8);
      const u = 1 - (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
      pos = world.bridgeCurve.getPoint(u); pos.y += 0.4;
      next = world.bridgeCurve.getPoint(Math.max(0, u - 0.01)); next.y += 0.4;
      if (t < 0.6) { pos.lerpVectors(start, pos, t / 0.6); }
    } else {
      const k = Math.min(1, (t - 8) / 2.6);
      const s = k * k * (3 - 2 * k);
      pos = new THREE.Vector3().lerpVectors(bridgeEnd, starPos.clone().add(new THREE.Vector3(1.6, 0, 1)), s);
      next = starPos;
      if (k >= 1 && !pet.userData.arrived) { pet.userData.arrived = true; world.burst(starPos.clone().add(new THREE.Vector3(0, 1.9, 0)), new THREE.Color(memorial.color), 30); }
    }
    pet.position.copy(pos);
    const dir = new THREE.Vector3().subVectors(next, pos); dir.y = 0;
    if (dir.lengthSq() > 1e-4) pet.rotation.y = Math.atan2(dir.x, dir.z);
    animatePet(pet, now, t < 10.6, t >= 10.6);
    // 카메라: 아이 옆에서 따라가며 조금씩 높이 변화
    const side = new THREE.Vector3(Math.sin(now * 0.3) * 2 + 5, 3.2, 6.5);
    const want = pos.clone().add(side);
    camPos.lerp(want, Math.min(1, dt * 2.2));
    cam.position.copy(camPos);
    lookAt.lerp(pos.clone().add(new THREE.Vector3(0, 1, 0)), Math.min(1, dt * 4));
    cam.lookAt(lookAt);
    if (t >= total) { finish(); return false; }
    return true;
  };
  const finish = () => {
    world.scene.remove(pet);
    player.locked = false;
    player.camPos.set(0, 0, 0);
    onDone();
  };
  return { tick, skip: finish };
}
