# ?�別定義（Types�?

> �?TypeScript ?�別??interface，無 runtime ?�輯??

---

## Task: types-01

### Goal

定義?�?�共?��??�、interface ?�自�?Error class??

### Files

- `src/types/index.ts`
- `src/types/errors.ts`

### Dependencies

- ?��??��? scaffold-01 並�?�?

### Acceptance Criteria

- [x] 定義 `CaptionSet`?�`PostSession`?�`SessionStatus`?�`PublishResult`
- [x] 定義 interface：`IS3Service`?�`IAIService`?�`IPublisher`?�`IPublisherRegistry`?�`ISessionStore`?�`ILineService`
- [x] 定義 Error class：`SignatureError`?�`S3UploadError`?�`AIServiceError`?�`SessionNotFoundError`?�`ConfigError`
- [x] ?�??export ??JSDoc 簡述?��?
- [x] ?�任何�???import（�??�別層�?

### Test Requirements

- [x] `npm run typecheck` ?��?
- [x] 建�? `src/types/__tests__/types.test.ts`：以 `expectTypeOf`（vitest）�? compile-time 驗�? interface 結�?

**?�估工�?�?* 1 小�?

---

## Task: types-02

### Goal

定義 LINE 事件常數??Quick Reply postback data 常數??

### Files

- `src/types/constants.ts`

### Dependencies

- types-01

### Acceptance Criteria

- [x] 定義 `POSTBACK_ACTIONS`：`confirm`?�`regenerate`?�`cancel`（�???`action=confirm` 等�?
- [x] 定義 `PLATFORMS` ???：`'instagram' | 'facebook' | 'threads'`
- [x] 定義 LINE 訊息模板常數（�??�中?�失?��??��? key ??template ?��?簽�?�?

### Test Requirements

- [x] ?��?測試：常?�值符??design.md §4.2 事件路由�?
- [x] 測試檔�?`src/types/__tests__/constants.test.ts`

**?�估工�?�?* 0.5?? 小�?
