# Publisher Registry

> 統�??�叫三平??Publisher，並行發布並彙整結�???

---

## Task: publisher-registry-01

### Goal

實�? `PublisherRegistry.publishAll()`：並行呼?��?平台??

### Files

- `src/services/publisherRegistry.ts`

### Dependencies

- types-01（IPublisherRegistry?�CaptionSet?�PublishResult�?
- instagram-01?�facebook-01?�threads-01（interface 層面，測試用 mock�?

### Acceptance Criteria

- [x] 實�? `IPublisherRegistry.publishAll(imageUrl, captions)`
- [x] 使用 `Promise.allSettled` 並�??�叫三�?publisher
- [x] ?�傳 `PublishResult[]`（長�?3，�?序固定�?instagram?�facebook?�threads�?
- [x] ?��? publisher rejection 轉為 `{ success: false, error }`，�?影響?��?

### Test Requirements

- [x] ?��?測試：�?平台?��?????3 ??success: true
- [x] ?��?測試：facebook 失�? ???��?仍�???
- [x] ?��?測試：�?平台?�失????3 ??success: false
- [x] 測試檔�?`src/services/__tests__/publisherRegistry.test.ts`

**?�估工�?�?* 1 小�?

---

## Task: publisher-registry-02

### Goal

實�??��?結�??��??�函式�?�?LINE Handler 使用??

### Files

- `src/utils/formatPublishResults.ts`

### Dependencies

- publisher-registry-01
- types-01

### Acceptance Criteria

- [x] `formatPublishResults(results)` ?�傳 LINE 訊息字串
- [x] ?�部?��? ??design.md §8.5 ?��?（含?�平?��??�?
- [x] ?��?失�? ??標示 ?????�平??
- [x] ?�部失�? ???��? ?��?失�?，�?稍�??�試??

### Test Requirements

- [x] ?��?測試：全?��? / ?��?失�? / ?�失??三種?��?
- [x] 測試檔�?`src/utils/__tests__/formatPublishResults.test.ts`

**?�估工�?�?* 1 小�?
