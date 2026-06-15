# 測試?��?設施（Testing�?

> Vitest?�MSW?�Supertest 設�???CI pipeline??

---

## Task: testing-01

### Goal

設�? vitest ?�測試目?��?構�?

### Files

- `vitest.config.ts`
- `package.json`（scripts: `test`, `test:coverage`, `typecheck`�?
- `src/__tests__/` ?��?結�?

### Dependencies

- scaffold-01

### Acceptance Criteria

- [x] 安�? vitest?�@vitest/coverage-v8
- [x] `npm test` ?��??�??`**/*.test.ts`
- [x] `npm run test:coverage` ?��? coverage report
- [x] 測試?��?結�?符�? design.md §9.2

### Test Requirements

- [x] 建�? placeholder test `src/__tests__/smoke.test.ts` ??`expect(true).toBe(true)` ?��?
- [x] `npm test` exit code 0

**?�估工�?�?* 1 小�?

---

## Task: testing-02

### Goal

設�? MSW ??Supertest 測試 helper??

### Files

- `src/__tests__/helpers/mswServer.ts`
- `src/__tests__/helpers/createTestApp.ts`
- `src/__tests__/helpers/lineSignature.ts`（產?��???LINE signature�?

### Dependencies

- testing-01
- webhook-01

### Acceptance Criteria

- [x] MSW server ?�在測試 beforeAll/afterAll ?��?
- [x] `createTestApp()` ?�傳??supertest ??Express app（mock services 注入�?
- [x] `signLineWebhook(body, secret)` helper ?��??��? signature

### Test Requirements

- [x] helper 測試：signLineWebhook ?��???signature ?��? @line/bot-sdk validateSignature
- [x] 測試檔�?`src/__tests__/helpers/lineSignature.test.ts`

**?�估工�?�?* 1?? 小�?

---

## Task: testing-03

### Goal

設�? GitHub Actions CI pipeline??

### Files

- `.github/workflows/ci.yml`

### Dependencies

- testing-01
- scaffold-02（lint�?

### Acceptance Criteria

- [x] CI 觸發：push / pull_request to main
- [x] Steps：install ??lint ??typecheck ??test:coverage
- [x] Node.js LTS ?�本
- [x] 測試失�? CI 標�?

### Test Requirements

- [x] ?�地 `npm run lint && npm run typecheck && npm run test:coverage` ?�通�?
- [x] （可?��?push �?CI 綠�?

**?�估工�?�?* 1 小�?
