(() => {
  "use strict";

  const MOVIES = window.ISHARA_MOVIES || [];
  const COLORS = ["c-lavender", "c-yellow", "c-peach", "c-blue", "c-pink", "c-coral"];
  const LANG = { english: "English", hindi: "Hindi" };
  const $ = (id) => document.getElementById(id);

  // Remember which movies were shown so they don't repeat until the list runs out.
  let seen;
  try { seen = new Set(JSON.parse(localStorage.getItem("ishara:seen") || "[]")); } catch { seen = new Set(); }
  const save = () => { try { localStorage.setItem("ishara:seen", JSON.stringify([...seen])); } catch { /* ignore */ } };

  let current = null;

  function pick() {
    let fresh = MOVIES.filter((m) => !seen.has(m.id) && m !== current);
    if (!fresh.length) { seen.clear(); fresh = MOVIES.filter((m) => m !== current); }
    const m = fresh[Math.floor(Math.random() * fresh.length)];
    seen.add(m.id);
    save();
    return m;
  }

  function show(m) {
    const card = $("card");
    const colors = COLORS.filter((c) => !card.classList.contains(c));
    card.className = "movie-card " + colors[Math.floor(Math.random() * colors.length)];
    $("m-title").textContent = m.title;
    $("m-lang").textContent = LANG[m.language];
    $("m-year").textContent = m.year;

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

  // Shrink a very long title until the whole card fits on screen (small phones).
  function fit() {
    const card = $("card"), title = $("m-title");
    if (card.hidden) return;
    title.style.fontSize = "";
    card.classList.remove("compact");
    if (card.scrollHeight > card.clientHeight + 1) card.classList.add("compact");
    let size = parseFloat(getComputedStyle(title).fontSize);
    while (card.scrollHeight > card.clientHeight + 1 && size > 18) {
      size -= 2;
      title.style.fontSize = size + "px";
    }
  }
  window.addEventListener("resize", fit);

  // Back to the start screen
  function goHome() {
    $("card").hidden = true;
    $("welcome").hidden = false;
    $("home").hidden = true;
    $("timer").hidden = true;
    resetTimer();
    $("go").textContent = "Get a movie";
    current = null;
  }

  $("go").addEventListener("click", () => {
    if ($("card").hidden) history.pushState({ movie: true }, ""); // so the phone's back gesture returns home
    current = pick();
    show(current);
  });
  const backHome = () => { if (history.state && history.state.movie) history.back(); else goHome(); };
  $("home").addEventListener("click", backHome);
  $("brand").addEventListener("click", backHome);
  window.addEventListener("popstate", goHome);

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
