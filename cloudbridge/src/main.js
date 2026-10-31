import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { buildPet, PetAgent, animatePet } from './pets.js';
import { store, importFromHash, starCode } from './store.js';
import { audio } from './audio.js';
import { runCeremony } from './ceremony.js';
import * as ui from './ui.js';

const $ = (s) => document.querySelector(s);

// ───────────── 부팅 ─────────────
store.seedIfEmpty();
store.seedPostsIfEmpty();
const shared = importFromHash();

const world = new World($('#scene'));
const player = new Player(world, $('#joystick'));
const agents = new Map(); // memorialId -> PetAgent
let ceremony = null;
let nearest = null;
let entered = false;

let walking = null; // 산책 중인 PetAgent
let walkTimer = 0;
function spawnStar(m, index) {
  const g = world.addStar(m, index, starCode(index));
  if (!agents.has(m.id)) {
    const mesh = buildPet(m.species, m.color);
    world.scene.add(mesh);
    agents.set(m.id, new PetAgent(mesh, g.position, m.id));
  }
}
store.memorials.forEach((m, i) => spawnStar(m, i));
world.refreshCairn(store.state.pebbles.length);
player.applyAvatar(store.state.avatar);

function slotIndexFor(m) { return store.memorials.indexOf(m); }

// ───────────── 입장 ─────────────
function renderLandingStats() {
  const t = store.totals();
  $('#landing-stats').textContent = `지금 별빛 정원에는 ${t.stars}명의 아이가 쉬고 있어요 · 편지 ${t.letters}통 · 손길 ${t.offerings.toLocaleString()}번`;
}
renderLandingStats();
$('#nick-input').value = store.state.nick || '';

function enter(thenCreate) {
  if (entered) return;
  entered = true;
  store.setNick($('#nick-input').value.trim());
  player.setName(store.state.nick);
  store.countVisit();
  audio.setEnabled(store.state.settings.sound !== false);
  audio.unlock();
  $('#landing').classList.add('fade');
  setTimeout(() => ($('#landing').hidden = true), 700);
  $('#hud').hidden = false;
  if (shared) {
    const idx = slotIndexFor(shared);
    const p = world.starSlot(idx);
    player.teleport(new THREE.Vector3(p.x + 1.6, 0, p.z + 1.6));
    setTimeout(() => ui.toast(`${shared.name}의 별로 바로 왔어요`), 800);
  }
  if (thenCreate) setTimeout(openCreate, 500);
}
$('#enter-btn').addEventListener('click', () => enter(false));
$('#enter-create-btn').addEventListener('click', () => enter(true));
$('#nick-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') enter(false); });

// ───────────── HUD 버튼 ─────────────
const timeIcons = { auto: '🌤️', day: '☀️', sunset: '🌇', night: '🌙' };
$('#time-btn').addEventListener('click', () => { const m = world.cycleTime(); $('#time-btn').textContent = timeIcons[m]; ui.toast({ auto: '실제 시간에 맞춰요', day: '낮', sunset: '노을', night: '밤 — 반딧불이 나와요' }[m]); });
$('#sound-btn').addEventListener('click', () => { const v = !audio.enabled; audio.setEnabled(v); store.setSetting('sound', v); $('#sound-btn').textContent = v ? '🔈' : '🔇'; });
$('#dir-btn').addEventListener('click', () => ui.openDirectory(store.memorials, { onGo: (m) => { const p = world.stars.get(m.id).position; player.teleport(new THREE.Vector3(p.x + 1.6, 0, p.z + 1.6)); ui.toast(`${m.name}의 별 앞으로 왔어요`); } }));
$('#help-btn').addEventListener('click', () => ui.openHelp());
const goTo = (m) => { closeRoom(); const p = world.stars.get(m.id).position; player.teleport(new THREE.Vector3(p.x + 1.6, 0, p.z + 1.6)); ui.toast(`${m.name}의 별 앞으로 왔어요`); };
$('#mine-btn').addEventListener('click', () => ui.openMyPets(store.mine, store.memorials, { onGo: goTo, onCreate: () => { ui.toast('아직 내 아이의 별이 없어요. 먼저 만들어 볼까요?'); openCreate(); } }));
$('#avatar-btn').addEventListener('click', () => ui.openAvatar(store.state.avatar, store.state.nick, { onSave: (a) => { player.applyAvatar(a); if (a.preview) return; store.setAvatar({ body: a.body, hat: a.hat, hatColor: a.hatColor }); if (a.nick !== undefined) { store.setNick(a.nick); player.setName(a.nick); } ui.toast('새 모습으로 바꿨어요'); } }));
$('#cairn-btn').addEventListener('click', () => { player.teleport(new THREE.Vector3(16.5, 0, 7.5)); ui.toast('조약돌 탑 앞으로 왔어요'); });
$('#zoom-in').addEventListener('click', () => player.zoom(-2));
$('#zoom-out').addEventListener('click', () => player.zoom(2));
$('#em-wave').addEventListener('click', () => player.emote('wave'));
$('#em-bow').addEventListener('click', () => { if (player.emote('bow')) audio.chime('soft'); });
$('#em-heart').addEventListener('click', () => { if (player.emote('heart')) audio.chime('soft'); });
$('#walk-end').addEventListener('click', endWalk);
addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (!entered || ui.isModalOpen()) return;
  if (e.key === '1') player.emote('wave'); if (e.key === '2') player.emote('bow'); if (e.key === '3') player.emote('heart');
});

