# QuizSpin — Vòng Quay Kiến Thức

Ứng dụng học tập tương tác với vòng quay, câu hỏi trắc nghiệm/tự luận, quà tặng và hình phạt. Hoạt động **100% offline** trên Android (Capacitor) và trình duyệt.

---

## Tính năng hiện có

| Phase | Nội dung |
|-------|----------|
| **1 — Vòng quay** | Canvas wheel, animation quay, modal quà/phạt/thông báo, 3 tab, swipe đổi tab, responsive |
| **2 — Ngân hàng** | CRUD lĩnh vực & câu hỏi, MCQ/Essay, filter, import Excel đa format |
| **3 — Modal & trả lời** | Timer SVG, chọn/nộp đáp án, lưu `answerHistory`, SoundManager + upload âm thanh |

### Tab Vòng Quay
- Nút **QUAY NGAY** — random segment (lĩnh vực / quà / phạt / thêm lượt / mất lượt)
- Sidebar: trạng thái, số câu, **lịch sử quay**, **lịch sử trả lời**
- Âm thanh quay (`spin`, `tick`) — builtin hoặc custom

### Modal câu hỏi
- Timer tròn SVG, nhấp nháy đỏ khi ≤ 5 giây
- **MCQ**: card A/B/C/D, chọn đáp án, highlight đúng/sai sau nộp/reveal
- **Essay**: textarea lớn, auto-resize
- **Tạm dừng** | **Hiện đáp án** (chỉ reveal, không lưu) | **Nộp đáp án** (chấm + lưu record + sound)

### Tab Ngân hàng
- Pill lĩnh vực (scroll / sidebar landscape), thêm / đổi tên / xóa (long-press)
- Form thêm/sửa câu: loại MCQ hoặc Essay, phương án, đáp án
- Upload Excel, báo cáo import (imported / skipped / diagnostics)
- Lọc: Tất cả · MCQ · Essay

### Tab Cài đặt
- Slider thời gian (10–60s)
- Bật/tắt âm thanh
- Upload âm thanh tùy chỉnh cho từng event (`correct`, `wrong`, `timeup`, `spin`, `tick`, …)
- Danh sách quà tặng & hình phạt (mỗi dòng một mục)
- Xóa toàn bộ dữ liệu (confirm 2 bước)

---

## Cấu trúc source

```
src/
├── main.ts                 # Entry → bootstrap()
├── types.ts                # Domain types
├── config.ts               # Palette, wheel segments, defaults
├── data.ts                 # Sample state, migrate, Excel parse, helpers
├── storage.ts              # Capacitor Preferences + localStorage fallback
├── styles.css              # Dark theme + responsive breakpoints
│
├── core/
│   ├── state.ts            # AppContext: AppState (persist) + RuntimeState (UI)
│   ├── wheel.ts            # Wheel model & landing math
│   ├── sound-manager.ts    # Builtin tones + custom dataUrl playback
│   └── actions/            # Business logic (spin, modal, bank, sound, import…)
│
├── ui/
│   ├── components.ts       # Root render, tab routing, lifecycle
│   ├── components/         # spin-tab, bank-tab, settings-tab, modal, wheel
│   └── handlers/           # DOM events → actions
│
└── utils/
    └── animate.ts          # Spin animation controller
```

**Luồng dữ liệu:** `Action` cập nhật `AppContext` → subscriber gọi `render()` + `saveState()`.

### State

```ts
// Persist (storage key: appState)
AppState {
  categories: Category[]
  settings: Settings        // timer, sound, gifts, punishments, sounds
  answerHistory: AnswerRecord[]
}

// Runtime (không persist)
RuntimeState {
  tab, rotation, spinning, modal, toast,
  questionDraft, usedQuestionIds, usedGifts, usedPunishments,
  spinHistory, importReport, …
}
```

---

## Hướng dẫn sử dụng nhanh

### Chuẩn bị phiên
1. **Cài đặt** — thời gian, quà/phạt, âm thanh (tùy chọn upload file)
2. **Ngân hàng** — tạo lĩnh vực, thêm câu (tay hoặc Excel)
3. Cần ít nhất **1 quà** và **1 hình phạt** mới quay được

### Chơi
1. Tab **Vòng Quay** → **QUAY NGAY**
2. Trúng **lĩnh vực** → modal câu hỏi (random câu chưa dùng trong lĩnh vực)
3. Chọn/ghi đáp án → **Nộp đáp án** (học sinh) hoặc **Hiện đáp án** (MC giải thích)
4. Trúng quà/phạt/lượt → modal tương ứng → **Đóng**

### Chống trùng trong phiên
- Câu hỏi / quà / phạt đã dùng không lặp lại cho đến khi hết danh sách → tự reset pool lĩnh vực/danh sách đó.

---

## Import Excel

Hỗ trợ nhiều format; app tự nhận diện header và loại câu.

### Format mở rộng (khuyến nghị)

| Lĩnh vực | Loại | Câu hỏi | Options/Đáp án | Đáp án đúng (MCQ) |
|----------|------|---------|----------------|-------------------|
| Lịch sử | mcq | … | A. … / B. … | A. 1945 |
| Khoa học | essay | … | (nội dung đáp án) | |

### Legacy 3 cột (hybrid)

| Câu hỏi | Phương án | Đáp án đúng |
|---------|-----------|-------------|
| … | A…B…C…D… (xuống dòng) | C. … |
| … | *(trống)* | Đoạn tự luận |

### Legacy 2 cột

| Câu hỏi | Đáp án |
|---------|--------|
| … | … |

- File: `.xlsx` / `.xls`
- Dòng lỗi được liệt kê trong báo cáo import (row number + lý do)

---

## Phát triển

### Yêu cầu
- Node.js 18+
- npm

### Chạy local

```bash
npm install
npm run dev
```

### Build production

```bash
npm run build
```

### Capacitor / Android

```bash
npm run build
npm run capacitor:sync
npm run android
```

---

## Công nghệ

| Hạng mục | Stack |
|----------|--------|
| UI | Vanilla TypeScript + CSS (Tailwind utilities) |
| Build | Vite 6 |
| Mobile | Capacitor 7 |
| Storage | `@capacitor/preferences` |
| Excel | SheetJS (`xlsx`) |
| Wheel | Canvas API |
| Âm thanh | Web Audio API + HTMLAudioElement (custom) |

---

## Roadmap (bước tiếp theo)

- [ ] Layout landscape/tablet hoàn chỉnh (sidebar nav, spin 60/40)
- [ ] Tên đội / người chơi trên màn quay
- [ ] Fanfare khi MC bấm Hiện đáp án
- [ ] Timer xử lý đúng khi app background/foreground
- [ ] Phiên chơi: reset used flags + tùy chọn xóa lịch sử trả lời
- [ ] Tính điểm từ `question.points`
- [ ] Quản lý thư viện âm thanh (dọn file không dùng)
- [ ] Build APK & test thiết bị Android thật

---

## Tài liệu thiết kế

Chi tiết spec gốc: [`voong-quay-kien-thuc-plan.md`](./voong-quay-kien-thuc-plan.md)

---

## License

Private project — QuizSpin v0.1.0
