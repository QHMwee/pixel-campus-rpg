import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * 本機開發用的假擁有者。
 *
 * 原本的登入流程依賴 Manus 的 OAuth 服務（WebDevAuthPublicService），
 * 那是外部私有服務，脫離 Manus 後無法自行架設。在還沒換掉登入機制之前，
 * 這個開關讓本機可以直接以擁有者身分進入，先把其他功能跑起來。
 *
 * 安全限制（兩個條件必須同時成立才會生效）：
 *   1. NODE_ENV !== "production"
 *   2. 明確設定 LOCAL_DEV_OWNER=1
 *
 * 正式部署時絕對不要設定 LOCAL_DEV_OWNER —— 它會讓任何人都是管理員。
 */
function getLocalDevOwner(): User | null {
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.LOCAL_DEV_OWNER !== "1") return null;

  const now = new Date();
  return {
    id: 1,
    openId: "local-dev-owner",
    email: process.env.LOCAL_DEV_EMAIL ?? "dev@localhost",
    name: process.env.LOCAL_DEV_NAME ?? "本機開發者",
    loginMethod: "local-dev",
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  } as User;
}

let warnedAboutDevOwner = false;

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const devOwner = getLocalDevOwner();
  if (devOwner) {
    if (!warnedAboutDevOwner) {
      console.warn(
        "[Auth] LOCAL_DEV_OWNER 已啟用：所有請求都以管理員身分執行，請勿用於正式環境。"
      );
      warnedAboutDevOwner = true;
    }
    return { req: opts.req, res: opts.res, user: devOwner };
  }

  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
