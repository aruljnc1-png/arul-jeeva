import { kv } from "@vercel/kv";
import crypto from "crypto";

const KEY = "aruljeeva:journal:entries";
const MAX_RETURN = 300;

// Optional token gate (recommended)
// Set this in Vercel env vars: JOURNAL_TOKEN=1111 (or a longer secret)
// Frontend will send header x-journal-token
const TOKEN = process.env.JOURNAL_TOKEN || "";

function send(res, status, obj) {
  res.status(status).json(obj);
}

function isAuthorized(req) {
  if (!TOKEN) return true;
  const got = req.headers["x-journal-token"];
  return got === TOKEN;
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function normTag(tag) {
  return String(tag || "").trim();
}

export default async function handler(req, res) {
  try {
    if (!isAuthorized(req)) {
      return send(res, 401, { ok: false, error: "Unauthorized" });
    }

    if (req.method === "GET") {
      const date = String(req.query?.date || "").trim();      // YYYY-MM-DD optional
      const tag = String(req.query?.tag || "").trim();        // optional
      const q = String(req.query?.q || "").trim().toLowerCase(); // optional text search

      const raw = await kv.lrange(KEY, 0, MAX_RETURN - 1);
      let entries = raw.map(safeParse).filter(Boolean);

      if (date) entries = entries.filter(e => (e.createdAt || "").slice(0,10) === date);
      if (tag)  entries = entries.filter(e => String(e.tag || "") === tag);
      if (q)    entries = entries.filter(e => String(e.text || "").toLowerCase().includes(q));

      return send(res, 200, { ok: true, count: entries.length, entries });
    }

    if (req.method === "POST") {
      const { text, tag } = req.body || {};
      const cleaned = String(text || "").trim();
      const cleanTag = normTag(tag);

      if (!cleaned) return send(res, 400, { ok: false, error: "Text is required" });
      if (cleaned.length > 2500) return send(res, 400, { ok: false, error: "Text too long (max 2500 chars)" });

      const entry = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        text: cleaned,
        tag: cleanTag || "Reflection",
        createdAt: new Date().toISOString(),
        updatedAt: null
      };

      // latest first
      await kv.lpush(KEY, JSON.stringify(entry));
      await kv.ltrim(KEY, 0, MAX_RETURN - 1);

      return send(res, 200, { ok: true, entry });
    }

    if (req.method === "PUT") {
      const { id, text, tag } = req.body || {};
      const entryId = String(id || "").trim();
      const cleaned = String(text || "").trim();
      const cleanTag = normTag(tag);

      if (!entryId) return send(res, 400, { ok: false, error: "id is required" });
      if (!cleaned) return send(res, 400, { ok: false, error: "text is required" });
      if (cleaned.length > 2500) return send(res, 400, { ok: false, error: "Text too long (max 2500 chars)" });

      // read list, update in-place, write back
      const raw = await kv.lrange(KEY, 0, MAX_RETURN - 1);
      let entries = raw.map(safeParse).filter(Boolean);

      const idx = entries.findIndex(e => e.id === entryId);
      if (idx === -1) return send(res, 404, { ok: false, error: "Entry not found" });

      entries[idx] = {
        ...entries[idx],
        text: cleaned,
        tag: cleanTag || entries[idx].tag || "Reflection",
        updatedAt: new Date().toISOString()
      };

      // overwrite list (keep ordering)
      const pipeline = kv.pipeline();
      pipeline.del(KEY);
      for (const e of entries) pipeline.rpush(KEY, JSON.stringify(e));
      await pipeline.exec();

      return send(res, 200, { ok: true, entry: entries[idx] });
    }

    if (req.method === "DELETE") {
      const id = String(req.query?.id || "").trim();
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      const raw = await kv.lrange(KEY, 0, MAX_RETURN - 1);
      let entries = raw.map(safeParse).filter(Boolean);

      const before = entries.length;
      entries = entries.filter(e => e.id !== id);

      if (entries.length === before) return send(res, 404, { ok: false, error: "Entry not found" });

      const pipeline = kv.pipeline();
      pipeline.del(KEY);
      for (const e of entries) pipeline.rpush(KEY, JSON.stringify(e));
      await pipeline.exec();

      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: "Method not allowed" });

  } catch (err) {
    return send(res, 500, { ok: false, error: "Journal API failed", detail: String(err?.message || err) });
  }
}
