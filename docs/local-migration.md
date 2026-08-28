# 脫離 Manus：拆解清單與階段計畫

## 結論先講

專案本身可以搬，但有四個地方綁在 Manus 的私有服務上，其中**登入是硬阻擋**——不處理的話你連畫面都進不去。

好消息是：這個 app 的核心資料（成績、課程規劃、專題、證照）本來就存在瀏覽器 `localStorage`，伺服器只負責五件事。所以「先跑起來」跟「全部功能都搬完」是兩個難度差很多的目標。

## Manus 綁定清單

| 綁定點 | 影響的功能 | 嚴重度 | 替代方案 |
| --- | --- | --- | --- |
| `_core/sdk.ts` + `_core/oauth.ts`<br>（`OAUTH_SERVER_URL`） | **整個 app 的登入** | 🔴 硬阻擋 | 本機繞過，或自己接一套 |
| Forge API<br>（`BUILT_IN_FORGE_API_*`） | AI 選課建議、PDF 成績單轉換 | 🟡 功能損失 | 換成自己的 LLM API key |
| Forge Storage<br>（`storage.ts`、`storageProxy.ts`） | 成就／證照的圖片附件 | 🟡 功能損失 | 本機磁碟 或 S3／R2 |
| `vite-plugin-manus-runtime`<br>`__manus__/debug-collector.js` | 只影響開發期除錯 | 🟢 可直接移除 | 刪掉即可 |

**資料庫不算綁定。** `drizzle/schema.ts` 就四張表（`users`、`academic_sync_states`、`private_achievement_media`、`notion_sync_events`），標準 MySQL，本機裝一個就好。這部分是整個遷移裡最輕鬆的。

`_core/` 底下還有 `voiceTranscription.ts`、`imageGeneration.ts`、`notification.ts`、`heartbeat.ts`、`map.ts` 也吃 Forge API，但沒有任何 router 在用它們，是樣板留下來的。可以直接刪。

## 為什麼登入是硬阻擋

`client/src/pages/Home.tsx:1058`：

```tsx
if (!isAuthenticated) return <PrivateAccessScreen ... />;
```

整個 `PrivateQuestContent` 在這道閘門後面。而登入打的是 Manus 的 `WebDevAuthPublicService`，那是他們家的服務，沒有開源版本。

伺服器端所有 tRPC 路由也都用 `adminProcedure`，會檢查 `ctx.user.role === 'admin'`。這是單人擁有者設計——這個 app 本來就只給你一個人用。

## 階段計畫

### 階段 0：先跑起來（約 30 分鐘）

目標是本機看得到畫面、能操作，不碰資料庫也不碰 AI。

1. clone repo，`pnpm install`
2. 把 `context.ts` 覆蓋到 `server/_core/context.ts`
3. `.env.example` 複製成 `.env`，只留 `LOCAL_DEV_OWNER=1`
4. `pnpm dev`

`context.ts` 做的事：加一個本機假擁有者，直接以 admin 身分注入 context。下游的 `adminProcedure`、`ownerAccess` 檢查全部自動通過，不用改任何 router。

安全上鎖了兩層：`NODE_ENV !== "production"` **且** `LOCAL_DEV_OWNER=1` 才生效，啟動時會在 console 印警告。**正式部署千萬不要設這個變數**，設了等於誰來都是管理員。

這階段結束後，成績、GPA、課程規劃、技能樹、CSV 匯入全部能用。不能用的是雲端同步、AI 建議、PDF 匯入、附件上傳。

### 階段 1：本機資料庫（約 1 小時）

```bash
mysql -u root -p < init-db.sql
# .env 填入 DATABASE_URL
pnpm db:push
```

`db:push` 會跑 `drizzle-kit generate && drizzle-kit migrate`，`drizzle/` 目錄裡已經有四份 migration。

完成後雲端同步（`academicSync`）跟附件的 metadata 就能用了。

### 階段 2：換掉 AI（約 2 小時）

`server/_core/llm.ts` 的 `invokeLLM` 是唯一入口，被 `routers/aiPlanner.ts` 和 `routers/transcriptPdf.ts` 用。改寫成直接呼叫 Anthropic 或 OpenAI 的 API，把 `ENV.forgeApiKey` 換成你自己的 key。

介面不用動，兩個 router 照舊。這是整個遷移裡投報率最高的一段。

### 階段 3：換掉檔案儲存（約 3 小時）

`server/storage.ts` 負責上傳、`_core/storageProxy.ts` 負責 `/manus-storage/*` 讀取。兩個都改成本機磁碟（最簡單）或 Cloudflare R2 / S3（要部署的話）。

`package.json` 已經有 `@aws-sdk/client-s3` 跟 `s3-request-presigner`，走 S3 相容的話依賴不用加。

### 階段 4：真正的登入 + 部署（半天到一天）

如果只有你自己用，最簡單的做法是**不要做 OAuth**：改成單一密碼 + session cookie，`JWT_SECRET` 那套 `jose` 簽章邏輯本來就在 `sdk.ts` 裡可以沿用。想做正式一點就接 GitHub OAuth 或 Auth.js。

部署平台建議 Zeabur（台灣團隊、有 MySQL 附加服務、接 GitHub 自動部署）或 Render。`pnpm build` 產出 `dist/index.js`，`pnpm start` 就跑得起來，不需要改建置流程。

## 時間估計

| 目標 | 累積時間 |
| --- | --- |
| 本機能開發、能寫功能 | 階段 0，30 分鐘 |
| 加上雲端同步 | 階段 0–1，約 1.5 小時 |
| 功能完整（本機） | 階段 0–3，約 6 小時 |
| 公開部署 | 全部，約 1.5 天 |

**建議先做階段 0 就好。** 你的目的是自己寫功能，階段 0 完成後這件事就沒有阻礙了。AI 建議跟附件上傳是你自己用的功能，缺一陣子不影響開發，等有需要再補。

## 一個容易踩的坑

搬走之後 Manus 那個網站還會繼續跑舊版本。如果你之後還會回去 Manus 改東西，兩邊會分岔，很容易互相蓋掉。

要嘛下定決心不再碰 Manus，要嘛明確定義哪一邊是「真正的來源」。我建議前者——你既然要自己做資料庫和部署，就把 GitHub 當唯一來源，Manus 那份當歷史紀錄放著就好。
