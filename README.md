# QuizSpin — Vòng Quay Kiến Thức

Ứng dụng học tập tương tác với vòng quay, câu hỏi trắc nghiệm/tự luận, quà tặng và hình phạt. Hoạt động 100% offline trên Android.

---

## 📖 HƯỚNG DẪN SỬ DỤNG

### **Tab 1 — Vòng Quay** 🎡

**Màn hình chính để chơi game:**
- Bấm nút **[QUAY NGAY]** để vòng quay xoay ngẫu nhiên
- Vòng quay dừng → trúng một trong 4 loại ô:
  - 🎓 **Ô lĩnh vực (màu sắc khác nhau)**: Hiện câu hỏi
  - 🎁 **Ô Quà tặng**: Nhận phần quà ngẫu nhiên
  - 😈 **Ô Hình phạt**: Nhận phần phạt ngẫu nhiên
  - ➕ **Ô Thêm lượt**: Được thêm 1 lượt quay
  - ➖ **Ô Mất lượt**: Mất 1 lượt quay

**Lưu ý:**
- Nút **[QUAY NGAY]** bị vô hiệu hóa (mờ) khi vòng đang xoay → chờ xong rồi quay tiếp
- Nút chỉ hoạt động lại khi vòng dừng hoàn toàn

---

### **Popup Câu Hỏi Trắc Nghiệm (MCQ)**

**Khi vòng trúng ô lĩnh vực và câu hỏi có 4 lựa chọn:**

```
┌─────────────────────────┐
│  📌 Lịch sử             │
├─────────────────────────┤
│                         │
│  ⏰ 00:25               │  ← Đồng hồ đếm ngược, chuyển đỏ
│                         │     khi còn < 5 giây
│  Câu hỏi: Việt Nam      │
│  giành độc lập          │
│  vào năm nào?           │
│                         │
│  A) 1945                │
│  B) 1954                │
│  C) 1975                │
│  D) 1986                │
│                         │
│  [ ⏸ Tạm dừng ]         │
│  [ Hiện đáp án ]        │
└─────────────────────────┘
```

**Các nút điều khiển:**
- **⏸ Tạm dừng**: Dừng đồng hồ, bấm lại để tiếp tục
- **Hiện đáp án**: Đáp án đúng được highlight (ví dụ: A được tô đỏ)

**Khi MC bấm "Hiện đáp án":**
- Đồng hồ dừng ngay lập tức
- Nút thay đổi thành **[Đóng]**
- Bấm **[Đóng]** → quay lại màn hình vòng, sẵn sàng quay tiếp

---

### **Popup Câu Hỏi Tự Luận (Essay)**

**Khi vòng trúng ô lĩnh vực và câu hỏi KHÔNG có lựa chọn:**

```
┌─────────────────────────┐
│  📌 Quân sự              │
├─────────────────────────┤
│                         │
│  ⏰ 00:30               │  ← Đồng hồ đếm ngược
│                         │
│  Câu hỏi: Nêu các      │
│  bước bảo quản hàng     │
│  ngày?                  │
│                         │
│                         │
│  [ ⏸ Tạm dừng ]         │
│  [ Hiện đáp án ]        │
└─────────────────────────┘
```

**Nhấn "Hiện đáp án":**
```
┌─────────────────────────┐
│  📌 Quân sự              │
├─────────────────────────┤
│  ⏰ 00:00 (dừng)         │
│                         │
│  Đáp án:                │
│  ─────────────────────  │
│  • Lau sạch cát, bụi    │
│  • Kiểm tra khóa        │
│  • Bôi dầu toàn bộ      │
│                         │
│  [ Đóng ]               │
└─────────────────────────┘
```

**Khác biệt:** Không hiện 4 nút A/B/C/D, mà hiện toàn bộ đoạn văn giải thích

---

### **Tab 2 — Ngân Hàng Câu Hỏi** 📚

**Nơi quản lý và nạp câu hỏi vào app:**

1. **Chọn hoặc tạo lĩnh vực** (pill buttons phía trên)
   - Bấm một lĩnh vực để chọn
   - Bấm **[+ Thêm lĩnh vực mới]** để tạo mới
   - Bấm giữ lĩnh vực để đổi tên/xóa

2. **Nhập tay:**
   - Ô "Câu hỏi": Gõ nội dung câu hỏi
   - Ô "Đáp án": Gõ đáp án (hoặc 4 lựa chọn nếu trắc nghiệm)
   - Nút **[+ Thêm câu]**: Thêm vào kho

3. **Upload Excel:**
   - Nút **[Chọn file Excel 📥]**: Chọn file từ điện thoại
   - File hợp lệ → thông báo "Đã thêm X câu"
   - File lỗi → hiện lỗi chi tiết từng dòng

4. **Bảng câu hỏi hiện có:**
   - Hiển thị tất cả câu hỏi của lĩnh vực đang chọn
   - Mỗi câu có nút **✏️ Sửa** (inline edit) và **🗑️ Xóa**

5. **Xóa toàn bộ lĩnh vực:**
   - Nút **[🗑️ Xóa sạch mục này]** (màu đỏ)
   - Xác nhận 1 lần trước khi xóa

---

### **Tab 3 — Cài Đặt** ⚙️

**Tuỳ chỉnh trò chơi theo nhu cầu:**

