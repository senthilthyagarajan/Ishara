(() => {
  "use strict";

  const MOVIES = window.ISHARA_MOVIES || [];
  const CARD_COLORS = ["c-lavender", "c-yellow", "c-peach", "c-blue", "c-pink", "c-coral"];
  const TEAM_COLORS = ["c-lavender", "c-yellow", "c-peach", "c-blue", "c-pink", "c-coral"];
  const LANG_LABEL = { english: "English", hindi: "Hindi" };

  const $ = (id) => document.getElementById(id);

  // ---------- storage (best effort; the app works without it) ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("ishara:" + key); return v == null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) { try { localStorage.setItem("ishara:" + key, JSON.stringify(value)); } catch { /* ignore */ } },
  };

  let teamNames = store.get("teams", ["Team Masala", "Team Popcorn"]);
  let seen = new Set(store.get("seen", []));
  let game = null;

  // ---------- screens ----------
  function show(name) {
    document.querySelectorAll(".screen").forEach((s) => s.removeAttribute("data-active"));
    $("screen-" + name).setAttribute("data-active", "");
    window.scrollTo(0, 0);
  }
  const goHome = () => { stopTimer(); show("home"); refreshPool(); };
  document.querySelectorAll("[data-go=home]").forEach((b) => b.addEventListener("click", goHome));
  $("btn-rules").addEventListener("click", () => show("rules"));

  let toastTimer;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  // Material dialog; resolves true when the confirm action is chosen.
  function ask(title, text, okLabel) {
    const dlg = $("dialog");
    $("dialog-title").textContent = title;
    $("dialog-text").textContent = text;
    $("dialog-ok").textContent = okLabel || "OK";
    return new Promise((resolve) => {
      dlg.addEventListener("close", () => resolve(dlg.returnValue === "ok"), { once: true });
      dlg.returnValue = "";
      dlg.showModal();
    });
  }

  // Touch ripple for .ripple elements
  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(".ripple");
    if (!el || el.disabled) return;
    const r = el.getBoundingClientRect();
    const size = Math.hypot(r.width, r.height) * 2;
    const w = document.createElement("span");
    w.className = "ripple-wave";
    w.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    el.appendChild(w);
    w.addEventListener("animationend", () => w.remove());
  });

  // ---------- movie pool: every movie, picked at random ----------
  const pool = () => MOVIES;

  function refreshPool() {
    const fresh = MOVIES.filter((m) => !seen.has(m.id)).length;
    $("pool-count").textContent = `${MOVIES.length.toLocaleString("en-IN")} movies · ${fresh.toLocaleString("en-IN")} not played yet`;
  }

  function drawMovie(exclude) {
    const p = pool();
    if (!p.length) return null;
    let fresh = p.filter((m) => !seen.has(m.id) && m.id !== exclude);
    if (!fresh.length) {
      p.forEach((m) => seen.delete(m.id));
      toast("You've played every movie here – starting the list again");
      fresh = p.filter((m) => m.id !== exclude);
      if (!fresh.length) fresh = p;
    }
    const m = fresh[Math.floor(Math.random() * fresh.length)];
    seen.add(m.id);
    store.set("seen", [...seen]);
    return m;
  }

  $("btn-reset-seen").addEventListener("click", () => {
    seen = new Set(); store.set("seen", []);
    refreshPool(); toast("Played movies cleared");
  });

  // ---------- movie card ----------
  function renderMovie(m) {
    const colors = CARD_COLORS.filter((c) => !$("movie-card").classList.contains(c));
    $("movie-card").className = "movie-card " + colors[Math.floor(Math.random() * colors.length)];
    $("m-title").textContent = m.title;
    $("m-lang").textContent = LANG_LABEL[m.language];
    $("m-year").textContent = m.year;
    const words = m.title.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
    $("m-count").textContent = words.length;
    $("m-unit").textContent = words.length === 1 ? "word" : "words";
    const box = $("m-words");
    box.innerHTML = "";
    words.forEach((w, i) => {
      const letters = (w.match(/[\p{L}\p{N}]/gu) || []).length;
      const s = document.createElement("span");
      s.textContent = letters;
      s.title = `Word ${i + 1}: ${letters} letters`;
      box.appendChild(s);
    });
  }

  // ---------- cover (press and hold to peek) ----------
  const cover = $("btn-cover");
  const peek = (on) => { cover.style.opacity = on ? "0" : "1"; };
  cover.addEventListener("pointerdown", (e) => { e.preventDefault(); peek(true); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => cover.addEventListener(ev, () => peek(false)));
  cover.addEventListener("contextmenu", (e) => e.preventDefault());

  // ---------- timer, sound, vibration, wake lock ----------
  let timerId = null, endAt = 0, duration = 90, onTimeUp = null, lastBeep = -1, wakeLock = null, audioCtx = null;
  function beep(freq = 880, ms = 120, vol = 0.15) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + ms / 1000);
      o.connect(g).connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + ms / 1000);
    } catch { /* no audio */ }
  }
  const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch { /* ignore */ } };
  async function keepAwake(on) {
    try {
      if (on && "wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
      } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch { /* not supported */ }
  }

  const CIRC = 2 * Math.PI * 52;
  function drawTimer(left) {
    const secs = Math.ceil(left / 1000);
    $("timer-text").textContent = secs >= 60 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` : secs;
    $("timer-bar").style.strokeDashoffset = String(CIRC * (1 - left / (duration * 1000)));
    $("timer").classList.toggle("low", secs <= 10);
    return secs;
  }
  function startTimer(seconds, done) {
    stopTimer();
    duration = seconds; endAt = Date.now() + seconds * 1000; onTimeUp = done; lastBeep = -1;
    $("timer").hidden = false;
    beep(660, 90);
    keepAwake(true);
    const tick = () => {
      const left = Math.max(0, endAt - Date.now());
      const secs = drawTimer(left);
      if (secs <= 5 && secs > 0 && secs !== lastBeep) { lastBeep = secs; beep(990, 90); buzz(40); }
      if (left <= 0) {
        stopTimer();
        beep(220, 600, 0.25); buzz([300, 100, 300]);
        const cb = onTimeUp; onTimeUp = null;
        cb && cb();
      }
    };
    tick();
    timerId = setInterval(tick, 200);
  }
  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    keepAwake(false);
  }
  const timerRunning = () => timerId !== null;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && timerRunning()) keepAwake(true);
  });

  // ---------- team setup ----------
  function renderTeams() {
    const list = $("team-list");
    list.innerHTML = "";
    teamNames.forEach((name, i) => {
      const li = document.createElement("li");
      li.className = TEAM_COLORS[i % TEAM_COLORS.length];
      li.innerHTML = `<input maxlength="24" aria-label="Team ${i + 1} name" />
        <button class="icon-btn ripple" aria-label="Remove team ${i + 1}"><svg class="ic"><use href="#i-delete"/></svg></button>`;
      const input = li.querySelector("input");
      input.value = name;
      input.addEventListener("input", () => { teamNames[i] = input.value; store.set("teams", teamNames); });
      const rm = li.querySelector("button");
      rm.hidden = teamNames.length <= 2;
      rm.addEventListener("click", () => { teamNames.splice(i, 1); store.set("teams", teamNames); renderTeams(); });
      list.appendChild(li);
    });
    $("btn-add-team").disabled = teamNames.length >= TEAM_COLORS.length;
  }
  $("btn-add-team").addEventListener("click", () => {
    teamNames.push(`Team ${teamNames.length + 1}`);
    store.set("teams", teamNames); renderTeams();
  });
  $("btn-team").addEventListener("click", () => { renderTeams(); show("setup"); });

  // ---------- team game ----------
  function startGame() {
    game = {
      teams: teamNames.map((n, i) => ({ name: n.trim() || `Team ${i + 1}`, color: TEAM_COLORS[i % TEAM_COLORS.length], score: 0 })),
      turns: Number($("turns").value),
      time: Number($("round-time").value),
      passes: Number($("passes").value),
      turn: 0, movie: null, passesLeft: 0,
    };
    handoff();
  }
  $("btn-start").addEventListener("click", startGame);
  $("btn-again").addEventListener("click", startGame);

  const currentTeam = () => game.teams[game.turn % game.teams.length];

  function renderScores(el, highlight) {
    const max = Math.max(...game.teams.map((t) => t.score));
    el.innerHTML = "";
    [...game.teams].sort((a, b) => b.score - a.score).forEach((t) => {
      const d = document.createElement("div");
      d.className = `score-tile ${t.color}${t === highlight ? " current" : ""}`;
      d.innerHTML = `<span class="pts">${t.score}</span><span class="name"></span>${max > 0 && t.score === max ? '<span class="crown" aria-label="leading">👑</span>' : ""}`;
      d.querySelector(".name").textContent = t.name;
      el.appendChild(d);
    });
  }

  function handoff() {
    const t = currentTeam();
    $("handoff-turn").textContent = `Round ${Math.floor(game.turn / game.teams.length) + 1} of ${game.turns}`;
    $("handoff-team").textContent = t.name;
    $("handoff-tile").className = "hand-tile " + t.color;
    renderScores($("handoff-scores"), t);
    show("handoff");
  }

  $("btn-reveal").addEventListener("click", () => {
    if (!game.movie) { game.movie = drawMovie(); game.passesLeft = game.passes; }
    openPlay();
  });

  function setPlayMode(mode) {
    $("act-pre").hidden = mode !== "pre";
    $("act-live").hidden = mode !== "live";
    $("act-quick").hidden = mode !== "quick";
    cover.hidden = mode !== "live";
    peek(false);
  }

  function openPlay() {
    $("play-team").textContent = currentTeam().name;
    renderMovie(game.movie);
    updatePasses();
    $("timer").hidden = true;
    setPlayMode("pre");
    show("play");
  }

  function updatePasses() {
    if (!game) { $("play-passes").textContent = ""; return; }
    const unlimited = game.passes >= 99;
    $("play-passes").textContent = unlimited ? "∞ passes" : `${game.passesLeft} pass${game.passesLeft === 1 ? "" : "es"}`;
    $("btn-pass").disabled = !unlimited && game.passesLeft <= 0;
  }

  $("btn-pass").addEventListener("click", () => {
    if (game.passes < 99) game.passesLeft--;
    game.movie = drawMovie(game.movie && game.movie.id);
    renderMovie(game.movie);
    updatePasses();
  });

  $("btn-go").addEventListener("click", () => {
    setPlayMode("live");
    $("play-passes").textContent = "";
    game.startedAt = Date.now();
    startTimer(game.time, () => finishTurn(false, true));
  });
  $("btn-guessed").addEventListener("click", () => finishTurn(true));
  $("btn-giveup").addEventListener("click", () => finishTurn(false));

  function finishTurn(guessed, timedOut) {
    stopTimer();
    const t = currentTeam();
    const m = game.movie;
    const secs = Math.round((Date.now() - game.startedAt) / 1000);
    const pts = guessed ? 1 : 0;
    t.score += pts;
    if (guessed) { beep(1320, 140); setTimeout(() => beep(1760, 180), 140); buzz(80); }
    $("r-emoji").textContent = guessed ? "🎉" : timedOut ? "⏰" : "😅";
    $("r-head").textContent = guessed ? `+${pts} for ${t.name}!` : timedOut ? "Time's up!" : "No points this time";
    $("r-movie").textContent = `${m.title} (${m.year})`;
    $("r-detail").textContent = guessed ? `Guessed in ${secs} second${secs === 1 ? "" : "s"}` : "Better luck next turn";
    game.movie = null;
    game.turn++;
    const over = game.turn >= game.turns * game.teams.length;
    $("btn-next-turn").textContent = over ? "See final scores" : `Next: ${currentTeam().name}`;
    renderScores($("result-scores"), t);
    show("result");
  }

  $("btn-next-turn").addEventListener("click", () => {
    if (game.turn >= game.turns * game.teams.length) return gameOver();
    handoff();
  });

  function gameOver() {
    const max = Math.max(...game.teams.map((t) => t.score));
    const winners = game.teams.filter((t) => t.score === max);
    $("o-head").textContent = max === 0 ? "Nobody scored – rematch?"
      : winners.length > 1 ? `It's a tie: ${winners.map((w) => w.name).join(" & ")}`
      : `${winners[0].name} wins!`;
    renderScores($("over-scores"));
    show("over");
  }

  $("btn-quit").addEventListener("click", async () => {
    if (await ask("Quit this game?", "Scores for this game will be lost.", "Quit")) { game = null; goHome(); }
  });

  $("btn-play-back").addEventListener("click", async () => {
    if (!game) return goHome();
    if (timerRunning()) {
      if (!(await ask("End this turn?", "The timer stops and this team gets no points.", "End turn"))) return;
      if (!timerRunning()) return; // time ran out while the dialog was open
      return finishTurn(false);
    }
    handoff(); // the movie stays the same when they come back
  });

  // ---------- quick pick ----------
  let quickMovie = null;
  function setQuickTimerLabel(running) {
    const b = $("btn-quick-timer");
    b.querySelector("use").setAttribute("href", running ? "#i-stop" : "#i-timer");
    b.querySelector("span").textContent = running ? "Stop" : "Timer";
  }
  function quickNext() {
    stopTimer();
    $("timer").hidden = true;
    setQuickTimerLabel(false);
    quickMovie = drawMovie(quickMovie && quickMovie.id);
    if (quickMovie) renderMovie(quickMovie);
  }
  function startQuick() {
    game = null;
    $("play-team").textContent = "Quick pick";
    updatePasses();
    setPlayMode("quick");
    quickNext();
    show("play");
  }
  $("btn-quick").addEventListener("click", startQuick);
  $("btn-quick-next").addEventListener("click", quickNext);
  $("btn-quick-timer").addEventListener("click", () => {
    if (timerRunning()) { stopTimer(); $("timer").hidden = true; setQuickTimerLabel(false); return; }
    setQuickTimerLabel(true);
    startTimer(Number($("round-time").value), () => setQuickTimerLabel(false));
  });

  // ---------- PWA ----------
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; $("btn-install").hidden = false; });
  $("btn-install").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => {});
    deferredPrompt = null; $("btn-install").hidden = true;
  });
  window.addEventListener("appinstalled", () => { $("btn-install").hidden = true; });
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  refreshPool();
  show("home");
})();
