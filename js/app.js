/* =====================================================================
 *  Mừng Sinh Nhật Maria Nguyễn Thư · 15/10 — mã JavaScript của trang
 *  Script thường (không phải module) để mở trực tiếp index.html từ máy
 *  (file://) vẫn chạy được; Firebase SDK nạp bằng import() động.
 * ===================================================================== */
(function () {
  "use strict";

  /* ======================= AOS: XUẤT HIỆN KHI CUỘN ======================= */
  if (window.AOS) {
    window.AOS.init({
      once: true,
      duration: 900,
      easing: "ease-out-cubic",
      offset: 60,
      disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
    });
    window.addEventListener("load", () => window.AOS.refresh());
  } else {
    // Thư viện không tải được: gỡ data-aos để nội dung không bị ẩn
    document.querySelectorAll("[data-aos]").forEach((el) => el.removeAttribute("data-aos"));
  }

  /* =====================================================================
   *  CẤU HÌNH — DÁN KHÓA CỦA BẠN VÀO ĐÂY
   * ---------------------------------------------------------------------
   *  LƯU Ý BẢO MẬT: trang tĩnh trên GitHub Pages để lộ mọi khóa trong mã nguồn.
   *  - Gemini: vào Google Cloud Console > Credentials, giới hạn khóa theo
   *    HTTP referrer (vd: https://<tên-bạn>.github.io/*) và chỉ cho phép
   *    "Generative Language API".
   *  - Firebase: apiKey không phải bí mật, nhưng PHẢI đặt Rules cho Cloud
   *    Firestore và bật đăng nhập ẩn danh (mẫu ở cuối file).
   * ===================================================================== */
  const firebaseConfig = {
    apiKey: "AIzaSyDTPAiLaWHEDiI3NyX7-j1NQsnX1wokC9s",
    authDomain: "happy-birthday-2eb95.firebaseapp.com",
    databaseURL: "https://happy-birthday-2eb95-default-rtdb.firebaseio.com",
    projectId: "happy-birthday-2eb95",
    storageBucket: "happy-birthday-2eb95.firebasestorage.app",
    messagingSenderId: "823014213853",
    appId: "1:823014213853:web:3f2cfa183c590c24473334",
    measurementId: "G-CKHZT8QQS3"
  };

  const GEMINI_API_KEY = "AIzaSyByg8al1krAz5eVxxsgrtg3HNndpqkvvro";
  // Model chính, rồi model dự phòng khi model chính quá tải / ngừng hỗ trợ
  const GEMINI_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];

  // Nhạc nền: để trống = trang tự tấu bản Happy Birthday kiểu hộp nhạc + đoạn thánh ca êm (Web Audio, không cần tệp).
  // Muốn dùng tệp riêng: đặt vd "music.mp3" cạnh index.html rồi ghi MUSIC_URL = "music.mp3" (chỉ dùng nhạc bạn có quyền sử dụng).
  const MUSIC_URL = "";

  const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/10.12.2";
  const MAX_WISHES = 200;
  const WISH_COOLDOWN_MS = 20000;

  /* ============================ TIỆN ÍCH ============================ */
  const $ = (id) => document.getElementById(id);
  const isPlaceholder = (v) => !v || /YOUR_/.test(String(v));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const escapeHtml = (s) => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const show = (el, display = "block") => { el.classList.remove("hidden"); el.style.display = display; };
  const hide = (el) => { el.classList.add("hidden"); el.style.display = ""; };

  const bindCounter = (inputId, counterId) => {
    const input = $(inputId), counter = $(counterId);
    input.addEventListener("input", () => { counter.textContent = input.value.length; });
  };
  bindCounter("ai-input", "ai-count");
  bindCounter("wish-message", "wish-count");

  const safeStorage = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* bỏ qua */ } }
  };

  /* ============== HẠT RƠI: CÁNH HOA HỒNG · NGÔI SAO · ĐỐM SÁNG ============== */
  (function spawnSky() {
    if (reducedMotion) return;
    const sky = $("sky");
    const count = window.innerWidth < 640 ? 9 : 16; // mật độ thưa
    const kinds = ["petal", "petal", "star", "glow"];
    for (let i = 0; i < count; i++) {
      const kind = kinds[i % kinds.length];
      const outer = document.createElement("div");
      const inner = document.createElement("span");
      outer.className = "fall";
      inner.className = kind;
      if (kind === "star") inner.textContent = "✦";

      const size = kind === "petal" ? 9 + Math.random() * 7 : kind === "star" ? 8 + Math.random() * 6 : 5 + Math.random() * 6;
      outer.style.left = Math.random() * 96 + "%";
      outer.style.animationDuration = 20 + Math.random() * 16 + "s";
      outer.style.animationDelay = -Math.random() * 36 + "s";
      outer.style.setProperty("--drift", (Math.random() * 120 - 60) + "px");
      outer.style.setProperty("--o", kind === "glow" ? ".7" : ".55");
      if (kind === "star") {
        inner.style.fontSize = size + "px";
      } else {
        inner.style.width = size + "px";
        inner.style.height = (kind === "petal" ? size * .78 : size) + "px";
      }
      inner.style.animationDuration = 3 + Math.random() * 3 + "s";

      outer.appendChild(inner);
      sky.appendChild(outer);
    }
  })();

  /* ================== PHÁO HOA GIẤY (canvas-confetti) ================== */
  const CONFETTI_COLORS = ["#70d6ff", "#e0f7fa", "#ffffff", "#ecd27f", "#d4a537", "#f9c9d5"];

  /** Bắn pháo hoa giấy nhẹ từ vị trí phần tử; big = lượt mừng lớn hơn. */
  function celebrate(el, big = false) {
    if (typeof window.confetti !== "function") return;
    const r = el?.getBoundingClientRect();
    const origin = r
      ? { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
      : { x: .5, y: .6 };
    const base = { origin, disableForReducedMotion: true, zIndex: 60, ticks: 220, gravity: .75, decay: .92 };
    window.confetti({ ...base, particleCount: big ? 90 : 45, spread: big ? 95 : 70, startVelocity: big ? 36 : 26, scalar: .85, colors: CONFETTI_COLORS, shapes: ["circle", "square"] });
    window.confetti({ ...base, particleCount: big ? 28 : 16, spread: 120, startVelocity: big ? 28 : 20, scalar: 1.25, colors: ["#ecd27f", "#fff7d6", "#70d6ff"], shapes: ["star"] });
  }

  /* ======================= NHẠC NỀN ======================= */
  const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const hz = (n) => {
    const m = /^([A-G])(#?)(\d)$/.exec(n);
    const midi = 12 * (Number(m[3]) + 1) + NOTE_INDEX[m[1]] + (m[2] ? 1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  };

  const BEAT = 0.64; // giây mỗi phách — nhịp chậm, du dương
  // Happy Birthday (giai điệu dân gian) — [nốt, số phách]
  const HB_MELODY = [
    ["G4", .75], ["G4", .25], ["A4", 1], ["G4", 1], ["C5", 1], ["B4", 2],
    ["G4", .75], ["G4", .25], ["A4", 1], ["G4", 1], ["D5", 1], ["C5", 2],
    ["G4", .75], ["G4", .25], ["G5", 1], ["E5", 1], ["C5", 1], ["B4", 1], ["A4", 1.5],
    ["F5", .75], ["F5", .25], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 3]
  ];
  const CH = {
    C: ["C3", "G3", "E4"], G: ["G2", "D3", "B3"], F: ["F2", "C3", "A3"],
    Am: ["A2", "E3", "C4"], Dm: ["D3", "A3", "F4"]
  };
  // [phách bắt đầu, độ dài, hợp âm] cho phần Happy Birthday
  const HB_CHORDS = [[1, 3, "C"], [4, 3, "G"], [7, 3, "G"], [10, 3, "C"], [13, 3, "C"], [16, 3.5, "F"], [19.5, 2, "C"], [21.5, 1, "G"], [22.5, 3.5, "C"]];
  // Đoạn thánh ca êm sau lời chúc: [hợp âm, nốt giai điệu]
  const ARP = {
    C: ["C4", "E4", "G4", "C5"], Am: ["A3", "C4", "E4", "A4"], F: ["F3", "A3", "C4", "F4"],
    G: ["G3", "B3", "D4", "G4"], Dm: ["D4", "F4", "A4", "D5"]
  };
  const HYMN = [["C", "E5"], ["Am", "C5"], ["F", "A4"], ["G", "B4"], ["C", "C5"], ["Am", "E5"], ["Dm", "F5"], ["G", "D5"]];
  const HYMN_START = 27;
  const LOOP_BEATS = HYMN_START + HYMN.length * 3 + 6 + 3;

  const music = { ctx: null, bus: null, master: null, nextLoop: 0, timer: null, suspendTimer: null, audio: null, playing: false };

  /** Tạo tiếng vang (reverb) nhân tạo cho không gian nhà nguyện. */
  function makeImpulse(ctx, seconds = 3, decay = 3.2) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  /** Nốt hộp nhạc: vài sóng sine hoà âm, tắt dần mềm. */
  function pluck(freq, t, dur, vel) {
    const { ctx, bus } = music;
    const env = ctx.createGain();
    const end = t + Math.max(1.4, dur * 1.8);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(vel, t + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    env.connect(bus);
    [[1, 1], [2, .32], [3.01, .1]].forEach(([mul, amp]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq * mul;
      g.gain.value = amp;
      osc.connect(g).connect(env);
      osc.start(t);
      osc.stop(end + 0.05);
    });
  }

  /** Lớp đệm hợp âm mềm như dàn dây xa. */
  function pad(freqs, t, dur, vel) {
    const { ctx, bus } = music;
    const env = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    const end = t + dur + 1.2;
    lp.type = "lowpass";
    lp.frequency.value = 850;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(vel, t + 0.8);
    env.gain.setValueAtTime(vel, t + dur);
    env.gain.linearRampToValueAtTime(0.0001, end);
    lp.connect(env).connect(bus);
    freqs.forEach((f) => [-7, 7].forEach((detune) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = f;
      osc.detune.value = detune;
      osc.connect(lp);
      osc.start(t);
      osc.stop(end + 0.05);
    }));
  }

  /** Lên lịch trọn một vòng nhạc từ thời điểm t0, trả về thời điểm kết thúc. */
  function scheduleLoop(t0) {
    let beat = 0;
    HB_MELODY.forEach(([n, d]) => { pluck(hz(n), t0 + beat * BEAT, d * BEAT, .3); beat += d; });
    HB_CHORDS.forEach(([s, l, c]) => pad(CH[c].map(hz), t0 + s * BEAT, l * BEAT, .045));

    HYMN.forEach(([c, top], i) => {
      const start = t0 + (HYMN_START + i * 3) * BEAT;
      const tones = ARP[c];
      [0, 1, 2, 3, 2, 1].forEach((idx, k) => pluck(hz(tones[idx]), start + k * BEAT / 2, BEAT / 2, .1));
      pluck(hz(top), start, 3 * BEAT, .22);
      pad(CH[c].map(hz), start, 3 * BEAT, .04);
    });
    const coda = t0 + (HYMN_START + HYMN.length * 3) * BEAT;
    ["C4", "E4", "G4", "C5"].forEach((n, k) => pluck(hz(n), coda + k * BEAT / 2, 4 * BEAT, .14));
    pluck(hz("E5"), coda + 2 * BEAT, 4 * BEAT, .18);
    pad(CH.C.map(hz), coda, 6 * BEAT, .045);

    return t0 + LOOP_BEATS * BEAT;
  }

  function tickScheduler() {
    const { ctx } = music;
    if (!ctx || ctx.state !== "running") return;
    while (ctx.currentTime > music.nextLoop - 3) music.nextLoop = scheduleLoop(music.nextLoop);
  }

  function setupSynth() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error("Trình duyệt không hỗ trợ Web Audio");
    const ctx = new AC();
    const master = ctx.createGain();
    const bus = ctx.createGain();
    const reverb = ctx.createConvolver();
    const wet = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();

    master.gain.value = 0.0001;
    reverb.buffer = makeImpulse(ctx);
    wet.gain.value = .38;
    bus.connect(master);
    bus.connect(reverb).connect(wet).connect(master);
    master.connect(comp).connect(ctx.destination);

    Object.assign(music, { ctx, bus, master, nextLoop: ctx.currentTime + 0.3 });
    music.timer = setInterval(tickScheduler, 500);
  }

  const musicBtn = $("music-toggle");
  const musicHint = $("music-hint");

  function renderMusicState() {
    musicBtn.classList.toggle("playing", music.playing);
    musicBtn.setAttribute("aria-pressed", String(music.playing));
    musicBtn.setAttribute("aria-label", music.playing ? "Tắt nhạc nền" : "Bật nhạc nền");
    if (music.playing) musicHint.classList.add("is-hidden");
  }

  async function playMusic() {
    clearTimeout(music.suspendTimer);
    if (MUSIC_URL) {
      if (!music.audio) { music.audio = new Audio(MUSIC_URL); music.audio.loop = true; music.audio.volume = .55; }
      await music.audio.play();
    } else {
      if (!music.ctx) setupSynth();
      await music.ctx.resume();
      const { master, ctx } = music;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(.8, ctx.currentTime + 1.2);
      tickScheduler();
    }
    music.playing = true;
    renderMusicState();
  }

  function pauseMusic() {
    music.playing = false;
    renderMusicState();
    if (MUSIC_URL) { music.audio?.pause(); return; }
    const { master, ctx } = music;
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + .45);
    music.suspendTimer = setTimeout(() => { if (!music.playing) ctx.suspend(); }, 500);
  }

  async function toggleMusic() {
    try {
      if (music.playing) pauseMusic(); else await playMusic();
    } catch (err) {
      music.playing = false;
      renderMusicState();
      musicHint.classList.remove("is-hidden");
      $("music-hint-play").lastElementChild.textContent = "Chưa phát được nhạc, chạm để thử lại";
      console.warn("Nhạc nền:", err);
    }
  }

  musicBtn.addEventListener("click", toggleMusic);
  $("music-hint-play").addEventListener("click", toggleMusic);
  $("music-hint-close").addEventListener("click", () => musicHint.classList.add("is-hidden"));

  // Lời nhắc tự thu lại khi cuộn qua phần đầu trang để không che chữ (nút nhạc vẫn còn)
  const onScrollHint = () => {
    if (window.scrollY > window.innerHeight * 0.6) {
      musicHint.classList.add("is-hidden");
      window.removeEventListener("scroll", onScrollHint);
    }
  };
  window.addEventListener("scroll", onScrollHint, { passive: true });

  /* ================== SECTION 1 · GOOGLE GEMINI AI ================== */
  const SYSTEM_PROMPT = `Trở thành một trợ lý thiêng liêng Công giáo. Khi người dùng bấm xin lời khuyên/suy niệm, hãy đưa ra 01 câu Kinh Thánh về Thập Giá / Lòng Mến / Sự Phó Thác, kèm đoạn suy niệm ngắn gọn (dưới 80 từ) giúp em Maria Nguyễn Thư đào sâu Linh đạo Mến Thánh Giá (chiêm ngắm Đức Kitô Chịu Đóng Đinh qua Mẹ Maria), với văn phong ôn tồn, khiêm nhường và đong đầy tình anh em thiêng liêng Phan Sinh.

Lưu ý thêm:
- Trả lời bằng tiếng Việt, gọi người dùng là "em".
- Trích câu Kinh Thánh theo bản dịch Việt ngữ Công giáo, ghi rõ sách, chương, câu; chỉ dùng câu chắc chắn có thật, không bịa trích dẫn.
- Không dạy dỗ, không áp đặt, không phán xét; chỉ lắng nghe và đồng hành.
- Nếu tâm tư cho thấy đau khổ nặng nề hoặc nguy hiểm, nhẹ nhàng khuyến khích em chia sẻ ngay với Dì giáo, cha linh hướng hoặc người lớn em tin cậy.

Trình bày đúng 2 đoạn, không thêm tiêu đề nào khác:
✝️ **Lời Chúa:** "<câu Kinh Thánh>" (<Sách chương, câu>)
🕊️ **Suy niệm:** <đoạn suy niệm dưới 80 từ>`;

  const VOCATION_PROMPT = "Em là một đệ tử Dòng Mến Thánh Giá Bùi Chu, đang bước những bước đầu trên hành trình dâng hiến. Hôm nay, ngày 15/10, là sinh nhật em, giữa Tháng Mân Côi. Xin cho em một Lời Chúa và lời suy niệm giúp em thêm yêu mến Đức Giê-su Ki-tô Chịu Đóng Đinh và phó thác nơi Mẹ Maria.";

  const aiEls = {
    input: $("ai-input"), result: $("ai-result"), loading: $("ai-loading"),
    output: $("ai-output"), actions: $("ai-actions"),
    buttons: [$("btn-ask"), $("btn-vocation")]
  };

  /** Chuyển văn bản Gemini (markdown nhẹ) sang HTML đã thoát ký tự. */
  function renderAiText(text) {
    return escapeHtml(text.trim())
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>")
      .split(/\n+/).filter((l) => l.trim()).map((l) => `<p>${l}</p>`).join("");
  }

  function setAiBusy(busy) {
    aiEls.buttons.forEach((b) => { b.disabled = busy; });
    show(aiEls.result);
    if (busy) {
      show(aiEls.loading, "flex");
      aiEls.output.innerHTML = "";
      hide(aiEls.actions);
    } else {
      hide(aiEls.loading);
    }
  }

  function showAiMessage(html) {
    aiEls.output.innerHTML = `<p class="text-gold-600">${html}</p>`;
  }

  /** Gọi một model Gemini; lỗi trả về kèm mã HTTP để quyết định có chuyển sang model dự phòng hay không. */
  async function callGemini(model, userText, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          // model mới dùng một phần token để "suy nghĩ": nới giới hạn và giảm mức suy nghĩ cho nhanh
          generationConfig: { temperature: 0.8, topP: 0.95, maxOutputTokens: 8192, thinkingConfig: { thinkingLevel: "low" } }
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data?.error?.message || res.statusText);
        err.status = res.status;
        throw err;
      }
      const cand = data?.candidates?.[0];
      const text = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
      if (!text) {
        const err = new Error(data?.promptFeedback?.blockReason || cand?.finishReason || "không có nội dung");
        err.empty = true;
        throw err;
      }
      return text;
    } finally {
      clearTimeout(timer);
    }
  }

  async function askGemini(userText, trigger) {
    if (isPlaceholder(GEMINI_API_KEY)) {
      show(aiEls.result);
      showAiMessage("Góc Lắng Nghe đang được chuẩn bị. Mời em quay lại sau nhé.");
      console.warn("[Góc Lắng Nghe] Chưa dán GEMINI_API_KEY trong js/app.js");
      return;
    }

    celebrate(trigger);
    setAiBusy(true);
    let lastErr = null;
    try {
      for (const [i, model] of GEMINI_MODELS.entries()) {
        try {
          const text = await callGemini(model, userText, i === 0 ? 40000 : 25000);
          aiEls.output.innerHTML = renderAiText(text);
          aiEls.output.dataset.raw = text.replace(/\*\*/g, "");
          show(aiEls.actions, "flex");
          return;
        } catch (err) {
          lastErr = err;
          // chi tiết kỹ thuật chỉ ghi vào console cho người quản trị trang
          console.warn("[Góc Lắng Nghe]", model, "lỗi", err.status || err.name, err.message);
          const retry = err.name === "AbortError" || [404, 429, 500, 503].includes(err.status);
          if (!retry) break;
        }
      }
      showAiMessage(
        lastErr?.empty ? "Chưa nhận được lời đáp. Em thử viết lại tâm tư bằng lời khác nhé."
          : lastErr?.status === 429 ? "Hiện có nhiều người đang hỏi cùng lúc. Xin em thử lại sau ít phút nhé."
          : lastErr?.name === "AbortError" ? "Đường truyền đang chậm, xin em thử lại nhé."
          : "Chưa nhận được lời đáp. Xin em thử lại sau ít phút nhé."
      );
    } finally {
      setAiBusy(false);
    }
  }


  $("btn-ask").addEventListener("click", (e) => {
    const text = aiEls.input.value.trim();
    askGemini(text ? `Tâm tư / ý nguyện của em:\n"""${text}"""` : VOCATION_PROMPT, e.currentTarget);
  });
  $("btn-vocation").addEventListener("click", (e) => askGemini(VOCATION_PROMPT, e.currentTarget));
  $("btn-copy").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(aiEls.output.dataset.raw || aiEls.output.innerText);
      btn.textContent = "Đã sao chép ✓";
    } catch {
      btn.textContent = "Không sao chép được";
    }
    setTimeout(() => { btn.textContent = "Sao chép"; }, 2000);
  });

  /* ============ SECTION 2 · FIREBASE REALTIME DATABASE ============ */
  const wishEls = {
    form: $("wish-form"), name: $("wish-name"), message: $("wish-message"),
    button: $("btn-wish"), status: $("wish-status"), notice: $("fb-notice"),
    list: $("wish-list"), empty: $("wish-empty"), total: $("wish-total")
  };
  const ICONS = ["🌹", "🕊️", "✝️", "📿", "🕯️", "💙"];
  const knownIds = new Set();
  let firstRender = true;
  const timeFmt = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

  function setWishStatus(text, ok = true) {
    wishEls.status.textContent = text;
    wishEls.status.className = `mt-3 min-h-[1.25rem] text-sm text-center ${ok ? "text-aqua-600" : "text-rose-600"}`;
  }

  function disableGuestbook(html) {
    wishEls.notice.innerHTML = html;
    show(wishEls.notice);
    wishEls.button.disabled = true;
  }

  /** Tạo card lời chúc bằng textContent để chặn chèn mã độc. */
  function buildWishCard(w, index) {
    const card = document.createElement("article");
    card.className = "flex gap-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 ring-1 ring-aqua-200/60 shadow-soft p-5"
      + (!firstRender && !knownIds.has(w.id) ? " wish-new" : "");

    const avatar = document.createElement("div");
    avatar.className = "shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-aqua-300 to-aqua-500 text-white flex items-center justify-center font-serif font-semibold text-xl shadow";
    avatar.textContent = (w.name || "?").trim().charAt(0).toUpperCase();

    const body = document.createElement("div");
    body.className = "min-w-0 flex-1";

    const head = document.createElement("div");
    head.className = "flex items-baseline justify-between gap-2";
    const name = document.createElement("h3");
    name.className = "font-semibold text-aqua-700 truncate";
    name.textContent = w.name;
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = ICONS[index % ICONS.length];
    head.append(name, icon);

    const msg = document.createElement("p");
    msg.className = "mt-1 text-aqua-900/85 leading-relaxed whitespace-pre-line break-words";
    msg.textContent = w.message;

    const time = document.createElement("time");
    time.className = "mt-2 block text-xs text-aqua-900/45";
    if (typeof w.createdAt === "number") {
      time.dateTime = new Date(w.createdAt).toISOString();
      time.textContent = timeFmt.format(new Date(w.createdAt));
    }

    body.append(head, msg, time);
    card.append(avatar, body);
    return card;
  }

  function renderWishes(items) {
    const frag = document.createDocumentFragment();
    items.forEach((w, i) => frag.appendChild(buildWishCard(w, items.length - 1 - i)));
    wishEls.list.replaceChildren(frag);
    items.forEach((w) => knownIds.add(w.id));
    firstRender = false;
    wishEls.total.textContent = items.length;
    wishEls.empty.classList.toggle("hidden", items.length > 0);
  }

  /** Google Analytics của Firebase: chỉ bật khi trình duyệt hỗ trợ (không chạy khi mở file trực tiếp). */
  async function initAnalytics(app) {
    if (isPlaceholder(firebaseConfig.measurementId)) return;
    try {
      const { getAnalytics, isSupported } = await import(`${FIREBASE_SDK}/firebase-analytics.js`);
      if (await isSupported()) getAnalytics(app);
    } catch (err) {
      console.warn("[Analytics] Không bật được:", err);
    }
  }

  /** Đăng nhập ẩn danh; trả về người dùng, hoặc null nếu dự án chưa bật đăng nhập ẩn danh. */
  function signInGuest(auth, onAuthStateChanged, signInAnonymously) {
    return new Promise((resolve) => {
      const stop = onAuthStateChanged(auth, (user) => {
        if (user) { stop(); resolve(user); }
      });
      if (!auth.currentUser) {
        signInAnonymously(auth).catch((err) => {
          console.warn("[Sổ Vàng] Chưa đăng nhập ẩn danh được (bật Anonymous trong Firebase Authentication):", err);
          stop();
          resolve(null);
        });
      }
    });
  }

  async function initGuestbook() {
    const required = ["apiKey", "projectId", "appId"];
    if (required.some((k) => isPlaceholder(firebaseConfig[k]))) {
      disableGuestbook("Sổ Vàng đang được chuẩn bị. Mời bạn quay lại sau nhé.");
      console.warn("[Sổ Vàng] Chưa dán firebaseConfig trong js/app.js");
      return;
    }

    try {
      const [{ initializeApp }, authSdk, store] = await Promise.all([
        import(`${FIREBASE_SDK}/firebase-app.js`),
        import(`${FIREBASE_SDK}/firebase-auth.js`),
        import(`${FIREBASE_SDK}/firebase-firestore.js`)
      ]);
      const { getAuth, onAuthStateChanged, signInAnonymously } = authSdk;
      const { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } = store;

      const app = initializeApp(firebaseConfig);
      initAnalytics(app);
      const db = getFirestore(app);
      const user = await signInGuest(getAuth(app), onAuthStateChanged, signInAnonymously);
      const wishesCol = collection(db, `artifacts/${firebaseConfig.appId}/public/data/guestbook_messages`);

      // lắng nghe theo thời gian thực, mới nhất lên đầu
      onSnapshot(
        query(wishesCol, orderBy("timestamp", "desc"), limit(MAX_WISHES)),
        (snap) => {
          renderWishes(snap.docs.map((doc) => {
            const data = doc.data({ serverTimestamps: "estimate" });
            return { id: doc.id, name: data.name, message: data.message, createdAt: data.timestamp?.toMillis?.() };
          }));
        },
        (err) => { console.warn("[Sổ Vàng] Lỗi đọc dữ liệu:", err); setWishStatus("Chưa tải được các lời chúc, xin thử lại sau.", false); }
      );

      wishEls.form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = wishEls.name.value.trim();
        const message = wishEls.message.value.trim();

        if (!name) { setWishStatus("Xin để lại tên của bạn nhé.", false); wishEls.name.focus(); return; }
        if (message.length < 3) { setWishStatus("Lời chúc cần ít nhất 3 ký tự.", false); wishEls.message.focus(); return; }

        const last = Number(safeStorage.get("lastWishAt") || 0);
        const wait = WISH_COOLDOWN_MS - (Date.now() - last);
        if (wait > 0) { setWishStatus(`Xin đợi ${Math.ceil(wait / 1000)} giây trước khi gửi tiếp.`, false); return; }

        wishEls.button.disabled = true;
        setWishStatus("Đang gửi…");
        try {
          await addDoc(wishesCol, {
            name: name.slice(0, 40),
            message: message.slice(0, 400),
            timestamp: serverTimestamp(),
            userId: user ? user.uid : null
          });
          safeStorage.set("lastWishAt", String(Date.now()));
          wishEls.message.value = "";
          $("wish-count").textContent = "0";
          setWishStatus("Cảm ơn bạn đã hiệp ý cầu nguyện cho em Maria Nguyễn Thư.");
          celebrate(wishEls.button, true);
        } catch (err) {
          console.warn("[Sổ Vàng] Lỗi ghi dữ liệu:", err);
          setWishStatus("Gửi chưa được, xin bạn thử lại sau ít phút.", false);
        } finally {
          wishEls.button.disabled = false;
        }
      });
    } catch (err) {
      console.warn("[Sổ Vàng] Không khởi tạo được Firebase:", err);
      disableGuestbook("Chưa kết nối được Sổ Vàng, xin thử lại sau.");
    }
  }

  initGuestbook();

  /* =====================================================================
   *  MẪU RULES CHO CLOUD FIRESTORE (Firebase Console > Firestore Database > Rules)
   *  - Ai cũng đọc được; chỉ người đã đăng nhập ẩn danh mới được THÊM mới,
   *    không sửa/xoá; kiểm tra đủ trường, độ dài, giờ máy chủ và userId.
   *  - Cần bật: Authentication > Sign-in method > Anonymous.
   *
   *  rules_version = '2';
   *  service cloud.firestore {
   *    match /databases/{database}/documents {
   *      match /artifacts/{appId}/public/data/guestbook_messages/{msgId} {
   *        allow read: if true;
   *        allow create: if request.auth != null
   *          && request.resource.data.keys().hasOnly(['name', 'message', 'timestamp', 'userId'])
   *          && request.resource.data.name is string
   *          && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 40
   *          && request.resource.data.message is string
   *          && request.resource.data.message.size() >= 3 && request.resource.data.message.size() <= 400
   *          && request.resource.data.timestamp == request.time
   *          && request.resource.data.userId == request.auth.uid;
   *        allow update, delete: if false;
   *      }
   *    }
   *  }
   * ===================================================================== */
})();
