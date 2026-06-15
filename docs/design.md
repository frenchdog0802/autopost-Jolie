# 社群自動發文系統 — 詳細設計文件

**版本：** v0.1  
**日期：** 2026-06-14  
**基於：** docs/proposal.md v0.1

---

## 目錄

1. [系統架構](#1-系統架構)
2. [模組拆分](#2-模組拆分)
3. [資料流](#3-資料流)
4. [API 設計](#4-api-設計)
5. [Database Schema / 狀態儲存](#5-database-schema--狀態儲存)
6. [狀態管理](#6-狀態管理)
7. [驗證流程](#7-驗證流程)
8. [錯誤處理](#8-錯誤處理)
9. [測試策略](#9-測試策略)
10. [部署策略](#10-部署策略)
11. [最終目錄結構](#11-最終目錄結構)

---

## 1. 系統架構

### 1.1 整體架構圖

```
┌─────────────────────────────────────────────────────────┐
│                     Render Web Service                  │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │              Express HTTP Server                │   │
│   │                                                 │   │
│   │   POST /webhook  ──►  Webhook Router            │   │
│   │                            │                   │   │
│   │                            ▼                   │   │
│   │                    Line Handler                 │   │
│   │                  (Flow Orchestrator)            │   │
│   │                            │                   │   │
│   │          ┌─────────────────┼─────────────────┐  │   │
│   │          ▼                 ▼                 ▼  │   │
│   │    S3 Service       AI Service         Session  │   │
│   │                                         Store   │   │
│   │          ┌──────────────────────────────┐      │   │
│   │          ▼           ▼           ▼              │   │
│   │   Instagram      Facebook     Threads           │   │
│   │   Publisher      Publisher    Publisher         │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │          │          │          │          │
         ▼          ▼          ▼          ▼          ▼
      LINE API   AWS S3    OpenAI     Meta API   Threads API
```

### 1.2 架構原則

| 原則 | 做法 |
|------|------|
| 低耦合 | 各 Service 只接受 primitive / plain object 參數，不互相 import |
| 可替換 | 每個 Service 背後有 TypeScript interface，切換實作不影響上層 |
| 可測試 | 所有外部 I/O 透過 interface 注入，測試時可 mock |
| 非同步安全 | LINE webhook 立即回 200；後續處理全為 async，透過 push message 回傳結果 |

### 1.3 分層說明

```
routes/        ← HTTP 入口，只做路由與簽名驗證，不含業務邏輯
handlers/      ← 流程編排，串接各 service；不直接呼叫外部 API
services/      ← 單一外部系統的存取邏輯，可獨立測試
utils/         ← 無副作用的工具函式（logger、session store、config）
types/         ← 純型別定義，無執行期程式碼
```

---

## 2. 模組拆分

### 2.1 模組一覽

| 模組 | 路徑 | 責任 | 外部依賴 |
|------|------|------|----------|
| HTTP Server | `src/index.ts` | 啟動 Express、掛載路由 | express |
| Webhook Router | `src/routes/webhook.ts` | 接收請求、驗證 LINE 簽名、呼叫 handler | @line/bot-sdk |
| Line Handler | `src/handlers/lineHandler.ts` | 根據事件類型編排完整流程 | LineService、SessionStore、AI Service、S3 Service、Publishers |
| Line Service | `src/services/lineService.ts` | 封裝 LINE API 呼叫（reply、push、getMessageContent）| @line/bot-sdk |
| S3 Service | `src/services/s3Service.ts` | 圖片上傳 / 刪除 | @aws-sdk/client-s3 |
| AI Service | `src/services/openaiService.ts` | 呼叫 GPT-4o-mini Vision 生成三平台文案 | openai |
| Instagram Publisher | `src/services/instagramPublisher.ts` | Meta Graph API — Instagram 兩步驟發布 | fetch / axios |
| Facebook Publisher | `src/services/facebookPublisher.ts` | Meta Graph API — Facebook Page 發布 | fetch / axios |
| Threads Publisher | `src/services/threadsPublisher.ts` | Threads API 兩步驟發布 | fetch / axios |
| Publisher Registry | `src/services/publisherRegistry.ts` | 統一呼叫三個 Publisher，收集結果 | 以上三個 Publisher |
| Session Store | `src/utils/sessionStore.ts` | In-memory TTL session 管理 | 無 |
| Config | `src/config/index.ts` | 讀取與驗證環境變數，缺少必要變數則啟動失敗 | 無 |
| Logger | `src/utils/logger.ts` | 結構化 log（JSON 格式） | pino |
| Types | `src/types/index.ts` | 所有共用 TypeScript 型別 | 無 |

### 2.2 核心 Interface 定義

所有 Service 以 interface 為合約，實作類別分離。

```typescript
// src/types/index.ts

export interface CaptionSet {
  instagram: { caption: string; hashtags: string };
  facebook:  { caption: string; hashtags: string };
  threads:   { caption: string; hashtags: string };
}

export interface PostSession {
  userId: string;
  imageS3Key: string;
  imageUrl: string;
  captions: CaptionSet;
  createdAt: Date;
  status: 'pending_confirm' | 'pending_edit' | 'publishing' | 'done' | 'cancelled';
  editingPlatform?: 'instagram' | 'facebook' | 'threads';
}

export interface PublishResult {
  platform: 'instagram' | 'facebook' | 'threads';
  success: boolean;
  postUrl?: string;
  error?: string;
}

// Publisher interface — 每個平台的 publisher 必須實作
export interface IPublisher {
  publish(imageUrl: string, caption: string, hashtags: string): Promise<PublishResult>;
}

// AI Service interface
export interface IAIService {
  generateCaptions(imageUrl: string): Promise<CaptionSet>;
}

// S3 Service interface
export interface IS3Service {
  upload(buffer: Buffer, mimeType: string): Promise<{ key: string; url: string }>;
  delete(key: string): Promise<void>;
}

// Session Store interface
export interface ISessionStore {
  get(userId: string): PostSession | undefined;
  set(userId: string, session: PostSession): void;
  delete(userId: string): void;
}
```

### 2.3 模組依賴圖

```
index.ts
  └── webhook.ts (router)
        └── lineHandler.ts (handler)
              ├── lineService.ts
              ├── sessionStore.ts
              ├── s3Service.ts
              ├── openaiService.ts
              └── publisherRegistry.ts
                    ├── instagramPublisher.ts
                    ├── facebookPublisher.ts
                    └── threadsPublisher.ts

config/index.ts        ← 被所有 service 使用
utils/logger.ts        ← 被所有 service 使用
types/index.ts         ← 被所有模組使用（純型別，無 runtime）
```

---

## 3. 資料流

### 3.1 主流程：收到圖片

```
LINE User                 Webhook Router         Line Handler
    │                          │                      │
    │── 傳送圖片 ──────────────►│                      │
    │                          │                      │
    │                    驗證 LINE Signature           │
    │                    失敗 → 回 401                 │
    │                          │                      │
    │                    立即回應 200 ─────────────────►│  (async 開始)
    │                          │                      │
    │◄── "⏳ 圖片分析中..." ─────┤──── pushMessage ─────│
    │                          │                      │
    │                          │         下載圖片 (getMessageContent)
    │                          │              │
    │                          │         上傳至 S3 → 取得 imageUrl
    │                          │              │
    │                          │         呼叫 OpenAI (imageUrl)
    │                          │              │
    │                          │         儲存 Session (pending_confirm)
    │                          │              │
    │◄── 預覽文案 + Quick Reply ─┤──── pushMessage ─────│
```

### 3.2 子流程：使用者按下「發文」

```
LINE User                 Webhook Router         Line Handler          Publishers
    │                          │                      │                    │
    │── Quick Reply: CONFIRM ──►│                      │                    │
    │                    立即回 200                     │                    │
    │                          │                      │                    │
    │◄── "⏳ 發布中..." ─────────┤──── pushMessage ─────│                    │
    │                          │                      │                    │
    │                          │         讀取 Session, 更新 status=publishing
    │                          │              │
    │                          │         publisherRegistry.publishAll()
    │                          │              │                    │
    │                          │              │── Instagram ───────►│
    │                          │              │── Facebook ────────►│
    │                          │              │── Threads ─────────►│
    │                          │              │◄── [results] ───────│
    │                          │              │
    │                          │         更新 Session status=done
    │                          │         刪除 S3 圖片
    │                          │              │
    │◄── 發布結果（連結/失敗）───┤──── pushMessage ─────│
```

### 3.3 子流程：編輯文案

```
編輯：
  Quick Reply: EDIT_IG / EDIT_FB / EDIT_THREADS
    → 更新 Session status=pending_edit, editingPlatform=目標平台
    → pushMessage 提示使用者輸入新文案

  使用者傳送文字訊息（status=pending_edit）
    → 將文字寫入 session.captions[editingPlatform].caption
    → hashtags 設為空字串（使用者可將 hashtag 一併寫入 caption）
    → 更新 Session status=pending_confirm
    → pushMessage 新預覽 + Quick Reply
```

### 3.4 子流程：重新生成 / 取消

```
重新生成：
  Quick Reply: REGENERATE
    → 讀取 Session 中的 imageUrl
    → 重新呼叫 OpenAI
    → 更新 Session captions
    → pushMessage 新預覽

取消：
  Quick Reply: CANCEL
    → 刪除 S3 圖片 (session.imageS3Key)
    → 刪除 Session
    → pushMessage "已取消"
```

### 3.5 Session TTL 清理

```
SessionStore 內部 setInterval (每 60 秒)
  → 掃描所有 session
  → createdAt + 10 分鐘 < now AND status IN ('pending_confirm', 'pending_edit')
    → 刪除 S3 圖片
    → 刪除 session
```

---

## 4. API 設計

### 4.1 對外 HTTP Endpoint

| Method | Path | 說明 |
|--------|------|------|
| POST | `/webhook` | LINE 平台呼叫；驗證簽名後處理事件 |
| GET | `/health` | Render health check 用；回傳 `{ status: 'ok' }` |

#### POST /webhook

- **驗證**：`x-line-signature` header，使用 `@line/bot-sdk` 的 `validateSignature()`
- **回應**：一律回 HTTP 200（LINE 要求）
- **非同步**：驗證後立即回應，事件處理在背景執行

```typescript
// 偽碼
router.post('/webhook', lineMiddleware, (req, res) => {
  res.sendStatus(200);
  handleEventsAsync(req.body.events).catch(logger.error);
});
```

### 4.2 Line Handler 內部事件路由

| LINE Event 類型 | 條件 | 動作 |
|----------------|------|------|
| `message` | `message.type === 'image'` | 啟動圖片處理流程 |
| `message` | `message.type === 'text'` 且 session 為 `pending_edit` | 更新文案並推送新預覽 |
| `postback` | `data === 'action=confirm'` | 執行發布流程 |
| `postback` | `data === 'action=edit_instagram'` | 進入 Instagram 文案編輯 |
| `postback` | `data === 'action=edit_facebook'` | 進入 Facebook 文案編輯 |
| `postback` | `data === 'action=edit_threads'` | 進入 Threads 文案編輯 |
| `postback` | `data === 'action=regenerate'` | 重新生成文案 |
| `postback` | `data === 'action=cancel'` | 取消並清除 |
| 其他 | — | 忽略（不回應） |

### 4.3 Service 內部 Interface（TypeScript）

#### IS3Service

```typescript
interface IS3Service {
  // 上傳 buffer，回傳 S3 key 與公開 URL
  upload(buffer: Buffer, mimeType: string): Promise<{ key: string; url: string }>;
  // 刪除指定 key
  delete(key: string): Promise<void>;
}
```

#### IAIService

```typescript
interface IAIService {
  // 傳入圖片公開 URL，回傳三平台文案
  generateCaptions(imageUrl: string): Promise<CaptionSet>;
}
```

#### IPublisher

```typescript
interface IPublisher {
  // 發布單一平台，永遠 resolve（不 throw）
  publish(imageUrl: string, caption: string, hashtags: string): Promise<PublishResult>;
}
```

#### IPublisherRegistry

```typescript
interface IPublisherRegistry {
  // 並行發布所有平台，回傳各平台結果陣列
  publishAll(imageUrl: string, captions: CaptionSet): Promise<PublishResult[]>;
}
```

### 4.4 OpenAI Prompt 規格

**System Prompt：**

```
你是一位社群媒體文案專家。根據使用者提供的圖片，為以下三個平台各自生成一則貼文文案。
規則：
- 語言：繁體中文為主，可自然融入英文 hashtag
- 回傳格式：嚴格 JSON，不含任何 markdown 或額外說明
- Instagram：活潑、有個性，適合年輕族群，附 5-10 個 hashtag
- Facebook：親切自然，適合廣泛年齡層，附 3-5 個 hashtag
- Threads：簡短口語，140 字以內，附 2-3 個 hashtag

回傳格式：
{
  "instagram": { "caption": "...", "hashtags": "#tag1 #tag2 ..." },
  "facebook":  { "caption": "...", "hashtags": "#tag1 #tag2 ..." },
  "threads":   { "caption": "...", "hashtags": "#tag1 #tag2 ..." }
}
```

**模型參數：**

| 參數 | 值 |
|------|----|
| model | `gpt-4o-mini` |
| max_tokens | 1000 |
| temperature | 0.7 |
| response_format | `{ type: 'json_object' }` |

---

## 5. Database Schema / 狀態儲存

本系統為個人使用，**不使用資料庫**，採 in-memory session store。

### 5.1 PostSession 結構

```typescript
interface PostSession {
  userId: string;               // LINE User ID (也是 Map key)
  imageS3Key: string;           // S3 object key，用於刪除
  imageUrl: string;             // S3 公開 URL，用於 AI 與各平台 API
  captions: CaptionSet;         // AI 生成的三平台文案
  createdAt: Date;              // 建立時間，TTL 計算用
  status: SessionStatus;        // 狀態機狀態
  editingPlatform?: Platform;   // pending_edit 時正在編輯的平台
}

type SessionStatus = 'pending_confirm' | 'pending_edit' | 'publishing' | 'done' | 'cancelled';
```

### 5.2 Session Store 實作規格

```typescript
class InMemorySessionStore implements ISessionStore {
  private store: Map<string, PostSession>;
  private cleanupInterval: NodeJS.Timeout;
  
  constructor(private ttlMs = 10 * 60 * 1000) {
    // 每 60 秒執行一次 TTL 清理
  }
  
  get(userId: string): PostSession | undefined
  set(userId: string, session: PostSession): void
  delete(userId: string): void
  destroy(): void  // 清除 interval（測試用）
}
```

**TTL 清理邏輯：**
- 只清理 `status === 'pending_confirm'` 或 `status === 'pending_edit'` 的 session（publishing / done 由流程自行清除）
- 清理時同步刪除對應 S3 圖片（呼叫 s3Service.delete）
- 清理失敗（S3 刪除失敗）只 log，不影響 session 清除

### 5.3 未來擴充（歷史紀錄）

若未來需要發文歷史，可新增 `PostRecord` 資料表（SQLite 或 PlanetScale），只需在 `lineHandler.ts` 的發布完成後呼叫 `recordService.save()`，不影響現有模組。

---

## 6. 狀態管理

### 6.1 Session 狀態機

```
                    ┌─────────────────────────────┐
                    │           (start)           │
                    │       收到圖片訊息            │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                         ┌──────────────────┐
                         │  pending_confirm  │◄──────────┐
                         └────────┬─────────┘           │
                                  │                     │ REGENERATE / 編輯完成
                      ┌───────────┼───────┐             │
                      │           │       │             │
                   CONFIRM   EDIT_*    REGENERATE       │
                      │           │       │             │
                      │           ▼       │             │
                      │  ┌──────────────┐ │             │
                      │  │ pending_edit │─┘             │
                      │  └──────────────┘               │
                      │           │                     │
                      │        CANCEL                   │
                      │           │                     │
                      ▼           ▼                     │
              ┌──────────────┐  ┌──────────┐            │
              │  publishing  │  │cancelled │            │
              └──────┬───────┘  └──────────┘            │
                     │                                   │
           ┌─────────┴────────┐                          │
           │                  │                          │
           ▼                  ▼                          │
        ┌──────┐         (session 清除)                   │
        │ done │                                          │
        └──────┘                                          │
    (session 清除)                                        │
```

### 6.2 狀態轉換規則

| 從 | 事件 | 到 | 副作用 |
|----|------|----|--------|
| — | 收到圖片 | `pending_confirm` | 上傳 S3、生成文案、推送預覽 |
| `pending_confirm` | CONFIRM | `publishing` | 發布三平台 |
| `publishing` | 發布完成 | `done` | 刪除 S3、清除 session |
| `pending_confirm` | EDIT_* | `pending_edit` | 推送編輯提示 |
| `pending_edit` | 文字訊息 | `pending_confirm` | 更新文案、推送新預覽 |
| `pending_confirm` | REGENERATE | `pending_confirm` | 重新呼叫 AI |
| `pending_confirm` / `pending_edit` | CANCEL | `cancelled` | 刪除 S3、清除 session |
| `pending_confirm` / `pending_edit` | TTL 到期 | (清除) | 刪除 S3、清除 session |

### 6.3 並發保護

同一個 `userId` 在 `publishing` 狀態時收到新圖片，**拒絕處理並回覆「目前有貼文正在發布中，請稍後再試」**。

實作方式：`lineHandler` 在收到圖片時先檢查 `session?.status === 'publishing'`。

---

## 7. 驗證流程

### 7.1 LINE Webhook 簽名驗證

```
POST /webhook
    │
    ├── 取得 x-line-signature header
    │   └── 缺少 → 回 401
    │
    ├── validateSignature(rawBody, channelSecret, signature)
    │   └── 驗證失敗 → 回 401
    │
    └── 繼續處理
```

實作使用 `@line/bot-sdk` 的 middleware，需確保 Express 取得的是 raw body（不能先 parse JSON）。

```typescript
// 正確設定：raw body middleware 放在 LINE middleware 之前
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use('/webhook', lineBotMiddleware(lineConfig));
```

### 7.2 使用者白名單驗證

```typescript
// lineHandler.ts — 所有事件處理的第一步
function isAllowedUser(userId: string): boolean {
  return userId === config.ALLOWED_LINE_USER_ID;
}

// 不在白名單 → 靜默忽略（不回覆，避免洩漏系統存在）
```

### 7.3 環境變數驗證

系統啟動時（`config/index.ts`）驗證所有必要環境變數，缺少任何一個則**拋出例外終止進程**，避免服務以錯誤設定執行。

```typescript
const REQUIRED_ENV_VARS = [
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LINE_CHANNEL_SECRET',
  'ALLOWED_LINE_USER_ID',
  'OPENAI_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'S3_BUCKET_NAME',
  'META_USER_ACCESS_TOKEN',
  'INSTAGRAM_BUSINESS_ACCOUNT_ID',
  'FACEBOOK_PAGE_ID',
  'THREADS_USER_ID',
  'THREADS_ACCESS_TOKEN',
] as const;
```

### 7.4 OpenAI 回應格式驗證

AI 回傳 JSON 後需驗證結構，防止格式錯誤導致後續崩潰：

```typescript
function validateCaptionSet(raw: unknown): CaptionSet {
  // 檢查三個平台的 caption 與 hashtags 是否皆為非空字串
  // 驗證失敗 → throw AIResponseError
}
```

---

## 8. 錯誤處理

### 8.1 錯誤分類

| 錯誤類型 | 來源 | 處理方式 |
|----------|------|----------|
| `SignatureError` | LINE webhook 驗證失敗 | 回 401，記錄 log |
| `UnauthorizedUserError` | 非白名單使用者 | 靜默忽略 |
| `S3UploadError` | 圖片上傳失敗 | push「圖片上傳失敗，請稍後再試」|
| `AIServiceError` | OpenAI 呼叫失敗 / 格式錯誤 | push「AI 文案生成失敗，請稍後再試」|
| `PublishError` | 單一平台發布失敗 | 記錄失敗平台，其他平台繼續；回報部分失敗 |
| `SessionNotFoundError` | Quick Reply 但 session 不存在 | push「操作已過期，請重新上傳圖片」|
| `ConfigError` | 環境變數缺失 | 終止進程，Render 會重啟並告警 |

### 8.2 Publisher 錯誤隔離原則

三個 Publisher 使用 `Promise.allSettled()`（而非 `Promise.all()`），確保單一平台失敗不影響其他平台：

```typescript
// publisherRegistry.ts
async publishAll(imageUrl: string, captions: CaptionSet): Promise<PublishResult[]> {
  const tasks = [
    this.instagram.publish(imageUrl, captions.instagram.caption, captions.instagram.hashtags),
    this.facebook.publish(imageUrl, captions.facebook.caption, captions.facebook.hashtags),
    this.threads.publish(imageUrl, captions.threads.caption, captions.threads.hashtags),
  ];
  
  const results = await Promise.allSettled(tasks);
  
  return results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    // 將 rejection 轉為 PublishResult { success: false }
    return { platform: PLATFORMS[i], success: false, error: result.reason?.message };
  });
}
```

### 8.3 IPublisher 永不 throw 原則

每個 Publisher 的 `publish()` 方法必須在內部 catch 所有錯誤，回傳 `PublishResult`：

```typescript
async publish(...): Promise<PublishResult> {
  try {
    // ... API 呼叫
    return { platform: 'instagram', success: true, postUrl: '...' };
  } catch (err) {
    logger.error({ err, platform: 'instagram' }, 'Publish failed');
    return { platform: 'instagram', success: false, error: err.message };
  }
}
```

### 8.4 全域 Unhandled Rejection 處理

```typescript
// index.ts
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  // 不終止進程，避免 Render 不必要重啟
});
```

### 8.5 回覆訊息格式

| 情境 | LINE 訊息 |
|------|-----------|
| 全部成功 | "✅ 發布成功！\n📸 Instagram: {url}\n📘 Facebook: {url}\n🧵 Threads: {url}" |
| 部分失敗 | "⚠️ 部分發布失敗\n✅ Instagram: {url}\n❌ Facebook: {error}\n✅ Threads: {url}" |
| 全部失敗 | "❌ 發布失敗，請稍後再試" |

---

## 9. 測試策略

### 9.1 測試框架

| 工具 | 用途 |
|------|------|
| `vitest` | 單元測試、整合測試 runner |
| `@vitest/coverage-v8` | 測試覆蓋率 |
| `msw` (Mock Service Worker) | mock 外部 HTTP API |
| `supertest` | HTTP endpoint 測試 |

### 9.2 測試分層

#### 單元測試（`src/**/__tests__/*.test.ts`）

每個 Service / Handler 以 mock 取代外部依賴，測試業務邏輯。

| 測試目標 | Mock 對象 | 測試重點 |
|----------|-----------|----------|
| `openaiService` | OpenAI SDK | 正常回傳、格式錯誤、API 失敗 |
| `s3Service` | AWS SDK | 上傳成功、上傳失敗、刪除 |
| `instagramPublisher` | HTTP (msw) | 兩步驟成功、第一步失敗、第二步失敗 |
| `facebookPublisher` | HTTP (msw) | 發布成功、失敗 |
| `threadsPublisher` | HTTP (msw) | 兩步驟成功、失敗 |
| `publisherRegistry` | 三個 Publisher | 全成功、部分失敗、全失敗 |
| `sessionStore` | — | set/get/delete、TTL 清理（time mock） |
| `lineHandler` | 所有 Services | 各事件的完整流程、白名單過濾、並發保護 |

#### 整合測試（`src/__tests__/integration/*.test.ts`）

以 `supertest` 打 `/webhook` endpoint，測試：

| 測試案例 |
|----------|
| 缺少 signature header → 401 |
| 錯誤 signature → 401 |
| 正確 signature + image event → 200（非同步處理） |
| 正確 signature + postback CONFIRM → 200 |

#### 端對端測試（手動）

在 Render 部署後，透過 LINE 實際操作一次完整流程，確認各平台貼文連結正確。

### 9.3 測試覆蓋率目標

| 層次 | 目標覆蓋率 |
|------|-----------|
| Services | ≥ 80% |
| Handler | ≥ 80% |
| Utils | ≥ 90% |
| Routes | ≥ 70% |

### 9.4 CI 執行

```yaml
# .github/workflows/ci.yml（若使用 GitHub Actions）
- run: npm run lint
- run: npm run typecheck
- run: npm run test:coverage
```

---

## 10. 部署策略

### 10.1 Render Web Service 設定

| 項目 | 值 |
|------|----|
| Build Command | `npm install && npm run build` |
| Start Command | `node dist/index.js` |
| Instance Type | Free / Starter（個人用量） |
| Region | 就近選擇（建議 Singapore） |
| Health Check Path | `/health` |

### 10.2 環境變數管理

- 所有 secret 在 Render Dashboard 的 Environment 設定
- 不進 `.env` 以外的版本控制（`.env` 加入 `.gitignore`）
- `.env.example` 列出所有必要變數名稱（無值）

### 10.3 部署流程

```
開發
  └── git push origin main
        └── Render 自動 pull → build → deploy
              └── 新 instance 啟動 → health check 通過 → 舊 instance 下線
```

> Render 的 Free tier 會在閒置 15 分鐘後 sleep。第一次 webhook 到達時 cold start 約 30 秒，可能超過 LINE 5 秒 timeout。建議升級到 Starter（$7/月）以避免 sleep。

### 10.4 Meta Access Token 維護

Meta User Access Token 有效期 60 天，需在到期前更新：

| 步驟 | 做法 |
|------|------|
| 偵測 | 在 `facebookPublisher` / `instagramPublisher` 中，若 API 回傳 token 過期錯誤，push LINE 通知使用者 |
| 更新 | 手動至 Meta Developer Console 產生新 long-lived token，更新 Render 環境變數 |
| 未來 | 可實作 token refresh endpoint，在 token 到期前 7 天自動換新 |

### 10.5 日誌與監控

| 工具 | 用途 |
|------|------|
| `pino` | 結構化 JSON log，輸出至 stdout |
| Render Logs | 即時查看 stdout log |
| Render Metrics | CPU / Memory 監控 |

Log 結構：

```json
{
  "level": "info",
  "time": "2026-06-14T10:00:00.000Z",
  "userId": "Uxxxx",
  "action": "publish",
  "platform": "instagram",
  "success": true,
  "postUrl": "https://www.instagram.com/p/xxx"
}
```

---

## 11. 最終目錄結構

```
autoPost-Jolie/
├── src/
│   ├── index.ts                        # Express 啟動、掛載路由
│   ├── config/
│   │   └── index.ts                    # 環境變數讀取與驗證
│   ├── routes/
│   │   └── webhook.ts                  # POST /webhook + GET /health
│   ├── handlers/
│   │   └── lineHandler.ts              # 流程編排（事件路由 → service 呼叫）
│   ├── services/
│   │   ├── lineService.ts              # LINE API 封裝
│   │   ├── s3Service.ts                # AWS S3 上傳 / 刪除
│   │   ├── openaiService.ts            # GPT-4o-mini Vision 文案生成
│   │   ├── instagramPublisher.ts       # Instagram 兩步驟發布
│   │   ├── facebookPublisher.ts        # Facebook Page 發布
│   │   ├── threadsPublisher.ts         # Threads 兩步驟發布
│   │   └── publisherRegistry.ts        # 並行發布 + 結果彙整
│   ├── utils/
│   │   ├── sessionStore.ts             # In-memory TTL session store
│   │   └── logger.ts                   # pino logger 實例
│   └── types/
│       └── index.ts                    # 共用型別與 interface
├── src/__tests__/
│   ├── services/                       # 各 service 單元測試
│   ├── handlers/                       # lineHandler 單元測試
│   └── integration/                    # /webhook endpoint 整合測試
├── docs/
│   ├── proposal.md
│   └── design.md
├── .env                                # 本地開發用（不進 git）
├── .env.example                        # 環境變數範本（進 git）
├── .gitignore
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

*本文件反映 proposal.md v0.1 的設計決策。若需求變更，請同步更新本文件。*
