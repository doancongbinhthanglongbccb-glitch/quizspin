# BẢN THIẾT KẾ CHI TIẾT: APP VÒNG QUAY KIẾN THỨC

---

## I. TỔNG QUAN KỸ THUẬT

| Hạng mục | Chi tiết |
|---|---|
| Nền tảng mục tiêu | Android (điện thoại + máy tính bảng) |
| Công nghệ giao diện | HTML5 + CSS3 (Tailwind CSS) + Vanilla JavaScript |
| Đóng gói thành app | Capacitor (WebView → APK) |
| Tài khoản | Không cần đăng nhập |
| Kết nối mạng | Offline 100% |
| Lưu trữ dữ liệu | `@capacitor/preferences` (native storage, bền hơn localStorage thuần) |
| Giữ màn hình sáng | Plugin `@capacitor-community/keep-awake` (WAKE_LOCK permission) |
| Parse file Excel | SheetJS (`xlsx`) |

---

## II. RESPONSIVE UI

### Điện thoại (Portrait)
- Bottom Navigation Bar cố định ở dưới cùng (3 tab)
- Vòng quay chiếm 85% chiều ngang màn hình
- Pop-up câu hỏi toàn màn hình
- Tab Ngân hàng câu hỏi: layout dọc, thanh chọn lĩnh vực scroll ngang

### Máy tính bảng / Máy chiếu (Landscape)
- Sidebar dọc cố định bên trái thay Bottom Nav
- Tab Vòng quay chia 2 cột:
  - Trái (60%): Vòng quay siêu to
  - Phải (40%): Panel thông tin (lĩnh vực vừa quay, lịch sử các ô)
- Tab Ngân hàng câu hỏi: sidebar danh mục trái, bảng dữ liệu rộng bên phải

---

## III. CÁC MÀN HÌNH & CHỨC NĂNG CHI TIẾT

---

### TAB 1 — VÒNG QUAY

#### Giao diện chính
- Vòng quay vẽ bằng Canvas hoặc SVG
- Ô trên vòng quay gồm 2 loại:
  - **Ô cố định** (không thay đổi): Quà tặng, Thêm lượt, Mất lượt, Xử phạt
  - **Ô lĩnh vực** (động): Tự động vẽ và chia đều dựa trên danh mục đã tạo ở Tab 2
- Mũi tên chỉ cố định ở đỉnh vòng quay
- Hiển thị tên đội/người chơi hiện tại (nếu có)
- Nút **QUAY NGAY** ở dưới vòng quay

#### Trạng thái nút QUAY
- **Bình thường**: Active, bấm được
- **Đang quay**: Disable, mờ đi — không bấm được cho đến khi vòng quay dừng hẳn

#### Âm thanh
- Tiếng quay khi vòng đang xoay
- Tiếng chuông khi hết giờ đếm ngược
- Tiếng fanfare khi MC bấm Hiện đáp án
- Toggle bật/tắt âm thanh ở Tab 3

---

#### Luồng xử lý khi trúng ô LĨNH VỰC

```
Vòng quay dừng
  → Xác định lĩnh vực trúng
  → Bốc ngẫu nhiên 1 câu hỏi chưa dùng trong lĩnh vực đó
  → Hiển thị Pop-up câu hỏi
  → Đồng hồ đếm ngược tự chạy ngay
  → [Hết giờ] → Chuông báo, đồng hồ dừng, chờ MC
  → MC bấm [Hiện đáp án] → Hiện đáp án + fanfare
  → MC bấm [Đóng] → Đóng pop-up, sẵn sàng lượt mới
```

#### Pop-up câu hỏi — chi tiết UI
- Badge tên lĩnh vực (màu tương ứng với ô trên vòng quay)
- Đồng hồ đếm ngược hình tròn, to, nổi bật
  - Chuyển màu đỏ + nhấp nháy khi còn dưới 5 giây
- Nội dung câu hỏi
- Vùng đáp án (ẩn mặc định, hiện khi MC bấm)
- 2 nút:
  - **[⏸ Tạm dừng]** — dừng/tiếp tục đồng hồ
  - **[Hiện đáp án]** — hiện đáp án, đồng hồ dừng hẳn
- Sau khi hiện đáp án: nút Hiện đáp án đổi thành **[Đóng]**

---

#### Luồng xử lý khi trúng ô CỐ ĐỊNH

**Quà tặng / Xử phạt:**
```
Vòng quay dừng
  → Bốc ngẫu nhiên 1 dòng trong danh sách (chống trùng trong phiên)
  → Hiển thị Pop-up Quà/Phạt
  → MC đọc nội dung
  → MC bấm [Đóng]
```

**Pop-up Quà/Phạt — chi tiết UI:**
- Tiêu đề lớn: "Quà tặng 🎁" hoặc "Hình phạt 😈"
- Nội dung random to ở giữa màn hình
- 1 nút duy nhất: **[Đóng]**
- Không có đồng hồ đếm ngược

