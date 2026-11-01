# Phân tích hai dự án tham chiếu

## 1. `ref-chanh-dien-online`: hội chúng ngồi thiền bằng sprite sheet

Trong [overlay.html](E:/Long/ref-chanh-dien-online/live/overlay.html:107), mỗi người có ghế riêng theo hàng, tọa độ `x/y` và tỉ lệ kích thước theo chiều sâu. Khi có người mới, `addVisitor()` tạo trạng thái `walk`, đưa nhân vật vào vị trí ghế rồi chuyển sang `sitting` và `sit` ([dòng 135](E:/Long/ref-chanh-dien-online/live/overlay.html:135)).

Ba ý đáng kế thừa:

- **Chuyển trạng thái có trình tự:** sprite sheet có 8 ô ngang; code dùng các frame đầu cho bước đi và những frame sau cho lúc vào tư thế ngồi. Người mới không bị xuất hiện đột ngột giữa hàng.
- **Thở có lệch pha:** mỗi người có `phase` ngẫu nhiên; độ nhô lên xuống được tính bằng `sin(time + phase)`. Nhờ vậy hội chúng không chuyển động đồng loạt ([dòng 300](E:/Long/ref-chanh-dien-online/live/overlay.html:300)).
- **Cử động và hiệu ứng gắn với người:** `bow` tạo cúi nhẹ, `glow` tạo hào quang giảm dần, còn bubble được vẽ gần bảng tên và avatar ([dòng 206](E:/Long/ref-chanh-dien-online/live/overlay.html:206), [dòng 263](E:/Long/ref-chanh-dien-online/live/overlay.html:263)).

Canvas sắp người theo `y` trước khi vẽ: người ở sâu hơn được vẽ trước, người gần camera vẽ sau ([dòng 273](E:/Long/ref-chanh-dien-online/live/overlay.html:273)). Cách này tạo cảm giác chiều sâu khi người đang đi qua sân.

Giới hạn cần lưu ý: sprite sheet này phù hợp với đi bộ và ngồi thiền; cúi lạy trong code chỉ là biến dạng nhẹ, chưa phải chuỗi Ngũ thể đầu địa.

## 2. `ref-tiktok-live-temple-rpc`: một người đi lễ và lạy Tam Bái

Dự án này dùng một nhân vật đại diện riêng ở giữa thảm đỏ. `animateWalkerOnCarpet()` khởi động animation đi lên kéo dài khoảng 2,1 giây, đổi luân phiên hai frame bước đi, rồi gọi chuỗi lạy ([live.js](E:/Long/ref-tiktok-live-temple-rpc/public/js/live.js:274), [CSS](E:/Long/ref-tiktok-live-temple-rpc/public/css/style.css:391)).

Nhân vật có tám tư thế: `walk1`, `walk2`, `kneelDown`, `kneel`, `forehead`, `bowMid`, `prostrate` và `prostrateDeep`. Chuỗi lạy đổi tư thế theo thời điểm, lặp ba lần; các ảnh được nạp sẵn rồi chuyển bằng class `active` để giảm nháy khi đổi ảnh ([live.js](E:/Long/ref-tiktok-live-temple-rpc/public/js/live.js:200), [dòng 251](E:/Long/ref-tiktok-live-temple-rpc/public/js/live.js:251)).

Hàm `pulseHallBowing()` làm người trong đại điện đổi ảnh theo nhóm để tạo phản ứng của hội chúng ([dòng 212](E:/Long/ref-tiktok-live-temple-rpc/public/js/live.js:212)). Tuy nhiên, hiện tại hàm chỉ chọn các ghế có `i % 4 === 0`, rồi tính độ trễ bằng chính `i % 4`; vì vậy tất cả ghế được chọn có độ trễ bằng 0 và cúi cùng lúc. Bản nâng cấp nên tính độ trễ theo số nhóm hoặc vị trí trong hàng.

`particles.js` có một lựa chọn hiệu năng hữu ích: hạt trang trí chạy giới hạn 30 FPS, tạm dừng khi tab bị ẩn và dùng sprite dựng sẵn thay vì tạo gradient liên tục trong mỗi frame ([particles.js](E:/Long/ref-tiktok-live-temple-rpc/public/js/particles.js:9)).

# Hiện trạng `tiktok-pagoda-live`

- [pagoda.js](E:/Long/tiktok-pagoda-live/public/pagoda.js:161) tạo 6 ghế VIP từ dữ liệu mẫu; hội chúng thường có 30 người với hình tĩnh. [CSS](E:/Long/tiktok-pagoda-live/public/style.css:342) chỉ làm hình người thường nhấp nhô nhẹ bằng `pilgrimBreathe`; VIP chủ yếu có hiệu ứng vương miện.
- Bubble hiện chọn ngẫu nhiên một ghế nếu không truyền ghế cụ thể, rồi chỉ hiển thị chuỗi chữ ([pagoda.js](E:/Long/tiktok-pagoda-live/public/pagoda.js:228)). Chưa có ánh xạ bình luận tới đúng người đang ngồi hoặc avatar TikTok trong bubble.
- Client đã nhận `visitor_join`, `chat_message` và các sự kiện nghi lễ, nhưng chưa có actor động tương ứng cho người TikTok. Đáng chú ý, `like_burst` chưa được xử lý trong `handleServerBroadcast`; phía server gửi tên và số tim, nhưng chưa gửi đủ định danh/avatar cho client.
- Các nút RPC hiện gọi trực tiếp hàm âm thanh, bubble và hiệu ứng; chưa có người đại diện đi lên thảm đỏ. Canvas hiệu ứng chạy riêng bằng `requestAnimationFrame`, tạo tối đa 50 hạt khói và 25 cánh sen ([pagoda.js](E:/Long/tiktok-pagoda-live/public/pagoda.js:263)).

