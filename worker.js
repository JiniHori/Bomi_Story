export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/notes") {
      if (request.method === "GET") return getNotes(request, env);
      if (request.method === "POST") return createNote(request, env);
      return json({ error: "Method not allowed" }, 405);
    }

    return env.ASSETS.fetch(request);
  }
};

async function getNotes(request, env) {
  const url = new URL(request.url);
  const visitDate = url.searchParams.get("visit_date");

  let result;
  if (visitDate) {
    result = await env.DB.prepare(
      "SELECT id, visit_date, author, message, created_at, updated_at FROM notes WHERE visit_date = ? ORDER BY created_at DESC"
    ).bind(visitDate).all();
  } else {
    result = await env.DB.prepare(
      "SELECT id, visit_date, author, message, created_at, updated_at FROM notes ORDER BY created_at DESC LIMIT 100"
    ).all();
  }

  return json({ notes: result.results || [] });
}

async function createNote(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const visitDate = String(body.visit_date || "").trim();
  const author = String(body.author || "").trim();
  const message = String(body.message || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
    return json({ error: "visit_date must be YYYY-MM-DD" }, 400);
  }
  if (!["엄마", "아빠", "봄이에게"].includes(author)) {
    return json({ error: "Invalid author" }, 400);
  }
  if (!message || message.length > 2000) {
    return json({ error: "Message must be 1-2000 characters" }, 400);
  }

  const result = await env.DB.prepare(
    "INSERT INTO notes (visit_date, author, message, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now')) RETURNING id"
  ).bind(visitDate, author, message).first();

  return json({ ok: true, id: result.id }, 201);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
