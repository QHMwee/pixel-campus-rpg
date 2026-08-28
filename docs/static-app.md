# 手機 App：免費、離線、自動更新

## 這個做法為什麼可行

Campus Quest 的核心資料（成績、學分、課程規劃、專題、證照、技能樹）**本來就只存在瀏覽器的 localStorage**。伺服器只負責四件附加功能：AI 選課建議、PDF 成績單轉換、附件上傳、雲端同步。

所以可以建置一個「純前端」版本：沒有伺服器、沒有資料庫、沒有登入。這個版本可以放在任何免費的靜態網站空間，安裝到手機主畫面後**完全離線運作**。

代價是那四項附加功能沒有。但它們在本機開發時本來就不能用（需要 Manus 的 Forge API），所以實際上你沒有多損失什麼。

## 你會得到什麼

- 手機主畫面上一個真正的 app 圖示，開啟沒有瀏覽器網址列
- **飛航模式也能用** —— Service Worker 把整個 app 快取在手機上
- 你 push 到 GitHub，約 1–2 分鐘後手機上的版本自動更新
- 完全免費，不用維護伺服器或資料庫
- 電腦關機不影響手機

## 設定步驟（只要做一次）

### 1. 推上 GitHub

```bash
git add .
git commit -m "加入靜態離線版與技能樹"
git push
```

### 2. 開啟 GitHub Pages

在你的 repo 頁面：**Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。

存檔後回到 **Actions** 分頁，會看到 `Deploy static app` 正在跑。等它變成綠色勾勾（約 2 分鐘）。

### 3. 開啟網址

網址會是：

```
https://QHMwee.github.io/pixel-campus-rpg/
```

### 4. 安裝到手機

用**手機瀏覽器**打開上面的網址。

- **Android（Chrome）**：右上角選單 → 「安裝應用程式」或「加到主畫面」
- **iPhone（Safari）**：下方分享鈕 → 「加入主畫面」

裝完主畫面就有圖示了，開起來沒有網址列，跟一般 app 一樣。

> iPhone 一定要用 Safari 安裝，Chrome on iOS 不支援。

### 5. 把資料搬過去

在舊的 Manus app 裡點「下載私人備份」，把 json 傳到手機，在新 app 裡點「匯入私人備份」。

## 之後怎麼改功能

```bash
# 本機改程式碼
pnpm dev              # 開發時即時預覽

# 滿意了就推上去
git add .
git commit -m "說明改了什麼"
git push
```

推完約 1–2 分鐘，手機上的 app 下次開啟就是新版。不需要重新安裝。

**不會用到任何 Manus 額度。** 本機開發免費，GitHub Actions 對公開 repo 免費，GitHub Pages 免費。

## 兩個版本的差別

| | `pnpm dev`（本機） | 靜態版（手機／網頁） |
| --- | --- | --- |
| 用途 | 開發、寫功能 | 日常使用 |
| 登入 | `LOCAL_DEV_OWNER` 繞過 | 不需要登入 |
| 後端 | 有（tRPC + 可選資料庫） | 沒有 |
| 離線 | 否 | 是 |

兩個版本讀的是**同一份程式碼**，差別只在建置時的 `VITE_STATIC_MODE`。

## 資料不會自動同步

這是要講清楚的限制：**手機和電腦是兩份獨立的資料。**

localStorage 綁在裝置上，靜態版沒有伺服器，所以沒有雲端同步。要搬資料只能用「下載私人備份 / 匯入私人備份」手動處理。

如果你之後真的很需要多裝置同步，那就得回頭做有伺服器的部署（見 `local-migration.md` 階段 4），要處理登入與資料庫。建議先用手動備份撐一陣子，確認你真的需要再說。

## 關於「沒有登入」

靜態版沒有登入是**安全的**，因為沒有伺服器就沒有東西需要保護 —— 所有資料都在使用者自己的瀏覽器裡，不會離開裝置。別人打開你的網址，看到的是他自己的空白資料，不是你的成績。

但這跟「在有伺服器的部署上停用登入」是完全不同的事。那種情況下 `LOCAL_DEV_OWNER` 會讓任何人變成管理員，讀得到資料庫裡的東西。**絕對不要在有後端的部署上設定 `LOCAL_DEV_OWNER`。**

## 換成自訂網域

之後想用自己的網域的話，改 `.github/workflows/deploy.yml` 裡的：

```yaml
VITE_BASE_PATH: /
```

然後在 GitHub Pages 設定裡填網域。

## 疑難排解

**Actions 跑失敗** — 點進去看紅色的步驟。最常見是 `pnpm test` 沒過，代表程式碼有問題，本機跑 `pnpm test` 會看到同樣的錯誤。

**網頁打開一片空白** — 通常是 `VITE_BASE_PATH` 不對。確認 workflow 裡是 `/${{ github.event.repository.name }}/`，且 repo 名稱沒改過。

**改了東西但手機沒更新** — 完全關掉 app 再開一次。Service Worker 是在下次開啟時才套用新版本。

**手機看不到「安裝」選項** — 確認網址是 `https://`（GitHub Pages 預設就是），且用 Android Chrome 或 iOS Safari。
