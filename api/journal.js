import { kv } from "@vercel/kv";
import crypto from "crypto";

const KEY = "aruljeeva:journal:entries";
const MAX_RETURN = 300;

/* ---------------- CORS ---------------- */

// Allow both www and apex
const ALLOWED_ORIGINS = new Set([
  "https://www.aruljeeva.com",
  "https://aruljeeva.com",
]);

function setCors(req, res) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-journal-token");
  res.setHeader("Access-Control-Max-Age", "86400");
}

/* ---------------- Helpers ---------------- */

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
  try { return JSON.parse(s); }
  catch { return null; }
}

function normTag(tag) {
  return String(tag || "").trim();
}

/* ---------------- Handler ---------------- */

export default async function handler(req, res) {
  try {
    setCors(req, res);

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (!isAuthorized(req)) {
      return send(res, 401, { ok: false, error: "Unauthorized" });
    }

    /* ---------- GET ---------- */
    if (req.method === "GET") {
      const date = String(req.query?.date || "").trim();
      const tag = String(req.query?.tag || "").trim();
      const q = String(req.query?.q || "").trim().toLowerCase();

      const raw = await kv.lrange(KEY, 0, MAX_RETURN - 1);
      let entries = raw.map(safeParse).filter(Boolean);

      if (date) entries = entries.filter(e => (e.createdAt || "").slice(0, 10) === date);
      if (tag)  entries = entries.filter(e => String(e.tag || "") === tag);
      if (q)    entries = entries.filter(e =>
        String(e.text || "").toLowerCase().includes(q)
      );

      return send(res, 200, {
        ok: true,
        count: entries.length,
        entries
      });
    }

    /* ---------- POST ---------- */
    if (req.method === "POST") {
      const { text, tag } = req.body || {};
      const cleaned = String(text || "").trim();
      const cleanTag = normTag(tag);

      if (!cleaned)
        return send(res, 400, { ok: false, error: "Text is required" });

      if (cleaned.length > 2500)
        return send(res, 400, { ok: false, error: "Text too long (max 2500 chars)" });

      const entry = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        text: cleaned,
        tag: cleanTag || "Reflection",
        createdAt: new Date().toISOString(),
        updatedAt: null
      };

      await kv.lpush(KEY, JSON.stringify(entry));
      await kv.ltrim(KEY, 0, MAX_RETURN - 1);

      return send(res, 200, { ok: true, entry });
    }

    /* ---------- PUT ---------- */
    if (req.method === "PUT") {
      const { id, text, tag } = req.body || {};
      const entryId = String(id || "").trim();
      const cleaned = String(text || "").trim();
      const cleanTag = normTag(tag);

      if (!entryId)
        return send(res, 400, { ok: false, error: "id is required" });

      if (!cleaned)
        return send(res, 400, { ok: false, error: "text is required" });

      if (cleaned.length > 2500)
        return send(res, 400, { ok: false, error: "Text too long (max 2500 chars)" });

      const raw = await kv.lrange(KEY, 0, MAX_RETURN - 1);
      let entries = raw.map(safeParse).filter(Boolean);

      const idx = entries.findIndex(e => e.id === entryId);
      if (idx === -1)
        return send(res, 404, { ok: false, error: "Entry not found" });

      entries[idx] = {
        ...entries[idx],
        text: cleaned,
        tag: cleanTag || entries[idx].tag || "Reflection",
        updatedAt: new Date().toISOString()
      };

      const pipeline = kv.pipeline();
      pipeline.del(KEY);
      for (const e of entries)
        pipeline.rpush(KEY, JSON.stringify(e));
      await pipeline.exec();

      return send(res, 200, { ok: true, entry: entries[idx] });
    }

    /* ---------- DELETE ---------- */
    if (req.method === "DELETE") {
      const id = String(req.query?.id || "").trim();
      if (!id)
        return send(res, 400, { ok: false, error: "id is required" });

      const raw = await kv.lrange(KEY, 0, MAX_RETURN - 1);
      let entries = raw.map(safeParse).filter(Boolean);

      const before = entries.length;
      entries = entries.filter(e => e.id !== id);

      if (entries.length === before)
        return send(res, 404, { ok: false, error: "Entry not found" });

      const pipeline = kv.pipeline();
      pipeline.del(KEY);
      for (const e of entries)
        pipeline.rpush(KEY, JSON.stringify(e));
      await pipeline.exec();

      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: "Method not allowed" });

  } catch (err) {
    try { setCors(req, res); } catch {}
    return send(res, 500, {
      ok: false,
      error: "Journal API failed",
      detail: String(err?.message || err)
    });
  }
}
