# Các phiên bản app đã phát hành

Ứng dụng **Bổ trợ Giáo dục - Chính trị** (QuizSpin) — lưu lại từng bản đã thử nghiệm trên máy Android để theo dõi quá trình hoàn thiện.

**Bản mới nhất (nên dùng):** [Tải Bo-tro-Giao-duc-Chinh-tri.apk](Bo-tro-Giao-duc-Chinh-tri.apk)

---

## Danh sách các bản

### Bản 12 — 10/08/2026 *(mới nhất)*

**File:** `archive/Bo-tro-Giao-duc-Chinh-tri_2026-08-10_v2.apk` · `versionName` **2.0.0** / `versionCode` **7**

**Có gì mới (major):**
- **Ván 3 màn** hoàn chỉnh: Khởi động → Tổng hợp → Về đích (cấu hình số câu / thời gian / gói điểm trong Cài đặt)
- **Pool câu đã dùng** lưu máy + mục Cài đặt «Đã dùng»; tránh trùng giữa các ván
- Giao diện hội trường nghi lễ, UI Quay / tổng kết gọn hơn
- Tóm tắt giữa màn: tổng tạm + nút «Sang …»; màn **Kết thúc ván** mới + âm thanh chúc mừng
- Sửa chữ trên vòng quay bị ngược
- Cắt bớt mô tả thừa trên Cài đặt / Quay / khi thi

> Cùng chữ ký với v1.2.x — **cài đè** được. Nên xuất backup trước khi nâng cấp.

---

### Bản 11 — 18/07/2026

**File:** `archive/Bo-tro-Giao-duc-Chinh-tri_2026-07-18_answer-validate.apk` · `versionName` **1.2.3** / `versionCode` **6**

**Có gì mới:**
- Sửa lưu câu hỏi: đáp án có dấu phẩy không bị cắt sai
- Đáp án phải **khớp cột phương án** (A/B/C/D đúng chữ trên dòng phương án)
- Ô đáp án đúng dùng một dòng (ổn định hơn trên tablet)

> Cài đè được lên v1.2.x.

---

### Bản 10 — 18/07/2026

**File:** `archive/Bo-tro-Giao-duc-Chinh-tri_2026-07-18_downloads-backup.apk` · `versionName` **1.2.2** / `versionCode` **5**

**Có gì mới:**
- **Xuất backup Android:** lưu thẳng vào **Downloads** (bỏ share sheet)

> Cài đè được lên v1.2.x.

---

### Bản 9 — 18/07/2026

**File:** `archive/Bo-tro-Giao-duc-Chinh-tri_2026-07-18_backup-share_14bacb0.apk` (~8.0 MB, đã ký) · `versionName` **1.2.1** / `versionCode` **4**

**Có gì mới:**
- **Android:** xuất backup qua **share sheet** (Files / Drive…) — WebView không hỗ trợ tải `.json` trực tiếp
- Nhập backup: nới bộ lọc file để Android hiện được `.json`
- Thêm `@capacitor/filesystem` + `@capacitor/share`

> Cùng chữ ký với v1.1/v1.2 — có thể cài đè.

---

### Bản 8 — 18/07/2026

**File:** `archive/Bo-tro-Giao-duc-Chinh-tri_2026-07-18_backup_7b68205.apk` (~7.9 MB, đã ký) · `versionName` **1.2** / `versionCode` **3**

**Có gì mới:**
- **Backup JSON:** xuất / nhập lĩnh vực, câu hỏi, quà, phạt, cài đặt (không gồm file âm thanh tùy chỉnh)
- **Xóa hết câu** trong một lĩnh vực (giữ lĩnh vực)
- Cuộn nội dung **trong từng mục** Cài đặt khi dài
- Cập nhật hướng dẫn `GUIDE.md` / `README.md`

> Cùng chữ ký với bản 7 (v1.1) — máy đang cài v1.1 có thể **cài đè** trực tiếp. Bản cũ hơn chữ ký khác vẫn cần gỡ rồi cài lại (nên xuất backup trước).

---

