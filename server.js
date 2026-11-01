/**
 * Hệ thống Livestream Tương Tác: Lễ Chùa Dâng Hương Online
 * Tác giả: LongNH (longnh.com)
 * Hỗ trợ: TikTok Live Connector + OBS Overlay + Web Local Mode (IP Viewer Identification)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let TikTokLib = null;
async function getTikTokLib() {
  if (!TikTokLib) {
    TikTokLib = await import('tiktok-live-connector');
  }
  return TikTokLib;
}

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

// API: VieNeu-TTS AI Voice Proxy (Giọng Nam Chuẩn Thanh Bình 48kHz)
app.get('/api/tts', async (req, res) => {
  const text = req.query.text;
  if (!text) return res.status(400).json({ error: 'Missing text parameter' });
  try {
    const ttsUrl = `http://127.0.0.1:5050/tts?text=${encodeURIComponent(text)}&voice=Thanh%20B%C3%ACnh`;
    const response = await fetch(ttsUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'VieNeu-TTS server error' });
    }
    const arrayBuf = await response.arrayBuffer();
    res.set({
      'Content-Type': 'audio/wav',
      'Cache-Control': 'public, max-age=3600'
    });
    res.send(Buffer.from(arrayBuf));
  } catch (err) {
    res.status(503).json({ error: 'VieNeu-TTS service not reachable' });
  }
});

// API: Kết nối TikTok Live theo tên kênh động (@username)
app.post('/api/tiktok/connect', async (req, res) => {
  const { username } = req.body || {};
  if (!username) {
    return res.status(400).json({ success: false, error: 'Vui lòng cung cấp tên kênh TikTok' });
  }
  try {
    const st = await connectTikTok(username);
    res.json({ success: true, ...st });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Không thể kết nối phòng Live' });
  }
});

// API: Ngắt kết nối TikTok Live
app.post('/api/tiktok/disconnect', async (req, res) => {
  await disconnectTikTok();
  res.json({ success: true, ...tiktokState });
});

// API: Kiểm tra trạng thái TikTok Live
app.get('/api/tiktok/status', (req, res) => {
  res.json(tiktokState);
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

    case 'connect_tiktok': // Kết nối TikTok Live từ Web/RPC
      if (msg.username) {
        connectTikTok(msg.username).catch(err => {
          console.error('[RPC connect_tiktok]', err.message);
        });
      }
      break;

    case 'disconnect_tiktok': // Ngắt kết nối TikTok Live
      disconnectTikTok().catch(err => {
        console.error('[RPC disconnect_tiktok]', err.message);
      });
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

// ============================================================================
// TÍCH HỢP TIKTOK LIVE CONNECTOR (v2.5.0 - CHUẨN THỰC CHIẾN)
// ============================================================================
let tiktokLiveConnection = null;
let tiktokState = {
  status: 'idle', // idle, connecting, connected, disconnected, error
  username: '',
  error: '',
  roomId: '',
  viewerCount: 0
};

// Hàm trích xuất thông tin người dùng từ sự kiện TikTok an toàn và đầy đủ
function extractUserFromEvent(data) {
  const u = data?.user || data?.userDetails || {};
  const uniqueId = String(u?.uniqueId || data?.uniqueId || u?.userId || data?.userId || 'an_danh');
  const name = String(u?.nickname || data?.nickname || u?.uniqueId || data?.uniqueId || 'Ẩn danh');
  const avatar = u?.profilePicture?.url?.[0]
    || u?.profilePicture?.urlList?.[0]
    || u?.avatarThumb?.urlList?.[0]
    || u?.avatarThumb?.url?.[0]
    || u?.profilePictureUrl
    || data?.profilePictureUrl
    || '';
  return { uniqueId, name, avatar };
}

// Hàm kết nối TikTok Live với username bất kỳ
async function connectTikTok(uniqueId) {
  const cleanUser = String(uniqueId || '')
    .trim()
    .replace(/^.*tiktok\.com\/@?/i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '');

  if (!cleanUser) {
    throw new Error('Tên tài khoản TikTok không hợp lệ');
  }

  const { TikTokLiveConnection, ControlEvent, WebcastEvent } = await getTikTokLib();
  if (!TikTokLiveConnection) {
    throw new Error('Thư viện tiktok-live-connector chưa được cài đặt đúng');
  }

  await disconnectTikTok();

  tiktokState = {
    status: 'connecting',
    username: cleanUser,
    error: '',
    roomId: '',
    viewerCount: 0
  };
  broadcast('tiktok_status', tiktokState);
  console.log(`[TIKTOK] Bắt đầu kết nối tới phòng Live @${cleanUser}...`);

  try {
    const conn = new TikTokLiveConnection(cleanUser, {
      processInitialData: false,
      fetchRoomInfoOnConnect: false,
      enableExtendedGiftInfo: false
    });

    conn.on(ControlEvent.CONNECTED, state => {
      tiktokState = {
        status: 'connected',
        username: cleanUser,
        error: '',
        roomId: state?.roomId || conn?.roomId || '',
        viewerCount: tiktokState.viewerCount
      };
      broadcast('tiktok_status', tiktokState);
      console.log(`[TIKTOK] ✅ Đã kết nối thành công phòng Live @${cleanUser} (Room ID: ${tiktokState.roomId})`);
    });

    conn.on(ControlEvent.DISCONNECTED, () => {
      tiktokState = {
        ...tiktokState,
        status: 'disconnected',
        error: 'Phòng Live đã ngắt kết nối'
      };
      broadcast('tiktok_status', tiktokState);
      console.log(`[TIKTOK] ⚠️ Đã ngắt kết nối live @${cleanUser}`);
    });

    conn.on(ControlEvent.ERROR, err => {
      const errMsg = String(err?.info || err?.message || err);
      console.error(`[TIKTOK LỖI]: ${errMsg}`);
      tiktokState.error = errMsg;
      broadcast('tiktok_status', tiktokState);
    });

    // Sự kiện: Số lượng người đang xem Live
    conn.on(WebcastEvent.ROOM_USER, data => {
      const viewerCount = Number(data?.total ?? data?.viewerCount ?? 0);
      if (viewerCount > 0) {
        tiktokState.viewerCount = viewerCount;
        broadcast('tiktok_viewers', { viewerCount });
      }
    });

    // Sự kiện: Viewer vào xem live (Member join)
    conn.on(WebcastEvent.MEMBER, data => {
      const { uniqueId, name, avatar } = extractUserFromEvent(data);
      const userId = `tt_${uniqueId}`;

      let visitor = activeVisitors.get(userId);
      if (!visitor) {
        const seat = findEmptySeat();
        visitor = {
          id: userId,
          name,
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

    // Sự kiện: Viewer bình luận (Chat)
    conn.on(WebcastEvent.CHAT, data => {
      const { uniqueId, name } = extractUserFromEvent(data);
      const commentText = data?.comment || data?.content || '';
      console.log(`[TIKTOK CHAT] ${name}: ${commentText}`);
      handleChatEvent(`tt_${uniqueId}`, name, commentText);
    });

    // Sự kiện: Viewer thả tim (Like)
    conn.on(WebcastEvent.LIKE, data => {
      const { name } = extractUserFromEvent(data);
      const likeCount = Math.min(20, Math.max(1, Number(data?.likeCount || data?.count || 1)));
      broadcast('like_burst', {
        likeCount,
        name
      });
      broadcast('sound_woodblock', { userId: 'like', name, count: 1 });
    });

    // Sự kiện: Viewer gửi quà tặng (Gift)
    conn.on(WebcastEvent.GIFT, data => {
      const type = data.giftDetails?.giftType ?? data.extendedGiftInfo?.type ?? data.giftType;
      // Nếu là combo streak (type = 1) mà chưa kết thúc streak, bỏ qua để chờ chốt tổng
      if (type === 1 && !data.repeatEnd) return;

      const { uniqueId, name, avatar } = extractUserFromEvent(data);
      const userId = `tt_${uniqueId}`;
      const giftName = data.giftDetails?.giftName || data.extendedGiftInfo?.name || data.giftName || 'Quà';
      const diamonds = (data.giftDetails?.diamondCount ?? data.extendedGiftInfo?.diamond_count ?? data.diamondCount ?? 1) * (data.repeatCount || 1);

      console.log(`[TIKTOK GIFT] 🎁 ${name} gửi ${giftName} x${data.repeatCount || 1} (Giá trị: ${diamonds} xu)`);

      // Ghi nhận công đức
      recordMerit(userId, name, diamonds, `Cúng dường ${giftName}`);

      // Ánh xạ quà tặng theo giá trị xu TikTok vào các đại lễ Phật giáo
      if (diamonds >= 100) {
        // 100+ xu: Đại Lễ Kim Long Cúng Dường Tam Bảo
        broadcast('ceremony_great', {
          userId,
          name,
          giftName,
          diamondCount: diamonds,
          text: `Đại Lễ Kim Long: Thiện nam tín nữ ${name} phát tâm cúng dường Tam Bảo ${diamonds} xu!`
        });
        triggerSoReading();
      } else if (diamonds >= 30) {
        // 30-99 xu: Dâng Mâm Ngũ Quả
        broadcast('ceremony_fruit', {
          userId,
          name,
          giftName,
          diamondCount: diamonds,
          text: `Thiện tín ${name} dâng mâm ngũ quả tươi tốt cúng dường Tam Bảo!`
        });
      } else if (diamonds >= 10) {
        // 10-29 xu: Lạy Phật Tam Bái
        broadcast('ceremony_bow', {
          userId,
          name,
          diamondCount: diamonds,
          bowCount: 3,
          text: `Phật tử ${name} chí tâm đảnh lễ Đức Thế Tôn tam bái!`
        });
      } else if (diamonds >= 5) {
        // 5-9 xu: Dâng Đóa Sen Hồng
        broadcast('ceremony_lotus', {
          userId,
          name,
          diamondCount: diamonds,
          color: 'pink',
          text: `Phật tử ${name} dâng đóa sen thanh khiết lên Tam Bảo!`
        });
      } else {
        // 1-4 xu: Thắp Nén Nhang Trầm
        broadcast('ceremony_incense', {
          userId,
          name,
          diamondCount: diamonds,
          sticks: 1,
          text: `Thiện tín ${name} thắp nén tâm hương cúng dường!`
        });
      }
    });

    const roomState = await conn.connect();
    tiktokLiveConnection = conn;
    tiktokState = {
      status: 'connected',
      username: cleanUser,
      error: '',
      roomId: roomState?.roomId || conn?.roomId || '',
      viewerCount: tiktokState.viewerCount
    };
    broadcast('tiktok_status', tiktokState);
    return tiktokState;

  } catch (err) {
    const errMsg = err.message || String(err);
    console.error(`[TIKTOK KẾT NỐI THẤT BẠI]: ${errMsg}`);
    let friendlyError = errMsg;
    if (errMsg.includes('user_not_found') || errMsg.includes('19881007')) {
      friendlyError = `Kênh @${cleanUser} hiện không phát LIVE hoặc chưa mở phòng Live.`;
    } else if (errMsg.includes('offline') || errMsg.includes('LIVE has ended')) {
      friendlyError = `Phiên Live của @${cleanUser} đã kết thúc hoặc đang ngoại tuyến.`;
    }
    tiktokState = {
      status: 'error',
      username: cleanUser,
      error: friendlyError,
      roomId: '',
      viewerCount: 0
    };
    broadcast('tiktok_status', tiktokState);
    throw new Error(friendlyError);
  }
}

// Hàm ngắt kết nối TikTok Live
async function disconnectTikTok() {
  if (tiktokLiveConnection) {
    try {
      await tiktokLiveConnection.disconnect();
    } catch (e) {}
    tiktokLiveConnection = null;
  }
  tiktokState = {
    status: 'disconnected',
    username: '',
    error: '',
    roomId: '',
    viewerCount: 0
  };
  broadcast('tiktok_status', tiktokState);
}

// Tự động kết nối nếu có cấu hình TIKTOK_USERNAME trong .env
if (TIKTOK_USERNAME) {
  connectTikTok(TIKTOK_USERNAME).catch(err => {
    console.warn(`[TIKTOK AUTO-CONNECT] Không thể kết nối ban đầu tới @${TIKTOK_USERNAME}: ${err.message}`);
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
