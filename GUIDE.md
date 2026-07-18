# Hướng dẫn cài đặt

Dành cho người dùng cài app **Bổ trợ Giáo dục - Chính trị** trên điện thoại Android — không cần máy tính hay kiến thức lập trình.

**Tải bản mới nhất:** [releases/Bo-tro-Giao-duc-Chinh-tri.apk](releases/Bo-tro-Giao-duc-Chinh-tri.apk)

Các bản cũ / lịch sử: [releases/LICH-SU-PHIEN-BAN.md](releases/LICH-SU-PHIEN-BAN.md)

---

## 1. Cài file APK trên điện thoại

### Bước 1 — Tải file

1. Mở link tải APK ở trên (hoặc nhận file `.apk` từ người phát hành).
2. Lưu file vào máy (thường nằm trong thư mục **Tải xuống / Download**).

### Bước 2 — Cho phép cài từ nguồn không xác định

Android chặn app ngoài Google Play theo mặc định. Cần bật một lần:

1. Khi mở file `.apk`, máy sẽ hỏi **Cho phép từ nguồn này** (hoặc **Cài đặt ứng dụng không xác định**).
2. Bật cho phép với **File / Chrome / Zalo…** (ứng dụng bạn dùng để mở file).
3. Quay lại và chọn **Cài đặt**.

> Tuỳ máy (Samsung, Xiaomi, Oppo…): **Cài đặt → Bảo mật → Cài đặt ứng dụng không rõ nguồn gốc**.

### Bước 3 — Gỡ bản cũ (nếu cần)

Nếu đang cài bản cũ và máy báo **xung đột chữ ký** / **không cập nhật được**:

1. Vào app cũ → **Cài đặt → Backup / Xóa → Xuất backup** (giữ file `.json`).
2. Giữ icon app → **Gỡ cài đặt**.
3. Cài lại file APK mới → **Nhập backup** để khôi phục dữ liệu.

> Nếu không xuất backup trước khi gỡ, dữ liệu local (câu hỏi, quà, cài đặt) sẽ mất. File Excel câu hỏi vẫn import lại được.

### Bước 4 — Mở app lần đầu

1. Tìm icon **Bổ trợ Giáo dục - Chính trị**.
2. Màn **Intro** → bấm vào để vào vòng quay.
3. Cho phép quyền nếu máy hỏi (không bắt buộc mạng — app chạy offline).

---

## 2. Thiết lập lần đầu (nên làm trước khi quay)

Làm theo thứ tự dưới đây để phiên chơi chạy mượt.

### 2.1. Thêm Quà tặng & Hình phạt

1. Vào tab **Cài đặt**.
2. Mục **Quà tặng** — mỗi dòng một món quà.
3. Mục **Hình phạt** — mỗi dòng một hình phạt.
4. Cần **ít nhất 1 quà** và **1 hình phạt** thì mới quay được.

### 2.2. Thêm lĩnh vực & câu hỏi

1. Vào tab **Ngân hàng câu hỏi**.
2. Bấm **+** để thêm lĩnh vực (VD: *Chính trị*, *Lịch sử*).
3. Chọn lĩnh vực đó → **+ Thêm câu** hoặc **Nhập Excel**.

**Câu hỏi hiện chỉ hỗ trợ trắc nghiệm (MCQ).**

#### Thêm tay

| Ô | Cách điền |
|---|-----------|
| Câu hỏi | Nội dung câu |
| Phương án | Mỗi dòng một lựa chọn, VD: `A. …` / `B. …` |
| Đáp án đúng | `A` hoặc `A. …` (phải khớp một phương án) |

#### Nhập Excel (nhanh)

1. Chọn đúng **lĩnh vực** trước khi import.
2. Bấm **Nhập Excel** → chọn file `.xlsx` / `.xls`.
3. Xem toast / báo cáo: bao nhiêu câu nhập được, bao nhiêu bị bỏ qua và vì sao.

**Format Excel khuyến nghị (3 cột):**

| Câu hỏi | Phương án | Đáp án đúng |
|---------|-----------|-------------|
| … | A. …<br>B. …<br>C. …<br>D. … | A (hoặc `A. …`) |

