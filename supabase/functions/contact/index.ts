// Domotty · Edge Function "contact"
// Riceve il modulo "Contattaci" da domotty.it o da maistu.it, salva la richiesta e la inoltra via email
// alla casella dell'assistenza del sito giusto (assistenza@domotty.it oppure assistenza@maistu.it).
// L'email interna ha sempre oggetto «[Sito] <tipo> · <nome>» e parte dalla casella stessa: il gestionale
// la riconosce così, e capisce da quale sito arriva dalla casella in cui la trova.
//
// Segreti Domotty: SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO
//   facoltativi: SMTP_HOST (default smtps.register.it), SMTP_PORT (default 465), SITE_URL, ALLOWED_ORIGINS
// Segreti Maistu: MAISTU_SMTP_USER, MAISTU_SMTP_PASS
//   facoltativi: MAISTU_MAIL_FROM (default «Maistu <assistenza@maistu.it>»), MAISTU_MAIL_TO (default assistenza@maistu.it),
//   MAISTU_SMTP_HOST / MAISTU_SMTP_PORT (default quelli Domotty), MAISTU_SITE_URL (default https://maistu.it)
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import nodemailer from "npm:nodemailer@6.9.14";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const ALLOWED = env("ALLOWED_ORIGINS",
  "https://domotty.it,https://www.domotty.it,https://maistu.it,https://www.maistu.it,https://dreamtheatermarco-hub.github.io,https://domotty.github.io")
  .split(",").map((s) => s.trim()).filter(Boolean);
// Il sito si riconosce dal dominio. Dalle pagine di prova su github.io (stessa origine per più siti)
// vale il campo «sito» inviato dal modulo.
const MAISTU_ORIGINS = ["https://maistu.it", "https://www.maistu.it"];
const DOMOTTY_ORIGINS = ["https://domotty.it", "https://www.domotty.it"];
function quale(origin: string | null, campo: unknown): Sito {
  if (origin && MAISTU_ORIGINS.includes(origin)) return "maistu";
  if (origin && DOMOTTY_ORIGINS.includes(origin)) return "domotty";
  return campo === "maistu" ? "maistu" : "domotty";
}

type Sito = "domotty" | "maistu";
interface Conf {
  sito: Sito; nome: string; tipi: string[]; mailTo: string; mailFrom: string; siteUrl: string;
  smtp: { host: string; port: number; user: string; pass: string };
}
function conf(sito: Sito): Conf {
  const host = env("SMTP_HOST", "smtps.register.it"), port = Number(env("SMTP_PORT", "465"));
  if (sito === "maistu") {
    return {
      sito, nome: "Maistu",
      tipi: ["Prova Maistu 15 giorni", "Preventivo piani cloud", "Preventivo Enterprise", "Modulo su misura", "Informazioni generali"],
      mailTo: env("MAISTU_MAIL_TO", "assistenza@maistu.it"),
      mailFrom: env("MAISTU_MAIL_FROM", "Maistu <assistenza@maistu.it>"),
      siteUrl: env("MAISTU_SITE_URL", "https://maistu.it").replace(/\/$/, ""),
      smtp: { host: env("MAISTU_SMTP_HOST", host), port: Number(env("MAISTU_SMTP_PORT", String(port))), user: env("MAISTU_SMTP_USER"), pass: env("MAISTU_SMTP_PASS") },
    };
  }
  return {
    sito, nome: "Domotty",
    tipi: ["Informazioni generali", "Domotica casa o ufficio", "Software su misura", "Gestionale e cloud PMI",
      "Comunicazione omnicanale", "Soluzione per il mio settore", "AI CORE e automazione", "Testimonianza cliente",
      // 5/11/2026: le candidature degli installatori partner (sezione «Installatori» di domotty.it); il gestionale ne fa
      // una categoria dei contatti, come per gli altri tipi
      "Richiesta collaborazione installatori"],
    mailTo: env("MAIL_TO", "assistenza@domotty.it"),
    mailFrom: env("MAIL_FROM"),
    siteUrl: env("SITE_URL", "https://domotty.it").replace(/\/$/, ""),
    smtp: { host, port, user: env("SMTP_USER"), pass: env("SMTP_PASS") },
  };
}

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

