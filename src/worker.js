import { DurableObject } from "cloudflare:workers";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

const MAX_BODY_BYTES = 300_000;
const SYNC_ID_PATTERN = /^BOMI(?:-[A-Z2-9]{4}){2}$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function normalizeSyncId(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "-");
}

async function readJson(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  return text ? JSON.parse(text) : {};
}

function validEntry(value) {
  return value &&
    Number.isFinite(value.updatedAt) &&
    value.updatedAt > 0 &&
    typeof value.iv === "string" && value.iv.length <= 64 &&
    typeof value.ciphertext === "string" && value.ciphertext.length <= 40_000;
}

export class PrepSyncStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.storage = ctx.storage;
  }

  async fetch(request) {
    if (request.method !== "POST") return json({ error: "허용되지 않은 요청입니다." }, 405);

    const url = new URL(request.url);
    if (url.pathname === "/initialize") {
      if (!await this.storage.get("initialized")) await this.storage.put("initialized", Date.now());
      return json({ ok: true }, 201);
    }

    if (!await this.storage.get("initialized")) return json({ error: "동기화 코드를 찾을 수 없습니다." }, 404);

    if (url.pathname === "/pull") {
      const snapshot = await this.storage.get("snapshot") || { version: 1, items: {}, updatedAt: 0 };
      return json({ snapshot });
    }

    if (url.pathname === "/push") {
      let body;
      try {
        body = await readJson(request);
      } catch (error) {
        return json({ error: error.message === "PAYLOAD_TOO_LARGE" ? "저장 데이터가 너무 큽니다." : "저장 형식이 올바르지 않습니다." }, 400);
      }

      const incoming = body.snapshot;
      if (!incoming || typeof incoming.items !== "object" || Array.isArray(incoming.items)) {
        return json({ error: "동기화 데이터가 올바르지 않습니다." }, 400);
      }

      const current = await this.storage.get("snapshot") || { version: 1, items: {}, updatedAt: 0 };
      const merged = { version: 1, items: { ...current.items }, updatedAt: current.updatedAt || 0 };

      for (const [taskId, entry] of Object.entries(incoming.items)) {
        if (!/^[a-z0-9-]{2,80}$/i.test(taskId) || !validEntry(entry)) continue;
        const existing = merged.items[taskId];
        if (!existing || entry.updatedAt > existing.updatedAt) merged.items[taskId] = entry;
      }

      merged.updatedAt = Date.now();
      await this.storage.put("snapshot", merged);
      return json({ snapshot: merged });
    }

    return json({ error: "요청 경로를 찾을 수 없습니다." }, 404);
  }
}

async function prepApi(request, env) {
  if (request.method !== "POST") return json({ error: "허용되지 않은 요청입니다." }, 405);

  const url = new URL(request.url);
  if (url.pathname === "/api/prep/sync/create") {
    let body;
    try {
      body = await readJson(request);
    } catch (error) {
      return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
    }
    const syncId = normalizeSyncId(body.syncId);
    if (!SYNC_ID_PATTERN.test(syncId)) return json({ error: "동기화 식별자를 확인해 주세요." }, 400);
    const stub = env.PREP_SYNC.getByName(`prep-v2:${syncId}`);
    await stub.fetch("https://prep-sync.internal/initialize", { method: "POST" });
    return json({ ok: true }, 201);
  }

  if (!["/api/prep/sync/pull", "/api/prep/sync/push"].includes(url.pathname)) {
    return json({ error: "요청 경로를 찾을 수 없습니다." }, 404);
  }

  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ error: error.message === "PAYLOAD_TOO_LARGE" ? "저장 데이터가 너무 큽니다." : "요청 형식이 올바르지 않습니다." }, 400);
  }

  const syncId = normalizeSyncId(body.syncId);
  if (!SYNC_ID_PATTERN.test(syncId)) return json({ error: "동기화 식별자를 확인해 주세요." }, 400);

  const stub = env.PREP_SYNC.getByName(`prep-v2:${syncId}`);
  const target = url.pathname.endsWith("/push") ? "/push" : "/pull";
  const payload = target === "/push" ? JSON.stringify({ snapshot: body.snapshot }) : "{}";
  return stub.fetch(`https://prep-sync.internal${target}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
  });
}

async function strollerPage(request, env) {
  const assetResponse = await env.ASSETS.fetch(request);
  if (!assetResponse.ok) return assetResponse;

  const contentType = assetResponse.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return assetResponse;

  let html = await assetResponse.text();
  html = html
    .replace(
      "https://www.bugaboo.com/on/demandware.static/-/Sites-masterCatalog_Bugaboo/default/dw0b8f51f1/images/large/1000x1000_fox5renew_taupemelange_black.jpg",
      "/assets/stroller-fox5.svg"
    )
    .replace(
      "https://arvana.gr/image/cache/catalog/INGLESINA/APTICA%20XT%20NC/1%20%28%CE%9A%CE%9A%CE%9A7%29-1-500x500.jpg",
      "/assets/stroller-aptica-xt.svg"
    )
    .replace(
      "https://godomall.speedycdn.net/4b7407a938ffaff76ad1aa1152b36f77/goods/1000000434/image/detail/1000000434_detail_112.jpg",
      "/assets/stroller-melio-carbon.svg"
    );

  const headers = new Headers(assetResponse.headers);
  headers.set("cache-control", "no-cache");
  return new Response(html, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/prep/")) return prepApi(request, env);
    if (url.pathname === "/stroller.html") return strollerPage(request, env);
    return env.ASSETS.fetch(request);
  },
};
