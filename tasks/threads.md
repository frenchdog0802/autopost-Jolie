# Threads Publisher

> Threads API ?�步驟發布�?threads ??threads_publish）�?

---

## Task: threads-01

### Goal

實�? Threads ?�步驟發布�?程�?

### Files

- `src/services/threadsPublisher.ts`

### Dependencies

- types-01（IPublisher?�PublishResult�?
- config-01（THREADS_USER_ID?�THREADS_ACCESS_TOKEN�?

### Acceptance Criteria

- [x] 實�? `IPublisher.publish(imageUrl, caption, hashtags)`
- [x] Step 1：`POST /{threads-user-id}/threads`（media_type=IMAGE?�image_url?�text�?
- [x] Step 2：`POST /{threads-user-id}/threads_publish`（creation_id�?
- [x] Step 3：`GET /{media-id}?fields=permalink` ?��? postUrl
- [x] **永�? throw**：�???`PublishResult`

### Test Requirements

- [x] ?��?測試（msw）�?三步驟�?????`{ success: true, postUrl }`
- [x] ?��?測試：Step 1 失�? ??`{ success: false, error }`
- [x] 測試檔�?`src/services/__tests__/threadsPublisher.test.ts`

**?�估工�?�?* 1?? 小�?

---

## Task: threads-02

### Goal

?��? token ?��??��?構�? log??

### Files

- `src/services/threadsPublisher.ts`（擴?��?

### Dependencies

- threads-01
- logger-01

### Acceptance Criteria

- [x] token ?��??�誤 ??error message ?��??��?�?
- [x] log ?��??�其�?publisher 一??

### Test Requirements

- [x] ?��?測試（msw）�?token expired ??success: false

**?�估工�?�?* 0.5?? 小�?
