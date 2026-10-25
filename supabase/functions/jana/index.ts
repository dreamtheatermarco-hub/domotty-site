// Domotty · Edge Function "jana"
// Jana di prova sul sito: risponde con Claude e comanda la casa dimostrativa disegnata nel sito.
// Il testo delle conversazioni NON viene salvato: in database restano solo conteggi anonimi per i limiti.
//
// Segreto richiesto: ANTHROPIC_API_KEY  (Supabase > Edge Functions > Secrets)
// Facoltativi:
//   JANA_MODEL                  modello Claude (default claude-sonnet-5-5)
//   JANA_MAX_MESSAGES           messaggi per conversazione (default 20)
//   JANA_MAX_CONVERSATIONS_DAY  conversazioni totali al giorno (default 30)
//   JANA_MAX_CONVERSATIONS_IP   conversazioni al giorno dallo stesso dispositivo/rete (default 3)
//   JANA_MAX_TOKENS             lunghezza massima della risposta (default 500)
//   ALLOWED_ORIGINS             siti autorizzati, separati da virgola
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { CONTESTO } from "./contesto.ts";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const num = (k: string, d: number) => { const n = parseInt(env(k), 10); return Number.isFinite(n) && n > 0 ? n : d; };
const ALLOWED = env("ALLOWED_ORIGINS", "https://domotty.it,https://www.domotty.it,https://dreamtheatermarco-hub.github.io")
  .split(",").map((s) => s.trim()).filter(Boolean);
const MODEL = env("JANA_MODEL", "claude-sonnet-5-5");
const MAX_MSG = num("JANA_MAX_MESSAGES", 20);
const MAX_DAY = num("JANA_MAX_CONVERSATIONS_DAY", 30);
const MAX_IP = num("JANA_MAX_CONVERSATIONS_IP", 3);
const MAX_TOKENS = num("JANA_MAX_TOKENS", 500);

const ROOMS = ["soggiorno", "cucina", "camera", "bagno", "studio", "tecnico", "giardino", "tutte"];
const TOOL = {
  name: "rispondi",
  description: "Rispondi all'utente e, se serve, comanda la casa dimostrativa.",
  input_schema: {
    type: "object",
    properties: {
      risposta: { type: "string", description: "Il testo che Jana dice all'utente: italiano, breve (1-3 frasi), senza markdown." },
      azioni: {
        type: "array",
        description: "Comandi da eseguire nella casa di prova, in ordine. Lista vuota se non serve.",
        items: {
          type: "object",
          properties: {
            tipo: { type: "string", enum: ["luci", "tapparelle", "clima", "allarme", "elettrodomestico", "scenario"] },
            stanza: { type: "string", enum: ROOMS, description: "Per luci e tapparelle. 'tutte' = tutta la casa." },
            valore: { type: "number", description: "Luci: luminosità 0-100 (0 = spente). Tapparelle: apertura 0-100 (0 = chiuse, 100 = aperte)." },
            acceso: { type: "boolean", description: "Clima, allarme (true = inserito), elettrodomestico." },
            modalita: { type: "string", enum: ["caldo", "freddo", "auto"], description: "Solo clima." },
            temperatura: { type: "number", description: "Solo clima, tra 16 e 28." },
            nome: { type: "string", enum: ["lavatrice", "lavastoviglie", "forno", "buongiorno", "esco", "rientro", "cinema", "buonanotte"], description: "Elettrodomestico o scenario." },
          },
          required: ["tipo"],
        },
      },
    },
    required: ["risposta", "azioni"],
  },
};

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
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function clientHash(req: Request) {
  // Impronta anonima e giornaliera della rete di provenienza, solo per il limite per dispositivo.
  // L'indirizzo IP non viene salvato; l'impronta cambia ogni giorno e si cancella dopo 3 giorni.
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "").split(",")[0].trim();
  const day = new Date().toISOString().slice(0, 10);
  const salt = env("JANA_SALT") || env("SUPABASE_SERVICE_ROLE_KEY").slice(-24);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}|${day}|${ip}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function sanitizeState(s: unknown) {
  // Lo stato della casa arriva dal browser: lo riduciamo a un JSON piccolo e sicuro.
  try {
    const txt = JSON.stringify(s ?? {});
    return txt.length > 2500 ? txt.slice(0, 2500) : txt;
  } catch { return "{}"; }
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405, h);
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED.includes(origin)) return json({ ok: false, error: "origin" }, 403, h);
  const KEY = env("ANTHROPIC_API_KEY");
  if (!KEY) return json({ ok: false, error: "not_configured" }, 503, h);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400, h); }

  // Cronologia: solo testo, ruoli alternati, ultimi 20 messaggi, che inizia con l'utente.
  const raw = Array.isArray(b.messages) ? b.messages.slice(-20) : [];
  const msgs: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of raw) {
    const role = (m as { role?: string })?.role === "assistant" ? "assistant" : "user";
    const content = clean((m as { content?: unknown })?.content, role === "user" ? 300 : 1200);
    if (!content) continue;
    if (msgs.length && msgs[msgs.length - 1].role === role) msgs[msgs.length - 1].content += "\n" + content;
    else msgs.push({ role, content });
  }
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return json({ ok: false, error: "invalid" }, 422, h);

  // Limiti (conteggi anonimi, controllati in modo atomico nel database)
  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const conv = typeof b.conv === "string" && UUID_RE.test(b.conv) ? b.conv : null;
  const { data: use, error: useErr } = await db.rpc("jana_use", {
    p_conv: conv, p_hash: await clientHash(req), p_max_msg: MAX_MSG, p_max_day: MAX_DAY, p_max_ip: MAX_IP,
  });
  if (useErr || !use) return json({ ok: false, error: "server" }, 500, h);
  if (!use.ok) {
    const map: Record<string, string> = { conv: "limit_conv", day: "limit_day", client: "limit_client" };
    return json({ ok: false, error: map[use.reason] || "limit_day", conv: use.conv ?? null, left: use.left ?? 0 }, 429, h);
  }

  // Lo stato attuale della casa va nell'ultimo messaggio dell'utente
  const last = msgs[msgs.length - 1];
  last.content = `[STATO ATTUALE DELLA CASA DI PROVA]\n${sanitizeState(b.state)}\n\n[MESSAGGIO]\n${last.content}`;

  let reply = "", actions: unknown[] = [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [{ type: "text", text: CONTESTO, cache_control: { type: "ephemeral" } }],
        tools: [TOOL],
        tool_choice: { type: "tool", name: "rispondi" },
        messages: msgs,
      }),
    });
    clearTimeout(t);
    if (!r.ok) {
      console.error("anthropic", r.status, (await r.text()).slice(0, 300));
      return json({ ok: false, error: "ai", conv: use.conv, left: use.left }, 502, h);
    }
    const data = await r.json();
    const tool = (data.content || []).find((c: { type: string; name?: string }) => c.type === "tool_use" && c.name === "rispondi");
    const txt = (data.content || []).find((c: { type: string }) => c.type === "text");
    reply = clean(tool?.input?.risposta ?? txt?.text ?? "", 1200);
    actions = Array.isArray(tool?.input?.azioni) ? tool.input.azioni.slice(0, 14) : [];
  } catch (e) {
    console.error("anthropic_fetch", String(e).slice(0, 200));
    return json({ ok: false, error: "ai", conv: use.conv, left: use.left }, 502, h);
  }
  if (!reply) reply = "Scusa, non ho capito bene. Puoi ripetere?";
  return json({ ok: true, reply, actions, conv: use.conv, left: use.left }, 200, h);
});
