# Vishal Jadhav: portfolio, inquiry system and admin dashboard

Frontend: React + Vite, Framer Motion, GSAP, Lenis, raw WebGL, Spline.
Backend: Node.js (Express-free, one small server), MySQL, Nodemailer. Folder `server/`.

Pages: `/`, `/about`, `/projects`, `/faq`, `/contact`, `/admin` (private, not indexed).

## 1. Install (run these in the project folder, the one that contains `package.json`, not inside `src`)

```bash
npm run setup          # installs the site AND the server (server/node_modules is needed for mysql2)
```

If you see `Cannot find package 'mysql2'`, the server packages are missing: `cd server && npm install`.

## 2. MySQL on Windows (easiest: XAMPP)

1. Install XAMPP from apachefriends.org. Open **XAMPP Control Panel** and press **Start** next to **MySQL** (you do not need Apache).
2. XAMPP's MySQL user is `root` with an empty password, so the defaults in the next step work as they are.
3. Create the server settings file and create the tables:

```bash
cd server
copy .env.example .env          # Windows. On Mac/Linux: cp .env.example .env
npm run db:init                 # creates the database "portfolio" and all tables
```

Open http://localhost/phpmyadmin (with XAMPP running) to see the tables and inquiries.
Other options: MySQL Installer from mysql.com (set a root password and put it in `DB_PASSWORD`), or Docker.
On a real server, do not use `root`: create a separate user with `GRANT ALL ON portfolio.* TO 'portfolio'@'localhost' IDENTIFIED BY '...'`.

## 3. Email for inquiries

Every inquiry is saved in MySQL and emailed to `vj042459@gmail.com`.
In Google Account: turn on 2-step verification, create an App Password, and put it in `SMTP_PASS` in `server/.env`.
If email fails the inquiry is still saved and shown in the admin panel.

## 4. Admin login (starts empty)

No admin exists until you add one. Nothing is seeded and there is no default password.

```bash
npm --prefix server run create-admin -- yourname   # asks for the password (hidden)
# or, to insert it yourself in SQL:
npm --prefix server run hash-password         # prints a bcrypt-style hash to paste into admins.password_hash
```

Passwords are stored as salted scrypt hashes. Login is rate limited, sessions are random tokens stored hashed,
cookies are HttpOnly + SameSite + Secure in production.

## 5. Run (two terminals, both started from the project folder)

```bash
npm run server         # terminal 1: API on http://localhost:4000 (MySQL must be running)
npm run dev            # terminal 2: site on http://localhost:5173 (or the next free port)
```

If the second terminal shows `http proxy error ... ECONNREFUSED`, the API (terminal 1) is not running.

Production:

```bash
SITE_URL=https://your-domain.com npm run build
npm run server         # serves dist/ and /api together
```

`SITE_URL` also writes canonical URLs, `sitemap.xml` and `robots.txt`.

## What the dashboard shows

| Card | Source |
| --- | --- |
| Live visitors (also shown on the public site) | heartbeat every 25 s, active in the last minute |
| Total visitors, page views | counted server side, IPs are hashed |
| Total inquiries | the contact form |
| Found on Google, clicked from Google | Google Search Console (see below), otherwise "n/a" |
| Clicks on site | links and buttons visitors click |
| Likes | the heart button on the site |
| Errors | JavaScript errors reported by visitors' browsers |

### Google Search Console

1. Verify the site in Search Console. The HTML-file method is already prepared: `public/google875ab00ea75240d9.html`
   is served at `https://your-domain.com/google875ab00ea75240d9.html` once the site is live.
   Leave that file in place permanently, or the verification can be lost.
2. Numbers in the dashboard come from the Search Console API, which needs a service account:
   Google Cloud Console, create a project, enable **Google Search Console API**, create a **service account**,
   create a JSON key and save it as `server/secrets/gsc.json` (never commit it).
3. In Search Console, Settings, Users and permissions, add the service account's email as a user (Restricted is enough).
4. In `server/.env`:

```
GSC_SERVICE_ACCOUNT_FILE=./secrets/gsc.json
GSC_SITE_URL=https://your-domain.com/        # exactly as listed in Search Console. A domain property is: sc-domain:your-domain.com
```

The server syncs daily. To run it once now: `npm --prefix server run gsc:sync`.

## AI assistant (full-screen chat)

