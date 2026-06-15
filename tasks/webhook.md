# Webhook Router

> POST /webhook 簽�?驗�??��??�步事件?�派；GET /health ?�康檢查??

---

## Task: webhook-01

### Goal

實�? LINE webhook 路由：簽?��?�?+ 立即??200 + ?�景?��???

### Files

- `src/routes/webhook.ts`

### Dependencies

- config-01（LINE_CHANNEL_SECRET�?
- line-handler-01
- scaffold-01（@line/bot-sdk middleware�?

### Acceptance Criteria

- [x] `POST /webhook` 使用 raw body middleware（`express.raw`）�?驗�?簽�?
- [x] 缺�??�錯�?`x-line-signature` ??401
- [x] 驗�??��? ??立即 `res.sendStatus(200)`
- [x] 事件?��???`setImmediate` ??`.then()` ?�景?��?，�??��??��?
- [x] ?�景?��??�誤 log，�? crash process

### Test Requirements

- [x] ?��?測試（supertest）�???signature ??401
- [x] ?��?測試：錯�?signature ??401
- [x] ?��?測試：正�?signature + events ??200
- [x] 測試檔�?`src/__tests__/integration/webhook.test.ts`

**?�估工�?�?* 1?? 小�?

---

## Task: webhook-02

### Goal

實�? GET /health ?�康檢查 endpoint??

### Files

- `src/routes/webhook.ts`（�? `src/routes/health.ts`�?

### Dependencies

- webhook-01

### Acceptance Criteria

- [x] `GET /health` ?�傳 `{ status: 'ok' }`，HTTP 200
- [x] 不�?認�?
- [x] Render health check ?�使?�此 path

### Test Requirements

- [x] ?��?測試：`GET /health` ??200 + `{ status: 'ok' }`

**?�估工�?�?* 0.5 小�?