# Kiến trúc nâng cấp đề xuất

## A. Tách nhân vật khỏi hiệu ứng nền

Trong cả [public/index.html](E:/Long/tiktok-pagoda-live/public/index.html:25) và [demo-chua.html](E:/Long/tiktok-pagoda-live/demo-longnh/demo-chua.html:17), thêm một `actorsCanvas` để vẽ người, giữ `effectsCanvas` cho khói, sen và hiệu ứng ánh sáng; giữ `streamSpeechLayer` làm lớp DOM cho bubble.

Thứ tự lớp gợi ý:

1. Ảnh nền và kiến trúc điện.
2. Bàn thờ, ghế và thảm đỏ.
3. `actorsCanvas`: VIP, hội chúng và người đại diện.
4. `effectsCanvas`: khói, cánh sen, hào quang và hiệu ứng quà.
5. HUD và bubble chat.

Tọa độ nhân vật nên dùng hệ tọa độ chuẩn hóa theo khung 9:16, sau đó đổi sang kích thước canvas thực. Điều này giúp cùng một animation hoạt động ở trang chính, bản demo và kích thước OBS.

## B. Dùng mô hình actor có trạng thái

Trong `pagoda.js`, tổ chức code thành các phần nội bộ:

- `ActorRegistry`: `Map` actor theo `userId`, gồm `name`, `avatarUrl`, `seat`, `x/y`, `scale`, `phase`, `pose` và `animation`.
- `AnimationEngine`: cập nhật trạng thái và vẽ các actor trong một vòng lặp.
- `RitualDirector`: xếp hàng nghi lễ, điều khiển người đại diện và đợt cúi lạy hội chúng.
- `EventAdapter`: chuẩn hóa sự kiện từ TikTok, WebSocket và nút RPC về cùng một dạng.

Trạng thái actor thường có thể gồm `idle`, `breathe`, `bowWave` và `recover`. Người đại diện cần thêm `walkingUp`, `kneelDown`, `kneel`, `forehead`, `bowMid`, `prostrate`, `prostrateDeep` và `recover`.

Để tạo hiệu ứng chiều sâu, sắp xếp actor theo tọa độ chân `y` trước khi vẽ. Nhân vật ở hàng sau nhỏ hơn và được vẽ trước; hàng trước lớn hơn và được vẽ sau. Đưa người đại diện vào cùng hệ tọa độ này khi đi trên thảm để nhân vật có thể đi trước hoặc sau hội chúng hợp lý.

## C. Dựng nhịp thở và cúi lạy theo sóng

Mỗi actor nhận `phase` ngẫu nhiên ổn định khi được tạo. VIP có thể nhấp nhô rất nhẹ với chu kỳ chậm; hội chúng dùng biên độ nhỏ hơn và chu kỳ lệch nhau. Dùng `transform` hoặc dịch chuyển tọa độ sprite để tạo nhịp thở, tránh tạo hiệu ứng bóng đổ nặng riêng cho từng người.

Với cúi lạy tập thể, chia ghế thành nhóm theo độ sâu hoặc theo hàng. Mỗi nhóm nhận độ trễ riêng trong khoảng ngắn để tạo sóng từ sau ra trước, hoặc từ hai bên hướng vào trung tâm. Mỗi đợt có pha cúi, giữ tư thế và hồi phục. VIP tham gia cùng nhịp nhưng với biên độ phù hợp tư thế ngồi.

Chính sách phản ứng nên khác nhau theo loại sự kiện:

| Sự kiện | Phản ứng đề xuất |
|---|---|
| Bình luận | Bubble hiện tại đúng ghế của người gửi; actor đó cúi nhẹ. Gộp bình luận dồn dập thành đợt sóng nhỏ. |
| Thả tim | Gộp số tim trong một khoảng ngắn rồi kích hoạt một sóng cúi nhẹ, cường độ theo số tim. |
| Gõ mõ | Một nhịp sóng cho mỗi tiếng mõ; giới hạn số nhịp tối đa trong một yêu cầu. |
| Quà tặng | Người đại diện đi lên, lạy Tam Bái; hội chúng cúi theo đợt quanh thời điểm nhân vật quỳ. |
| RPC | Nút RPC gọi chung `RitualDirector`, truyền tên, lời khấn, nhãn nghi lễ và loại hiệu ứng. |

