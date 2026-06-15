# Facebook Publisher

> Meta Graph API ??Facebook Page ?�步驟發布�?photos）�?

---

## Task: facebook-01

### Goal

實�? Facebook Page ?��??��???

### Files

- `src/services/facebookPublisher.ts`

### Dependencies

- types-01（IPublisher?�PublishResult�?
- config-01（META_USER_ACCESS_TOKEN?�FACEBOOK_PAGE_ID�?

### Acceptance Criteria

- [x] 實�? `IPublisher.publish(imageUrl, caption, hashtags)`
- [x] `POST /{page-id}/photos`（url + caption + hashtags ?�併 + published=true�?
- [x] ?��???`post_id` 組�????：`https://facebook.com/{post_id}`
- [x] **永�? throw**：�???`PublishResult`

### Test Requirements

- [x] ?��?測試（msw）�??��? ??`{ success: true, postUrl }`
- [x] ?��?測試：API 500 ??`{ success: false, error }`
- [x] 測試檔�?`src/services/__tests__/facebookPublisher.test.ts`

**?�估工�?�?* 1?? 小�?

---

## Task: facebook-02

### Goal

?��? token ?��??��?構�? log??

### Files

- `src/services/facebookPublisher.ts`（擴?��?

### Dependencies

- facebook-01
- logger-01

### Acceptance Criteria

- [x] token ?��??�誤 ??error message ?��??��?�?
- [x] log ?��???instagramPublisher 一??

### Test Requirements

- [x] ?��?測試（msw）�?token expired ??success: false，error ?��?�?

**?�估工�?�?* 0.5?? 小�?
