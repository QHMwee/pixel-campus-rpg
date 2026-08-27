import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { aiPlannerRouter } from "./routers/aiPlanner";
import { academicSyncRouter } from "./routers/academicSync";
import { achievementMediaRouter } from "./routers/achievementMedia";
import { notionSyncRouter } from "./routers/notionSync";
import { transcriptPdfRouter } from "./routers/transcriptPdf";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  aiPlanner: aiPlannerRouter,
  academicSync: academicSyncRouter,
  achievementMedia: achievementMediaRouter,
  notionSync: notionSyncRouter,
  transcriptPdf: transcriptPdfRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    ownerAccess: adminProcedure.query(({ ctx }) => ({
      name: ctx.user.name ?? "本人",
      role: ctx.user.role,
    })),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