1. **Thời gian đếm ngược (10 - 60 giây)**
   - Slider để chọn
   - Số giây hiện realtime bên cạnh
   - Mặc định: 30 giây

2. **Âm thanh**
   - Toggle bật/tắt toàn bộ âm thanh
   - Mặc định: bật ✓

3. **Danh sách Quà tặng**
   - Textarea: mỗi dòng = 1 phần quà
   - Ví dụ:
     ```
     Được cộng thêm 10 điểm
     Nghỉ 1 lượt miễn phí
     Được chọn câu hỏi tiếp theo
     ```

4. **Danh sách Hình phạt**
   - Textarea: mỗi dòng = 1 hình phạt
   - Ví dụ:
     ```
     Chống đẩy 10 cái
     Hát 1 bài trước lớp
     Làm 20 cái ngồi chạm chân
     ```

5. **Xóa toàn bộ dữ liệu** (cuối trang)
   - Nút **[🗑️ Xóa sạch toàn bộ kho câu hỏi]** (màu đỏ)
   - Xác nhận 2 lần:
     - "Bạn chắc chắn muốn xóa?"
     - "Hành động này không thể hoàn tác. Xác nhận?"

---

## 📊 Định Dạng File Excel

**Để import hàng loạt câu hỏi, dùng file Excel theo format này:**

### **Cấu trúc file:**

| Cột A | Cột B | Cột C |
|---|---|---|
| **Câu hỏi** | **Phương án** | **Đáp án đúng** |

### **Ví dụ 1: Trắc nghiệm (MCQ)**

| Cột A | Cột B | Cột C |
|---|---|---|
| Kích thước bia chỉ đỏ là? | A. 30x40cm<br>B. 30x50cm<br>C. 20x30cm<br>D. 20x40cm | C. 20x30cm |

**Chú ý:** Cột B có 4 lựa chọn, xuống dòng trong ô (Alt+Enter trên Excel)

### **Ví dụ 2: Tự luận (Essay)**

| Cột A | Cột B | Cột C |
|---|---|---|
| Nêu quy trình bảo quản vũ khí | *(để trống)* | • Lau sạch cát, bụi bẩn<br>• Bôi dầu toàn bộ<br>• Cất ở nơi khô ráo |

**Chú ý:** Cột B **trống** → app tự động hiểu là tự luận → ẩn 4 nút A/B/C/D

### **Quy tắc tự động nhận diện:**

- **Cột B có nội dung** (nhiều dòng hoặc 1 dòng) → **Trắc nghiệm** ✓
  - Hiện 4 nút A/B/C/D khi trả lời
  
- **Cột B trống/để trống** → **Tự luận** ✓
  - Ẩn 4 nút, hiện toàn bộ text từ Cột C khi "Hiện đáp án"

### **Yêu cầu định dạng:**

- Định dạng file: `.xlsx` hoặc `.xls`
- Dòng 1 (optional): Header `Câu hỏi | Phương án | Đáp án đúng`
- Số dòng: Không giới hạn
- Dòng trống: Bị bỏ qua (không lỗi)
- Dòng thiếu Cột A hoặc C: Báo lỗi chi tiết (dòng bao nhiêu, lý do)

### **Lỗi thường gặp:**

| Lỗi | Nguyên nhân | Cách khắc phục |
|---|---|---|
| "Empty row" | Cả 3 cột trống | Xóa dòng đó |
| "Missing question" | Cột A trống | Nhập câu hỏi vào Cột A |
| "Missing answer" | Cột C trống | Nhập đáp án vào Cột C |
| "Unsupported format" | Có 4+ cột dữ liệu | Dùng tối đa 3 cột |

---

## 🎮 Cách Chơi Một Phiên

1. **Chuẩn bị trước (lần đầu)**
   - Vào Tab 3 → Chỉnh thời gian, quà/phạt, bật âm thanh
   - Vào Tab 2 → Tạo lĩnh vực → Nạp câu hỏi (nhập tay hoặc upload Excel)

2. **Trong phiên chơi**
   - Vào Tab 1 (Vòng Quay)
   - Bấm **[QUAY NGAY]** → vòng xoay
   - Xử lý kết quả (trả lời câu hỏi, nhận quà/phạt)
   - Lặp lại cho đến kết thúc

3. **Dữ liệu tự động lưu**
   - Mỗi khi thêm/sửa/xóa → tự động lưu vào điện thoại
   - App offline hoàn toàn, không cần internet

---

## 🔧 Phát Triển

### Chạy local

```bash
npm install
npm run dev
```

### Build web

```bash
npm run build
```

### Đồng bộ Capacitor

```bash
npm run build
npm run capacitor:sync
```

### Build Android APK

```bash
npm run android
```

---

## 💾 Ghi Chú Kỹ Thuật

- Dữ liệu lưu bằng Capacitor Preferences (native storage Android), fallback localStorage trên web.
- Excel import hỗ trợ `.xlsx`/`.xls` via SheetJS.
- App nhận diện tự động MCQ vs Essay dựa trên nội dung Cột B.
- Mỗi phiên chơi là một session riêng — câu/quà/phạt tự động reset khi khởi động app lại.
- Màn hình sáng liên tục trong khi chơi (WAKE_LOCK permission trên Android).