Gộp sự kiện và giới hạn tốc độ là cần thiết để chuỗi bình luận hoặc tim liên tục không khiến animation bị chồng lấn.

## D. Cho người đại diện đi lễ theo một timeline

Chuẩn bị bộ ảnh trong suốt đồng bộ phong cách với cảnh hiện có: hai frame bước đi và các tư thế quỳ/lạy. Hình `pilgrim_sprite.jpg` hiện tại là một ảnh tĩnh; nó không thay thế được chuỗi pose. Có thể dùng các ảnh pose của dự án tham chiếu làm tài liệu thiết kế, nhưng cần xác nhận quyền sử dụng trước khi đưa asset sang dự án đích.

Người đại diện bắt đầu ở cuối thảm, tiến dần tới vị trí trước lư hương. Trong khi đi, giảm kích thước theo phối cảnh; khi đến nơi thì dừng, quỳ xuống và thực hiện ba vòng:

`forehead → bowMid → prostrate → prostrateDeep → prostrate → bowMid → kneel`

Kết thúc ở tư thế quỳ hoặc trở về trạng thái chờ. Tốt hơn nên điều khiển bằng timeline thời gian trong `AnimationEngine` thay vì tạo nhiều `setTimeout` riêng lẻ. Nếu sự kiện mới đến khi nghi lễ đang chạy, đưa vào hàng đợi hoặc gộp theo chính sách; không để timer cũ đổi pose của nghi lễ mới.

## E. Gắn bubble với danh tính TikTok thật

Client nên cập nhật actor theo `userId` và vị trí ghế, rồi đặt bubble ngay phía trên actor đó. Bubble gồm ảnh đại diện, nickname và nội dung; avatar lỗi thì dùng ảnh mặc định. Giới hạn chiều dài, cho phép xuống dòng và chỉ giữ số bubble vừa phải trên màn hình để tránh che cảnh.

Cần mở rộng `server.js`: server đã trích xuất `avatar` khi nhận người vào live và quà tặng, nhưng sự kiện chat hiện chỉ phát `userId`, tên và nội dung; sự kiện tim cũng thiếu định danh/avatar, còn payload quà không chuyển avatar tới client. Hãy chuẩn hóa payload để các sự kiện cần hiển thị người gửi có `userId`, `name`, `avatar`, nội dung hoặc loại quà, và thời điểm sự kiện. Như vậy client có thể cập nhật đúng người ngay cả khi chat hoặc quà đến trước sự kiện vào phòng.

## F. Các bước triển khai

1. **Chuẩn hóa asset:** tạo bộ sprite PNG trong suốt cho người ngồi/thở/cúi và bộ pose riêng cho người đại diện; lập cấu hình kích thước frame, điểm neo chân và tỉ lệ.
2. **Bổ sung lớp actor:** cập nhật hai HTML để có cùng `actorsCanvas`; điều chỉnh CSS lớp cảnh và bubble để hai trang dùng chung.
3. **Thay hình tĩnh bằng actor:** chuyển 6 VIP và hội chúng sang `ActorRegistry`; giữ ghế, thứ tự hàng và tên mẫu trong chế độ demo.
4. **Thêm event identity:** sửa payload WebSocket ở `server.js`, xử lý `visitor_join`, `chat_message`, `like_burst`, quà và các nghi lễ trong `pagoda.js`.
5. **Thêm animation engine:** dùng một đồng hồ thời gian chung, nhịp thở lệch pha và sắp xếp theo `y`.
6. **Thêm `RitualDirector`:** định nghĩa timeline đi thảm đỏ, ba lần lạy, sóng cúi của hội chúng và hàng đợi/gộp sự kiện.
7. **Đồng bộ demo:** đảm bảo `demo-chua.html` nạp cùng cấu trúc, CSS, asset và engine như trang chính; chỉ khác dữ liệu giả lập.

# Mục tiêu hiệu năng

Dùng một vòng lặp cập nhật nhân vật; tránh một `requestAnimationFrame` riêng cho từng actor hoặc một loạt timer cho từng tư thế. Dùng `dt` theo thời gian thực và giới hạn bước cập nhật sau khi trình duyệt khựng. Có thể chạy nhân vật ở mục tiêu 60 FPS, còn khói và hiệu ứng trang trí nhẹ hơn có thể cập nhật 30 FPS như hướng tiếp cận của `particles.js`.

Tạo canvas theo kích thước khung và giới hạn `devicePixelRatio` để tránh render canvas quá lớn trong OBS. Dùng ảnh đã preload, giới hạn số hạt, gom tim/bình luận liên tiếp và tạm dừng hiệu ứng nền khi trang bị ẩn.

Tiêu chí nghiệm thu nên gồm: animation đi thảm đỏ và ba lần lạy chạy đủ ở trang chính lẫn demo; bubble có đúng nickname/avatar và neo đúng actor; các đợt cúi không đồng bộ cứng hoặc chồng timeline; và thời gian render mục tiêu không vượt khoảng 16,7 ms mỗi frame trên cấu hình OBS dùng để phát.