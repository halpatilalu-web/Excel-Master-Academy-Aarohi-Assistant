# Deploy guide

Is app ko live karne ke do tareeke hain:

| Tareeka | Kab use karo |
|---|---|
| **Render + `render.yaml`** (blueprint) | Sabse aasaan — repo connect karo, Render Dockerfile se build karke chalayega |
| **Docker kahin bhi** (Fly, Railway, VPS, EC2) | Jab tumhe apna server/disk control chahiye |

Dono me ek hi image chalti hai: frontend build + FastAPI, ek hi port par.
GitHub Pages is app ke liye kaam nahi karega — backend aur database chahiye.

> ⚠️ **Free plan ka database persist nahi hota.** Render free instance ka
> filesystem restart/sleep/redeploy par reset ho jata hai, to `APP_DB_PATH=/data/data.db`
> ka data chala jayega. Testing ke liye theek hai, real students ke liye **paid
> instance + Persistent Disk** lo (neeche step 4).

---

## 1. Code GitHub par bhejo

```bash
git remote add origin https://github.com/<tumhara-username>/<repo>.git
git push -u origin main
```

(Repo pehle se git repository hai — zip se extract karne ki zarurat nahi. `.git`
folder ko delete mat karo.)

CI (`.github/workflows/ci.yml`) push/PR par khud chalega: build, frontend tests,
Ruff, content validator, backend tests, dependency audit aur `docker build`.
Red X aaye to merge mat karo.

## 2. Render par blueprint banao

1. [render.com](https://render.com) → GitHub se sign in.
2. **New +** → **Blueprint** → apna repo choose karo.
3. Render `render.yaml` padhkar `excel-master-live` service dikhayega → **Apply**.
4. Build 5–10 minute lega. Green **Live** link milega.

`render.yaml` already set karta hai:

```yaml
runtime: docker
dockerfilePath: ./Dockerfile
healthCheckPath: /api/health     # real SQLite probe, sirf "server zinda hai" nahi
envVars:
  - key: APP_DB_PATH   value: /data/data.db
  - key: DEMO_ENABLED  value: "0"
```

## 3. Optional: Aarohi ko online AI do

Render → service → **Environment**:

```text
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

Key sirf Render ke environment me rakho — code, `.env` ya GitHub me kabhi nahi.
Key na ho to Aarohi built-in offline Excel tutor se jawab deti hai (koi error nahi).

`/api/assistant` rate limited hai (20/min per user, 40/min per IP, 120/min per
process). Guest account banana free hai, isliye bina limit ke key ka paisa ud
jayega — limit hatao mat.

## 4. Persistent disk (real students ke liye zaroori)

Render → service → **Settings** → instance type **Starter** ya upar → **Disks** →
**Add Disk**:

```text
Name: data
Mount path: /data
Size: 1 GB (SQLite ke liye kaafi)
```

`APP_DB_PATH=/data/data.db` already set hai, to data restart ke baad bacha rahega.
Ek hi instance chalao: SQLite multi-replica ke liye nahi hai (rate limits bhi
process memory me hote hain).

## 5. Deploy ke baad test karo

1. Link kholo — dashboard dikhna chahiye (pehla load free plan par slow ho sakta hai).
2. Ek chapter complete karke **page refresh** karo — progress bacha hona chahiye.
3. Practice Exam start karo, ek answer do, refresh karo — attempt resume hona chahiye.
4. Aarohi me `VLOOKUP samjhao` poochho.
5. Account page: backup export, phir (test account par) **Delete my account**.
6. `https://<app>/api/health` → `{"status":"ok"}`.

## 6. Backup

Do level ke backup rakho:

- **Student**: Account page → *Export backup (JSON)* (poora data ek file me).
- **Operator**: `/data/data.db` ka periodic copy (Render disk snapshot ya
  `sqlite3 data.db ".backup /tmp/backup.db"`). Backup se pehle `-wal`/`-shm` files
  bhi copy karo ya `.backup` command use karo.

Restore: service band karo → `data.db` replace karo → start.

## 7. Custom domain / HTTPS

Render apna HTTPS certificate de deta hai — kuch nahi karna. Session cookie
`Secure; SameSite=None` tab hi set hota hai jab request https se aaye, isliye
app ko **https par hi** chalao.

Agar SPA kisi dusre host se serve kar rahe ho (CDN) aur API alag host par hai, to
us origin ko allow karo:

```text
APP_ALLOWED_ORIGINS=https://excel.example.com
```

Warna cookie-wale writes 403 (`cross-origin request blocked`) aayenge.

## 8. Docker (Render ke bahar)

```bash
docker build -t excel-master-academy .
docker run -p 8000:8000 \
  -v "$PWD/data:/data" \
  -e APP_DB_PATH=/data/data.db \
  -e LLM_API_KEY=sk-... \
  excel-master-academy
```

Image non-root (`uid 10001`) chalti hai, isliye mounted `/data` us user ka writable
hona chahiye (`chown -R 10001 /host/path`).

## Troubleshooting

| Symptom | Check |
|---|---|
| Deploy fail, "no such file" | Repo root me `Dockerfile` aur `render.yaml` hone chahiye (nested folder nahi) |
| App khulta hai, data save nahi hota | `APP_DB_PATH` writable hai? Health endpoint 503 de raha hai? Disk mount hua? |
| Login ke baad har request 401 | HTTPS par ho? Cookie `Secure` hai; `APP_ALLOWED_ORIGINS` sahi hai? |
| Writes par 403 `cross-origin request blocked` | Browser ka origin app ke host se alag hai — `APP_ALLOWED_ORIGINS` set karo |
| Aarohi har baar offline tutor se jawab deti hai | `LLM_API_KEY` set hai? Server logs me `[assistant] upstream failure` dekho |
| 429 on login | Us (IP, email) par 5 galat attempts — ek minute ruko |
| 429 on guest | Ek IP se 10 guests/minute ki limit hai — wait karo |
| Build me `tsc` fail | `pnpm typecheck` locally chalao; CI bhi yahi check karta hai |