### Bản 7 — 18/07/2026

**File:** `archive/Bo-tro-Giao-duc-Chinh-tri_2026-07-18_bank-mcq_fec80bf.apk` (~7.9 MB, đã ký)

**Có gì mới:**
- Sửa form **Sửa/Cập nhật** câu hỏi trong ngân hàng
- Chỉ **trắc nghiệm** (ẩn tự luận)
- Kiểm tra đáp án khớp phương án khi lưu
- Sửa nhập Excel 3 cột + báo lỗi tiếng Việt rõ hơn

> **Lưu ý cài đặt:** chữ ký khác bản cũ hơn (trước v1.1) — **gỡ app cũ** rồi cài lại.

---

### Bản 6 — 19/06/2026

**File:** `archive/Bo-tro-Giao-duc-Chinh-tri_2026-06-19_practice-lite_4a178fc-dirty.apk` (~7.9 MB, **đã ký**)

**Có gì mới:**
- **Thi thử:** form nhập số câu + phút (bỏ chip gợi ý), hết nháy khi chọn
- Gỡ âm thanh không dùng — app nhẹ hơn (~280 KB)

---

### Bản 5 — 19/06/2026

**File:** `archive/Bo-tro-Giao-duc-Chinh-tri_2026-06-19_exam-sound_7de819f.apk` (~8 MB)

**Có gì mới:**
- Chọn **Đề 1, Đề 2…** khi thi theo từng lĩnh vực (mỗi đề 20 câu)
- **Thi thử:** tự chọn số câu và thời gian (hoặc không giới hạn giờ)
- Âm thanh ổn định hơn trên máy Android

---

### Bản 4 — 19/06/2026

**File:** `archive/Bo-tro-Giao-duc-Chinh-tri_2026-06-19_signed-v2_a498c5f.apk` (~8 MB)

**Có gì mới:**
- Bản cài đặt chính thức, đã ký để cài lên điện thoại an toàn hơn

---

### Bản 3 — 19/06/2026

**File:** `archive/Bo-tro-Giao-duc-Chinh-tri_2026-06-19_toolchain_ac3ea5b.apk` (~8 MB)

**Có gì mới:**
- Sửa lỗi không build/cài được trên một số máy
- Tối ưu gói cài Android

---

### Bản 2 — 10/06/2026

**File:** `archive/Bo-tro-Giao-duc-Chinh-tri_2026-06-10_beta_e5ea2f9.apk` (~10 MB)

**Có gì mới:**
- Màn thi full màn hình (đếm giờ, xem lại bài)
- Câu trắc nghiệm **chọn nhiều đáp án đúng**
- Thêm liên kết trên màn Intro
- Giao diện tablet ngang gọn hơn

---

### Bản 1 — 07/06/2026 *(bản đầu tiên)*

**File:** `archive/Bo-tro-Giao-duc-Chinh-tri_2026-06-07_first-release_c93edb5.apk` (~12 MB)

**Có gì mới:**
- Vòng quay kiến thức, ngân hàng câu hỏi, cài đặt cơ bản
- Chạy offline trên Android

---

## Cách cài trên điện thoại

1. Copy file `.apk` sang điện thoại (cáp USB, Zalo, Drive…)
2. Mở file → cho phép **Cài từ nguồn không xác định** (nếu máy hỏi)
3. Bấm **Cài đặt**

Nếu báo lỗi vì đã cài bản khác trước đó: **Gỡ app cũ** rồi cài lại.

---

## Cách tìm file trên máy tính

Tất cả bản cũ nằm trong thư mục:

```
releases/archive/
```

Bản đang dùng chung (mới nhất):

```
releases/Bo-tro-Giao-duc-Chinh-tri.apk
```

---

## Ghi chú

- Nên dùng **bản mới nhất** ở đầu trang; các bản trong `archive/` để lưu lại từng giai đoạn thử nghiệm.
- Cùng một app, cài bản mới thường **thay thế** bản cũ (trừ khi máy báo lỗi chữ ký — khi đó gỡ app rồi cài lại).
