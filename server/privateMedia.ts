import type { Express } from "express";
import { getPrivateAchievementMedia } from "./db";
import { storageGetSignedUrl } from "./storage";
import { sdk } from "./_core/sdk";

export function registerPrivateMediaRoutes(app: Express) {
  app.get("/api/private-media/:mediaId", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user || user.role !== "admin") return res.status(403).send("私人附件需要本人登入");
      const evidence = await getPrivateAchievementMedia(user.id, req.params.mediaId);
      if (!evidence) return res.status(404).send("找不到附件");
      const signedUrl = await storageGetSignedUrl(evidence.storageKey);
      res.setHeader("Cache-Control", "private, no-store");
      return res.redirect(302, signedUrl);
    } catch {
      return res.status(404).send("找不到附件");
    }
  });
}
