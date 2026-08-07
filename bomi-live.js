(() => {
  "use strict";

  const API_URL = "https://bomi-v4.jinihori.workers.dev/api/public/state";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function text(value) {
    return value == null ? "" : String(value);
  }

  function normalize(value) {
    return text(value).replace(/\s+/g, "").toLowerCase();
  }

  function formatDateKo(isoDate) {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-").map(Number);
    if (!year || !month || !day) return isoDate;
    return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
  }

  function gestationText(record) {
    const week = Number(record?.gestation_week);
    const day = Number(record?.gestation_day || 0);
    return Number.isFinite(week) ? `${week}주 ${day}일` : "";
  }

  function latestRecord(records) {
    return records
      .slice()
      .sort((a, b) => text(b.visit_date).localeCompare(text(a.visit_date)))[0] || null;
  }

  function knownReportUrl(visitDate) {
    const known = new Set(["2026-06-08", "2026-06-25", "2026-07-22"]);
    return known.has(visitDate) ? `./reports/${visitDate}.html` : "";
  }

  function make(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = text(value);
    return el;
  }

  function collectMetrics(records) {
    const map = new Map();
    records
      .slice()
      .sort((a, b) => text(b.visit_date).localeCompare(text(a.visit_date)))
      .forEach((record) => {
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

  function pillText(value) {
    const raw = text(value).trim();
    if (!raw) return "";
    const positive = /(정상|양호|완료|확인|특이이상소견없음|이상소견없음)/.test(normalize(raw));
    const pending = /(대기|예정|확인필요)/.test(normalize(raw));
    return `${pending ? "🟡" : positive ? "🟢" : ""}${pending || positive ? " " : ""}${raw}`;
  }

  function updateHero(settings, records, metricMap) {
    const overall = $(".overall");
    const statusText = $(".statusText");
    const todayLine = $(".todayLine");
    const signal = $(".signal");
    const latest = latestRecord(records);

    if (overall && settings.overall_status) overall.textContent = settings.overall_status;
    if (statusText && settings.status_text) statusText.textContent = settings.status_text;

    if (todayLine) {
      const parts = [settings.next_visit_date, settings.next_visit_time, settings.next_visit_title].filter(Boolean);
      if (parts.length) todayLine.textContent = `오늘의 한 줄: ${parts.join(" · ")}`;
    }

    if (signal) {
      const karyotype = findMetric(metricMap, ["Karyotype"]);
      const cma = findMetric(metricMap, ["CMA"]);
      if (normalize(karyotype?.value) === "정상" && normalize(cma?.value) === "정상") {
        signal.textContent = "🟢 유전검사 정상";
      } else if (latest?.report?.signal) {
        signal.textContent = text(latest.report.signal);
      } else if (settings.next_visit_date) {
        signal.textContent = "📅 다음 일정 확정";
      }
    }
  }

  function updateNextVisitMetric(settings) {
    const metricCards = $$(".card.metric");
    const target = metricCards.find((card) => /Amniocentesis|Next visit/i.test($(".label", card)?.textContent || "")) || metricCards[3];
    if (!target) return;

    const icon = $(".icon", target);
    const label = $(".label", target);
    const value = $(".value", target);
    const note = $(".note", target);

    if (icon) icon.textContent = "🩺";
    if (label) label.textContent = "Next visit";
    if (value) value.textContent = settings.next_visit_date ? formatDateKo(settings.next_visit_date) : "미정";
    if (note) note.textContent = [settings.next_visit_time, settings.next_visit_title].filter(Boolean).join(" · ") || "일정을 등록해 주세요";
  }

  function updateStatusDashboard(metricMap) {
    const cards = $$(".card.full");
    const card = cards.find((item) => $("h2", item)?.textContent.trim() === "진료 상태 대시보드");
    if (!card) return;

    const aliases = {
      "Karyotype": ["Karyotype"],
      "CMA": ["CMA"],
      "양수검사": ["양수검사 종합"],
      "NT": ["NT"],
      "성장": ["추정 체중"],
      "Baby": ["성별"]
    };

    $$(":scope > .status", card).forEach((row) => {
      const labelEl = $("span:first-child", row);
      const pill = $(".pill", row);
      if (!labelEl || !pill) return;

      const label = labelEl.textContent.trim();
      const metricAliases = aliases[label] || aliases[Object.keys(aliases).find((key) => normalize(label).includes(normalize(key)))];
      if (!metricAliases) return;

      const metric = findMetric(metricMap, metricAliases);
      if (!metric?.value) return;

      pill.textContent = pillText(metric.value);
      const valueKey = normalize(metric.value);
      pill.classList.toggle("yellow", /(대기|예정|확인필요)/.test(valueKey));
    });
  }

  function buildTimeline(records, settings) {
    const timeline = $(".timeline");
    if (!timeline) return;
    timeline.replaceChildren();

    records
      .slice()
      .sort((a, b) => text(a.visit_date).localeCompare(text(b.visit_date)))
      .forEach((record) => {
        const event = make("div", "event");
        event.append(
          make("div", "date", `${formatDateKo(record.visit_date)} · ${gestationText(record)}`),
          make("strong", "", record.title),
          make("div", "note", record.summary)
        );

        const tags = [];
        if (record.hospital) tags.push(record.hospital);
        if (record.status === "completed") tags.push("진료 완료");
        if (Array.isArray(record.metrics) && record.metrics.length) {
          tags.push(...record.metrics.slice(0, 2).map((item) => `${text(item.label)} ${text(item.value)}`.trim()));
        }

        if (tags.length) {
          const tagsEl = make("div", "tags");
          tags.forEach((tagText) => tagsEl.append(make("span", "tag", tagText)));
          event.append(tagsEl);
        }

        const localReport = knownReportUrl(record.visit_date);
        const detailUrl = localReport || `./reports/live.html?date=${encodeURIComponent(record.visit_date)}`;
        const link = make("a", "linkBtn", "진료기록 자세히 보기");
        link.href = detailUrl;
        event.append(link);
        timeline.append(event);
      });

    if (settings.next_visit_date) {
      const future = make("div", "event future");
      future.append(
        make("div", "date", `${formatDateKo(settings.next_visit_date)} 예정`),
        make("strong", "", settings.next_visit_title || "다음 진료"),
        make("div", "note", settings.next_visit_time || "")
      );
      timeline.append(future);
    }
  }

  function updateChecklist(records, settings) {
    const cards = $$(".card.full");
    const card = cards.find((item) => $("h2", item)?.textContent.trim() === "다음 체크포인트");
    if (!card) return;

    const latest = latestRecord(records);
    const items = [
      settings.next_visit_date ? {
        label: `${formatDateKo(settings.next_visit_date)} ${settings.next_visit_time || ""}`.trim(),
        status: "다음 진료",
        yellow: true
      } : null,
      settings.next_visit_title ? { label: settings.next_visit_title, status: "예정", yellow: true } : null,
      ...(Array.isArray(latest?.checklist) ? latest.checklist.slice(0, 5).map((label) => ({ label, status: "확인 필요", yellow: true })) : [])
    ].filter(Boolean);

    if (!items.length) return;
    $$(":scope > .status", card).forEach((row) => row.remove());
    items.forEach((item) => {
      const row = make("div", "status");
      row.append(make("span", "", item.label), make("span", item.yellow ? "pill yellow" : "pill", item.status));
      card.append(row);
    });
  }

  function addConnectionBadge() {
    if ($("#bomiLiveStatus")) return;
    const footer = $(".footer");
    if (!footer) return;
    const badge = make("div", "", "● 실시간 진료기록 연결됨");
    badge.id = "bomiLiveStatus";
    badge.style.marginTop = "8px";
    badge.style.fontWeight = "800";
    badge.style.color = "#29786d";
    footer.append(badge);
  }

  function showConnectionError(error) {
    console.error("[BOMI Live]", error);
    const footer = $(".footer");
    if (!footer || $("#bomiLiveStatus")) return;
    const badge = make("div", "", "실시간 기록을 불러오지 못했습니다. 기존 화면을 표시합니다.");
    badge.id = "bomiLiveStatus";
    badge.style.marginTop = "8px";
    badge.style.color = "#98611b";
    footer.append(badge);
  }

  async function loadLiveState() {
    const response = await fetch(`${API_URL}?t=${Date.now()}`, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`BOMI API ${response.status}`);

    const state = await response.json();
    const settings = state?.settings || {};
    const records = Array.isArray(state?.records) ? state.records : [];
    const metricMap = collectMetrics(records);

    updateHero(settings, records, metricMap);
    updateNextVisitMetric(settings);
    updateStatusDashboard(metricMap);
    buildTimeline(records, settings);
    updateChecklist(records, settings);
    addConnectionBadge();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => loadLiveState().catch(showConnectionError));
  } else {
    loadLiveState().catch(showConnectionError);
  }
})();
