(() => {
  "use strict";

  const API_URL = "https://bomi-v4.jinihori.workers.dev/api/public/state";
  const BACKEND_ORIGIN = "https://bomi-v4.jinihori.workers.dev";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function text(value) {
    return value == null ? "" : String(value);
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

  function knownReportUrl(visitDate) {
    const known = new Set([
      "2026-06-08",
      "2026-06-25",
      "2026-07-22",
      "2026-08-06"
    ]);
    return known.has(visitDate) ? `./reports/${visitDate}.html` : "";
  }

  function make(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = text(value);
    return el;
  }

  function updateHero(settings) {
    const overall = $(".overall");
    const statusText = $(".statusText");
    const todayLine = $(".todayLine");
    const signal = $(".signal");

    if (overall && settings.overall_status) {
      overall.textContent = settings.overall_status;
    }
    if (statusText && settings.status_text) {
      statusText.textContent = settings.status_text;
    }
    if (todayLine) {
      const parts = [
        settings.next_visit_date,
        settings.next_visit_time,
        settings.next_visit_title
      ].filter(Boolean);
      if (parts.length) {
        todayLine.textContent = `오늘의 한 줄: ${parts.join(" · ")}`;
      }
    }
    if (signal && settings.next_visit_date) {
      signal.textContent = "📅 다음 일정 확정";
    }
  }

  function updateNextVisitMetric(settings) {
    const metricCards = $$(".card.metric");
    const target =
      metricCards.find((card) => /Amniocentesis|Next visit/i.test($(".label", card)?.textContent || "")) ||
      metricCards[3];

    if (!target) return;

    const icon = $(".icon", target);
    const label = $(".label", target);
    const value = $(".value", target);
    const note = $(".note", target);

    if (icon) icon.textContent = "🩺";
    if (label) label.textContent = "Next visit";
    if (value) value.textContent = settings.next_visit_date ? formatDateKo(settings.next_visit_date) : "미정";
    if (note) {
      note.textContent = [settings.next_visit_time, settings.next_visit_title]
        .filter(Boolean)
        .join(" · ") || "일정을 등록해 주세요";
    }
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
        const date = make(
          "div",
          "date",
          `${formatDateKo(record.visit_date)} · ${gestationText(record)}`
        );
        const title = make("strong", "", record.title);
        const note = make("div", "note", record.summary);

        event.append(date, title, note);

        const tags = [];
        if (record.hospital) tags.push(record.hospital);
        if (record.status === "completed") tags.push("진료 완료");
        if (Array.isArray(record.metrics) && record.metrics.length) {
          tags.push(...record.metrics.slice(0, 2).map((item) => `${text(item.label)} ${text(item.value)}`.trim()));
        }

        if (tags.length) {
          const tagsEl = make("div", "tags");
          tags.forEach((tagText, index) => {
            tagsEl.append(make("span", index === tags.length - 1 && record.status !== "completed" ? "tag yellow" : "tag", tagText));
          });
          event.append(tagsEl);
        }

        const localReport = knownReportUrl(record.visit_date);
        const detailUrl = localReport || (record.id ? `${BACKEND_ORIGIN}/record/${record.id}` : "");

        if (detailUrl) {
          const link = make("a", "linkBtn", "진료기록 자세히 보기");
          link.href = detailUrl;
          if (!localReport) {
            link.target = "_blank";
            link.rel = "noopener";
          }
          event.append(link);
        }

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

    const latest = records
      .slice()
      .sort((a, b) => text(b.visit_date).localeCompare(text(a.visit_date)))[0];

    const items = [
      settings.next_visit_date
        ? {
            label: `${formatDateKo(settings.next_visit_date)} ${settings.next_visit_time || ""}`.trim(),
            status: "다음 진료",
            yellow: true
          }
        : null,
      settings.next_visit_title
        ? { label: settings.next_visit_title, status: "예정", yellow: true }
        : null,
      ...(Array.isArray(latest?.checklist)
        ? latest.checklist.slice(0, 4).map((label) => ({
            label,
            status: "확인 필요",
            yellow: true
          }))
        : [])
    ].filter(Boolean);

    if (!items.length) return;

    $$(":scope > .status", card).forEach((row) => row.remove());

    items.forEach((item) => {
      const row = make("div", "status");
      const label = make("span", "", item.label);
      const pill = make("span", item.yellow ? "pill yellow" : "pill", item.status);
      row.append(label, pill);
      card.append(row);
    });
  }

  function addConnectionBadge() {
    if ($("#bomiLiveStatus")) return;
    const footer = $(".footer");
    if (!footer) return;

    const badge = make("div", "", "● 실시간 기록 연결");
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

    if (!response.ok) {
      throw new Error(`BOMI API ${response.status}`);
    }

    const state = await response.json();
    const settings = state?.settings || {};
    const records = Array.isArray(state?.records) ? state.records : [];

    updateHero(settings);
    updateNextVisitMetric(settings);
    buildTimeline(records, settings);
    updateChecklist(records, settings);
    addConnectionBadge();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      loadLiveState().catch(showConnectionError);
    });
  } else {
    loadLiveState().catch(showConnectionError);
  }
})();
