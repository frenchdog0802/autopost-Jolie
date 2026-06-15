# 社群自動發文系統 — 需求文件

**版本：** v0.1  
**日期：** 2026-06-14  
**作者：** 個人專案

---

## 1. 專案目標

透過 LINE Bot 作為操作入口，上傳一張圖片後由 AI 自動分析並為各社群平台分別生成客製化文案，使用者預覽確認後一鍵同步發布到 Instagram、Facebook、Threads，並回傳各平台貼文連結。

**核心價值：**
- 消除手動跨平台複製貼文的重複工作
- AI 自動針對各平台風格調整語氣與格式
- 全流程透過 LINE 操作，不需打開任何平台 App

---

## 2. 核心功能

| 功能 | 說明 |
|------|------|
| 圖片接收 | LINE Bot 接收使用者傳入的單張圖片 |
| 圖片暫存 | 上傳至 S3，取得公開 URL 供 AI 與各平台使用 |
| AI 文案生成 | 呼叫 OpenAI GPT-4o mini Vision 分析圖片，為每個平台各自生成客製化文案 |
| 預覽確認 | LINE 回傳各平台文案預覽，提供快速回覆按鈕操作 |
| 多平台同步發布 | 確認後同時發布至 Instagram、Facebook、Threads |
| 回傳結果 | 發布完成後回傳各平台貼文連結 |

---

## 3. 使用者流程

```
使用者 (LINE)
    │
    ├─ 傳送單張圖片
    │
    ▼
LINE Bot 接收 webhook
    │
    ├─ 將圖片上傳至 S3，取得公開 URL
    │
    ▼
呼叫 OpenAI GPT-4o mini（Vision）
    │
    ├─ 分析圖片內容
    ├─ 生成 Instagram 文案（繁中 + 英文 hashtag，活潑風格）
    ├─ 生成 Facebook 文案（繁中 + 英文 hashtag，較正式或親切）
    └─ 生成 Threads 文案（繁中 + 英文 hashtag，簡短口語）
    │
    ▼
LINE 回傳預覽訊息
    ├─ 顯示三平台文案
    └─ 快速回覆按鈕：[✅ 發文] [🔄 重新生成] [❌ 取消]
    │
    ├─ 按下「重新生成」→ 重新呼叫 AI，回傳新版預覽
    ├─ 按下「取消」→ 結束流程，清除暫存圖片
    │
    └─ 按下「發文」
           │
           ├─ POST 至 Instagram Graph API
           ├─ POST 至 Facebook Graph API
           └─ POST 至 Threads API
           │
           ▼
    LINE 回傳結果訊息
    ├─ 成功：回傳各平台貼文連結
    └─ 部分失敗：標示哪個平台失敗及原因
```

---

## 4. 技術需求

### 4.1 技術棧

| 層次 | 技術 |
|------|------|
| 執行環境 | Node.js (LTS) |
| 框架 | Express + TypeScript |
| LINE 整合 | `@line/bot-sdk` |
| AI | OpenAI API — `gpt-4o-mini`（Vision） |
| 圖片儲存 | AWS S3（暫存，發文完成後可設定 TTL 自動刪除） |
| 社群發布 | Meta Graph API（Instagram、Facebook）、Threads API |
| 部署 | Render（Web Service） |

### 4.2 環境變數

```
# LINE
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=

# OpenAI
OPENAI_API_KEY=

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET_NAME=

# Meta / Instagram
META_APP_ID=
META_APP_SECRET=
META_USER_ACCESS_TOKEN=         # 長效 token
INSTAGRAM_BUSINESS_ACCOUNT_ID=
FACEBOOK_PAGE_ID=

# Threads
THREADS_USER_ID=
THREADS_ACCESS_TOKEN=
```

### 4.3 專案結構

