# Session Store

> In-memory TTL session 管�?，支??get / set / delete ?�自?��??��?

---

## Task: session-store-01

### Goal

實�? `InMemorySessionStore` ?�本 CRUD（get / set / delete）�?

### Files

- `src/utils/sessionStore.ts`

### Dependencies

- types-01（PostSession?�ISessionStore�?

### Acceptance Criteria

- [x] 實�? `ISessionStore` interface
- [x] �?`Map<string, PostSession>` ?��?，key ??userId
- [x] `set` 覆寫??userId ?��? session
- [x] `get` ?��??��???`undefined`
- [x] `delete` ?��?（�?存在也�? throw�?
- [x] export `destroy()` 供測試�???

### Test Requirements

- [x] ?��?測試：set ??get ?�傳?��? session
- [x] ?��?測試：delete �?get ?�傳 undefined
- [x] ?��?測試：�? userId set ?�次 ??保�??�??
- [x] 測試檔�?`src/utils/__tests__/sessionStore.test.ts`

**?�估工�?�?* 1 小�?

---

## Task: session-store-02

### Goal

實�? TTL ?��?清�?：�? 60 秒�??��?清除?��? `pending_confirm` session??

### Files

- `src/utils/sessionStore.ts`（擴?��?

### Dependencies

- session-store-01

### Acceptance Criteria

- [x] constructor ?��? `ttlMs` ?�數（�?�?10 ?��?�?
- [x] �?60 秒執�?cleanup
- [x] ?��???`status === 'pending_confirm'` �?`createdAt + ttlMs < now` ??session
- [x] `publishing` / `done` / `cancelled` ?�?��?�?TTL 清�?
- [x] cleanup ?��??�選 `onExpire(session)` callback（�? S3 ?�除，�??�此 task 實�? S3 ?�叫�?

### Test Requirements

- [x] 使用 `vi.useFakeTimers()` 測試 TTL ?��?�?session 被�???
- [x] ?��?測試：`publishing` ?�??session 不被 TTL 清除
- [x] ?��?測試：`onExpire` callback 被呼?��??�入�?�� session

**?�估工�?�?* 1?? 小�?

---

## Task: session-store-03

### Goal

?��? S3 ?�除??TTL cleanup ?��???delete 流�???

### Files

- `src/utils/sessionStore.ts`（擴?��?
- `src/bootstrap.ts`（wiring onExpire ??s3Service.delete�?

### Dependencies

- session-store-02
- s3-02（delete ?��?�?

### Acceptance Criteria

- [x] TTL 清�??�呼??`s3Service.delete(session.imageS3Key)`
- [x] S3 ?�除失�???log，�??�止 session 清除
- [x] bootstrap �?�� wiring callback

### Test Requirements

- [x] ?��?測試：mock s3Service.delete，TTL ?��?後被?�叫一�?
- [x] ?��?測試：s3Service.delete throw ??session 仍被清除，logger.error 被呼??

**?�估工�?�?* 1 小�?
