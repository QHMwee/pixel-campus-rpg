# Campus Quest 行動啟動驗證紀錄

**驗證日期：** 2026-08-15

## 已完成的可檢查驗證

| 項目 | 結果 | 證據／說明 |
| --- | --- | --- |
| 行動網頁啟動頁 | 通過 | 以 375 × 812 預覽檢查證照考試頁；側欄的 PWA 安裝提示與「下載 Android APK」按鈕均可見、可讀。 |
| Android APK 產物 | 通過 | `app-debug.apk` 已以 `aapt` 確認套件 `im.manus.campusquest`、Android 15／API 35，並以 `apksigner` 確認 v2 簽章有效。 |
| Android 啟動與返回設計 | 通過靜態檢查 | `MainActivity` 使用 AndroidX SplashScreen、以 HTTPS 開啟已發布網站、只允許 Campus Quest 與必要 Manus 網域留在 WebView、返回鍵先執行 `goBack()`、主要頁載入錯誤時顯示離線頁。 |
| 已發布網站的獨立瀏覽器啟動 | 已執行 | Chromium 的獨立 App 啟動目標可建立並導向已發布網址；未登入的全新瀏覽器設定檔會接著導向 Manus OAuth，符合網站帳號驗證流程。 |

## 沙箱裝置限制

本次也建立 API 35 Android 模擬器並嘗試以低記憶體、無視窗模式啟動。然而建置環境未提供 `/dev/kvm` 硬體虛擬化，兩次軟體模擬冷啟動均未能向 ADB 完成註冊，無法在合理時間內安裝 APK。這不是 APK 編譯或簽章失敗；APK 建置、套件資訊與簽章驗證均已通過。

## 使用者裝置上的最後確認

請在 Android 手機完成以下一次性確認：

1. 從網站側欄或[行動交付文件](./mobile-app-delivery.md)下載 APK、完成安裝後開啟 **Campus Quest**。
2. 檢查先出現深藍底與圖示的啟動畫面，再載入 Campus Quest；首次進入時若要求登入，於 App 內完成正常登入流程。
3. 在網站內打開一個內部頁面後按 Android 返回鍵，應先回到上一頁；無上一頁時才離開 App。
4. 開啟飛航模式後重新開啟 App，應顯示原生離線說明頁；恢復網路後重新開啟即可載入網站。

> 若此四步中的任一步沒有如預期運作，請回報 Android 版本、畫面截圖與出現的訊息，以便進一步調整 WebView 設定。
