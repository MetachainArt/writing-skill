import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { buildPet, PetAgent } from './pets.js';
import { store, importFromHash } from './store.js';
import { audio } from './audio.js';
import { runCeremony } from './ceremony.js';
import * as ui from './ui.js';

const $ = (s) => document.querySelector(s);

// ───────────── 부팅 ─────────────
store.seedIfEmpty();
const shared = importFromHash();

const world = new World($('#scene'));
const player = new Player(world, $('#joystick'));
const agents = new Map(); // memorialId -> PetAgent
let ceremony = null;
let nearest = null;
let entered = false;

function spawnStar(m, index) {
  const g = world.addStar(m, index);
  if (!agents.has(m.id)) {
    const mesh = buildPet(m.species, m.color);
    world.scene.add(mesh);
    agents.set(m.id, new PetAgent(mesh, g.position, m.id));
  }
}
store.memorials.forEach((m, i) => spawnStar(m, i));

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
$('#create-btn').addEventListener('click', openCreate);
$('#interact-btn').addEventListener('click', interact);
addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.key === 'Escape') { if (ceremony) ceremony.skip(); else ui.closeModal(); }
  if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && entered && !ui.isModalOpen()) interact();
});

// ───────────── 상호작용 ─────────────
const nick = () => store.state.nick || '방문자';
function handlers(m) {
  return {
    nick: nick(),
    onOffer: (mm, type) => {
      const n = store.offer(mm.id, type);
      world.refreshStarDecor(mm);
      const g = world.stars.get(mm.id);
      world.burst(g.position.clone().add(new THREE.Vector3(0, 1.2, 0)), new THREE.Color(mm.color), 14);
      audio.chime('soft');
      return n;
    },
    onLetter: (mm, from, text) => { store.addLetter(mm.id, from, text); audio.chime('letter'); ui.toast('편지가 우체통에 담겼어요. 밤에 등불이 되어 올라가요.'); },
    onDelete: (mm) => { store.remove(mm.id); world.removeStar(mm.id); const a = agents.get(mm.id); if (a) { world.scene.remove(a.mesh); agents.delete(mm.id); } ui.toast(`${mm.name}의 별을 조용히 내렸어요.`); },
    onVisitPet: (mm) => { const a = agents.get(mm.id); if (a) { player.teleport(new THREE.Vector3(a.pos.x + 1.5, 0, a.pos.z + 1.5)); } },
  };
}
function interact() {
  if (!nearest || ui.isModalOpen() || ceremony) return;
  const it = nearest;
  if (it.kind === 'star') { const m = store.get(it.memorialId); if (m) ui.openMemorial(m, handlers(m)); }
  else if (it.kind === 'tree') ui.openLetter(null, { nick: nick(), title: '🍃 기억의 나무에 잎 달기', onSubmit: (from, text) => { const all = store.memorials; const target = all[Math.floor(Math.random() * all.length)]; if (target) store.addLetter(target.id, from, text); audio.chime('letter'); world.burst(new THREE.Vector3(12, 8, -12), 0xfff6c8, 24); ui.toast('잎이 하나 더 반짝여요. 누군가의 아이에게 닿았어요.'); } });
  else if (it.kind === 'mailbox') ui.openMailbox(store.memorials, { nick: nick(), onSubmit: (m, from, text) => { if (m) store.addLetter(m.id, from, text); else { const all = store.memorials; all.forEach((x) => { if (Math.random() < 0.3) store.addLetter(x.id, from, text); }); } audio.chime('letter'); world.burst(new THREE.Vector3(-7, 2.5, 11), 0xff9fbe, 20); ui.toast('편지를 부쳤어요.'); } });
  else if (it.kind === 'lounge') ui.openLounge(store.totals());
  else if (it.kind === 'bridge') ui.openBridgeInfo();
  else if (it.kind === 'gate') { ui.openGate(); audio.chime('star'); }
}

// ───────────── 별 만들기 + 세리머니 ─────────────
function openCreate() {
  if (!entered) { enter(true); return; }
  if (ceremony) return;
  ui.openCreate({ nick: nick(), onSubmit: (data) => {
    const m = store.add(data);
    const idx = slotIndexFor(m);
    const g = world.addStar(m, idx);
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
  if (Math.hypot(p.x - 6, p.z - 9) < 13) return '별빛 정원';
  if (Math.hypot(p.x + 13, p.z + 8) < 9) return '힐링 라운지 앞';
  if (Math.hypot(p.x - 12, p.z + 12) < 8) return '기억의 나무';
  return '휴게소 광장';
};
let last = performance.now();
let hintTimer = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;
  world.update(dt, t);
  if (ceremony) { ceremony.tick(dt, t); }
  else if (entered) player.update(dt, t);
  else { // 입장 전: 섬을 천천히 도는 카메라
    const a = t * 0.08;
    world.camera.position.set(Math.cos(a) * 40, 14 + Math.sin(t * 0.3) * 2, Math.sin(a) * 40);
    world.camera.lookAt(0, 2, 0);
  }
  const pp = player.pos;
  for (const a of agents.values()) { a.paused = !!ceremony; a.update(dt, t, pp); }
  // 근접 상호작용
  if (entered && !ceremony) {
    let best = null, bd = 1e9;
    for (const it of world.interactables) {
      const d = Math.hypot(it.pos.x - pp.x, it.pos.z - pp.z);
      if (d < it.radius && d < bd) { best = it; bd = d; }
    }
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
