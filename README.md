# QuizSpin — Vòng Quay Kiến Thức

## 1. Giới thiệu

QuizSpin là ứng dụng học tập tương tác: **ván 3 màn** (Khởi động → Tổng hợp → Về đích), vòng quay chọn lĩnh vực / bộ đề, ngân hàng câu hỏi trắc nghiệm. Chạy **offline** trên trình duyệt và Android (Capacitor).

| Nền tảng | Tên hiển thị |
|----------|--------------|
| Web / Intro | QuizSpin — *VÒNG XOAY KIẾN THỨC* |
| Android (launcher) | **Bổ trợ Giáo dục - Chính trị** |

**Người dùng cuối (cài APK, setup, chơi):** xem **[GUIDE.md](GUIDE.md)**.

**Lịch sử bản phát hành:** [releases/LICH-SU-PHIEN-BAN.md](releases/LICH-SU-PHIEN-BAN.md)

---

## 2. Chức năng

| Khu vực | Nội dung |
|---------|----------|
| **Intro** | Logo, nhạc nền, tối đa 3 nút link ngoài, chuyển cảnh vào hội trường |
| **Vòng quay** | Tab 3 màn; canvas wheel chọn lĩnh vực (Khởi động) hoặc bộ đề (Tổng hợp); lobby Về đích (nguồn đề + thang điểm) |
| **Thi trong ván** | MCQ theo màn, timer mỗi câu; Về đích chọn gói điểm trước khi trả lời; tổng kết giữa màn + tổng kết cuối (fanfare / pháo hoa) |
| **Ngân hàng** | CRUD lĩnh vực & câu **trắc nghiệm** (MCQ), import Excel + báo cáo tiếng Việt, xóa hết câu trong lĩnh vực (tối đa 8 lĩnh vực) |
| **Cài đặt** | Sidebar: **Ván 3 màn**, âm thanh, link intro, pool **Đã dùng**, backup JSON / xóa sạch; nội dung từng mục cuộn riêng khi dài |

---

## 3. Công nghệ sử dụng

| Hạng mục | Stack |
|----------|--------|
| UI | TypeScript + Tailwind utilities + `styles.css` |
| Build | Vite 6 |
| Mobile | Capacitor 7 |
| Storage | `@capacitor/preferences` (+ localStorage fallback) |
| Excel | SheetJS (`xlsx`) |
| Wheel | Canvas API |
| Âm thanh | Web Audio / HTMLAudioElement |
| Test | Vitest (`npm test`) |

---

## 4. Cấu trúc project

```
quizspin/
├── GUIDE.md                 # Hướng dẫn end user (cài APK + setup + chơi)
├── README.md
├── index.html
├── package.json
├── capacitor.config.ts
├── public/                  # images, sounds
├── test-data/               # file Excel mẫu
├── releases/                # APK phát hành + lịch sử phiên bản
├── android/                 # Capacitor Android
└── src/
    ├── main.ts
    ├── types.ts
    ├── data.ts
    ├── storage.ts
    ├── styles.css
    ├── config/              # spin, quiz, match, sounds, intro
    ├── core/                # state, wheel, match-scoring, timer, pool, backup…
    │   └── actions/         # spin, match-play, import, backup, confirm…
    ├── ui/                  # components (spin / match-play / bank / settings), handlers
    └── utils/
```

Luồng chính: **Action → AppContext → `render()`** (shell/modal theo render key) → persist khi đổi `AppState`.

Luật điểm ván: `src/core/match-scoring.ts` (+ `match-scoring.test.ts`). Cấu hình màn / gói Về đích: `src/config/match.ts`.

Backup: `src/core/backup.ts` + plugin Android `BackupSaver` — xuất/nhập JSON. Web tải file; Android lưu thẳng **Downloads**. Âm thanh tùy chỉnh không đưa vào backup.

---

## 5. Hướng dẫn cài đặt

### Yêu cầu

- Node.js **18+**
- npm
- Android Studio (chỉ khi chạy/build APK; kèm JDK 21 — dùng JBR của Studio nếu máy đang JDK 17)

### Cài dependency

```bash
npm install
```

### Cài đặt cho end user (điện thoại)

Không dùng bước này — làm theo **[GUIDE.md](GUIDE.md)** (tải APK → cài → setup).

---

## 6. Cách chạy

### Web (dev)

```bash
npm run dev
```

### Build web

```bash
npm run build
npm run preview
```

Output: `dist/` (không commit; tạo lại bằng `npm run build`).

### Kiểm thử

```bash
npm test
```

### Android

```bash
npm run build
npm run capacitor:sync
npm run android
```

Trong Android Studio: chọn thiết bị → **Run**.

#### Android debug từ Cursor (terminal) — BlueStacks

Yêu cầu: **JDK 21** (Capacitor build dùng `sourceCompatibility` 21). Nếu `java -version` là 17, trỏ `JAVA_HOME` sang JBR của Android Studio:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
```

File `android/local.properties` phải có SDK (không commit; tạo local nếu thiếu):

```properties
sdk.dir=C:\\Users\\<user>\\AppData\\Local\\Android\\Sdk
```

BlueStacks: bật ADB, rồi:

```powershell
adb connect 127.0.0.1:5555
npm run build
npm run capacitor:sync
cd android
.\gradlew assembleDebug
adb -s 127.0.0.1:5555 install -r app\build\outputs\apk\debug\app-debug.apk
adb -s 127.0.0.1:5555 shell monkey -p com.quizspin.app -c android.intent.category.LAUNCHER 1
```

**Build APK release (đã ký):** Android Studio → **Generate Signed App Bundle or APK**, rồi copy APK vào `releases/Bo-tro-Giao-duc-Chinh-tri.apk`.

> `.\gradlew assembleRelease` chỉ tạo bản **chưa ký** — không dùng file đó để phát hành.

| Mục | Giá trị |
|-----|---------|
| `appId` | `com.quizspin.app` |
| `webDir` | `dist` |
| APK | [`releases/Bo-tro-Giao-duc-Chinh-tri.apk`](releases/Bo-tro-Giao-duc-Chinh-tri.apk) |

**Không commit:** `dist/`, `android/app/build/`, `android/.gradle/`, `android/app/src/main/assets/public/`, `android/local.properties`.

---

## 7. Biến môi trường (`.env`)

Project **không dùng** file `.env`. Không có `VITE_*` / `process.env` bắt buộc.

Cấu hình app nằm trong:

- `capacitor.config.ts` — `appId`, `webDir`, …
- `src/config/` — spin, quiz, **match** (ván 3 màn / gói điểm), âm thanh, intro
- Dữ liệu runtime — lưu local trên máy (Preferences / localStorage)

---

## 8. License / Author

**License:** Private project  

**App:** QuizSpin — Bổ trợ Giáo dục - Chính trị  

**Phiên bản package:** `2.0.3`

**Android hiện tại:** `versionName` **2.0.3** / `versionCode` **10** — chi tiết từng bản trong [`releases/LICH-SU-PHIEN-BAN.md`](releases/LICH-SU-PHIEN-BAN.md)
