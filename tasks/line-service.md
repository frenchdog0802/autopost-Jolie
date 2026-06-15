# LINE Service

> 封�? LINE Messaging API：reply?�push?��?載�??�、Quick Reply 訊息建�???

---

## Task: line-service-01

### Goal

實�? LINE client 封�?：replyMessage?�pushMessage??

### Files

- `src/services/lineService.ts`

### Dependencies

- types-01（ILineService�?
- config-01（LINE_CHANNEL_ACCESS_TOKEN�?
- scaffold-01（�?�?@line/bot-sdk�?

### Acceptance Criteria

- [x] 實�? `ILineService`：至少�???`replyMessage`?�`pushMessage`
- [x] 使用 `@line/bot-sdk` MessagingApiClient ??Client
- [x] ?�援 Text Message ?��?
- [x] API 失�? log error，�? throw（�? throw ??handler 決�?，�???interface ?�件?��?

### Test Requirements

- [x] ?��?測試：mock LINE SDK，`pushMessage` 被呼?��??�數�?��
- [x] 測試檔�?`src/services/__tests__/lineService.test.ts`

**?�估工�?�?* 1 小�?

---

## Task: line-service-02

### Goal

實�??��?下�? `getMessageContent(messageId)`??

### Files

- `src/services/lineService.ts`（擴?��?

### Dependencies

- line-service-01

### Acceptance Criteria

- [x] `getMessageContent(messageId)` ?�傳 `Buffer`
- [x] 下�?失�? throw ?��??��?確錯誤�?interface ?�件?��?

### Test Requirements

- [x] ?��?測試：mock getMessageContent ???�傳 Buffer
- [x] ?��?測試�?04 ??throw

**?�估工�?�?* 0.5?? 小�?

---

## Task: line-service-03

### Goal

實�??�覽訊息??Quick Reply ?��?建�??��?

### Files

- `src/services/lineService.ts`（擴?��?
- `src/utils/buildPreviewMessage.ts`

### Dependencies

- line-service-01
- types-01（CaptionSet?�POSTBACK_ACTIONS�?

### Acceptance Criteria

- [x] `buildPreviewMessage(captions)` ?�傳 LINE Message ?�件（Text ??Flex�?
- [x] 顯示三平?��?案�?覽�?instagram / facebook / threads�?
- [x] ??Quick Reply 三�??��????��??��???�新?��??��? ?��?
- [x] postback data 符�? design.md §4.2（`action=confirm` 等�?

### Test Requirements

- [x] ?��?測試：buildPreviewMessage ?�含三平??caption ?��?
- [x] ?��?測試：Quick Reply ??3 ??action，data ?�正�?
- [x] 測試檔�?`src/utils/__tests__/buildPreviewMessage.test.ts`

**?�估工�?�?* 1?? 小�?
