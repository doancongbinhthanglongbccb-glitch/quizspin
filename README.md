# QuizSpin — Vòng Quay Kiến Thức

Ứng dụng học tập tương tác với vòng quay, câu hỏi trắc nghiệm/tự luận, quà tặng và hình phạt. Hoạt động **100% offline** trên Android (Capacitor) và trình duyệt.

**Phiên bản:** `0.1.0` (beta nội bộ)

---

## Tính năng hiện có

| Khu vực | Nội dung |
|---------|----------|
| **Màn Intro** | Logo, nhạc nền (clip ~26s), nút vào game + nút link ngoài (tùy cấu hình), animation logo bay lên header |
| **Vòng quay** | Canvas wheel, kim cố định đồng bộ kết quả, animation 5s, modal quà/phạt/thông báo |
| **Ngân hàng** | CRUD lĩnh vực & câu hỏi, MCQ/Essay, filter, import Excel đa format |
| **Modal câu hỏi** | Timer SVG, chọn đáp án, chấm khi hiện đáp án/hết giờ, âm thanh đúng/sai |
| **Cài đặt** | Timer, âm thanh, quà/phạt, màn intro, xóa dữ liệu (confirm 2 bước) |

### Màn Intro

- Hiển thị lần đầu (hoặc bấm nút **INTRO** góc màn hình để xem lại)
- Nút chính: **VÒNG XOAY KIẾN THỨC** — vào app, logo bay lên header
- Nút phụ (nếu có URL trong Cài đặt → Màn Intro): mở link ngoài, ví dụ «Kiểm tra nhận thức»
- Nhạc `introBed` — clip ngắn lặp, không phát full file gốc

### Tab Vòng Quay

- Nút **BẮT ĐẦU QUAY** — random segment (lĩnh vực / quà / phạt / thêm lượt / mất lượt)
- Sidebar: trạng thái, tổng số câu, số lĩnh vực
- Cần ít nhất **1 quà** và **1 hình phạt** trong Cài đặt mới quay được
- Âm thanh quay 5s: `spinBed` + `spinStart` → `spinStop` khi dừng

### Modal câu hỏi

- Timer tròn SVG, đỏ khi ≤ 5 giây
- **MCQ (trắc nghiệm)**
  - Chọn đáp án → chỉ highlight, **không chấm ngay**
  - **Hiện đáp án** — nếu đã chọn: chấm + hiện đúng/sai + lưu lịch sử; nếu chưa chọn: chỉ xem đáp án
  - **Hết giờ** — tự chấm nếu đã chọn; chưa chọn thì hiện đáp án + toast «Hết giờ»
- **Essay (tự luận)**
  - Gõ trong textarea (auto-resize)
  - **Nộp đáp án** khi đã có nội dung → lưu + fanfare (không chấm tự động)
  - **Hiện đáp án** — xem đáp án mẫu (không chấm)
- **Tạm dừng / Tiếp tục** — đóng băng thời gian hiển thị khi chấm
- `answerHistory` được **lưu vào storage** nhưng **chưa có màn xem lại** trên UI

### Tab Ngân hàng

- Pill lĩnh vực (scroll / sidebar landscape), thêm / đổi tên / xóa (long-press → prompt)
- Form thêm/sửa câu: loại MCQ hoặc Essay, phương án, đáp án
- Upload Excel, báo cáo import (imported / skipped / diagnostics)
- Lọc: Tất cả · MCQ · Essay
- Xóa câu / lĩnh vực qua **hộp thoại xác nhận** trong app

### Tab Cài đặt

| Mục | Nội dung |
|-----|----------|
| Thời gian | Slider 10s–5 phút |
| Âm thanh | Bật/tắt + upload/preview cho 12 event |
| Quà / Phạt | Mỗi dòng một mục, random không trùng trong phiên |
| Màn Intro | Tên nút link + URL (để trống URL = ẩn nút) |
| Nguy hiểm | Xóa toàn bộ dữ liệu (confirm 2 bước) |

**12 sound event:** `introBed`, `spinBed`, `spinStart`, `spinStop`, `countdown`, `correct`, `wrong`, `fanfare`, `gift`, `punishment`, `extraTurn`, `loseTurn`

---

## Hướng dẫn sử dụng nhanh

### Chuẩn bị phiên

1. **Cài đặt** — thời gian, quà/phạt, âm thanh (tùy chọn), link intro (tùy chọn)
2. **Ngân hàng** — tạo lĩnh vực, thêm câu (tay hoặc import file mẫu trong `test-data/`)
3. Cần ít nhất **1 quà** và **1 hình phạt**

### Chơi

1. Bỏ qua / hoàn thành **Intro** → tab **Vòng Quay**
2. **BẮT ĐẦU QUAY**
3. Trúng **lĩnh vực** → câu hỏi random (ưu tiên câu chưa dùng trong lĩnh vực đó)
4. **MCQ:** chọn đáp án → **Hiện đáp án** hoặc chờ hết giờ
5. **Essay:** gõ → **Nộp đáp án** hoặc **Hiện đáp án**
6. Trúng quà/phạt/lượt → modal tương ứng → **Đóng**

### Chống trùng trong phiên

- Câu hỏi / quà / phạt đã dùng không lặp cho đến khi hết pool → tự reset và chọn random lại

---

## Import Excel

Mọi câu import vào **lĩnh vực đang chọn** trên tab Ngân hàng (app không tự phân theo tên lĩnh vực trong file). Chọn đúng lĩnh vực trước khi upload.

App tự nhận header (dòng 1) và loại câu từ cột **Phương án**:

- **Phương án có dữ liệu** → trắc nghiệm (MCQ)
- **Phương án trống** → tự luận (Essay)

### File mẫu (`test-data/`)

