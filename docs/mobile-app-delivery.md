# Campus Quest 行動版交付與驗證說明

## 可用方式

| 方式 | 入口 | 儲存位置 | 適用情境 |
| --- | --- | --- | --- |
| PWA | [Campus Quest 網站](https://pixcamp-rpg-5oizpztd.manus.space) | 安裝時所使用瀏覽器的本機儲存空間 | 不想安裝 APK、希望由 Chrome 或 Safari 開啟 |
| Android APK | [下載 Campus Quest APK](/manus-storage/app-debug_294ac8be.apk) | App 的 Android WebView 本機儲存空間 | 想要獨立 App 圖示與直接啟動網站 |

> **資料隔離：**成績、課程規劃、專題及證照專案均僅儲存在當前瀏覽器或 WebView。Chrome、PWA、Android APK、不同手機與電腦之間**不會同步**，也不會互相讀取資料。

## Android APK 安裝

1. 在 Android 手機下載 APK；若瀏覽器顯示安全提示，請確認檔案來源為本頁的 Campus Quest 下載連結。
2. 依手機系統提示，至「設定」的「特殊應用程式存取權」或「安裝未知應用程式」，只對**目前用來下載 APK 的瀏覽器或檔案管理程式**開啟一次安裝權限。
3. 安裝完成後，從主畫面點選 **Campus Quest**。App 會以 HTTPS 開啟已發布網站；按返回鍵會先回到上一個網頁，沒有可返回的網頁時才離開 App。
4. 安裝結束後，可關閉瀏覽器／檔案管理程式的未知來源安裝權限。

> 此檔案是 **debug 簽章 APK**，用於個人側載安裝，不適合上架 Google Play，也不應透過不受信任的第三方來源散布。

## PWA 安裝

| 裝置 | 安裝方法 |
| --- | --- |
| Android（Chrome） | 開啟網站後選單 →「安裝應用程式」或「加入主畫面」 |
| iPhone（Safari） | 開啟網站後「分享」→「加入主畫面」 |

## 登入與網路限制

Android App 允許 Campus Quest 網站與其必要的 Manus HTTPS 網域；外部連結會交由系統瀏覽器開啟。首次啟動與後續載入均需網路。無法載入主要頁面時，App 會顯示離線說明頁。

若網站需要帳號登入，請在 App 內依正常頁面流程完成。WebView 的登入 Cookie 與 Chrome／Safari Cookie 不保證共用；若改用不同裝置、重裝 App、清除 App 資料或切換瀏覽器，可能需要重新登入，且本機學業資料也不會自動移轉。

## 建置與驗證紀錄

- Android 套件：`im.manus.campusquest`；最低 Android 7.0（API 24），目標 Android 15（API 35）。
- APK：`app-debug.apk`，已執行 `aapt dump badging` 驗證套件識別與應用名稱，並以 `apksigner verify --verbose` 驗證 v2 簽章。
- 啟動流程：採用 AndroidX SplashScreen；啟動時顯示深藍底與 Campus Quest 圖示，接著載入已發布網站。Android 實機／模擬器啟動仍應由安裝者完成最後確認，因為本次建置環境未連接可安裝的 Android 裝置。
