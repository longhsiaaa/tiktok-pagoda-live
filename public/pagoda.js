/**
 * LỄ CHÙA DÂNG HƯƠNG ONLINE - VẠN PHÚC TỰ
 * Tác giả: LongNH (longnh.com)
 * Client Engine: Web Audio Synthesizer, Canvas Hạt Trầm, Bồ Đoàn Tương Tác & WebSocket
 */

(function () {
  'use strict';

  // State
  let ws = null;
  let audioCtx = null;
  let myVisitorInfo = null;
  const activeSeats = new Map(); // seatIndex -> pilgrim data
  const totalSeats = 48;

  // DOM Elements
  const cushionsGrid = document.getElementById('cushionsGrid');
  const templeNameDisplay = document.getElementById('templeNameDisplay');
  const myDisplayName = document.getElementById('myDisplayName');
  const meritList = document.getElementById('meritList');
  const ceremonyWalker = document.getElementById('ceremonyWalker');
  const walkerAvatar = document.getElementById('walkerAvatar');
  const walkerName = document.getElementById('walkerName');
  const walkerOffering = document.getElementById('walkerOffering');
  const walkerBubble = document.getElementById('walkerBubble');
  const chantingBanner = document.getElementById('chantingBanner');
  const chantingText = document.getElementById('chantingText');
  const fortuneModal = document.getElementById('fortuneModal');
  const closeFortuneBtn = document.getElementById('closeFortuneBtn');
  const fortuneNum = document.getElementById('fortuneNum');
  const fortuneTitle = document.getElementById('fortuneTitle');
  const fortunePoem = document.getElementById('fortunePoem');
  const fortuneMeaning = document.getElementById('fortuneMeaning');
  const fortuneAdvice = document.getElementById('fortuneAdvice');
  const controlDock = document.getElementById('controlDock');
  const dockToggleBtn = document.getElementById('dockToggleBtn');
  const btnCleanMode = document.getElementById('btnCleanMode');

  // Input & Buttons
  const btnIncense = document.getElementById('btnIncense');
  const btnBow = document.getElementById('btnBow');
  const btnLotus = document.getElementById('btnLotus');
  const btnFruit = document.getElementById('btnFruit');
  const btnBell = document.getElementById('btnBell');
  const btnWoodblock = document.getElementById('btnWoodblock');
  const btnDivination = document.getElementById('btnDivination');
  const btnSo = document.getElementById('btnSo');
  const chatInput = document.getElementById('chatInput');
  const btnSendChat = document.getElementById('btnSendChat');
  const btnAddVisitor = document.getElementById('btnAddVisitor');
  const templeBell = document.getElementById('templeBell');
  const templeWoodblock = document.getElementById('templeWoodblock');
  const divinationTube = document.getElementById('divinationTube');
  const mainCenser = document.getElementById('mainCenser');

  // ========================================================
  // 1. KHỞI TẠO HÀNG BỒ ĐOÀN NGỒI THIỀN (48 CHỖ)
  // ========================================================
  function initCushionsGrid() {
    cushionsGrid.innerHTML = '';
    for (let i = 0; i < totalSeats; i++) {
      const slot = document.createElement('div');
      slot.className = 'cushion-slot';
      slot.id = `cushion-${i}`;
      slot.setAttribute('data-seat-index', i);

      const pad = document.createElement('div');
      pad.className = 'cushion-pad';

      slot.appendChild(pad);
      cushionsGrid.appendChild(slot);
    }
  }

  // Cập nhật hiển thị người ngồi tại bồ đoàn
  function renderPilgrimOnCushion(seatIndex, pilgrim) {
    const slot = document.getElementById(`cushion-${seatIndex}`);
    if (!slot) return;

    // Xóa nội dung cũ nếu có
    const oldAvatar = slot.querySelector('.pilgrim-avatar');
    const oldName = slot.querySelector('.pilgrim-name');
    if (oldAvatar) oldAvatar.remove();
    if (oldName) oldName.remove();

    if (!pilgrim) {
      slot.classList.remove('occupied', 'vip');
      return;
    }

    slot.classList.add('occupied');
    if (pilgrim.isVip) slot.classList.add('vip');
    else slot.classList.remove('vip');

    // Tạo Avatar
    const avatar = document.createElement('div');
    avatar.className = 'pilgrim-avatar';
    if (pilgrim.avatar) {
      const img = document.createElement('img');
      img.src = pilgrim.avatar;
      img.alt = pilgrim.name;
      avatar.appendChild(img);
    } else {
      avatar.innerHTML = `<span class="default-icon">🧘‍♂️</span>`;
    }

    // Tạo Tên Phật tử / IP
    const nameTag = document.createElement('div');
    nameTag.className = 'pilgrim-name';
    nameTag.textContent = pilgrim.name;

    slot.appendChild(avatar);
    slot.appendChild(nameTag);
  }

  // Hiển thị bong bóng chat trên bồ đoàn
  function showBubbleAtSeat(seatIndex, text) {
    const slot = document.getElementById(`cushion-${seatIndex}`);
    if (!slot) return;

    // Xóa bubble cũ nếu còn
    const oldBubble = slot.querySelector('.chat-speech-bubble');
    if (oldBubble) oldBubble.remove();

    const bubble = document.createElement('div');
    bubble.className = 'chat-speech-bubble';
    bubble.textContent = text;
    slot.appendChild(bubble);

    setTimeout(() => {
      if (bubble && bubble.parentNode) bubble.remove();
    }, 4000);
  }

  // ========================================================
  // 2. BỘ TỔNG HỢP ÂM THANH THUẦN CODE (WEB AUDIO API)
  // Không cần tải bất kỳ file MP3 nào bên ngoài
  // ========================================================
  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtxClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Thỉnh Đại Hồng Chung (Chuông Chùa Ngân Vang 5 Giây)
  function playBellSound() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Tần số cơ bản của Chuông Chùa Đồng Việt Nam
    const fundamentals = [130.81, 261.63, 523.25, 784.88, 1046.5];
    const gains = [0.8, 0.6, 0.4, 0.25, 0.15];

    fundamentals.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      // Hiệu ứng ngân rung nhẹ (Vibrato)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.998, now + 5.0);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(gains[idx] * 0.4, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 5.6);
    });

    // Hiệu ứng rung chuông trên giao diện
    if (templeBell) {
      templeBell.style.transform = 'scale(1.2) rotate(4deg)';
      setTimeout(() => templeBell.style.transform = '', 300);
    }
  }

  // Gõ Mõ Gia Trì (Tiếng Mõ Gỗ Mít Đanh, Rỗng và Ấm)
  function playWoodblockSound() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Sóng cơ bản mô phỏng thân rỗng của Mõ Gỗ
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.12);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(580, now);
    filter.Q.setValueAtTime(4.5, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.7, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);

    // Tiếng gõ chạm dùi gỗ (Noise click)
    const bufferSize = ctx.sampleRate * 0.02;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    whiteNoise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now);

    // Hiệu ứng nhún mõ trên màn hình
    if (templeWoodblock) {
      templeWoodblock.style.transform = 'scale(1.15) translateY(2px)';
      setTimeout(() => templeWoodblock.style.transform = '', 150);
    }
  }

  // Tiếng Lắc Ống Thẻ Tre Khi Rút Quẻ Xăm
  function playDivinationSound() {
    const ctx = getAudioContext();
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(850 + Math.random() * 200, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      }, i * 90);
    }
  }

  // ========================================================
  // 3. AI TEXT-TO-SPEECH (XƯỚNG SỚ CẦU AN TRANG NGHIÊM)
  // ========================================================
  function speakChantingText(text) {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.pitch = 0.9;  // Tông giọng trầm ấm
    utterance.rate = 0.88;  // Tốc độ trang trọng, khoan thai

    // Cố gắng chọn giọng đọc tiếng Việt truyền cảm
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VN'));
    if (viVoice) utterance.voice = viVoice;

    // Hiển thị Banner trên đỉnh điện
    chantingText.textContent = text;
    chantingBanner.classList.add('show');

    utterance.onend = () => {
      setTimeout(() => {
        chantingBanner.classList.remove('show');
      }, 3000);
    };

    window.speechSynthesis.speak(utterance);
  }

  // ========================================================
  // 4. CANVAS HẠT: KHÓI TRẦM HƯƠNG & MƯA HOA SEN
  // ========================================================
  const smokeCanvas = document.getElementById('smokeCanvas');
  const smokeCtx = smokeCanvas.getContext('2d');
  const lotusCanvas = document.getElementById('lotusRainCanvas');
  const lotusCtx = lotusCanvas.getContext('2d');

  function resizeCanvases() {
    smokeCanvas.width = window.innerWidth;
    smokeCanvas.height = window.innerHeight;
    lotusCanvas.width = window.innerWidth;
    lotusCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvases);
  resizeCanvases();

  // Khởi tạo hạt khói trầm
  const smokeParticles = [];
  function createSmokeParticle(originX, originY) {
    return {
      x: originX + (Math.random() - 0.5) * 8,
      y: originY,
      radius: 4 + Math.random() * 5,
      alpha: 0.65,
      speedY: 0.8 + Math.random() * 0.9,
      drift: (Math.random() - 0.5) * 0.5,
      angle: Math.random() * Math.PI * 2,
      growth: 0.08 + Math.random() * 0.06
    };
  }

  function renderSmoke() {
    smokeCtx.clearRect(0, 0, smokeCanvas.width, smokeCanvas.height);

    // Tìm vị trí lư hương trên màn hình
    const originEl = document.getElementById('smokeOrigin');
    if (originEl) {
      const rect = originEl.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top;

      if (smokeParticles.length < 90) {
        smokeParticles.push(createSmokeParticle(originX, originY));
      }
    }

    for (let i = smokeParticles.length - 1; i >= 0; i--) {
      const p = smokeParticles[i];
      p.y -= p.speedY;
      p.x += Math.sin(p.angle) * 0.6 + p.drift;
      p.angle += 0.03;
      p.radius += p.growth;
      p.alpha -= 0.0035;

      if (p.alpha <= 0 || p.y < 0) {
        smokeParticles.splice(i, 1);
        continue;
      }

      smokeCtx.save();
      smokeCtx.beginPath();
      const grad = smokeCtx.createRadialGradient(p.x, p.y, p.radius * 0.1, p.x, p.y, p.radius);
      grad.addColorStop(0, `rgba(255, 235, 180, ${p.alpha * 0.7})`);
      grad.addColorStop(0.5, `rgba(220, 200, 160, ${p.alpha * 0.4})`);
      grad.addColorStop(1, `rgba(180, 160, 130, 0)`);
      smokeCtx.fillStyle = grad;
      smokeCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      smokeCtx.fill();
      smokeCtx.restore();
    }

    requestAnimationFrame(renderSmoke);
  }
  renderSmoke();

  // Hạt Mưa Cánh Hoa Sen (Khi có Đại Lễ)
  const lotusPetals = [];
  function triggerLotusRain() {
    for (let i = 0; i < 60; i++) {
      lotusPetals.push({
        x: Math.random() * lotusCanvas.width,
        y: -20 - Math.random() * 150,
        size: 14 + Math.random() * 12,
        speedY: 1.5 + Math.random() * 2,
        speedX: Math.sin(Math.random() * 10) * 1.5,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 3,
        alpha: 0.95
      });
    }
  }

  function renderLotusRain() {
    lotusCtx.clearRect(0, 0, lotusCanvas.width, lotusCanvas.height);

    for (let i = lotusPetals.length - 1; i >= 0; i--) {
      const p = lotusPetals[i];
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;

      if (p.y > lotusCanvas.height + 30) {
        lotusPetals.splice(i, 1);
        continue;
      }

      lotusCtx.save();
      lotusCtx.translate(p.x, p.y);
      lotusCtx.rotate((p.rotation * Math.PI) / 180);
      lotusCtx.font = `${p.size}px serif`;
      lotusCtx.fillText('🌸', -p.size / 2, p.size / 2);
      lotusCtx.restore();
    }

    requestAnimationFrame(renderLotusRain);
  }
  renderLotusRain();

  // ========================================================
  // 5. HOẠT ẢNH TIẾN LÊN TAM BẢO DÂNG LỄ (WALKER ANIMATION)
  // ========================================================
  function triggerCeremonyWalk(name, offeringEmoji, bubbleText) {
    walkerName.textContent = name;
    walkerOffering.textContent = offeringEmoji;
    walkerBubble.textContent = bubbleText;

    ceremonyWalker.classList.remove('active');
    void ceremonyWalker.offsetWidth; // Trigger reflow
    ceremonyWalker.classList.add('active');

    setTimeout(() => {
      ceremonyWalker.classList.remove('active');
    }, 4600);
  }

  // ========================================================
  // 6. CẬP NHẬT SỔ CÔNG ĐỨC VÀNG
  // ========================================================
  function updateMeritBoard(merits) {
    if (!merits || merits.length === 0) {
      meritList.innerHTML = `<li class="merit-empty">Chưa có thí chủ lưu danh trong khóa lễ</li>`;
      return;
    }
    meritList.innerHTML = merits.map((m, idx) => `
      <li class="merit-entry ${idx === 0 ? 'top-1' : ''}">
        <span class="merit-name">${idx === 0 ? '👑 ' : (idx + 1) + '. '}${escapeHtml(m.name)}</span>
        <span class="merit-coins">${m.totalDiamonds || m.diamonds || 0} xu</span>
      </li>
    `).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ========================================================
  // 7. HIỂN THỊ MODAL QUẺ XĂM QUAN ÂM
  // ========================================================
  function openFortuneModal(fortune) {
    playDivinationSound();
    fortuneNum.textContent = `QUẺ SỐ ${fortune.number < 10 ? '0' + fortune.number : fortune.number}`;
    fortuneTitle.textContent = fortune.title;
    fortunePoem.innerHTML = fortune.poem.replace(/\n/g, '<br>');
    fortuneMeaning.textContent = fortune.meaning;
    fortuneAdvice.textContent = fortune.advice;

    fortuneModal.classList.add('open');
  }

  closeFortuneBtn.addEventListener('click', () => {
    fortuneModal.classList.remove('open');
  });

  fortuneModal.addEventListener('click', (e) => {
    if (e.target === fortuneModal) {
      fortuneModal.classList.remove('open');
    }
  });

  // ========================================================
  // 8. KẾT NỐI WEBSOCKET CLIENT & ĐỒNG BỘ THỜI GIAN THỰC
  // ========================================================
  function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Đã kết nối thành công tới WebSocket Chùa Online');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleServerEvent(payload.type, payload.data);
      } catch (err) {
        console.error('Lỗi nhận dữ liệu WebSocket:', err);
      }
    };

    ws.onclose = () => {
      console.log('Mất kết nối WebSocket. Đang tự động kết nối lại sau 3s...');
      setTimeout(connectWebSocket, 3000);
    };
  }

  function sendAction(action, extra = {}) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        action,
        ...extra,
        name: myVisitorInfo ? myVisitorInfo.displayName : undefined
      }));
    }
  }

  // Xử lý các sự kiện từ Server
  function handleServerEvent(type, data) {
    switch (type) {
      case 'init':
        if (data.visitor) {
          myVisitorInfo = data.visitor;
          myDisplayName.textContent = data.visitor.name;
        }
        if (data.templeName) {
          templeNameDisplay.textContent = data.templeName;
        }
        if (data.merits) {
          updateMeritBoard(data.merits);
        }
        if (data.activeVisitors) {
          data.activeVisitors.forEach(v => {
            activeSeats.set(v.seatIndex, v);
            renderPilgrimOnCushion(v.seatIndex, v);
          });
        }
        break;

      case 'visitor_join':
        activeSeats.set(data.seatIndex, data);
        renderPilgrimOnCushion(data.seatIndex, data);
        playWoodblockSound();
        break;

      case 'chat_message':
        // Tìm chỗ của người chat
        let seatForChat = -1;
        for (const [seat, pilgrim] of activeSeats.entries()) {
          if (pilgrim.id === data.userId || pilgrim.name === data.name) {
            seatForChat = seat;
            break;
          }
        }
        if (seatForChat !== -1) {
          showBubbleAtSeat(seatForChat, data.text);
        }
        break;

      case 'sound_bell':
        playBellSound();
        break;

      case 'sound_woodblock':
        const count = data.count || 1;
        for (let i = 0; i < count; i++) {
          setTimeout(playWoodblockSound, i * 220);
        }
        break;

      case 'ceremony_incense':
        playBellSound();
        triggerCeremonyWalk(data.name, '🪔', data.text);
        break;

      case 'ceremony_bow':
        for (let i = 0; i < (data.bowCount || 3); i++) {
          setTimeout(playWoodblockSound, i * 350);
        }
        triggerCeremonyWalk(data.name, '🙏', data.text);
        break;

      case 'ceremony_lotus':
        playBellSound();
        triggerCeremonyWalk(data.name, '🌸', data.text);
        break;

      case 'ceremony_fruit':
        playBellSound();
        triggerCeremonyWalk(data.name, '🍎', data.text);
        refreshMerits();
        break;

      case 'ceremony_great':
        playBellSound();
        triggerLotusRain();
        triggerCeremonyWalk(data.name, '🪷', data.text);
        refreshMerits();
        break;

      case 'divination_result':
        openFortuneModal(data.fortune);
        break;

      case 'so_chanting':
        playBellSound();
        speakChantingText(data.text);
        break;

      case 'update_vips':
        const topIds = new Set(data.topIds || []);
        for (const [seat, pilgrim] of activeSeats.entries()) {
          pilgrim.isVip = topIds.has(pilgrim.id);
          renderPilgrimOnCushion(seat, pilgrim);
        }
        break;
    }
  }

  function refreshMerits() {
    fetch('/api/merits')
      .then(r => r.json())
      .then(res => {
        if (res && res.merits) updateMeritBoard(res.merits);
      })
      .catch(console.error);
  }

  // ========================================================
  // 9. LẤY THÔNG TIN LOCAL IP VISITOR QUA HTTP API
  // ========================================================
  function fetchVisitorInfo() {
    fetch('/api/visitor')
      .then(r => r.json())
      .then(res => {
        myVisitorInfo = res;
        myDisplayName.textContent = res.displayName;
        if (res.templeName) templeNameDisplay.textContent = res.templeName;
      })
      .catch(console.error);
  }

  // ========================================================
  // 10. GẮN SỰ KIỆN NÚT BẤM & TƯƠNG TÁC
  // ========================================================
  btnIncense.addEventListener('click', () => {
    playBellSound();
    sendAction('incense');
  });

  btnBow.addEventListener('click', () => {
    sendAction('bow');
  });

  btnLotus.addEventListener('click', () => {
    playBellSound();
    sendAction('lotus');
  });

  btnFruit.addEventListener('click', () => {
    playBellSound();
    sendAction('fruit');
  });

  btnBell.addEventListener('click', () => {
    playBellSound();
    sendAction('bell');
  });

  btnWoodblock.addEventListener('click', () => {
    playWoodblockSound();
    sendAction('woodblock', { count: 3 });
  });

  btnDivination.addEventListener('click', () => {
    sendAction('divination');
  });

  btnSo.addEventListener('click', () => {
    sendAction('so_read');
  });

  // Tương tác trực tiếp click vào Khí Cụ trên bàn thờ
  templeBell.addEventListener('click', () => {
    playBellSound();
    sendAction('bell');
  });

  templeWoodblock.addEventListener('click', () => {
    playWoodblockSound();
    sendAction('woodblock', { count: 1 });
  });

  divinationTube.addEventListener('click', () => {
    sendAction('divination');
  });

  mainCenser.addEventListener('click', () => {
    playBellSound();
    sendAction('incense');
  });

  // Gửi Lời Khấn / Chat
  function handleSendChat() {
    const text = chatInput.value.trim();
    if (!text) return;
    sendAction('chat', { text });
    chatInput.value = '';
  }

  btnSendChat.addEventListener('click', handleSendChat);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSendChat();
  });

  // Thêm Phật tử thử nghiệm
  btnAddVisitor.addEventListener('click', () => {
    const testNames = ['Phật tử Diệu Hạnh', 'Phật tử Quảng Trí', 'Phật tử Viên Thông', 'Phật tử Minh Đức'];
    const randomName = testNames[Math.floor(Math.random() * testNames.length)];
    sendAction('chat', { text: `Nam Mô A Di Đà Phật, con là ${randomName} kính viếng chùa 🙏` });
  });

  // Ẩn/Hiện Bảng Điều Khiển
  dockToggleBtn.addEventListener('click', () => {
    controlDock.classList.toggle('collapsed');
    const isCol = controlDock.classList.contains('collapsed');
    dockToggleBtn.querySelector('.toggle-icon').textContent = isCol ? '▲' : '▼';
  });

  btnCleanMode.addEventListener('click', () => {
    controlDock.classList.add('collapsed');
  });

  // Phím Tắt Tiện Dụng:
  // - Space / M: Gõ Mõ
  // - B: Thỉnh Chuông
  // - I: Thắp Nhang
  // - H: Ẩn/Hiện Bảng điều khiển (Dành cho streamer trên OBS)
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === ' ' || e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      playWoodblockSound();
      sendAction('woodblock', { count: 1 });
    } else if (e.key === 'b' || e.key === 'B') {
      playBellSound();
      sendAction('bell');
    } else if (e.key === 'i' || e.key === 'I') {
      playBellSound();
      sendAction('incense');
    } else if (e.key === 'h' || e.key === 'H') {
      controlDock.classList.toggle('collapsed');
    }
  });

  // Khởi động toàn bộ
  initCushionsGrid();
  fetchVisitorInfo();
  connectWebSocket();

})();
