# Manual E2E Checklist

Run against a deployed Render instance with real credentials.

## Image flow

- [ ] Send an image in LINE → receive "⏳ 圖片分析中..."
- [ ] Receive preview for Instagram, Facebook, and Threads with Quick Reply buttons

## Regenerate

- [ ] Tap "🔄 重新生成" → receive updated preview

## Cancel

- [ ] Send a new image, tap "❌ 取消" → receive "已取消"
- [ ] Confirm S3 object is deleted

## Publish

- [ ] Send an image → tap "✅ 發文" → receive "⏳ 發布中..."
- [ ] Receive success links or partial failure message
- [ ] Open each successful platform URL and verify image + caption

## Error cases

- [ ] Expired session postback → "操作已過期，請重新上傳圖片"
- [ ] Invalid/expired Meta token → platform-specific failure in result message
- [ ] Render logs contain no unhandled rejections during the run

Record test date, Render URL, and outcome in `docs/progress.md` when complete.
