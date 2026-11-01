# Xây Dựng Hệ Thống Livestream Tương Tác "Lễ Chùa Dâng Hương Online" Trên TikTok & Web Bằng Node.js: Tự Động 100%, Nhận Diện IP Người Xem

*Tác giả: **LongNH** | Chuyên mục: **Lập Trình Web & Giải Pháp Livestream AI** | Website: [longnh.com](https://longnh.com)*

---

Thời gian gần đây trên nền tảng TikTok, các phòng livestream với chủ đề **"Đi chùa online / Dâng hương cầu an / Rút quẻ đầu tháng"** đang tạo nên cơn sốt mạnh mẽ, thu hút hàng chục nghìn lượt xem cùng lúc và lượng tương tác quà tặng (gift) khổng lồ. Người xem chỉ cần gửi một nhành hoa hồng hay vài hạt xu là trên màn hình lập tức xuất hiện làn khói nhang nghi ngút, chuông mõ vang rền và nhân vật quỳ lạy trang nghiêm.

Sau bài viết chia sẻ về mô hình *Thánh Đường Nhà Thờ Online*, rất nhiều anh em lập trình viên và các bạn làm sáng tạo nội dung đã nhắn tin hỏi mình: 

> *"Liệu có thể xây dựng một hệ thống **Chùa Việt Nam thuần khiết và trang nghiêm** với đầy đủ bàn thờ Tam Bảo, bồ đoàn ngồi thiền, chuông mõ gia trì, khói trầm hương uốn lượn, xướng sớ cầu an bằng giọng đọc AI và đặc biệt là **chế độ Web Local tự nhận diện IP người xem để cấp tên Phật tử đi chùa** hay không?"*

Câu trả lời là **hoàn toàn làm được và thậm chí vượt xa kỳ vọng!** Hôm nay, LongNH xin chia sẻ toàn bộ kiến trúc kỹ thuật và mã nguồn mở trọn gói của dự án **`tiktok-pagoda-live`** từ A - Z.

---

## 1. Phân Tích Văn Hóa Chùa Chiền Việt Nam & Trải Nghiệm Tương Tác Số

Để một luồng livestream tâm linh chùa chiền đạt được sự thành kính, cuốn hút và giữ chân người xem lâu, hệ thống cần giải quyết 4 bài toán then chốt:

### 1.1. Không Gian Tam Bảo & Cơ Chế 48 Bồ Đoàn Thiền Định (Congregation Engine)
Thay vì là khung chat buồn tẻ ở góc màn hình, khán giả khi vào phòng live sẽ được cấp ngay một chiếc **Bồ Đoàn** (đệm ngồi thiền) trong Chánh Điện:
- **Phối cảnh 3D Chánh Điện:** Tượng Đức Phật Bổn Sư Thích Ca Mâu Ni ngự tọa trên đài sen dát vàng, vòng hào quang xoay dịu êm, hoành phi câu đối sơn son thếp vàng *"Vạn Phúc Tự - Từ Bi Hỷ Xả"*.
- **Nhân vật Phật tử:** Mặc áo lam hoặc áo tràng nâu sồng, ngồi kiết già chắp tay búp sen niệm Phật.
- **Bong bóng chat thời gian thực:** Khi người xem gõ *"Nam Mô A Di Đà Phật"*, *"Cầu bình an"*..., một bong bóng thoại sẽ bay lên từ đúng chỗ người đó đang ngồi.
- **Hàng bồ đoàn VIP sen vàng:** Dành riêng cho Top 5 thiện nam tín nữ cúng dường nhiều nhất trong buổi lễ.

### 1.2. Ánh Xạ Quà Tặng TikTok Sang Nghi Lễ Dâng Hương Cúng Dường
Màn hình livestream tích hợp sẵn **Bảng HUD Overlay minh bạch**, hướng dẫn người xem tặng quà gì thì màn hình sẽ kích hoạt hành động gì:
- **1 xu (Hoa hồng / Rose):** Thắp 1 nén nhang trầm vào bát hương đồng + gõ 1 tiếng chuông khánh thanh mảnh.
- **5 xu (Donut / Hoa vàng):** Dâng đóa hoa sen hồng thanh tịnh lên đài Phật.
- **10 xu (Trái tim / Origami):** Phật tử đứng dậy, tiến theo thảm Chính Đạo lên Tam Bảo **quỳ lạy tam bái (3 lạy)** kèm 3 tiếng gõ mõ an lạc.
- **30 xu (Vương miện / Mâm quả):** Dâng mâm ngũ quả tươi tốt cúng dường & ghi danh vào Sổ Công Đức Vàng.
- **100+ xu (Sư tử / Rồng):** **Đại Lễ Cúng Dường:** Mưa cánh hoa sen lả lướt toàn màn hình, chuông mõ đại hòa tấu ngân vang, và AI Lector tự động xướng Sớ Cầu An trang nghiêm.
- **Miễn phí (Comment "Xin que"):** Lắc ống thẻ tre và hiển thị **1 Quẻ Xăm Linh Ứng Phật Bà Quan Âm** (gồm thơ quẻ, luận giải gia đạo, tài lộc, sức khỏe và lời khuyên tu tâm dưỡng tính).

### 1.3. Chế Độ Web Local Dùng IP Người Xem Làm Tên Đi Chùa
Đây là điểm cực kỳ độc đáo: Khi bạn không phát live TikTok hoặc muốn nhúng hệ thống này lên website (như trên `longnh.com`), bất kỳ ai truy cập web cũng sẽ được máy chủ tự động nhận diện IP:
- Hệ thống trích xuất IP (ví dụ: `113.161.45.xx`) và gán danh xưng pháp danh trang nhã: `Phật tử Diệu Tâm (113.161.45.xx)`.
- Người xem có thể tự tay bấm các nút: **Thắp Nhang, Lạy Tam Bái, Dâng Sen, Thỉnh Chuông, Gõ Mõ, Rút Quẻ Xăm** ngay trên màn hình điện thoại hoặc máy tính. Nhiều người ở các nơi truy cập cùng lúc sẽ cùng xuất hiện trên các bồ đoàn khác nhau!

### 1.4. Không Cần Bất Kỳ File Âm Thanh MP3 Nào (100% Web Audio API)
Toàn bộ âm thanh chuông đại hồng chung, mõ gia trì và tiếng lắc que xăm được tổng hợp thuần túy bằng toán học âm học qua Web Audio API:
- **Chuông chùa:** Kết hợp 5 tần số cộng hưởng từ 130Hz đến 1046Hz với độ ngân decay 5.5 giây và vibrato tự nhiên.
- **Mõ gỗ gia trì:** Tạo sóng tam giác 580Hz qua bộ lọc Bandpass Q cao và xung gõ noise click mô phỏng độ rỗng của gỗ mít già.

---

## 2. Kiến Trúc Kỹ Thuật (Tech Stack)

```
[TikTok Live Cloud] 
       │ (WebSocket TCP)
       ▼
[tiktok-live-connector (Node.js)] ───► [Lector TTS Sớ Cầu An Engine]
       │
       ▼ (Localhost WebSocket :3001/ws)
[OBS Studio / Web Browser] 
       ├── HTML5 / CSS3 3D Chánh Điện & 48 Bồ Đoàn
       ├── Canvas Hạt Khói Trầm Hương & Mưa Hoa Sen
       ├── Web Audio API (Bộ Tổng Hợp Chuông Chùa & Mõ Gỗ)
       └── Web Speech API (Giọng đọc AI xướng Sớ Cầu An)
```

---

## 3. Hướng Dẫn Cài Đặt Nhanh Từ A Đến Z

### Bước 1: Tải mã nguồn từ GitHub
```bash
git clone https://github.com/longhsiaaa/tiktok-pagoda-live.git
cd tiktok-pagoda-live
npm install
```

### Bước 2: Cấu hình kênh TikTok
Mở file `.env` và điền username kênh TikTok của bạn:
```ini
TIKTOK_USERNAME=kenh_tiktok_cua_ban
PORT=3001
SIMULATE=false
TEMPLE_NAME=VẠN PHÚC TỰ
```
*(Nếu muốn chạy thử nghiệm tự động sinh khách và bình luận để ngắm giao diện mà chưa cần phát live, bạn chỉ cần đặt `SIMULATE=true`)*.

### Bước 3: Khởi động server
```bash
npm start
```
Mở trình duyệt truy cập `http://localhost:3001`.

### Bước 4: Đưa vào OBS Studio
1. Mở **OBS Studio**, tạo nguồn mới dạng **Browser (Trình duyệt)**.
2. Nhập URL: `http://localhost:3001`.
3. Đặt kích thước: **1080 x 1920** (tỷ lệ chuẩn dọc của TikTok).
4. Tích chọn **Control audio via OBS**.
5. Bấm phím **H** để ẩn thanh dock điều khiển, giữ màn hình Chánh Điện hoàn toàn sạch sẽ, trang nghiêm!

---

## 4. Trải Nghiệm Demo & Tải Mã Nguồn

- **Mã nguồn hoàn chỉnh trên GitHub:** [github.com/longhsiaaa/tiktok-pagoda-live](https://github.com/longhsiaaa/tiktok-pagoda-live)
- **Trải nghiệm demo trực tiếp:** Truy cập bản demo tương tác tại website [longnh.com](https://longnh.com)
- **Hỗ trợ & Trao đổi giải pháp:** Mọi câu hỏi về tối ưu livestream và tùy biến giao diện, anh em có thể bình luận ngay dưới bài viết này hoặc kết nối qua [longnh.com](https://longnh.com)!