**Thêm lượt / Mất lượt:**
```
Vòng quay dừng
  → Hiển thị Pop-up thông báo đơn giản ("Bạn được thêm 1 lượt!" / "Mất lượt!")
  → MC bấm [Đóng]
```

---

### TAB 2 — NGÂN HÀNG CÂU HỎI

#### Thanh chọn lĩnh vực
- Nằm ở trên cùng, scroll ngang nếu nhiều danh mục
- Mỗi lĩnh vực là 1 pill button, bấm vào để chọn
- Nút **[+ Thêm lĩnh vực mới]** ở cuối thanh
- Bấm giữ 1 lĩnh vực → hiện option Đổi tên / Xóa lĩnh vực

#### Không gian làm việc (khi đã chọn lĩnh vực)

**Nhập tay:**
- Ô nhập Câu hỏi (textarea)
- Ô nhập Đáp án (input)
- Nút **[+ Thêm câu]**

**Upload Excel:**
- Nút **[Chọn file Excel 📥]** → gọi file picker Android
- Format file: 2 cột — cột A là Câu hỏi, cột B là Đáp án, không cần header
- Sau khi upload: hiện toast "Đã thêm X câu vào [Tên lĩnh vực]"
- Nếu file lỗi: hiện thông báo lỗi rõ ràng, không crash

**Bảng hiển thị câu hỏi của mục đang chọn:**
- Hiển thị số câu hiện có: "X câu trong kho"
- Mỗi câu hiện: nội dung câu hỏi + icon [✏️ Sửa] [🗑️ Xóa]
- Bấm Sửa: inline edit ngay tại chỗ

**Nút xóa mục:**
- **[🗑️ Xóa sạch mục này]** — đặt gần header tên lĩnh vực đang chọn
- Có confirm dialog trước khi xóa: "Xóa toàn bộ X câu trong [Tên lĩnh vực]?"

---

### TAB 3 — CÀI ĐẶT

#### Cấu hình thời gian
- Slider: 10 giây → 60 giây
- Hiển thị số giây realtime bên cạnh slider

#### Âm thanh
- Toggle bật/tắt toàn bộ âm thanh
- Mặc định: bật

#### Danh sách Quà tặng
- Textarea lớn
- Mỗi dòng = 1 phần quà
- Placeholder gợi ý: "Được cộng thêm 10đ", "Nghỉ 1 lượt miễn phí"...

#### Danh sách Hình phạt
- Textarea lớn
- Mỗi dòng = 1 hình phạt
- Placeholder gợi ý: "Chống đẩy 10 cái", "Hát 1 bài"...

#### Xóa toàn bộ
- Nút **[🗑️ Xóa sạch toàn bộ kho câu hỏi]** — màu đỏ, đặt cuối trang
- Confirm dialog 2 bước:
  - Bước 1: "Bạn chắc chắn muốn xóa toàn bộ dữ liệu?"
  - Bước 2: "Hành động này không thể hoàn tác. Xác nhận xóa?"

---

## IV. LOGIC XỬ LÝ DỮ LIỆU

### Chống trùng câu hỏi (No-Duplicate)
- Mỗi câu được gắn flag `used: true` sau khi bốc ra
- Câu đã dùng không xuất hiện lại trong phiên chơi hiện tại
- Khi 1 lĩnh vực hết sạch câu chưa dùng → tự động reset flag toàn bộ câu của lĩnh vực đó về `used: false`
- Reset xảy ra ngay lập tức, không gián đoạn cuộc chơi

### Chống trùng Quà/Phạt (No-Duplicate)
- Logic tương tự câu hỏi
- Mỗi món Quà/Phạt đã random ra gắn flag `used: true`
- Khi hết danh sách → tự reset toàn bộ về `used: false`
- Quà và Phạt là 2 danh sách riêng biệt, reset độc lập

### Lưu trữ (`@capacitor/preferences`)
Các key lưu trữ:

| Key | Nội dung |
|---|---|
| `categories` | Mảng tên các lĩnh vực |
| `questions_{tenLinhVuc}` | Mảng câu hỏi của lĩnh vực đó |
| `settings_timer` | Số giây đếm ngược |
| `settings_sound` | Bật/tắt âm thanh (boolean) |
| `settings_gifts` | Danh sách quà (array) |
| `settings_punishments` | Danh sách phạt (array) |

---

## V. CẤU TRÚC DỮ LIỆU (JSON)

### Câu hỏi trắc nghiệm
```json
{
  "id": "uuid-v4",
  "question": "Kích thước của bia chỉ đỏ trong huấn luyện bắn súng AK bài 1 là bao nhiêu?",
  "options": ["A. 30 x 40cm.", "B. 30 x 50cm.", "C. 20 x 30cm.", "D. 20 x 40cm."],
  "answer": "C. 20 x 30cm.",
  "used": false
}
```

### Câu hỏi tự luận
```json
{
  "id": "uuid-v4",
  "question": "Đ/c cho biết Nội dung bảo quản VKTBKT hàng ngày? Thời gian?",
  "options": [],
  "answer": "- Vũ khí bộ binh bảo quản 15 phút...\n- Bảo quản hàng ngày do chiến sĩ...\n* Nội dung bảo quản hàng ngày:\n+ Lau sạch cát, bụi bẩn...",
  "used": false
}
```

