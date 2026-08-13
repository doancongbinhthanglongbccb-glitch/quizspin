# Hướng dẫn cài đặt & sử dụng

Dành cho người dùng cài app **Bổ trợ Giáo dục - Chính trị** trên điện thoại Android — không cần máy tính hay kiến thức lập trình.

**Phiên bản hiện tại:** `2.0.3` (ván 3 màn: Khởi động → Tổng hợp → Về đích)

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

1. Vào app cũ → **Cài đặt → Backup / Xóa → Xuất backup** → trên Android file nằm trong **Downloads**.
2. Giữ icon app → **Gỡ cài đặt**.
3. Cài lại file APK mới → **Nhập backup** để khôi phục dữ liệu.

> Bản **v2.0.x** cùng chữ ký với nhau — thường **cài đè** được. Vẫn nên xuất backup trước khi nâng cấp.

> Nếu không xuất backup trước khi gỡ, dữ liệu local (câu hỏi, cài đặt, pool đã dùng) sẽ mất. File Excel câu hỏi vẫn import lại được.

### Bước 4 — Mở app lần đầu

1. Tìm icon **Bổ trợ Giáo dục - Chính trị**.
2. Màn **Intro** → chạm vào để vào hội trường / vòng quay.
3. Cho phép quyền nếu máy hỏi (không bắt buộc mạng — app chạy offline).

Ba tab chính ở dưới (hoặc cạnh trên máy ngang):

| Tab | Việc làm |
|-----|----------|
| **Vòng Quay** | Chơi ván 3 màn |
| **Ngân Hàng Câu Hỏi** | Thêm lĩnh vực & câu trắc nghiệm |
| **Cài Đặt** | Luật ván, âm thanh, intro, pool đã dùng, backup |

---

## 2. Thiết lập lần đầu (nên làm trước khi chơi)

Làm theo thứ tự dưới đây để phiên chơi chạy mượt.

### 2.1. Thêm lĩnh vực & câu hỏi

1. Vào tab **Ngân Hàng Câu Hỏi**.
2. Bấm **+** để thêm lĩnh vực (VD: *Chính trị*, *Lịch sử*) — tối đa **8** lĩnh vực.
3. Chọn lĩnh vực đó → **+ Thêm câu** hoặc **Nhập Excel**.

**Câu hỏi hiện chỉ hỗ trợ trắc nghiệm (MCQ).**

#### Thêm tay

| Ô | Cách điền |
|---|-----------|
| Câu hỏi | Nội dung câu |
| Phương án | Mỗi dòng một lựa chọn (hoặc cách nhau bởi `;` / `,`), VD: `A. …` / `B. …` |
| Đáp án đúng | `A` hoặc `A. …` (phải khớp một phương án). Nhiều đáp án: `A, C` |

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

#### Xóa / đổi tên lĩnh vực

- **Xóa hết câu** trong lĩnh vực đang chọn: nút trên thanh công cụ — giữ lĩnh vực, xóa toàn bộ câu (và pool đã dùng liên quan); có hộp xác nhận.
- **Đổi tên / xóa cả lĩnh vực:** nhấn giữ pill lĩnh vực → chọn **Đổi tên** hoặc **Xóa lĩnh vực**.

### 2.2. Luật ván 3 màn (tuỳ chọn)

Vào **Cài đặt → Ván 3 màn**:

| Mục | Ý nghĩa (mặc định gợi ý) |
|-----|--------------------------|
| **Khởi động** | Số câu / thời gian mỗi câu |
| **Tổng hợp** | Số câu **mỗi bộ đề** / thời gian mỗi câu |
| **Về đích** | Số câu, thời gian mỗi câu, giây chờ chọn gói, danh sách **gói điểm** |

**Gói điểm (Về đích):** mỗi gói có **điểm** + **cửa sổ giữ điểm** (giây). Một gói được đánh dấu **mặc định** (không giới hạn số lần); các gói cao hơn có hạn mức mỗi ván. App cảnh báo nếu điểm tối đa lý thuyết vượt trần **400**.

Có thể giữ mặc định và chỉ chỉnh khi cần buổi thi khác.

### 2.3. Âm thanh & link Intro (tuỳ chọn)

- **Cài đặt → Âm thanh:** bật/tắt tổng; gán file `.mp3` / `.wav` / `.ogg` (tối đa 2MB) cho từng sự kiện (nhạc intro, quay, câu hỏi, đúng/sai, tổng kết màn, fanfare cuối ván…).
- **Cài đặt → Màn Intro:** thêm tối đa 3 nút link ngoài (tên + URL `https://...`).

### 2.4. Pool câu đã dùng (tuỳ chọn)

**Cài đặt → Đã dùng** — xem câu đã dùng / còn lại theo lĩnh vực; **Reset** từng lĩnh vực hoặc toàn bộ.

Trong một ván, câu đã hỏi được đánh dấu đã dùng để tránh trùng giữa các màn / ván sau (cho đến khi reset).

### 2.5. Backup dữ liệu (nên biết)

1. **Cài đặt → Backup / Xóa**.
2. **Xuất backup**:
   - **Web:** tải file `quizspin-backup-….json`.
   - **Android:** lưu thẳng vào thư mục **Downloads** (Files → Downloads).
