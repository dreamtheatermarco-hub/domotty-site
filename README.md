# domotty.it

Sito di Domotty S.r.l.: pagine statiche (HTML, CSS e JavaScript senza librerie) pubblicate con **GitHub Pages**. Il modulo contatti e la newsletter passano da **Supabase**: due Edge Functions salvano i dati nel database e mandano le email tramite l'SMTP di Register.

```
index.html          home
privacy.html        privacy policy
cookie.html         cookie policy
conferma.html       conferma iscrizione / disiscrizione newsletter
404.html            pagina non trovata
assets/css          stili (site.css, legal.css, fonts.css)
assets/js           config.js (indirizzo Supabase), site.js, legal.js
assets/fonts        Poppins e JetBrains Mono ospitati in locale (licenza OFL)
assets/img          favicon, icona, immagine per le condivisioni
supabase/           tabelle SQL ed Edge Functions
CNAME               dominio personalizzato (domotty.it)
```

## 1 · Supabase

1. Crea un progetto (o usane uno esistente) scegliendo la regione **Central EU (Frankfurt)**.
2. *(Facoltativo, consigliato)* **Database › Extensions**: attiva `pg_cron`. Serve per cancellare in automatico le richieste più vecchie di 24 mesi e le iscrizioni mai confermate dopo 30 giorni, come dice l'informativa.
3. **SQL Editor**: incolla ed esegui `supabase/migrations/20261018000000_domotty_site.sql`.
4. **Edge Functions › Secrets**: aggiungi

   | Nome | Valore |
   |---|---|
   | `SMTP_HOST` | server SMTP indicato nel pannello Register per la casella (es. `smtps.register.it`) |
   | `SMTP_PORT` | `465` |
   | `SMTP_USER` | indirizzo completo della casella che invia, es. `noreply@domotty.it` |
   | `SMTP_PASS` | password di quella casella |
   | `MAIL_FROM` | `Domotty <noreply@domotty.it>` (stessa casella di `SMTP_USER`) |
   | `MAIL_TO` | `assistenza@domotty.it` |
   | `SITE_URL` | `https://domotty.it` |

5. **Edge Functions › Deploy a new function › Via editor**: crea `contact` incollando `supabase/functions/contact/index.ts`, poi `newsletter` con `supabase/functions/newsletter/index.ts`.
   Per entrambe, nei **Details** della funzione disattiva **Enforce JWT verification** (il sito le chiama senza login; i controlli sono nel codice).
   In alternativa, con la CLI: `supabase link --project-ref <ref>` e `supabase functions deploy contact newsletter`.
6. Copia **Project URL** (Settings › API) in `assets/js/config.js`.

## 2 · GitHub Pages

**Settings › Pages**: Source *Deploy from a branch*, branch `main`, cartella `/ (root)`. Custom domain: `domotty.it`, poi spunta **Enforce HTTPS** appena disponibile.

Consigliato: **Settings (del profilo) › Pages › Add a domain** per verificare `domotty.it` con il record TXT che GitHub ti indica.

## 3 · DNS su Register

Nel pannello DNS di `domotty.it`, **senza toccare i record MX** (sono quelli della posta):

| Tipo | Nome | Valore |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |
| CNAME | `www` | `dreamtheatermarco-hub.github.io` |

Elimina gli altri record A/AAAA di `@` e il record di `www` che puntano al vecchio hosting. La propagazione richiede da pochi minuti a qualche ora; il certificato HTTPS arriva dopo.

## Modifiche

Il sito non ha build: modifica i file e fai push su `main`. GitHub Pages lo ripubblica in un minuto circa.
I testi legali sono una bozza da far verificare a un consulente.