- Phương án: mỗi lựa chọn **một dòng** trong ô.
- Nhiều đáp án đúng: ghi `A, C` ở cột đáp án.
- Dòng tự luận / thiếu đáp án sẽ **bị bỏ qua** — xem lý do trong báo cáo.

File mẫu trong repo (cho người soạn câu trên máy tính): thư mục [`test-data/`](test-data/).

#### Xóa câu trong một lĩnh vực

- **Xóa hết câu:** nút trên thanh công cụ ngân hàng — giữ lĩnh vực, xóa toàn bộ câu (và pool đã dùng) của lĩnh vực đang chọn; có hộp xác nhận.
- **Đổi tên / xóa cả lĩnh vực:** nhấn giữ pill lĩnh vực → chọn **Đổi tên** hoặc **Xóa lĩnh vực**.

### 2.3. Thời gian & pool câu (tuỳ chọn)

1. **Cài đặt → Thời gian** — chỉnh thời gian đếm ngược cả bộ thi.
2. **Cài đặt → Pool câu hỏi** — xem câu đã dùng / còn lại theo lĩnh vực; **Reset** từng lĩnh vực hoặc toàn bộ.

### 2.4. Âm thanh & link Intro (tuỳ chọn)

- **Âm thanh:** bật/tắt tổng; gán file `.mp3` / `.wav` / `.ogg` (tối đa 2MB) cho từng sự kiện (intro, quay, đúng/sai…).
- **Màn Intro:** thêm tối đa 3 nút link ngoài (tên + URL `https://...`).

### 2.5. Backup dữ liệu (nên biết)

1. **Cài đặt → Backup / Xóa**.
2. **Xuất backup** → lưu file `quizspin-backup-….json` (lĩnh vực, câu hỏi, quà, phạt, cài đặt, pool; **không** gồm file âm thanh tùy chỉnh).
3. **Nhập backup** → chọn file → xác nhận **ghi đè toàn bộ** dữ liệu hiện tại.

Dùng trước khi gỡ app, đổi máy, hoặc sau khi cài APK mới (đặc biệt khi máy báo xung đột chữ ký).

Phía dưới cùng mục này còn **Xóa sạch toàn bộ kho câu hỏi** — đưa app về dữ liệu mẫu; không hoàn tác.

---

## 3. Cách chơi nhanh

1. Tab **Vòng quay** → **BẮT ĐẦU QUAY**.
2. Trúng **lĩnh vực** → vào màn thi (chọn đề nếu có nhiều câu).
3. Chọn đáp án → **Nộp bài** → xem kết quả → về vòng quay.
4. Trúng **quà / phạt / thi thử** → làm theo hướng dẫn trên màn hình.

**Lưu ý:** không đổi tab khi đang quay hoặc đang thi.

---

## 4. Sự cố thường gặp

| Hiện tượng | Cách xử lý |
|------------|------------|
| Không cài được APK | Bật cài từ nguồn không xác định; thử gỡ app cũ rồi cài lại |
| Báo xung đột chữ ký | Gỡ bản cũ → cài bản mới |
| Không quay được | Thêm ít nhất 1 quà và 1 hình phạt trong Cài đặt |
| Import Excel = 0 câu | Kiểm tra đúng 3 cột; phương án mỗi dòng một lựa chọn; xem báo cáo lỗi trong app |
| Form sửa câu trống / không bấm được Cập nhật | Đóng form rồi mở lại **Sửa**; nếu vẫn lỗi thì khởi động lại app |
| Mất câu hỏi sau khi cài lại | Dữ liệu nằm trên máy; gỡ app là mất — **Xuất backup** trước, hoặc giữ Excel để import lại |
| Nhập backup lỗi | Chỉ nhận file `.json` do app xuất; nhập sẽ **ghi đè** toàn bộ dữ liệu hiện tại |
| Không thấy hết mục Âm thanh / Pool | Cuộn **trong khung mục đó** (sidebar và 3 ô thống kê cố định) |

---

## 5. Hỗ trợ kỹ thuật (dành cho người phát triển)

Cài / chạy bản web hoặc build APK từ mã nguồn: xem [README.md](README.md).
