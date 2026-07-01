/* ============================================================
   This is Vocabulary — teacher.js
   ============================================================ */

const TEACHER_PASSWORD = "dyb2024";
const TOTAL_DAYS_T = VOCAB_DATA.days.length;

let curTeacherId = TEACHERS[0].id;
let curClassId = TEACHERS[0].classes[0].id;
let curDay = 1;
let classChart = null;

/* ---------------- Lock screen ---------------- */
function tryUnlock() {
  const pw = document.getElementById("lock-pw").value;
  if (pw === TEACHER_PASSWORD) {
    sessionStorage.setItem("thisvoca_teacher_unlocked", "1");
    document.getElementById("lock").hidden = true;
    document.getElementById("tapp").hidden = false;
    initDashboard();
  } else {
    document.getElementById("lock-err").textContent = "비밀번호가 올바르지 않아요.";
  }
}
document.getElementById("lock-btn").addEventListener("click", tryUnlock);
document.getElementById("lock-pw").addEventListener("keydown", e => {
  if (e.key === "Enter") tryUnlock();
});

if (sessionStorage.getItem("thisvoca_teacher_unlocked") === "1") {
  document.getElementById("lock").hidden = true;
  document.getElementById("tapp").hidden = false;
  initDashboard();
}

/* ---------------- Tabs ---------------- */
function initDashboard() {
  renderTeacherTabs();
  renderClassTabs();
  renderDaySelect();
  loadClassData();
}

function renderTeacherTabs() {
  const wrap = document.getElementById("teacher-tabs");
  wrap.innerHTML = "";
  TEACHERS.forEach(t => {
    const b = document.createElement("button");
    b.className = "ttab" + (t.id === curTeacherId ? " active" : "");
    b.textContent = t.name + " 선생님";
    b.addEventListener("click", () => {
      curTeacherId = t.id;
      curClassId = t.classes[0].id;
      renderTeacherTabs();
      renderClassTabs();
      loadClassData();
    });
    wrap.appendChild(b);
  });
}

function renderClassTabs() {
  const wrap = document.getElementById("class-tabs");
  wrap.innerHTML = "";
  const t = findTeacher(curTeacherId);
  t.classes.forEach(c => {
    const b = document.createElement("button");
    b.className = "ttab ctab" + (c.id === curClassId ? " active" : "");
    b.textContent = c.name;
    b.addEventListener("click", () => {
      curClassId = c.id;
      renderClassTabs();
      loadClassData();
    });
    wrap.appendChild(b);
  });
}

function renderDaySelect() {
  const sel = document.getElementById("day-select");
  sel.innerHTML = "";
  for (let d = 1; d <= TOTAL_DAYS_T; d++) {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = `Day ${d} · ${VOCAB_DATA.days[d - 1].title}`;
    sel.appendChild(opt);
  }
  sel.value = curDay;
  sel.addEventListener("change", () => {
    curDay = Number(sel.value);
    loadClassData();
  });
}

/* ---------------- Data ---------------- */
function fetchClassScores() {
  return db.collection(SCORES_COLLECTION)
    .where("teacherId", "==", curTeacherId)
    .where("classId", "==", curClassId)
    .where("mode", "==", "typing")
    .get()
    .then(snap => {
      const rows = [];
      snap.forEach(doc => rows.push(doc.data()));
      rows.sort((a, b) => (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0));
      return rows;
    })
    .catch(err => {
      console.error("fetch class scores failed", err);
      return null;
    });
}

function loadClassData() {
  document.getElementById("t-cur-day").textContent = curDay;
  document.getElementById("t-avg").textContent = "…";
  document.getElementById("t-count").textContent = "…";
  document.getElementById("t-top").textContent = "…";
  document.getElementById("t-warn").textContent = "…";
  document.getElementById("t-table-body").innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--ink-faint); padding:24px;">불러오는 중...</td></tr>`;

  fetchClassScores().then(rows => {
    if (rows === null) {
      document.getElementById("t-table-body").innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--danger); padding:24px;">데이터를 불러오지 못했어요. Firebase 설정을 확인해주세요.</td></tr>`;
      return;
    }
    if (rows.length === 0) {
      document.getElementById("t-avg").textContent = "-";
      document.getElementById("t-count").textContent = "0명";
      document.getElementById("t-top").textContent = "-";
      document.getElementById("t-warn").textContent = "-";
      document.getElementById("t-table-body").innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--ink-faint); padding:24px;">아직 이 반의 기록이 없어요.</td></tr>`;
      renderClassChart([]);
      return;
    }

    const byStudent = {};
    rows.forEach(r => {
      if (!byStudent[r.name]) byStudent[r.name] = [];
      byStudent[r.name].push(r);
    });

    const students = Object.keys(byStudent).map(name => {
      const list = byStudent[name];
      const avgAll = Math.round(list.reduce((s, r) => s + r.score, 0) / list.length);
      const recent = list.slice(-3);
      const avgRecent = Math.round(recent.reduce((s, r) => s + r.score, 0) / recent.length);
      const last = list[list.length - 1];
      const diff = avgRecent - avgAll;
      let trend = "flat";
      if (list.length >= 3) {
        if (diff >= 4) trend = "up";
        else if (diff <= -4) trend = "down";
      }
      return { name, avgAll, avgRecent, lastDay: last.day, count: list.length, trend, list };
    });

    students.sort((a, b) => b.avgAll - a.avgAll);

    const dayRows = rows.filter(r => r.day === curDay);
    const dayBest = {};
    dayRows.forEach(r => { if (!dayBest[r.name] || r.score > dayBest[r.name]) dayBest[r.name] = r.score; });
    const dayScores = Object.values(dayBest);
    const dayAvg = dayScores.length ? Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length) : null;
    const topStudent = Object.entries(dayBest).sort((a, b) => b[1] - a[1])[0];
    const warnCount = students.filter(s => s.trend === "down").length;

    document.getElementById("t-avg").textContent = dayAvg !== null ? dayAvg + "점" : "기록 없음";
    document.getElementById("t-count").textContent = students.length + "명";
    document.getElementById("t-top").textContent = topStudent ? `${topStudent[0]} · ${topStudent[1]}점` : "-";
    document.getElementById("t-warn").textContent = warnCount + "명";

    renderClassChart(students);
    renderTable(students);
  });
}

function renderClassChart(students) {
  const ctx = document.getElementById("class-chart");
  if (classChart) classChart.destroy();
  const labels = students.map(s => s.name);
  const data = students.map(s => s.avgRecent);
  const colors = students.map(s => s.trend === "down" ? "#FF3D5A" : "#00BFA0");
  classChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderRadius: 6 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { min: 0, max: 100 } }
    }
  });
}

function renderTable(students) {
  const tbody = document.getElementById("t-table-body");
  tbody.innerHTML = "";
  students.forEach(s => {
    const tr = document.createElement("tr");
    const trendHtml = s.trend === "up"
      ? `<span class="trend-tag up">📈 상승</span>`
      : s.trend === "down"
        ? `<span class="trend-tag down">📉 하락</span>`
        : `<span class="trend-tag flat">➖ 유지</span>`;
    tr.innerHTML = `
      <td>${escapeHtmlT(s.name)}</td>
      <td>${s.avgAll}</td>
      <td>${s.avgRecent}</td>
      <td>${trendHtml}</td>
      <td>Day ${s.lastDay}</td>
      <td>${s.count}회</td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtmlT(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
