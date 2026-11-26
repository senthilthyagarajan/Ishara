(() => {
  "use strict";

  const MOVIES = window.ISHARA_MOVIES || [];
  const COLORS = ["c-lavender", "c-yellow", "c-peach", "c-blue", "c-pink", "c-coral"];
  const LANG = { english: "English", hindi: "Hindi" };
  const LEVEL = { easy: "Easy", medium: "Medium", hard: "Hard" };
  const $ = (id) => document.getElementById(id);

  // ---------- storage (best effort; the app works without it) ----------
  const load = (key, fallback) => {
    try { const v = localStorage.getItem("ishara:" + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  };
  const store = (key, value) => { try { localStorage.setItem("ishara:" + key, JSON.stringify(value)); } catch { /* ignore */ } };

  // ======================================================================
  // Tabs
  // ======================================================================
  function showTab(name) {
    $("tab-movies").hidden = name !== "movies";
    $("tab-scores").hidden = name !== "scores";
    document.querySelectorAll(".nav-item").forEach((b) => {
      if (b.dataset.tab === name) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    if (name === "movies") fit();
  }
  document.querySelectorAll(".nav-item").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));

  // ======================================================================
  // Movies tab
  // ======================================================================
  let level = load("level", "easy");
  if (!LEVEL[level]) level = "easy";
  let seen = new Set(load("seen", []));
  let current = null;

  function syncLevels() {
    document.querySelectorAll("#levels button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.level === level)));
  }
  $("levels").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    level = b.dataset.level;
    store("level", level);
    syncLevels();
  });
  syncLevels();

  // A random movie at the chosen level; no repeats until that level's list runs out.
  function pick() {
    const pool = MOVIES.filter((m) => m.difficulty === level);
    let fresh = pool.filter((m) => !seen.has(m.id) && m !== current);
    if (!fresh.length) {
      pool.forEach((m) => seen.delete(m.id));
      fresh = pool.filter((m) => m !== current);
    }
    const m = fresh[Math.floor(Math.random() * fresh.length)];
    seen.add(m.id);
    store("seen", [...seen]);
    return m;
  }

  function showMovie(m) {
    const card = $("card");
    const colors = COLORS.filter((c) => !card.classList.contains(c));
    card.className = "movie-card " + colors[Math.floor(Math.random() * colors.length)];
    $("m-title").textContent = m.title;
    $("m-lang").textContent = LANG[m.language];
    $("m-year").textContent = m.year;
    $("m-level").textContent = LEVEL[m.difficulty];

    const words = m.title.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
    $("m-count").textContent = words.length;
    $("m-unit").textContent = words.length === 1 ? "word" : "words";
    const box = $("m-words");
    box.innerHTML = "";
    words.forEach((w, i) => {
      const n = (w.match(/[\p{L}\p{N}]/gu) || []).length;
      const s = document.createElement("span");
      s.textContent = n;
      s.title = `Word ${i + 1}: ${n} letters`;
      box.appendChild(s);
    });

    $("welcome").hidden = true;
    card.hidden = false;
    card.classList.remove("pop");
    void card.offsetWidth; // restart the animation
    card.classList.add("pop");
    $("go").textContent = "Next movie";
    $("home").hidden = false;
    $("timer").hidden = false;
    fit();
    resetTimer();
    startTimer();
  }

  // Shrink a very long title until the whole card fits on screen (small phones).
  function fit() {
    const card = $("card"), title = $("m-title");
    if (card.hidden || $("tab-movies").hidden) return;
    const overflowing = () => card.scrollHeight > card.clientHeight + 1;
    const shrink = () => {
      title.style.fontSize = "";
      let size = parseFloat(getComputedStyle(title).fontSize);
      while (overflowing() && size > 18) { size -= 2; title.style.fontSize = size + "px"; }
    };
    card.classList.remove("compact", "tight");
    title.style.fontSize = "";
    if (overflowing()) card.classList.add("compact");
    shrink();
    if (overflowing()) { card.classList.add("tight"); shrink(); } // last resort: hide the letter boxes
  }
  window.addEventListener("resize", fit);

  function goStart() {
    $("card").hidden = true;
    $("welcome").hidden = false;
    $("home").hidden = true;
    $("timer").hidden = true;
    resetTimer();
    $("go").textContent = "Get a movie";
    current = null;
  }

  $("go").addEventListener("click", () => {
    if ($("card").hidden) history.pushState({ movie: true }, ""); // so the phone's back gesture returns to the start
    current = pick();
    showMovie(current);
  });
  const backToStart = () => { if (history.state && history.state.movie) history.back(); else goStart(); };
  $("home").addEventListener("click", backToStart);
  $("brand").addEventListener("click", backToStart);
  window.addEventListener("popstate", () => { goStart(); showTab("movies"); });

  // ---------- timer: starts with each movie, tap to pause / resume ----------
  const DURATION = 90 * 1000;
  const ICON = {
    pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
    play: "M8 5v14l11-7z",
    replay: "M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z",
  };
  let left = DURATION, endAt = 0, tid = null, state = "idle", lastBeep = -1, wakeLock = null, audio = null;

  function beep(freq, ms, vol = 0.15) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000);
      o.connect(g).connect(audio.destination);
      o.start(); o.stop(audio.currentTime + ms / 1000);
    } catch { /* no sound available */ }
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

  function renderTimer() {
    const secs = Math.ceil(left / 1000);
    const t = $("timer");
    $("timer-text").textContent = state === "done" ? "Time's up!" : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
    $("timer-fill").style.width = `${(1 - left / DURATION) * 100}%`;
    $("timer-ic").setAttribute("d", state === "running" ? ICON.pause : state === "done" ? ICON.replay : ICON.play);
    t.classList.toggle("low", state === "running" && secs <= 10);
    t.classList.toggle("done", state === "done");
    t.classList.toggle("paused", state === "paused");
  }
  function tick() {
    left = Math.max(0, endAt - Date.now());
    const secs = Math.ceil(left / 1000);
    if (secs <= 5 && secs > 0 && secs !== lastBeep) { lastBeep = secs; beep(990, 90); buzz(40); }
    if (left <= 0) {
      clearInterval(tid); tid = null; state = "done";
      beep(220, 700, 0.25); buzz([300, 100, 300]);
      keepAwake(false);
    }
    renderTimer();
  }
  function startTimer() {
    clearInterval(tid);
    state = "running"; endAt = Date.now() + left;
    tid = setInterval(tick, 200);
    keepAwake(true);
    tick();
  }
  function pauseTimer() {
    clearInterval(tid); tid = null;
    left = Math.max(0, endAt - Date.now());
    state = "paused";
    keepAwake(false);
    renderTimer();
  }
  function resetTimer() {
    clearInterval(tid); tid = null;
    left = DURATION; state = "idle"; lastBeep = -1;
    keepAwake(false);
    renderTimer();
  }
  $("timer").addEventListener("click", () => {
    if (state === "running") pauseTimer();
    else { if (state === "done") resetTimer(); startTimer(); }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state === "running") keepAwake(true);
  });

  // ======================================================================
  // Scores tab
  // ======================================================================
  let teams = load("teams-scores", null);
  if (!Array.isArray(teams) || !teams.length) teams = [{ name: "Team A", score: 0 }, { name: "Team B", score: 0 }];
  const saveTeams = () => store("teams-scores", teams);
  const MAX_TEAMS = 6;

  function renderTeams() {
    const box = $("teams");
    box.innerHTML = "";
    const max = Math.max(...teams.map((t) => t.score));
    teams.forEach((t, i) => {
      const el = document.createElement("div");
      el.className = "team " + COLORS[i % COLORS.length];
      el.innerHTML = `
        <div class="team-top">
          <input class="team-name" maxlength="20" aria-label="Team ${i + 1} name" />
          ${max > 0 && t.score === max ? '<span class="crown" aria-label="Leading">👑</span>' : ""}
          <button class="team-remove" aria-label="Remove team"><svg viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
        </div>
        <div class="team-bottom">
          <span class="team-score" aria-live="polite">${t.score}</span>
          <button class="pt minus" aria-label="Minus one point"><svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg></button>
          <button class="pt plus" aria-label="Plus one point"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg></button>
        </div>`;
      const input = el.querySelector(".team-name");
      input.value = t.name;
      input.addEventListener("input", () => { t.name = input.value; saveTeams(); });
      input.addEventListener("blur", () => { if (!t.name.trim()) { t.name = `Team ${i + 1}`; input.value = t.name; saveTeams(); } });
      el.querySelector(".team-remove").hidden = teams.length <= 1;
      el.querySelector(".team-remove").addEventListener("click", () => {
        if (t.score > 0 && !confirm(`Remove ${t.name || "this team"} and its ${t.score} point${t.score === 1 ? "" : "s"}?`)) return;
        teams.splice(i, 1); saveTeams(); renderTeams();
      });
      el.querySelector(".plus").addEventListener("click", () => { t.score++; saveTeams(); renderTeams(); bump(i); });
      el.querySelector(".minus").addEventListener("click", () => { if (t.score > 0) { t.score--; saveTeams(); renderTeams(); } });
      el.querySelector(".minus").disabled = t.score === 0;
      box.appendChild(el);
    });
    $("add-team").hidden = teams.length >= MAX_TEAMS;
    $("reset-scores").disabled = teams.every((t) => t.score === 0);
  }
  function bump(i) {
    const s = $("teams").children[i] && $("teams").children[i].querySelector(".team-score");
    if (s) { s.classList.add("bump"); s.addEventListener("animationend", () => s.classList.remove("bump"), { once: true }); }
  }
  $("add-team").addEventListener("click", () => {
    teams.push({ name: `Team ${String.fromCharCode(65 + teams.length)}`, score: 0 });
    saveTeams(); renderTeams();
    const inputs = $("teams").querySelectorAll(".team-name");
    inputs[inputs.length - 1].select();
  });
  $("reset-scores").addEventListener("click", () => {
    if (!confirm("Set every team's score back to 0?")) return;
    teams.forEach((t) => { t.score = 0; });
    saveTeams(); renderTeams();
  });
  renderTeams();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
