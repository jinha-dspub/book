

const $ = (s, r=document) => r.querySelector(s);
const hex2buf = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
const CHUNK = 20;                       // 한 번에 그리는 문항 수
let KEY = null, MAN = null, CUR = null, LIST = [], SHOWN = 0;

// ── 유도한 키를 브라우저에 보관한다 (PBKDF2 는 느리다 — 한 번만 계산한다) ──
const DB = {
  open: () => new Promise((res, rej) => {
    const r = indexedDB.open('ihq', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }),
  async get(k) {
    try { const db = await this.open();
      return await new Promise(res => { const q = db.transaction('kv').objectStore('kv').get(k);
        q.onsuccess = () => res(q.result); q.onerror = () => res(null); });
    } catch { return null; }
  },
  async set(k, v) {
    try { const db = await this.open();
      await new Promise(res => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k);
        t.oncomplete = () => res(); t.onerror = () => res(); });
    } catch {}
  },
  async clear() { try { const db = await this.open();
      await new Promise(res => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').clear();
        t.oncomplete = () => res(); t.onerror = () => res(); }); } catch {} },
};

const PROG = {
  key: 'ihq.progress',
  load() { try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch { return {}; } },
  save(p) { try { localStorage.setItem(this.key, JSON.stringify(p)); } catch {} },
  set(id, v) { const p = this.load(); p[id] = v; this.save(p); },
};

async function derive(pw) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: hex2buf(SALT), iterations: ITER, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
}
const cache = new Map();
async function load(name, memo) {
  if (memo && cache.has(name)) return cache.get(name);
  const res = await fetch(`data/${name}.enc`, { cache: 'force-cache' });
  if (!res.ok) throw new Error('없음');
  const buf = new Uint8Array(await res.arrayBuffer());
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, KEY, buf.slice(12));
  const obj = JSON.parse(new TextDecoder().decode(plain));
  if (memo) cache.set(name, obj);
  return obj;
}

async function unlock(pw) {
  const key = await derive(pw);
  KEY = key; MAN = await load('manifest', true);          // 틀린 비밀번호면 여기서 실패한다
  await DB.set('key', { salt: SALT, iter: ITER, key });
  $('#gate').hidden = true; $('#app').hidden = false;
  route();
}

$('#pw-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#pw-form button'); btn.disabled = true; btn.textContent = '여는 중…';
  $('#err').textContent = '';
  try { await unlock($('#pw').value); }
  catch { $('#err').textContent = '비밀번호가 맞지 않습니다.'; btn.disabled = false; btn.textContent = '열기'; }
});

addEventListener('hashchange', route);
$('#home').addEventListener('click', e => { e.preventDefault(); location.hash = ''; });
$('#reset').addEventListener('click', () => {
  if (confirm('이 브라우저에 저장된 진도를 모두 지웁니다.')) {
    localStorage.removeItem(PROG.key); localStorage.removeItem('ihq.byTopic'); route();
  }
});
$('#lock').addEventListener('click', async () => { await DB.clear(); location.reload(); });

const pct = (d, a) => a ? Math.round(d / a * 100) : 0;
const bar = (d, a) => `<span class="bar"><i style="width:${pct(d, a)}%"></i></span><span class="pct">${pct(d, a)}%</span>`;

function route() { if (!MAN) return; const k = location.hash.replace(/^#/, ''); k ? openTopic(k) : index(); }

function index() {
  $('#crumb').textContent = '';
  let byTopic = {}; try { byTopic = JSON.parse(localStorage.getItem('ihq.byTopic') || '{}'); } catch {}
  let h = `<p class="lead">교재의 절마다 개념과 그 절의 기출 문항을 함께 둡니다.
    <b>핵심</b>은 2회 이상 출제된 문항입니다 — 여기부터 푸십시오.</p>`;
  for (const w of MAN.weeks) {
    h += `<h2>${w.w}주차 <span class="muted">${w.title}</span></h2><div class="grid">`;
    for (const t of w.topics) {
      h += `<a class="card topic" href="#${t.key}">
        <div class="t">${t.title}</div>
        <div class="meta"><span>문항 ${t.n}</span><span class="core">핵심 ${t.core}</span><span>해설 ${t.e}</span></div>
        <div class="prog">${bar(byTopic[t.key] || 0, t.n)}</div></a>`;
    }
    h += `</div>`;
  }
  $('#main').innerHTML = h;
}

async function openTopic(key) {
  $('#main').innerHTML = '<p class="muted">여는 중…</p>';
  let d;
  try { d = await load(key, true); } catch { location.hash = ''; return; }
  CUR = d;
  $('#crumb').textContent = ` · ${d.week}주차 · ${d.title}`;
  $('#main').innerHTML = `
    <h2>${d.title}</h2>
    <div class="tabs"><button data-tab="concept" class="on">개념</button><button data-tab="quiz">문항 ${d.qs.length}</button></div>
    <section id="concept">${d.html || '<p class="muted">이 절에는 교재 본문이 없습니다.</p>'}</section>
    <section id="quiz" hidden>
      <div class="filters">
        <label><input type="radio" name="f" value="core" checked> 핵심만</label>
        <label><input type="radio" name="f" value="all"> 전체</label>
        <label><input type="radio" name="f" value="wrong"> 틀린 것</label>
        <label><input type="radio" name="f" value="todo"> 안 푼 것</label>
        <span class="grow"></span><span id="count" class="muted"></span>
      </div>
      <div id="qs"></div>
      <div id="more"></div>
    </section>`;
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    $('#concept').hidden = b.dataset.tab !== 'concept';
    $('#quiz').hidden = b.dataset.tab !== 'quiz';
  }));
  document.querySelectorAll('input[name=f]').forEach(r => r.addEventListener('change', renderQs));
  renderQs();
  saveProgress(key);
}

