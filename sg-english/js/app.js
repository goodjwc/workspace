// 싱가포르 출장 생존영어 — 앱 본체
// 화면: home / flash(플래시카드) / role(실전 롤플레이) / settings

const STORE_KEY = 'sgEnglish.v1';

const Store = {
  data: null,
  load() {
    try { this.data = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { this.data = {}; }
    this.data.progress = this.data.progress || {};
    this.data.settings = Object.assign({
      rate: 0.9,
      voiceThem: '',
      voiceMe: '',
      subtitles: true,
      front: 'prompt', // 'prompt' = 상대 말 보고 답하기, 'korean' = 한국어 보고 영어로
      shuffle: false
    }, this.data.settings || {});
  },
  save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); } catch { /* 저장 불가 환경 */ } },
  get settings() { return this.data.settings; },
  prog(id) { return this.data.progress[id] || { known: false, seen: 0, best: null }; },
  setProg(id, patch) { this.data.progress[id] = Object.assign(this.prog(id), patch); this.save(); },
  reset() { this.data.progress = {}; this.save(); }
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pronHtml = s => esc(s).replace(/\*([^*]+)\*/g, '<b>$1</b>');
const sceneOf = item => SCENES.find(s => item.id.startsWith(s.id + '-'));
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const scoreClass = n => (n >= 85 ? 'good' : n >= 60 ? 'ok' : 'bad');

class App {
  constructor() {
    this.root = document.getElementById('app');
    this.view = 'home';
    this.recordings = {};   // 카드 id → 내 녹음 URL (세션 동안만 유지)
    this.recorder = null;   // 녹음 중인 핸들
    this.listener = null;   // 음성 인식 중인 핸들
    Store.load();
    Speech.loadVoices();
    const onVoices = () => { Speech.loadVoices(); if (this.view === 'settings') this.render(); };
    if (Speech.isApp) window.__ttsReady = onVoices; // 앱: 폰 TTS 엔진 준비 완료 시 네이티브가 호출
    else if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = onVoices;
    this.root.addEventListener('click', e => this.onClick(e));
    this.root.addEventListener('change', e => this.onChange(e));
    this.root.addEventListener('input', e => this.onChange(e));
    window.addEventListener('popstate', () => { this.cleanup(); this.view = 'home'; this.render(); });
    this.render();
  }

  // ---------- 공통 ----------
  go(view) {
    this.cleanup();
    if (view !== 'home' && this.view === 'home') history.pushState({ v: view }, '');
    this.view = view;
    this.render();
    window.scrollTo(0, 0);
  }

  back() {
    if (history.state && history.state.v) history.back();
    else { this.cleanup(); this.view = 'home'; this.render(); }
  }

  cleanup() {
    Speech.stopSpeaking();
    if (this.listener) { this.listener.stop(); this.listener = null; }
    if (this.recorder) { this.recorder.stop(); this.recorder = null; }
  }

  sayThem(text) { return Speech.speak(text, { voiceName: Store.settings.voiceThem, prefer: ['en-sg', 'en-gb', 'en-au', 'en-in', 'en-us'], rate: Store.settings.rate }); }
  sayMe(text, slow) { return Speech.speak(text, { voiceName: Store.settings.voiceMe, prefer: ['en-us', 'en-gb'], rate: slow ? Math.max(0.5, Store.settings.rate - 0.3) : Store.settings.rate }); }

  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  findItem(id) {
    for (const s of SCENES) { const it = s.items.find(i => i.id === id); if (it) return it; }
    return null;
  }

  render() {
    const html = { home: () => this.homeHtml(), flash: () => this.flashHtml(), role: () => this.roleHtml(), settings: () => this.settingsHtml() }[this.view]();
    this.root.innerHTML = html;
    if (this.view === 'role') {
      const log = document.getElementById('chat');
      if (log) log.scrollTop = log.scrollHeight;
      const bottom = document.getElementById('roleBottom');
      if (bottom) bottom.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }
  }

