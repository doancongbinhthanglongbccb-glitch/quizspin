# QuizSpin — Vòng Quay Kiến Thức

Ứng dụng học tập tương tác với vòng quay, câu hỏi trắc nghiệm/tự luận, quà tặng và hình phạt. Hoạt động **100% offline** trên Android (Capacitor) và trình duyệt.

**Phiên bản:** `0.1.0` (beta nội bộ)

| Nền tảng | Tên hiển thị |
|----------|--------------|
| Web / Intro | QuizSpin — *VÒNG XOAY KIẾN THỨC* |
| Android (launcher) | **Bổ trợ Giáo dục - Chính trị** |

### Tải APK Android

**[Tải APK v0.1.0](releases/Bo-tro-Giao-duc-Chinh-tri.apk)** — release **đã ký**, build `2026-06-19 19:51` (~8.2 MB, `com.quizspin.app`)

Cài trên điện thoại: tải file `.apk` → mở → cho phép cài từ nguồn không xác định → **Cài đặt**. Bản release đã ký có thể cài đè bản debug cùng package; nếu vẫn báo lỗi chữ ký, gỡ app cũ rồi cài lại.

---

## Tính năng hiện có

| Khu vực | Nội dung |
|---------|----------|
| **Màn Intro** | Logo, nhạc nền, nút vào game + **tối đa 3 nút link ngoài** (thêm động trong Cài đặt), animation logo bay lên header |
| **Vòng quay** | Canvas wheel, kim cố định đồng bộ kết quả, animation 5s, modal quà/phạt/thông báo |
| **Bộ thi (Quiz)** | Chọn đề theo lĩnh vực (20 câu/đề), thi thử tùy chỉnh; full-screen timer, MCQ (1/nhiều đáp án), tự luận, nộp bài + xem lại |
| **Ngân hàng** | CRUD lĩnh vực & câu hỏi, MCQ/Essay, filter, import Excel đa format |
| **Cài đặt** | Timer, âm thanh, quà/phạt, pool câu theo lĩnh vực, link intro, xóa dữ liệu (confirm 2 bước) |
| **UX / ổn định** | Chặn đổi tab khi đang quay/modal/quiz; shell cố định + scroll vùng nội dung; tối ưu Android WebView |

### Màn Intro

- Hiển thị lần đầu (hoặc bấm nút **INTRO** góc màn hình để xem lại)
- Nút chính: **VÒNG XOAY KIẾN THỨC** — vào app, logo bay lên header
- **Nút link ngoài** (Cài đặt → Màn Intro → **+ Thêm liên kết**, tối đa 3):
  - Chỉ hiện khi đã nhập URL (`https://...`)
  - Web: tab mới · Android: `@capacitor/browser`
- Nhạc `introBed` — tự dừng khi vào game hoặc app vào nền (Android `pause`)

### Tab Vòng Quay

- Nút **BẮT ĐẦU QUAY** — random segment (lĩnh vực / quà / phạt / thêm lượt / mất lượt)
- Kết quả quay được chọn **trước** animation; vòng chỉ quay tới góc tương ứng
- Trúng **lĩnh vực** hoặc **ô luyện tập** → mở **màn bộ thi** (không còn modal câu hỏi)
- Trúng quà/phạt → modal đơn giản (Đóng)
- Layout tablet ngang: wheel căn giữa; header + nav cố định, nội dung scroll độc lập
- Cần ít nhất **1 quà** và **1 hình phạt** mới quay được
- Không đổi tab / swipe khi đang quay, modal hoặc đang thi

### Màn bộ thi (Quiz Session)

- Full-screen: **sidebar** (điểm, timer, lưới câu) · **nội dung câu** · **footer** (Trước / Nộp / Sau)
- **MCQ một đáp án** — chọn một phương án
- **MCQ nhiều đáp án** — cột đáp án đúng có 2+ phần (`A, C` hoặc `A; C`); chọn nhiều ô
- **Tự luận** — textarea; chấm thủ công sau khi nộp (so với đáp án mẫu)
- **Nộp bài** → chấm MCQ tự động, xem lại từng câu (đúng/sai, đáp án đúng)
- Pool câu theo lĩnh vực: ưu tiên câu chưa dùng; hết pool tự reset

