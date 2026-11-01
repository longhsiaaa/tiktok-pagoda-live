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
  let bgmGainNode = null;
  let isSoundActive = false;
  let isVoiceEnabled = true;
  let isBgmEnabled = true;
  let isBgmRunning = false;
  let bgmIntervalId = null;
  let bgmVolume = 0.89;
  let voiceVolume = 0.86;
  let woodblockHits = 9317;
  let totalIncense = 1022;
  let totalCoins = 13948;

  let ws = null;
  let isSimulating = true;
  let speechBubbleId = 0;
  let currentTtsAudio = null;
  let currentTtsUrl = null;
  let currentTtsAbortController = null;

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
    if (!vipTerraceRow) return;
    vipTerraceRow.innerHTML = '';
    VIP_DONORS.forEach((d, idx) => {
      const slot = document.createElement('div');
      slot.className = `vip-seat-slot ${d.isChamp ? 'top-champion' : ''}`;
      slot.id = `vip-seat-${idx}`;
      slot.innerHTML = `
        <div class="vip-avatar-figure"></div>
        <div class="vip-pillow"></div>
        <span class="vip-name-tag">${escapeHtml(d.name)}</span>
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
    if (!congregationGrid) return;
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
        <span class="regular-name-tag">${escapeHtml(name)}</span>
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
        <span class="regular-name-tag">${escapeHtml(name)}</span>
      `;
      rightSide.appendChild(slot);
    }

    congregationGrid.appendChild(leftSide);
    congregationGrid.appendChild(rightSide);
  }

  // ========================================================
  // 2. HIỂN THỊ BONG BÓNG LỜI KHẤN THỜI GIAN THỰC (XSS SAFE)
  // ========================================================
  function showPrayerBubble(text, seatElement) {
    if (!streamFrame || !streamSpeechLayer || !text) return;

    if (!seatElement) {
      const allSlots = document.querySelectorAll('.pilgrim-figure-slot, .vip-seat-slot');
      if (allSlots.length > 0) {
        seatElement = allSlots[Math.floor(Math.random() * allSlots.length)];
      }
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
    bubble.textContent = text; // Safe text insertion

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

  // Nhạc Thiền Tịnh Tâm (Idempotent Guard)
  function startZenBgm() {
    if (!audioCtx || !isBgmEnabled || isBgmRunning) return;
    isBgmRunning = true;

    try {
      const droneOsc = audioCtx.createOscillator();
      bgmGainNode = audioCtx.createGain();

      droneOsc.type = 'sine';
      droneOsc.frequency.setValueAtTime(108, audioCtx.currentTime); // Tần số 108Hz thiền định

      bgmGainNode.gain.setValueAtTime(bgmVolume * 0.15, audioCtx.currentTime);

      droneOsc.connect(bgmGainNode);
      bgmGainNode.connect(audioCtx.destination);
      droneOsc.start();

      if (bgmIntervalId) clearInterval(bgmIntervalId);
      bgmIntervalId = setInterval(() => {
        if (!isBgmEnabled || !audioCtx || audioCtx.state !== 'running') return;
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
  function triggerIncenseAction(sender, prayer, coins = 1) {
    playBellSound();
    recordDonation(sender, coins);
    totalIncense += 3;
    safeText(totalIncenseCount, totalIncense.toLocaleString('vi-VN'));
    showPrayerBubble(`🪔 ${sender}: ${prayer || 'Thành tâm thắp 3 nén tâm hương cúng dường Tam Bảo 🙏'}`);
    safeText(marqueeText, `🪔 Thí chủ ${sender} vừa phát tâm thắp 3 nén hương cúng dường Tam Bảo`);
    speakVoice(`Thiện nam tín nữ ${sender} thành tâm thắp nén tâm hương cúng dường Tam Bảo`);
  }

  function triggerLanternAction(sender, prayer, coins = 50) {
    playBellSound();
    recordDonation(sender, coins);
    showPrayerBubble(`🏮 ${sender}: Cầu bình an, thả hoa đăng lung linh cầu nguyện`);
    safeText(marqueeText, `🏮 Thí chủ ${sender} dâng đèn hoa đăng cầu gia đạo bình an`);
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
    safeText(marqueeText, `🎋 ${sender} vừa rút: Quẻ số ${f.num} ${f.title}`);
    showPrayerBubble(`🎋 ${sender}: Rút Quẻ số ${f.num} ${f.title}`);

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

  function triggerLotusAction(sender, coins = 10) {
    playBellSound();
    recordDonation(sender, coins);
    showPrayerBubble(`🌸 ${sender}: Dâng đóa hoa sen vàng cúng Phật`);
    safeText(marqueeText, `🌸 Thí chủ ${sender} dâng đóa sen vàng thanh khiết`);
  }

  function triggerFruitAction(sender, coins = 30) {
    playBellSound();
    recordDonation(sender, coins);
    showPrayerBubble(`🍇 ${sender}: Dâng mâm ngũ quả tươi tốt cúng Tam Bảo 🍎`);
    safeText(marqueeText, `🍇 Thiện tín ${sender} dâng mâm ngũ quả cúng dường Tam Bảo`);
    speakVoice(`Thiện nam tín nữ ${sender} thành kính dâng mâm ngũ quả cúng dường Tam Bảo, phước huệ trang nghiêm!`);
  }

  function triggerDragonCeremony(sender, coins = 500) {
    playBellSound();
    recordDonation(sender, coins);

    // Thả mưa sen nhiều hơn
    for (let i = 0; i < 40; i++) addLotusPetal();

    showPrayerBubble(`🐉 ĐẠI LỄ KIM LONG: Thí chủ ${sender} đại phát tâm bồ đề! 🪷`);
    safeText(marqueeText, `🐉 ĐẠI LỄ KIM LONG CHẦU PHẬT: Thí chủ ${sender} đại cúng dường Tam Bảo!`);

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
    });

    safeOn(btnClickWoodblock, 'click', () => {
      playWoodblockSound();
      showPrayerBubble('🪵 Nam Mô A Di Đà Phật');
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
      btnToggleBgm.textContent = isBgmEnabled ? '🎵 Nhạc Nền: BẬT' : '🎵 Nhạc Nền: TẮT';
      if (isBgmEnabled && !isBgmRunning && audioCtx) {
        startZenBgm();
      } else if (bgmGainNode && audioCtx) {
        bgmGainNode.gain.setValueAtTime(isBgmEnabled ? bgmVolume * 0.15 : 0, audioCtx.currentTime);
      }
    });

    safeOn(bgmVolumeSlider, 'input', e => {
      bgmVolume = e.target.value / 100;
      safeText(bgmValText, `${e.target.value}%`);
      if (bgmGainNode && isBgmEnabled && audioCtx) {
        bgmGainNode.gain.setValueAtTime(bgmVolume * 0.15, audioCtx.currentTime);
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
    safeOn(btnConnectTikTok, 'click', () => {
      const user = inputTikTokUser ? inputTikTokUser.value.trim() : '';
      if (!user) return;
      const streamTikTokName = document.getElementById('streamTikTokName');
      safeText(streamTikTokName, user);
      btnConnectTikTok.textContent = 'Đã Kết Nối';
      btnConnectTikTok.style.background = '#27ae60';
      showPrayerBubble(`📡 Đã kết nối kênh TikTok: ${user}`);
    });

    safeOn(btnToggleSimulate, 'click', () => {
      isSimulating = !isSimulating;
      btnToggleSimulate.classList.toggle('active', isSimulating);
      btnToggleSimulate.textContent = isSimulating ? '📺 Tự động Giả lập Người Xem: BẬT' : '📺 Tự động Giả lập Người Xem: TẮT';
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
      case 'visitor_join':
        showPrayerBubble(`🙏 ${data.name || data.dharmaName || 'Đồng tu'} vừa bước vào chùa`);
        break;
      case 'ceremony_incense':
        triggerIncenseAction(data.userName || data.name || 'Phật tử', data.intent || data.prayer || data.text, data.diamondCount || 1);
        break;
      case 'ceremony_bow':
        triggerWoodblockAction(data.name || 'Phật tử', data.bowCount || 3);
        recordDonation(data.name || 'Phật tử', data.diamondCount || 5);
        showPrayerBubble(`🙏 ${data.name || 'Phật tử'}: Chí tâm đảnh lễ Đức Thế Tôn tam bái`);
        break;
      case 'sound_woodblock':
        triggerWoodblockAction(data.name || 'Phật tử', data.count || 3);
        break;
      case 'ceremony_lotus':
        triggerLotusAction(data.name || 'Phật tử', data.diamondCount || 10);
        break;
      case 'ceremony_fruit':
        triggerFruitAction(data.name || 'Phật tử', data.diamondCount || 30);
        break;
      case 'ceremony_great':
        triggerDragonCeremony(data.name || 'Phật tử', data.diamondCount || 500);
        break;
      case 'sound_bell':
        playBellSound();
        showPrayerBubble(`🔔 ${data.name || 'Phật tử'} thỉnh chuông`);
        break;
      case 'divination_result':
        if (data.fortune) {
          const f = data.fortune;
          safeText(marqueeText, `🎋 ${data.name || 'Phật tử'} nhận Quẻ số ${f.number || '01'} - ${f.title || ''}`);
          showPrayerBubble(`🎋 ${data.name || 'Phật tử'}: Rút Quẻ số ${f.number || '01'}`);
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
          showPrayerBubble(`🎋 ${data.name || 'Phật tử'} vừa gieo quẻ xăm`);
        }
        break;
      case 'so_chanting':
        triggerChantingScripture(data.name || 'Phật tử', data.text);
        break;
      case 'chat_message':
        const chatText = data.text || data.comment || '';
        if (chatText) showPrayerBubble(`${data.name || 'Phật tử'}: ${chatText}`);
        break;
      case 'tiktok_status':
        const streamTikTokName = document.getElementById('streamTikTokName');
        if (streamTikTokName && data.username) streamTikTokName.textContent = `@${data.username}`;
        if (btnConnectTikTok) {
          btnConnectTikTok.textContent = data.connected ? 'Đã Kết Nối' : 'Mất Kết Nối';
          btnConnectTikTok.style.background = data.connected ? '#27ae60' : '#c0392b';
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

})();
