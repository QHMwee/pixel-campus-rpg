# Campus Quest 原始碼壓縮包說明

本壓縮包提供目前受管理的 **Campus Quest 網站完整原始碼**，包括前端、伺服器端、共用學業邏輯、Vitest 測試、PWA 設定、Notion 策略整合與高科大 CSV 課表匯入規格。

## 建置方式

在解壓後的專案根目錄執行：

```bash
pnpm install
pnpm test
pnpm dev
```

不會包含 `node_modules`、本機日誌、快取、版本控制資料與環境變數檔；請以 `pnpm install` 重新安裝相依套件。所有實際使用者資料存於瀏覽器的 `localStorage`，不在原始碼壓縮包中。

## Android 交付範圍

Android WebView 原始專案與 debug APK 先前建立在網站專案外的暫存工作目錄，目前已不在此工作區，故無法將未驗證副本納入本次來源壓縮包。已發布網站仍保留 Android APK 下載入口；若需重新建立可編譯的 Android 專案，應以目前網站網址與行動安裝文件的設計要求重新產生並重新簽署，而非把不完整或過期檔案混入本包。
