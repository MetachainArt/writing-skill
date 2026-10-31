// 데이터 계층. 지금은 localStorage, 나중엔 같은 인터페이스로 Supabase/Firestore로 교체한다.
const KEY = 'cloudbridge.v1';

export const SPECIES = [
  { id: 'dog', label: '강아지', emoji: '🐶' },
  { id: 'cat', label: '고양이', emoji: '🐱' },
  { id: 'rabbit', label: '토끼', emoji: '🐰' },
  { id: 'bird', label: '새', emoji: '🐦' },
  { id: 'hamster', label: '햄스터·설치류', emoji: '🐹' },
  { id: 'other', label: '그 밖의 아이', emoji: '🐾' },
];

export const COLORS = ['#ff9fbe', '#ffb98a', '#ffe680', '#8fe3a8', '#7fd8d6', '#a98bff', '#ffffff'];

// 올리기는 향·초·꽃 세 가지. (간식·쓰다듬기 데이터는 호환을 위해 남아 있다)
export const OFFERINGS = [
  { id: 'incense', label: '향', emoji: '🪔', hint: '향로에 향을 올리고 연기가 피어올라요' },
  { id: 'candle', label: '초', emoji: '🕯️', hint: '촛불이 하나씩 켜져요' },
  { id: 'flower', label: '꽃', emoji: '🌷', hint: '받침 둘레에 꽃이 늘어나요' },
];
export const MAX_PHOTOS = 10;

const SEED = [
  { id: 'seed-mong', name: '몽이', species: 'dog', breed: '말티즈', color: '#ffffff', born: '2009-03-02', passed: '2024-11-18', owner: '엄마', epitaph: '15년 동안 매일 현관에서 기다려줘서 고마워. 이제는 내가 기다릴게.' },
  { id: 'seed-nabi', name: '나비', species: 'cat', breed: '코리안숏헤어', color: '#ffb98a', born: '2013-06-10', passed: '2025-02-03', owner: '지우', epitaph: '창가 햇빛 자리는 아직 비워뒀어. 언제든 와서 누워.' },
  { id: 'seed-tori', name: '토리', species: 'rabbit', breed: '네덜란드 드워프', color: '#ff9fbe', born: '2018-01-20', passed: '2025-07-29', owner: '수민', epitaph: '당근보다 네 코 실룩거림이 더 좋았어.' },
  { id: 'seed-coco', name: '코코', species: 'bird', breed: '코카티엘', color: '#ffe680', born: '2016-09-05', passed: '2024-05-14', owner: '아빠', epitaph: '아침마다 불러주던 그 노래, 구름 위에서도 불러줘.' },
  { id: 'seed-happy', name: '해피', species: 'hamster', breed: '골든햄스터', color: '#8fe3a8', born: '2023-04-11', passed: '2025-09-01', owner: '하준', epitaph: '짧았지만 볼주머니 가득 행복했지?' },
  { id: 'seed-bori', name: '보리', species: 'dog', breed: '진돗개', color: '#a98bff', born: '2011-10-30', passed: '2025-10-12', owner: '할머니', epitaph: '마당 지켜줘서 고마웠다. 이제 편히 쉬어라.' },
];

