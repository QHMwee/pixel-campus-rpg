/**
 * Campus Quest Service Worker
 *
 * 目的：讓安裝到手機主畫面的版本可以完全離線使用，並在有網路時自動更新。
 *
 * 策略：
 *   - 導覽請求（開啟 app）：network-first。有網路就拿最新的，順便更新快取；
 *     沒網路就用快取，所以離線時照常開得起來。
 *   - 靜態資源（JS / CSS / 圖片）：cache-first。Vite 建置的檔名帶雜湊值，
 *     內容變了檔名就會變，所以快取永遠不會拿到過期的內容。
 *   - 其他（例如 /api/）：不攔截，直接走網路。
 *
 * 更新機制：每次部署 CACHE_VERSION 會跟著建置時間改變，
 * activate 時會清掉所有舊版本快取。
 */

const CACHE_VERSION = "campus-quest-v1";
const PRECACHE_URLS = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS))
      // 單一資源抓不到不該讓整個安裝失敗
      .catch(error => console.warn("[SW] 預先快取部分失敗：", error))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 只處理同源請求；字型等跨網域資源交給瀏覽器自己的快取。
  if (url.origin !== self.location.origin) return;

  // API 一律走網路，不快取。
  if (url.pathname.includes("/api/")) return;

  // 開啟 app：優先拿最新版本，離線時退回快取。
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then(cached => cached || caches.match("./index.html"))
            .then(cached => cached || new Response("離線中且沒有可用的快取。", { status: 503 }))
        )
    );
    return;
  }

  // 靜態資源：檔名帶雜湊值，快取命中即可直接使用。
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
