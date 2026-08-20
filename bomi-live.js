(() => {
  "use strict";

  const API_URL = "https://bomi-v4.jinihori.workers.dev/api/public/state";
  const STATE_CACHE_KEY = "bomi.public.state.v2";
  const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const text = (value) => value == null ? "" : String(value);
  const normalize = (value) => text(value).replace(/\s+/g, "").toLowerCase();

  function make(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = text(value);
    return el;
  }

  function formatDateKo(isoDate) {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-").map(Number);
    if (!year || !month || !day) return isoDate;
    return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
  }

  function latestRecord(records) {
    return records.slice().sort((a, b) => text(b.visit_date).localeCompare(text(a.visit_date)))[0] || null;
  }

  function gestationText(record) {
    const week = Number(record?.gestation_week);
    const day = Number(record?.gestation_day || 0);
    return Number.isFinite(week) ? `${week}주 ${day}일` : "";
  }

  function collectMetrics(records) {
    const map = new Map();
    records.slice().sort((a, b) => text(b.visit_date).localeCompare(text(a.visit_date))).forEach((record) => {
      (Array.isArray(record.metrics) ? record.metrics : []).forEach((metric) => {
        const key = normalize(metric?.label);
        if (key && !map.has(key)) map.set(key, metric);
      });
    });
    return map;
  }

  function findMetric(metricMap, aliases) {
    for (const alias of aliases) {
      const exact = metricMap.get(normalize(alias));
      if (exact) return exact;
    }
    for (const metric of metricMap.values()) {
      const label = normalize(metric?.label);
      if (aliases.some((alias) => label.includes(normalize(alias)))) return metric;
    }
    return null;
  }

  function statusTone(value) {
    const key = normalize(value);
    if (/(대기|예정|확인필요)/.test(key)) return "yellow";
    return "normal";
  }

  function pillText(value) {
    const raw = text(value).trim();
    if (!raw) return "";
    const key = normalize(raw);
    if (/(대기|예정|확인필요)/.test(key)) return `🟡 ${raw}`;
    if (/(정상|양호|완료|확인|특이이상소견없음|이상소견없음)/.test(key)) return `🟢 ${raw}`;
    return raw;
  }

  function readCachedState() {
    try {
      const raw = localStorage.getItem(STATE_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.state || !parsed?.savedAt) return null;
      if (Date.now() - parsed.savedAt > CACHE_MAX_AGE) return null;
      return parsed.state;
    } catch {
      return null;
    }
  }

  function saveCachedState(state) {
    try {
      localStorage.setItem(STATE_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), state }));
    } catch {}
  }

  function updateGestation(dueDateIso) {
    if (!dueDateIso) return;
    const dueDate = new Date(`${dueDateIso}T00:00:00+09:00`);
    const baseDate = new Date(dueDate);
    baseDate.setDate(baseDate.getDate() - 280);
    const today = new Date();
    const start = (date) => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; };
    const diffDays = (from, to) => Math.floor((start(to) - start(from)) / 86400000);
    const elapsed = Math.max(0, diffDays(baseDate, today));
    const week = Math.floor(elapsed / 7);
    const day = elapsed % 7;
    const dDay = Math.max(0, diffDays(today, dueDate));
    const fruitMap = {
      8:["🍓","라즈베리"],9:["🍒","체리"],10:["🍓","딸기"],11:["🟣","무화과"],12:["🍋","라임"],13:["🍋","레몬"],14:["🍑","복숭아"],15:["🍎","사과"],16:["🥑","아보카도"],17:["🍐","배"],18:["🫑","피망"],19:["🥭","망고"],20:["🍌","바나나"],21:["🥕","당근"],22:["🧡","파파야"],23:["🍊","자몽"],24:["🌽","옥수수"],25:["🥦","콜리플라워"],26:["🥬","상추 한 포기"],27:["🥬","양배추"],28:["🍆","가지"],29:["🎃","버터넛호박"],30:["🥒","오이"],31:["🥥","코코넛"],32:["🎃","단호박"],33:["🍍","파인애플"],34:["🍈","멜론"],35:["🍈","허니듀 멜론"],36:["🥬","로메인 상추"],37:["🥬","근대 한 단"],38:["🌿","대파 한 단"],39:["🍉","작은 수박"],40:["🍉","수박"]
    };
    const fruit = fruitMap[Math.min(40, Math.max(8, week))];
    const value = $("#gestationToday");
    const note = $("#gestationNote");
    if (value) value.textContent = `${week}주 ${day}일`;
    if (note) note.innerHTML = fruit ? `출산까지 D-${dDay} · <span class="fruitInline">${fruit[0]} ${fruit[1]} 크기예요</span>` : `출산까지 D-${dDay}`;
  }

  function updateHero(settings, records, metricMap) {
    const due = $("#dueDateText");
    if (due && settings.due_date) due.textContent = settings.due_date;
    updateGestation(settings.due_date);

    const overall = $(".overall");
    const statusText = $(".statusText");
    const todayLine = $(".todayLine");
    const signal = $(".signal");
    const latest = latestRecord(records);
    if (overall) overall.textContent = settings.overall_status || latest?.report?.overall_status || "기록 확인 중";
    if (statusText) statusText.textContent = settings.status_text || latest?.summary || "최신 진료기록을 불러오고 있습니다.";

    const nextParts = [settings.next_visit_date ? formatDateKo(settings.next_visit_date) : "", settings.next_visit_time, settings.next_visit_title].filter(Boolean);
    if (todayLine) todayLine.textContent = nextParts.length ? `다음 일정: ${nextParts.join(" · ")}` : "다음 일정은 아직 등록되지 않았습니다.";

    if (signal) {
      const karyotype = findMetric(metricMap, ["Karyotype"]);
      const cma = findMetric(metricMap, ["CMA"]);
      if (normalize(karyotype?.value) === "정상" && normalize(cma?.value) === "정상") signal.textContent = "🟢 유전검사 정상";
      else signal.textContent = latest?.report?.signal || "최신 기록 확인";
    }
  }

  function updateMetricCards(settings, metricMap) {
    const weight = findMetric(metricMap, ["추정 체중", "체중"]);
    const sex = findMetric(metricMap, ["성별"]);
    const weightValue = $("#latestWeight");
    const weightNote = $("#latestWeightNote");
    const babyValue = $("#babySex");
    const babyNote = $("#babySexNote");
    const nextValue = $("#nextVisitDate");
    const nextNote = $("#nextVisitNote");

    if (weightValue) weightValue.textContent = weight?.value || "기록 없음";
    if (weightNote) weightNote.textContent = weight?.note || "최근 측정값 기준";
    if (babyValue) babyValue.textContent = sex?.value || "기록 없음";
    if (babyNote) babyNote.textContent = sex?.note || "진료기록 기준";
    if (nextValue) nextValue.textContent = settings.next_visit_date ? formatDateKo(settings.next_visit_date) : "미정";
    if (nextNote) nextNote.textContent = [settings.next_visit_time, settings.next_visit_title].filter(Boolean).join(" · ") || "일정 미등록";
  }

  function googleDrivePreviewUrl(url) {
    const match = text(url).match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
    return match ? `https://drive.google.com/file/d/${match[1]}/preview` : "";
  }

  function renderVideos(records) {
    const host = $("#videoList");
    if (!host) return;
    host.replaceChildren();
    const withVideo = records.filter((record) => text(record.video_url).trim()).sort((a, b) => text(b.visit_date).localeCompare(text(a.visit_date)));
    withVideo.forEach((record, index) => {
      const card = make("article", "card full videoCard");
      const frame = make("div", "videoFrame");
      const drivePreview = googleDrivePreviewUrl(record.video_url);
      if (drivePreview) {
        const iframe = document.createElement("iframe");
        iframe.src = drivePreview;
        iframe.title = `${formatDateKo(record.visit_date)} 초음파 영상`;
        iframe.loading = "lazy";
        iframe.allow = "autoplay; fullscreen";
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.style.width = "100%";
        iframe.style.aspectRatio = "16 / 9";
        iframe.style.border = "0";
        iframe.style.display = "block";
        iframe.style.background = "#000";
        frame.append(iframe);
      } else {
        const video = document.createElement("video");
        video.controls = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.src = record.video_url;
        frame.append(video);
      }
      const caption = make("div", "videoCaption");
      caption.append(make("div", "eyebrow", index === 0 ? "Latest ultrasound video" : "Ultrasound video"), make("strong", "", `${formatDateKo(record.visit_date)} 초음파 영상`), make("p", "", record.summary || record.title));
      card.append(frame, caption);
      host.append(card);
    });
    host.hidden = withVideo.length === 0;
  }

  function renderDashboard(metricMap) {
    const host = $("#statusRows");
    if (!host) return;
    host.replaceChildren();
    const preferred = [
      ["Karyotype", ["Karyotype"]], ["CMA", ["CMA"]], ["양수검사", ["양수검사 종합"]], ["NT", ["NT"]], ["CRL", ["CRL"]], ["추정 체중", ["추정 체중"]], ["성별", ["성별"]]
    ];
    preferred.forEach(([label, aliases]) => {
      const metric = findMetric(metricMap, aliases);
      if (!metric?.value) return;
      const row = make("div", "status");
      const pill = make("span", statusTone(metric.value) === "yellow" ? "pill yellow" : "pill", pillText(metric.value));
      row.append(make("span", "", label), pill);
      host.append(row);
    });
    if (!host.children.length) host.append(make("div", "note", "표시할 검사 결과가 아직 없습니다."));
  }

  function knownReportUrl(date) {
    return new Set(["2026-06-08", "2026-06-25", "2026-07-22"]).has(date) ? `./reports/${date}.html` : "";
  }

  function renderTimeline(records, settings) {
    const host = $(".timeline");
    if (!host) return;
    host.replaceChildren();
    records.slice().sort((a, b) => text(a.visit_date).localeCompare(text(b.visit_date))).forEach((record) => {
      const event = make("div", "event");
      event.append(make("div", "date", `${formatDateKo(record.visit_date)} · ${gestationText(record)}`), make("strong", "", record.title), make("div", "note", record.summary));
      const tags = make("div", "tags");
      if (record.hospital) tags.append(make("span", "tag", record.hospital));
      if (record.status === "completed") tags.append(make("span", "tag", "진료 완료"));
      (record.metrics || []).slice(0, 2).forEach((m) => tags.append(make("span", "tag", `${m.label} ${m.value}`)));
      if (tags.children.length) event.append(tags);
      const link = make("a", "linkBtn", "진료기록 자세히 보기");
      link.href = knownReportUrl(record.visit_date) || `./reports/live.html?date=${encodeURIComponent(record.visit_date)}`;
      event.append(link);
      host.append(event);
    });
    if (settings.next_visit_date) {
      const future = make("div", "event future");
      future.append(make("div", "date", `${formatDateKo(settings.next_visit_date)} 예정`), make("strong", "", settings.next_visit_title || "다음 진료"), make("div", "note", settings.next_visit_time || ""));
      host.append(future);
    }
  }

  function renderChecklist(records, settings) {
    const host = $("#checklistRows");
    if (!host) return;
    host.replaceChildren();
    const latest = latestRecord(records);
    const items = [];
    if (settings.next_visit_date) items.push([`${formatDateKo(settings.next_visit_date)} ${settings.next_visit_time || ""}`.trim(), "다음 진료"]);
    if (settings.next_visit_title) items.push([settings.next_visit_title, "예정"]);
    (latest?.checklist || []).slice(0, 6).forEach((item) => items.push([item, "확인 필요"]));
    items.forEach(([label, status]) => {
      const row = make("div", "status");
      row.append(make("span", "", label), make("span", "pill yellow", status));
      host.append(row);
    });
    if (!items.length) host.append(make("div", "note", "등록된 체크포인트가 없습니다."));
  }

  function renderState(state, source) {
    const settings = state?.settings || {};
    const records = Array.isArray(state?.records) ? state.records : [];
    const metricMap = collectMetrics(records);
    updateHero(settings, records, metricMap);
    updateMetricCards(settings, metricMap);
    renderVideos(records);
    renderDashboard(metricMap);
    renderTimeline(records, settings);
    renderChecklist(records, settings);
    setConnectionStatus(source === "cache" ? "저장된 최신 화면을 즉시 표시 중" : "실시간 진료기록 최신 상태", false);
    document.documentElement.classList.add("bomi-ready");
  }

  function setConnectionStatus(message, warning) {
    const el = $("#bomiLiveStatus");
    if (!el) return;
    el.textContent = message;
    el.style.color = warning ? "#98611b" : "#29786d";
  }

  async function fetchFreshState() {
    const response = await fetch(API_URL, {
      method: "GET",
      mode: "cors",
      cache: "default",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`BOMI API ${response.status}`);
    return response.json();
  }

  async function boot() {
    const cached = readCachedState();
    if (cached) renderState(cached, "cache");
    try {
      const fresh = await fetchFreshState();
      saveCachedState(fresh);
      renderState(fresh, "network");
    } catch (error) {
      console.error("[BOMI Live]", error);
      if (!cached) setConnectionStatus("실시간 기록을 불러오지 못했습니다.", true);
      else setConnectionStatus("저장된 화면 표시 중 · 네트워크 갱신 실패", true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
