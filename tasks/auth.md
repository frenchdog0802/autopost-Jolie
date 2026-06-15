# 驗�??��?權�?Auth�?

> �?design.md §7 實�? LINE webhook 簽�?驗�??�使?�者白?�單工具，�? routes / handlers ?�用??

---

## Task: auth-01

### Goal

實�?純函式�?證工?��?LINE 簽�?驗�??�使?�者白?�單檢查??

### Files

- `src/utils/auth.ts`

### Dependencies

- scaffold-01
- scaffold-02
- types-01（`SignatureError`�?
- config-01（`ALLOWED_LINE_USER_ID`?�`LINE_CHANNEL_SECRET` ?�別?�考�?
- testing-01

### Acceptance Criteria

- [x] `validateLineSignature(rawBody: Buffer, signature: string | undefined, channelSecret: string): void`
  - 缺�? `signature` ??throw `SignatureError`
  - 簽�?不符 ??throw `SignatureError`
  - 使用 `@line/bot-sdk` ??`validateSignature()`
- [x] `isAllowedUser(userId: string, allowedUserId: string): boolean`
  - 完全比�?（strict equality�?
  - 不在?��??????�傳 `false`（呼?�端?��?忽略，�? design.md §7.2�?
- [x] ?��??��??��?，無?��??�、�?讀??`process.env`
- [x] ?�?��??��??�傳?��??�確?�別，�?�?`any`

### Test Requirements

- [x] ?��?測試：�??�簽????�?throw
- [x] ?��?測試：缺�?signature ??throw `SignatureError`
- [x] ?��?測試：錯�?signature ??throw `SignatureError`
- [x] ?��?測試：白?�單 userId ?�符 ??`true`
- [x] ?��?測試：白?�單 userId 不符 ??`false`
- [x] 測試檔�?`src/utils/__tests__/auth.test.ts`
- [x] 測試使用 `crypto.createHmac('sha256', secret)` ?��??��??��?簽�?，�?依賴外部 I/O

**?�估工�?�?* 1 小�?

---

## Task: auth-02

### Goal

實�? Express middleware：在 raw body 上�?�?LINE webhook 簽�?，失?��? 401??

### Files

- `src/middleware/lineSignature.ts`

### Dependencies

- auth-01
- types-01（`SignatureError`�?

### Acceptance Criteria

- [x] `createLineSignatureMiddleware(channelSecret: string): RequestHandler`
- [x] �?`x-line-signature` header 讀?�簽??
- [x] 使用 `req.body`（�??�為 `Buffer`，由上游 `express.raw` ?��?�?
- [x] 驗�?失�? ??`res.sendStatus(401)`，�??�叫 `next()`
- [x] 驗�??��? ??`next()`
- [x] middleware 不含業�??�輯，�?負責簽�?驗�?

### Test Requirements

- [x] ?��?測試（mock req/res/next）�?缺�? signature ??401?�next ?�呼??
- [x] ?��?測試：錯�?signature ??401
- [x] ?��?測試：正�?signature + Buffer body ??next() 被呼??
- [x] 測試檔�?`src/middleware/__tests__/lineSignature.test.ts`

**?�估工�?�?* 1 小�?