  // ---------- 이벤트 ----------
  onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const { action, id, scene, arg } = el.dataset;
    const fn = this['act_' + action];
    if (fn) fn.call(this, { id, scene, arg, el });
  }

  onChange(e) {
    const el = e.target;
    const key = el.dataset.setting;
    if (!key) return;
    const s = Store.settings;
    if (el.type === 'checkbox') s[key] = el.checked;
    else if (el.type === 'range') { s[key] = parseFloat(el.value); const out = document.getElementById('rateOut'); if (out) out.textContent = s[key].toFixed(1) + '×'; }
    else s[key] = el.value;
    Store.save();
    if (e.type !== 'change' || this.view !== 'flash') return;
    if (key === 'shuffle') this.buildDeck(this.flash.sceneId, this.flash.onlyUnknown);
    if (key === 'shuffle' || key === 'front') this.render();
  }

  act_back() { this.back(); }
  act_settings() { this.go('settings'); }

  // ---------- 홈 ----------
  homeHtml() {
    const total = SCENES.reduce((n, s) => n + s.items.length, 0);
    const known = SCENES.reduce((n, s) => n + s.items.filter(i => Store.prog(i.id).known).length, 0);
    const pct = Math.round((known / total) * 100);
    const warn = [];
    if (!Speech.ttsSupported) warn.push('이 브라우저는 음성 듣기(TTS)를 지원하지 않아요.');
    if (!Speech.recognitionSupported && !Speech.isApp) warn.push('이 브라우저는 음성 인식 채점을 지원하지 않아요. 녹음·비교 기능으로 연습할 수 있어요. (Android Chrome, iOS Safari 최신 버전 권장)');
    return `
      <header class="top">
        <div>
          <h1>🇸🇬 싱가포르 출장 생존영어</h1>
          <p class="sub">입국심사부터 칠리크랩까지, 실전 회화 암기</p>
        </div>
        <button class="icon-btn" data-action="settings" aria-label="설정">⚙️</button>
      </header>
      ${warn.map(w => `<div class="notice">${esc(w)}</div>`).join('')}
      <section class="card overall">
        <div class="overall-row">
          <span>전체 암기</span><strong>${known} / ${total}</strong>
        </div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div class="row gap">
          <button class="btn" data-action="startFlash" data-scene="all">🃏 전체 섞어서</button>
          <button class="btn" data-action="startFlash" data-scene="all" data-arg="unknown" ${known === total ? 'disabled' : ''}>🔁 못 외운 것만</button>
        </div>
      </section>
      <section class="scenes">
        ${SCENES.map(s => {
          const k = s.items.filter(i => Store.prog(i.id).known).length;
          return `
          <article class="card scene">
            <div class="scene-head">
              <span class="scene-icon">${s.icon}</span>
              <div class="scene-title"><h2>${esc(s.title)}</h2><span>${esc(s.en)} · ${s.items.length}문장</span></div>
              <span class="count">${k}/${s.items.length}</span>
            </div>
            <div class="bar thin"><i style="width:${Math.round((k / s.items.length) * 100)}%"></i></div>
            <div class="row gap">
              <button class="btn" data-action="startFlash" data-scene="${s.id}">🃏 플래시카드</button>
              <button class="btn primary" data-action="startRole" data-scene="${s.id}">🎭 롤플레이</button>
            </div>
          </article>`;
        }).join('')}
      </section>
      <section class="card">
        <details>
          <summary>⚠️ 자주 틀리는 부분 체크리스트</summary>
          <ol class="checklist">
            ${CHECKLIST.map(c => `<li><strong>${esc(c.t)}</strong><br><span>${c.d}</span></li>`).join('')}
          </ol>
        </details>
      </section>
      <p class="foot">출처: 싱가포르 출장 생존영어 회화 스크립트 (JWC 님 연습 정리본)<br>한글 발음 표기·발음 팁은 참고용으로 앱에서 추가한 것입니다.</p>
    `;
  }

  // ---------- 플래시카드 ----------
  act_startFlash({ scene, arg }) {
    this.buildDeck(scene, arg === 'unknown');
    this.go('flash');
  }

  buildDeck(sceneId, onlyUnknown) {
    let items = sceneId === 'all' ? SCENES.flatMap(s => s.items) : SCENES.find(s => s.id === sceneId).items.slice();
    if (onlyUnknown) {
      const rest = items.filter(i => !Store.prog(i.id).known);
      if (rest.length) items = rest;
    }
    if (Store.settings.shuffle || sceneId === 'all') items = shuffle(items);
    this.flash = { sceneId, onlyUnknown, deck: items, index: 0, flipped: false, result: null, done: false, knownCount: 0 };
  }

  flashHtml() {
    const f = this.flash;
    const title = f.sceneId === 'all' ? '전체 카드' : SCENES.find(s => s.id === f.sceneId).title;
    const head = `
      <header class="bar-head">
        <button class="icon-btn" data-action="back" aria-label="뒤로">←</button>
        <h1>🃏 ${esc(title)}</h1>
        <span class="count">${Math.min(f.index + 1, f.deck.length)}/${f.deck.length}</span>
      </header>
      <div class="bar thin"><i style="width:${Math.round((f.index / f.deck.length) * 100)}%"></i></div>`;

    if (f.done) {
      return head + `
        <section class="card center done">
          <div class="big-emoji">🎉</div>
          <h2>한 바퀴 완료!</h2>
          <p>이번에 외운 카드 <strong>${f.knownCount}</strong> / ${f.deck.length}</p>
          <div class="col gap">
            <button class="btn primary" data-action="flashRestart" data-arg="unknown">🔁 못 외운 것만 다시</button>
            <button class="btn" data-action="flashRestart">처음부터 다시</button>
            <button class="btn ghost" data-action="back">홈으로</button>
          </div>
        </section>`;
    }

    const item = f.deck[f.index];
    const sc = sceneOf(item);
    const prog = Store.prog(item.id);
    const s = Store.settings;
    const koreanFront = s.front === 'korean';
    const roleLabel = item.q ? sc.role : '내가 먼저';

    let front;
    if (koreanFront) {
      front = `
        <div class="ctx">${sc.icon} ${esc(item.q ? item.qKo : item.cue)}</div>
        <p class="prompt-ko">${esc(item.aKo)}</p>
        <p class="ask">영어로 말해 보세요</p>`;
    } else if (item.q) {
      front = `
        <div class="ctx">${sc.icon} ${esc(roleLabel)}</div>
        <p class="prompt-en">${esc(item.q)}</p>
        <p class="prompt-sub">${esc(item.qKo)}</p>
        <button class="chip" data-action="playThem" data-id="${item.id}">🔊 상대 말 듣기</button>
        <p class="ask">내 답변은? <span class="hint">(${esc(item.aKo)})</span></p>`;
    } else {
      front = `
        <div class="ctx">${sc.icon} ${esc(roleLabel)} · ${esc(item.cue)}</div>
        <p class="prompt-ko">${esc(item.aKo)}</p>
        <p class="ask">영어로 말해 보세요</p>`;
    }

    const back = `
      <div class="answer">
        <p class="answer-en">${esc(item.a)}</p>
        <p class="pron">${pronHtml(item.pron)}</p>
        <p class="answer-ko">${esc(item.aKo)}</p>
        ${item.note ? `<p class="note">💡 ${esc(item.note)}</p>` : ''}
        ${this.scoreHtml(f.result)}
      </div>`;

    return head + `
      <section class="card flashcard ${f.flipped ? 'flipped' : ''}">
        ${prog.known ? '<span class="badge">✓ 외움</span>' : ''}
        ${front}
        ${f.flipped ? back : `<button class="reveal" data-action="flip">탭해서 정답 보기</button>`}
      </section>
      ${this.practiceHtml(item, f.flipped)}
      ${f.flipped ? `
        <div class="row gap judge">
          <button class="btn bad" data-action="judge" data-arg="0">✗ 다시 볼래요</button>
          <button class="btn good" data-action="judge" data-arg="1">✓ 외웠어요</button>
        </div>` : ''}
      <div class="row gap small-opts">
        <label class="switch"><input type="checkbox" data-setting="shuffle" ${s.shuffle ? 'checked' : ''}> 섞기</label>
        <label class="switch"><select data-setting="front">
          <option value="prompt" ${s.front === 'prompt' ? 'selected' : ''}>앞면: 상대 말</option>
          <option value="korean" ${s.front === 'korean' ? 'selected' : ''}>앞면: 한국어 뜻</option>
        </select></label>
      </div>`;
  }

  // 듣기 / 녹음 / 채점 버튼 묶음
  practiceHtml(item, revealed) {
    const rec = this.recordings[item.id];
    const recording = this.recorder && this.recorder.id === item.id;
    const listening = this.listener && this.listener.id === item.id;
    return `
      <section class="card practice">
        ${revealed ? `
        <div class="row gap">
          <button class="btn" data-action="playMe" data-id="${item.id}">🔊 원어민 듣기</button>
          <button class="btn" data-action="playMe" data-id="${item.id}" data-arg="slow">🐢 천천히</button>
        </div>` : ''}
        <div class="row gap">
          ${Speech.recognitionSupported ? `
          <button class="btn ${listening ? 'live' : 'primary'}" data-action="listen" data-id="${item.id}">
            ${listening ? '⏹ 듣는 중… (탭하면 종료)' : '🗣 말하고 채점'}
          </button>` : ''}
          ${Speech.recordSupported ? `
          <button class="btn ${recording ? 'live' : ''}" data-action="record" data-id="${item.id}">
            ${recording ? '⏹ 녹음 중지' : '🎙 녹음'}
          </button>` : ''}
        </div>
        <p class="interim" id="interim">${listening ? '말씀하세요…' : ''}</p>
        ${rec ? `
        <div class="row gap">
          <button class="btn" data-action="playRec" data-id="${item.id}">▶ 내 발음</button>
          <button class="btn" data-action="compare" data-id="${item.id}">🔁 내 발음 → 원어민</button>
        </div>` : ''}
      </section>`;
  }

  scoreHtml(result) {
    if (!result) return '';
    if (!result.heard) return `<div class="score none">인식된 말이 없어요. 다시 해 보세요.</div>`;
    return `
      <div class="score ${scoreClass(result.score)}">
        <div class="score-num">${result.score}<small>점</small></div>
        <div class="score-words">${result.words.map(w => `<span class="${w.ok ? 'hit' : 'miss'}">${esc(w.w)}</span>`).join(' ')}</div>
        <div class="heard">들린 말: “${esc(result.heard)}”</div>
      </div>`;
  }

  act_flip() { this.flash.flipped = true; this.render(); }

  act_judge({ arg }) {
    const f = this.flash;
    const item = f.deck[f.index];
    const known = arg === '1';
    Store.setProg(item.id, { known, seen: Store.prog(item.id).seen + 1 });
    if (known) f.knownCount++;
    this.cleanup();
    f.index++;
    f.flipped = false;
    f.result = null;
    if (f.index >= f.deck.length) f.done = true;
    this.render();
    window.scrollTo(0, 0);
  }

  act_flashRestart({ arg }) { this.buildDeck(this.flash.sceneId, arg === 'unknown'); this.render(); }

  act_playThem({ id }) { this.sayThem(this.findItem(id).q); }
  act_playMe({ id, arg }) { this.sayMe(this.findItem(id).a, arg === 'slow'); }

  act_playRec({ id }) {
    const url = this.recordings[id];
    if (!url) return;
    return new Promise(resolve => {
      const audio = new Audio(url);
      audio.onended = audio.onerror = resolve;
      audio.play().catch(resolve);
    });
  }

  async act_compare({ id }) {
    await this.act_playRec({ id });
    await new Promise(r => setTimeout(r, 400));
    await this.sayMe(this.findItem(id).a);
  }

  async act_record({ id }) {
    if (this.recorder && this.recorder.id === id) {
      const handle = this.recorder;
      this.recorder = null;
      const url = await handle.stop();
      if (this.recordings[id]) URL.revokeObjectURL(this.recordings[id]);
      this.recordings[id] = url;
      this.render();
      return;
    }
    this.cleanup();
    try {
      const handle = await Speech.startRecording();
      handle.id = id;
      this.recorder = handle;
      this.render();
    } catch (err) {
      this.toast('마이크를 사용할 수 없어요. 브라우저에서 마이크 권한을 허용해 주세요.');
    }
  }

  async act_listen({ id }) {
    if (this.listener && this.listener.id === id) { this.listener.stop(); return; }
    this.cleanup();
    const item = this.findItem(id);
    let handle;
    try {
      handle = Speech.listen({ onInterim: t => { const el = document.getElementById('interim'); if (el) el.textContent = t; } });
    } catch (err) {
      this.toast('음성 인식을 시작할 수 없어요.');
      return;
    }
    handle.id = id;
    this.listener = handle;
    this.render();
    let heard = [];
    try { heard = await handle.promise; } catch (err) {
      const messages = {
        'not-allowed': '마이크 권한이 거부됐어요. 브라우저 설정에서 마이크를 허용해 주세요.',
        'service-not-allowed': '이 환경에서는 음성 인식을 쓸 수 없어요. 녹음·비교로 연습해 주세요. (iPhone은 Safari 앱에서 열면 될 수 있어요)',
        'audio-capture': '마이크를 찾을 수 없어요.',
        'network': '음성 인식에 인터넷 연결이 필요해요. 연결 후 다시 해 보세요.',
        'language-not-supported': '이 기기에서 영어 음성 인식을 지원하지 않아요. 녹음·비교로 연습해 주세요.'
      };
      this.toast(messages[err] || '음성 인식 오류: ' + err);
      // 다시 시도해도 안 되는 오류면 이번 세션은 녹음 방식으로 전환
      if (['not-allowed', 'service-not-allowed', 'language-not-supported'].includes(err)) Speech.recognitionBroken = true;
    }
    if (this.listener !== handle) return; // 화면 이동 등으로 취소됨
    this.listener = null;
    // 음성 인식을 못 쓰게 됐으면 정답을 공개하지 않고 녹음 버튼이 있는 화면으로 되돌린다
    if (Speech.recognitionBroken) { this.render(); return; }
    const result = Speech.score(item.a, heard);
    if (!heard.length) result.heard = '';
    const best = Store.prog(id).best;
    if (heard.length && (best == null || result.score > best)) Store.setProg(id, { best: result.score });

    if (this.view === 'flash') {
      this.flash.result = result;
      this.flash.flipped = true;
    } else if (this.view === 'role') {
      this.roleAnswer(result);
      return;
    }
    this.render();
  }

  // ---------- 롤플레이 ----------
  act_startRole({ scene }) {
    this.role = { sceneId: scene, index: 0, phase: 'intro', log: [], scores: [], showHint: false };
    this.go('role');
  }

  roleHtml() {
    const r = this.role;
    const sc = SCENES.find(s => s.id === r.sceneId);
    const item = sc.items[r.index];
    const s = Store.settings;
    const head = `
      <header class="bar-head">
        <button class="icon-btn" data-action="back" aria-label="뒤로">←</button>
        <h1>🎭 ${esc(sc.title)}</h1>
        <span class="count">${Math.min(r.index + 1, sc.items.length)}/${sc.items.length}</span>
      </header>
      <div class="bar thin"><i style="width:${Math.round((r.index / sc.items.length) * 100)}%"></i></div>`;

    if (r.phase === 'intro') {
      return head + `
        <section class="card center">
          <div class="big-emoji">${sc.icon}</div>
          <h2>${esc(sc.title)} 실전 연습</h2>
          <p>${esc(sc.role)}의 말을 <strong>귀로 듣고</strong> 영어로 대답하세요.<br>
          ${Speech.recognitionSupported ? '🗣 버튼을 누르고 말하면 채점해 드려요.' : '🎙 녹음한 뒤 정답과 비교해 보세요.'}</p>
          <label class="switch"><input type="checkbox" data-setting="subtitles" ${s.subtitles ? 'checked' : ''}> 상대 말 자막 보기</label>
          <button class="btn primary wide" data-action="roleStart">▶ 시작하기</button>
          <p class="tip">💡 ${esc(sc.tip)}</p>
        </section>`;
    }

    if (r.phase === 'end') {
      const avg = r.scores.length ? Math.round(r.scores.reduce((a, b) => a + b.score, 0) / r.scores.length) : null;
      const weak = r.scores.filter(x => x.score < 85);
      return head + `
        <section class="card center done">
          <div class="big-emoji">🏁</div>
          <h2>${esc(sc.title)} 완료!</h2>
          ${avg != null ? `<p class="avg ${scoreClass(avg)}">평균 ${avg}점</p>` : ''}
          ${weak.length ? `
            <div class="weak">
              <p><strong>다시 연습할 문장</strong></p>
              ${weak.map(w => { const it = this.findItem(w.id); return `
                <button class="weak-item" data-action="playMe" data-id="${it.id}">
                  <span>🔊 ${esc(it.a)}</span><em class="${scoreClass(w.score)}">${w.score}</em>
                </button>`; }).join('')}
            </div>` : ''}
          <div class="col gap">
            <button class="btn primary" data-action="startRole" data-scene="${sc.id}">🔁 다시 하기</button>
            <button class="btn" data-action="startFlash" data-scene="${sc.id}">🃏 플래시카드로 복습</button>
            <button class="btn ghost" data-action="back">홈으로</button>
          </div>
        </section>`;
    }

    const listening = !!this.listener;
    const recording = !!this.recorder;
    const rec = this.recordings[item.id];
    let bottom;
    if (r.phase === 'answer') {
      bottom = `
        ${r.showHint ? `<p class="hint-box">💡 ${esc(item.aKo)}</p>` : ''}
        <p class="interim" id="interim">${listening ? '말씀하세요…' : ''}</p>
        <div class="row gap">
          ${Speech.recognitionSupported ? `
            <button class="btn big ${listening ? 'live' : 'primary'}" data-action="listen" data-id="${item.id}">${listening ? '⏹ 듣는 중…' : '🗣 말하기'}</button>`
          : Speech.recordSupported ? `
            <button class="btn big ${recording ? 'live' : 'primary'}" data-action="roleRecord" data-id="${item.id}">${recording ? '⏹ 녹음 끝내기' : '🎙 녹음하며 말하기'}</button>` : ''}
        </div>
        <div class="row gap">
          ${item.q ? `<button class="btn" data-action="roleReplay">🔊 다시 듣기</button>` : ''}
          ${r.showHint ? '' : `<button class="btn" data-action="roleHint">💡 힌트</button>`}
          <button class="btn ghost" data-action="roleReveal">정답 보기</button>
        </div>`;
    } else {
      bottom = `
        <div class="row gap">
          <button class="btn" data-action="playMe" data-id="${item.id}">🔊 원어민</button>
          <button class="btn" data-action="playMe" data-id="${item.id}" data-arg="slow">🐢 천천히</button>
          ${rec ? `<button class="btn" data-action="compare" data-id="${item.id}">🔁 내 발음 비교</button>` : ''}
        </div>
        <div class="row gap">
          ${Speech.recognitionSupported ? `<button class="btn" data-action="roleRetry">↩︎ 다시 말하기</button>` : ''}
          <button class="btn primary" data-action="roleNext">다음 ▶</button>
        </div>`;
    }

    return head + `
      <section class="chat" id="chat">
        ${r.log.map(m => this.bubbleHtml(m)).join('')}
      </section>
      <section class="card role-bottom" id="roleBottom">${bottom}</section>`;
  }

  bubbleHtml(m) {
    const s = Store.settings;
    if (m.type === 'them') {
      const it = this.findItem(m.id);
      const show = s.subtitles || m.revealed;
      return `
        <div class="bubble them">
          <span class="who">${esc(sceneOf(it).role)}</span>
          ${show
            ? `<p>${esc(it.q)}</p><p class="ko">${esc(it.qKo)}</p>`
            : `<button class="sub-toggle" data-action="showSub" data-id="${it.id}">🔊 (자막 숨김 · 탭하면 보기)</button>`}
          <button class="replay" data-action="playThem" data-id="${it.id}" aria-label="다시 듣기">🔊</button>
        </div>`;
    }
    if (m.type === 'cue') {
      const it = this.findItem(m.id);
      return `<div class="bubble cue">📍 ${esc(it.cue)} <span>— ${esc(it.aKo)}</span></div>`;
    }
    // 내 답변
    const it = this.findItem(m.id);
    const res = m.result;
    return `
      <div class="bubble me">
        <p class="answer-en">${esc(it.a)}</p>
        <p class="pron">${pronHtml(it.pron)}</p>
        <p class="ko">${esc(it.aKo)}</p>
        ${it.note ? `<p class="note">💡 ${esc(it.note)}</p>` : ''}
        ${res ? this.scoreHtml(res) : '<div class="score none">정답 확인</div>'}
      </div>`;
  }

  async act_roleStart() { this.roleStep(); }

  roleStep() {
    const r = this.role;
    const sc = SCENES.find(s => s.id === r.sceneId);
    const item = sc.items[r.index];
    r.phase = 'answer';
    r.showHint = false;
    r.log.push(item.q ? { type: 'them', id: item.id } : { type: 'cue', id: item.id });
    this.render();
    if (item.q) this.sayThem(item.q);
  }

  roleAnswer(result) {
    const r = this.role;
    const item = SCENES.find(s => s.id === r.sceneId).items[r.index];
    const last = r.log[r.log.length - 1];
    if (last.type === 'me') last.result = result; else r.log.push({ type: 'me', id: item.id, result });
    r.phase = 'result';
    if (result && result.heard) {
      r.scores = r.scores.filter(x => x.id !== item.id).concat({ id: item.id, score: result.score });
      if (result.score >= 85) Store.setProg(item.id, { known: true });
    }
    this.render();
  }

  act_roleReplay() {
    const r = this.role;
    const item = SCENES.find(s => s.id === r.sceneId).items[r.index];
    if (item.q) this.sayThem(item.q);
  }

  act_showSub({ id }) {
    const m = this.role.log.find(x => x.type === 'them' && x.id === id);
    if (m) m.revealed = true;
    this.render();
    this.sayThem(this.findItem(id).q);
  }

  act_roleHint() { this.role.showHint = true; this.render(); }

  act_roleReveal() {
    this.cleanup();
    this.roleAnswer(null);
    const item = SCENES.find(s => s.id === this.role.sceneId).items[this.role.index];
    this.role.scores = this.role.scores.filter(x => x.id !== item.id).concat({ id: item.id, score: 0 });
  }

  // 음성 인식이 없는 브라우저: 녹음 후 정답 공개 → 내 발음 비교
  async act_roleRecord({ id }) {
    const wasRecording = this.recorder && this.recorder.id === id;
    await this.act_record({ id });
    if (wasRecording) this.roleAnswer(null);
  }

  act_roleRetry() {
    const r = this.role;
    r.phase = 'answer';
    this.render();
  }

  act_roleNext() {
    const r = this.role;
    const sc = SCENES.find(s => s.id === r.sceneId);
    this.cleanup();
    r.index++;
    if (r.index >= sc.items.length) { r.phase = 'end'; this.render(); window.scrollTo(0, 0); return; }
    this.roleStep();
  }

  // ---------- 설정 ----------
  settingsHtml() {
    const s = Store.settings;
    const voices = Speech.loadVoices();
    const themV = Speech.pickVoice(s.voiceThem, ['en-sg', 'en-gb', 'en-au', 'en-in', 'en-us']);
    const meV = Speech.pickVoice(s.voiceMe, ['en-us', 'en-gb']);
    const opts = sel => voices.map(v => `<option value="${esc(v.name)}" ${sel && sel.name === v.name ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)}${v.offline === false ? ' · 인터넷 필요' : ''})</option>`).join('');
    return `
      <header class="bar-head">
        <button class="icon-btn" data-action="back" aria-label="뒤로">←</button>
        <h1>⚙️ 설정</h1><span></span>
      </header>
      <section class="card form">
        <label>말하기 속도 <output id="rateOut">${s.rate.toFixed(1)}×</output>
          <input type="range" min="0.5" max="1.3" step="0.1" value="${s.rate}" data-setting="rate">
        </label>
        ${voices.length ? `
        <label>상대(심사관·기사·직원) 음성
          <select data-setting="voiceThem">${opts(themV)}</select>
        </label>
        <button class="btn" data-action="testVoice" data-arg="them">🔊 상대 음성 테스트</button>
        <label>내 대사(정답) 음성
          <select data-setting="voiceMe">${opts(meV)}</select>
        </label>
        <button class="btn" data-action="testVoice" data-arg="me">🔊 정답 음성 테스트</button>
        <p class="small">싱가포르 영어(en-SG)나 영국식(en-GB) 음성이 있으면 상대 음성으로 먼저 골라 둡니다. 음성 목록은 기기마다 다릅니다.</p>
        ` : Speech.isApp && Speech.bridge.hasEnglish() ? `<p class="small">폰의 기본 영어 음성으로 재생합니다. (음성 목록을 제공하지 않는 TTS 엔진)</p>
          <button class="btn" data-action="testVoice" data-arg="me">🔊 음성 테스트</button>` : `<p class="notice">${Speech.ttsSupported ? '영어 음성을 불러오는 중이거나, 기기에 영어 음성이 없어요. 폰 설정 → 텍스트 음성 변환(TTS)에서 영어 음성 데이터를 설치해 주세요.' : '이 브라우저는 음성 듣기를 지원하지 않아요.'}</p>`}
        <label class="switch"><input type="checkbox" data-setting="subtitles" ${s.subtitles ? 'checked' : ''}> 롤플레이에서 상대 말 자막 보기</label>
      </section>
      <section class="card form">
        <p><strong>학습 기록</strong></p>
        <button class="btn bad" data-action="resetProgress">기록 초기화</button>
      </section>
      <section class="card form small">
        <p><strong>지원 현황 (${Speech.isApp ? '안드로이드 앱' : '이 브라우저'})</strong></p>
        <p>원어민 음성(TTS): ${Speech.ttsSupported ? '✅' : '❌'}<br>
        녹음: ${Speech.recordSupported ? '✅' : '❌'}<br>
        음성 인식 채점: ${Speech.isApp ? '➖ 앱 버전에는 없음' : Speech.recognitionSupported ? '✅' : '❌'}</p>
        ${Speech.isApp
          ? '<p>앱은 인터넷 없이 동작합니다. 원어민 음성은 폰의 TTS 엔진을 쓰므로, "인터넷 필요"로 표시되지 않은 음성을 고르면 오프라인에서도 들을 수 있어요.</p>'
          : '<p>음성 인식은 브라우저가 제공하는 기능이라 Chrome에서는 인터넷 연결이 필요할 수 있어요. 녹음과 음성 인식은 HTTPS 주소에서만 동작합니다.</p>'}
      </section>`;
  }

  act_testVoice({ arg }) {
    if (arg === 'them') this.sayThem("What's the purpose of your visit?");
    else this.sayMe("I'm here for a business conference.");
  }

  act_resetProgress() {
    if (confirm('외움 표시와 점수 기록을 모두 지울까요?')) { Store.reset(); this.toast('기록을 초기화했어요.'); }
  }
}

const app = new App();

// 앱(APK)은 파일이 앱 안에 들어 있으므로 서비스 워커가 필요 없다
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !Speech.isApp) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
