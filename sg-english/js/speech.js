// 음성 기능: TTS(원어민 음성), 녹음, 음성 인식, 발음 채점

const Speech = {
  voices: [],

  // ---------- TTS ----------
  get ttsSupported() { return 'speechSynthesis' in window; },

  loadVoices() {
    if (!this.ttsSupported) return [];
    this.voices = speechSynthesis.getVoices().filter(v => /^en[-_]/i.test(v.lang));
    return this.voices;
  },

  // 저장된 이름 → 없으면 선호 언어 순서로 기본 음성 선택
  pickVoice(name, prefer) {
    if (!this.voices.length) this.loadVoices();
    const byName = this.voices.find(v => v.name === name);
    if (byName) return byName;
    for (const lang of prefer) {
      const v = this.voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(lang));
      if (v) return v;
    }
    return this.voices[0] || null;
  },

  speak(text, { voiceName, prefer = ['en-us'], rate = 1 } = {}) {
    return new Promise(resolve => {
      if (!this.ttsSupported) return resolve();
      speechSynthesis.cancel();
      // "A / B" 형태의 답변은 둘 다 읽어 줌
      const u = new SpeechSynthesisUtterance(text.replace(/\s*\/\s*/g, '. '));
      const voice = this.pickVoice(voiceName, prefer);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = 'en-US'; }
      u.rate = rate;
      u.onend = u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  },

  stopSpeaking() { if (this.ttsSupported) speechSynthesis.cancel(); },

  // ---------- 녹음 ----------
  get recordSupported() { return !!(navigator.mediaDevices && window.MediaRecorder); },

  async startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'];
    const mimeType = types.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise(resolve => {
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        resolve(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' })));
      };
    });
    rec.start();
    return { stop: () => { if (rec.state !== 'inactive') rec.stop(); return done; } };
  },

  // ---------- 음성 인식 ----------
  get RecognitionCtor() { return window.SpeechRecognition || window.webkitSpeechRecognition || null; },
  get recognitionSupported() { return !!this.RecognitionCtor; },

  // 한 번 듣고 결과 후보 목록을 반환. handle.stop()으로 조기 종료 가능
  listen({ onInterim } = {}) {
    const rec = new this.RecognitionCtor();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 5;
    let finals = [];
    let interim = '';
    const promise = new Promise((resolve, reject) => {
      rec.onresult = e => {
        interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) {
            finals = Array.from(r).map(alt => alt.transcript);
          } else {
            interim += r[0].transcript;
          }
        }
        if (onInterim) onInterim(finals[0] || interim);
      };
      rec.onerror = e => {
        if (e.error === 'no-speech' || e.error === 'aborted') resolve([]);
        else reject(e.error);
      };
      rec.onend = () => resolve(finals.length ? finals : (interim ? [interim] : []));
    });
    rec.start();
    return { promise, stop: () => rec.stop() };
  },

  // ---------- 채점 ----------
  // 텍스트를 비교용 단어 배열로 정규화
  normalize(text) {
    let s = ' ' + text.toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/\bwi-?\s?fi\b/g, 'wifi')
      .replace(/\bair\s?con\b/g, 'aircon')
      .replace(/\bcheck-?\s?out\b/g, 'check out')
      .replace(/\bp\.?\s?m\.?/g, 'pm')
      .replace(/\ba\.?\s?m\.?(?=\s|$)/g, 'am')
      .replace(/\bokay\b|\bok\b/g, 'okay')
      .replace(/(\d),(\d)/g, '$1$2')
      .replace(/\$(\d+)/g, '$1 dollars')
      .replace(/\$/g, '')
      .replace(/-/g, ' ') + ' ';
    const contractions = {
      "i'm": 'i am', "it's": 'it is', "that's": 'that is', "don't": 'do not', "isn't": 'is not',
      "we'll": 'we will', "i'll": 'i will', "i'd": 'i would', "here's": 'here is', "what's": 'what is',
      "there's": 'there is', "everything's": 'everything is', "how's": 'how is', "you're": 'you are',
      "we're": 'we are', "can't": 'can not', 'cannot': 'can not'
    };
    s = s.replace(/[a-z]+'[a-z]+|cannot/g, w => contractions[w] || w.replace("'", ''));
    s = s.replace(/\d+(st|nd|rd|th)?/g, m => this.numberToWords(m));
    return s.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  },

  numberToWords(m) {
    const ordinal = /(st|nd|rd|th)$/.test(m);
    const n = parseInt(m, 10);
    const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const words = x => {
      if (x < 20) return ones[x];
      if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '');
      if (x < 1000) return ones[Math.floor(x / 100)] + ' hundred' + (x % 100 ? ' ' + words(x % 100) : '');
      if (x < 1000000) return words(Math.floor(x / 1000)) + ' thousand' + (x % 1000 ? ' ' + words(x % 1000) : '');
      return String(x);
    };
    let w = words(n);
    if (ordinal) {
      const map = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
      w = w.replace(/(\w+)$/, last => map[last] || (last.endsWith('y') ? last.slice(0, -1) + 'ieth' : last + 'th'));
    }
    return w;
  },

  // 목표 문장 대비 인식 결과 채점 (LCS 기반 단어 일치율)
  // 반환: { score: 0~100, words: [{w, ok}] } — words는 목표 문장의 원래 단어와 일치 여부
  score(target, heardList) {
    const variants = target.split(/\s*\/\s*/);
    let best = null;
    for (const variant of variants) {
      const displayWords = variant.split(/\s+/);
      for (const heard of heardList.length ? heardList : ['']) {
        const res = this._scoreOne(displayWords, this.normalize(heard));
        if (!best || res.score > best.score) best = { ...res, heard };
      }
    }
    return best;
  },

  _scoreOne(displayWords, heardNorm) {
    // 표시용 단어마다 정규화된 토큰 묶음을 만든다 (I'm → i, am)
    const groups = displayWords.map(w => ({ w, toks: this.normalize(w) }));
    const target = [];
    groups.forEach((g, gi) => g.toks.forEach(t => target.push({ t, gi })));
    const A = target.map(x => x.t), B = heardNorm;
    const dp = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
    for (let i = A.length - 1; i >= 0; i--) {
      for (let j = B.length - 1; j >= 0; j--) {
        dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const matched = new Set();
    let i = 0, j = 0;
    while (i < A.length && j < B.length) {
      if (A[i] === B[j]) { matched.add(i); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else j++;
    }
    const words = groups.map((g, gi) => {
      const idx = target.map((x, k) => (x.gi === gi ? k : -1)).filter(k => k >= 0);
      return { w: g.w, ok: idx.length === 0 || idx.every(k => matched.has(k)) };
    });
    // 인식 결과에 불필요한 단어가 많으면 약간 감점
    const extra = Math.max(0, B.length - matched.size - 2);
    const raw = A.length ? matched.size / A.length : 0;
    const score = Math.max(0, Math.round((raw - extra * 0.05) * 100));
    return { score, words };
  }
};
