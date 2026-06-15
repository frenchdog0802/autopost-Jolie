# 開發任務索引

基於 [design.md](../docs/design.md) 拆分的可並行開發任務。每個 task 預估 **0.5–2 小時**，含 Goal / Files / Dependencies / Acceptance Criteria / Test Requirements。

## 任務文件

| 模組 | 文件 | 任務數 | 可並行時機 |
|------|------|--------|------------|
| 專案骨架 | [scaffold.md](./scaffold.md) | 3 | Phase 0 起點 |
| 型別定義 | [types.md](./types.md) | 2 | Phase 0（與 scaffold 並行） |
| 設定模組 | [config.md](./config.md) | 2 | Phase 1 |
| Logger | [logger.md](./logger.md) | 1 | Phase 1 |
| Session Store | [session-store.md](./session-store.md) | 3 | Phase 1（01–02 可並行於 s3） |
| S3 Service | [s3.md](./s3.md) | 2 | Phase 1 |
| OpenAI Service | [openai.md](./openai.md) | 3 | Phase 1 |
| Instagram | [instagram.md](./instagram.md) | 2 | Phase 1（三平台互不相依） |
| Facebook | [facebook.md](./facebook.md) | 2 | Phase 1 |
| Threads | [threads.md](./threads.md) | 2 | Phase 1 |
| Publisher Registry | [publisher-registry.md](./publisher-registry.md) | 2 | Phase 2 |
| LINE Service | [line-service.md](./line-service.md) | 3 | Phase 1 |
| LINE Handler | [line-handler.md](./line-handler.md) | 5 | Phase 2 |
| Webhook Router | [webhook.md](./webhook.md) | 2 | Phase 2 |
| HTTP Server | [http-server.md](./http-server.md) | 2 | Phase 2 |
| 測試基礎設施 | [testing.md](./testing.md) | 3 | Phase 0–2 |
| 部署 | [deployment.md](./deployment.md) | 4 | Phase 3 |

**總計：43 個 task**

## 進度追蹤

見 [docs/progress.md](../docs/progress.md)

## 使用方式

1. 選擇無未完成 Dependencies 的 task
2. 完成後將 checklist `- [ ]` 改為 `- [x]`
3. 同步更新 `docs/progress.md` 完成率