### Tab Ngân hàng

- Pill lĩnh vực (scroll / sidebar landscape)
- **Thêm / đổi tên / xóa lĩnh vực** qua hộp thoại trong app (long-press pill → menu)
- Form thêm/sửa câu: loại MCQ hoặc Essay, phương án, đáp án
- Upload Excel, báo cáo import (imported / skipped / diagnostics)
- Lọc: Tất cả · MCQ · Essay
- Xóa câu qua **hộp thoại xác nhận** trong app

### Tab Cài đặt

| Mục | Nội dung |
|-----|----------|
| Thời gian | Slider 10s–5 phút (dùng cho bộ thi) |
| Pool câu hỏi | Theo dõi câu đã dùng / reset từng lĩnh vực hoặc toàn bộ |
| Âm thanh | Bật/tắt + upload/preview cho 12 event |
| Quà / Phạt | Mỗi dòng một mục, random không trùng trong phiên |
| Màn Intro | Thêm/xóa tối đa **3** nút link (tên + URL); để trống URL = không hiện nút |
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
3. Trúng **lĩnh vực** → **màn bộ thi** (bộ câu của lĩnh vực đó)
4. Làm bài: MCQ (chọn đáp án; nhiều đáp án nếu câu có `A, C` trong đáp án đúng) hoặc tự luận
5. **Nộp bài** → xem điểm / review từng câu → **Về vòng quay**
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

**MCQ nhiều đáp án:** cùng format 3 cột; cột **Đáp án đúng** ghi 2+ đáp án, ví dụ `A, C` hoặc `A; C`. App tự nhận và cho chọn nhiều ô khi thi.

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

android/                        # Capacitor Android (source only; build/ sync output gitignored)
public/
├── images/                     # Logo, banner intro
└── sounds/                     # Âm thanh mặc định → copy vào dist/ khi build

src/
├── main.ts
├── types.ts
├── config.ts
├── config/
│   ├── spin.ts               # SPIN_CONFIG (5s, extraSpins)
│   ├── sounds.ts             # DEFAULT_SOUND_FILES
│   ├── quiz.ts               # Ngưỡng timer quiz (warning/danger)
│   └── intro.ts              # INTRO_ASSETS, INTRO_COPY
├── data.ts
├── storage.ts
├── styles.css                # Wheel, quiz session, intro, responsive
│
├── core/
│   ├── state.ts              # AppContext: AppState + RuntimeState
│   ├── wheel.ts              # Segment layout & landing math
│   ├── spin-session.ts       # Animation + audio khi quay
│   ├── quiz-timer.ts         # Timer bộ thi
│   ├── pool-manager.ts       # Pool câu đã dùng theo lĩnh vực
│   ├── sound-manager.ts
│   ├── persist-queue.ts
│   └── actions/
│       ├── quiz-actions.ts   # Bộ thi: start, chọn đáp án, nộp bài
│       └── …
│
├── ui/
│   ├── components.ts         # Shell render, overlay hosts
│   ├── components/           # spin, bank, settings, quiz-session, wheel, intro…
│   ├── handlers/
│   └── …
│
└── utils/
    ├── platform.ts           # Android: perf-lite, DPR canvas
    ├── android-viewport.ts   # Inset bàn phím WebView
    ├── quiz-timer-dom.ts
    ├── open-external-url.ts
    └── …
```

### Luồng dữ liệu & render

```
Action → AppContext (patchRuntimeState / setAppState)
       → subscriber render()
       → so shell-render-key / modal-render-key
           · key đổi  → rebuild DOM tương ứng
           · key giữ  → DOM sync helpers (spin, toast, timer, MCQ…)
       → enqueuePersist() khi cần lưu AppState
```

Mọi trường state **ảnh hưởng UI** phải nằm trong render key **hoặc** có helper sync DOM — nếu không UI sẽ stale khi `renderOnce()` early-return.

### State

```ts
// Persist (key: appState)
AppState {
  categories: Category[]
  settings: Settings   // timer, sound, gifts, punishments, sounds, introLinks[]
}