// Conferma di ricezione · Domotty (invariata)
function ackDomotty(nome: string, tipo: string, site: string) {
  const first = nome.split(/\s+/)[0] || "";
  const text = `Ciao ${first},\n\ngrazie per averci scritto. Abbiamo ricevuto la tua richiesta «${tipo}» e ti risponderemo al più presto.\n\nSe vuoi aggiungere qualcosa, rispondi pure a questa email.\n\nIl team Domotty\n\nDomotty S.r.l. · Via Monsignor Cherchi 26, 09027 San Sperate (CA)\nInformativa privacy: ${site}/privacy.html`;
  const html = `<div style="background:#0B1A33;padding:36px 16px;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#10223F;border-radius:20px;padding:32px;color:#C3CEE0">
    <p style="font-size:13px;letter-spacing:4px;color:#F7842A;font-weight:bold;margin:0 0 18px">DOMOTTY</p>
    <h1 style="color:#F5F7FB;font-size:26px;margin:0 0 14px">Richiesta ricevuta!</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 14px">Ciao ${esc(first)}, grazie per averci scritto. Abbiamo ricevuto la tua richiesta e ti risponderemo al più presto.</p>
    <p style="margin:0 0 20px"><span style="display:inline-block;background:#F7842A;color:#0B1A33;font-weight:bold;font-size:13px;padding:8px 14px;border-radius:999px">${esc(tipo)}</span></p>
    <p style="font-size:14px;line-height:1.6;margin:0;color:#93A3BE">Se vuoi aggiungere qualcosa, rispondi pure a questa email.</p>
    <p style="font-size:15px;margin:22px 0 0;color:#F5F7FB">Il team Domotty</p>
  </div>
  <p style="max-width:520px;margin:16px auto 0;font-size:12px;color:#93A3BE;text-align:center">Domotty S.r.l. · Via Monsignor Cherchi 26, 09027 San Sperate (CA) · <a href="${site}/privacy.html" style="color:#F7842A">Informativa privacy</a></p>
</div>`;
  return { text, html, subject: "Abbiamo ricevuto la tua richiesta · Domotty" };
}

