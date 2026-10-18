// Domotty · Edge Function "newsletter"
// Azioni: subscribe (invia l'email di conferma), confirm, unsubscribe.
// Segreti richiesti: SMTP_USER, SMTP_PASS, MAIL_FROM
// Facoltativi: SMTP_HOST (default smtps.register.it), SMTP_PORT (default 465), SITE_URL, ALLOWED_ORIGINS
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import nodemailer from "npm:nodemailer@6.9.14";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const SITE = env("SITE_URL", "https://domotty.it").replace(/\/$/, "");
const ALLOWED = env("ALLOWED_ORIGINS", "https://domotty.it,https://www.domotty.it,https://dreamtheatermarco-hub.github.io")
  .split(",").map((s) => s.trim()).filter(Boolean);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TOKEN_RE = /^[A-Za-z0-9-]{20,80}$/;

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
const token = () => crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "").slice(0, 8);

function confirmEmail(link: string) {
  const text = `Ciao!\n\nGrazie per esserti iscritto alla newsletter Domotty.\nPer confermare l'iscrizione apri questo link:\n${link}\n\nSe non sei stato tu, ignora questa email: senza conferma non riceverai nulla.\n\nDomotty S.r.l. · Via Monsignor Cherchi 26, 09027 San Sperate (CA)\nInformativa privacy: ${SITE}/privacy.html`;
  const html = `<div style="background:#0B1A33;padding:36px 16px;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#10223F;border-radius:20px;padding:32px;color:#C3CEE0">
    <p style="font-size:13px;letter-spacing:4px;color:#F7842A;font-weight:bold;margin:0 0 18px">DOMOTTY</p>
    <h1 style="color:#F5F7FB;font-size:26px;margin:0 0 14px">Conferma la tua iscrizione</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px">Grazie per esserti iscritto alla newsletter Domotty: novità su domotica, software, automazione e IA. Poche email, solo quando hanno qualcosa da dire.</p>
    <a href="${link}" style="display:inline-block;background:#F7842A;color:#0B1A33;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px">Conferma l'iscrizione</a>
    <p style="font-size:13px;line-height:1.6;margin:24px 0 0;color:#93A3BE">Se non sei stato tu, ignora questa email: senza conferma non riceverai nulla.</p>
  </div>
  <p style="max-width:520px;margin:16px auto 0;font-size:12px;color:#93A3BE;text-align:center">Domotty S.r.l. · Via Monsignor Cherchi 26, 09027 San Sperate (CA) · <a href="${SITE}/privacy.html" style="color:#F7842A">Informativa privacy</a></p>
</div>`;
  return { text, html };
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405, h);
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED.includes(origin)) return json({ ok: false, error: "origin" }, 403, h);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400, h); }
  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const action = String(b.action || "subscribe");

  if (action === "confirm" || action === "unsubscribe") {
    const t = String(b.token || "");
    if (!TOKEN_RE.test(t)) return json({ ok: false, error: "token" }, 400, h);
    if (action === "confirm") {
      const { data, error } = await db.from("newsletter_subscribers")
        .update({ status: "active", confirmed_at: new Date().toISOString(), confirm_token: null })
        .eq("confirm_token", t).select("id");
      if (error) { console.error(error); return json({ ok: false, error: "db" }, 500, h); }
      if (!data?.length) return json({ ok: false, error: "token" }, 404, h);
      return json({ ok: true }, 200, h);
    }
    const { data, error } = await db.from("newsletter_subscribers")
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString(), confirm_token: null })
      .eq("unsubscribe_token", t).select("id");
    if (error) { console.error(error); return json({ ok: false, error: "db" }, 500, h); }
    if (!data?.length) return json({ ok: false, error: "token" }, 404, h);
    return json({ ok: true }, 200, h);
  }

  // subscribe
  if (String(b.website || "")) return json({ ok: true }, 200, h); // honeypot
  const email = String(b.email || "").trim().toLowerCase().slice(0, 200);
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: "invalid" }, 422, h);

  const { data: existing } = await db.from("newsletter_subscribers")
    .select("id,status,confirm_sent_at").eq("email", email).maybeSingle();
  // Già iscritto e confermato: rispondiamo ok senza rivelare nulla.
  if (existing?.status === "active") return json({ ok: true }, 200, h);
  // Evita invii ripetuti: al massimo una email di conferma ogni 2 minuti.
  if (existing?.confirm_sent_at && Date.now() - new Date(existing.confirm_sent_at).getTime() < 2 * 60 * 1000) {
    return json({ ok: true }, 200, h);
  }

  const ct = token();
  const now = new Date().toISOString();
  const res = existing
    ? await db.from("newsletter_subscribers").update({ status: "pending", confirm_token: ct, confirm_sent_at: now, unsubscribed_at: null }).eq("id", existing.id)
    : await db.from("newsletter_subscribers").insert({ email, status: "pending", confirm_token: ct, confirm_sent_at: now });
  if (res.error) { console.error(res.error); return json({ ok: false, error: "db" }, 500, h); }

  try {
    const tx = nodemailer.createTransport({
      host: env("SMTP_HOST", "smtps.register.it"), port: Number(env("SMTP_PORT", "465")), secure: true,
      auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") },
    });
    const { text, html } = confirmEmail(`${SITE}/conferma.html?t=${ct}`);
    await tx.sendMail({ from: env("MAIL_FROM"), to: email, subject: "Conferma la tua iscrizione alla newsletter Domotty", text, html });
  } catch (e) {
    console.error("smtp", e);
    return json({ ok: false, error: "smtp" }, 502, h);
  }
  return json({ ok: true }, 200, h);
});