function saveProgress(key) {
  const p = PROG.load();
  let m = {}; try { m = JSON.parse(localStorage.getItem('ihq.byTopic') || '{}'); } catch {}
  m[key] = CUR.qs.filter(q => p[q.id]).length;
  try { localStorage.setItem('ihq.byTopic', JSON.stringify(m)); } catch {}
}

function counter() {
  const p = PROG.load();
  $('#count').textContent = `${LIST.length}문항 중 ${Math.min(SHOWN, LIST.length)}개 표시 · 이 절에서 푼 것 ${CUR.qs.filter(q => p[q.id]).length}/${CUR.qs.length}`;
}

function renderQs() {
  const f = document.querySelector('input[name=f]:checked').value;
  const p = PROG.load();
  LIST = CUR.qs.filter(q => f === 'all' || (f === 'core' && q.n > 1) || (f === 'wrong' && p[q.id] === 2) || (f === 'todo' && !p[q.id]));
  SHOWN = 0; $('#qs').innerHTML = '';
  if (!LIST.length) { $('#qs').innerHTML = '<p class="muted">해당하는 문항이 없습니다.</p>'; $('#more').innerHTML = ''; counter(); return; }
  more();
}

function more() {
  const p = PROG.load();
  const part = LIST.slice(SHOWN, SHOWN + CHUNK);
  $('#qs').insertAdjacentHTML('beforeend', part.map((q, i) => card(q, SHOWN + i + 1, p[q.id])).join(''));
  SHOWN += part.length;
  part.forEach(q => { if (q.img || q.o.some(o => o.i)) pictures(q.id); });   // 화면에 뜬 문항의 그림만 받는다
  $('#qs').querySelectorAll('.opt:not([data-b])').forEach(el => { el.dataset.b = 1; el.addEventListener('click', pick); });
  $('#more').innerHTML = SHOWN < LIST.length
    ? `<button id="more-btn" class="ghost wide">더 보기 (${LIST.length - SHOWN}개 남음)</button>` : '';
  const b = $('#more-btn'); if (b) b.addEventListener('click', more);
  counter();
}

async function pictures(qid) {
  try {
    const pics = await load(`img/${qid}`, true);
    const art = document.getElementById(`q-${qid}`); if (!art) return;
    for (const [k, src] of Object.entries(pics)) {
      const el = art.querySelector(k === 's' ? '.qimg' : `.opt[data-i="${k}"] .oimg`);
      if (el) { el.src = src; el.hidden = false; }
    }
  } catch {}
}

function card(q, i, state) {
  const opts = q.o.map((o, j) => `<button class="opt" data-q="${q.id}" data-i="${j}">
      <span class="no">${'①②③④⑤'[j]}</span><span>${o.t}${o.i ? '<img class="oimg" hidden alt="">' : ''}</span></button>`).join('');
  return `<article class="q ${state ? (state === 1 ? 'ok' : 'no') : ''}" id="q-${q.id}">
    <div class="qh"><span class="idx">${i}</span>${q.n > 1 ? '<span class="badge core">핵심</span>' : ''}
      <span class="src">${q.src}</span>${q.ref ? `<span class="ref">📖 ${q.ref}</span>` : ''}</div>
    <div class="stem">${q.q}</div>${q.img ? '<img class="qimg" hidden alt="">' : ''}
    <div class="opts">${opts}</div>
    <div class="ans" hidden><b>정답 ${'①②③④⑤'[q.a]}</b>${q.e ? `<div class="exp">${q.e}</div>` : '<div class="exp muted">해설은 아직 없습니다. 위의 「개념」 탭을 보십시오.</div>'}</div>
  </article>`;
}

function pick(e) {
  const btn = e.currentTarget, art = btn.closest('.q');
  if (art.classList.contains('done')) return;
  const q = CUR.qs.find(x => x.id === btn.dataset.q), chose = +btn.dataset.i;
  art.classList.add('done');
  art.querySelectorAll('.opt').forEach((el, j) => {
    if (j === q.a) el.classList.add('right'); else if (j === chose) el.classList.add('wrong');
  });
  art.querySelector('.ans').hidden = false;
  art.classList.add(chose === q.a ? 'ok' : 'no');
  PROG.set(q.id, chose === q.a ? 1 : 2);
  saveProgress(location.hash.replace(/^#/, ''));
  counter();
}

// 저장해 둔 키가 있으면 비밀번호를 다시 묻지 않는다
(async () => {
  const saved = await DB.get('key');
  if (!saved || saved.salt !== SALT || saved.iter !== ITER) return;
  try { KEY = saved.key; MAN = await load('manifest', true); $('#gate').hidden = true; $('#app').hidden = false; route(); }
  catch { await DB.clear(); }
})();

