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
    fit();
  }

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

  $("go").addEventListener("click", () => { current = pick(); show(current); });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
