// Domotty · Edge Function "contact"
// Riceve il modulo "Contattaci" dal sito, salva la richiesta e la inoltra via email.
// Segreti richiesti: SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO
// Facoltativi: SMTP_HOST (default smtps.register.it), SMTP_PORT (default 465), ALLOWED_ORIGINS
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import nodemailer from "npm:nodemailer@6.9.14";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const ALLOWED = env("ALLOWED_ORIGINS", "https://domotty.it,https://www.domotty.it,https://dreamtheatermarco-hub.github.io")
  .split(",").map((s) => s.trim()).filter(Boolean);
const TYPES = [
  "Informazioni generali", "Domotica casa o ufficio", "Software su misura", "Gestionale e cloud PMI",
  "Comunicazione omnicanale", "Soluzione per il mio settore", "AI CORE e automazione", "Testimonianza cliente",
];

function cors(origin: string | null) {
  const allow = origin && ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Vary": "Origin",
  };
}
const json = (body: unknown, status: number, h: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...h, "Content-Type": "application/json" } });
const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405, h);
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED.includes(origin)) return json({ ok: false, error: "origin" }, 403, h);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400, h); }

  // Honeypot anti-spam: i bot compilano il campo nascosto, le persone no.
  if (clean(b.website, 200)) return json({ ok: true }, 200, h);

  const data = {
    tipo: TYPES.includes(String(b.tipo)) ? String(b.tipo) : "Informazioni generali",
    nome: clean(b.nome, 120),
    email: clean(b.email, 200).toLowerCase(),
    azienda: clean(b.azienda, 160) || null,
    telefono: clean(b.telefono, 40) || null,
    messaggio: clean(b.messaggio, 5000) || null,
    privacy_ack: b.privacy === true,
  };
  if (!data.nome || !EMAIL_RE.test(data.email) || !data.privacy_ack) return json({ ok: false, error: "invalid" }, 422, h);

  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

  // Limite semplice: massimo 3 richieste in 10 minuti dalla stessa email.
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await db.from("contact_requests").select("id", { count: "exact", head: true })
    .eq("email", data.email).gte("created_at", since);
  if ((count ?? 0) >= 3) return json({ ok: false, error: "rate_limited" }, 429, h);

  const { data: row, error } = await db.from("contact_requests").insert(data).select("id").single();
  if (error) { console.error(error); return json({ ok: false, error: "db" }, 500, h); }

  try {
    const tx = nodemailer.createTransport({
      host: env("SMTP_HOST", "smtps.register.it"), port: Number(env("SMTP_PORT", "465")), secure: true,
      auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") },
    });
    const rows: [string, string | null][] = [
      ["Tipo di richiesta", data.tipo], ["Nome e cognome", data.nome], ["Email", data.email],
      ["Azienda", data.azienda], ["Telefono", data.telefono],
    ];
    const text = rows.map(([k, v]) => `${k}: ${v ?? "—"}`).join("\n") + `\n\nMessaggio:\n${data.messaggio ?? "—"}\n\nID richiesta: ${row.id}`;
    const htmlBody = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0F1F3D">
      <h2 style="color:#F7842A;margin:0 0 12px">Nuova richiesta dal sito</h2>
      <table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, v]) =>
        `<tr><td style="color:#5B6B86">${esc(k)}</td><td><b>${esc(v ?? "—")}</b></td></tr>`).join("")}</table>
      <p style="margin-top:16px;color:#5B6B86">Messaggio</p>
      <p style="white-space:pre-wrap;background:#F5F7FB;padding:14px;border-radius:10px">${esc(data.messaggio ?? "—")}</p>
      <p style="color:#93A3BE;font-size:12px">ID richiesta: ${row.id} · Rispondi a questa email per scrivere direttamente al cliente.</p></div>`;
    await tx.sendMail({
      from: env("MAIL_FROM"), to: env("MAIL_TO", "assistenza@domotty.it"), replyTo: data.email,
      subject: `[Sito] ${data.tipo} · ${data.nome}`, text, html: htmlBody,
    });
    await db.from("contact_requests").update({ email_sent: true }).eq("id", row.id);
  } catch (e) {
    // La richiesta è comunque salvata nel database: la vedrai nel pannello admin.
    console.error("smtp", e);
  }
  return json({ ok: true }, 200, h);
});
