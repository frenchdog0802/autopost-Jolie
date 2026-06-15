# HTTP Server

> Express ?�口：�?載路?�、全?�錯誤�??�、unhandled rejection??

---

## Task: http-server-01

### Goal

實�? Express app ?�口?�路?��?載�?

### Files

- `src/index.ts`
- `src/bootstrap.ts`（若 scaffold-03 已建立�?

### Dependencies

- webhook-01?�webhook-02
- config-01
- bootstrap / ??service wiring

### Acceptance Criteria

- [x] 建�? Express app，�?�?webhook router
- [x] ??�� `config.PORT`
- [x] ?��???log?�Server listening on port {PORT}??
- [x] ?��??��???config（缺�?env ??process exit�?

### Test Requirements

- [x] ?��?測試：app ?�透�? supertest 存�? /health
- [x] ?��?：`npm run dev` ?��???error

**?�估工�?�?* 1 小�?

---

## Task: http-server-02

### Goal

?�入?��? unhandled rejection ?��???graceful shutdown??

### Files

- `src/index.ts`（擴?��?

### Dependencies

- http-server-01
- logger-01
- session-store-01（destroy interval on shutdown�?

### Acceptance Criteria

- [x] `process.on('unhandledRejection')` ??log error，�?終止 process
- [x] SIGTERM / SIGINT ???��? server?�sessionStore.destroy()?�process.exit(0)
- [x] 符�? design.md §8.4

### Test Requirements

- [x] ?��?測試：mock unhandledRejection handler 註�?
- [x] ?�選：integration test SIGTERM �?server close

**?�估工�?�?* 1 小�?
