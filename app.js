/* ============================================================
   This is Vocabulary — app.js
   ============================================================ */

const TOTAL_DAYS = VOCAB_DATA.days.length;
const WORDS_PER_DAY = 30;

/* ---------------- Profile (local) ---------------- */
const PROFILE_KEY = "thisvoca_profile_v1";

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY));
  } catch (e) {
    return null;
  }
}
function saveProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

let PROFILE = getProfile();
let currentDay = Number(localStorage.getItem("thisvoca_last_day_v1")) || 1;

/* ---------------- Utilities ---------------- */
function toast(msg, ms = 1800) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), ms);
}

function dayWords(day) {
  const d = VOCAB_DATA.days.find(x => x.day === day);
  return d ? d.words : [];
}
function dayTitle(day) {
  const d = VOCAB_DATA.days.find(x => x.day === day);
  return d ? d.title : "";
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.92;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function shuffledIndices(n) {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------------- Local "done days" cache ---------------- */
function doneDaysKey() {
  if (!PROFILE) return null;
  return `thisvoca_done_${PROFILE.teacherId}_${PROFILE.classId}_${PROFILE.name}`;
}
function getDoneDays() {
  const k = doneDaysKey();
  if (!k) return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(k)) || []);
  } catch (e) {
    return new Set();
  }
}
function markDayDone(day) {
  const k = doneDaysKey();
  if (!k) return;
  const s = getDoneDays();
  s.add(day);
  localStorage.setItem(k, JSON.stringify([...s]));
}

/* ---------------- Navigation ---------------- */
const VIEWS = ["home", "flash", "type", "typeresult", "me", "rank"];
function showView(name) {
  VIEWS.forEach(v => {
    document.getElementById("view-" + v).hidden = v !== name;
  });
  document.querySelectorAll(".nav-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.nav === name);
  });
  if (name === "home") renderHome();
  if (name === "flash") startFlashcards(currentDay);
  if (name === "type") startTyping(currentDay);
  if (name === "me") renderMyPage();
  if (name === "rank") renderRanking();
  window.scrollTo(0, 0);
}

document.querySelectorAll(".nav-btn, [data-nav]").forEach(el => {
  el.addEventListener("click", () => {
    const target = el.dataset.nav;
    if (target) showView(target);
  });
});

/* ============================================================
   ONBOARDING
   ============================================================ */
function renderOnboard() {
  const teacherWrap = document.getElementById("ob-teachers");
  const classWrap = document.getElementById("ob-classes");
  teacherWrap.innerHTML = "";
  classWrap.innerHTML = "";
  let selTeacher = null;
  let selClass = null;

  TEACHERS.forEach(t => {
    const b = document.createElement("button");
    b.className = "chip-opt";
    b.textContent = t.name + " 선생님";
    b.addEventListener("click", () => {
      selTeacher = t.id;
      selClass = null;
      [...teacherWrap.children].forEach(c => c.classList.remove("sel"));
      b.classList.add("sel");
      renderClassChips(t.id);
      checkObReady();
    });
    teacherWrap.appendChild(b);
  });

  function renderClassChips(teacherId) {
    classWrap.innerHTML = "";
    const t = findTeacher(teacherId);
    t.classes.forEach(c => {
      const b = document.createElement("button");
      b.className = "chip-opt";
      b.textContent = c.name;
      b.addEventListener("click", () => {
        selClass = c.id;
        [...classWrap.children].forEach(x => x.classList.remove("sel"));
        b.classList.add("sel");
        checkObReady();
      });
      classWrap.appendChild(b);
    });
  }

  function checkObReady() {
    const name = document.getElementById("ob-name").value.trim();
    document.getElementById("ob-start").disabled = !(name && selTeacher && selClass);
    document.getElementById("ob-start")._payload = { name, teacherId: selTeacher, classId: selClass };
  }

  document.getElementById("ob-name").addEventListener("input", checkObReady);
  document.getElementById("ob-start").addEventListener("click", () => {
    const payload = document.getElementById("ob-start")._payload;
    if (!payload || !payload.name) return;
    PROFILE = payload;
    saveProfile(PROFILE);
    boot();
  });
}

