# Logger

> 結�???JSON log，�??�錯??Render ?��?使用??

---

## Task: logger-01

### Goal

�?pino 建�? logger 實�?，支??config 中�? log level??

### Files

- `src/utils/logger.ts`

### Dependencies

- config-01（�???LOG_LEVEL�?
- scaffold-01（�?�?pino�?

### Acceptance Criteria

- [x] export ?�設 logger 實�?
- [x] log level ??config ?�制
- [x] 輸出 JSON ?��???stdout
- [x] ?��? `createChildLogger(bindings)` 供�?模�??�入 context（�? userId?�platform�?
- [x] ?�發?��??�選 pretty print（可?��?不強?��?

### Test Requirements

- [x] ?��?測試：logger.info �?throw
- [x] ?��?測試：child logger ?�含 bindings 欄�?
- [x] 測試檔�?`src/utils/__tests__/logger.test.ts`
- [x] 使用 spy ??mock stdout 驗�?輸出結�?

**?�估工�?�?* 1 小�?