// ───────────── 산책 ─────────────
const WALK_LINES = (n) => [
  `${n}이(가) 옆에서 나란히 걷고 있어요`, `${n}이(가) 잠깐 멈춰 풀냄새를 맡아요`, `${n}이(가) 가만히 올려다봐요`, `${n}의 꼬리가 천천히 흔들려요`,
  `${n}이(가) 앞서 갔다가 돌아와요`, `바람이 불자 ${n}이(가) 귀를 쫑긋해요`, `${n}이(가) 당신 발걸음에 맞춰 속도를 늦춰요`,
];
function startWalk(m) {
  closeRoom();
  const a = agents.get(m.id); if (!a) return;
  if (walking && walking !== a) walking.endWalk();
  walking = a; a.startWalk(); walkTimer = 4;
  $('#walk-chip').hidden = false; $('#walk-label').textContent = `🐾 ${m.name}와(과) 산책 중`;
  audio.chime('soft');
  ui.toast(`${m.name}이(가) 따라와요. 어디든 같이 가요. 다리 끝까지도요.`);
}
function endWalk() {
  if (!walking) return;
  const m = store.get(walking.memorialId);
  walking.endWalk(); walking = null;
  $('#walk-chip').hidden = true;
  if (m) ui.toast(`${m.name}이(가) 자기 별로 돌아가요. 또 걸어요.`);
}
$('#create-btn').addEventListener('click', openCreate);
$('#interact-btn').addEventListener('click', interact);
addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.key === 'Escape') { if (ceremony) ceremony.skip(); else if (ui.isModalOpen()) ui.closeModal(); else closeRoom(); }
  if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && entered && !ui.isModalOpen() && !world.room) interact();
});