/* ============================================================
   HOME / WORD LIST
   ============================================================ */
function renderHeader() {
  const t = findTeacher(PROFILE.teacherId);
  const c = findClass(PROFILE.teacherId, PROFILE.classId);
  document.getElementById("hdr-class").textContent = `${t.name} 선생님 · ${c.name}`;
  document.getElementById("hdr-name").textContent = PROFILE.name;
}

function renderDayGrid() {
  const grid = document.getElementById("day-grid");
  grid.innerHTML = "";
  const done = getDoneDays();
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const chip = document.createElement("button");
    chip.className = "day-chip" + (done.has(d) ? " done" : "") + (d === currentDay ? " active" : "");
    chip.textContent = d;
    chip.addEventListener("click", () => {
      currentDay = d;
      localStorage.setItem("thisvoca_last_day_v1", d);
      renderHome();
    });
    grid.appendChild(chip);
  }
  document.getElementById("home-progress-pill").textContent = `${done.size} / ${TOTAL_DAYS} 완료`;
}

function renderWordList() {
  document.getElementById("wordlist-day-label").textContent = `Day ${currentDay} · ${dayTitle(currentDay)}`;
  const list = document.getElementById("word-list");
  list.innerHTML = "";
  dayWords(currentDay).forEach(w => {
    const row = document.createElement("div");
    row.className = "word-row";
    row.innerHTML = `
      <div>
        <div class="en">${escapeHtml(w.word)}</div>
        <div class="kr">${escapeHtml(w.meaning)}</div>
      </div>
      <button class="speak-btn" aria-label="발음 듣기">🔊</button>
    `;
    row.querySelector(".speak-btn").addEventListener("click", () => speak(w.word));
    list.appendChild(row);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderHome() {
  renderDayGrid();
  renderWordList();
}

/* ============================================================
   FLASHCARDS
   ============================================================ */
let flashState = null;

function startFlashcards(day) {
  const words = dayWords(day);
  flashState = {
    day,
    order: shuffledIndices(words.length),
    idx: 0,
    words
  };
  document.getElementById("flash-day-pill").textContent = `Day ${day}`;
  renderFlashDots();
  renderFlashCard();
}

function renderFlashDots() {
  const wrap = document.getElementById("flash-dots");
  wrap.innerHTML = "";
  flashState.words.forEach((_, i) => {
    const dot = document.createElement("span");
    if (i < flashState.idx) dot.classList.add("on");
    wrap.appendChild(dot);
  });
}

function renderFlashCard() {
  const card = document.getElementById("flashcard");
  card.classList.remove("flipped");
  const w = flashState.words[flashState.order[flashState.idx]];
  document.getElementById("fc-word").textContent = w.word;
  document.getElementById("fc-meaning").textContent = w.meaning;
  document.getElementById("flash-progress").textContent = `${flashState.idx + 1} / ${flashState.words.length}`;
  renderFlashDots();
}

document.getElementById("flashcard").addEventListener("click", () => {
  document.getElementById("flashcard").classList.toggle("flipped");
});

function advanceFlash() {
  flashState.idx++;
  if (flashState.idx >= flashState.words.length) {
    toast("플래시카드 완료! 🎉");
    showView("home");
    return;
  }
  renderFlashCard();
}
document.getElementById("flash-know").addEventListener("click", advanceFlash);
document.getElementById("flash-dont-know").addEventListener("click", advanceFlash);
document.getElementById("flash-exit").addEventListener("click", () => showView("home"));

/* ============================================================
   TYPING TEST
   ============================================================ */
let typeState = null;

function startTyping(day) {
  const words = dayWords(day);
  typeState = {
    day,
    order: shuffledIndices(words.length),
    idx: 0,
    words,
    correct: 0,
    wrong: 0,
    wrongWords: [],
    startTime: Date.now(),
    timer: null,
    locked: false
  };
  document.getElementById("type-day-pill").textContent = `Day ${day}`;
  document.getElementById("type-correct").textContent = "0";
  document.getElementById("type-wrong").textContent = "0";
  clearInterval(typeState.timer);
  typeState.timer = setInterval(() => {
    document.getElementById("type-timer").textContent = fmtTime((Date.now() - typeState.startTime) / 1000);
  }, 500);
  renderTypeCard();
}

function renderTypeCard() {
  const input = document.getElementById("type-input");
  input.value = "";
  input.classList.remove("correct", "wrong");
  const w = typeState.words[typeState.order[typeState.idx]];
  document.getElementById("type-kr").textContent = w.meaning.replace(/^[a-z]+\s/i, "").trim() || w.meaning;
  document.getElementById("type-pos").textContent = (w.meaning.match(/^[a-z]+/i) || [""])[0];
  document.getElementById("type-progress").textContent = `${typeState.idx + 1} / ${typeState.words.length}`;
  typeState.locked = false;
  setTimeout(() => input.focus(), 50);
}

function submitTypeAnswer() {
  if (typeState.locked) return;
  const input = document.getElementById("type-input");
  const w = typeState.words[typeState.order[typeState.idx]];
  const given = input.value.trim().toLowerCase();
  const correct = w.word.trim().toLowerCase();
  const isCorrect = given === correct;
  typeState.locked = true;

  if (isCorrect) {
    typeState.correct++;
    input.classList.add("correct");
  } else {
    typeState.wrong++;
    input.classList.add("wrong");
    input.value = w.word;
    typeState.wrongWords.push(w);
  }
  document.getElementById("type-correct").textContent = typeState.correct;
  document.getElementById("type-wrong").textContent = typeState.wrong;

  setTimeout(() => {
    typeState.idx++;
    if (typeState.idx >= typeState.words.length) {
      finishTyping();
    } else {
      renderTypeCard();
    }
  }, isCorrect ? 350 : 850);
}

document.getElementById("type-input").addEventListener("keydown", e => {
  if (e.key === "Enter") submitTypeAnswer();
});
document.getElementById("type-exit").addEventListener("click", () => {
  clearInterval(typeState && typeState.timer);
  showView("home");
});

function finishTyping() {
  clearInterval(typeState.timer);
  const total = typeState.words.length;
  const score = Math.round((typeState.correct / total) * 100);
  const elapsed = Math.round((Date.now() - typeState.startTime) / 1000);

  markDayDone(typeState.day);

  saveScore({
    day: typeState.day,
    mode: "typing",
    score,
    correct: typeState.correct,
    wrong: typeState.wrong,
    total,
    elapsed
  });

  document.getElementById("res-score").textContent = score + "점";
  document.getElementById("res-time").textContent = fmtTime(elapsed);
  document.getElementById("res-correct").textContent = typeState.correct;
  document.getElementById("res-wrong").textContent = typeState.wrong;

  const wl = document.getElementById("res-wronglist");
  wl.innerHTML = "";
  if (typeState.wrongWords.length === 0) {
    wl.innerHTML = `<div class="empty-state"><div class="ic">🎯</div>모두 맞혔어요! 완벽해요</div>`;
  } else {
    typeState.wrongWords.forEach(w => {
      const row = document.createElement("div");
      row.className = "word-row";
      row.innerHTML = `<div><div class="en">${escapeHtml(w.word)}</div><div class="kr">${escapeHtml(w.meaning)}</div></div>`;
      wl.appendChild(row);
    });
  }
  showView("typeresult");
}
document.getElementById("res-done").addEventListener("click", () => showView("home"));

/* ============================================================
   FIRESTORE — scores
   ============================================================ */
function saveScore({ day, mode, score, correct, wrong, total, elapsed }) {
  if (!PROFILE) return;
  const payload = {
    name: PROFILE.name,
    teacherId: PROFILE.teacherId,
    classId: PROFILE.classId,
    day, mode, score, correct, wrong, total, elapsed,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };
  db.collection(SCORES_COLLECTION).add(payload).catch(err => {
    console.error("save score failed", err);
    toast("⚠️ 점수 저장에 실패했어요 (네트워크 확인)");
  });
}

function fetchMyScores() {
  if (!PROFILE) return Promise.resolve([]);
  return db.collection(SCORES_COLLECTION)
    .where("teacherId", "==", PROFILE.teacherId)
    .where("classId", "==", PROFILE.classId)
    .where("name", "==", PROFILE.name)
    .where("mode", "==", "typing")
    .get()
    .then(snap => {
      const rows = [];
      snap.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
      rows.sort((a, b) => (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0));
      return rows;
    })
    .catch(err => {
      console.error("fetch my scores failed", err);
      return [];
    });
}

function fetchDayRanking(day) {
  return db.collection(SCORES_COLLECTION)
    .where("teacherId", "==", PROFILE.teacherId)
    .where("classId", "==", PROFILE.classId)
    .where("day", "==", day)
    .where("mode", "==", "typing")
    .get()
    .then(snap => {
      const rows = [];
      snap.forEach(doc => rows.push(doc.data()));
      const best = {};
      rows.forEach(r => {
        if (!best[r.name] || r.score > best[r.name].score) best[r.name] = r;
      });
      return Object.values(best).sort((a, b) => b.score - a.score);
    })
    .catch(err => {
      console.error("fetch ranking failed", err);
      return [];
    });
}

/* ============================================================
   MY PAGE
   ============================================================ */
let meChart = null;

function renderMyPage() {
  document.getElementById("me-name-title").textContent = `${PROFILE.name}님의 기록`;
  const dayScoresEl = document.getElementById("me-day-scores");
  dayScoresEl.innerHTML = `<div class="empty-state"><div class="ic">⏳</div>불러오는 중...</div>`;

  fetchMyScores().then(rows => {
    if (rows.length === 0) {
      document.getElementById("me-avg-all").textContent = "-";
      document.getElementById("me-avg-recent").textContent = "-";
      dayScoresEl.innerHTML = `<div class="empty-state"><div class="ic">📭</div>아직 타이핑 테스트 기록이 없어요<br>테스트를 보면 여기에 기록이 쌓여요!</div>`;
      renderMeChart([]);
      renderTrend(null);
      return;
    }

    const avgAll = Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length);
    const recent = rows.slice(-3);
    const avgRecent = Math.round(recent.reduce((s, r) => s + r.score, 0) / recent.length);
    document.getElementById("me-avg-all").textContent = avgAll + "점";
    document.getElementById("me-avg-recent").textContent = avgRecent + "점";

    renderMeChart(rows.slice(-10));
    renderTrend({ avgAll, avgRecent, count: rows.length });

    const bestByDay = {};
    rows.forEach(r => {
      if (!bestByDay[r.day] || r.score > bestByDay[r.day].score) bestByDay[r.day] = r;
    });
    const days = Object.keys(bestByDay).map(Number).sort((a, b) => b - a);
    dayScoresEl.innerHTML = "";
    days.forEach(d => {
      const r = bestByDay[d];
      const row = document.createElement("div");
      row.className = "word-row";
      row.innerHTML = `
        <div><div class="en">Day ${d}</div><div class="kr">${escapeHtml(dayTitle(d))}</div></div>
        <div class="pill pill-coral">${r.score}점</div>
      `;
      dayScoresEl.appendChild(row);
    });
  });
}

function renderMeChart(rows) {
  const ctx = document.getElementById("me-chart");
  if (meChart) meChart.destroy();
  const labels = rows.map(r => `Day ${r.day}`);
  const data = rows.map(r => r.score);
  meChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data,
        borderColor: "#FF5A36",
        backgroundColor: "rgba(255,90,54,0.12)",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: "#FF5A36"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, ticks: { font: { size: 10 } } },
        x: { ticks: { font: { size: 10 } } }
      }
    }
  });
}

