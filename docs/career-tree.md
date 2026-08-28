# 職涯技能樹 — 接線說明

## 檔案放置

| 檔案 | 放到 |
| --- | --- |
| `careerTree.ts` | `shared/careerTree.ts` |
| `careerTree.test.ts` | `server/careerTree.test.ts` |
| `CareerTreePanel.tsx` | `client/src/components/CareerTreePanel.tsx` |

放好後跑 `pnpm test`，20 個測試應全過。

## Home.tsx 需要改的四個地方

### 1. import

```ts
import { CareerTreePanel } from "@/components/CareerTreePanel";
import type { CareerTrackId } from "@shared/careerTree";
```

### 2. QuestData 加一個欄位

```ts
type QuestData = {
  // ...既有欄位
  careerPath: CareerPath;      // 保留，舊的選課推薦還在用
  careerTrackId: CareerTrackId; // 新增，技能樹專用
};
```

```ts
const emptyQuestData: QuestData = {
  // ...
  careerTrackId: "frontend",
};
```

### 3. normalizeQuestData 補預設值

舊的 localStorage 存檔沒有這個欄位，要防止 undefined：

```ts
careerTrackId: parsed.careerTrackId ?? "frontend",
```

這一步不能省。`campus-quest-save-v1` 已經在使用者瀏覽器裡，少了會讓舊存檔載入後 crash。

### 4. 在 CareerQuestView 裡插入面板

```tsx
<CareerTreePanel
  courses={data.courses}
  achievements={data.achievementRecords}
  plannedCourseNames={data.plannedCourses.map(course => course.name)}
  trackId={data.careerTrackId}
  onTrackChange={id => setData(prev => ({ ...prev, careerTrackId: id }))}
/>
```

## 點亮規則

一個技能節點要「亮」，必須同時滿足：

1. **前置節點全部已亮** — 只算同一條路線裡的前置，跨路線的不擋。
2. **課程或證照達標** — 修滿 `requiredCourseCount` 門對應課程（成績非 F），**或**取得任一張對應證照（`AchievementRecord` 且 `kind: "certificate"`、`status` 為 `earned` / `completed`）。

四種狀態：`unlocked`（已點亮）、`in-progress`（有課在規劃或修一半）、`available`（可挑戰）、`locked`（前置未達成）。

規劃中的課程**不會**點亮節點，只顯示為 in-progress。這是刻意的 — 把還沒修的課算成已具備的能力，這個工具就沒有意義了。

## 課程名稱比對

比對前會正規化：去空白、全形括號轉半形、破折號統一、轉小寫。然後做**前綴比對**。

所以需求寫 `"微積分"` 會同時對到 `微積分(一)`、`微積分(二)`、`微積分演習(一)`。這是刻意放寬的，但也有副作用：`"電子電路"` 會對到 `電子電路實習` 和 `電子電路設計`。如果哪個節點不想被系列課程觸發，把需求名稱寫完整就好。

## 資料調整

想改內容都在 `shared/careerTree.ts` 兩個陣列：

- `skillNodes` — 全域技能節點池（約 40 個）。多條路線共用同一個節點，所以「程式基礎」只定義一次。
- `careerTracks` — 16 條職涯路線，各自從池裡挑 `nodeIds`，`coreNodeIds` 決定完成度分母。

加新路線只要在 `careerTracks` 加一筆、在 `CareerTrackId` 加一個字面量。**不需要**動 `academic.ts`。

`careerTree.test.ts` 裡的 `career tree data integrity` 那組測試會擋住三種常見錯誤：引用不存在的節點 id、循環相依、core 節點不在 nodeIds 裡。改資料後跑一次測試就知道有沒有寫錯。

## 為什麼不直接擴充 CareerPath

`academic.ts` 的 `CareerPath` 被 `careerFit: Record<CareerPath, number>` 綁死，`courseCatalog` 12 筆加 `ccee114CourseMap` 約 100 筆課程，每筆都要為每條職涯手寫一個適配分數。從 4 條加到 16 條，等於要手寫上千個數字，而且每個都是猜的。

技能樹用獨立的 `CareerTrackId`，只靠課程名稱與證照名稱比對，兩套系統並存，舊的選課推薦完全不受影響。

## 已知限制

- 證照名稱是比對字串。使用者在成就頁把證照打成「多益」或「TOEIC」都對得到（兩個都列了），但打成「英檢」就對不到。要更穩的話，之後可以在 `AchievementRecord` 加一個 `certificationCode` 欄位。
- 職涯路線與課程對應是我根據課程名稱推的，不是官方職能對照。有些歸類你可能不同意（例如「軟體工程」同時算在後端和前端），直接改 `nodeIds` 就好。
- 現在的證照清單偏台灣（iPAS、TQC、多益）加幾個國際大廠認證。要補國考或勞動部技術士，加進對應節點的 `certifications` 陣列即可。
