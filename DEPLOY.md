# Live deploy guide — sabse easy tareeka

Is app ko live karne ke liye **GitHub + Render** use karo.

- GitHub: code store karega
- Render: app ko internet par live link dega
- GitHub Pages: is full app ke liye kaam nahi karega, kyunki backend/database chahiye

Repo me deploy files ready hain:

- `Dockerfile` — frontend + backend ek saath build/run karta hai
- `render.yaml` — Render automatic settings padh lega

Tumhe build/start command manually likhne ki zarurat nahi hai.

---

## Step 1: GitHub par new repository banao

1. GitHub par login karo.
2. **New repository** banao.
3. Naam example: `Excel-Master-Live-Fixed`
4. Repository empty rakho — README, .gitignore ya license add mat karo.

## Step 2: Code GitHub par bhejo

Sabse easy tareeka **GitHub Desktop** hai:

1. Zip extract karo.
2. GitHub Desktop install/open karo.
3. **File → Add local repository** me extracted `Excel-Master-Live` folder select karo.
4. Agar GitHub Desktop bole ki repository nahi hai, to **create a repository** option choose karo.
   - Dhyaan do: `.git` folder zip se remove kiya gaya tha, isliye new repository banana normal hai.
5. Summary me likho: `Excel Master Live fixed rewrite`
6. **Commit to main** dabao.
7. **Publish repository** dabao aur Step 1 me banaya repo/account select karo.

Agar command line aati hai, to yeh bhi use kar sakte ho:

```bash
cd Excel-Master-Live
git init
git add .
git commit -m "Excel Master Live fixed rewrite"
git branch -M main
git remote add origin https://github.com/TUMHARA-USERNAME/TUMHARA-REPO.git
git push -u origin main
```

Check kar lo ki GitHub repo ke home page par `Dockerfile` aur `render.yaml` dikh rahe hain.

## Step 3: Render par live karo

1. [render.com](https://render.com) par jao.
2. **Get Started / Sign Up** → **GitHub se login** karo.
3. Render dashboard me **New +** dabao.
4. **Blueprint** select karo.
5. Apna GitHub repo select karo.
6. Render ko repo ki permission do.
7. Render `render.yaml` padhkar `excel-master-live` web service dikhayega.
8. Service name chaaho to badal sakte ho.
9. **Apply / Create** dabao.
10. 5–10 minute wait karo. Logs me build chalega.
11. Upar green **Live** link milega, example:

```text
https://excel-master-live-xxxx.onrender.com
```

Wahi tumhara public app link hai.

## Step 4: Live app test karo

Live link kholkar check karo:

1. Dashboard khulta hai ya nahi
2. Ek chapter complete karke refresh karo — progress save rehna chahiye
3. Practice Exam start hota hai ya nahi
4. Aarohi me `VLOOKUP samjhao` poochho
5. Account page open hota hai ya nahi

Aarohi bina AI key ke offline Excel tutor mode me chalegi.

Online AI chahiye to Render service → **Environment** me add karo:

```text
LLM_API_KEY=apni-api-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

API key GitHub code me kabhi mat daalna.

---

## Important warning — free plan

`render.yaml` abhi **free plan** par set hai taaki tum pehle try kar sako.

Free plan ki 2 limitations hain:

1. 15 minute tak use na hone par app sleep ho sakta hai; pehla open slow hoga.
2. SQLite database persistent disk par nahi hai, isliye sleep/restart/redeploy par student progress reset ho sakta hai.

Real students ke liye live karne se pehle:

- Render paid instance lo jisme **Persistent Disk** mile
- Disk ko `/data` par mount karo
- `APP_DB_PATH=/data/data.db` rehne do

Ya phir baad me database ko PostgreSQL par migrate karna hoga. Abhi testing/demo ke liye free setup sahi hai.

## Agar deploy fail ho

Render → apni service → **Logs** kholo aur last error dekho. Common checks:

- GitHub repo root me `Dockerfile` hai?
- GitHub repo root me `render.yaml` hai?
- Zip ke andar wala folder galti se nested to nahi ho gaya? Repo me `Excel-Master-Live/Dockerfile` nahi, seedha `Dockerfile` dikhna chahiye.
- `DEMO_ENABLED=0` hai?

Error samajh na aaye to logs ka last hissa copy karke bhej do.