function renderTrend(stat) {
  const box = document.getElementById("me-trend");
  const text = document.getElementById("me-trend-text");
  box.classList.remove("trend-up", "trend-down", "trend-flat");

  if (!stat || stat.count < 3) {
    box.classList.add("trend-flat");
    box.querySelector("span").textContent = "💬";
    text.textContent = "아직 기록이 충분하지 않아요. 테스트를 몇 번 더 보면 추이를 보여줄게요!";
    return;
  }

  const diff = stat.avgRecent - stat.avgAll;
  const icon = box.querySelector("span");
  if (diff >= 4) {
    box.classList.add("trend-up");
    icon.textContent = "📈";
    text.textContent = "최근 점수가 꾸준히 오르고 있어요. 지금처럼만 하면 다음 Day도 문제없어요!";
  } else if (diff <= -4) {
    box.classList.add("trend-down");
    icon.textContent = "💪";
    text.textContent = "최근 점수가 조금 떨어졌어요. 어려운 단어만 골라서 플래시카드로 한 번 더 훑어볼까요?";
  } else {
    box.classList.add("trend-flat");
    icon.textContent = "🙂";
    text.textContent = "꾸준히 안정적인 점수를 유지하고 있어요. 좋은 페이스예요!";
  }
}

document.getElementById("me-export").addEventListener("click", () => {
  const card = document.getElementById("export-card");
  toast("이미지 생성 중...", 1000);
  html2canvas(card, { backgroundColor: "#FFFFFF", scale: 2 }).then(canvas => {
    const link = document.createElement("a");
    link.download = `${PROFILE.name}_기록_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
});

/* ============================================================
   RANKING
   ============================================================ */
function renderRanking() {
  const tabs = document.getElementById("rank-day-tabs");
  if (tabs.children.length === 0) {
    for (let d = 1; d <= TOTAL_DAYS; d++) {
      const b = document.createElement("button");
      b.className = "rank-tab" + (d === currentDay ? " active" : "");
      b.textContent = `Day ${d}`;
      b.dataset.day = d;
      b.addEventListener("click", () => {
        [...tabs.children].forEach(c => c.classList.remove("active"));
        b.classList.add("active");
        loadRankingFor(d);
      });
      tabs.appendChild(b);
    }
  }
  loadRankingFor(currentDay);
}

function loadRankingFor(day) {
  const list = document.getElementById("rank-list");
  list.innerHTML = `<div class="empty-state"><div class="ic">⏳</div>불러오는 중...</div>`;
  fetchDayRanking(day).then(rows => {
    if (rows.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="ic">🏳️</div>Day ${day} 기록이 아직 없어요<br>가장 먼저 도전해보세요!</div>`;
      return;
    }
    list.innerHTML = "";
    rows.forEach((r, i) => {
      const row = document.createElement("div");
      const rankClass = i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : "";
      const isMe = r.name === PROFILE.name;
      row.className = `rank-row ${rankClass} ${isMe ? "rank-me" : ""}`.trim();
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
      row.innerHTML = `
        <div class="rank-no">${medal}</div>
        <div class="rank-name">${escapeHtml(r.name)}${isMe ? " (나)" : ""}</div>
        <div class="rank-score">${r.score}점</div>
      `;
      list.appendChild(row);
    });
  });
}

/* ============================================================
   BOOT
   ============================================================ */
function boot() {
  if (!PROFILE) {
    document.getElementById("view-onboard").hidden = false;
    renderOnboard();
    return;
  }
  document.getElementById("view-onboard").hidden = true;
  document.getElementById("app-header").hidden = false;
  document.getElementById("bottom-nav").hidden = false;
  renderHeader();
  showView("home");
}

boot();