function uid() {
  return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function blank() {
  return { memorials: [], visits: 0, nick: '', settings: { sound: true, time: 'auto' }, seeded: false,
    avatar: { body: '#c9b6ff', hat: 'cone', hatColor: '#a0e7e5' }, pebbles: [], posts: [], seededPosts: false };
}

// 별 주소: 섬(구역) 하나에 60개. 60개가 차면 새 구역 섬이 구름 위에 떠오른다. 희소성은 없다.
export const ISLAND_CAP = 50;
export function starCode(index) {
  const zone = Math.floor(index / ISLAND_CAP) + 1, num = (index % ISLAND_CAP) + 1;
  return `${zone}-${String(num).padStart(2, '0')}`;
}
export function starZoneName(index) { const z = Math.floor(index / ISLAND_CAP) + 1; return z === 1 ? '별빛 정원 (본섬)' : `별빛 정원 ${z}구역 섬`; }

const SEED_POSTS = [
  { text: '보낸 지 한 달인데 아직 사료 그릇을 못 치웠어요.', from: '콩이 엄마', pats: 23 },
  { text: '산책 코스 지나갈 때마다 눈물이 나요. 다들 어떻게 지나가세요?', from: '익명', pats: 41 },
  { text: '오늘 처음 별 만들었어요. 손이 떨렸는데 아이가 다리 건너는 거 보고 울었어요.', from: '두부 누나', pats: 58 },
  { text: '"유난이다"라는 말 들었어요. 여기 오니까 유난 아닌 것 같아서 좋아요.', from: '익명', pats: 77 },
  { text: '1주기였어요. 편지 부치고 왔어요. 다들 고마워요.', from: '보리 할머니', pats: 35 },
];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const s = { ...blank(), ...JSON.parse(raw) };
    return s;
  } catch {
    return blank();
  }
}

export function normalizeMemorial(m) {
  return {
    id: m.id || uid(),
    name: (m.name || '이름 없는 아이').slice(0, 20),
    species: SPECIES.some((s) => s.id === m.species) ? m.species : 'other',
    breed: (m.breed || '').slice(0, 30),
    color: COLORS.includes(m.color) ? m.color : COLORS[0],
    born: m.born || '',
    passed: m.passed || '',
    owner: (m.owner || '').slice(0, 12),
    epitaph: (m.epitaph || '').slice(0, 300),
    photo: m.photo || (Array.isArray(m.photos) && m.photos[0]) || null,
    photos: Array.isArray(m.photos) && m.photos.length ? m.photos.slice(0, MAX_PHOTOS) : (m.photo ? [m.photo] : []),
    createdAt: m.createdAt || Date.now(),
    offerings: { flower: 0, incense: 0, treat: 0, candle: 0, pat: 0, ...(m.offerings || {}) },
    letters: Array.isArray(m.letters) ? m.letters : [],
    sample: !!m.sample,
    mine: !!m.mine,
  };
}

