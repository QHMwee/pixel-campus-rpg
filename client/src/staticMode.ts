/**
 * 靜態離線模式。
 *
 * 建置時設定 VITE_STATIC_MODE=1 會產生一份「純前端」的版本：
 * 不呼叫任何 tRPC 後端、不需要登入、不需要資料庫。
 *
 * 這個模式可行的前提是：成績、課程規劃、專題、證照、技能樹的資料
 * 本來就只存在瀏覽器的 localStorage，伺服器只負責 AI 建議、PDF 轉換、
 * 附件上傳與雲端同步這幾項附加功能。拿掉伺服器後那些功能會停用，
 * 但核心功能完全不受影響，而且可以完全離線運作。
 *
 * 安全性說明：靜態版把「登入」整個拿掉，因為沒有伺服器就沒有東西需要保護
 * ——所有資料都在使用者自己的裝置上，不會離開瀏覽器。這跟在有伺服器的
 * 部署上停用登入是完全不同的事，後者絕對不能做。
 */
export const IS_STATIC_MODE = import.meta.env.VITE_STATIC_MODE === "1";

/** 靜態模式下用來取代登入身分的本機使用者。 */
export const STATIC_MODE_USER = {
  id: 1,
  openId: "static-local-user",
  email: "local@device",
  name: "本機使用者",
  loginMethod: "static",
  role: "admin",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  lastSignedIn: new Date(0),
};
