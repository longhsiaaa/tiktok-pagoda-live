# 🪷 TikTok Live Buddhist Pagoda Simulator (Chùa Dâng Hương Online)

> **Hệ thống Livestream tương tác "Đi Chùa Dâng Hương Online" tự động 100% dành cho TikTok Live & OBS Studio, hỗ trợ chế độ Web Local nhận diện IP người xem.**  
> *A 100% automated interactive Vietnamese Buddhist Temple Livestream Simulator for TikTok Live, OBS Studio & Web Browser with Local IP Visitor Identification.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TikTok Live Connector](https://img.shields.io/badge/TikTok-Connector-black.svg)](https://github.com/zerodytrash/TikTok-Live-Connector)
[![Author](https://img.shields.io/badge/Author-LongNH-blue.svg)](https://longnh.com)

---

## 🇻🇳 Tiếng Việt

### 1. Giới Thiệu Tổng Quan

Dự án **Chùa Dâng Hương Online (`tiktok-pagoda-live`)** là giải pháp livestream tương tác thời gian thực mô phỏng không gian Chánh Điện Chùa Việt Nam thuần khiết và trang nghiêm. Hệ thống kết nối trực tiếp với phòng livestream TikTok thông qua `tiktok-live-connector`, đồng thời hỗ trợ **chế độ Web Standalone sử dụng IP của người truy cập làm danh xưng Phật tử**.

Khán giả khi vào xem luồng livestream hoặc truy cập web sẽ được tự động xếp vào một trong **48 bồ đoàn** thiền định trong Chánh Điện, mang áo lam/áo tràng thanh tịnh, chắp tay niệm Phật. Khi bình luận, bong bóng thoại sẽ bay lên từ đúng chỗ người đó đang ngồi. Khi gửi quà tặng (gift), nhân vật sẽ đứng dậy bước theo lối Chính Đạo lên Tam Bảo dâng hương, lạy tam bái, dâng đóa sen hồng hoặc mâm ngũ quả.

---

### 2. Điểm Nổi Bật Của Hệ Thống

#### 2.1. Không Gian Chánh Điện 3D & 48 Bồ Đoàn Thiền Định
- Bố cục Chánh Điện Tam Bảo uy nghiêm: Tượng Đức Bổn Sư Thích Ca Mâu Ni dát vàng trên Tòa Sen ngát hương, vòng hào quang động quay dịu êm.
- Lư hương đồng tam khí với **hệ thống hạt khói trầm Canvas** uốn lượn như thật.
- Chuông Đại Hồng Chung bên trái và Mõ Gia Trì bên phải có thể bấm gõ phát âm thanh trực tiếp.
- **48 bồ đoàn** xếp thành 2 hàng dọc lối đi Chính Đạo trải thảm hoa sen.
- **Top 5 Phật tử cúng dường nhiều nhất** được xếp ở hàng đầu tiên (Bồ đoàn Thượng thủ) với hiệu ứng sen vàng phát sáng rực rỡ.

#### 2.2. Chế Độ Kép: TikTok Live & Web Local (IP Visitor)
1. **Chế độ TikTok Live:**
   - Kết nối tự động qua `TIKTOK_USERNAME`.
   - Viewer vào live -> Cấp bồ đoàn, hiển thị Avatar TikTok thật và Nickname.
   - Viewer bình luận -> Nổi bong bóng chat Phật pháp trên đầu.
   - Viewer tặng quà -> Kích hoạt nghi lễ tương ứng.
2. **Chế độ Web Local / Standalone (Dùng IP làm tên người đi chùa):**
   - Khi không mở live TikTok hoặc khi người dùng truy cập trực tiếp qua trình duyệt web:
   - Hệ thống tự động trích xuất IP (ví dụ: `113.161.45.xx`), gán danh xưng pháp danh trang nhã: `Phật tử Diệu Tâm (113.161.45.xx)`.
   - Cho phép người xem tự tay bấm: **Thắp Nén Nhang, Lạy Tam Bái, Dâng Hoa Sen, Dâng Mâm Quả, Thỉnh Chuông, Gõ Mõ, Rút Quẻ Xăm** và nhập lời khấn nguyện ngay trên màn hình!

#### 2.3. Bảng Hướng Dẫn Tặng Quà TikTok (HUD Overlay Trên Luồng Live)
Màn hình livestream tích hợp sẵn bảng HUD sơn son thếp vàng rõ ràng, giúp viewer biết chính xác tặng quà gì sẽ nhận được hành động gì:

| Quà Tặng TikTok | Giá Trị (Xu) | Hành Động Tâm Linh Trên Màn Hình | Âm Thanh & AI |
| :--- | :---: | :--- | :--- |
| 🌹 **Hoa Hồng / Nến (Rose)** | 1 | Thắp 1 nén nhang trầm vào lư đồng Tam Bảo | 1 tiếng chuông khánh thanh mảnh |
| 🌸 **Donut / Hoa Vàng** | 5 | Dâng đóa hoa sen hồng thanh tịnh lên đài sen | Chuông ngân, Phật tử xá chào |
| 🙏 **Trái Tim / Origami** | 10 | Phật tử đứng dậy, tiến lên Chánh Điện **lạy Phật tam bái** | 3 tiếng mõ gia trì an lạc |
| 🍎 **Vương Miện / Mâm Quả** | 30 | Dâng **Mâm Ngũ Quả** cúng dường & ghi danh vào Sổ Công Đức Vàng | Đổ chuông dồn dập, hào quang tỏa sáng |
| 🪷 **Sư Tử / Phượng Hoàng** | 100+ | **Đại Lễ Cúng Dường:** Mưa hoa sen toàn màn hình, chuông mõ đại hòa tấu | **AI xướng Sớ Cầu An trang nghiêm:** *"Hôm nay thiện nam tín nữ [Tên] phát tâm cúng dường..."* |
| 💬 **Bình luận "A Di Đà Phật"** | Miễn phí | Nổi bong bóng thoại niệm Phật trên đầu bồ đoàn | 1 tiếng gõ mõ tĩnh tâm |
| 🎋 **Bình luận "Xin que"** | Miễn phí | Lắc ống thẻ tre, rơi ra **1 Quẻ Xăm Linh Ứng** của Phật Bà Quan Âm | Tiếng lắc thẻ tre lách cách |

#### 2.4. 16 Quẻ Xăm May Mắn Quan Âm (Thuần Việt)
Khi người xem bình luận `Xin que` hoặc bấm vào ống thẻ xăm, hệ thống sẽ lắc ống thẻ và hiển thị bảng quẻ xăm truyền thống: Số quẻ, Quẻ Thượng Thượng Cát / Trung Cát, Thơ quẻ 4 câu, Luận giải công danh - gia đạo - tài lộc và Lời khuyên tu tâm dưỡng tính.

#### 2.5. Không Phụ Thuộc File MP3 Ngoại Vi (100% Web Audio API)
- **Chuông Chùa Đại Hồng Chung:** Mô phỏng vật lý đa tần số với độ ngân dài 5.5 giây và vibrato tự nhiên.
- **Mõ Gỗ Gia Trì:** Tổng hợp sóng tam giác kết hợp bộ lọc Bandpass 580Hz và tiếng gõ dùi gỗ đanh rỗng chuẩn xác.
- **Tiếng Lắc Thẻ Xăm Tre:** Mô phỏng âm thanh thẻ tre va chạm rộn rã.

#### 2.6. Giọng Đọc AI Cao Cấp: VieNeu-TTS Nam Chuẩn (Thanh Bình)
- Tích hợp mô hình AI chuyển văn bản thành giọng nói tiếng Việt tiên tiến **VieNeu-TTS v3 Turbo (48kHz)**.
- Giọng đọc: **Nam Chuẩn Hà Nội (Thanh Bình)**, âm sắc trầm ấm, tự nhiên, từ tốn, uy nghiêm rất phù hợp cho việc xướng sớ cầu an, đọc lời khấn, ban quẻ xăm Quan Âm và tuyên dương công đức Tam Bảo.
- Khởi động service cực nhanh qua: `npm run tts` (cổng 5050), tự động fallback sang Web Speech API nếu chạy ở chế độ web tĩnh standalone.

---

### 3. Hướng Dẫn Cài Đặt & Sử Dụng

#### Bước 1: Tải Mã Nguồn & Cài Đặt
```bash
git clone https://github.com/longhsiaaa/tiktok-pagoda-live.git
cd tiktok-pagoda-live
npm install

# Cài đặt thư viện Python cho giọng đọc AI VieNeu-TTS (Tùy chọn)
pip install -r requirements.txt
```

#### Bước 2: Cấu Hình
Mở file `.env` (hoặc sao chép từ `.env.example`):
```ini
# Tên kênh TikTok của bạn (Để trống nếu chỉ dùng Web / Local Mode)
TIKTOK_USERNAME=kenh_tiktok_cua_ban

# Cổng khởi chạy Server
PORT=3001

# Chế độ chạy thử tự động sinh người và tương tác (true / false)
SIMULATE=false

# Tên Chùa hiển thị trên Chánh Điện
TEMPLE_NAME=VẠN PHÚC TỰ

# Tự động đọc Sớ Cầu An định kỳ (phút, ví dụ 15 phút một lần, đặt 0 để tắt)
SO_INTERVAL_MINUTES=15
```

#### Bước 3: Khởi Động Server
```bash
# Khởi chạy chế độ thường
npm start

# Hoặc khởi chạy chế độ mô phỏng test tự động không cần live thật
npm run dev
```
Truy cập trình duyệt tại: `http://localhost:3001`

#### Bước 4: Thiết Lập Trong OBS Studio
1. Mở **OBS Studio**, tại khung **Sources (Nguồn)** bấm dấu `+` chọn **Browser (Trình duyệt)**.
2. Đặt tên: `Chùa Online Livestream`.
3. Điền URL: `http://localhost:3001`.
4. Đặt kích thước:
   - Dọc (chuẩn TikTok Live 9:16): **1080 x 1920**
   - Hoặc Ngang (chuẩn 16:9): **1920 x 1080**
5. Tích chọn: **Control audio via OBS (Kiểm soát âm thanh qua OBS)**.
6. Bấm `OK` và bấm phím `H` hoặc nút `🖥️ Ẩn Cho OBS` trên thanh dock để ẩn bảng điều khiển test khi phát live.

---

### 4. Bí Quyết Livestream Tâm Linh Thu Hút Hàng Ngàn Người Xem Trên TikTok

1. **Tiêu đề livestream hấp dẫn:**  
   *Ví dụ: "ĐI CHÙA DÂNG HƯƠNG ONLINE • THẮP NÉN TÂM HƯƠNG CẦU BÌNH AN • GÕ 'XIN QUE' RÚT THẺ QUẺ ĐẦU THÁNG 🙏"*
2. **Kêu gọi hành động rõ ràng:**  
   - Ghim bình luận: *"Quý Phật tử gõ 'A Di Đà Phật' để niệm Phật nhận bồ đoàn, gõ 'Xin que' để rút quẻ may mắn Quan Thế Âm!"*
   - Khán giả gửi 1 đóa hoa hồng (1 xu) để được thắp nén nhang trầm tên mình trước Tam Bảo.
3. **Đọc sớ định kỳ:**  
   Mỗi 15 phút hệ thống tự động kích hoạt giọng đọc AI xướng tên các Phật tử đã dâng lễ, tạo cảm giác vô cùng thiêng liêng và kích thích khán giả dâng lễ tiếp theo.

---

## 🇬🇧 English

### 1. Overview
**`tiktok-pagoda-live`** is a 100% automated real-time interactive Vietnamese Buddhist Temple simulator for TikTok Live and OBS Studio, featuring:
- **3D Isometric Main Sanctuary (Chánh Điện)** with a Golden Buddha Statue on a Lotus Throne, glowing halo, bronze incense censer, Grand Temple Bell, and Woodblock (Mokugyo).
- **48 Interactive Meditation Cushions (Bồ Đoàn):** Viewers or Web IP visitors take a seat, wear Buddhist robes, and hold hands in prayer.
- **Speech Bubbles:** Comments appear above the viewer's cushion in real-time.
- **Dual Mode:** Connects to TikTok Live via `tiktok-live-connector` OR runs as a standalone website where visitors are identified by their IP address (e.g. `Pilgrim (113.161.45.xx)`).
- **HUD Live Overlay:** On-screen gift guide showing TikTok users what spiritual action each gift triggers.
- **Divination (Quẻ Xăm Quan Âm):** Type "Xin que" in chat to draw a fortune bamboo slip with poems and moral guidance.
- **Zero External Audio Dependencies:** Synthesizes temple bell and wooden fish percussion entirely with Web Audio API.

### 2. Gift Mapping Matrix

| TikTok Gift | Coin Value | Spiritual Action in Pagoda | Sound & AI Effect |
| :--- | :---: | :--- | :--- |
| **Rose / Candle** | 1 | Light 1 incense stick in the central bronze censer | 1 high temple chime |
| **Donut / Lotus Flower** | 5 | Offer a pink lotus flower to the Buddha | Resonant bell chime |
| **Heart / Origami** | 10 | Pilgrim walks to the altar and **bows 3 times** | 3 woodblock strikes |
| **Crown / Fruit Tray** | 30 | Offer a 5-Fruit Tray & recorded in the Golden Merits Book | Continuous chimes |
| **Lion / Dragon** | 100+ | **Great Ceremony:** Full-screen lotus petal rain, chimes & woodblock symphony | **AI Chanting Lector** recites blessing prayer |
| **Chat "A Di Đà Phật"** | Free | Buddhist prayer speech bubble pops up | 1 calming woodblock knock |
| **Chat "Xin que"** | Free | Shakes bamboo tube & draws Quan Am fortune slip | Bamboo stick rattle |

### 3. Quick Start
```bash
git clone https://github.com/longhsiaaa/tiktok-pagoda-live.git
cd tiktok-pagoda-live
npm install
npm start
```
Open `http://localhost:3001` in your browser or OBS Browser Source (1080x1920).

---

## 📜 Cấu Trúc Thư Mục / Project Structure

```
tiktok-pagoda-live/
├── public/
│   ├── index.html          # Chánh Điện, Tượng Phật, Lư Hương, Bồ Đoàn & HUD
│   ├── style.css           # Hiệu ứng 3D, ánh sáng nến, hào quang & hoạt ảnh
│   └── pagoda.js           # Engine Web Audio, Canvas khói trầm, TTS & WebSocket
├── demo-longnh/            # Tài liệu & bản demo nhúng cho website longnh.com
│   ├── bai-viet-longnh.md  # Bài viết chia sẻ kinh nghiệm & kiến trúc kỹ thuật
│   ├── bai-viet-longnh.html# Định dạng HTML sẵn sàng đăng WordPress
│   └── demo-chua.html      # Bản demo HTML độc lập chạy không cần server
├── .env.example            # Mẫu file biến môi trường
├── tts_server.py           # VieNeu-TTS AI Voice Server (Giọng Thanh Bình 48kHz)
├── server.js               # Node.js Express, WebSocket & TikTok Live Connector
└── README.md               # Hướng dẫn chi tiết Anh - Việt
```

---

## ⚖️ Giấy Phép & Tác Quyền (License & Disclaimer)
- Phát triển bởi: **LongNH** ([longnh.com](https://longnh.com))
- Mã nguồn phát hành dưới giấy phép mã nguồn mở **MIT License**.
- Đây là ứng dụng công nghệ mô phỏng trải nghiệm tâm linh trực tuyến nhằm mục đích tịnh tâm, hướng thiện và cầu an lạc, không mang tính trục lợi hay thương mại hóa tín ngưỡng.