// Conferma di ricezione · Maistu (stessa veste di maistu-sito/email/sito/conferma-richiesta.html)
function ackMaistu(nome: string, tipo: string, site: string) {
  const first = nome.split(/\s+/)[0] || "";
  const prova = /prova/i.test(tipo);
  const text = `Ciao ${first},\n\ngrazie per averci scritto. Abbiamo ricevuto la tua richiesta «${tipo}» e ti risponderemo al più presto.${prova ? "\n\nNella prossima email ti diremo cosa ci serve per preparare il tuo Maistu di prova." : ""}\n\nSe vuoi aggiungere qualcosa, rispondi pure a questa email.\n\nIl team Maistu · Domotty\n\nMaistu è il gestionale su misura di Domotty.\nDomotty S.r.l. · Via Monsignor Cherchi 26, 09027 San Sperate (CA)\nInformativa privacy: ${site}/privacy.html`;
  const p = (t: string) => `<p style="margin:0 0 14px;color:#C3CEE0;font-size:16px;line-height:1.6;">${t}</p>`;
  const html = maistuLayout(site, "Richiesta ricevuta!", [
    p(`Ciao ${esc(first)}, grazie per averci scritto. Abbiamo ricevuto la tua richiesta e ti risponderemo al più presto.`),
    `<p style="margin:4px 0 20px;"><span style="display:inline-block;background:#F7842A;color:#0B1A33;font-weight:700;font-size:13px;padding:8px 14px;border-radius:999px;">${esc(tipo)}</span></p>`,
    prova ? p("Nella prossima email ti diremo cosa ci serve per preparare il tuo Maistu di prova.") : "",
    `<p style="margin:18px 0 0;color:#93A3BE;font-size:13px;line-height:1.5;">Se vuoi aggiungere qualcosa, rispondi pure a questa email.</p>`,
    `<p style="margin:20px 0 0;padding-top:14px;border-top:1px dashed #2F4E7C;color:#93A3BE;font-size:14px;line-height:1.5;">Il team Maistu · Domotty</p>`,
  ].join(""));
  return { text, html, subject: "Abbiamo ricevuto la tua richiesta · Maistu" };
}
function maistuLayout(site: string, titolo: string, corpo: string) {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark light"><title>${esc(titolo)}</title></head>
<body style="margin:0;padding:0;background:#0B1A33;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B1A33;"><tr><td align="center" style="padding:28px 16px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:584px;">
<tr><td style="padding:0 4px 18px;"><a href="${site}" style="text-decoration:none;"><img src="${site}/assets/img/email/maistu-logo-email.png" width="200" height="71" alt="Maistu · Il gestionale su misura" style="display:block;border:0;width:200px;height:auto;color:#F5F7FB;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;letter-spacing:6px;"></a></td></tr>
<tr><td style="background:#10223F;border:1px solid #23406A;border-radius:20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:22px 32px 0;"><img src="${site}/assets/img/email/maistu-cornice-email.png" width="120" height="6" alt="" style="display:block;border:0;width:120px;height:6px;"></td></tr>
<tr><td style="padding:16px 32px 30px;font-family:Poppins,Arial,Helvetica,sans-serif;">
<p style="margin:0 0 14px;color:#F7842A;font-family:'JetBrains Mono',Consolas,'Courier New',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Il gestionale su misura</p>
<h1 style="margin:0 0 16px;color:#F5F7FB;font-size:26px;line-height:1.25;font-weight:700;">${esc(titolo)}</h1>
${corpo}
</td></tr></table></td></tr>
<tr><td style="padding:18px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#93A3BE;"><span style="color:#C3CEE0;">Maistu</span> è il gestionale su misura di Domotty.<br>Domotty S.r.l. · Via Monsignor Cherchi 26, 09027 San Sperate (CA)<br><a href="${site}" style="color:#F7842A;text-decoration:none;">maistu.it</a> · <a href="${site}/privacy.html" style="color:#F7842A;">Informativa privacy</a></td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const h = cors(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405, h);
  if (origin && !ALLOWED.includes(origin)) return json({ ok: false, error: "origin" }, 403, h);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400, h); }

  // Honeypot anti-spam: i bot compilano il campo nascosto, le persone no.
  if (clean(b.website, 200)) return json({ ok: true }, 200, h);

  const sito = quale(origin, b.sito);
  const c = conf(sito);

  const data = {
    sito,
    tipo: c.tipi.includes(String(b.tipo)) ? String(b.tipo) : "Informazioni generali",
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
      host: c.smtp.host, port: c.smtp.port, secure: true, auth: { user: c.smtp.user, pass: c.smtp.pass },
    });
    // Email interna: stesso formato per entrambi i siti (lo legge il gestionale).
    const rows: [string, string | null][] = [
      ["Tipo di richiesta", data.tipo], ["Nome e cognome", data.nome], ["Email", data.email],
      ["Azienda", data.azienda], ["Telefono", data.telefono],
    ];
    const text = rows.map(([k, v]) => `${k}: ${v ?? "—"}`).join("\n") + `\n\nMessaggio:\n${data.messaggio ?? "—"}\n\nID richiesta: ${row.id}`;
    const htmlBody = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0F1F3D">
      <h2 style="color:#F7842A;margin:0 0 12px">Nuova richiesta dal sito ${esc(c.nome)}</h2>
      <table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, v]) =>
        `<tr><td style="color:#5B6B86">${esc(k)}</td><td><b>${esc(v ?? "—")}</b></td></tr>`).join("")}</table>
      <p style="margin-top:16px;color:#5B6B86">Messaggio</p>
      <p style="white-space:pre-wrap;background:#F5F7FB;padding:14px;border-radius:10px">${esc(data.messaggio ?? "—")}</p>
      <p style="color:#93A3BE;font-size:12px">ID richiesta: ${row.id} · Rispondi a questa email per scrivere direttamente al cliente.</p></div>`;
    await tx.sendMail({
      from: c.mailFrom, to: c.mailTo, replyTo: data.email,
      subject: `[Sito] ${data.tipo} · ${data.nome}`, text, html: htmlBody,
    });
    await db.from("contact_requests").update({ email_sent: true }).eq("id", row.id);

    // Conferma di ricezione a chi ha scritto. Non ripetiamo il messaggio inviato,
    // così il modulo non può essere usato per spedire testi a indirizzi altrui.
    const ack = sito === "maistu" ? ackMaistu(data.nome.slice(0, 60), data.tipo, c.siteUrl) : ackDomotty(data.nome.slice(0, 60), data.tipo, c.siteUrl);
    await tx.sendMail({ from: c.mailFrom, to: data.email, replyTo: c.mailTo, subject: ack.subject, text: ack.text, html: ack.html });
  } catch (e) {
    // La richiesta è comunque salvata nel database.
    console.error("smtp", e);
  }
  return json({ ok: true }, 200, h);
});
