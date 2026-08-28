# 開始使用（本機版）

這份是從 Manus 搬到本機開發的起步說明。詳細的遷移規劃看 `docs/local-migration.md`。

## 需要先裝什麼

- **Node.js 20 以上** — https://nodejs.org
- **pnpm** — 裝好 Node 後執行 `npm install -g pnpm`
- **VS Code** — 建議裝 ESLint 與 Prettier 擴充套件
- MySQL（**選用**，第一次跑不需要）

## 三步跑起來

```bash
# 1. 安裝套件（第一次會跑比較久，約 3–5 分鐘）
pnpm install

# 2. 建立環境設定
cp .env.example .env

# 3. 啟動
pnpm dev
```

打開瀏覽器到終端機顯示的網址（通常是 http://localhost:3000）。

`.env.example` 預設已經開好 `LOCAL_DEV_OWNER=1`，所以不用登入就會直接進入畫面。

> **Windows 使用者**：第 2 步在 PowerShell 要改用 `copy .env.example .env`。

## 安裝時會看到的警告（都可以忽略）

- `Ignored build scripts: @tailwindcss/oxide, esbuild` — 已驗證不影響 dev、build、test，不用理會。
- 啟動時的 `[OAuth] ERROR: OAUTH_SERVER_URL is not configured` — 預期中的，因為已改用本機登入繞過。

## 順序不能顛倒

`pnpm install` 一定要先跑完，再跑 `pnpm dev`。
直接跑 `pnpm dev` 會出現 `node_modules missing, did you mean to install?`。

## 確認一切正常

```bash
pnpm test    # 應該顯示 106 passed
pnpm check   # TypeScript 檢查，應該沒有輸出
pnpm build   # 正式版建置
```

## 想要手機 App？

看 `docs/static-app.md`。免費、離線可用、push 後自動更新，不需要伺服器或資料庫。

## 這個版本已經包含什麼

- **職涯技能樹**（新功能）— 16 條職涯路線、40 個技能節點，已接進「職涯任務」頁面，打開就看得到
- **本機登入繞過** — `server/_core/context.ts` 加了開發用的擁有者身分
- **靜態離線版 + PWA** — `pnpm build:static`，可安裝到手機主畫面
- **GitHub Pages 自動部署** — `.github/workflows/deploy.yml`
- `.env.example`、`init-db.sql`、遷移文件

## 現在能用 / 不能用

| 能用 | 不能用（需要 Manus 或自己接服務） |
| --- | --- |
| 成績、GPA、學分統計 | AI 選課建議 |
| 課程規劃、CSV 匯入 | PDF 成績單轉換 |
| 職涯技能樹 | 成就附件上傳 |
| 專題、證照、成就紀錄 | 雲端同步（要先設資料庫） |
| 匯出 CSV / .ics | |

不能用的功能不會讓網站壞掉，只會在你點到的時候顯示設定缺失的錯誤。

## 接上資料庫（想要雲端同步再做）

```bash
mysql -u root -p < init-db.sql
# 編輯 .env，取消 DATABASE_URL 那行的註解
pnpm db:push
```

## 重要提醒

**`.env` 不要提交到 GitHub。** `.gitignore` 已經擋掉了，但如果你之後往裡面放 API key，再確認一次。

**`LOCAL_DEV_OWNER` 只能用在本機。** 它會讓所有請求都是管理員身分。正式部署時絕對不要設定這個變數（程式碼裡也擋了 `NODE_ENV=production`，但不要依賴這層）。

## 推回 GitHub

這包裡面含 `.git`，remote 已經指向你的 repo：

```bash
git status              # 看改了什麼
git add .
git commit -m "加入職涯技能樹與本機開發設定"
git push
```

第一次 push 可能要你登入 GitHub。