3. **Nhập backup** → chọn file `.json` vừa lưu → xác nhận **ghi đè toàn bộ** dữ liệu hiện tại.

Nội dung backup: lĩnh vực, câu hỏi, cài đặt ván, pool đã dùng, link intro…; **không** gồm file âm thanh tùy chỉnh.

Dùng trước khi gỡ app, đổi máy, hoặc sau khi cài APK mới (đặc biệt khi máy báo xung đột chữ ký).

Phía dưới cùng mục này còn **Xóa sạch toàn bộ dữ liệu** — đưa app về dữ liệu mẫu; không hoàn tác.

---

## 3. Cách chơi — ván 3 màn

Một ván gồm lần lượt **Khởi động → Tổng hợp → Về đích**. Tab **Vòng Quay** có 3 nút màn ở trên; khi đang trong ván thì không nhảy màn tự do.

### 3.1. Khởi động

1. Tab **Vòng Quay** → màn **Khởi động**.
2. Cần **ít nhất 1 lĩnh vực** trong Ngân hàng (không còn bắt buộc quà / hình phạt).
3. Bấm **Bắt đầu quay** → vòng quay chọn lĩnh vực.
4. Trả lời lần lượt các câu (đúng mới cộng điểm). Điểm màn chia đều trong trần **100** theo số câu đã cấu hình.
5. Hết màn → màn **kết thúc** hiện điểm màn + **Tổng điểm** → bấm nút mép phải **「Màn 2 →」**.

### 3.2. Tổng hợp

1. Bấm **Quay chọn đề** → vòng quay chọn một **bộ đề**.
2. Trả lời các câu trong bộ đề (cùng kiểu tính điểm theo trần 100).
3. Hết màn → **「Màn 3 →」**.

### 3.3. Về đích

1. Chọn **Nguồn đề**: **Tổng hợp** (trộn ngân hàng) hoặc **Lĩnh vực** (chọn một lĩnh vực).
2. Xem **Thang điểm** (các gói) rồi bấm **Xác nhận – Bắt đầu**.
3. **Mỗi câu:** chọn gói điểm trước (có thể chờ hết giờ chọn → dùng gói mặc định). Đồng hồ câu / cửa sổ giữ điểm chỉ chạy **sau khi đã chọn gói**.
4. Header lúc chơi: **Về đích** (điểm màn, có thể âm nếu sai) và **Tổng** (cả ván).
5. **Đúng trong cửa sổ giữ điểm** → nhận đủ điểm gói; **đúng nhưng ngoài cửa sổ** → nhận điểm gói mặc định; **sai** → trừ điểm gói đã chọn.
6. Hết màn → màn **Tổng kết** cả ván (điểm từng màn + tổng, pháo hoa / fanfare).

### 3.4. Lưu ý khi chơi

- Không đổi tab khi đang quay hoặc đang trả lời — tab khác sẽ bị khóa.
- Câu đã dùng được lưu trên máy; hết câu trong lĩnh vực thì cần thêm câu mới hoặc **Reset** pool ở Cài đặt.
- Muốn xem đúng điểm Về đích sau khi cập nhật app: nên **bắt đầu ván mới** (ván đang dở có thể còn điểm cũ).

---

## 4. Sự cố thường gặp

| Hiện tượng | Cách xử lý |
|------------|------------|
| Không cài được APK | Bật cài từ nguồn không xác định; thử gỡ app cũ rồi cài lại |
| Báo xung đột chữ ký | Xuất backup → gỡ bản cũ → cài bản mới → nhập backup |
| Không quay được (Khởi động) | Thêm ít nhất 1 lĩnh vực có câu hỏi trong Ngân hàng |
| Tổng hợp báo chưa đủ câu | Thêm thêm câu / lĩnh vực, hoặc giảm «Số câu mỗi bộ đề» trong Cài đặt → Ván 3 màn |
| Về đích chưa mở | Hoàn thành Khởi động và Tổng hợp trong cùng một ván |
| Import Excel = 0 câu | Kiểm tra đúng 3 cột; phương án mỗi dòng một lựa chọn; xem báo cáo lỗi trong app |
| Form sửa câu trống / không bấm được Cập nhật | Đóng form rồi mở lại **Sửa**; nếu vẫn lỗi thì khởi động lại app |
| Mất câu hỏi sau khi cài lại | Dữ liệu nằm trên máy; gỡ app là mất — **Xuất backup** trước, hoặc giữ Excel để import lại |
| Nhập backup lỗi | Chỉ nhận file `.json` do app xuất; trên Android chọn **Files** và hiện mọi loại file nếu bị lọc |
| Không thấy file backup trên Android | Mở **Files → Downloads** — tìm `quizspin-backup-….json` |
| Không thấy hết mục Âm thanh / Đã dùng | Cuộn **trong khung mục đó** (sidebar và ô thống kê cố định) |
| Điểm Về đích trên header lệch màn kết thúc | Cài bản **2.0.3+** và chơi **ván mới** |

---

## 5. Hỗ trợ kỹ thuật (dành cho người phát triển)

Cài / chạy bản web hoặc build APK từ mã nguồn: xem [README.md](README.md).