The round button at the bottom right opens a full-screen chat: history on the left, replies that stream in,
"Thought for Ns" that lists what the server really did (reading your question, reading the PDF, searching the portfolio sections it used),
sources, copy / read aloud / regenerate, image and PDF attachments (button, drag and drop, paste), dictation, and a hands-free voice mode.

- **History and memory** are saved only in the visitor's browser (localStorage). Memory is a short list of notes
  (for example the visitor's name) that the visitor can see, edit and switch off.
- **PDFs** are read in the browser (pdf.js) and only their text is sent. Scanned PDFs have no text, so attach a photo instead.
- **Images** are resized in the browser and sent to the AI. The model you choose must support images
  (Google Gemini Flash models do; check your Groq model in its console). If it cannot see images, the assistant says so.
- **Voice** uses the browser's built-in speech tools: dictation works in Chrome, Edge and Safari, not in Firefox.
- Without a key the chat still works in "Basic mode" from your portfolio data, but cannot read attachments.

For real AI answers, a free key works:

- **Groq** (OpenAI-compatible): create a key at console.groq.com, then in `server/.env` set
  `AI_API_KEY=...`, `AI_BASE_URL=https://api.groq.com/openai/v1`, and `AI_MODEL=` a model name listed in your Groq console.
- **Google Gemini**: key from aistudio.google.com, `AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`,
  `AI_MODEL=` a Flash model name from AI Studio. Its free daily limit is small.
- **Claude**: `ANTHROPIC_API_KEY=...` (paid).

Free limits and model names change often, so check the provider's page. If the key is wrong or the limit is hit,
the assistant falls back to the built-in answers, so the chat never breaks. The key stays on the server and is never sent to the browser.

## 3D (Spline)

`src/components/SplineLab.jsx` loads the scene lazily. The component follows the supplied shadcn spec
(`SplineScene` + `Spotlight`) written in plain JSX and CSS, since this project does not use Tailwind or TypeScript.
Change the scene URL in `SplineLab.jsx`. If it renders blank, add the Spline hosts in `CSP_EXTRA_CONNECT`.

## Tests

```bash
npm test               # 63 backend tests (inquiries, auth, rate limits, tracking, dashboard)
```

## Where things live

| What | File |
| --- | --- |
| Text, projects, skills, FAQ, SEO titles | `src/data.js` |
| Colours (light and dark) | top of `src/styles.css` |
| Hero portrait (WebGL, unchanged) | `src/components/PhotoGL.jsx` |
| Cursor follower, scroll to top, chat | `CursorAvatar.jsx`, `ScrollTopButton.jsx`, `ChatWidget.jsx` |
| Contact form page | `src/pages/Contact.jsx` |
| Admin | `src/pages/Admin.jsx`, `src/admin/` |
| API | `server/src/routes/` |

Respects `prefers-reduced-motion`. Theme is stored in `localStorage` and applied before first paint.

## Deploying: frontend on Vercel, backend on a Node host

Vercel hosts the website (React). It cannot run the Node + MySQL server, so the backend goes on a separate host
and Vercel forwards `/api/*` to it. Visitors still see one site, so the admin login cookie and the origin check keep working.

1. **Database.** Create a hosted MySQL (Aiven free plan, TiDB Cloud, Railway). Note host, port, user, password, database name.
2. **Backend host** (Render, Railway or Fly.io). Point it at this repo with root directory `server`.
   - Build command: `npm install`  Start command: `npm start`
   - Environment variables:
     `NODE_ENV=production`, `SITE_URL=https://vishaljadhav.vercel.app`, `TRUST_PROXY=1`, `IP_SALT=<long random text>`,
     `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=1`,
     `SMTP_USER`, `SMTP_PASS` (Gmail App Password), `INQUIRY_TO`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`.
     Leave `ANTHROPIC_API_KEY` empty unless you use Claude.
3. **Create tables and the admin.** From your computer, with the same `DB_*` values in `server/.env`:
   `npm --prefix server run db:init` then `npm --prefix server run create-admin`.
4. **Connect Vercel.** In `vercel.json` replace `YOUR-BACKEND.onrender.com` with the backend's real address, commit, push.
   In Vercel > Settings > Environment Variables add `SITE_URL=https://vishaljadhav.vercel.app` so canonical links and the sitemap are correct.
5. Open `/api/stats/public` on the Vercel address. JSON means the connection works.

Free hosts sleep when idle, so the first request after a quiet period can take about 30 seconds.