| File | Loại | Format | Số câu |
|------|------|--------|--------|
| [`quizspin-trac-nghiem.xlsx`](./test-data/quizspin-trac-nghiem.xlsx) | MCQ | 3 cột | 6 |
| [`quizspin-tu-luan.xlsx`](./test-data/quizspin-tu-luan.xlsx) | Essay | 2 cột | 3 |

**Cách dùng nhanh:** Ngân hàng → chọn lĩnh vực → Import Excel → chọn file mẫu → kiểm tra toast và báo cáo import.

### Trắc nghiệm — 3 cột (khuyến nghị)

| Câu hỏi | Phương án | Đáp án đúng |
|---------|-----------|-------------|
| Việt Nam tuyên bố độc lập vào ngày nào? | A. 2/9/1945<br>B. 30/4/1975<br>C. 19/5/1890<br>D. 7/5/1954 | A. 2/9/1945 |

Phương án có thể xuống dòng (khuyến nghị), hoặc ngăn bằng `;` / `,`.

### Tự luận — 2 cột (khuyến nghị)

| Câu hỏi | Đáp án mẫu |
|---------|------------|
| Nêu vai trò của nước trong đời sống con người. | Nước tham gia trao đổi chất, điều hòa thân nhiệt… |

Cột **Đáp án mẫu** hiển thị khi host bấm **Hiện đáp án** trong modal (không chấm tự động).

### Format khác (vẫn hỗ trợ)

| Format | Cột | Ghi chú |
|--------|-----|---------|
| Essay 3 cột | Câu hỏi \| Phương án *(trống)* \| Đáp án mẫu | Tương đương 2 cột |
| Legacy 4 cột | Lĩnh vực \| Câu hỏi \| Phương án \| Đáp án | Cột Lĩnh vực chỉ để ghi chú / thống kê báo cáo |
| Legacy typed | Có cột **Loại** (mcq/essay) | File Excel cũ |

- File `.xlsx` / `.xls`; chỉ đọc **sheet đầu tiên**
- Dòng lỗi liệt kê trong báo cáo import (imported / skipped / diagnostics)

---

## Cấu trúc source

```
test-data/
├── quizspin-trac-nghiem.xlsx   # 6 câu MCQ mẫu
└── quizspin-tu-luan.xlsx       # 3 câu Essay mẫu

src/
├── main.ts
├── types.ts
├── config.ts
├── config/
│   ├── spin.ts             # SPIN_CONFIG (5s, extraSpins)
│   ├── sounds.ts           # DEFAULT_SOUND_FILES, INTRO_BED_CLIP
│   └── intro.ts            # INTRO_ASSETS, INTRO_COPY
├── data.ts
├── storage.ts
├── styles.css              # Wheel, timer SVG, intro, responsive hooks
│
├── core/
│   ├── state.ts            # AppContext: AppState + RuntimeState
│   ├── wheel.ts            # Segment layout & landing math
│   ├── spin-session.ts     # Animation + audio khi quay
│   ├── question-timer.ts
│   ├── sound-manager.ts
│   └── actions/
│
├── ui/
│   ├── components.ts       # Shell render + overlay hosts (modal/toast)
│   ├── components/         # spin, bank, settings, modal, wheel, intro…
│   ├── handlers/
│   ├── intro-transition.ts
│   └── intro-logo-transition.ts
│
└── utils/
    ├── animate.ts          # Timed spin animation
    ├── angles.ts           # normalizeDeg
    ├── debounce.ts
    ├── modal-render-key.ts # Tránh rebuild modal khi chỉ chọn đáp án
    ├── wheel-display-rotation.ts
    └── …
```

**Luồng dữ liệu:** `Action` → `AppContext` → subscriber `render()` + `saveState()` (chỉ `AppState`).

### State

```ts
// Persist (key: appState)
AppState {
  categories: Category[]
  settings: Settings   // timer, sound, gifts, punishments, sounds, introLink
  answerHistory: AnswerRecord[]
}

// Runtime (không persist)
RuntimeState {
  tab, rotation, spinning, modal, toast, showIntro,
  questionDraft, usedQuestionIds, usedGifts, usedPunishments,
  confirmDialog, importReport, …
}
```

Âm thanh mặc định: `public/sounds/` → `dist/sounds/` khi build.

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
npm run preview   # xem bản build local
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
| UI | Vanilla TypeScript + Tailwind utilities + `styles.css` |
| Build | Vite 6 |
| Mobile | Capacitor 7 |
| Storage | `@capacitor/preferences` (+ localStorage fallback) |
| Excel | SheetJS (`xlsx`) |
| Wheel | Canvas API |
| Âm thanh | Web Audio + HTMLAudioElement (custom upload) |

---

## Hạn chế / roadmap

**Đã có**

- [x] Intro + logo transition
- [x] Kim vòng quay đồng bộ kết quả
- [x] MCQ: chọn → chấm khi Hiện đáp án / hết giờ
- [x] Timer pause/resume + app background (Capacitor)
- [x] Confirm dialog thay `window.confirm` (xóa dữ liệu)
- [x] Tailwind cho layout chính

**Còn lại**

- [ ] UI xem lại `answerHistory`
- [ ] Đổi tên/xóa lĩnh vực bằng modal thay `window.prompt`
- [ ] Tên đội / người chơi trên màn quay
- [ ] Tính điểm (`question.points`)
- [ ] Test tự động (wheel landing, MCQ flow)
- [ ] Build APK & smoke test thiết bị Android
- [x] File Excel mẫu trắc nghiệm & tự luận (`test-data/`)

---

## Tài liệu thiết kế

Spec gốc: [`voong-quay-kien-thuc-plan.md`](./voong-quay-kien-thuc-plan.md)

---

## License

Private project — QuizSpin v0.1.0
