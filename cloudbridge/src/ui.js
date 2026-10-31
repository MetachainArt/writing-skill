import { SPECIES, COLORS, OFFERINGS, MAX_PHOTOS, shareUrl, starCode, starZoneName } from './store.js';
import { HATS, BODY_COLORS } from './player.js';

const root = () => document.getElementById('modal-root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => (d ? d.replace(/-/g, '.') : '');
const speciesOf = (id) => SPECIES.find((s) => s.id === id) || SPECIES[SPECIES.length - 1];

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.getElementById('toast-root').appendChild(el);
  setTimeout(() => el.remove(), 3100);
}

export function closeModal() {
  root().innerHTML = '';
  document.dispatchEvent(new CustomEvent('modal:closed'));
}
export function isModalOpen() { return root().children.length > 0; }

function modal(title, bodyHtml) {
  closeModal();
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h2>${title}</h2><button class="close-x" aria-label="닫기">✕</button></div><div class="modal-body">${bodyHtml}</div></div>`;
  bg.addEventListener('pointerdown', (e) => { if (e.target === bg) closeModal(); });
  bg.querySelector('.close-x').addEventListener('click', closeModal);
  root().appendChild(bg);
  document.dispatchEvent(new CustomEvent('modal:opened'));
  return bg.querySelector('.modal');
}

function daysWith(m) {
  if (!m.born || !m.passed) return null;
  const d = (new Date(m.passed) - new Date(m.born)) / 86400000;
  return d > 0 ? Math.round(d) : null;
}
function daysSince(m) {
  if (!m.passed) return null;
  const d = (Date.now() - new Date(m.passed)) / 86400000;
  return d >= 0 ? Math.floor(d) : null;
}

// ───────────── 추모 별 만들기 ─────────────
export function openCreate({ nick, onSubmit }) {
  const el = modal('✨ 추모 별 만들기', `
    <form id="create-form">
      <div class="row">
        <label class="field"><span>아이 이름 *</span><input name="name" required maxlength="20" placeholder="예: 몽이" /></label>
        <label class="field"><span>보호자 호칭</span><input name="owner" maxlength="12" value="${esc(nick)}" placeholder="예: 엄마, 누나, 리도" /></label>
      </div>
      <div class="field"><span>어떤 아이였나요?</span><div class="chips" id="species-chips">${SPECIES.map((s, i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}" data-id="${s.id}">${s.emoji} ${s.label}</button>`).join('')}</div></div>
      <label class="field"><span>품종 / 별명 (선택)</span><input name="breed" maxlength="30" placeholder="예: 말티즈, 코숏, 우리집 둘째" /></label>
      <div class="row">
        <label class="field"><span>태어난 날</span><input name="born" type="date" /></label>
        <label class="field"><span>구름다리 건넌 날</span><input name="passed" type="date" /></label>
      </div>
      <div class="field"><span>별 빛깔</span><div class="swatches" id="swatches">${COLORS.map((c, i) => `<button type="button" class="swatch ${i === 0 ? 'on' : ''}" style="background:${c}" data-c="${c}" aria-label="${c}"></button>`).join('')}</div></div>
      <div class="field"><span>사진 (선택 · 여러 장 가능, 최대 ${MAX_PHOTOS}장)</span>
        <label class="photo-drop" id="photo-drop"><span id="photo-preview">📷 눌러서 사진 올리기</span><input type="file" accept="image/*" multiple hidden id="photo-input" /></label>
      </div>
      <label class="field"><span>아이에게 남기는 한마디 *</span><textarea name="epitaph" required maxlength="300" placeholder="예: 15년 동안 매일 현관에서 기다려줘서 고마워."></textarea></label>
      <p class="help">별을 만들면 아이가 구름다리를 건너 별빛 정원에 자리를 잡아요. 그 순간을 함께 지켜봐 주세요.</p>
      <div class="actions"><button type="button" class="btn soft" id="cancel-create">다음에</button><button type="submit" class="btn primary">별 밝히기</button></div>
    </form>`);
  let species = SPECIES[0].id, color = COLORS[0], photos = [];
  el.querySelectorAll('#species-chips .chip').forEach((b) => b.addEventListener('click', () => { el.querySelectorAll('#species-chips .chip').forEach((x) => x.classList.remove('on')); b.classList.add('on'); species = b.dataset.id; }));
  el.querySelectorAll('.swatch').forEach((b) => b.addEventListener('click', () => { el.querySelectorAll('.swatch').forEach((x) => x.classList.remove('on')); b.classList.add('on'); color = b.dataset.c; }));
  el.querySelector('#photo-input').addEventListener('change', async (e) => {
    const files = [...e.target.files].slice(0, MAX_PHOTOS - photos.length);
    for (const f of files) { const p = await shrinkImage(f, 256); if (p) photos.push(p); }
    el.querySelector('#photo-preview').innerHTML = `<div class="album-strip">${photos.map((p) => `<img src="${p}" alt="" />`).join('')}</div><span>${photos.length}장 · 더 올리기</span>`;
  });
  el.querySelector('#cancel-create').addEventListener('click', closeModal);
  el.querySelector('#create-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = { name: fd.get('name').trim(), owner: fd.get('owner').trim(), breed: fd.get('breed').trim(), born: fd.get('born'), passed: fd.get('passed'), epitaph: fd.get('epitaph').trim(), species, color, photos, photo: photos[0] || null };
    if (!data.name || !data.epitaph) return;
    closeModal();
    onSubmit(data);
  });
  setTimeout(() => el.querySelector('input[name=name]').focus(), 50);
}

export function shrinkImage(file, size) {
  return new Promise((res) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d');
      const s = Math.min(img.width, img.height);
      g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => res(null);
    img.src = url;
  });
}

// ───────────── 추모 카드 ─────────────
export function openMemorial(m, { nick, index, onOffer, onLetter, onDelete, onVisitPet, onPhotos, onWalk }) {
  const sp = speciesOf(m.species);
  const code = index >= 0 ? starCode(index) : '';
  const dw = daysWith(m), ds = daysSince(m);
  const render = () => {
    const el = modal(`${sp.emoji} ${esc(m.name)}의 별`, `
      <div class="mem-hero">
        <label class="mem-photo-wrap" title="사진 올리기">
          ${m.photo ? `<img class="mem-photo" src="${m.photo}" alt="${esc(m.name)}" />` : `<div class="mem-photo" style="background:${m.color}33">${sp.emoji}</div>`}
          <span class="mem-photo-edit">📷</span>
          <input type="file" accept="image/*" multiple hidden id="mem-photo-input" />
        </label>
        <div>
          <h3 class="mem-name">${esc(m.name)}</h3>
          <p class="mem-dates">${code ? `<span class="code">${code}</span> · ` : ''}${esc(sp.label)}${m.breed ? ' · ' + esc(m.breed) : ''}${m.owner ? ' · ' + esc(m.owner) + '의 아이' : ''}${m.mine ? ' · <b>내 아이</b>' : ''}</p>
          <p class="mem-dates">${m.born ? fmtDate(m.born) + ' ~ ' : ''}${m.passed ? fmtDate(m.passed) : ''}${dw ? ` · 함께한 ${dw.toLocaleString()}일` : ''}${ds !== null ? ` · 건넌 지 ${ds}일` : ''}</p>
        </div>
      </div>
      <div class="mem-epitaph">${esc(m.epitaph)}</div>
      ${m.photos.length ? `<p class="section-title">앨범 ${m.photos.length}/${MAX_PHOTOS} · 누르면 크게, ★ 대표 사진</p>
      <div class="album-grid">${m.photos.map((p, i) => `<div class="album-item ${p === m.photo ? 'cover' : ''}"><img src="${p}" alt="" data-i="${i}" /><button class="album-star" data-i="${i}" title="대표 사진으로">★</button><button class="album-del" data-i="${i}" title="사진 빼기">✕</button></div>`).join('')}${m.photos.length < MAX_PHOTOS ? '<label class="album-add" title="사진 추가">＋<input type="file" accept="image/*" multiple hidden id="mem-photo-input2" /></label>' : ''}</div>` : ''}
      <p class="section-title">올리기 · 누르면 정원의 별 앞에 실제로 놓여요</p>
      <div class="offerings">${OFFERINGS.map((o) => `<button class="offer" data-o="${o.id}" title="${o.hint}"><b>${o.emoji}</b><small>${o.label}</small><em>${m.offerings[o.id] || 0}</em></button>`).join('')}</div>
      <div class="actions" style="justify-content:space-between">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn soft" id="btn-letter">💌 편지 쓰기</button>
          <button class="btn soft" id="btn-share">🔗 공유</button>
          ${onWalk ? '<button class="btn soft" id="btn-walk">🐾 같이 산책하기</button>' : ''}
          ${onVisitPet ? '<button class="btn soft" id="btn-pet">📍 아이 곁으로</button>' : ''}
        </div>
        ${m.sample ? '' : '<button class="btn danger" id="btn-del">별 내리기</button>'}
      </div>
      <p class="section-title">하늘로 보낸 편지 ${m.letters.length}통</p>
      <div class="letters">${m.letters.length ? m.letters.slice(0, 20).map((l) => `<div class="letter">${esc(l.text)}<div class="meta">— ${esc(l.from)} · ${new Date(l.at).toLocaleDateString('ko-KR')}</div></div>`).join('') : '<p class="help">아직 편지가 없어요. 첫 편지를 부쳐 주세요.</p>'}</div>`);
    el.querySelectorAll('.offer').forEach((b) => b.addEventListener('click', () => {
      const n = onOffer(m, b.dataset.o);
      b.querySelector('em').textContent = n;
      b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 260 });
    }));
    el.querySelector('#btn-letter').addEventListener('click', () => openLetter(m, { nick, onSubmit: (from, text) => { onLetter(m, from, text); render(); } }));
    el.querySelector('#btn-share').addEventListener('click', async () => {
      const url = shareUrl(m);
      try {
        if (navigator.share) await navigator.share({ title: `${m.name}의 별 · 구름다리 휴게소`, text: m.epitaph, url });
        else { await navigator.clipboard.writeText(url); toast('링크를 복사했어요. 가족에게 보내 주세요.'); }
      } catch { toast('공유를 취소했어요.'); }
    });
    el.querySelector('#btn-pet')?.addEventListener('click', () => { closeModal(); onVisitPet(m); });
    el.querySelector('#btn-walk')?.addEventListener('click', () => { closeModal(); onWalk(m); });
    const onFiles = async (e) => {
      const files = [...e.target.files]; if (!files.length) return;
      const urls = [];
      for (const f of files) { const p = await shrinkImage(f, 256); if (p) urls.push(p); }
      const n = onPhotos.add(m, urls);
      toast(n ? `사진 ${n}장을 앨범에 넣었어요.` : `앨범이 가득 찼어요 (최대 ${MAX_PHOTOS}장).`);
      render();
    };
    el.querySelector('#mem-photo-input').addEventListener('change', onFiles);
    el.querySelector('#mem-photo-input2')?.addEventListener('change', onFiles);
    el.querySelectorAll('.album-item img').forEach((img) => img.addEventListener('click', () => openLightbox(m, Number(img.dataset.i))));
    el.querySelectorAll('.album-star').forEach((b) => b.addEventListener('click', () => { onPhotos.cover(m, Number(b.dataset.i)); render(); }));
    el.querySelectorAll('.album-del').forEach((b) => b.addEventListener('click', () => { if (confirm('이 사진을 앨범에서 뺄까요?')) { onPhotos.remove(m, Number(b.dataset.i)); render(); } }));
    el.querySelector('#btn-del')?.addEventListener('click', () => { if (confirm(`${m.name}의 별을 정원에서 내릴까요? 되돌릴 수 없어요.`)) { closeModal(); onDelete(m); } });
  };
  render();
}

// ───────────── 사진 크게 보기 ─────────────
function openLightbox(m, idx) {
  const bg = document.createElement('div');
  bg.className = 'lightbox';
  let i = idx;
  const draw = () => { bg.innerHTML = `<img src="${m.photos[i]}" alt="" /><div class="lb-bar"><button class="btn soft" id="lb-prev">‹</button><span>${esc(m.name)} · ${i + 1} / ${m.photos.length}</span><button class="btn soft" id="lb-next">›</button></div>`;
    bg.querySelector('#lb-prev').addEventListener('click', (e) => { e.stopPropagation(); i = (i - 1 + m.photos.length) % m.photos.length; draw(); });
    bg.querySelector('#lb-next').addEventListener('click', (e) => { e.stopPropagation(); i = (i + 1) % m.photos.length; draw(); }); };
  draw();
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.tagName === 'IMG') bg.remove(); });
  document.body.appendChild(bg);
}

// ───────────── 편지 ─────────────
export function openLetter(m, { nick, onSubmit, title }) {
  const el = modal(title || `💌 ${esc(m ? m.name : '하늘')}에게`, `
    <form id="letter-form">
      <label class="field"><span>보내는 사람</span><input name="from" maxlength="12" value="${esc(nick)}" placeholder="이름 또는 호칭" /></label>
      <label class="field"><span>편지</span><textarea name="text" required maxlength="500" placeholder="${m ? `${esc(m.name)}아, ` : ''}오늘은 네 생각이 많이 났어."></textarea></label>
      <p class="help">편지는 우체통에 담겨 밤마다 등불이 되어 하늘로 올라가요.</p>
      <div class="actions"><button type="button" class="btn soft" id="cancel-letter">다음에</button><button type="submit" class="btn primary">부치기</button></div>
    </form>`);
  el.querySelector('#cancel-letter').addEventListener('click', closeModal);
  el.querySelector('#letter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const text = fd.get('text').trim(); if (!text) return;
    closeModal();
    onSubmit(fd.get('from').trim(), text);
  });
  setTimeout(() => el.querySelector('textarea').focus(), 50);
}

// ───────────── 우체통: 어느 별에게 보낼지 ─────────────
export function openMailbox(memorials, { nick, onSubmit }) {
  const el = modal('📮 하늘 우체통', `
    <p class="help">편지를 받을 아이를 고르세요. 특정 아이가 아니라 모두에게 보낼 수도 있어요.</p>
    <div class="dir-list">
      <button class="dir-item" data-id=""><span class="dir-dot" style="color:#c9b6ff;background:#c9b6ff"></span><div><b>구름다리 모두에게</b><small>이름 없이 하늘로</small></div></button>
      ${memorials.map((m) => `<button class="dir-item" data-id="${m.id}"><span class="dir-dot" style="color:${m.color};background:${m.color}"></span><div><b>${esc(m.name)}</b><small>${esc(speciesOf(m.species).label)} · 편지 ${m.letters.length}통</small></div></button>`).join('')}
    </div>`);
  el.querySelectorAll('.dir-item').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.id;
    const m = memorials.find((x) => x.id === id) || null;
    openLetter(m, { nick, onSubmit: (from, text) => onSubmit(m, from, text), title: m ? undefined : '💌 하늘로 보내는 편지' });
  }));
}

// ───────────── 별 목록 (검색 · 구역 · 사진) ─────────────
export function openDirectory(memorials, { onGo }) {
  const items = memorials.map((m, i) => ({ m, i, code: starCode(i), zone: starZoneName(i) }));
  const el = modal(`⭐ 별빛 정원의 아이들 (${memorials.length})`, `
    <label class="field"><span>이름 또는 별 번호로 찾기</span><input id="dir-q" placeholder="예: 몽이, 1-03" autocomplete="off" /></label>
    <p class="help">자리는 모자라지 않아요. 아이가 올 때마다 정원이 넓어져요.</p>
    <div class="dir-list" id="dir-list"></div>`);
  const list = el.querySelector('#dir-list');
  const render = (q) => {
    const qq = (q || '').trim().toLowerCase();
    const rows = items.filter(({ m, code }) => !qq || m.name.toLowerCase().includes(qq) || code.includes(qq) || (m.breed || '').toLowerCase().includes(qq)).reverse();
    list.innerHTML = rows.length ? rows.map(({ m, code, zone }) => `<button class="dir-item" data-id="${m.id}">
      ${m.photo ? `<img class="dir-thumb" src="${m.photo}" alt="" />` : `<span class="dir-thumb emoji" style="background:${m.color}33">${speciesOf(m.species).emoji}</span>`}
      <div><b>${esc(m.name)}</b> <span class="code">${code}</span>${m.mine ? ' <span class="badge">내 아이</span>' : ''}<small>${zone} · ${esc(speciesOf(m.species).label)}${m.breed ? ' · ' + esc(m.breed) : ''} · 🌷${m.offerings.flower} 🪔${m.offerings.incense || 0} 💌${m.letters.length}</small></div></button>`).join('') : '<p class="help">찾는 아이가 없어요.</p>';
    list.querySelectorAll('.dir-item').forEach((b) => b.addEventListener('click', () => { closeModal(); onGo(memorials.find((m) => m.id === b.dataset.id)); }));
  };
  render('');
  el.querySelector('#dir-q').addEventListener('input', (e) => render(e.target.value));
}

// ───────────── 내 아이 ─────────────
export function openMyPets(mine, allMemorials, { onGo, onCreate }) {
  if (!mine.length) { onCreate(); return; }
  if (mine.length === 1) { onGo(mine[0]); return; }
  const el = modal('🐾 내 아이들', `<div class="dir-list">${mine.map((m) => `<button class="dir-item" data-id="${m.id}">${m.photo ? `<img class="dir-thumb" src="${m.photo}" alt="" />` : `<span class="dir-thumb emoji" style="background:${m.color}33">${speciesOf(m.species).emoji}</span>`}<div><b>${esc(m.name)}</b> <span class="code">${starCode(allMemorials.indexOf(m))}</span></div></button>`).join('')}</div>`);
  el.querySelectorAll('.dir-item').forEach((b) => b.addEventListener('click', () => { closeModal(); onGo(mine.find((m) => m.id === b.dataset.id)); }));
}

// ───────────── 아바타 꾸미기 ─────────────
export function openAvatar(avatar, nick, { onSave }) {
  let a = { ...avatar };
  const el = modal('🧑 내 모습 꾸미기', `
    <label class="field"><span>이름표</span><input id="av-nick" maxlength="12" value="${esc(nick)}" placeholder="예: 몽이 엄마" /></label>
    <div class="field"><span>옷 색</span><div class="swatches" id="av-body">${BODY_COLORS.map((c) => `<button type="button" class="swatch ${c === a.body ? 'on' : ''}" style="background:${c}" data-c="${c}"></button>`).join('')}</div></div>
    <div class="field"><span>머리 장식</span><div class="chips" id="av-hat">${HATS.map((h) => `<button type="button" class="chip ${h.id === a.hat ? 'on' : ''}" data-id="${h.id}">${h.label}</button>`).join('')}</div></div>
    <div class="field"><span>장식 색</span><div class="swatches" id="av-hatc">${BODY_COLORS.map((c) => `<button type="button" class="swatch ${c === a.hatColor ? 'on' : ''}" style="background:${c}" data-c="${c}"></button>`).join('')}</div></div>
    <div class="actions"><button class="btn primary" id="av-save">이렇게 할게요</button></div>`);
  const pick = (sel, key, attr) => el.querySelectorAll(sel + ' > *').forEach((b) => b.addEventListener('click', () => { el.querySelectorAll(sel + ' > *').forEach((x) => x.classList.remove('on')); b.classList.add('on'); a[key] = b.dataset[attr]; onSave({ ...a, preview: true }); }));
  pick('#av-body', 'body', 'c'); pick('#av-hat', 'hat', 'id'); pick('#av-hatc', 'hatColor', 'c');
  el.querySelector('#av-save').addEventListener('click', () => { closeModal(); onSave({ ...a, nick: el.querySelector('#av-nick').value.trim() }); });
}

// ───────────── 조약돌 탑 ─────────────
export function openCairn(pebbles, { onAdd }) {
  const el = modal('🪨 조약돌 탑', `
    <p class="help">말로 하기 어려운 마음은 돌 하나로 올려요. 돌은 탑에 그대로 쌓여요. 지금까지 <b>${pebbles.length}</b>개.</p>
    <form id="cairn-form">
      <label class="field"><span>돌에 새길 한 줄 (선택, 60자)</span><input name="text" maxlength="60" placeholder="예: 보고 싶다, 그뿐이야." /></label>
      <div class="actions"><button type="submit" class="btn primary">조약돌 올리기</button></div>
    </form>
    ${pebbles.length ? `<p class="section-title">최근 올린 돌</p><div class="letters">${pebbles.slice(0, 8).map((p) => `<div class="letter">${p.text ? esc(p.text) : '<i>말없이 올린 돌</i>'}<div class="meta">${new Date(p.at).toLocaleDateString('ko-KR')}</div></div>`).join('')}</div>` : ''}`);
  el.querySelector('#cairn-form').addEventListener('submit', (e) => { e.preventDefault(); const text = new FormData(e.target).get('text').trim(); closeModal(); onAdd(text); });
}

// ───────────── 위로의 광장 게시판 ─────────────
export function openPlaza(posts, nick, { onPost, onPat }) {
  const render = () => {
    const el = modal('🫶 위로받고 싶어요', `
      <p class="help">여기 적힌 글엔 답을 달지 않아요. 대신 <b>토닥</b>을 눌러요. 토닥은 "나도 그래요"라는 뜻이에요.</p>
      <form id="plaza-form">
        <label class="field"><span>오늘의 마음 (200자)</span><textarea name="text" required maxlength="200" placeholder="예: 보낸 지 한 달인데 아직 사료 그릇을 못 치웠어요."></textarea></label>
        <div class="row"><label class="field"><span>이름</span><input name="from" maxlength="12" value="${esc(nick)}" placeholder="익명" /></label><div class="field" style="display:flex;align-items:end"><button type="submit" class="btn primary" style="width:100%">광장에 남기기</button></div></div>
      </form>
      <div class="letters">${posts.map((p) => `<div class="letter"><div>${esc(p.text)}</div><div class="meta" style="display:flex;justify-content:space-between;align-items:center"><span>— ${esc(p.from)} · ${new Date(p.at).toLocaleDateString('ko-KR')}</span><button class="btn soft pat" data-id="${p.id}" style="padding:4px 10px">🤍 토닥 ${p.pats}</button></div></div>`).join('')}</div>`);
    el.querySelector('#plaza-form').addEventListener('submit', (e) => { e.preventDefault(); const fd = new FormData(e.target); const text = fd.get('text').trim(); if (!text) return; onPost(text, fd.get('from').trim()); render(); });
    el.querySelectorAll('.pat').forEach((b) => b.addEventListener('click', () => { const n = onPat(b.dataset.id); b.textContent = `🤍 토닥 ${n}`; b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 220 }); }));
  };
  render();
}

// ───────────── 힐링 라운지 ─────────────
export function openLounge(totals) {
  modal('🏡 힐링 라운지', `
    <div class="lounge">
      <p>여기는 보호자를 위한 쉼터예요. 아이를 보낸 뒤의 마음은 "유난"이 아니라 애도예요. 천천히 쉬어 가세요.</p>
      <p class="section-title">이 휴게소의 오늘</p>
      <ul><li>별빛 정원에 머무는 아이 <b>${totals.stars}</b>명</li><li>지금까지 놓인 꽃·간식·촛불·손길 <b>${totals.offerings.toLocaleString()}</b>번</li><li>하늘로 부친 편지 <b>${totals.letters}</b>통</li></ul>
      <p class="section-title">펫로스를 지나는 분들에게</p>
      <ul>
        <li>"더 잘해줄걸" 하는 자책은 사별한 보호자에게 가장 흔한 감정이에요. 그만큼 사랑했다는 뜻이에요.</li>
        <li>슬픔이 1년 넘게 일상을 무너뜨리면 혼자 버티지 말고 상담을 권해요. 마음이 급하면 보건복지부 정신건강 위기상담 <b>☎ 1577-0199</b>(24시간).</li>
        <li>매달 보름밤, 이 휴게소에서 등불을 함께 띄우는 <b>합동 추모의 밤</b>이 열려요(준비 중).</li>
      </ul>
      <p class="section-title">곧 열리는 것들</p>
      <ul><li>계정 로그인·가족 공동 관리</li><li>기일·생일 알림과 1주기 편지함</li><li>아이 목소리·영상 보관함</li><li>펫로스 상담사 연결</li></ul>
    </div>`);
}

export function openHelp() {
  modal('🧭 휴게소 둘러보기', `
    <div class="lounge">
      <ul>
        <li>이동 <span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span> 또는 방향키, 모바일은 왼쪽 조이스틱</li>
        <li>시점 회전: 화면 드래그 · 확대/축소: 휠</li>
        <li>별·나무·우체통·건물 가까이 가면 <span class="kbd">E</span> 또는 <b>살펴보기</b> 버튼</li>
        <li>동쪽의 무지개 구름다리를 끝까지 걸어가면 <b>빛의 문</b>이 있어요</li>
        <li>오른쪽 위 🌤️ 로 낮·노을·밤을 바꿀 수 있어요. 밤에는 반딧불이 나와요</li>
        <li>추모 카드의 <b>같이 산책하기</b>를 누르면 아이가 따라와요. 다리 끝까지도 같이 갈 수 있어요</li>
        <li>아래 👋 🙏 💗 로 인사·묵념·하트를 보낼 수 있어요</li>
        <li><b>홈 화면에 추가</b>: iPhone은 Safari 공유 → 홈 화면에 추가, Android는 Chrome 메뉴 → 홈 화면에 추가. 앱처럼 열려요</li>
      </ul>
    </div>`);
}

export function openBridgeInfo() {
  modal('🌈 구름다리', `
    <div class="lounge">
      <p>"무지개다리 너머"라는 말은 반려동물을 먼저 보낸 사람들이 오랫동안 써 온 표현이에요. 이 휴게소는 그 다리의 이쪽 끝, 아이들이 잠깐 쉬어 가는 곳이라는 상상에서 시작했어요.</p>
      <p>다리를 끝까지 걸어가면 빛의 문이 있어요. 새 별을 만들면 아이는 그 문을 지나 이 다리를 건너 정원에 자리를 잡아요.</p>
    </div>`);
}

export function openGate() {
  modal('✨ 빛의 문', `
    <div class="lounge">
      <p>여기서부터는 아이들만 지나갈 수 있어요. 문 너머에서 아이들은 아프지 않고, 배고프지 않고, 기다리지 않아요.</p>
      <p>문 앞에 잠시 서서, 하고 싶었던 말을 속으로 해 보세요. 들린다고 믿는 쪽이 조금 더 따뜻하니까요.</p>
    </div>`);
}