// ───────────── 상호작용 ─────────────
const nick = () => store.state.nick || '방문자';
function handlers(m) {
  return {
    nick: nick(),
    index: store.indexOf(m),
    onWalk: (mm) => startWalk(mm),
    onOffer: (mm, type) => {
      const n = store.offer(mm.id, type);
      world.refreshStarDecor(mm);
      const g = world.stars.get(mm.id);
      world.burst(g.position.clone().add(new THREE.Vector3(0, 1.2, 0)), type === 'incense' ? new THREE.Color(0xeae6f2) : new THREE.Color(mm.color), type === 'incense' ? 8 : 14);
      audio.chime(type === 'incense' ? 'letter' : 'soft');
      return n;
    },
    onLetter: (mm, from, text) => { store.addLetter(mm.id, from, text); audio.chime('letter'); ui.toast('편지가 우체통에 담겼어요. 밤에 등불이 되어 올라가요.'); },
    onDelete: (mm) => { store.remove(mm.id); world.removeStar(mm.id); const a = agents.get(mm.id); if (a) { world.scene.remove(a.mesh); agents.delete(mm.id); } ui.toast(`${mm.name}의 별을 조용히 내렸어요.`); },
    onPhotos: {
      add: (mm, urls) => { const n = store.addPhotos(mm.id, urls); world.refreshStarPhoto(mm); if (n) audio.chime('soft'); return n; },
      remove: (mm, idx) => { store.removePhoto(mm.id, idx); world.refreshStarPhoto(mm); },
      cover: (mm, idx) => { store.setCover(mm.id, idx); world.refreshStarPhoto(mm); ui.toast('대표 사진을 바꿨어요.'); },
    },
    onVisitPet: (mm) => { const a = agents.get(mm.id); if (a) { player.teleport(new THREE.Vector3(a.pos.x + 1.5, 0, a.pos.z + 1.5)); } },
  };
}
// ───────────── 별의 방 ─────────────
let roomAgent = null;
function openRoom(m) {
  const info = world.enterRoom(m, player.pos);
  if (!info) return;
  player.locked = true;
  player.pos.copy(info.playerSpot); player.mesh.position.copy(player.pos); player.yaw = info.facing + Math.PI; player.mesh.rotation.y = player.yaw;
  if (player.tag) player.tag.visible = false;
  const a = agents.get(m.id);
  if (a) { roomAgent = a; a.paused = true; a.pos.copy(info.petSpot); a.pos.y = 0; a.mesh.position.copy(a.pos); a.mesh.rotation.y = info.facing; }
  $('#hud').classList.add('room-mode');
  const h = handlers(m);
  ui.openRoomSheet(m, { index: store.indexOf(m),
    onOffer: (mm, type) => { const n = h.onOffer(mm, type); world.refreshRoomItems(mm); return n; },
    onAlbum: () => ui.openMemorial(m, h),
    onLetter: () => ui.openLetter(m, { nick: nick(), onSubmit: (from, text) => h.onLetter(m, from, text) }),
    onWalk: () => { closeRoom(); startWalk(m); },
    onShare: async () => { const { shareUrl } = await import('./store.js'); const url = shareUrl(m); try { if (navigator.share) await navigator.share({ title: `${m.name}의 별 · 구름다리 휴게소`, text: m.epitaph, url }); else { await navigator.clipboard.writeText(url); ui.toast('링크를 복사했어요.'); } } catch { ui.toast('공유를 취소했어요.'); } },
    onClose: closeRoom });
  audio.chime('soft');
}
function closeRoom() {
  if (!world.room) return;
  world.exitRoom();
  ui.closeRoomSheet();
  $('#hud').classList.remove('room-mode');
  player.locked = false; player.camPos.set(0, 0, 0);
  if (player.tag) player.tag.visible = true;
  if (roomAgent) { roomAgent.paused = false; roomAgent = null; }
}

function interact() {
  if (!nearest || ui.isModalOpen() || ceremony) return;
  const it = nearest;
  if (it.kind === 'star') { const m = store.get(it.memorialId); if (m) openRoom(m); }
  else if (it.kind === 'tree') ui.openLetter(null, { nick: nick(), title: '🍃 기억의 나무에 잎 달기', onSubmit: (from, text) => { const all = store.memorials; const target = all[Math.floor(Math.random() * all.length)]; if (target) store.addLetter(target.id, from, text); audio.chime('letter'); world.burst(new THREE.Vector3(12, 8, -12), 0xfff6c8, 24); ui.toast('잎이 하나 더 반짝여요. 누군가의 아이에게 닿았어요.'); } });
  else if (it.kind === 'mailbox') ui.openMailbox(store.memorials, { nick: nick(), onSubmit: (m, from, text) => { if (m) store.addLetter(m.id, from, text); else { const all = store.memorials; all.forEach((x) => { if (Math.random() < 0.3) store.addLetter(x.id, from, text); }); } audio.chime('letter'); world.burst(new THREE.Vector3(-7, 2.5, 11), 0xff9fbe, 20); ui.toast('편지를 부쳤어요.'); } });
  else if (it.kind === 'lounge') ui.openLounge(store.totals());
  else if (it.kind === 'cairn') ui.openCairn(store.state.pebbles, { onAdd: (text) => { store.addPebble(text); world.refreshCairn(store.state.pebbles.length); world.burst(new THREE.Vector3(18, 1.5, 6), 0xf0e7dc, 10); audio.chime('soft'); ui.toast(text ? '돌에 마음을 새겨 올렸어요.' : '말없이 돌 하나를 올렸어요.'); } });
  else if (it.kind === 'plaza') ui.openPlaza(store.state.posts, nick(), { onPost: (text, from) => { store.addPost(text, from); audio.chime('letter'); ui.toast('광장에 남겼어요. 누군가 토닥여 줄 거예요.'); }, onPat: (id) => store.patPost(id) });
  else if (it.kind === 'bridge') ui.openBridgeInfo();
  else if (it.kind === 'gate') { ui.openGate(); audio.chime('star'); }
}