```
autoPost-Jolie/
├── src/
│   ├── index.ts                # Express 入口
│   ├── routes/
│   │   └── webhook.ts          # LINE webhook 路由
│   ├── services/
│   │   ├── lineService.ts      # LINE Bot 訊息處理
│   │   ├── s3Service.ts        # 圖片上傳至 S3
│   │   ├── openaiService.ts    # AI 文案生成
│   │   ├── instagramService.ts # Instagram 發布
│   │   ├── facebookService.ts  # Facebook 發布
│   │   └── threadsService.ts   # Threads 發布
│   ├── utils/
│   │   └── sessionStore.ts     # 暫存使用者 session（等待確認狀態）
│   └── types/
│       └── index.ts            # 共用型別
├── docs/
│   └── proposal.md
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 5. 非功能需求

| 項目 | 需求 |
|------|------|
| 回應時間 | LINE Bot 須在 5 秒內回應（符合 LINE webhook timeout 規範）；AI 生成為非同步，先回傳「處理中」訊息 |
| 可靠性 | 各平台發布失敗不影響其他平台；失敗需明確回報給使用者 |
| 安全性 | 驗證 LINE webhook signature，防止偽造請求 |
| 圖片暫存期限 | S3 物件設定 TTL 1 小時，或發文完成後主動刪除 |
| 日誌 | 記錄每次發文的請求 / 回應，方便除錯 |
| 個人使用規模 | 不需要水平擴展，單一 Render instance 即可 |

---

## 6. 權限設計

本系統為個人使用，**不設帳號系統**。

安全控管方式：
- LINE Bot 僅回應來自**指定 LINE User ID** 的訊息（在 `lineService.ts` 做白名單過濾）
- 所有 API 金鑰存於 Render 環境變數，不進版本控制
- Meta Access Token 使用長效 token（60 天），需定期手動更新或設定自動換新機制

---

## 7. API 需求

### 7.1 LINE Messaging API

| 項目 | 說明 |
|------|------|
| Webhook | 接收圖片訊息、Quick Reply 回覆事件 |
| Reply Message | 回傳文案預覽（Flex Message 或多個 Text Message） |
| Quick Reply | 三個按鈕：發文、重新生成、取消 |
| 圖片下載 | 使用 `getMessageContent()` 下載圖片內容 |

### 7.2 OpenAI API

| 項目 | 說明 |
|------|------|
| 模型 | `gpt-4o-mini` |
| 功能 | Vision（圖片 URL 輸入） |
| Prompt 策略 | System prompt 指定各平台風格；一次呼叫同時生成三平台文案（JSON 格式回傳） |
| 語言規則 | 繁體中文為主，可自然融入英文 hashtag |

**AI 輸出格式（JSON）：**

```json
{
  "instagram": {
    "caption": "...",
    "hashtags": "#tag1 #tag2 ..."
  },
  "facebook": {
    "caption": "...",
    "hashtags": "#tag1 #tag2 ..."
  },
  "threads": {
    "caption": "...",
    "hashtags": "#tag1 #tag2 ..."
  }
}
```

### 7.3 Meta Graph API — Instagram

| 步驟 | API | 說明 |
|------|-----|------|
| 1. 建立 Media Object | `POST /{ig-user-id}/media` | 傳入圖片 URL + caption |
| 2. 發布貼文 | `POST /{ig-user-id}/media_publish` | 傳入上一步的 creation_id |
| 3. 取得貼文連結 | `GET /{media-id}?fields=permalink` | 回傳貼文連結 |

### 7.4 Meta Graph API — Facebook

| 步驟 | API | 說明 |
|------|-----|------|
| 發布貼文 | `POST /{page-id}/photos` | 傳入圖片 URL + caption，同時發布至 Page |
| 取得貼文連結 | 由回傳的 `post_id` 組合連結 | `https://facebook.com/{post_id}` |

### 7.5 Threads API

| 步驟 | API | 說明 |
|------|-----|------|
| 1. 建立 Media Container | `POST /{threads-user-id}/threads` | `media_type=IMAGE`，傳入圖片 URL + text |
| 2. 發布貼文 | `POST /{threads-user-id}/threads_publish` | 傳入 creation_id |
| 3. 取得貼文連結 | `GET /{media-id}?fields=permalink` | 回傳貼文連結 |

---

## 8. 資料模型

本系統為個人使用且無資料庫，採 **In-memory session store** 暫存等待確認的狀態。

### PostSession（記憶體暫存）

```typescript
interface PostSession {
  userId: string;           // LINE User ID
  imageS3Key: string;       // S3 物件 key（用於後續刪除）
  imageUrl: string;         // S3 公開 URL
  captions: {
    instagram: { caption: string; hashtags: string };
    facebook:  { caption: string; hashtags: string };
    threads:   { caption: string; hashtags: string };
  };
  createdAt: Date;          // 超時清除用（TTL: 10 分鐘）
  status: 'pending_confirm' | 'publishing' | 'done' | 'cancelled';
}
```

> Session 以 `userId` 為 key 儲存，每個使用者同時只有一個進行中的 session。
> 超過 10 分鐘未操作自動清除，並刪除對應 S3 圖片。

---

## 9. 風險分析

| 風險 | 可能性 | 影響 | 對策 |
|------|--------|------|------|
| Meta Access Token 過期 | 中 | 高（發布全部失敗） | 記錄 token 到期日；Render 環境變數手動更新；未來可串接 token refresh 流程 |
| LINE webhook 5 秒 timeout | 高 | 中（使用者體驗差） | AI 呼叫為非同步：先回應 "處理中"，完成後主動 push 訊息 |
| OpenAI API 限速或費用 | 低 | 低 | 個人用量低，gpt-4o-mini 成本極低，可接受 |
| S3 圖片公開 URL 安全 | 中 | 低（個人內容） | URL 含隨機 key，不易猜測；TTL 1 小時後失效 |
| Instagram 不支援外部圖片 URL | 低 | 高 | S3 需設定 CORS 與 public read；測試時確認 URL 可被 Meta 爬取 |
| Threads API 變動 | 中 | 中 | 記錄使用的 API 版本；上線後定期確認 changelog |
| 小紅書無官方 API | 確定 | — | MVP 不納入，未來評估後再決定方案 |

---

## 10. 未來擴充方向

| 項目 | 說明 |
|------|------|
| 小紅書支援 | 待官方 API 開放，或評估 Playwright 自動化方案的合規風險 |
| 多張圖片 | 支援 Carousel 貼文（Instagram、Facebook 均支援） |
| 補充說明輸入 | 上傳圖片時可附加文字說明（主題、情境）給 AI 參考 |
| 排程發布 | 指定時間發布，而非即時發布 |
| 歷史紀錄 | 串接輕量資料庫（如 SQLite 或 PlanetScale）儲存發文歷史 |
| 手動編輯文案 | 在確認前允許使用者修改 AI 生成的文案 |
| 多平台選擇性發布 | 確認時可選擇只發到部分平台 |
| Meta Token 自動更新 | 實作 token refresh 流程，避免手動維護 |

---

## 附錄：參考文件

- [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/)
- [Meta Graph API](https://developers.facebook.com/docs/graph-api/)
- [Instagram Graph API — Content Publishing](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Threads API](https://developers.facebook.com/docs/threads/)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
