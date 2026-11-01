/**
 * HỆ THỐNG LIVESTREAM CHÙA ONLINE & BẢNG ĐIỀU KHIỂN RPC
 * Tác giả: LongNH (longnh.com)
 * Client Engine: Photorealistic Canvas, Bồ Đoàn Tương Tác, Bảng Vàng & Web Audio Synthesizer
 */

(function () {
  'use strict';

  // State
  let audioCtx = null;
  let bgmMasterNode = null;
  let bgmGainNode = null;
  let voiceGainNode = null;
  let isSoundActive = false;
  let isVoiceEnabled = true;
  let isBgmEnabled = true;
  let bgmVolume = 0.89;
  let voiceVolume = 0.86;
  let woodblockHits = 9317;
  let totalIncense = 1022;
  let totalCoins = 13948;

  let ws = null;
  let isSimulating = true;
  let speechBubbleId = 0;

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

  // Kiểm tra URL nếu có ?obs=1 hoặc ?stream=1 thì tự động vào chế độ Stream Only
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('obs') === '1' || urlParams.get('stream') === '1') {
    document.body.classList.add('obs-stream-only');
  }

  // ========================================================
  // 1. RENDER ĐÁM ĐÔNG PHẬT TỬ & HÀNG VIP THƯỢNG ĐIỆN
  // ========================================================
  const VIP_DONORS = [
    { name: 'Tiến Trương', coins: 5043, rank: 'Cấp 5', isChamp: true },
    { name: 'Anh Thơ 1227', coins: 833, rank: 'Cấp 4', isChamp: false },
    { name: 'tao nồng ảnh...', coins: 550, rank: 'Cấp 4', isChamp: false },
    { name: 'Nguyễn Đăng k...', coins: 356, rank: 'Cấp 3', isChamp: false },
    { name: 'Lương nhi', coins: 280, rank: 'Cấp 3', isChamp: false },
    { name: 'Tha choco', coins: 210, rank: 'Cấp 2', isChamp: false }
  ];

  function renderVipTerrace() {
    vipTerraceRow.innerHTML = '';
    VIP_DONORS.forEach((d, idx) => {
      const slot = document.createElement('div');
      slot.className = `vip-seat-slot ${d.isChamp ? 'top-champion' : ''}`;
      slot.id = `vip-seat-${idx}`;
      slot.innerHTML = `
        <div class="vip-avatar-figure"></div>
        <div class="vip-pillow"></div>
        <span class="vip-name-tag">${d.name}</span>
      `;
      vipTerraceRow.appendChild(slot);
    });
  }

  const REGULAR_NAMES = [
    'Diệu Thảo', 'Thích ăn thịt', 'MSH/JWIN', 'Lan\'slan', 'Đức Tâm', 'Từ Như',
    'Thích Bất Trộm', 'Đồng Nô', 'Thích Chè Chè', 'Hương Sóc Sơn', 'Tuyết Lâm',
    'Thích Thông C', 'Thiện Minh', 'Thích Tu Hành', 'Hìn', 'Tóc Dài Thơ Ngây',
    'Thích Chị Sếp', 'Thích Đủ Thứ', 'An Nhân', 'Thích Cúng Dường', 'Tâm Hoa',
    'KHÁNH CM', 'Light Blue', 'Thích Coi Xoong', 'Bear A', 'Thích Thì Chiều'
  ];

  function renderCongregation() {
    congregationGrid.innerHTML = '';

    // Cột bên trái
    const leftSide = document.createElement('div');
    leftSide.className = 'congregation-side side-left';
    for (let i = 0; i < 15; i++) {
      const name = REGULAR_NAMES[i % REGULAR_NAMES.length];
      const slot = document.createElement('div');
      slot.className = 'pilgrim-figure-slot';
      slot.id = `pilgrim-l-${i}`;
      slot.innerHTML = `
        <div class="regular-figure" style="animation-delay: ${i * 0.25}s"></div>
        <div class="regular-cushion"></div>
        <span class="regular-name-tag">${name}</span>
      `;
      leftSide.appendChild(slot);
    }

    // Cột bên phải
    const rightSide = document.createElement('div');
    rightSide.className = 'congregation-side side-right';
    for (let i = 15; i < 30; i++) {
      const name = REGULAR_NAMES[i % REGULAR_NAMES.length];
      const slot = document.createElement('div');
      slot.className = 'pilgrim-figure-slot';
      slot.id = `pilgrim-r-${i}`;
      slot.innerHTML = `
        <div class="regular-figure" style="animation-delay: ${(i - 15) * 0.25}s"></div>
        <div class="regular-cushion"></div>
        <span class="regular-name-tag">${name}</span>
      `;
      rightSide.appendChild(slot);
    }

    congregationGrid.appendChild(leftSide);
    congregationGrid.appendChild(rightSide);
  }

  // ========================================================
  // 2. HIỂN THỊ BONG BÓNG LỜI KHẤN THỜI GIAN THỰC
  // ========================================================
  function showPrayerBubble(text, seatElement) {
    if (!seatElement) {
      // Chọn ngẫu nhiên 1 ghế trong đám đông
      const allSlots = document.querySelectorAll('.pilgrim-figure-slot, .vip-seat-slot');
      seatElement = allSlots[Math.floor(Math.random() * allSlots.length)];
    }
    if (!seatElement) return;

    const rect = seatElement.getBoundingClientRect();
    const frameRect = streamFrame.getBoundingClientRect();

    const posX = rect.left - frameRect.left + rect.width / 2;
    const posY = rect.top - frameRect.top - 8;

    const bubble = document.createElement('div');
    bubble.className = 'prayer-pop-bubble';
    bubble.id = `bubble-${speechBubbleId++}`;
    bubble.style.left = `${posX}px`;
    bubble.style.top = `${posY}px`;
    bubble.textContent = text;

    streamSpeechLayer.appendChild(bubble);

    setTimeout(() => {
      if (bubble && bubble.parentNode) bubble.remove();
    }, 4500);
  }

  // ========================================================
  // 3. CANVAS HẠT KHÓI TRẦM & HOA SEN RƠI
  // ========================================================
  const ctx = effectsCanvas.getContext('2d');
  function resizeCanvas() {
    effectsCanvas.width = streamFrame.clientWidth;
    effectsCanvas.height = streamFrame.clientHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const smokeList = [];
  const petalList = [];

  // Tạo hạt khói bốc từ đỉnh lư đồng
  function addSmokeParticle() {
    const originX = effectsCanvas.width * 0.5;
    const originY = effectsCanvas.height * 0.51; // Ngay trên miệng bát hương đồng
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

  // Tạo cánh sen rơi
  function addLotusPetal() {
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
  // 4. BỘ TỔNG HỢP ÂM THANH CHÙA THUẦN CODE & NHẠC THIỀN
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
    startZenBgm();
  }

  // Nhạc Thiền Tịnh Tâm (Zen Meditation Ambient Drone)
  function startZenBgm() {
    if (!audioCtx || !isBgmEnabled) return;
    try {
      const droneOsc = audioCtx.createOscillator();
      bgmGainNode = audioCtx.createGain();

      droneOsc.type = 'sine';
      droneOsc.frequency.setValueAtTime(108, audioCtx.currentTime); // Tần số 108Hz thiền định

      bgmGainNode.gain.setValueAtTime(bgmVolume * 0.15, audioCtx.currentTime);

      droneOsc.connect(bgmGainNode);
      bgmGainNode.connect(audioCtx.destination);
      droneOsc.start();

      // Tiếng chuông gió / giọt nước thiền định rơi ngẫu nhiên
      setInterval(() => {
        if (!isBgmEnabled || !audioCtx) return;
        const now = audioCtx.currentTime;
        const chimeOsc = audioCtx.createOscillator();
        const chimeGain = audioCtx.createGain();

        const notes = [523.25, 659.25, 783.99, 1046.5];
        const freq = notes[Math.floor(Math.random() * notes.length)];

        chimeOsc.type = 'triangle';
        chimeOsc.frequency.setValueAtTime(freq, now);
        chimeGain.gain.setValueAtTime(0.001, now);
        chimeGain.gain.linearRampToValueAtTime(bgmVolume * 0.08, now + 0.05);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(audioCtx.destination);
        chimeOsc.start(now);
        chimeOsc.stop(now + 3.1);
      }, 7000);

    } catch (e) {
      console.log('Zen BGM init note:', e.message);
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

    // Rung lắc nút chuông trên màn hình
    btnClickBell.style.transform = 'scale(1.2) rotate(5deg)';
    setTimeout(() => btnClickBell.style.transform = '', 300);
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

    // Tăng biến đếm gõ mõ
    woodblockHits++;
    woodblockHitCount.textContent = woodblockHits.toLocaleString('vi-VN');

    btnClickWoodblock.style.transform = 'scale(1.15) translateY(2px)';
    setTimeout(() => btnClickWoodblock.style.transform = '', 150);
  }

  // Tiếng Lắc Thẻ Xăm Tre
  function playBambooSticksSound() {
    if (!isSoundActive && !audioCtx) initAudioContext();
    if (!audioCtx) return;

    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
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

  // AI Voice xướng Lời Khấn / Sớ
  function speakVoice(text) {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.volume = voiceVolume;
    utterance.pitch = 0.9;
    utterance.rate = 0.88;

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VN'));
    if (viVoice) utterance.voice = viVoice;

    window.speechSynthesis.speak(utterance);
  }

  // ========================================================
  // 5. CÁC TÁC VỤ KÍCH HOẠT RPC (TỪ BẢNG ĐIỀU KHIỂN BÊN PHẢI)
  // ========================================================
  function triggerIncenseAction(sender, prayer) {
    playBellSound();
    totalIncense += 3;
    totalIncenseCount.textContent = totalIncense.toLocaleString('vi-VN');
    showPrayerBubble(`🪔 ${sender}: ${prayer || 'Thành tâm thắp 3 nén tâm hương cúng dường Tam Bảo 🙏'}`);
    marqueeText.textContent = `🪔 Thí chủ ${sender} vừa phát tâm thắp 3 nén hương cúng dường Tam Bảo`;
    speakVoice(`Thiện nam tín nữ ${sender} thành tâm thắp nén tâm hương cúng dường Tam Bảo`);
  }

  function triggerLanternAction(sender, prayer) {
    playBellSound();
    totalCoins += 50;
    totalCoinsCount.textContent = totalCoins.toLocaleString('vi-VN');
    showPrayerBubble(`🏮 ${sender}: Cầu bình an, thả hoa đăng lung linh cầu nguyện`);
    marqueeText.textContent = `🏮 Thí chủ ${sender} dâng đèn hoa đăng cầu gia đạo bình an`;
    speakVoice(`Nguyện cầu hoa đăng tỏa sáng, gia quyến Phật tử ${sender} bình an vạn sự`);
  }

  function triggerWoodblockAction(sender, count = 5) {
    for (let i = 0; i < count; i++) {
      setTimeout(playWoodblockSound, i * 220);
    }
    showPrayerBubble(`🪵 ${sender}: Nam Mô A Di Đà Phật (${count} tiếng mõ)`);
  }

  function triggerBellAction(sender) {
    playBellSound();
    showPrayerBubble(`🔔 ${sender}: Thỉnh Đại Hồng Chung ngân vang thanh tịnh`);
  }

  const FORTUNES_DATA = [
    { num: 1, title: 'THƯỢNG THƯỢNG CÁT', poem: 'Đầu xuân mưa thuận gió êm đềm,\nTrời ban phúc lộc đến thềm nhà xưa.\nMuôn việc hanh thông chẳng quản vừa,\nTâm thành tích đức phúc khôn ngơi.', meaning: 'Cầu tài đại cát, gia đạo an khang. Mọi mong ước nay sắp thành hiện thực.', advice: 'Giữ tâm khiêm tốn, giúp đỡ người nghèo khó để phước báu được lâu dài.' },
    { num: 8, title: 'THƯỢNG CÁT', poem: 'Tâm thành một nén trầm hương dâng,\nPhật chứng lòng son sáng tấc lòng.\nMở lối hanh thông ngàn cánh cửa,\nTiền tài danh vọng sáng rực hồng.', meaning: 'Kinh doanh phát đạt, gia quyến an khang, mọi trắc trở đều tiêu tan.', advice: 'Tạ ơn bề trên, trích phần tài lộc làm việc thiện cứu người.' }
  ];

  function triggerDivinationAction(sender) {
    playBambooSticksSound();
    const f = FORTUNES_DATA[Math.floor(Math.random() * FORTUNES_DATA.length)];
    marqueeText.textContent = `🎋 ${sender} vừa rút: Quẻ số ${f.num} ${f.title}`;
    showPrayerBubble(`🎋 ${sender}: Rút Quẻ số ${f.num} ${f.title}`);

    setTimeout(() => {
      fortuneNum.textContent = `QUẺ SỐ 0${f.num}`;
      fortuneTitle.textContent = f.title;
      fortunePoem.innerHTML = f.poem.replace(/\n/g, '<br>');
      fortuneMeaning.textContent = f.meaning;
      fortuneAdvice.textContent = f.advice;
      fortuneModal.classList.add('open');
      playBellSound();
      speakVoice(`Phật Bà Quan Âm ban quẻ: Quẻ số ${f.num} ${f.title}. ${f.meaning}`);
    }, 700);
  }

  function triggerLotusAction(sender) {
    playBellSound();
    totalCoins += 10;
    totalCoinsCount.textContent = totalCoins.toLocaleString('vi-VN');
    showPrayerBubble(`🌸 ${sender}: Dâng đóa hoa sen vàng cúng Phật`);
    marqueeText.textContent = `🌸 Thí chủ ${sender} dâng đóa sen vàng thanh khiết`;
  }

  function triggerDragonCeremony(sender) {
    playBellSound();
    totalCoins += 500;
    totalCoinsCount.textContent = totalCoins.toLocaleString('vi-VN');

    // Thả mưa sen nhiều hơn
    for (let i = 0; i < 40; i++) addLotusPetal();

    showPrayerBubble(`🐉 ĐẠI LỄ KIM LONG: Thí chủ ${sender} đại phát tâm bồ đề! 🪷`);
    marqueeText.textContent = `🐉 ĐẠI LỄ KIM LONG CHẦU PHẬT: Thí chủ ${sender} đại cúng dường Tam Bảo!`;

    topDonorName.textContent = sender;
    topDonorCoins.textContent = totalCoins.toLocaleString('vi-VN');

    speakVoice(`Đại lễ Kim Long Chầu Phật! Chúng con xin tán thán đại công đức của thí chủ ${sender}. Nguyện ơn Phật từ bi gia hộ vạn sự cát tường, phước thọ vô biên!`);
  }

  function triggerChantingScripture(sender, prayer) {
    playBellSound();
    for (let i = 0; i < 4; i++) setTimeout(playWoodblockSound, 400 + i * 260);
    showPrayerBubble(`📜 ${sender}: Khấn nguyện hồi hướng công đức`);
    speakVoice(`Nam Mô Bổn Sư Thích Ca Mâu Ni Phật. Trước Tam Bảo uy nghiêm, chúng con xin hồi hướng công đức cho Phật tử ${sender}: ${prayer || 'Gia đạo bình an, tai qua nạn khỏi, vạn sự hanh thông, tiêu tai diệt tội, phước huệ trang nghiêm'}. Nam Mô A Di Đà Phật!`);
  }

  // ========================================================
  // 6. GẮN SỰ KIỆN NÚT BẤM VÀ CÁC ĐIỀU KHIỂN
  // ========================================================
  function setupEventListeners() {
    // Nút tương tác trực tiếp trên bàn thờ
    btnClickBell.addEventListener('click', () => {
      playBellSound();
      showPrayerBubble('🔔 Thỉnh Chuông Ngân Nga');
    });

    btnClickWoodblock.addEventListener('click', () => {
      playWoodblockSound();
      showPrayerBubble('🪵 Nam Mô A Di Đà Phật');
    });

    // 1. Nhóm âm thanh bên bảng phải
    btnMasterSound.addEventListener('click', () => {
      initAudioContext();
      btnMasterSound.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
      btnMasterSound.textContent = '🔊 Âm Thanh Chùa Đang BẬT';
    });

    btnToggleVoice.addEventListener('click', () => {
      isVoiceEnabled = !isVoiceEnabled;
      btnToggleVoice.classList.toggle('active', isVoiceEnabled);
      btnToggleVoice.textContent = isVoiceEnabled ? '🎙️ Giọng Đọc: BẬT' : '🎙️ Giọng Đọc: TẮT';
    });

    btnToggleBgm.addEventListener('click', () => {
      isBgmEnabled = !isBgmEnabled;
      btnToggleBgm.classList.toggle('active', isBgmEnabled);
      btnToggleBgm.textContent = isBgmEnabled ? '🎵 Nhạc Nền: BẬT' : '🎵 Nhạc Nền: TẮT';
      if (bgmGainNode) {
        bgmGainNode.gain.setValueAtTime(isBgmEnabled ? bgmVolume * 0.15 : 0, audioCtx.currentTime);
      }
    });

    bgmVolumeSlider.addEventListener('input', e => {
      bgmVolume = e.target.value / 100;
      bgmValText.textContent = `${e.target.value}%`;
      if (bgmGainNode) {
        bgmGainNode.gain.setValueAtTime(bgmVolume * 0.15, audioCtx.currentTime);
      }
    });

    voiceVolumeSlider.addEventListener('input', e => {
      voiceVolume = e.target.value / 100;
      voiceValText.textContent = `${e.target.value}%`;
    });

    // 2. Chế độ OBS Toàn Màn Hình
    btnToggleObsMode.addEventListener('click', () => {
      document.body.classList.toggle('obs-stream-only');
    });

    // 3. Kết nối TikTok Live
    btnConnectTikTok.addEventListener('click', () => {
      const user = inputTikTokUser.value.trim();
      if (!user) return;
      document.getElementById('streamTikTokName').textContent = user;
      btnConnectTikTok.textContent = 'Đã Kết Nối';
      btnConnectTikTok.style.background = '#27ae60';
      showPrayerBubble(`📡 Đã kết nối kênh TikTok: ${user}`);
    });

    btnToggleSimulate.addEventListener('click', () => {
      isSimulating = !isSimulating;
      btnToggleSimulate.classList.toggle('active', isSimulating);
      btnToggleSimulate.textContent = isSimulating ? '📺 Tự động Giả lập Người Xem: BẬT' : '📺 Tự động Giả lập Người Xem: TẮT';
    });

    // 4. Kích hoạt 8 nút RPC
    btnRpcIncense.addEventListener('click', () => {
      triggerIncenseAction(rpcSenderName.value || 'Phật tử', rpcPrayerText.value);
    });

    btnRpcLantern.addEventListener('click', () => {
      triggerLanternAction(rpcSenderName.value || 'Phật tử', rpcPrayerText.value);
    });

    btnRpcWoodblock.addEventListener('click', () => {
      triggerWoodblockAction(rpcSenderName.value || 'Phật tử', 5);
    });

    btnRpcBell.addEventListener('click', () => {
      triggerBellAction(rpcSenderName.value || 'Phật tử');
    });

    btnRpcDivination.addEventListener('click', () => {
      triggerDivinationAction(rpcSenderName.value || 'Phật tử');
    });

    btnRpcLotus.addEventListener('click', () => {
      triggerLotusAction(rpcSenderName.value || 'Phật tử');
    });

    btnRpcDragon.addEventListener('click', () => {
      triggerDragonCeremony(rpcSenderName.value || 'Phật tử');
    });

    btnRpcChant.addEventListener('click', () => {
      triggerChantingScripture(rpcSenderName.value || 'Phật tử', rpcPrayerText.value);
    });

    // Modal đóng
    closeFortuneBtn.addEventListener('click', () => fortuneModal.classList.remove('open'));
    fortuneModal.addEventListener('click', e => {
      if (e.target === fortuneModal) fortuneModal.classList.remove('open');
    });

    // Phím tắt
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
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
  // 7. BỘ GIẢ LẬP KHÁN GIẢ TỰ ĐỘNG CHÂN THỰC (VIRAL SIMULATOR)
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
  startSimulatorLoop();

})();