// ───────────── 별 만들기 + 세리머니 ─────────────
function openCreate() {
  if (!entered) { enter(true); return; }
  if (ceremony) return;
  ui.openCreate({ nick: nick(), onSubmit: (data) => {
    const m = store.add({ ...data, mine: true });
    const idx = slotIndexFor(m);
    const g = world.addStar(m, idx, starCode(idx));
    g.visible = false;
    $('#hud').hidden = true;
    const cinema = document.createElement('div');
    cinema.className = 'cinema';
    cinema.innerHTML = '<div class="bars top"></div><div class="bars bottom"></div><div class="caption"></div>';
    document.getElementById('app').appendChild(cinema);
    audio.chime('star');
    ceremony = runCeremony({ world, player, memorial: m, starPos: g.position.clone(),
      onCaption: (txt) => { const c = cinema.querySelector('.caption'); c.textContent = txt; c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; if (txt.includes('자리')) { g.visible = true; audio.chime('star'); } },
      onDone: () => {
        g.visible = true;
        cinema.remove();
        $('#hud').hidden = false;
        ceremony = null;
        const mesh = buildPet(m.species, m.color);
        world.scene.add(mesh);
        agents.set(m.id, new PetAgent(mesh, g.position, m.id));
        player.teleport(new THREE.Vector3(g.position.x + 1.6, 0, g.position.z + 1.6));
        renderLandingStats();
        setTimeout(() => ui.openMemorial(m, handlers(m)), 300);
      } });
  } });
}