// Runtime (không persist)
RuntimeState {
  tab, rotation, spinning, modal, quizSession, toast, showIntro,
  questionDraft, usedGifts, usedPunishments, confirmDialog, …
}
```

---

## Phát triển

### Yêu cầu

- Node.js 18+
- npm
- Android Studio (chỉ khi build/chạy APK)

### Chạy local (web)

```bash
npm install
npm run dev
```

### Build production (web)

```bash
npm run build
npm run preview   # xem bản build local
```

Output vào `dist/` — **không commit** (regenerate bằng `npm run build`).

### Capacitor / Android

```bash
npm run build              # web assets → dist/
npm run capacitor:sync     # copy dist/ → android/app/src/main/assets/public/
npm run android            # mở Android Studio
```

Trong Android Studio: chọn thiết bị/emulator → **Run**.

**Build APK release (đã ký):** từ thư mục gốc project:

```powershell
npm run build
npx cap sync android
cd android
.\gradlew assembleRelease   # hoặc Android Studio → Build → Generate Signed App Bundle or APK
```

Output release **đã ký** (Android Studio → *Generate Signed App Bundle or APK*):

```
android/app/release/app-release.apk
```

Bản `gradlew assembleRelease` không cấu hình ký:

```
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

Copy vào `releases/` để cập nhật bản tải trên repo:

```powershell
Copy-Item android/app/release/app-release.apk releases/Bo-tro-Giao-duc-Chinh-tri.apk
```

Debug nhanh (Android Studio hoặc `.\gradlew assembleDebug`):

```
android/app/build/outputs/apk/debug/app-debug.apk
```

| Mục | Giá trị |
|-----|---------|
| `appId` | `com.quizspin.app` |
| Tên launcher | `Bổ trợ Giáo dục - Chính trị` (`android/app/src/main/res/values/strings.xml`) |
| `webDir` | `dist` |
| APK tải về | [`releases/Bo-tro-Giao-duc-Chinh-tri.apk`](releases/Bo-tro-Giao-duc-Chinh-tri.apk) — release đã ký, `2026-06-19 19:51` |

**Không commit:** `dist/`, `android/app/build/`, `android/.gradle/`, `android/.idea/`, `android/app/src/main/assets/public/` (tạo lại bằng `cap sync`).

---

## Công nghệ

| Hạng mục | Stack |
|----------|--------|
| UI | Vanilla TypeScript + Tailwind utilities + `styles.css` |
| Build | Vite 6 |
| Mobile | Capacitor 7 (`@capacitor/android`, `@capacitor/app`) |
| Storage | `@capacitor/preferences` (+ localStorage fallback) |
| Native UX | `@capacitor/browser`, `@capacitor-community/keep-awake` |
| Android | `perf-lite` (tắt blur/animation nặng), `adjustResize` bàn phím, dừng nhạc khi `pause` |
| Excel | SheetJS (`xlsx`) |
| Wheel | Canvas API |
| Âm thanh | Web Audio + HTMLAudioElement (custom upload) |

---

## Hạn chế / roadmap

**Đã có**

- [x] Intro + logo transition + **nhiều nút link** (tối đa 3)
- [x] **Màn bộ thi** full-screen (timer, sidebar, nộp bài, review)
- [x] **MCQ nhiều đáp án** (import & khi thi)
- [x] Pool câu theo lĩnh vực + reset
- [x] Kim vòng quay đồng bộ kết quả
- [x] Timer pause/resume + app background (Capacitor)
- [x] Confirm dialog thay `window.confirm`
- [x] Layout shell cố định (header/nav) + scroll nội dung
- [x] Tối ưu Android WebView (`perf-lite`, keyboard inset)
- [x] Link intro + nhạc intro trên Android
- [x] Dự án Android Capacitor + file Excel mẫu (`test-data/`)

**Còn lại**

- [ ] Tên đội / người chơi trên màn quay
- [ ] Tính điểm có trọng số (`question.points`) trong UI bộ thi
- [ ] Test tự động (wheel landing, quiz flow)
- [x] Build APK release (đã ký) & cập nhật file trong `releases/` (`2026-06-19 19:51`)

---

## Tài liệu thiết kế

Spec gốc: [`voong-quay-kien-thuc-plan.md`](./voong-quay-kien-thuc-plan.md)

---

## License

Private project — QuizSpin v0.1.0
