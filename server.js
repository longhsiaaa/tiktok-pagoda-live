/**
 * Hệ thống Livestream Tương Tác: Lễ Chùa Dâng Hương Online
 * Tác giả: LongNH (longnh.com)
 * Hỗ trợ: TikTok Live Connector + OBS Overlay + Web Local Mode (IP Viewer Identification)
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME || '';
const TEMPLE_NAME = process.env.TEMPLE_NAME || 'VẠN PHÚC TỰ';
const SO_INTERVAL_MINUTES = parseInt(process.env.SO_INTERVAL_MINUTES || '15', 10);
const SIMULATE = process.argv.includes('--simulate') || process.env.SIMULATE === 'true';

// Danh sách Pháp Danh ngẫu nhiên cho khách viếng chùa theo IP
const DHARMA_NAMES = [
  'Diệu Tâm', 'Thiện Nhân', 'Minh Tuệ', 'Phúc Hưng', 'Thanh Tịnh',
  'Tâm An', 'Trí Dũng', 'Từ Bi', 'Hỷ Xả', 'Diệu Âm',
  'An Lạc', 'Quang Minh', 'Chân Như', 'Ngộ Đạo', 'Vạn Hạnh',
  'Bảo An', 'Tịnh Độ', 'Tâm Đức', 'Diệu Thiện', 'Phước Duyên'
];

// Danh sách thí chủ đã dâng hương, cúng dường (dùng cho Sớ Cầu An & Sổ Công Đức)
const meritBook = new Map(); // key: id/username/ip, value: { name, avatar, gifts, totalDiamonds, intent, timestamp }
const activeVisitors = new Map(); // Quản lý bồ đoàn hiện thời (tối đa 48 chỗ)
const MAX_CUSHIONS = 48;

// Helper: Chuẩn hóa IP
function cleanIp(rawIp) {
  if (!rawIp) return '127.0.0.1';
  let ip = rawIp.replace(/^.*:/, ''); // Bỏ IPv6 prefix ::ffff:
  if (ip === '1' || ip === '::1') ip = '127.0.0.1';
  return ip;
}

// Helper: Rút gọn IP để bảo mật (vd: 113.161.45.89 -> 113.161.45.xx)
function maskIp(ip) {
  if (ip === '127.0.0.1' || ip === 'localhost') return 'Local';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.xx`;
  }
  return ip.substring(0, Math.min(ip.length, 10)) + '..';
}

// Helper: Sinh pháp danh cố định dựa theo IP
function getDharmaNameForIp(ip) {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = (hash << 5) - hash + ip.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DHARMA_NAMES.length;
  return `Phật tử ${DHARMA_NAMES[index]}`;
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Lấy thông tin người xem hiện tại theo IP (Local Visitor Mode)
app.get('/api/visitor', (req, res) => {
  const rawIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
  const ip = cleanIp(rawIp);
  const masked = maskIp(ip);
  const dharma = getDharmaNameForIp(ip);

  res.json({
    ip,
    maskedIp: masked,
    dharmaName: dharma,
    displayName: `${dharma} (${masked})`,
    templeName: TEMPLE_NAME,
    simulate: SIMULATE,
    tiktokActive: Boolean(tiktokLiveConnection)
  });
});

// API: Lấy danh sách Sổ Công Đức
app.get('/api/merits', (req, res) => {
  const list = Array.from(meritBook.values())
    .sort((a, b) => b.totalDiamonds - a.totalDiamonds)
    .slice(0, 20);
  res.json({ merits: list });
});

// API: Lấy danh sách Sớ Cầu An cho AI Lector xướng danh
app.get('/api/prayer-list', (req, res) => {
  const prayers = Array.from(meritBook.values())
    .filter(m => m.totalDiamonds > 0 || m.intent)
    .map(m => ({
      name: m.name,
      intent: m.intent || 'Cầu gia đạo bình an, tai qua nạn khỏi, sở cầu như ý',
      diamonds: m.totalDiamonds
    }));
  res.json({ prayers });
});

// WebSocket Server
function broadcast(type, data) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

// Xử lý kết nối WebSocket từ OBS hoặc Trình duyệt
wss.on('connection', (ws, req) => {
  const rawIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
  const ip = cleanIp(rawIp);
  const masked = maskIp(ip);
  const dharma = getDharmaNameForIp(ip);
  const visitorId = `ip_${ip.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Gửi thông tin chào mừng và trạng thái hiện tại
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      visitor: {
        id: visitorId,
        ip,
        maskedIp: masked,
        name: `${dharma} (${masked})`,
        dharmaName: dharma
      },
      templeName: TEMPLE_NAME,
      merits: Array.from(meritBook.values()).slice(0, 10),
      activeVisitors: Array.from(activeVisitors.values())
    }
  }));

  // Đăng ký khách này vào một bồ đoàn nếu chưa có
  if (!activeVisitors.has(visitorId)) {
    const seatIndex = findEmptySeat();
    if (seatIndex !== -1) {
      const visitorObj = {
        id: visitorId,
        name: `${dharma} (${masked})`,
        avatar: '',
        seatIndex,
        isVip: false,
        totalGifts: 0,
        joinedAt: Date.now()
      };
      activeVisitors.set(visitorId, visitorObj);
      broadcast('visitor_join', visitorObj);
    }
  }

  // Nhận tương tác trực tiếp từ trình duyệt của khách
  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      handleClientAction(parsed, visitorId, `${dharma} (${masked})`);
    } catch (e) {
      console.error('Lỗi phân tích WebSocket message:', e.message);
    }
  });

  ws.on('close', () => {
    // Không cần xóa ngay để bồ đoàn giữ được người đang ngồi trang nghiêm
  });
});

// Tìm bồ đoàn trống
function findEmptySeat() {
  const takenSeats = new Set(Array.from(activeVisitors.values()).map(v => v.seatIndex));
  for (let i = 0; i < MAX_CUSHIONS; i++) {
    if (!takenSeats.has(i)) return i;
  }
  // Nếu đã kín 48 chỗ, thay thế người cũ nhất
  let oldest = null;
  let oldestTime = Infinity;
  for (const [id, v] of activeVisitors.entries()) {
    if (v.joinedAt < oldestTime) {
      oldestTime = v.joinedAt;
      oldest = id;
    }
  }
  if (oldest) {
    const seat = activeVisitors.get(oldest).seatIndex;
    activeVisitors.delete(oldest);
    return seat;
  }
  return 0;
}

// Xử lý hành động từ phía Client Web
function handleClientAction(msg, defaultId, defaultName) {
  const { action, text, name } = msg;
  const userName = name || defaultName;
  const userId = defaultId;

  switch (action) {
    case 'incense': // Thắp nhang
      recordMerit(userId, userName, 1, 'Dâng nén tâm hương cầu an');
      broadcast('ceremony_incense', {
        userId,
        name: userName,
        sticks: 3,
        text: text || 'Thành tâm thắp nén tâm hương cúng dường Tam Bảo 🙏'
      });
      break;

    case 'bow': // Lạy Phật tam bái
      recordMerit(userId, userName, 5, 'Lạy Phật sám hối cầu bình an');
      broadcast('ceremony_bow', {
        userId,
        name: userName,
        bowCount: 3,
        text: text || 'Ngũ thể đầu địa, chí tâm đảnh lễ Đức Bổn Sư Thích Ca Mâu Ni Phật 🙏'
      });
      break;

    case 'lotus': // Dâng hoa sen
      recordMerit(userId, userName, 10, 'Dâng đóa sen hồng thanh tịnh');
      broadcast('ceremony_lotus', {
        userId,
        name: userName,
        color: 'pink',
        text: text || 'Dâng đóa sen thanh khiết lên đài sen Đức Thế Tôn 🪷'
      });
      break;

    case 'fruit': // Dâng mâm ngũ quả
      recordMerit(userId, userName, 30, 'Dâng mâm quả cúng dường');
      broadcast('ceremony_fruit', {
        userId,
        name: userName,
        text: text || 'Dâng mâm ngũ quả tươi tốt cúng dường Tam Bảo, phước huệ trang nghiêm 🍎🍇'
      });
      break;

    case 'bell': // Thỉnh chuông
      broadcast('sound_bell', { userId, name: userName });
      break;

    case 'woodblock': // Gõ mõ
      broadcast('sound_woodblock', { userId, name: userName, count: msg.count || 3 });
      break;

    case 'divination': // Rút quẻ xăm Quan Âm
      const fortune = getRandomFortune();
      broadcast('divination_result', {
        userId,
        name: userName,
        fortune
      });
      break;

    case 'chat': // Bình luận / Khấn nguyện
      handleChatEvent(userId, userName, text || 'Nam Mô A Di Đà Phật 🙏');
      break;

    case 'so_read': // Kích hoạt xướng Sớ Cầu An bằng AI
      triggerSoReading();
      break;

    default:
      console.log('Hành động chưa hỗ trợ:', action);
  }
}

// Ghi nhận vào Sổ Công Đức
function recordMerit(id, name, diamonds, intent) {
  if (!meritBook.has(id)) {
    meritBook.set(id, {
      id,
      name,
      avatar: '',
      totalDiamonds: 0,
      intent: intent || '',
      timestamp: Date.now()
    });
  }
  const entry = meritBook.get(id);
  entry.totalDiamonds += diamonds;
  if (intent) entry.intent = intent;
  entry.timestamp = Date.now();

  // Kiểm tra nếu là VIP (nằm trong Top 5 dâng lễ nhiều nhất)
  updateVipSeats();
}

function updateVipSeats() {
  const sorted = Array.from(meritBook.values()).sort((a, b) => b.totalDiamonds - a.totalDiamonds);
  const topIds = new Set(sorted.slice(0, 5).map(m => m.id));

  for (const [id, v] of activeVisitors.entries()) {
    v.isVip = topIds.has(id);
  }
  broadcast('update_vips', { topIds: Array.from(topIds) });
}

// Xử lý bình luận
function handleChatEvent(userId, userName, comment) {
  const lower = comment.toLowerCase();

  // Tự động rút quẻ xăm nếu bình luận có từ khóa
  if (lower.includes('xin que') || lower.includes('rút quẻ') || lower.includes('xin xăm') || lower.includes('gieo que')) {
    const fortune = getRandomFortune();
    broadcast('divination_result', {
      userId,
      name: userName,
      fortune
    });
    return;
  }

  // Tự động gõ mõ nếu bình luận niệm Phật
  if (lower.includes('a di đà') || lower.includes('quan thế âm') || lower.includes('thích ca') || lower.includes('bình an')) {
    broadcast('sound_woodblock', { userId, name: userName, count: 1 });
  }

  broadcast('chat_message', {
    userId,
    name: userName,
    text: comment
  });
}

// Danh sách 16 Quẻ Xăm Linh Ứng Phật Bà Quan Âm thuần Việt
const FORTUNES = [
  {
    number: 1,
    title: 'Thượng Thượng Cát - Long Đức Chiếu Mệnh',
    poem: 'Đầu xuân mưa thuận gió êm đềm,\nTrời ban phúc lộc đến thềm nhà xưa.\nMuôn việc hanh thông chẳng quản vừa,\nTâm thành tích đức phúc khôn ngơi.',
    meaning: 'Cầu tài đại cát, gia đạo an khang. Mọi mong ước nay sắp thành hiện thực, nên tiếp tục làm việc thiện tích đức.',
    advice: 'Giữ tâm khiêm tốn, giúp đỡ người nghèo khó để phước báu được lâu dài.'
  },
  {
    number: 2,
    title: 'Thượng Cát - Sen Nở Cửa Thiền',
    poem: 'Đài sen thanh tịnh ngát hương thơm,\nQua cơn giông bão sáng trăng tròn.\nCông danh sự nghiệp dần như ý,\nNgười đi xa xứ hội tương phùng.',
    meaning: 'Khó khăn vừa qua, vận may bắt đầu hé rạng. Sự nghiệp hanh thông, quý nhân phù trợ.',
    advice: 'Tâm an thì trí sáng, hành sự vững vàng ắt gặt hái thành công.'
  },
  {
    number: 3,
    title: 'Trung Cát - Trăng Rằm Soi Bóng',
    poem: 'Trăng thu soi sáng khắp muôn trùng,\nĐường xa chớ vội bước ung dung.\nĐợi thời cơ chín rồi toan tính,\nBình an phúc trạch sẽ trùng trùng.',
    meaning: 'Thời vận ở mức trung bình khá, không nên đầu tư mạo hiểm nóng vội. Gia đạo êm ấm.',
    advice: 'Lắng nghe lời người hiền, bớt lời thị phi, bình tâm chờ thời cơ.'
  },
  {
    number: 4,
    title: 'Thượng Thượng Cát - Khổ Ải Hóa Cam Lồ',
    poem: 'Bồ Tát rưới cành dương liễu xanh,\nCam lồ một giọt tẩy trần ai.\nBệnh tật tiêu trừ tai ách dứt,\nGia môn hỷ khí rộn sum vầy.',
    meaning: 'Sức khỏe bình phục, tai qua nạn khỏi. Gia đình có tin vui về con cháu hoặc hôn sự.',
    advice: 'Phóng sinh tu phúc, hiếu kính cha mẹ sẽ được ơn trên che chở.'
  },
  {
    number: 5,
    title: 'Trung Cát - Gieo Duyên Đón Quả',
    poem: 'Ruộng cày xuân tới gieo mầm tốt,\nThu đến hoa vàng trĩu hạt sen.\nViệc làm chính trực trời soi xét,\nChẳng nhọc công tìm phúc tự lai.',
    meaning: 'Tiền bạc vừa đủ, làm ăn chân chính ắt có lợi nhuận bền vững. Không tham bát bỏ mâm.',
    advice: 'Giữ chữ tín trong buôn bán, không sân si tranh đoạt.'
  },
  {
    number: 6,
    title: 'Thượng Cát - Bình Minh Rọi Chánh Điện',
    poem: 'Chuông chùa ngân sớm phá sương mù,\nÁnh quang rực rỡ khắp non tây.\nƯớc mong bấy lâu nay thành tựu,\nCười đón duyên lành thỏa dạ hay.',
    meaning: 'Thi cử đỗ đạt, công việc thăng tiến. Xuất hành đi xa gặp nhiều may mắn.',
    advice: 'Tri ân người đã giúp đỡ mình, phát tâm cúng dường Tam Bảo.'
  },
  {
    number: 7,
    title: 'Bình An Cát - Tịnh Thủy Lưu Thông',
    poem: 'Nước chảy đầu non xuôi suối lành,\nTâm như gương sáng bụi không bám.\nĐời thường thanh đạm niềm vui lớn,\nBình an hai chữ quý hơn vàng.',
    meaning: 'Không giàu sang tột đỉnh nhưng tâm thần an ổn, gia đình hòa thuận, không bệnh tật hiểm nghèo.',
    advice: 'Biết đủ là giàu, thường xuyên đọc kinh niệm Phật tại gia.'
  },
  {
    number: 8,
    title: 'Thượng Thượng Cát - Vạn Sự Cát Tường',
    poem: 'Tâm thành một nén trầm hương dâng,\nPhật chứng lòng son sáng tấc lòng.\nMở lối hanh thông ngàn cánh cửa,\nTiền tài danh vọng sáng rực hồng.',
    meaning: 'Quẻ đẹp nhất trong tháng. Kinh doanh phát đạt, gia quyến an khang, mọi trắc trở đều tiêu tan.',
    advice: 'Tạ ơn ơn trên, trích phần tài lộc làm việc cứu nhân độ thế.'
  }
];

function getRandomFortune() {
  const idx = Math.floor(Math.random() * FORTUNES.length);
  return FORTUNES[idx];
}

// Xướng Sớ Cầu An bằng AI
function triggerSoReading() {
  const prayers = Array.from(meritBook.values())
    .filter(m => m.totalDiamonds > 0 || m.intent)
    .slice(0, 10);

  let namesText = '';
  if (prayers.length === 0) {
    namesText = 'toàn thể thập phương thiện nam tín nữ, quý vị đồng bào cùng gia quyến';
  } else {
    namesText = prayers.map(p => `Phật tử ${p.name}`).join(', ');
  }

  const soText = `Nam Mô Bổn Sư Thích Ca Mâu Ni Phật. ` +
    `Hôm nay ngày lành tháng tốt, trước Tam Bảo uy nghiêm thanh tịnh nơi ${TEMPLE_NAME}, ` +
    `chúng con xin đồng hiệp ý dâng lời khấn nguyện hồi hướng công đức cho: ${namesText}. ` +
    `Nguyện cầu ơn Phật từ bi gia hộ cho quý Phật tử cùng toàn thể gia quyến: ` +
    `thân tâm an lạc, tai qua nạn khỏi, sở cầu tất ứng, vạn sự cát tường, phước thọ tăng long. ` +
    `Nam Mô A Di Đà Phật!`;

  broadcast('so_chanting', {
    text: soText,
    templeName: TEMPLE_NAME,
    prayersCount: prayers.length
  });
}

// Lên lịch tự động đọc sớ định kỳ nếu cấu hình
if (SO_INTERVAL_MINUTES > 0) {
  setInterval(() => {
    if (meritBook.size > 0) {
      console.log(`[TỰ ĐỘNG] Kích hoạt xướng Sớ Cầu An (${SO_INTERVAL_MINUTES} phút/lần)...`);
      triggerSoReading();
    }
  }, SO_INTERVAL_MINUTES * 60 * 1000);
}

// TÍCH HỢP TIKTOK LIVE CONNECTOR
let tiktokLiveConnection = null;

if (TIKTOK_USERNAME) {
  console.log(`[TIKTOK] Đang kết nối tới kênh Live: @${TIKTOK_USERNAME}...`);
  tiktokLiveConnection = new WebcastPushConnection(TIKTOK_USERNAME);

  tiktokLiveConnection.connect().then(state => {
    console.log(`[TIKTOK] Kết nối thành công tới phòng Live ID: ${state.roomId}`);
    broadcast('tiktok_status', { connected: true, username: TIKTOK_USERNAME, roomId: state.roomId });
  }).catch(err => {
    console.error(`[TIKTOK] Lỗi kết nối: ${err.message}`);
    broadcast('tiktok_status', { connected: false, error: err.message });
  });

  // Sự kiện: Viewer vào xem live
  tiktokLiveConnection.on('member', data => {
    const userId = `tt_${data.uniqueId}`;
    const userName = data.nickname || data.uniqueId;
    const avatar = data.profilePictureUrl || '';

    let visitor = activeVisitors.get(userId);
    if (!visitor) {
      const seat = findEmptySeat();
      visitor = {
        id: userId,
        name: userName,
        avatar,
        seatIndex: seat,
        isVip: false,
        totalGifts: 0,
        joinedAt: Date.now()
      };
      activeVisitors.set(userId, visitor);
      broadcast('visitor_join', visitor);
    }
  });

  // Sự kiện: Viewer bình luận
  tiktokLiveConnection.on('chat', data => {
    const userId = `tt_${data.uniqueId}`;
    const userName = data.nickname || data.uniqueId;
    handleChatEvent(userId, userName, data.comment);
  });

  // Sự kiện: Viewer gửi quà tặng (Gift)
  tiktokLiveConnection.on('gift', data => {
    // Chỉ xử lý khi chuỗi combo kết thúc hoặc gift đơn lẻ
    if (data.giftType === 1 && !data.repeatEnd) return;

    const userId = `tt_${data.uniqueId}`;
    const userName = data.nickname || data.uniqueId;
    const diamondCount = (data.diamondCount || 1) * (data.repeatCount || 1);
    const giftName = data.giftName || 'Quà';

    console.log(`[GIFT] ${userName} gửi quà ${giftName} (Giá trị: ${diamondCount} xu)`);

    // Ghi nhận công đức
    recordMerit(userId, userName, diamondCount, `Cúng dường ${giftName}`);

    // Ánh xạ quà tặng sang nghi lễ Phật giáo
    if (diamondCount >= 100) {
      // 100+ coins: Đại Lễ Cúng Dường
      broadcast('ceremony_great', {
        userId,
        name: userName,
        giftName,
        diamondCount,
        text: `Đại lễ cúng dường: Thiện nam tín nữ ${userName} phát tâm cúng dường Tam Bảo!`
      });
      triggerSoReading();
    } else if (diamondCount >= 30) {
      // 30-99 coins: Dâng Mâm Ngũ Quả
      broadcast('ceremony_fruit', {
        userId,
        name: userName,
        giftName,
        text: `Thiện tín ${userName} dâng mâm ngũ quả cúng dường Tam Bảo!`
      });
    } else if (diamondCount >= 10) {
      // 10-29 coins: Lạy Phật Tam Bái
      broadcast('ceremony_bow', {
        userId,
        name: userName,
        bowCount: 3,
        text: `Phật tử ${userName} chí tâm đảnh lễ Đức Thế Tôn tam bái!`
      });
    } else if (diamondCount >= 5) {
      // 5-9 coins: Dâng Đóa Sen Hồng
      broadcast('ceremony_lotus', {
        userId,
        name: userName,
        text: `Phật tử ${userName} dâng đóa sen thanh khiết lên Tam Bảo!`
      });
    } else {
      // 1-4 coins: Thắp Nén Nhang Trầm + Chuông
      broadcast('ceremony_incense', {
        userId,
        name: userName,
        sticks: 1,
        text: `Thiện tín ${userName} thắp nén tâm hương cúng dường!`
      });
    }
  });

  // Sự kiện: Viewer thả tim
  tiktokLiveConnection.on('like', data => {
    broadcast('like_burst', {
      likeCount: data.likeCount || 1,
      name: data.nickname || 'Phật tử'
    });
  });
}

// CHẾ ĐỘ GIẢ LẬP (SIMULATION MODE) ĐỂ TEST KHÔNG CẦN LIVE TIKTOK
if (SIMULATE) {
  console.log('[SIMULATE] Chế độ mô phỏng tương tác tự động đang BẬT.');
  const SIM_NAMES = [
    'Nguyễn Thu Trang', 'Trần Đình Quang', 'Lê Thị Mai', 'Phạm Hoàng Nam',
    'Hoàng Lan Hương', 'Vũ Minh Đức', 'Bùi Diệu Thảo', 'Đỗ Thanh Bình'
  ];

  const SIM_COMMENTS = [
    'Nam Mô A Di Đà Phật 🙏',
    'Cầu bình an cho mẹ hiền sức khỏe dồi dào',
    'Con kính lạy Phật Bổn Sư Thích Ca',
    'Xin que may mắn đầu tháng ạ 🎋',
    'Nam Mô Quán Thế Âm Bồ Tát cứu khổ cứu nạn',
    'Cầu cho công việc hanh thông, vạn sự lành',
    'A Di Đà Phật 🙏'
  ];

  // Tự động sinh khách vào chùa sau mỗi 6-12 giây
  setInterval(() => {
    const randomName = SIM_NAMES[Math.floor(Math.random() * SIM_NAMES.length)];
    const simId = `sim_${Math.floor(Math.random() * 9999)}`;
    const seat = findEmptySeat();
    const visitor = {
      id: simId,
      name: randomName,
      avatar: '',
      seatIndex: seat,
      isVip: false,
      totalGifts: 0,
      joinedAt: Date.now()
    };
    activeVisitors.set(simId, visitor);
    broadcast('visitor_join', visitor);
  }, 10000);

  // Tự động sinh bình luận ngẫu nhiên
  setInterval(() => {
    if (activeVisitors.size === 0) return;
    const visitorsArray = Array.from(activeVisitors.values());
    const randomVisitor = visitorsArray[Math.floor(Math.random() * visitorsArray.length)];
    const randomComment = SIM_COMMENTS[Math.floor(Math.random() * SIM_COMMENTS.length)];
    handleChatEvent(randomVisitor.id, randomVisitor.name, randomComment);
  }, 8000);
}

// Khởi chạy Server
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🪷 HỆ THỐNG LIVESTREAM CHÙA DÂNG HƯƠNG ONLINE SẴN SÀNG`);
  console.log(`📍 Web Local Overlay: http://localhost:${PORT}`);
  console.log(`📍 Kênh TikTok: ${TIKTOK_USERNAME ? '@' + TIKTOK_USERNAME : '(Chưa cấu hình, đang chạy Web Mode)'}`);
  console.log(`📍 Chế độ Mô phỏng: ${SIMULATE ? 'BẬT (--simulate)' : 'TẮT'}`);
  console.log(`======================================================\n`);
});