// ───────────── 루프 ─────────────
const zoneName = (p) => {
  if (p.x > 23 && Math.abs(p.z) < 3) return p.x > 90 ? '빛의 문' : '구름다리';
  if (world.islands) for (const [k, isl] of world.islands) { if (Math.hypot(p.x - isl.center.x, p.z - isl.center.z) < 18) return `별빛 정원 ${k + 1}구역`; }
  if (Math.hypot(p.x, p.z) > 26) return '구름 길';
  if (Math.hypot(p.x - 18, p.z - 6) < 3.5) return '조약돌 탑';
  if (Math.hypot(p.x, p.z) < 4) return '위로의 광장';
  if (Math.hypot(p.x - 6, p.z - 9) < 13) return `별빛 정원`;
  if (Math.hypot(p.x + 13, p.z + 8) < 9) return '힐링 라운지 앞';
  if (Math.hypot(p.x - 12, p.z + 12) < 8) return '기억의 나무';
  return '휴게소 광장';
};
let last = performance.now();
let hintTimer = 0;
function loop(now) {
  requestAnimationFrame(loop);
// 테스트/디버그용 최소 훅 (데이터 접근 없음)
window.__cb = { teleport: (x, z) => player.teleport(new THREE.Vector3(x, 0, z)),
  // 부하 테스트: n개의 별을 즉시 추가 (개발용)
  stress: (n) => { const sp = ['dog', 'cat', 'rabbit', 'bird', 'hamster']; for (let i = 0; i < n; i++) { const m = store.add({ name: `아이${store.memorials.length + 1}`, species: sp[i % 5], color: ['#ff9fbe', '#ffb98a', '#ffe680', '#8fe3a8', '#7fd8d6', '#a98bff'][i % 6], epitaph: '잘 지내', offerings: { flower: i % 7, incense: i % 4, candle: i % 5 } }); spawnStar(m, store.indexOf(m)); } renderLandingStats(); return store.memorials.length; } };
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;
  world.update(dt, t);
  if (ceremony) { ceremony.tick(dt, t); }
  else if (entered) { player.update(dt, t); if (world.room) { world.updateRoomCamera(dt, t); if (roomAgent) animatePet(roomAgent.mesh, t, false, Math.sin(t * 0.7) > 0.6); } }
  else { // 입장 전: 섬을 천천히 도는 카메라
    const a = t * 0.08;
    world.camera.position.set(Math.cos(a) * 40, 14 + Math.sin(t * 0.3) * 2, Math.sin(a) * 40);
    world.camera.lookAt(0, 2, 0);
  }
  const pp = player.pos;
  const groundFn = (x, z) => world.groundHeight(x, z);
  // 거리 컬링: 멀리 있는 아이·이름표는 쉬게 둔다 (수천 개 별에서도 가볍게)
  for (const a of agents.values()) {
    const far = !a.following && Math.hypot(a.home.x - pp.x, a.home.z - pp.z) > 48;
    a.mesh.visible = !far;
    if (far) continue;
    if (!roomAgent || a !== roomAgent) a.paused = !!ceremony;
    a.update(dt, t, pp, groundFn);
  }
  for (const g of world.stars.values()) { const u = g.userData; const dd = Math.hypot(g.position.x - pp.x, g.position.z - pp.z);
    const inRoom = !!world.room, isRoomStar = inRoom && world.room.memorialId === u.memorialId;
    if (u.label) { u.label.visible = !inRoom && dd < 9; u.label.material.opacity = Math.min(1, Math.max(0, (9 - dd) / 3)); }
    if (u.photo && !isRoomStar) u.photo.visible = !inRoom && dd < 40;
    if (!isRoomStar) { const hide = inRoom && dd < 8; g.visible = !hide; u.glow.material.opacity = Math.min(u.glow.material.opacity, inRoom ? 0.2 : dd < 30 ? 0.7 : 0.3); }
    else g.visible = true;
    u.decor.visible = dd < 45; }
  if (world.room) for (const a of agents.values()) { if (a !== roomAgent) a.mesh.visible = a.mesh.visible && Math.hypot(a.pos.x - pp.x, a.pos.z - pp.z) > 7; }
  if (walking && entered && !ceremony) {
    walkTimer -= dt;
    if (walkTimer <= 0) { walkTimer = 9 + Math.random() * 7; const m = store.get(walking.memorialId); if (m && !ui.isModalOpen()) { const lines = WALK_LINES(m.name); ui.toast(lines[Math.floor(Math.random() * lines.length)]); } }
  }
  // 근접 상호작용
  if (entered && !ceremony) {
    let best = null, bd = 1e9;
    for (const it of world.interactables) {
      const d = Math.hypot(it.pos.x - pp.x, it.pos.z - pp.z);
      if (d < it.radius && d < bd) { best = it; bd = d; }
    }
    if (world.room) best = null;
    if (best !== nearest) {
      nearest = best;
      const b = $('#interact-btn');
      if (best) { b.hidden = false; b.textContent = best.label; } else b.hidden = true;
    }
    hintTimer += dt;
    if (hintTimer > 0.5) { hintTimer = 0; $('#hud-zone').textContent = zoneName(pp); }
  }
  world.render();
}
requestAnimationFrame(loop);
// 테스트/디버그용 최소 훅 (데이터 접근 없음)
window.__cb = { teleport: (x, z) => player.teleport(new THREE.Vector3(x, 0, z)),
  // 부하 테스트: n개의 별을 즉시 추가 (개발용)
  stress: (n) => { const sp = ['dog', 'cat', 'rabbit', 'bird', 'hamster']; for (let i = 0; i < n; i++) { const m = store.add({ name: `아이${store.memorials.length + 1}`, species: sp[i % 5], color: ['#ff9fbe', '#ffb98a', '#ffe680', '#8fe3a8', '#7fd8d6', '#a98bff'][i % 6], epitaph: '잘 지내', offerings: { flower: i % 7, incense: i % 4, candle: i % 5 } }); spawnStar(m, store.indexOf(m)); } renderLandingStats(); return store.memorials.length; } };