export const store = {
  state: load(),
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) { console.warn('save failed', e); }
  },
  seedIfEmpty() {
    if (this.state.seeded) return;
    const seeds = SEED.map((s, i) => normalizeMemorial({ ...s, sample: true, createdAt: Date.now() - (i + 1) * 86400000 * 9,
      offerings: { flower: 12 + i * 7, incense: 4 + i * 2, treat: 5 + i * 3, candle: 9 + i * 2, pat: 30 + i * 11 },
      letters: [{ id: uid(), from: '지나가던 방문자', text: '편히 쉬어, 아가. 좋은 꿈 꿔.', at: Date.now() - 86400000 * 3 }] }));
    this.state.memorials = [...seeds, ...this.state.memorials];
    this.state.seeded = true;
    this.save();
  },
  seedPostsIfEmpty() {
    if (this.state.seededPosts) return;
    this.state.posts = SEED_POSTS.map((p, i) => ({ id: uid(), ...p, at: Date.now() - (i + 1) * 86400000 * 2, mine: false }));
    this.state.seededPosts = true;
    this.save();
  },
  get mine() { return this.state.memorials.filter((m) => m.mine); },
  indexOf(m) { return this.state.memorials.indexOf(m); },
  // 조약돌 탑
  addPebble(text) {
    const p = { id: uid(), text: (text || '').slice(0, 60), at: Date.now() };
    this.state.pebbles.unshift(p); this.save(); return p;
  },
  // 위로의 광장 게시판
  addPost(text, from) {
    const p = { id: uid(), text: text.slice(0, 200), from: (from || '익명').slice(0, 12), pats: 0, at: Date.now(), mine: true };
    this.state.posts.unshift(p); this.save(); return p;
  },
  patPost(id) { const p = this.state.posts.find((x) => x.id === id); if (!p) return 0; p.pats += 1; this.save(); return p.pats; },
  setAvatar(a) { this.state.avatar = { ...this.state.avatar, ...a }; this.save(); },
  get memorials() { return this.state.memorials; },
  get(id) { return this.state.memorials.find((m) => m.id === id); },
  add(data) {
    const m = normalizeMemorial(data);
    this.state.memorials.push(m);
    this.save();
    return m;
  },
  update(id, patch) {
    const m = this.get(id);
    if (!m) return null;
    const allowed = ['name', 'breed', 'born', 'passed', 'owner', 'epitaph', 'photo', 'photos', 'color'];
    for (const k of allowed) if (k in patch) m[k] = patch[k];
    Object.assign(m, normalizeMemorial(m));
    this.save();
    return m;
  },
  // 사진 앨범
  addPhotos(id, urls) {
    const m = this.get(id); if (!m) return 0;
    const room = MAX_PHOTOS - m.photos.length;
    const add = urls.filter(Boolean).slice(0, Math.max(0, room));
    m.photos.push(...add);
    if (!m.photo && m.photos.length) m.photo = m.photos[0];
    this.save(); return add.length;
  },
  removePhoto(id, idx) {
    const m = this.get(id); if (!m) return;
    const [gone] = m.photos.splice(idx, 1);
    if (m.photo === gone) m.photo = m.photos[0] || null;
    this.save();
  },
  setCover(id, idx) {
    const m = this.get(id); if (!m || !m.photos[idx]) return;
    m.photo = m.photos[idx]; this.save();
  },
  remove(id) {
    this.state.memorials = this.state.memorials.filter((m) => m.id !== id);
    this.save();
  },
  offer(id, type) {
    const m = this.get(id);
    if (!m) return 0;
    m.offerings[type] = (m.offerings[type] || 0) + 1;
    this.save();
    return m.offerings[type];
  },
  addLetter(id, from, text) {
    const m = this.get(id);
    if (!m) return null;
    const l = { id: uid(), from: (from || '익명').slice(0, 12), text: text.slice(0, 500), at: Date.now() };
    m.letters.unshift(l);
    this.save();
    return l;
  },
  setNick(n) { this.state.nick = (n || '').slice(0, 12); this.save(); },
  setSetting(k, v) { this.state.settings[k] = v; this.save(); },
  countVisit() { this.state.visits += 1; this.save(); },
  totals() {
    const t = { stars: this.state.memorials.length, offerings: 0, letters: 0 };
    for (const m of this.state.memorials) {
      t.offerings += Object.values(m.offerings).reduce((a, b) => a + b, 0);
      t.letters += m.letters.length;
    }
    return t;
  },
};

// ---- 공유 링크: 백엔드 없이도 별 하나를 URL 해시에 담아 보낼 수 있다 ----
function b64url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function shareUrl(m) {
  const slim = { id: m.id, name: m.name, species: m.species, breed: m.breed, color: m.color, born: m.born, passed: m.passed, owner: m.owner, epitaph: m.epitaph };
  // 사진은 작을 때만 포함 (URL 길이 보호)
  if (m.photo && m.photo.length < 24000) slim.photo = m.photo;
  const url = new URL(location.href);
  url.hash = 'm=' + b64url(JSON.stringify(slim));
  return url.toString();
}

export function importFromHash() {
  const h = location.hash;
  if (!h.startsWith('#m=')) return null;
  try {
    const data = JSON.parse(unb64url(h.slice(3)));
    const existing = store.get(data.id);
    if (existing) return existing;
    const m = store.add({ ...data, createdAt: Date.now() });
    return m;
  } catch (e) {
    console.warn('share import failed', e);
    return null;
  } finally {
    history.replaceState(null, '', location.pathname + location.search);
  }
}