**Logic render:** `options.length === 0` → tự luận, ẩn nút A/B/C/D, hiện khung văn bản khi Hiện đáp án

### Lĩnh vực
```json
{
  "id": "uuid-v4",
  "name": "Lịch sử",
  "color": "#534AB7",
  "questions": [ /* mảng câu hỏi */ ]
}
```

### Cài đặt
```json
{
  "timer": 30,
  "sound": true,
  "gifts": ["Được cộng thêm 10đ", "Nghỉ 1 lượt miễn phí"],
  "punishments": ["Chống đẩy 10 cái", "Hát 1 bài"]
}
```

---

## VI. CÁC TRẠNG THÁI ỨNG DỤNG

```
IDLE (chờ quay)
  → [Bấm QUAY] → SPINNING (đang quay, nút disable)
    → [Vòng dừng - trúng lĩnh vực] → QUESTION_SHOW (hiện câu hỏi, đồng hồ chạy)
      → [Hết giờ / MC tạm dừng] → QUESTION_PAUSED
      → [Tạm dừng → Tiếp tục] → QUESTION_SHOW
      → [Hiện đáp án] → ANSWER_SHOW (đồng hồ dừng, hiện đáp án)
        → [Đóng] → IDLE
    → [Vòng dừng - trúng Quà/Phạt] → GIFT_SHOW (hiện pop-up Quà/Phạt)
        → [Đóng] → IDLE
    → [Vòng dừng - Thêm lượt / Mất lượt] → NOTIFY_SHOW
        → [Đóng] → IDLE
```

---

## VII. LUỒNG CÀI ĐẶT & VẬN HÀNH

### Trước buổi chơi
1. Mở app → Tab 3 → Chỉnh thời gian, điền Quà/Phạt, bật/tắt âm thanh
2. Tab 2 → Tạo các lĩnh vực → Nạp câu hỏi (nhập tay hoặc upload Excel)
3. Kiểm tra số câu từng mục

### Trong buổi chơi
1. Tab 1 → Bấm QUAY
2. Vòng quay dừng → Xử lý theo loại ô trúng
3. Lặp lại

### File Excel chuẩn (3 cột Hybrid)

| Cột | Tên cột | Trắc nghiệm | Tự luận |
|---|---|---|---|
| A | Câu hỏi | Nội dung câu hỏi | Nội dung câu hỏi |
| B | Phương án | 4 lựa chọn A/B/C/D trong 1 ô, xuống dòng bằng Alt+Enter | **Để trống** |
| C | Đáp án đúng | Ghi rõ đáp án đúng (VD: `C. 20 x 30cm.`) | Toàn bộ đoạn văn giải thích chi tiết |

**Quy tắc nhận diện tự động (JavaScript):**
- Cột B **có dữ liệu** → trắc nghiệm → hiện 4 nút A/B/C/D, highlight đáp án đúng khi MC bấm Hiện đáp án
- Cột B **để trống** → tự luận → ẩn 4 nút, khi MC bấm Hiện đáp án thì hiện khung văn bản lớn nội dung cột C

**Dòng 1 (header) cố định:** `Câu hỏi | Phương án | Đáp án đúng`

**Định dạng:** `.xlsx` hoặc `.xls`, không giới hạn số dòng

---

## VIII. STACK CÔNG NGHỆ ĐỀ XUẤT

| Hạng mục | Công nghệ |
|---|---|
| UI Framework | Vanilla JS + Tailwind CSS (không cần React/Vue để nhẹ hơn) |
| Vòng quay | Canvas API hoặc SVG + CSS animation |
| Parse Excel | SheetJS (`xlsx`) |
| Đóng gói Android | Capacitor 5+ |
| Native Storage | `@capacitor/preferences` |
| Giữ màn hình | `@capacitor-community/keep-awake` |
| Âm thanh | Web Audio API hoặc Howler.js |
| UUID | `crypto.randomUUID()` (built-in, không cần lib) |

---

## IX. CHECKLIST TRƯỚC KHI CODE

- [ ] Setup Capacitor project + cấu hình Android Manifest (WAKE_LOCK permission)
- [ ] Cài plugin `@capacitor/preferences` và `@capacitor-community/keep-awake`
- [ ] Cài SheetJS cho parse Excel
- [ ] Thiết kế data layer (CRUD cho categories + questions)
- [ ] Build component vòng quay (Canvas/SVG)
- [ ] Build pop-up câu hỏi + đồng hồ đếm ngược
- [ ] Build pop-up Quà/Phạt
- [ ] Build Tab 2 Ngân hàng câu hỏi
- [ ] Build Tab 3 Cài đặt
- [ ] Implement logic chống trùng câu hỏi + Quà/Phạt
- [ ] Implement Responsive (portrait/landscape)
- [ ] Test trên thiết bị Android thật
- [ ] Build APK
