/**
 * LỄ CHÙA DÂNG HƯƠNG ONLINE 3D - VẠN PHÚC TỰ
 * Tác giả: LongNH (longnh.com)
 * Three.js 3D WebGL Engine, Chibi Characters, 3D Bowing Animation,
 * God Rays, Lotus Rain, Web Audio Synthesizer & TikTok Live Sync
 */

(function () {
  'use strict';

  // State
  let scene, camera, renderer;
  let audioCtx = null;
  let soundEnabled = true;
  let ws = null;
  let myVisitorInfo = null;
  let cameraMode = 0; // 0: Sau lưng người thứ 3 (Mẫu 1), 1: Góc cao toàn cảnh (Mẫu 2)
  let prayerBeadCount = 0;

  const charactersList = []; // Mảng quản lý các nhân vật 3D trong điện
  const petalsList = [];     // Mảng quản lý mưa cánh hoa sen 3D
  const smokeParticles = []; // Mảng hạt khói trầm 3D
  const speechBubbles = [];  // Mảng quản lý bong bóng chat hiển thị trên màn hình

  // DOM Elements
  const container = document.getElementById('webgl-container');
  const speechLayer = document.getElementById('speech-bubbles-layer');
  const myDharmaName = document.getElementById('myDharmaName');
  const onlineCount = document.getElementById('onlineCount');
  const btnToggleSound = document.getElementById('btnToggleSound');
  const soundText = document.getElementById('soundText');
  const btnCameraAngle = document.getElementById('btnCameraAngle');
  const beadsWidget = document.getElementById('beadsWidget');
  const currentBead = document.getElementById('currentBead');
  const btnCountBead = document.getElementById('btnCountBead');
  const btnCloseBeads = document.getElementById('btnCloseBeads');
  const chantingBanner = document.getElementById('chantingBanner');
  const chantingText = document.getElementById('chantingText');
  const fortuneModal = document.getElementById('fortuneModal');
  const closeFortuneBtn = document.getElementById('closeFortuneBtn');
  const fortuneNum = document.getElementById('fortuneNum');
  const fortuneTitle = document.getElementById('fortuneTitle');
  const fortunePoem = document.getElementById('fortunePoem');
  const fortuneMeaning = document.getElementById('fortuneMeaning');
  const fortuneAdvice = document.getElementById('fortuneAdvice');
  const prayerInput = document.getElementById('prayerInput');
  const btnSendPrayer = document.getElementById('btnSendPrayer');
  const btnObsClean = document.getElementById('btnObsClean');
  const bottomActionBar = document.querySelector('.bottom-action-bar');

  // Action Buttons
  const btnActionBow = document.getElementById('btnActionBow');
  const btnActionBeads = document.getElementById('btnActionBeads');
  const btnActionChant = document.getElementById('btnActionChant');
  const btnActionMeditate = document.getElementById('btnActionMeditate');
  const btnActionOffer = document.getElementById('btnActionOffer');
  const btnActionFortune = document.getElementById('btnActionFortune');

  // ========================================================
  // 1. KHỞI TẠO THREE.JS 3D SCENE & RENDERER
  // ========================================================
  function init3DScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x120805);
    scene.fog = new THREE.FogExp2(0x1a0a06, 0.022);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(54, aspect, 0.1, 150);
    setCameraPosition(0);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    buildLighting();
    buildTempleArchitecture();
    buildAltarAndBuddha();
    buildCongregationGrid();
    buildLotusPetals();
    buildSmokeSystem();

    window.addEventListener('resize', onWindowResize);
  }

  function setCameraPosition(mode) {
    if (mode === 0) {
      // Góc nhìn sau lưng người thứ ba (Giống Mẫu 1)
      camera.position.set(0, 3.4, 11.5);
      camera.lookAt(0, 3.0, -8.0);
    } else {
      // Góc nhìn cao toàn cảnh bao quát Đại Tượng Phật & Biển Người (Giống Mẫu 2)
      camera.position.set(0, 5.8, 13.0);
      camera.lookAt(0, 4.2, -6.5);
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ========================================================
  // 2. HỆ THỐNG ÁNH SÁNG & GOD RAYS (TIA SÁNG PHẬT QUANG)
  // ========================================================
  let haloGroup;
  function buildLighting() {
    // Ánh sáng môi trường vàng đất ấm áp
    const ambientLight = new THREE.AmbientLight(0x4a2a18, 1.2);
    scene.add(ambientLight);

    // Nguồn sáng chính chiếu từ trên cao tạo bóng đổ
    const mainLight = new THREE.DirectionalLight(0xfffae0, 1.8);
    mainLight.position.set(5, 12, 4);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 30;
    scene.add(mainLight);

    // Đèn rọi vàng ấm áp tại bàn thờ Tam Bảo
    const altarPointLight = new THREE.PointLight(0xffd700, 2.5, 18);
    altarPointLight.position.set(0, 4.5, -6.5);
    scene.add(altarPointLight);

    // Cặp đèn nến hoa đăng hai bên
    const candleLeft = new THREE.PointLight(0xff9f43, 1.2, 8);
    candleLeft.position.set(-3.2, 2.2, -6.2);
    scene.add(candleLeft);

    const candleRight = new THREE.PointLight(0xff9f43, 1.2, 8);
    candleRight.position.set(3.2, 2.2, -6.2);
    scene.add(candleRight);

    // TIA SÁNG PHẬT QUANG (GOD RAYS / SUNBEAMS)
    const rayGeo = new THREE.CylinderGeometry(0.8, 3.5, 16, 16, 1, true);
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0xffeaa7,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const godRay1 = new THREE.Mesh(rayGeo, rayMat);
    godRay1.position.set(3.5, 7.5, -3);
    godRay1.rotation.z = 0.35;
    godRay1.rotation.x = -0.25;
    scene.add(godRay1);

    const godRay2 = new THREE.Mesh(rayGeo, rayMat);
    godRay2.position.set(-2.5, 8.0, -4);
    godRay2.rotation.z = -0.3;
    godRay2.rotation.x = -0.2;
    scene.add(godRay2);
  }

  // ========================================================
  // 3. KIẾN TRÚC CHÙA 3D (SÀN GỖ, CỘT ĐÌNH, BẢNG VÀNG)
  // ========================================================
  function buildTempleArchitecture() {
    // SÀN GỖ LIM PHẢN CHIẾU ÁNH ĐÈN
    const floorGeo = new THREE.PlaneGeometry(28, 36);
    // Tạo texture vân gỗ bằng Canvas nội bộ
    const woodCanvas = document.createElement('canvas');
    woodCanvas.width = 512;
    woodCanvas.height = 512;
    const wCtx = woodCanvas.getContext('2d');
    wCtx.fillStyle = '#2d1810';
    wCtx.fillRect(0, 0, 512, 512);
    // Vẽ các đường vân thớ gỗ
    wCtx.strokeStyle = 'rgba(15, 8, 4, 0.4)';
    wCtx.lineWidth = 2;
    for (let y = 0; y < 512; y += 32) {
      wCtx.beginPath();
      wCtx.moveTo(0, y);
      wCtx.lineTo(512, y);
      wCtx.stroke();
    }
    const woodTex = new THREE.CanvasTexture(woodCanvas);
    woodTex.wrapS = THREE.RepeatWrapping;
    woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(4, 8);

    const floorMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.38,
      metalness: 0.15,
      color: 0x3d2015
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // THẢM CHÍNH ĐẠO TRẢI DÀI TỪ CỬA LÊN TAM BẢO
    const carpetGeo = new THREE.PlaneGeometry(2.4, 26);
    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x8b1515,
      roughness: 0.85,
      metalness: 0.05
    });
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.015, 2);
    carpet.receiveShadow = true;
    scene.add(carpet);

    // Viền vàng của thảm đỏ
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.6 });
    const bLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 26), borderMat);
    bLeft.rotation.x = -Math.PI / 2;
    bLeft.position.set(-1.22, 0.018, 2);
    scene.add(bLeft);

    const bRight = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 26), borderMat);
    bRight.rotation.x = -Math.PI / 2;
    bRight.position.set(1.22, 0.018, 2);
    scene.add(bRight);

    // 4 CỘT CHÙA GỖ GỤ SƠN SON THẾP VÀNG
    const pillarGeo = new THREE.CylinderGeometry(0.45, 0.48, 14, 24);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x3b140a,
      roughness: 0.45,
      metalness: 0.1
    });
    const pillarRingMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });

    const pillarPositions = [
      [-5.5, -3.5], [5.5, -3.5],
      [-5.5, 6.0], [5.5, 6.0]
    ];

    pillarPositions.forEach(([px, pz]) => {
      const col = new THREE.Mesh(pillarGeo, pillarMat);
      col.position.set(px, 7, pz);
      col.castShadow = true;
      col.receiveShadow = true;
      scene.add(col);

      // Đai đồng trang trí ở chân và giữa cột
      const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.25, 24), pillarRingMat);
      ring1.position.set(px, 1.2, pz);
      scene.add(ring1);

      const ring2 = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.2, 24), pillarRingMat);
      ring2.position.set(px, 5.0, pz);
      scene.add(ring2);
    });

    // VÁCH GỖ PHÍA SAU TAM BẢO
    const wallGeo = new THREE.PlaneGeometry(24, 14);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1f0f08, roughness: 0.6 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 7, -10.5);
    scene.add(wall);

    // HAI TẤM BIA CÔNG ĐỨC & BẢNG VÀNG HAI BÊN (GIỐNG MẪU 1)
    buildTablet(-4.2, 3.2, -8.5, 'BẢNG VÀNG\nTINH TẤN TU TRÌ', 0xd4af37);
    buildTablet(4.2, 3.2, -8.5, 'BIA CÔNG ĐỨC\nLƯU DANH THÍ CHỦ', 0xd4af37);
  }

  function buildTablet(x, y, z, title, rimColor) {
    const tabletGroup = new THREE.Group();
    // Khung gỗ viền vàng
    const frameGeo = new THREE.BoxGeometry(1.6, 2.6, 0.12);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b1208, roughness: 0.5 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    tabletGroup.add(frame);

    // Viền kim loại vàng
    const rimMat = new THREE.MeshStandardMaterial({ color: rimColor, metalness: 0.8, roughness: 0.25 });
    const rimGeo = new THREE.BoxGeometry(1.64, 2.64, 0.08);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.z = -0.02;
    tabletGroup.add(rim);

    // Mặt bia màu son đỏ
    const faceGeo = new THREE.PlaneGeometry(1.4, 2.4);
    const faceMat = new THREE.MeshStandardMaterial({ color: 0x4a110a, roughness: 0.4 });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.z = 0.065;
    tabletGroup.add(face);

    tabletGroup.position.set(x, y, z);
    tabletGroup.rotation.y = x < 0 ? 0.2 : -0.2;
    scene.add(tabletGroup);
  }

  // ========================================================
  // 4. BÀN THỜ TAM BẢO, ĐẠI TƯỢNG PHẬT & LƯ HƯƠNG ĐỒNG
  // ========================================================
  let statueMesh;
  function buildAltarAndBuddha() {
    const altarGroup = new THREE.Group();

    // Bệ đá/gỗ tam cấp
    const baseGeo1 = new THREE.BoxGeometry(8, 0.6, 4.5);
    const baseMat1 = new THREE.MeshStandardMaterial({ color: 0x3d1a0e, roughness: 0.5 });
    const base1 = new THREE.Mesh(baseGeo1, baseMat1);
    base1.position.set(0, 0.3, -7.5);
    base1.receiveShadow = true;
    altarGroup.add(base1);

    const baseGeo2 = new THREE.BoxGeometry(6.5, 0.6, 3.8);
    const base2 = new THREE.Mesh(baseGeo2, baseMat1);
    base2.position.set(0, 0.9, -7.8);
    base2.receiveShadow = true;
    altarGroup.add(base2);

    // TÒA SEN HOÀNG KIM (LOTUS PEDESTAL)
    const lotusBaseMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.25
    });
    const lotusPetalMat = new THREE.MeshStandardMaterial({
      color: 0xfd79a8,
      roughness: 0.4,
      metalness: 0.2
    });

    const pedestalCore = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.4, 0.6, 24), lotusBaseMat);
    pedestalCore.position.set(0, 1.5, -8.0);
    altarGroup.add(pedestalCore);

    // Vòng các cánh sen nở rộ quanh đài
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const petalGeo = new THREE.SphereGeometry(0.38, 12, 12);
      petalGeo.scale(1.0, 1.8, 0.3);
      const petal = new THREE.Mesh(petalGeo, lotusPetalMat);
      petal.position.set(
        Math.cos(angle) * 1.55,
        1.65,
        -8.0 + Math.sin(angle) * 1.55
      );
      petal.rotation.y = -angle + Math.PI / 2;
      petal.rotation.x = 0.4;
      altarGroup.add(petal);
    }

    // ĐẠI TƯỢNG PHẬT BỔN SƯ THÍCH CA DÁT VÀNG (NGỒI KIẾT GIÀ)
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x443000,
      emissiveIntensity: 0.35
    });

    // Thân và Áo Cà Sa
    const torsoGeo = new THREE.CylinderGeometry(0.7, 1.1, 1.6, 20);
    const torso = new THREE.Mesh(torsoGeo, goldMat);
    torso.position.set(0, 2.7, -8.0);
    torso.castShadow = true;
    altarGroup.add(torso);

    // Hai chân xếp bằng (Kiết già)
    const legsGeo = new THREE.TorusGeometry(1.0, 0.35, 12, 24);
    const legs = new THREE.Mesh(legsGeo, goldMat);
    legs.position.set(0, 1.95, -8.0);
    legs.rotation.x = Math.PI / 2;
    altarGroup.add(legs);

    // Đầu và Nhục Kế (Ushnisha)
    const headGeo = new THREE.SphereGeometry(0.55, 24, 24);
    const head = new THREE.Mesh(headGeo, goldMat);
    head.position.set(0, 3.8, -8.0);
    head.castShadow = true;
    altarGroup.add(head);

    const ushnisha = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), goldMat);
    ushnisha.position.set(0, 4.35, -8.0);
    altarGroup.add(ushnisha);

    // Hai cánh tay bắt ấn Thiền Định (Dhyana Mudra)
    const handsGeo = new THREE.BoxGeometry(0.6, 0.15, 0.3);
    const hands = new THREE.Mesh(handsGeo, goldMat);
    hands.position.set(0, 2.2, -7.5);
    altarGroup.add(hands);

    // VÒNG HÀO QUANG XOAY SAU ĐẦU TƯỢNG PHẬT
    haloGroup = new THREE.Group();
    const haloRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.06, 16, 48),
      new THREE.MeshBasicMaterial({ color: 0xffd700 })
    );
    haloGroup.add(haloRing1);

    const haloRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.04, 16, 36),
      new THREE.MeshBasicMaterial({ color: 0xffeaa7 })
    );
    haloGroup.add(haloRing2);

    // Các tia sáng hào quang
    for (let r = 0; r < 12; r++) {
      const rAngle = (r / 12) * Math.PI * 2;
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.03, 0.7, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd700 })
      );
      ray.position.set(Math.cos(rAngle) * 1.35, Math.sin(rAngle) * 1.35, 0);
      ray.rotation.z = rAngle - Math.PI / 2;
      haloGroup.add(ray);
    }
    haloGroup.position.set(0, 3.8, -8.4);
    altarGroup.add(haloGroup);

    // LƯ HƯƠNG ĐỒNG TAM KHÍ KHỔNG LỒ GIỮA BÀN THỜ (NƠI DÂNG HƯƠNG)
    const censerMat = new THREE.MeshStandardMaterial({
      color: 0xcfa635,
      metalness: 0.85,
      roughness: 0.3
    });
    const censerBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.45, 0.65, 20), censerMat);
    censerBowl.position.set(0, 1.45, -5.6);
    censerBowl.castShadow = true;
    altarGroup.add(censerBowl);

    // 3 Chân đỉnh đồng
    for (let l = 0; l < 3; l++) {
      const legAngle = (l / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.4, 8), censerMat);
      leg.position.set(Math.cos(legAngle) * 0.45, 1.05, -5.6 + Math.sin(legAngle) * 0.45);
      altarGroup.add(leg);
    }

    // 3 Nén Nhang Đang Cháy (Glowing Incense Sticks)
    const stickMat = new THREE.MeshBasicMaterial({ color: 0x8b0000 });
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });
    for (let s = -1; s <= 1; s++) {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), stickMat);
      stick.position.set(s * 0.12, 1.95, -5.6);
      altarGroup.add(stick);

      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), emberMat);
      ember.position.set(s * 0.12, 2.36, -5.6);
      altarGroup.add(ember);
    }

    // CẶP BÌNH HOA SEN HỒNG HAI BÊN
    buildLotusVase(-2.2, 1.2, -6.0, altarGroup);
    buildLotusVase(2.2, 1.2, -6.0, altarGroup);

    scene.add(altarGroup);
  }

  function buildLotusVase(x, y, z, parent) {
    const vaseMat = new THREE.MeshStandardMaterial({ color: 0x8c6d1f, metalness: 0.8, roughness: 0.25 });
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.7, 16), vaseMat);
    vase.position.set(x, y, z);
    parent.add(vase);

    // Hoa sen nở trên bình
    const lotusMat = new THREE.MeshStandardMaterial({ color: 0xfd79a8, roughness: 0.4 });
    const lotus1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), lotusMat);
    lotus1.position.set(x, y + 0.45, z);
    parent.add(lotus1);

    const lotus2 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), lotusMat);
    lotus2.position.set(x + 0.1, y + 0.55, z - 0.05);
    parent.add(lotus2);
  }

  // ========================================================
  // 5. MẠNG LƯỚI BỒ ĐOÀN & ĐÁM ĐÔNG PHẬT TỬ 3D CHIBI (MẪU 1 & 2)
  // ========================================================
  const SAMPLE_DHARMA_NAMES = [
    'Thích Thì Chiều', 'Thích nhiều thứ', 'Thích Phước Tâm', 'An Lạc',
    'Tuệ An', 'Lan\'slan', 'Đức Tâm', 'Từ Như', 'Hìn', 'An Nhân',
    'Thích JoongDunk', 'Thích Đủ Thứ', 'Tóc Dài Thơ Ngây', 'Diệu Thảo',
    'Thích Ăn Chay', 'Phước Duyên', 'Minh Tuệ', 'Thanh Tịnh',
    'Chân Như', 'Tâm An', 'Quang Minh', 'Ngộ Đạo', 'Vạn Hạnh', 'Bảo An'
  ];

  function buildCongregationGrid() {
    // Bố trí 36 Phật tử chia 2 dãy tả hữu (6 hàng x 6 cột)
    const rows = 6;
    const colsPerSide = 3; // 3 bồ đoàn mỗi bên lối đi Chính Đạo
    let nameIdx = 0;

    for (let r = 0; r < rows; r++) {
      const zPos = 0.5 + r * 1.7; // Từ gần bàn thờ lùi dần về phía camera

      // Dãy bên trái lối đi
      for (let c = 0; c < colsPerSide; c++) {
        const xPos = -1.8 - c * 1.35;
        const name = SAMPLE_DHARMA_NAMES[nameIdx % SAMPLE_DHARMA_NAMES.length];
        const isVip = (r === 0 && c === 0); // Vị trí VIP hàng đầu
        create3DPilgrim(xPos, zPos, name, `Cấp ${Math.floor(Math.random() * 5) + 1}`, isVip, nameIdx);
        nameIdx++;
      }

      // Dãy bên phải lối đi
      for (let c = 0; c < colsPerSide; c++) {
        const xPos = 1.8 + c * 1.35;
        const name = SAMPLE_DHARMA_NAMES[nameIdx % SAMPLE_DHARMA_NAMES.length];
        const isVip = (r === 0 && c === 0);
        create3DPilgrim(xPos, zPos, name, `Cấp ${Math.floor(Math.random() * 5) + 1}`, isVip, nameIdx);
        nameIdx++;
      }
    }

    // ĐẶT BIỆT: NHÂN VẬT CHÍNH Ở TRUNG TÂM (ĐƯỢC GẮN VƯƠNG MIỆN SEN VÀNG NHƯ MẪU 1)
    if (charactersList.length > 0) {
      // Nhân vật ở hàng giữa gần camera nhất
      const mainChar = charactersList[charactersList.length - 4];
      if (mainChar) {
        mainChar.isCenterHero = true;
        mainChar.name = 'Thích Phước Tâm';
        mainChar.level = 'Cấp 3';
      }
    }
  }

  function create3DPilgrim(x, z, dharmaName, levelStr, isVip, id) {
    const pilgrimGroup = new THREE.Group();

    // 1. CHIẾU THẢM VUÔNG VIỀN ĐỎ VIỀN VÀNG (MẪU 1)
    const matGeo = new THREE.BoxGeometry(1.0, 0.04, 1.0);
    const matCloth = new THREE.MeshStandardMaterial({
      color: 0x5a1810,
      roughness: 0.7
    });
    const matMesh = new THREE.Mesh(matGeo, matCloth);
    matMesh.position.y = 0.02;
    matMesh.receiveShadow = true;
    pilgrimGroup.add(matMesh);

    // Viền vàng của chiếu thảm
    const matBorderGeo = new THREE.BoxGeometry(1.04, 0.03, 1.04);
    const matBorderMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.6, roughness: 0.3 });
    const matBorder = new THREE.Mesh(matBorderGeo, matBorderMat);
    matBorder.position.y = 0.015;
    pilgrimGroup.add(matBorder);

    // 2. BỒ ĐOÀN TRÒN ĐỆM NÂU/VÀNG SEN (ZAFU)
    const zafuGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.16, 20);
    const zafuMat = new THREE.MeshStandardMaterial({
      color: isVip ? 0xb7791f : 0x7c4320,
      roughness: 0.6
    });
    const zafu = new THREE.Mesh(zafuGeo, zafuMat);
    zafu.position.y = 0.12;
    pilgrimGroup.add(zafu);

    // 3. THÂN NHÂN VẬT CHIBI ÁO LAM (CÓ KHỚP GẬP ĐỂ LẠY PHẬT 3D)
    const bodyPivot = new THREE.Group(); // Khớp xoay khi cúi lạy
    bodyPivot.position.set(0, 0.2, 0);

    // Áo tràng lam mềm mại (màu xanh xám / lam thanh tịnh)
    const robeColor = Math.random() > 0.3 ? 0x546e7a : 0x78909c;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: robeColor,
      roughness: 0.65
    });

    const bodyGeo = new THREE.CylinderGeometry(0.24, 0.38, 0.7, 16);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.35;
    body.castShadow = true;
    bodyPivot.add(body);

    // Dải y vàng (Cà sa) vắt chéo qua vai lưng áo (đặc trưng Chibi Mẫu 1)
    const sashGeo = new THREE.TorusGeometry(0.28, 0.04, 8, 16, Math.PI);
    const sashMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.5, roughness: 0.3 });
    const sash = new THREE.Mesh(sashGeo, sashMat);
    sash.position.set(0, 0.45, 0);
    sash.rotation.x = Math.PI / 4;
    sash.rotation.z = -Math.PI / 6;
    bodyPivot.add(sash);

    // 4. ĐẦU CHIBI TRÒN TRỊA & BÚI TÓC (HOẶC ĐẦU TRỌC CHẤM HƯƠNG)
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffe0bd,
      roughness: 0.4
    });
    const headGeo = new THREE.SphereGeometry(0.28, 20, 20);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.88;
    head.castShadow = true;
    bodyPivot.add(head);

    // Búi tóc củ tỏi xinh xắn trên đỉnh đầu (Mẫu 1)
    if (Math.random() > 0.4) {
      const bunGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.8 });
      const bun = new THREE.Mesh(bunGeo, hairMat);
      bun.position.set(0, 1.15, -0.05);
      bodyPivot.add(bun);
    }

    // 5. HAI TAY CHẮP BÚP SEN PHÍA TRƯỚC (ANJALI MUDRA)
    const handMat = new THREE.MeshStandardMaterial({ color: 0xffe0bd });
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), handMat);
    handL.position.set(-0.05, 0.48, 0.22);
    bodyPivot.add(handL);

    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), handMat);
    handR.position.set(0.05, 0.48, 0.22);
    bodyPivot.add(handR);

    pilgrimGroup.add(bodyPivot);

    // Đặt vị trí trong điện
    pilgrimGroup.position.set(x, 0, z);
    scene.add(pilgrimGroup);

    // Lưu dữ liệu nhân vật để cập nhật hoạt ảnh và gắn nhãn
    charactersList.push({
      id: `char_${id}`,
      group: pilgrimGroup,
      bodyPivot,
      name: dharmaName,
      level: levelStr,
      isVip,
      isCenterHero: false,
      idleOffset: Math.random() * Math.PI * 2,
      isBowing: false,
      bowProgress: 0,
      bowRepeat: 0,
      screenX: 0,
      screenY: 0
    });
  }

  // ========================================================
  // 6. MƯA CÁNH HOA SEN 3D (LOTUS PETALS RAIN)
  // ========================================================
  function buildLotusPetals() {
    const petalGeo = new THREE.ConeGeometry(0.08, 0.2, 5);
    petalGeo.rotateX(Math.PI / 2);
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xfd79a8,
      roughness: 0.35,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 90; i++) {
      const petal = new THREE.Mesh(petalGeo, petalMat);
      resetPetal(petal, true);
      scene.add(petal);
      petalsList.push(petal);
    }
  }

  function resetPetal(petal, init = false) {
    petal.position.set(
      (Math.random() - 0.5) * 18,
      init ? Math.random() * 12 + 1 : 12 + Math.random() * 3,
      (Math.random() - 0.5) * 18 + 2
    );
    petal.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    petal.userData = {
      speedY: 0.015 + Math.random() * 0.02,
      rotSpeedX: (Math.random() - 0.5) * 0.03,
      rotSpeedY: (Math.random() - 0.5) * 0.03,
      swayOffset: Math.random() * Math.PI * 2
    };
  }

  // ========================================================
  // 7. CỘT KHÓI TRẦM 3D (INCENSE SMOKE PARTICLE SYSTEM)
  // ========================================================
  function buildSmokeSystem() {
    const smokeGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xfff2d6,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });

    for (let i = 0; i < 45; i++) {
      const smokeP = new THREE.Mesh(smokeGeo, smokeMat.clone());
      smokeP.position.set(0, 2.3 + i * 0.12, -5.6);
      smokeP.userData = {
        age: i / 45,
        speedY: 0.018 + Math.random() * 0.008,
        driftX: (Math.random() - 0.5) * 0.005,
        driftZ: (Math.random() - 0.5) * 0.005
      };
      scene.add(smokeP);
      smokeParticles.push(smokeP);
    }
  }

  // ========================================================
  // 8. HOẠT ẢNH LẠY PHẬT TAM BÁI 3D (PROSTRATION BOWING)
  // ========================================================
  function triggerBowing(charIndex = -1, repeats = 3) {
    // Nếu không chỉ định nhân vật, cho toàn thể hoặc nhân vật chính lạy
    charactersList.forEach((char, idx) => {
      if (charIndex === -1 || charIndex === idx || char.isCenterHero) {
        char.isBowing = true;
        char.bowProgress = 0;
        char.bowRepeat = repeats;
      }
    });

    // Phát 3 tiếng mõ gia trì an lạc
    for (let i = 0; i < repeats; i++) {
      setTimeout(playWoodblockSound, i * 1100);
    }
  }

  // ========================================================
  // 9. CHIẾU TỌA ĐỘ 3D SANG 2D: NHÃN TÊN & BONG BÓNG LỜI KHẤN
  // ========================================================
  const tempVec = new THREE.Vector3();

  function update3DLabelsAndBubbles() {
    speechLayer.innerHTML = '';

    charactersList.forEach(char => {
      // Lấy vị trí 3D trên đỉnh đầu nhân vật
      tempVec.set(
        char.group.position.x,
        char.group.position.y + 1.25,
        char.group.position.z
      );
      tempVec.project(camera);

      // Nếu nằm sau camera thì không render
      if (tempVec.z > 1.0) return;

      const screenX = (tempVec.x * 0.5 + 0.5) * window.innerWidth;
      const screenY = (-tempVec.y * 0.5 + 0.5) * window.innerHeight;
      char.screenX = screenX;
      char.screenY = screenY;

      // Render nhãn tên & cấp độ
      const nameTag = document.createElement('div');
      nameTag.className = 'char-3d-nametag';
      nameTag.style.left = `${screenX}px`;
      nameTag.style.top = `${screenY}px`;

      let inner = '';
      if (char.isCenterHero || char.isVip) {
        inner += `<span class="char-crown-badge">👑</span>`;
      }
      inner += `
        <span class="nametag-dharma">${char.name}</span>
        <span class="nametag-level">${char.level}</span>
      `;
      nameTag.innerHTML = inner;
      speechLayer.appendChild(nameTag);
    });

    // Render các bong bóng lời khấn đang active
    speechBubbles.forEach(b => {
      const bubbleEl = document.createElement('div');
      bubbleEl.className = 'prayer-speech-bubble';
      bubbleEl.style.left = `${b.x}px`;
      bubbleEl.style.top = `${b.y}px`;
      bubbleEl.textContent = b.text;
      speechLayer.appendChild(bubbleEl);
    });
  }

  function addSpeechBubble(targetCharIndex, text) {
    let char = charactersList[targetCharIndex];
    if (!char) {
      // Chọn ngẫu nhiên 1 nhân vật trong điện
      char = charactersList[Math.floor(Math.random() * charactersList.length)];
    }
    if (!char) return;

    const bubbleObj = {
      x: char.screenX,
      y: char.screenY - 18,
      text: text,
      createdAt: Date.now()
    };
    speechBubbles.push(bubbleObj);

    setTimeout(() => {
      const idx = speechBubbles.indexOf(bubbleObj);
      if (idx !== -1) speechBubbles.splice(idx, 1);
    }, 4500);
  }

  // ========================================================
  // 10. BỘ TỔNG HỢP ÂM THANH WEB AUDIO API (NO-EXTERNAL MP3)
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

  function playBellSound() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [130.8, 261.6, 523.2, 784.8, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.998, now + 5.2);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime([0.7, 0.5, 0.35, 0.2, 0.1][idx], now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 5.6);
    });
  }

  function playWoodblockSound() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;
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
    gain.gain.linearRampToValueAtTime(0.75, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  function playBeadClickSound() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.04);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // AI Voice xướng Sớ Cầu An
  function speakChanting(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.pitch = 0.88;
    utterance.rate = 0.86;

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VN'));
    if (viVoice) utterance.voice = viVoice;

    chantingText.textContent = text;
    chantingBanner.classList.add('show');
    utterance.onend = () => {
      setTimeout(() => chantingBanner.classList.remove('show'), 3500);
    };
    window.speechSynthesis.speak(utterance);
  }

  // ========================================================
  // 11. ANIMATION RENDER LOOP (60 FPS)
  // ========================================================
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // 1. Xoay vòng hào quang Phật
    if (haloGroup) {
      haloGroup.rotation.z = time * 0.25;
    }

    // 2. Cập nhật nhân vật Chibi 3D (Hít thở & Lạy Phật)
    charactersList.forEach(char => {
      if (char.isBowing) {
        // Hoạt ảnh cúi lạy 3D
        char.bowProgress += delta * 1.8;
        // Bẻ cong thân người góc 70 độ cúi sát thảm
        const bowAngle = Math.sin(char.bowProgress * Math.PI) * 1.2;
        char.bodyPivot.rotation.x = bowAngle;

        if (char.bowProgress >= 1.0) {
          char.bowProgress = 0;
          char.bowRepeat--;
          if (char.bowRepeat <= 0) {
            char.isBowing = false;
            char.bodyPivot.rotation.x = 0;
          }
        }
      } else {
        // Nhịp thở thiền êm dịu
        const breath = Math.sin(time * 2.2 + char.idleOffset) * 0.025;
        char.bodyPivot.position.y = 0.2 + breath;
      }
    });

    // 3. Mưa cánh hoa sen 3D
    petalsList.forEach(petal => {
      petal.position.y -= petal.userData.speedY;
      petal.rotation.x += petal.userData.rotSpeedX;
      petal.rotation.y += petal.userData.rotSpeedY;
      petal.position.x += Math.sin(time + petal.userData.swayOffset) * 0.008;

      if (petal.position.y < 0.05) {
        resetPetal(petal);
      }
    });

    // 4. Khói trầm 3D bay lên
    smokeParticles.forEach(p => {
      p.position.y += p.userData.speedY;
      p.position.x += p.userData.driftX + Math.sin(time * 2 + p.position.y) * 0.005;
      p.position.z += p.userData.driftZ;
      p.scale.addScalar(0.012);

      // Mờ dần theo độ cao
      if (p.position.y > 6.5) {
        p.position.set(0, 2.36, -5.6);
        p.scale.set(1, 1, 1);
      }
    });

    // 5. Cập nhật nhãn tên và bong bóng lời khấn
    update3DLabelsAndBubbles();

    renderer.render(scene, camera);
  }

  // ========================================================
  // 12. GẮN SỰ KIỆN TƯƠNG TÁC NGƯỜI DÙNG & TIKTOK LIVE
  // ========================================================
  function setupUIEvents() {
    // Nút Lạy Phật
    btnActionBow.addEventListener('click', () => {
      triggerBowing(-1, 3);
      addSpeechBubble(-1, 'Ngũ thể đầu địa, chí tâm đảnh lễ Tam Bảo 🙏');
      sendWsAction('bow');
    });

    // Nút Tràng Hạt 108 Hạt
    btnActionBeads.addEventListener('click', () => {
      beadsWidget.classList.toggle('show');
    });

    btnCountBead.addEventListener('click', () => {
      prayerBeadCount = (prayerBeadCount + 1) % 109;
      if (prayerBeadCount === 0) prayerBeadCount = 1;
      currentBead.textContent = prayerBeadCount;
      playBeadClickSound();

      if (prayerBeadCount === 108) {
        playBellSound();
        addSpeechBubble(-1, 'Hoàn mãn 108 biến Niệm Phật • Công đức vô lượng 📿');
      }
    });

    btnCloseBeads.addEventListener('click', () => {
      beadsWidget.classList.remove('show');
    });

    // Nút Tụng Kinh
    btnActionChant.addEventListener('click', () => {
      playBellSound();
      for (let i = 0; i < 5; i++) {
        setTimeout(playWoodblockSound, 400 + i * 260);
      }
      addSpeechBubble(-1, 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật 🙏');
      sendWsAction('woodblock', { count: 5 });
    });

    // Nút Thiền Định
    btnActionMeditate.addEventListener('click', () => {
      playBellSound();
      addSpeechBubble(-1, 'Tĩnh tọa nhiếp tâm • Thân an tâm lạc 🧘');
    });

    // Nút Dâng Lễ / Thắp Nhang
    btnActionOffer.addEventListener('click', () => {
      playBellSound();
      triggerBowing(-1, 1);
      addSpeechBubble(-1, 'Thành tâm thắp nén tâm hương cúng dường Tam Bảo 🪔');
      sendWsAction('incense');
    });

    // Nút Rút Quẻ
    btnActionFortune.addEventListener('click', () => {
      sendWsAction('divination');
      openFortuneModalDirectly();
    });

    closeFortuneBtn.addEventListener('click', () => {
      fortuneModal.classList.remove('open');
    });

    // Đổi góc nhìn Camera
    btnCameraAngle.addEventListener('click', () => {
      cameraMode = 1 - cameraMode;
      setCameraPosition(cameraMode);
    });

    // Bật/tắt âm thanh
    btnToggleSound.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundText.textContent = soundEnabled ? 'Bật Âm' : 'Tắt Âm';
    });

    // Gửi lời khấn nguyện
    function handleSendPrayer() {
      const text = prayerInput.value.trim();
      if (!text) return;
      addSpeechBubble(-1, text);
      playWoodblockSound();
      sendWsAction('chat', { text });
      prayerInput.value = '';
    }

    btnSendPrayer.addEventListener('click', handleSendPrayer);
    prayerInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleSendPrayer();
    });

    // Quick Prayer Chips
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-text');
        prayerInput.value = text;
        handleSendPrayer();
      });
    });

    // Ẩn UI cho OBS (Clean Mode)
    btnObsClean.addEventListener('click', () => {
      bottomActionBar.classList.toggle('hidden-obs');
    });

    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'h' || e.key === 'H') {
        bottomActionBar.classList.toggle('hidden-obs');
      } else if (e.key === ' ' || e.key === 'm') {
        playWoodblockSound();
      } else if (e.key === 'b') {
        playBellSound();
      }
    });
  }

  // Mở modal quẻ xăm mẫu nếu offline
  function openFortuneModalDirectly(fortuneData) {
    playBellSound();
    const data = fortuneData || {
      number: 1,
      title: 'THƯỢNG THƯỢNG CÁT',
      poem: 'Đầu xuân mưa thuận gió êm đềm,\nTrời ban phúc lộc đến thềm nhà xưa.\nMuôn việc hanh thông chẳng quản vừa,\nTâm thành tích đức phúc khôn ngơi.',
      meaning: 'Cầu tài đại cát, gia đạo an khang. Mọi mong ước nay sắp thành hiện thực.',
      advice: 'Giữ tâm khiêm tốn, giúp đỡ người nghèo khó để phước báu được lâu dài.'
    };
    fortuneNum.textContent = `QUẺ SỐ 0${data.number || 1}`;
    fortuneTitle.textContent = data.title;
    fortunePoem.innerHTML = data.poem.replace(/\n/g, '<br>');
    fortuneMeaning.textContent = data.meaning;
    fortuneAdvice.textContent = data.advice;
    fortuneModal.classList.add('open');
  }

  // ========================================================
  // 13. KẾT NỐI WEBSOCKET ĐỒNG BỘ TIKTOK LIVE & LOCAL IP
  // ========================================================
  function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}`;
    ws = new WebSocket(wsUrl);

    ws.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);
        handleServerEvent(payload.type, payload.data);
      } catch (err) {
        console.error(err);
      }
    };

    ws.onclose = () => {
      setTimeout(connectWebSocket, 3000);
    };
  }

  function sendWsAction(action, extra = {}) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action, ...extra }));
    }
  }

  function handleServerEvent(type, data) {
    switch (type) {
      case 'init':
        if (data.visitor) {
          myVisitorInfo = data.visitor;
          myDharmaName.textContent = data.visitor.name;
        }
        break;

      case 'chat_message':
        addSpeechBubble(-1, data.text);
        playWoodblockSound();
        break;

      case 'ceremony_incense':
        playBellSound();
        addSpeechBubble(-1, `Thí chủ ${data.name} thắp nén tâm hương cúng dường Tam Bảo 🪔`);
        triggerBowing(-1, 1);
        break;

      case 'ceremony_bow':
        addSpeechBubble(-1, `Phật tử ${data.name} chí tâm đảnh lễ Tam Bái 🙏`);
        triggerBowing(-1, 3);
        break;

      case 'ceremony_lotus':
        playBellSound();
        addSpeechBubble(-1, `Phật tử ${data.name} dâng đóa sen thanh khiết lên Tam Bảo 🌸`);
        break;

      case 'ceremony_fruit':
        playBellSound();
        addSpeechBubble(-1, `Thí chủ ${data.name} dâng mâm ngũ quả cúng dường 🍎`);
        break;

      case 'ceremony_great':
        playBellSound();
        triggerBowing(-1, 3);
        addSpeechBubble(-1, `ĐẠI LỄ CÚNG DƯỜNG: Thí chủ ${data.name} phát tâm bồ đề! 🪷`);
        break;

      case 'divination_result':
        openFortuneModalDirectly(data.fortune);
        break;

      case 'so_chanting':
        playBellSound();
        speakChanting(data.text);
        break;
    }
  }

  // Tự động sinh bình luận chân thực nếu ở chế độ demo (như Mẫu 2)
  function initViralPrayerSimulator() {
    const VIRAL_PRAYERS = [
      'cầu cho con trúng 2 tỷ vé số',
      'cho con vượt qua hết môn',
      'Đạt học bổng',
      'cho con quay lại với nyc',
      'ielts đạt aim, A di đà phật....',
      'Nam mô a di đà phật 🙏',
      'Cầu cho ba mẹ luôn mạnh khỏe bình an',
      'Xin que đầu tháng ạ 🎋',
      'Cầu cho công việc tháng này đạt kpi',
      'cho tui lên manifest học sinh xuất sắc'
    ];

    setInterval(() => {
      const randomPrayer = VIRAL_PRAYERS[Math.floor(Math.random() * VIRAL_PRAYERS.length)];
      addSpeechBubble(-1, randomPrayer);
    }, 6000);
  }

  // Khởi động
  init3DScene();
  setupUIEvents();
  connectWebSocket();
  initViralPrayerSimulator();
  animate();

})();
