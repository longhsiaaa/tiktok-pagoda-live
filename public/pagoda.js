/**
 * HỆ THỐNG LIVESTREAM CHÙA ONLINE & BẢNG ĐIỀU KHIỂN RPC
 * Tác giả: LongNH (longnh.com)
 * Client Engine: Photorealistic Canvas, Bồ Đoàn Tương Tác, Bảng Vàng & VieNeu-TTS Voice AI
 * Giọng đọc AI: VieNeu-TTS Nam Chuẩn (Thanh Bình) 48kHz studio audio
 */

(function () {
  'use strict';

  // Helper DOM & Security an toàn
  function safeOn(el, event, handler) {
    if (el) el.addEventListener(event, handler);
  }

  function safeText(el, text) {
    if (el) el.textContent = text;
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // State
  let audioCtx = null;
  let isSoundActive = false;
  let isVoiceEnabled = true;
  let isBgmEnabled = true;
  let bgmAudio = null;
  let currentBgmTrack = 'chu_dai_bi.mp3';
  let bgmVolume = 0.45;
  let voiceVolume = 0.86;
  let woodblockHits = 9317;
  let totalIncense = 1022;
  let totalCoins = 13948;

  let ws = null;
  let isSimulating = false;
  let speechBubbleId = 0;
  let currentTtsAudio = null;
  let currentTtsUrl = null;
  let currentTtsAbortController = null;
  let isTikTokConnected = false;

  // DOM Elements - Left Screen (Stream Viewport)
  const streamFrame = document.getElementById('streamFrame');
  const effectsCanvas = document.getElementById('effectsCanvas');
  const streamSpeechLayer = document.getElementById('streamSpeechLayer');
  const vipTerraceRow = document.getElementById('vipTerraceRow');
  const congregationGrid = document.getElementById('congregationGrid');
  const btnClickBell = document.getElementById('btnClickBell');
  const btnClickWoodblock = document.getElementById('btnClickWoodblock');
  const woodblockHitCount = document.getElementById('woodblockHitCount');
  const totalIncenseCount = document.getElementById('totalIncenseCount');
  const totalCoinsCount = document.getElementById('totalCoinsCount');
  const marqueeText = document.getElementById('marqueeText');
  const topDonorName = document.getElementById('topDonorName');
  const topDonorCoins = document.getElementById('topDonorCoins');

  // DOM Elements - Right Panel (Control & RPC)
  const btnMasterSound = document.getElementById('btnMasterSound');
  const btnToggleVoice = document.getElementById('btnToggleVoice');
  const btnToggleBgm = document.getElementById('btnToggleBgm');
  const bgmVolumeSlider = document.getElementById('bgmVolumeSlider');
  const voiceVolumeSlider = document.getElementById('voiceVolumeSlider');
  const bgmValText = document.getElementById('bgmValText');
  const voiceValText = document.getElementById('voiceValText');
  const bgmTrackSelect = document.getElementById('bgmTrackSelect');
  const btnToggleObsMode = document.getElementById('btnToggleObsMode');
  const btnConnectTikTok = document.getElementById('btnConnectTikTok');
  const inputTikTokUser = document.getElementById('inputTikTokUser');
  const btnToggleSimulate = document.getElementById('btnToggleSimulate');

  // RPC Buttons & Inputs
  const rpcSenderName = document.getElementById('rpcSenderName');
  const rpcPrayerText = document.getElementById('rpcPrayerText');
  const btnRpcIncense = document.getElementById('btnRpcIncense');
  const btnRpcLantern = document.getElementById('btnRpcLantern');
  const btnRpcWoodblock = document.getElementById('btnRpcWoodblock');
  const btnRpcBell = document.getElementById('btnRpcBell');
  const btnRpcDivination = document.getElementById('btnRpcDivination');
  const btnRpcLotus = document.getElementById('btnRpcLotus');
  const btnRpcDragon = document.getElementById('btnRpcDragon');
  const btnRpcChant = document.getElementById('btnRpcChant');

  // Fortune Modal
  const fortuneModal = document.getElementById('fortuneModal');
  const closeFortuneBtn = document.getElementById('closeFortuneBtn');
  const fortuneNum = document.getElementById('fortuneNum');
  const fortuneTitle = document.getElementById('fortuneTitle');
  const fortunePoem = document.getElementById('fortunePoem');
  const fortuneMeaning = document.getElementById('fortuneMeaning');
  const fortuneAdvice = document.getElementById('fortuneAdvice');

  // Theo dõi đóng góp cá nhân & Top Thí Chủ
  const donorMap = new Map([
    ['Tiến Trương', 5043],
    ['Anh Thơ 1227', 833],
    ['tao nồng ảnh...', 550],
    ['Nguyễn Đăng k...', 356],
    ['Lương nhi', 280],
    ['Tha choco', 210]
  ]);
  let currentTopDonor = { name: 'Tiến Trương', coins: 5043 };

  function recordDonation(sender, coins) {
    if (!sender) sender = 'Phật tử';
    const amount = Number(coins) || 0;
    const existing = donorMap.get(sender) || 0;
    const newTotal = existing + amount;
    donorMap.set(sender, newTotal);

    totalCoins += amount;
    safeText(totalCoinsCount, totalCoins.toLocaleString('vi-VN'));

    if (newTotal > currentTopDonor.coins) {
      currentTopDonor = { name: sender, coins: newTotal };
      safeText(topDonorName, sender);
      safeText(topDonorCoins, newTotal.toLocaleString('vi-VN'));
    }

    updateLeaderboardUI();
  }

  function updateLeaderboardUI() {
    const boardList = document.getElementById('boardDonorList') || document.querySelector('.board-donor-list');
    if (!boardList) return;
    const sorted = Array.from(donorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const rankIcons = ['①', '②', '③', '④'];
    boardList.innerHTML = sorted.map((item, idx) => `
      <li><span class="rank">${rankIcons[idx] || (idx + 1)}</span> <span class="d-name">${escapeHtml(item[0])}</span> <span class="d-coins">${item[1].toLocaleString('vi-VN')}</span></li>
    `).join('');
  }

  // Đồng bộ hóa danh sách Top Hảo Tâm & Hàng Ghế VIP từ WebSocket thực tế
  function updateTopDonorsUI(topDonors) {
    if (!topDonors || !Array.isArray(topDonors)) return;

    if (topDonors.length > 0) {
      const top1 = topDonors[0];
      currentTopDonor = { name: top1.name, coins: top1.coins };
      safeText(topDonorName, top1.name);
      safeText(topDonorCoins, Number(top1.coins).toLocaleString('vi-VN'));

      const boardList = document.getElementById('boardDonorList') || document.querySelector('.board-donor-list');
      if (boardList) {
        const rankIcons = ['①', '②', '③', '④'];
        boardList.innerHTML = topDonors.slice(0, 4).map((d, idx) => `
          <li><span class="rank">${rankIcons[idx] || (idx + 1)}</span> <span class="d-name">${escapeHtml(d.name)}</span> <span class="d-coins">${Number(d.coins).toLocaleString('vi-VN')}</span></li>
        `).join('');
      }

      // Cập nhật lại hàng ghế VIP Thượng Điện bằng danh sách người thật
      renderVipTerrace(topDonors);
    } else {
      currentTopDonor = { name: 'Chờ thí chủ...', coins: 0 };
      safeText(topDonorName, 'Chờ thí chủ...');
      safeText(topDonorCoins, '0');
      const boardList = document.getElementById('boardDonorList') || document.querySelector('.board-donor-list');
      if (boardList) {
        boardList.innerHTML = `<li style="justify-content:center;color:#bcaaa4;font-style:italic">Tâm thành cúng dường Tam Bảo 🙏</li>`;
      }
      renderVipTerrace([]);
    }
  }

  // Kiểm tra URL nếu có ?obs=1 hoặc ?stream=1 thì tự động vào chế độ Stream Only
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('obs') === '1' || urlParams.get('stream') === '1') {
    document.body.classList.add('obs-stream-only');
  }

  // ========================================================
  // 1. SPRITE ASSETS PRELOAD & CÁC TƯ THẾ LẠY TAM BÁI
  // ========================================================
  const ASSETS_PATH = (window.location.pathname.includes('/demo-longnh/') || window.location.href.includes('demo-longnh'))
    ? '../public/assets/'
    : 'assets/';

  const SPRITE_FRAMES = {
    walk1: ASSETS_PATH + 'devotee_walk.png',
    walk2: ASSETS_PATH + 'devotee_walk_2.png',
    kneelDown: ASSETS_PATH + 'devotee_kneel_down.png',
    kneel: ASSETS_PATH + 'devotee.png',
    forehead: ASSETS_PATH + 'devotee_bow.png',
    bowMid: ASSETS_PATH + 'devotee_bow_mid.png',
    prostrate: ASSETS_PATH + 'devotee_prostrate.png',
    prostrateDeep: ASSETS_PATH + 'devotee_prostrate_deep.png'
  };
  Object.values(SPRITE_FRAMES).forEach(url => {
    const img = new Image();
    img.src = url;
  });

  let centralTimers = [];
  function clearCentralTimers() {
    while (centralTimers.length > 0) {
      clearTimeout(centralTimers.pop());
    }
  }

  function setCentralPose(poseKey) {
    const stack = document.getElementById('centralSpriteStack');
    if (!stack) return;
    const frames = stack.querySelectorAll('.pose-frame');
    frames.forEach(img => {
      img.classList.toggle('active', img.getAttribute('data-pose') === poseKey);
    });
  }

  function scheduleCentralPose(delayMs, poseKey) {
    centralTimers.push(setTimeout(() => {
      setCentralPose(poseKey);
    }, delayMs));
  }

  // Chuỗi 8 tư thế Lạy Phật Tam Bái ngũ thể đầu địa (Hạ gối -> Trán -> Gập 45° -> Chống tay -> Lạy sát đất -> Ngẩng lên)
  function playThreeBowsSequence(startDelayMs = 0) {
    scheduleCentralPose(startDelayMs, 'kneelDown');
    scheduleCentralPose(startDelayMs + 180, 'kneel');

    const bowIntervals = [startDelayMs + 350, startDelayMs + 1900, startDelayMs + 3450];
    bowIntervals.forEach((t0) => {
      scheduleCentralPose(t0, 'forehead');            // 1. Chắp tay đưa lên trán
      scheduleCentralPose(t0 + 180, 'bowMid');        // 2. Cúi gập lưng 45 độ
      scheduleCentralPose(t0 + 360, 'prostrate');     // 3. Vươn hai tay chống xuống đệm
      scheduleCentralPose(t0 + 540, 'prostrateDeep'); // 4. Lạy sát đất (Ngũ thể đầu địa)
      scheduleCentralPose(t0 + 920, 'prostrate');     // 5. Bắt đầu nâng đầu lên
      scheduleCentralPose(t0 + 1100, 'bowMid');       // 6. Nâng lưng lên 45 độ
      scheduleCentralPose(t0 + 1280, 'kneel');        // 7. Quỳ thẳng lưng niệm Phật

      // Đợt sóng lạy của hội chúng hai bên hưởng ứng
      centralTimers.push(setTimeout(() => {
        playWoodblockSound();
        triggerCongregationWave();
      }, t0 + 540));
    });

    scheduleCentralPose(startDelayMs + 4950, 'forehead');
    scheduleCentralPose(startDelayMs + 5500, 'kneel');
  }

  function updateCentralWorshipper(user, avatar, actionLabel, wish) {
    const centralName = document.getElementById('centralName');
    const centralAction = document.getElementById('centralAction');
    const centralAvatar = document.getElementById('centralAvatar');
    const centralWishBubble = document.getElementById('centralWishBubble');

    if (centralName) safeText(centralName, user || 'Thí Chủ');
    if (centralAction) safeText(centralAction, actionLabel || '🪔 Dâng hương Tam Bảo');
    if (centralWishBubble) safeText(centralWishBubble, wish ? `🙏 ${wish}` : '🙏 Nam Mô A Di Đà Phật');

    if (centralAvatar) {
      if (avatar) {
        centralAvatar.innerHTML = `<img src="${escapeHtml(avatar)}" alt="" onerror="this.parentElement.textContent='🙏'" />`;
      } else {
        centralAvatar.textContent = '🙏';
      }
    }
  }

  // Tín đồ bước đi trên thảm đỏ tiến lên Tam Bảo rồi Lạy Tam Bái
  function animateWalkerOnCarpet(user, avatar, actionLabel, wish) {
    const centralEl = document.getElementById('centralWorshipper');
    if (!centralEl) return;

    clearCentralTimers();
    updateCentralWorshipper(user, avatar, actionLabel, wish);

    centralEl.classList.remove('walking-up');
    void centralEl.offsetWidth; // Force reflow
    centralEl.classList.add('walking-up');

    // Chuyển pose bước đi chân bước luân phiên
    setCentralPose('walk1');
    for (let step = 1; step <= 10; step++) {
      scheduleCentralPose(step * 190, step % 2 === 0 ? 'walk1' : 'walk2');
    }

    // Khi bước tới trước Lư Hương Tam Bảo (2.1s): dừng bước, hạ gối và lạy 3 lạy
    centralTimers.push(setTimeout(() => {
      centralEl.classList.remove('walking-up');
    }, 2100));

    playThreeBowsSequence(2050);
  }

  // ========================================================
  // ANIMATION LẠY PHẬT CHÂN THỰC BẰNG SPRITE KHUNG HÌNH (NGŨ THỂ ĐẦU ĐỊA)
  // ========================================================
  /**
   * Cúi lạy hoặc dập đầu Ngũ Thể Đầu Địa bằng việc đổi frame sprite 3D chân thực
   * Không dùng co kéo scale dọc gây méo mó hình
   */
  /**
   * Cúi lạy hoặc dập đầu Ngũ Thể Đầu Địa bằng hiệu ứng giải phẫu học mượt mà
   * Bảo toàn 100% màu áo và kiểu tóc đặc trưng của từng Cư sĩ Nam / Nữ
   */
  function bowDevotee(img, delayMs = 0, isDeep = true) {
    if (!img || img._isBowing) return;
    img._isBowing = true;

    setTimeout(() => {
      img.classList.add('is-bowing-mid');

      setTimeout(() => {
        if (isDeep) {
          // Lạy dập đầu Ngũ Thể Đầu Địa sát đệm
          img.classList.remove('is-bowing-mid');
          img.classList.add('is-bowing-prostrate');

          setTimeout(() => {
            img.classList.remove('is-bowing-prostrate');
            img.classList.add('is-bowing-mid');

            setTimeout(() => {
              img.classList.remove('is-bowing-mid');
              img._isBowing = false;
            }, 280);
          }, 600);
        } else {
          // Cúi đầu niệm Phật trang nghiêm
          setTimeout(() => {
            img.classList.remove('is-bowing-mid');
            img._isBowing = false;
          }, 420);
        }
      }, 180);
    }, delayMs);
  }

  // Đợt sóng cúi lạy của toàn bộ đại chúng trong đạo tràng
  function triggerCongregationWave() {
    const devotees = document.querySelectorAll('.hex-devotee-sprite');
    devotees.forEach((img, idx) => {
      const delay = (idx % 6) * 90 + Math.floor(Math.random() * 60);
      bowDevotee(img, delay, true);
    });
  }

  // Vòng lặp tự nhiên khi rảnh: Cứ mỗi 4.2s có 2-4 Phật tử ngẫu nhiên cúi lạy niệm Phật
  let idleDevotionInterval = null;
  function startIdleDevotionLoop() {
    if (idleDevotionInterval) clearInterval(idleDevotionInterval);
    idleDevotionInterval = setInterval(() => {
      const allSprites = Array.from(document.querySelectorAll('.hex-devotee-sprite'));
      if (allSprites.length === 0) return;

      const candidates = allSprites.filter(img => !img._isBowing);
      if (candidates.length === 0) return;

      const count = Math.min(candidates.length, 2 + Math.floor(Math.random() * 3));
      for (let i = 0; i < count; i++) {
        const randIdx = Math.floor(Math.random() * candidates.length);
        const chosen = candidates.splice(randIdx, 1)[0];
        if (chosen) {
          const delay = Math.floor(Math.random() * 350);
          const isDeep = Math.random() > 0.45;
          bowDevotee(chosen, delay, isDeep);
        }
      }
    }, 4200);
  }

  // ========================================================
  // 2. RENDER HÀNG GHẾ VIP & CẬP NHẬT TOP CÔNG ĐỨC
  // Không vẽ các ô chữ nhật tĩnh thô kệch che bàn thờ
  // ========================================================
  let currentVipDonors = [];

  function renderVipTerrace(dynamicList) {
    if (dynamicList && Array.isArray(dynamicList)) {
      currentVipDonors = dynamicList;
    }
    // Gỡ bỏ class VIP cũ
    document.querySelectorAll('.hex-devotee-slot.is-vip').forEach(el => el.classList.remove('is-vip'));

    // Gán vương miện hoàng kim 👑 cho các vị trí Top Thí Chủ trong Đạo Tràng Tổ Ong
    if (currentVipDonors && currentVipDonors.length > 0) {
      currentVipDonors.slice(0, 4).forEach(d => {
        if (d && d.name && d.coins > 0) {
          const devotee = getOrCreateRealDevotee(d.userId || d.name, d.name, d.avatar || '');
          if (devotee && devotee.element) {
            devotee.element.classList.add('is-vip');
          }
        }
      });
    }
  }

  // ========================================================
  // 3. ĐẠO TRÀNG LƯỚI TỔ ONG (HEXAGONAL STAGGERED GRID)
  // KHÔNG HIỆN VIỀN Ô KHI TRỐNG - NGỒI RANDOM Ô KHÔNG ĐÈ NHAU
  // ĐA DẠNG HÓA GIỚI TÍNH (NAM/NỮ) VÀ 6 BỘ TRANG PHỤC THỰC TẾ
  // ========================================================
  const NFT_OUTFITS = [
    { id: 'lam', name: 'Áo Lam Cư Sĩ', badge: '🪷' },
    { id: 'nau', name: 'Áo Nâu Sồng', badge: '🪵' },
    { id: 'vang', name: 'Áo Tràng Sa Môn', badge: '📿' },
    { id: 'trang', name: 'Bạch Y Tịnh Độ', badge: '✨' },
    { id: 'ngoc', name: 'Áo Lam Ngọc Bích', badge: '💎' },
    { id: 'hoang_kim', name: 'Gấm Vàng Hoàng Kim', badge: '👑' }
  ];

  const NFT_ACCESSORIES = [
    { name: 'Tràng hạt 108', icon: '📿' },
    { name: 'Vòng bồ đề đỏ', icon: '🔴' },
    { name: 'Khăn lam sen', icon: '🧣' },
    { name: 'Đóa sen hồng', icon: '🌸' },
    { name: 'Hào quang tịnh', icon: '💫' }
  ];

  function hashString(str) {
    let hash = 0;
    if (!str) return 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function generateDevoteeTraits(uniqueKey) {
    const k = String(uniqueKey || '').toLowerCase();
    const hash = hashString(uniqueKey || 'phat_tu');

    // Phân định Nam / Nữ: Tự động nhận diện từ khóa hoặc băm 50/50 ngẫu nhiên
    let isMale = (hash % 2 === 1);
    if (k.includes('nam') || k.includes('ong') || k.includes('chu') || k.includes('anh') || k.includes('boy') || k.includes('male')) {
      isMale = true;
    } else if (k.includes('nu') || k.includes('ba') || k.includes('co') || k.includes('chi') || k.includes('girl') || k.includes('female')) {
      isMale = false;
    }

    const genderKey = isMale ? 'male' : 'female';
    const gender = isMale ? 'Cư sĩ Nam' : 'Cư sĩ Nữ';

    // Chọn bộ trang phục: Ưu tiên nếu có chỉ định, không thì băm xoay vòng 6 bộ
    let outfit = NFT_OUTFITS[hash % NFT_OUTFITS.length];
    for (const ot of NFT_OUTFITS) {
      if (k.includes(`_${ot.id}`) || k.includes(ot.id)) {
        outfit = ot;
        break;
      }
    }

    const accessory = NFT_ACCESSORIES[(hash >> 3) % NFT_ACCESSORIES.length];
    const spriteSrc = `${ASSETS_PATH}devotee_${genderKey}_${outfit.id}.png`;

    return {
      gender,
      genderKey,
      outfit,
      accessory,
      spriteSrc,
      rankTitle: `Cấp ${(hash % 5) + 1}`
    };
  }

  const allHexSeats = [];
  const TOTAL_HEX_ROWS = 8;

  function initHexagonalGrid() {
    allHexSeats.length = 0;
    const yStart = 53.0; // Phía trước bàn thờ
    const yEnd = 85.5;   // Phía trên banner đáy
    const yStep = (yEnd - yStart) / (TOTAL_HEX_ROWS - 1);

    for (let r = 0; r < TOTAL_HEX_ROWS; r++) {
      const y = yStart + r * yStep;
      const scale = Number((0.74 + (r / (TOTAL_HEX_ROWS - 1)) * 0.32).toFixed(3));
      const zIndex = 10 + r * 2;
      const isEven = (r % 2 === 0);

      // Cánh Tả (Bên Trái thảm đỏ): X từ 4.5% đến 37%
      const leftXs = isEven ? [4.5, 12.5, 20.5, 28.5, 36.5] : [8.5, 16.5, 24.5, 32.5];
      leftXs.forEach((x, c) => {
        allHexSeats.push({
          id: `hex-L-r${r}-c${c}`,
          side: 'L',
          row: r,
          col: c,
          x,
          y: Number(y.toFixed(2)),
          scale,
          zIndex,
          occupied: false,
          devoteeId: null
        });
      });

      // Cánh Hữu (Bên Phải thảm đỏ): X từ 63% đến 95.5%
      const rightXs = isEven ? [63.5, 71.5, 79.5, 87.5, 95.5] : [67.5, 75.5, 83.5, 91.5];
      rightXs.forEach((x, c) => {
        allHexSeats.push({
          id: `hex-R-r${r}-c${c}`,
          side: 'R',
          row: r,
          col: c,
          x,
          y: Number(y.toFixed(2)),
          scale,
          zIndex,
          occupied: false,
          devoteeId: null
        });
      });
    }
  }

  const MAX_DISPLAY_DEVOTEES = 800; // Tối đa 800 Phật tử thật
  const realDevoteeMap = new Map(); // key: cleanUserId -> DevoteeObj
  const realDevoteeOrder = []; // FIFO array

  function renderCongregation() {
    if (!congregationGrid) return;
    congregationGrid.innerHTML = '';
    initHexagonalGrid();
    realDevoteeMap.clear();
    realDevoteeOrder.length = 0;

    // Khởi tạo các vị Cư sĩ Nam & Nữ ban đầu đại diện cho Đạo Tràng Tổ Ong (trải đều 12 bộ đồ Nam/Nữ sắc nét)
    const SEED_DEVOTEES = [
      { id: 'seed_nam_lam', name: 'Phúc Thiện', isMale: true, outfit: 'lam' },
      { id: 'seed_nu_lam', name: 'Diệu Tâm', isMale: false, outfit: 'lam' },
      { id: 'seed_nam_nau', name: 'Minh Tuệ', isMale: true, outfit: 'nau' },
      { id: 'seed_nu_nau', name: 'Thanh Nhã', isMale: false, outfit: 'nau' },
      { id: 'seed_nam_vang', name: 'Trí Dũng', isMale: true, outfit: 'vang' },
      { id: 'seed_nu_vang', name: 'Bảo An', isMale: false, outfit: 'vang' },
      { id: 'seed_nam_trang', name: 'Quang Minh', isMale: true, outfit: 'trang' },
      { id: 'seed_nu_trang', name: 'Bạch Liên', isMale: false, outfit: 'trang' },
      { id: 'seed_nam_ngoc', name: 'Vạn Hạnh', isMale: true, outfit: 'ngoc' },
      { id: 'seed_nu_ngoc', name: 'Diệu Âm', isMale: false, outfit: 'ngoc' },
      { id: 'seed_nam_hoang_kim', name: 'Chân Như', isMale: true, outfit: 'hoang_kim' },
      { id: 'seed_nu_hoang_kim', name: 'Diệu Thiện', isMale: false, outfit: 'hoang_kim' },
      { id: 'seed_nam_lam2', name: 'Đức Trí', isMale: true, outfit: 'lam' },
      { id: 'seed_nu_lam2', name: 'Huệ Năng', isMale: false, outfit: 'lam' }
    ];

    SEED_DEVOTEES.forEach(seed => {
      getOrCreateRealDevotee(seed.id, seed.name, '');
    });
  }

  /**
   * Đăng ký hoặc lấy vị trí bồ đoàn của Phật tử THẬT trong Lưới Tổ Ong
   * Ngồi random ô trống, tuyệt đối không đè lên nhau
   */
  function getOrCreateRealDevotee(userId, name, avatar = '') {
    if (!userId) userId = name || 'an_danh';
    const cleanId = String(userId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');

    if (realDevoteeMap.has(cleanId)) {
      const existing = realDevoteeMap.get(cleanId);
      existing.lastActive = Date.now();
      if (name && existing.name !== name) {
        existing.name = name;
        const nameEl = document.querySelector(`#${existing.slotId} .user-display-name`);
        if (nameEl) nameEl.textContent = name;
      }
      if (avatar && !existing.avatar) {
        existing.avatar = avatar;
        const avatarEl = document.querySelector(`#${existing.slotId} .devotee-avatar-badge img`);
        if (avatarEl) avatarEl.src = avatar;
      }
      return existing;
    }

    if (allHexSeats.length === 0) {
      initHexagonalGrid();
    }

    // 1. Tìm ô trống trong lưới tổ ong
    const emptySeats = allHexSeats.filter(s => !s.occupied);
    let assignedSeat = null;

    if (emptySeats.length > 0) {
      // Chọn RANDOM ô trống trong các ô tổ ong chưa có người ngồi
      const randIdx = Math.floor(Math.random() * emptySeats.length);
      assignedSeat = emptySeats[randIdx];
    } else {
      // Nếu đã kín hết các ô tổ ong: FIFO gỡ người vào sớm nhất
      const oldestId = realDevoteeOrder.shift();
      const oldest = realDevoteeMap.get(oldestId);
      if (oldest && oldest.seat) {
        assignedSeat = oldest.seat;
        assignedSeat.occupied = false;
        assignedSeat.devoteeId = null;
        if (oldest.element) {
          oldest.element.classList.add('fade-out');
          setTimeout(() => { if (oldest.element && oldest.element.parentNode) oldest.element.remove(); }, 380);
        }
        realDevoteeMap.delete(oldestId);
      }
    }

    if (!assignedSeat) {
      assignedSeat = allHexSeats[Math.floor(Math.random() * allHexSeats.length)];
    }

    assignedSeat.occupied = true;
    assignedSeat.devoteeId = cleanId;

    const traits = generateDevoteeTraits(cleanId);
    const slotId = `devotee-slot-${cleanId}`;

    const slot = document.createElement('div');
    slot.className = 'hex-devotee-slot fade-in';
    slot.id = slotId;
    slot.setAttribute('data-userid', cleanId);
    slot.style.left = `${assignedSeat.x}%`;
    slot.style.top = `${assignedSeat.y}%`;
    slot.style.zIndex = assignedSeat.zIndex;
    slot.style.setProperty('--hex-scale', assignedSeat.scale);
    slot.style.transform = `scale(${assignedSeat.scale})`;

    const delay = (Math.random() * 3.5).toFixed(2);
    const dur = (3.0 + Math.random() * 1.2).toFixed(2);
    const breatheHeight = (-(1.2 + Math.random() * 0.8)).toFixed(1);

    const avatarMarkup = avatar 
      ? `<div class="devotee-avatar-badge" title="${escapeHtml(name)}"><img src="${escapeHtml(avatar)}" onerror="this.parentNode.innerHTML='${traits.accessory.icon}'" alt="" /></div>`
      : `<div class="devotee-avatar-badge" title="${escapeHtml(name)}">${traits.accessory.icon}</div>`;

    slot.innerHTML = `
      ${avatarMarkup}
      <img class="hex-devotee-sprite" id="sprite-${cleanId}" src="${traits.spriteSrc}" alt="${escapeHtml(name)}" style="animation-delay: -${delay}s; animation-duration: ${dur}s; --breathe-h: ${breatheHeight}px" />
      <div class="hex-cushion"></div>
      <span class="hex-name-tag" title="${escapeHtml(name)} (${traits.gender} • ${traits.outfit.name})">
        <span class="nft-accessory-icon">${traits.outfit.badge}</span>
        <span class="user-display-name">${escapeHtml(name)}</span>
      </span>
    `;

    congregationGrid.appendChild(slot);

    const devotee = {
      userId: cleanId,
      name: name || 'Phật tử',
      avatar,
      traits,
      slotId,
      seat: assignedSeat,
      element: slot,
      joinedAt: Date.now(),
      lastActive: Date.now()
    };

    realDevoteeMap.set(cleanId, devotee);
    realDevoteeOrder.push(cleanId);

    return devotee;
  }

  // ========================================================
  // 4. HIỂN THỊ BONG BÓNG LỜI KHẤN THỜI GIAN THỰC (NEO CHÍNH XÁC VÀO ĐẦU PHẬT TỬ)
  // ========================================================
  function showPrayerBubble(text, seatElement, avatar = '', sender = '', userId = '') {
    if (!streamFrame || !streamSpeechLayer || !text) return;

    // Định vị chính xác chỗ ngồi của Phật tử nếu chưa được chỉ định
    if (!seatElement) {
      if (userId || sender) {
        const devotee = getOrCreateRealDevotee(userId || sender, sender || 'Phật tử', avatar);
        if (devotee && devotee.slotId) {
          seatElement = document.getElementById(devotee.slotId);
        }
      }

      // Fallback nếu không xác định được người cụ thể
      if (!seatElement) {
        const centralWorshipper = document.getElementById('centralWorshipper');
        if (centralWorshipper && Math.random() < 0.3) {
          seatElement = centralWorshipper;
        } else {
          const allSlots = document.querySelectorAll('.hex-devotee-slot');
          if (allSlots.length > 0) {
            seatElement = allSlots[Math.floor(Math.random() * allSlots.length)];
          }
        }
      }
    }
    if (!seatElement) return;

    // Kích hoạt Phật tử này cúi đầu niệm Phật cùng lúc khi chat
    const spriteImg = seatElement.querySelector('.hex-devotee-sprite');
    if (spriteImg) {
      bowDevotee(spriteImg, 0, false);
    }

    const rect = seatElement.getBoundingClientRect();
    const frameRect = streamFrame.getBoundingClientRect();

    // Neo chính giữa đỉnh đầu của bồ đoàn / Phật tử đó
    const posX = Math.max(75, Math.min(frameRect.width - 75, rect.left - frameRect.left + rect.width / 2));
    const posY = Math.max(25, rect.top - frameRect.top - 10);

    const bubble = document.createElement('div');
    bubble.className = 'prayer-pop-bubble';
    bubble.id = `bubble-${speechBubbleId++}`;
    bubble.style.left = `${posX}px`;
    bubble.style.top = `${posY}px`;

    const avatarHtml = avatar 
      ? `<img src="${escapeHtml(avatar)}" class="bubble-avatar-img" onerror="this.style.display='none'" alt="" />`
      : `<span style="font-size: 14px;">🪷</span>`;

    const senderHtml = sender ? `<span class="bubble-sender">${escapeHtml(sender)}</span>` : '';

    bubble.innerHTML = `
      ${avatarHtml}
      <div class="bubble-body">
        ${senderHtml}
        <span class="bubble-text">${escapeHtml(text)}</span>
      </div>
    `;

    streamSpeechLayer.appendChild(bubble);

    setTimeout(() => {
      if (bubble && bubble.parentNode) bubble.remove();
    }, 4500);
  }

  // ========================================================
  // 3. CANVAS HẠT KHÓI TRẦM & HOA SEN RƠI
  // ========================================================
  let ctx = null;
  if (effectsCanvas) {
    ctx = effectsCanvas.getContext('2d');
  }

  function resizeCanvas() {
    if (!effectsCanvas || !streamFrame) return;
    effectsCanvas.width = streamFrame.clientWidth;
    effectsCanvas.height = streamFrame.clientHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const smokeList = [];
  const petalList = [];

  function addSmokeParticle() {
    if (!effectsCanvas) return;
    const originX = effectsCanvas.width * 0.5;
    const originY = effectsCanvas.height * 0.51;
    smokeList.push({
      x: originX + (Math.random() - 0.5) * 8,
      y: originY,
      radius: 3 + Math.random() * 4,
      alpha: 0.55,
      speedY: 0.9 + Math.random() * 0.9,
      drift: (Math.random() - 0.5) * 0.4,
      angle: Math.random() * 6.28
    });
  }

  function addLotusPetal() {
    if (!effectsCanvas) return;
    petalList.push({
      x: Math.random() * effectsCanvas.width,
      y: -20,
      size: 10 + Math.random() * 10,
      speedY: 0.8 + Math.random() * 1.2,
      speedX: Math.sin(Math.random() * 6.28) * 0.8,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 2.5
    });
  }

  function renderEffects() {
    if (!ctx || !effectsCanvas) return;
    ctx.clearRect(0, 0, effectsCanvas.width, effectsCanvas.height);

    // Khói trầm
    if (smokeList.length < 50) addSmokeParticle();
    for (let i = smokeList.length - 1; i >= 0; i--) {
      const p = smokeList[i];
      p.y -= p.speedY;
      p.x += Math.sin(p.angle) * 0.4 + p.drift;
      p.angle += 0.03;
      p.radius += 0.08;
      p.alpha -= 0.0035;

      if (p.alpha <= 0 || p.y < 0) {
        smokeList.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      const grad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.1, p.x, p.y, p.radius);
      grad.addColorStop(0, `rgba(255, 240, 200, ${p.alpha * 0.7})`);
      grad.addColorStop(1, 'rgba(200, 180, 150, 0)');
      ctx.fillStyle = grad;
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Cánh sen
    if (petalList.length < 25 && Math.random() < 0.1) addLotusPetal();
    for (let i = petalList.length - 1; i >= 0; i--) {
      const pt = petalList[i];
      pt.y += pt.speedY;
      pt.x += pt.speedX;
      pt.rotation += pt.rotSpeed;

      if (pt.y > effectsCanvas.height + 25) {
        petalList.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate((pt.rotation * Math.PI) / 180);
      ctx.font = `${pt.size}px serif`;
      ctx.fillText('🌸', -pt.size / 2, pt.size / 2);
      ctx.restore();
    }

    requestAnimationFrame(renderEffects);
  }

  // ========================================================
  // 4. BỘ PHÁT NHẠC TỤNG KINH TRÌ CHÚ & HIỆU ỨNG CHÙA
  // ========================================================
  function initAudioContext() {
    if (!audioCtx) {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    isSoundActive = true;
    startChantingBgm();
  }

  // Phát nhạc tụng kinh nền liên tục (Chú Đại Bi, Niệm Phật A Di Đà, Om Mani...)
  function startChantingBgm() {
    if (!isBgmEnabled) return;
    try {
      if (!bgmAudio) {
        bgmAudio = new Audio(`${ASSETS_PATH}audio/${currentBgmTrack}`);
        bgmAudio.loop = true;
      }
      bgmAudio.volume = isBgmEnabled ? bgmVolume : 0;
      const playPromise = bgmAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.log('[BGM] Chờ tương tác người dùng để phát audio:', e.message);
        });
      }
    } catch (e) {
      console.warn('[BGM Lỗi]:', e.message);
    }
  }

  // Chuyển bài kinh / thần chú nền
  function changeBgmTrack(newTrack) {
    if (!newTrack) return;
    currentBgmTrack = newTrack;
    if (bgmAudio) {
      const wasPlaying = !bgmAudio.paused;
      bgmAudio.pause();
      bgmAudio.src = `${ASSETS_PATH}audio/${newTrack}`;
      bgmAudio.currentTime = 0;
      bgmAudio.loop = true;
      bgmAudio.volume = isBgmEnabled ? bgmVolume : 0;
      if (wasPlaying || isBgmEnabled) {
        bgmAudio.play().catch(e => console.log('[BGM Switch]:', e.message));
      }
    } else if (isBgmEnabled) {
      startChantingBgm();
    }
  }

  // Tiếng Đại Hồng Chung
  function playBellSound() {
    if (!isSoundActive && !audioCtx) initAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    [130.8, 261.6, 523.2, 784.8, 1046.5].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.998, now + 5.2);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime([0.7, 0.5, 0.35, 0.2, 0.1][idx] * bgmVolume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 5.6);
    });

    if (btnClickBell) {
      btnClickBell.style.transform = 'scale(1.2) rotate(5deg)';
      setTimeout(() => { if (btnClickBell) btnClickBell.style.transform = ''; }, 300);
    }
  }

  // Tiếng Mõ Gia Trì
  function playWoodblockSound() {
    if (!isSoundActive && !audioCtx) initAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.12);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(580, now);
    filter.Q.setValueAtTime(4.5, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.85 * bgmVolume, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.15);

    woodblockHits++;
    safeText(woodblockHitCount, woodblockHits.toLocaleString('vi-VN'));

    if (btnClickWoodblock) {
      btnClickWoodblock.style.transform = 'scale(1.15) translateY(2px)';
      setTimeout(() => { if (btnClickWoodblock) btnClickWoodblock.style.transform = ''; }, 150);
    }
  }

  // Tiếng Lắc Thẻ Xăm Tre
  function playBambooSticksSound() {
    if (!isSoundActive && !audioCtx) initAudioContext();
    if (!audioCtx) return;

    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(850 + Math.random() * 200, now);
        gain.gain.setValueAtTime(0.25 * bgmVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      }, i * 90);
    }
  }

  // AI Voice xướng Lời Khấn / Sớ: VieNeu-TTS Nam Chuẩn (Thanh Bình) 48kHz
  async function speakVoice(text) {
    if (!isVoiceEnabled || !text) return;

    // Hủy request fetch đang chờ nếu có
    if (currentTtsAbortController) {
      try {
        currentTtsAbortController.abort();
      } catch (e) {}
      currentTtsAbortController = null;
    }

    // Ngắt và giải phóng âm thanh đang phát dở nếu có
    if (currentTtsAudio) {
      try {
        currentTtsAudio.pause();
        currentTtsAudio = null;
      } catch (e) {}
    }
    if (currentTtsUrl) {
      try {
        URL.revokeObjectURL(currentTtsUrl);
      } catch (e) {}
      currentTtsUrl = null;
    }

    // 1. Ưu tiên VieNeu-TTS Engine (Giọng Nam Chuẩn Hà Nội Thanh Bình)
    const controller = new AbortController();
    currentTtsAbortController = controller;

    try {
      const res = await fetch(`/api/tts?text=${encodeURIComponent(text)}`, {
        signal: controller.signal
      });

      if (controller.signal.aborted || currentTtsAbortController !== controller) {
        return;
      }

      if (res.ok) {
        const blob = await res.blob();
        if (controller.signal.aborted || currentTtsAbortController !== controller) {
          return;
        }

        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.volume = voiceVolume;
        currentTtsAudio = audio;
        currentTtsUrl = audioUrl;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          if (currentTtsAudio === audio) currentTtsAudio = null;
          if (currentTtsUrl === audioUrl) currentTtsUrl = null;
        };
        await audio.play();
        return;
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      // Fallback sang Web Speech API nếu chạy web tĩnh standalone
    } finally {
      if (currentTtsAbortController === controller) {
        currentTtsAbortController = null;
      }
    }

    // 2. Fallback sang Web Speech API trình duyệt
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.volume = voiceVolume;
      utterance.pitch = 0.85; // Giọng nam trầm ấm
      utterance.rate = 0.88;

      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(v => (v.lang.includes('vi') || v.lang.includes('VN')) && (v.name.toLowerCase().includes('nam') || v.name.toLowerCase().includes('male')));
      if (viVoice) {
        utterance.voice = viVoice;
      } else {
        const fallbackVi = voices.find(v => v.lang.includes('vi') || v.lang.includes('VN'));
        if (fallbackVi) utterance.voice = fallbackVi;
      }

      window.speechSynthesis.speak(utterance);
    }
  }

  // ========================================================
  // 5. CÁC TÁC VỤ KÍCH HOẠT RPC
  // ========================================================
  function triggerIncenseAction(sender, prayer, coins = 1, avatar = '') {
    playBellSound();
    recordDonation(sender, coins);
    totalIncense += 3;
    safeText(totalIncenseCount, totalIncense.toLocaleString('vi-VN'));
    showPrayerBubble(prayer || 'Thành tâm thắp 3 nén tâm hương cúng dường Tam Bảo 🙏', null, avatar, sender);
    safeText(marqueeText, `🪔 Thí chủ ${sender} vừa phát tâm thắp 3 nén hương cúng dường Tam Bảo`);
    animateWalkerOnCarpet(sender, avatar, '🪔 Thắp 3 nén hương Tam Bảo', prayer || 'Cầu gia đạo bình an, sở cầu như ý');
    speakVoice(`Thiện nam tín nữ ${sender} thành tâm thắp nén tâm hương cúng dường Tam Bảo`);
  }

  function triggerLanternAction(sender, prayer, coins = 50, avatar = '') {
    playBellSound();
    recordDonation(sender, coins);
    showPrayerBubble('🏮 Cầu bình an, thả hoa đăng lung linh cầu nguyện', null, avatar, sender);
    safeText(marqueeText, `🏮 Thí chủ ${sender} dâng đèn hoa đăng cầu gia đạo bình an`);
    animateWalkerOnCarpet(sender, avatar, '🏮 Thả đèn hoa đăng cầu an', prayer || 'Cầu phúc lộc dồi dào, gia quyến an khang');
    speakVoice(`Nguyện cầu hoa đăng tỏa sáng, gia quyến Phật tử ${sender} bình an vạn sự`);
  }

  function triggerWoodblockAction(sender, count = 5, avatar = '') {
    woodblockHits += count;
    safeText(woodblockHitCount, woodblockHits.toLocaleString('vi-VN'));
    for (let i = 0; i < count; i++) {
      setTimeout(playWoodblockSound, i * 220);
    }
    showPrayerBubble(`Nam Mô A Di Đà Phật (${count} tiếng mõ)`, null, avatar, sender);
    triggerCongregationWave();
  }

  function triggerBellAction(sender, avatar = '') {
    playBellSound();
    showPrayerBubble('Thỉnh Đại Hồng Chung ngân vang thanh tịnh', null, avatar, sender);
    triggerCongregationWave();
  }

  const FORTUNES_DATA = [
    { num: 1, title: 'THƯỢNG THƯỢNG CÁT', poem: 'Đầu xuân mưa thuận gió êm đềm,\nTrời ban phúc lộc đến thềm nhà xưa.\nMuôn việc hanh thông chẳng quản vừa,\nTâm thành tích đức phúc khôn ngơi.', meaning: 'Cầu tài đại cát, gia đạo an khang. Mọi mong ước nay sắp thành hiện thực.', advice: 'Giữ tâm khiêm tốn, giúp đỡ người nghèo khó để phước báu được lâu dài.' },
    { num: 8, title: 'THƯỢNG CÁT', poem: 'Tâm thành một nén trầm hương dâng,\nPhật chứng lòng son sáng tấc lòng.\nMở lối hanh thông ngàn cánh cửa,\nTiền tài danh vọng sáng rực hồng.', meaning: 'Kinh doanh phát đạt, gia quyến an khang, mọi trắc trở đều tiêu tan.', advice: 'Tạ ơn bề trên, trích phần tài lộc làm việc thiện cứu người.' }
  ];

  function triggerDivinationAction(sender, avatar = '') {
    playBambooSticksSound();
    const f = FORTUNES_DATA[Math.floor(Math.random() * FORTUNES_DATA.length)];
    safeText(marqueeText, `🎋 ${sender} vừa rút: Quẻ số ${f.num} ${f.title}`);
    showPrayerBubble(`Rút Quẻ số ${f.num} ${f.title}`, null, avatar, sender);
    animateWalkerOnCarpet(sender, avatar, `🎋 Xin xăm: Quẻ số ${f.num}`, `Cầu xin quẻ xăm linh ứng`);

    setTimeout(() => {
      safeText(fortuneNum, `QUẺ SỐ 0${f.num}`);
      safeText(fortuneTitle, f.title);
      if (fortunePoem) fortunePoem.innerHTML = f.poem.replace(/\n/g, '<br>');
      safeText(fortuneMeaning, f.meaning);
      safeText(fortuneAdvice, f.advice);
      if (fortuneModal) fortuneModal.classList.add('open');
      playBellSound();
      speakVoice(`Phật Bà Quan Âm ban quẻ: Quẻ số ${f.num} ${f.title}. ${f.meaning}`);
    }, 700);
  }

  function triggerLotusAction(sender, coins = 10, avatar = '') {
    playBellSound();
    recordDonation(sender, coins);
    showPrayerBubble('Dâng đóa hoa sen vàng cúng Phật 🌸', null, avatar, sender);
    safeText(marqueeText, `🌸 Thí chủ ${sender} dâng đóa sen vàng thanh khiết`);
    animateWalkerOnCarpet(sender, avatar, '🌸 Dâng đóa sen hồng Tam Bảo', 'Dâng hoa sen thanh khiết');
  }

  function triggerFruitAction(sender, coins = 30, avatar = '') {
    playBellSound();
    recordDonation(sender, coins);
    showPrayerBubble('Dâng mâm ngũ quả tươi tốt cúng Tam Bảo 🍇🍎', null, avatar, sender);
    safeText(marqueeText, `🍇 Thiện tín ${sender} dâng mâm ngũ quả cúng dường Tam Bảo`);
    animateWalkerOnCarpet(sender, avatar, '🍇 Dâng mâm ngũ quả cúng dường', 'Cúng dường Tam Bảo phước huệ trang nghiêm');
    speakVoice(`Thiện nam tín nữ ${sender} thành kính dâng mâm ngũ quả cúng dường Tam Bảo, phước huệ trang nghiêm!`);
  }

  function triggerDragonCeremony(sender, coins = 500, avatar = '') {
    playBellSound();
    recordDonation(sender, coins);

    // Thả mưa sen nhiều hơn
    for (let i = 0; i < 40; i++) addLotusPetal();

    showPrayerBubble(`🐉 ĐẠI LỄ KIM LONG: Thí chủ ${sender} đại phát tâm bồ đề! 🪷`, null, avatar, sender);
    safeText(marqueeText, `🐉 ĐẠI LỄ KIM LONG CHẦU PHẬT: Thí chủ ${sender} đại cúng dường Tam Bảo!`);
    animateWalkerOnCarpet(sender, avatar, '🐉 Đại Lễ Kim Long Chầu Phật', 'Đại phát tâm bồ đề cúng dường Tam Bảo');

    speakVoice(`Đại lễ Kim Long Chầu Phật! Chúng con xin tán thán đại công đức của thí chủ ${sender}. Nguyện ơn Phật từ bi gia hộ vạn sự cát tường, phước thọ vô biên!`);
  }

  function triggerChantingScripture(sender, prayer) {
    playBellSound();
    for (let i = 0; i < 4; i++) setTimeout(playWoodblockSound, 400 + i * 260);
    showPrayerBubble(`📜 ${sender}: Khấn nguyện hồi hướng công đức`);
    speakVoice(`Nam Mô Bổn Sư Thích Ca Mâu Ni Phật. Trước Tam Bảo uy nghiêm, chúng con xin hồi hướng công đức cho Phật tử ${sender}: ${prayer || 'Gia đạo bình an, tai qua nạn khỏi, vạn sự hanh thông, tiêu tai diệt tội, phước huệ trang nghiêm'}. Nam Mô A Di Đà Phật!`);
  }

  // ========================================================
  // 6. GẮN SỰ KIỆN NÚT BẤM VÀ CÁC ĐIỀU KHIỂN (SAFE DOM GUARDS)
  // ========================================================
  function setupEventListeners() {
    // Nút tương tác trực tiếp trên bàn thờ
    safeOn(btnClickBell, 'click', () => {
      playBellSound();
      showPrayerBubble('🔔 Thỉnh Chuông Ngân Nga');
      sendWsMessage('bell', {});
    });

    safeOn(btnClickWoodblock, 'click', () => {
      woodblockHits += 1;
      safeText(woodblockHitCount, woodblockHits.toLocaleString('vi-VN'));
      playWoodblockSound();
      showPrayerBubble('🪵 Nam Mô A Di Đà Phật');
      sendWsMessage('woodblock', { count: 1 });
    });

    // 1. Nhóm âm thanh bên bảng phải
    safeOn(btnMasterSound, 'click', () => {
      initAudioContext();
      if (btnMasterSound) {
        btnMasterSound.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
        btnMasterSound.textContent = '🔊 Âm Thanh Chùa Đang BẬT';
      }
    });

    safeOn(btnToggleVoice, 'click', () => {
      isVoiceEnabled = !isVoiceEnabled;
      btnToggleVoice.classList.toggle('active', isVoiceEnabled);
      btnToggleVoice.textContent = isVoiceEnabled ? '🎙️ Giọng VieNeu (Thanh Bình): BẬT' : '🎙️ Giọng VieNeu (Thanh Bình): TẮT';
    });

    safeOn(btnToggleBgm, 'click', () => {
      isBgmEnabled = !isBgmEnabled;
      btnToggleBgm.classList.toggle('active', isBgmEnabled);
      btnToggleBgm.textContent = isBgmEnabled ? '🪷 Nhạc Tụng Kinh: BẬT' : '🪷 Nhạc Tụng Kinh: TẮT';
      if (bgmAudio) {
        if (isBgmEnabled) {
          bgmAudio.volume = bgmVolume;
          bgmAudio.play().catch(e => console.log('BGM resume error:', e.message));
        } else {
          bgmAudio.pause();
        }
      } else if (isBgmEnabled) {
        startChantingBgm();
      }
    });

    safeOn(bgmTrackSelect, 'change', e => {
      changeBgmTrack(e.target.value);
    });

    safeOn(bgmVolumeSlider, 'input', e => {
      bgmVolume = e.target.value / 100;
      safeText(bgmValText, `${e.target.value}%`);
      if (bgmAudio) {
        bgmAudio.volume = isBgmEnabled ? bgmVolume : 0;
      }
    });

    safeOn(voiceVolumeSlider, 'input', e => {
      voiceVolume = e.target.value / 100;
      safeText(voiceValText, `${e.target.value}%`);
    });

    // 2. Chế độ OBS Toàn Màn Hình
    safeOn(btnToggleObsMode, 'click', () => {
      document.body.classList.toggle('obs-stream-only');
    });

    // 3. Kết nối TikTok Live
    safeOn(btnConnectTikTok, 'click', async () => {
      const user = inputTikTokUser ? inputTikTokUser.value.trim() : '';
      if (!user) {
        alert('Vui lòng nhập tên kênh TikTok (Ví dụ: @motdoiannhien6788)');
        return;
      }

      if (isTikTokConnected) {
        // Đang kết nối -> Người dùng muốn ngắt kết nối
        btnConnectTikTok.textContent = 'Đang ngắt...';
        btnConnectTikTok.disabled = true;
        try {
          await fetch('/api/tiktok/disconnect', { method: 'POST' });
          isTikTokConnected = false;
          btnConnectTikTok.textContent = 'Kết Nối';
          btnConnectTikTok.style.background = '';
          btnConnectTikTok.disabled = false;
          showPrayerBubble('Đã ngắt kết nối TikTok');
        } catch (e) {
          btnConnectTikTok.disabled = false;
        }
        return;
      }

      // Đang chưa kết nối -> Bắt đầu kết nối
      btnConnectTikTok.textContent = 'Đang kết nối...';
      btnConnectTikTok.disabled = true;
      btnConnectTikTok.style.background = '#d35400';

      try {
        const res = await fetch('/api/tiktok/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user })
        });
        const data = await res.json();
        btnConnectTikTok.disabled = false;

        if (data.success && data.status === 'connected') {
          isTikTokConnected = true;
          const cleanName = String(data.username || user).replace(/^@+/, '');
          btnConnectTikTok.textContent = 'Ngắt Kết Nối';
          btnConnectTikTok.style.background = '#27ae60';
          const streamTikTokName = document.getElementById('streamTikTokName');
          safeText(streamTikTokName, `@${cleanName}`);
          showPrayerBubble(`📡 Đã kết nối phòng Live: @${cleanName}`);
        } else {
          isTikTokConnected = false;
          btnConnectTikTok.textContent = 'Thử Lại';
          btnConnectTikTok.style.background = '#c0392b';
          const cleanUser = String(user).replace(/^@+/, '');
          const errMsg = data.error || 'Không thể kết nối phòng Live';
          showPrayerBubble(`⚠️ ${errMsg}`);
          alert(`[Thông báo kết nối TikTok Live]:\n${errMsg}\n\nLưu ý: Kênh @${cleanUser} cần đang phát trực tiếp (Live) trên TikTok thì hệ thống mới lấy được bình luận và quà tặng.`);
        }
      } catch (err) {
        isTikTokConnected = false;
        btnConnectTikTok.disabled = false;
        btnConnectTikTok.textContent = 'Thử Lại';
        btnConnectTikTok.style.background = '#c0392b';
        showPrayerBubble('⚠️ Lỗi mạng hoặc server không phản hồi');
      }
    });

    safeOn(btnToggleSimulate, 'click', () => {
      isSimulating = !isSimulating;
      btnToggleSimulate.classList.toggle('active', isSimulating);
      btnToggleSimulate.textContent = isSimulating ? '📺 Tự động Giả lập Người Xem: BẬT' : '📺 Tự động Giả lập Người Xem: TẮT';
    });

    const btnResetSession = document.getElementById('btnResetSession');
    safeOn(btnResetSession, 'click', async () => {
      if (confirm('Bạn có muốn làm mới số liệu phiên Live (đưa Hương, Gõ Mõ, CĐ và Top Donate về 0 để bắt đầu phiên mới)?')) {
        sendWsMessage('reset_stats', {});
        try {
          await fetch('/api/stats/reset', { method: 'POST' });
        } catch (e) {}
      }
    });

    // 4. Kích hoạt 8 nút RPC
    safeOn(btnRpcIncense, 'click', () => {
      const sender = (rpcSenderName && rpcSenderName.value) ? rpcSenderName.value : 'Phật tử';
      const prayer = (rpcPrayerText && rpcPrayerText.value) ? rpcPrayerText.value : '';
      triggerIncenseAction(sender, prayer);
    });

    safeOn(btnRpcLantern, 'click', () => {
      const sender = (rpcSenderName && rpcSenderName.value) ? rpcSenderName.value : 'Phật tử';
      const prayer = (rpcPrayerText && rpcPrayerText.value) ? rpcPrayerText.value : '';
      triggerLanternAction(sender, prayer);
    });

    safeOn(btnRpcWoodblock, 'click', () => {
      const sender = (rpcSenderName && rpcSenderName.value) ? rpcSenderName.value : 'Phật tử';
      triggerWoodblockAction(sender, 5);
    });

    safeOn(btnRpcBell, 'click', () => {
      const sender = (rpcSenderName && rpcSenderName.value) ? rpcSenderName.value : 'Phật tử';
      triggerBellAction(sender);
    });

    safeOn(btnRpcDivination, 'click', () => {
      const sender = (rpcSenderName && rpcSenderName.value) ? rpcSenderName.value : 'Phật tử';
      triggerDivinationAction(sender);
    });

    safeOn(btnRpcLotus, 'click', () => {
      const sender = (rpcSenderName && rpcSenderName.value) ? rpcSenderName.value : 'Phật tử';
      triggerLotusAction(sender);
    });

    safeOn(btnRpcDragon, 'click', () => {
      const sender = (rpcSenderName && rpcSenderName.value) ? rpcSenderName.value : 'Phật tử';
      triggerDragonCeremony(sender);
    });

    safeOn(btnRpcChant, 'click', () => {
      const sender = (rpcSenderName && rpcSenderName.value) ? rpcSenderName.value : 'Phật tử';
      const prayer = (rpcPrayerText && rpcPrayerText.value) ? rpcPrayerText.value : '';
      triggerChantingScripture(sender, prayer);
    });

    // Modal đóng
    safeOn(closeFortuneBtn, 'click', () => {
      if (fortuneModal) fortuneModal.classList.remove('open');
    });

    if (fortuneModal) {
      fortuneModal.addEventListener('click', e => {
        if (e.target === fortuneModal) fortuneModal.classList.remove('open');
      });
    }

    // Phím tắt
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'm' || e.key === 'M') {
        playWoodblockSound();
      } else if (e.key === 'b' || e.key === 'B') {
        playBellSound();
      } else if (e.key === 'h' || e.key === 'H') {
        document.body.classList.toggle('obs-stream-only');
      }
    });
  }

  // ========================================================
  // 7. KẾT NỐI WEBSOCKET REALTIME TỚI NODE.JS SERVER
  // ========================================================
  function initWebSocket() {
    if (typeof WebSocket === 'undefined') return;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ Đã kết nối WebSocket tới Server Chùa Online');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleServerBroadcast(payload);
        } catch (err) {
          console.warn('Lỗi đọc gói tin WebSocket:', err);
        }
      };

      ws.onclose = () => {
        setTimeout(initWebSocket, 5000);
      };

      ws.onerror = () => {
        // Im lặng khi chạy standalone static demo
      };
    } catch (err) {
      console.log('WebSocket not active (chạy chế độ tĩnh demo)');
    }
  }

  function handleServerBroadcast(payload) {
    const { type, data } = payload;
    if (!data) return;

    switch (type) {
      case 'init':
      case 'stats_sync':
        if (data.stats) {
          totalCoins = Number(data.stats.totalCoins || 0);
          totalIncense = Number(data.stats.totalIncense || 0);
          woodblockHits = Number(data.stats.woodblockHits || 0);
          safeText(totalCoinsCount, totalCoins.toLocaleString('vi-VN'));
          safeText(totalIncenseCount, totalIncense.toLocaleString('vi-VN'));
          safeText(woodblockHitCount, woodblockHits.toLocaleString('vi-VN'));
        }
        if (data.streamer) {
          const streamTikTokName = document.getElementById('streamTikTokName');
          if (streamTikTokName) streamTikTokName.textContent = `@${data.streamer}`;
        }
        if (data.viewerCount !== undefined && Number(data.viewerCount) > 0) {
          const streamViewCount = document.getElementById('streamViewCount');
          if (streamViewCount) safeText(streamViewCount, Number(data.viewerCount).toLocaleString('vi-VN'));
        }
        if (data.topDonors && Array.isArray(data.topDonors)) {
          updateTopDonorsUI(data.topDonors);
        }
        break;
      case 'visitor_join':
        const visitorDevotee = getOrCreateRealDevotee(data.id || data.userId || data.name, data.name || data.dharmaName || 'Đồng tu', data.avatar);
        const visitorSlot = document.getElementById(visitorDevotee.slotId);
        showPrayerBubble('Vừa bước vào Chánh Điện trang nghiêm 🙏', visitorSlot, data.avatar, visitorDevotee.name, visitorDevotee.userId);
        triggerCongregationWave();
        break;
      case 'ceremony_incense':
        const incDevotee = getOrCreateRealDevotee(data.userId || data.userName || data.name, data.userName || data.name || 'Phật tử', data.avatar);
        triggerIncenseAction(incDevotee.name, data.intent || data.prayer || data.text, data.diamondCount || 1, data.avatar || '');
        break;
      case 'ceremony_bow':
        triggerWoodblockAction(data.name || 'Phật tử', data.bowCount || 3, data.avatar || '');
        recordDonation(data.name || 'Phật tử', data.diamondCount || 5);
        const bowDevoteeObj = getOrCreateRealDevotee(data.userId || data.name, data.name || 'Phật tử', data.avatar);
        const bowSlot = document.getElementById(bowDevoteeObj.slotId);
        showPrayerBubble('Chí tâm đảnh lễ Đức Thế Tôn tam bái 🙏', bowSlot, data.avatar, bowDevoteeObj.name, bowDevoteeObj.userId);
        animateWalkerOnCarpet(data.name || 'Phật tử', data.avatar || '', '🙏 Lạy Phật Tam Bái', 'Chí tâm sám hối đảnh lễ Tam Bảo');
        break;
      case 'sound_woodblock':
        triggerWoodblockAction(data.name || 'Phật tử', data.count || 3, data.avatar || '');
        break;
      case 'ceremony_lotus':
        triggerLotusAction(data.name || 'Phật tử', data.diamondCount || 10, data.avatar || '');
        break;
      case 'ceremony_fruit':
        triggerFruitAction(data.name || 'Phật tử', data.diamondCount || 30, data.avatar || '');
        break;
      case 'ceremony_great':
        triggerDragonCeremony(data.name || 'Phật tử', data.diamondCount || 500, data.avatar || '');
        break;
      case 'sound_bell':
        playBellSound();
        showPrayerBubble('Thỉnh chuông ngân vang thanh tịnh 🔔', null, data.avatar, data.name || 'Phật tử');
        triggerCongregationWave();
        break;
      case 'like_burst':
        triggerCongregationWave();
        if (data.userId || data.name) {
          const likeDevotee = getOrCreateRealDevotee(data.userId || data.name, data.name || 'Phật tử', data.avatar);
          const likeSlot = document.getElementById(likeDevotee.slotId);
          if (Math.random() < 0.35) {
            showPrayerBubble('Đã thả tim niệm Phật ❤️🙏', likeSlot, data.avatar, likeDevotee.name, likeDevotee.userId);
          }
        }
        break;
      case 'divination_result':
        if (data.fortune) {
          const f = data.fortune;
          safeText(marqueeText, `🎋 ${data.name || 'Phật tử'} nhận Quẻ số ${f.number || '01'} - ${f.title || ''}`);
          const divDevotee = getOrCreateRealDevotee(data.userId || data.name, data.name || 'Phật tử', data.avatar);
          const divSlot = document.getElementById(divDevotee.slotId);
          showPrayerBubble(`Rút Quẻ số ${f.number || '01'}: ${f.title}`, divSlot, data.avatar, divDevotee.name, divDevotee.userId);
          animateWalkerOnCarpet(data.name || 'Phật tử', data.avatar || '', `🎋 Rút Quẻ số ${f.number || '01'}`, f.meaning);
          setTimeout(() => {
            safeText(fortuneNum, `QUẺ SỐ ${f.number < 10 ? '0' + f.number : f.number}`);
            safeText(fortuneTitle, f.title);
            if (fortunePoem) fortunePoem.innerHTML = (f.poem || '').replace(/\n/g, '<br>');
            safeText(fortuneMeaning, f.meaning);
            safeText(fortuneAdvice, f.advice);
            if (fortuneModal) fortuneModal.classList.add('open');
            playBellSound();
            speakVoice(`Phật Bà Quan Âm ban quẻ cho Phật tử ${data.name || 'thiện tín'}: Quẻ số ${f.number} ${f.title}. ${f.meaning}`);
          }, 700);
        } else {
          showPrayerBubble('Vừa gieo quẻ xăm linh ứng 🎋', null, data.avatar, data.name || 'Phật tử');
        }
        break;
      case 'so_chanting':
        triggerChantingScripture(data.name || 'Phật tử', data.text);
        break;
      case 'chat_message':
        const chatText = data.text || data.comment || '';
        if (chatText) {
          const chatDevotee = getOrCreateRealDevotee(data.userId || data.name, data.name || 'Phật tử', data.avatar);
          const chatSlot = document.getElementById(chatDevotee.slotId);
          showPrayerBubble(chatText, chatSlot, data.avatar, chatDevotee.name, chatDevotee.userId);
        }
        break;
      case 'tiktok_status':
        const streamTikTokName = document.getElementById('streamTikTokName');
        if (data.status === 'connected') {
          isTikTokConnected = true;
          if (streamTikTokName && data.username) streamTikTokName.textContent = `@${data.username}`;
          if (btnConnectTikTok) {
            btnConnectTikTok.textContent = 'Ngắt Kết Nối';
            btnConnectTikTok.style.background = '#27ae60';
            btnConnectTikTok.disabled = false;
          }
        } else if (data.status === 'connecting') {
          if (btnConnectTikTok) {
            btnConnectTikTok.textContent = 'Đang kết nối...';
            btnConnectTikTok.style.background = '#d35400';
            btnConnectTikTok.disabled = true;
          }
        } else {
          isTikTokConnected = false;
          if (btnConnectTikTok) {
            btnConnectTikTok.textContent = 'Kết Nối';
            btnConnectTikTok.style.background = '';
            btnConnectTikTok.disabled = false;
          }
        }
        break;
      case 'tiktok_viewers':
        const streamViewCount = document.getElementById('streamViewCount');
        if (streamViewCount && data.viewerCount !== undefined) {
          safeText(streamViewCount, Number(data.viewerCount).toLocaleString('vi-VN'));
        }
        break;
      default:
        break;
    }
  }

  // ========================================================
  // 8. BỘ GIẢ LẬP KHÁN GIẢ TỰ ĐỘNG CHÂN THỰC (VIRAL SIMULATOR)
  // ========================================================
  const SIM_PRAYERS = [
    'cầu cho con trúng 2 tỷ vé số',
    'cho con vượt qua hết môn',
    'Đạt học bổng',
    'cho con quay lại với nyc',
    'ielts đạt aim, A di đà phật....',
    'Nam mô a di đà phật 🙏',
    'cầu bình an cho mẹ hiền',
    'Xin que đầu tháng ạ 🎋',
    'Cầu cho công việc tháng này thuận lợi',
    'crush ơi yêu em đi'
  ];

  function startSimulatorLoop() {
    setInterval(() => {
      if (!isSimulating) return;
      const prayer = SIM_PRAYERS[Math.floor(Math.random() * SIM_PRAYERS.length)];
      showPrayerBubble(prayer);
      if (Math.random() < 0.4) playWoodblockSound();
    }, 5500);
  }

  // Khởi chạy
  renderVipTerrace();
  renderCongregation();
  renderEffects();
  setupEventListeners();
  initWebSocket();
  startSimulatorLoop();
  startIdleDevotionLoop();

})();
