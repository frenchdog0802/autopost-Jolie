# OpenAI Service

> GPT-4o-mini Vision ?��??��?並�??��?平台?��???

---

## Task: openai-01

### Goal

建�? OpenAI client 骨架??`generateCaptions` ?��?簽�???

### Files

- `src/services/openaiService.ts`
- `src/utils/validateCaptionSet.ts`

### Dependencies

- types-01（IAIService?�CaptionSet?�AIServiceError�?
- config-01（OPENAI_API_KEY�?
- scaffold-01（�?�?openai SDK�?

### Acceptance Criteria

- [x] 實�? `IAIService` interface
- [x] constructor 注入 config ??logger
- [x] `generateCaptions(imageUrl)` ?�叫 OpenAI Chat Completions API
- [x] 使用 model `gpt-4o-mini`?�vision input（image_url�?
- [x] ?�數：max_tokens=1000?�temperature=0.7?�response_format=json_object

### Test Requirements

- [x] ?��?測試：mock OpenAI SDK，�?�?request ?�數�?��
- [x] 測試檔�?`src/services/__tests__/openaiService.test.ts`

**?�估工�?�?* 1?? 小�?

---

## Task: openai-02

### Goal

實�? system prompt ??AI ?��? JSON 驗�???

### Files

- `src/services/openaiService.ts`（prompt 常數�?
- `src/utils/validateCaptionSet.ts`

### Dependencies

- openai-01
- types-01

### Acceptance Criteria

- [x] system prompt 符�? design.md §4.4 規格
- [x] `validateCaptionSet(raw)` 驗�?三平??caption ??hashtags ?�為?�空字串
- [x] 驗�?失�? throw `AIServiceError`
- [x] OpenAI API 失�? throw `AIServiceError`（含?��? error message�?

### Test Requirements

- [x] ?��?測試：�?�?JSON ???�傳 CaptionSet
- [x] ?��?測試：缺�?instagram.caption ??throw AIServiceError
- [x] ?��?測試：OpenAI timeout / 429 ??throw AIServiceError
- [x] 測試檔�?`src/utils/__tests__/validateCaptionSet.test.ts`

**?�估工�?�?* 1 小�?

---

## Task: openai-03

### Goal

?�入 retry ?�輯（可?��???log 結�??�輸?��?

### Files

- `src/services/openaiService.ts`（擴?��?

### Dependencies

- openai-02
- logger-01

### Acceptance Criteria

- [x] ?��??��???log：userId（若?�入）、token ?��?（若 API ?�傳�?
- [x] 失�???log error ??imageUrl（�??��???API key�?
- [x] ?�選�?29 ??retry 1 次�?exponential backoff 1s�?

### Test Requirements

- [x] ?��?測試�?29 �?retry ?��? ???�傳 CaptionSet
- [x] ?��?測試：retry 仍失????throw AIServiceError

**?�估工�?�?* 1 小�?
