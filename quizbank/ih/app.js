
const $ = (s, r=document) => r.querySelector(s);
const hex2buf = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
let KEY = null, MAN = null, CUR = null;

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
async function load(name) {
  const buf = new Uint8Array(await (await fetch(`data/${name}.enc`, { cache: 'no-store' })).arrayBuffer());
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, KEY, buf.slice(12));
  return JSON.parse(new TextDecoder().decode(plain));
}

$('#pw-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#pw-form button'); btn.disabled = true; btn.textContent = '여는 중…';
  try {
    KEY = await derive($('#pw').value);
    MAN = await load('manifest');
    sessionStorage.setItem('ihq.pw', $('#pw').value);
    $('#gate').hidden = true; $('#app').hidden = false;
    route();
  } catch {
    $('#err').textContent = '비밀번호가 맞지 않습니다.';
    btn.disabled = false; btn.textContent = '열기';
  }
});

addEventListener('hashchange', route);
$('#home').addEventListener('click', e => { e.preventDefault(); location.hash = ''; });
$('#reset').addEventListener('click', () => {
  if (confirm('이 브라우저에 저장된 진도를 모두 지웁니다.')) { localStorage.removeItem(PROG.key); route(); }
});

function bar(done, all) {
  const p = all ? Math.round(done / all * 100) : 0;
  return `<span class="bar"><i style="width:${p}%"></i></span><span class="pct">${p}%</span>`;
}

function route() {
  if (!MAN) return;
  const key = location.hash.replace(/^#/, '');
  if (key) { openTopic(key); } else { index(); }
}

function index() {
  $('#crumb').textContent = '';
  const p = PROG.load();
  let h = `<p class="lead">교재의 절마다 개념과 그 절의 기출 문항을 함께 둡니다.
    <b>핵심</b>은 2회 이상 출제된 문항입니다 — 여기부터 푸십시오.</p>`;
  for (const w of MAN.weeks) {
    h += `<h2>${w.w}주차 <span class="muted">${w.title}</span></h2><div class="grid">`;
    for (const t of w.topics) {
      const ids = t.key;
      h += `<a class="card topic" href="#${ids}">
        <div class="t">${t.title}</div>
        <div class="meta"><span>문항 ${t.n}</span><span class="core">핵심 ${t.core}</span><span>해설 ${t.e}</span></div>
        <div class="prog" data-key="${ids}"></div></a>`;
    }
    h += `</div>`;
  }
  $('#main').innerHTML = h;
  // 진도는 절 데이터를 열어야 알 수 있으므로 저장된 것만 표시
  const seen = {};
  for (const k of Object.keys(p)) seen[k] = 1;
  document.querySelectorAll('.prog').forEach(el => {
    const t = MAN.weeks.flatMap(w => w.topics).find(x => x.key === el.dataset.key);
    const done = (JSON.parse(localStorage.getItem('ihq.byTopic') || '{}')[el.dataset.key]) || 0;
    el.innerHTML = bar(done, t.n);
  });
}

async function openTopic(key) {
  $('#main').innerHTML = '<p class="muted">여는 중…</p>';
  let d;
  try { d = await load(key); } catch { location.hash = ''; return; }
  CUR = d;
  $('#crumb').textContent = ` · ${d.week}주차 · ${d.title}`;
  const p = PROG.load();
  const done = d.qs.filter(q => p[q.id]).length;
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
    </section>`;
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    $('#concept').hidden = b.dataset.tab !== 'concept';
    $('#quiz').hidden = b.dataset.tab !== 'quiz';
  }));
  document.querySelectorAll('input[name=f]').forEach(r => r.addEventListener('change', renderQs));
  renderQs();
  saveTopicProgress(key, done);
}

function saveTopicProgress(key, done) {
  let m = {}; try { m = JSON.parse(localStorage.getItem('ihq.byTopic') || '{}'); } catch {}
  m[key] = done; try { localStorage.setItem('ihq.byTopic', JSON.stringify(m)); } catch {}
}

function renderQs() {
  const f = document.querySelector('input[name=f]:checked').value;
  const p = PROG.load();
  const list = CUR.qs.filter(q => f === 'all' || (f === 'core' && q.n > 1) || (f === 'wrong' && p[q.id] === 2) || (f === 'todo' && !p[q.id]));
  $('#count').textContent = `${list.length}문항 · 푼 것 ${CUR.qs.filter(q => p[q.id]).length}/${CUR.qs.length}`;
  $('#qs').innerHTML = list.map((q, i) => card(q, i, p[q.id])).join('') || '<p class="muted">해당하는 문항이 없습니다.</p>';
  document.querySelectorAll('.opt').forEach(el => el.addEventListener('click', pick));
}

function card(q, i, state) {
  const opts = q.o.map((o, j) => `<button class="opt" data-q="${q.id}" data-i="${j}">
      <span class="no">${'①②③④⑤'[j]}</span><span>${o.t}${o.i ? `<img src="${o.i}" alt="">` : ''}</span></button>`).join('');
  return `<article class="q ${state ? (state === 1 ? 'ok' : 'no') : ''}" id="q-${q.id}">
    <div class="qh"><span class="idx">${i + 1}</span>${q.n > 1 ? '<span class="badge core">핵심</span>' : ''}
      <span class="src">${q.src}</span>${q.ref ? `<span class="ref">📖 ${q.ref}</span>` : ''}</div>
    <div class="stem">${q.q}</div>${q.img ? `<img class="qimg" src="${q.img}" alt="">` : ''}
    <div class="opts">${opts}</div>
    <div class="ans" hidden><b>정답 ${'①②③④⑤'[q.a]}</b>${q.e ? `<div class="exp">${q.e}</div>` : '<div class="exp muted">해설은 아직 없습니다. 위의 교재 절을 보십시오.</div>'}</div>
  </article>`;
}

function pick(e) {
  const btn = e.currentTarget, art = btn.closest('.q');
  if (art.classList.contains('done')) return;
  const q = CUR.qs.find(x => x.id === btn.dataset.q), chose = +btn.dataset.i;
  art.classList.add('done');
  art.querySelectorAll('.opt').forEach((el, j) => {
    if (j === q.a) el.classList.add('right');
    else if (j === chose) el.classList.add('wrong');
  });
  art.querySelector('.ans').hidden = false;
  art.classList.add(chose === q.a ? 'ok' : 'no');
  PROG.set(q.id, chose === q.a ? 1 : 2);
  const p = PROG.load();
  saveTopicProgress(location.hash.replace(/^#/, ''), CUR.qs.filter(x => p[x.id]).length);
  $('#count').textContent = `${document.querySelectorAll('.q').length}문항 · 푼 것 ${CUR.qs.filter(x => p[x.id]).length}/${CUR.qs.length}`;
}

// 새로고침해도 이번 세션 동안은 다시 묻지 않는다
(async () => {
  const pw = sessionStorage.getItem('ihq.pw');
  if (!pw) return;
  try { KEY = await derive(pw); MAN = await load('manifest'); $('#gate').hidden = true; $('#app').hidden = false; route(); } catch {}
})();
