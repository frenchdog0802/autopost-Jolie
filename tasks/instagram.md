# Instagram Publisher

> Meta Graph API ??Instagram ?�步驟發布�?media ??media_publish）�?

---

## Task: instagram-01

### Goal

實�? Instagram ?�步驟發布�?程骨?��?

### Files

- `src/services/instagramPublisher.ts`

### Dependencies

- types-01（IPublisher?�PublishResult�?
- config-01（META_USER_ACCESS_TOKEN?�INSTAGRAM_BUSINESS_ACCOUNT_ID�?

### Acceptance Criteria

- [x] 實�? `IPublisher.publish(imageUrl, caption, hashtags)`
- [x] Step 1：`POST /{ig-user-id}/media`（image_url + caption + hashtags ?�併�?
- [x] Step 2：`POST /{ig-user-id}/media_publish`（creation_id�?
- [x] Step 3：`GET /{media-id}?fields=permalink` ?��? postUrl
- [x] 使用 fetch ??axios，access_token 作為 query param
- [x] **永�? throw**：內??catch ?�?�錯誤�??�傳 `PublishResult`

### Test Requirements

- [x] ?��?測試（msw）�?三步驟�?????`{ success: true, postUrl }`
- [x] ?��?測試：Step 1 失�? ??`{ success: false, error }`
- [x] 測試檔�?`src/services/__tests__/instagramPublisher.test.ts`

**?�估工�?�?* 1?? 小�?

---

## Task: instagram-02

### Goal

?��? Meta token ?��??�誤?��?構�? log??

### Files

- `src/services/instagramPublisher.ts`（擴?��?

### Dependencies

- instagram-01
- logger-01

### Acceptance Criteria

- [x] API ?�傳 OAuth/token ?��??�誤 ??error message ?�「token ?�能已�??�」�?�?
- [x] ?��?/失�???log：platform?�success?�postUrl ??error
- [x] caption ?�度超�? Instagram ?�制??API ?�誤�?��?�傳

### Test Requirements

- [x] ?��?測試（msw）�?模擬 token expired ?�誤 ??error message ?��??��?�?
- [x] ?��?測試：Step 2 失�? ??success: false，platform: 'instagram'

**?�估工�?�?* 1 小�?
