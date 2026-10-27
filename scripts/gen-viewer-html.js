const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '..', 'assets', 'viewer', 'three-bundle.min.js');
const threeCode = fs.readFileSync(bundlePath, 'utf8');

const modelsDir = path.join(__dirname, '..', 'assets', 'models');
const leopardBase64 = fs.readFileSync(path.join(modelsDir, 'Leopard.glb')).toString('base64');
const langurBase64 = fs.readFileSync(path.join(modelsDir, 'Langur.glb')).toString('base64');
const pangolinBase64 = fs.readFileSync(path.join(modelsDir, 'Pangolin.glb')).toString('base64');

const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent !important;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
      touch-action: none;
    }
    #canvas-container {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    }
    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #fde68a;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      background: rgba(15, 23, 42, 0.82);
      border: 1px solid rgba(251, 191, 36, 0.35);
      padding: 10px 22px;
      border-radius: 999px;
      display: none;
      pointer-events: none;
      backdrop-filter: blur(8px);
    }
  </style>
  <script>
` + threeCode + `
  </script>
</head>
<body>
  <div id="canvas-container"></div>
  <div id="loading">Preparing 3D Exhibit...</div>
  <script>
    const EMBEDDED_MODELS = {
      leopard: "` + leopardBase64 + `",
      langur: "` + langurBase64 + `",
      pangolin: "` + pangolinBase64 + `"
    };

    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 120);
    camera.position.set(0, 1.35, 4.4);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 1.4;
    controls.maxDistance = 9.5;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minPolarAngle = 0.15;
    controls.target.set(0, 0.75, 0);

    // ── Studio & Museum Lighting ──
    const ambientLight = new THREE.AmbientLight(0xfff8eb, 1.35);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff3db, 2.0);
    keyLight.position.set(4, 9, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcbe5ff, 0.85);
    fillLight.position.set(-5, 4, -4);
    scene.add(fillLight);

    const museumSpot = new THREE.PointLight(0xffd685, 1.6, 18);
    museumSpot.position.set(0, 5.5, 0.5);
    scene.add(museumSpot);

    // ── 3D Natural History Museum Environment (Visible in 3D Studio Mode) ──
    const museumGroup = new THREE.Group();
    scene.add(museumGroup);

    function createMarbleFloorTexture() {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#26211d';
      ctx.fillRect(0, 0, 512, 512);

      // Coffered museum stone tiles (2x2 per texture repeat)
      const tileSize = 256;
      for (let ty = 0; ty < 2; ty++) {
        for (let tx = 0; tx < 2; tx++) {
          const x = tx * tileSize;
          const y = ty * tileSize;
          const isAlt = (tx + ty) % 2 === 0;
          const grad = ctx.createLinearGradient(x, y, x + tileSize, y + tileSize);
          if (isAlt) {
            grad.addColorStop(0, '#362f29');
            grad.addColorStop(0.5, '#3e362f');
            grad.addColorStop(1, '#2f2924');
          } else {
            grad.addColorStop(0, '#2d2722');
            grad.addColorStop(0.5, '#352e28');
            grad.addColorStop(1, '#27221e');
          }
          ctx.fillStyle = grad;
          ctx.fillRect(x + 3, y + 3, tileSize - 6, tileSize - 6);

          // Subtle brass/stone inlay border
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.16)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 10, y + 10, tileSize - 20, tileSize - 20);
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(9, 9);
      return tex;
    }

    function createMuseumWallTexture() {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');

      // Upper gallery wall (warm museum Venetian plaster)
      const wallGrad = ctx.createLinearGradient(0, 0, 0, 512);
      wallGrad.addColorStop(0, '#171c26');
      wallGrad.addColorStop(0.12, '#252b38');
      wallGrad.addColorStop(0.68, '#383028');
      wallGrad.addColorStop(0.72, '#b89246'); // Gold chair rail
      wallGrad.addColorStop(0.74, '#241a14'); // Dark walnut wainscoting
      wallGrad.addColorStop(1.0, '#16100c');
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, 512, 512);

      // Wainscoting recessed wood panels
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.28)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        ctx.strokeRect(i * 128 + 14, 392, 100, 96);
      }

      // Upper gallery architectural trim
      ctx.strokeStyle = 'rgba(255, 235, 190, 0.08)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.strokeRect(i * 128 + 18, 64, 92, 260);
      }

      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(8, 1);
      return tex;
    }

    function createExhibitBannerTexture(title, subtitle, badge) {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 340;
      const ctx = c.getContext('2d');

      // Ornate gold outer frame
      ctx.fillStyle = '#9a7832';
      ctx.fillRect(0, 0, 512, 340);
      ctx.fillStyle = '#1b2420';
      ctx.fillRect(14, 14, 484, 312);
      ctx.strokeStyle = '#e5c168';
      ctx.lineWidth = 3;
      ctx.strokeRect(24, 24, 464, 292);

      // Subtle radial spotlight inside frame
      const rad = ctx.createRadialGradient(256, 150, 20, 256, 170, 240);
      rad.addColorStop(0, 'rgba(45, 78, 62, 0.9)');
      rad.addColorStop(1, 'rgba(15, 24, 20, 0.98)');
      ctx.fillStyle = rad;
      ctx.fillRect(26, 26, 460, 288);

      // Museum Header
      ctx.fillStyle = '#e5c168';
      ctx.font = 'bold 15px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('NATIONAL MUSEUM OF NATURAL HISTORY', 256, 68);

      // Divider line
      ctx.fillStyle = 'rgba(229, 193, 104, 0.45)';
      ctx.fillRect(120, 84, 272, 1.5);

      // Main Exhibit Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Georgia, serif';
      ctx.fillText(title, 256, 145);

      // Scientific / Subtitle
      ctx.fillStyle = '#a7f3d0';
      ctx.font = 'italic 19px Georgia, serif';
      ctx.fillText(subtitle, 256, 185);

      // Conservation Badge
      ctx.fillStyle = 'rgba(229, 193, 104, 0.18)';
      ctx.fillRect(146, 225, 220, 38);
      ctx.strokeStyle = '#e5c168';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(146, 225, 220, 38);
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(badge, 256, 249);

      return new THREE.CanvasTexture(c);
    }

    function buildMuseumEnvironment() {
      // 1. Polished Marble Floor
      const floorGeo = new THREE.CircleGeometry(13.5, 64);
      const floorMat = new THREE.MeshStandardMaterial({
        map: createMarbleFloorTexture(),
        roughness: 0.35,
        metalness: 0.15
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.y = -0.46;
      museumGroup.add(floorMesh);

      // 2. Multi-tiered Exhibition Pedestal (Plinth) right under y = 0
      // Top natural habitat pad (feet rest at y = 0)
      const topPadGeo = new THREE.CylinderGeometry(1.38, 1.42, 0.06, 64);
      const topPadMat = new THREE.MeshStandardMaterial({ color: 0x2b3329, roughness: 0.85 });
      const topPad = new THREE.Mesh(topPadGeo, topPadMat);
      topPad.position.y = -0.03;
      museumGroup.add(topPad);

      // Glowing Museum LED Rim Ring
      const ledRingGeo = new THREE.CylinderGeometry(1.44, 1.44, 0.025, 64);
      const ledRingMat = new THREE.MeshBasicMaterial({ color: 0xffd885 });
      const ledRing = new THREE.Mesh(ledRingGeo, ledRingMat);
      ledRing.position.y = -0.065;
      museumGroup.add(ledRing);

      // Main Walnut & Brass Plinth Cylinder
      const plinthGeo = new THREE.CylinderGeometry(1.52, 1.60, 0.28, 64);
      const plinthMat = new THREE.MeshStandardMaterial({ color: 0x2a1b12, roughness: 0.45, metalness: 0.1 });
      const plinth = new THREE.Mesh(plinthGeo, plinthMat);
      plinth.position.y = -0.21;
      museumGroup.add(plinth);

      // Brass Accent Trim Rings
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.85 });
      const trimTop = new THREE.Mesh(new THREE.CylinderGeometry(1.54, 1.54, 0.025, 64), brassMat);
      trimTop.position.y = -0.085;
      museumGroup.add(trimTop);

      const trimBot = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 0.03, 64), brassMat);
      trimBot.position.y = -0.34;
      museumGroup.add(trimBot);

      // Lower Marble Step Base
      const baseStepGeo = new THREE.CylinderGeometry(1.88, 1.98, 0.11, 64);
      const baseStepMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.3, metalness: 0.2 });
      const baseStep = new THREE.Mesh(baseStepGeo, baseStepMat);
      baseStep.position.y = -0.405;
      museumGroup.add(baseStep);

      // 3. Brass Stanchion Posts & Velvet Barrier Ropes around Pedestal
      const numPosts = 8;
      const postRadius = 2.28;
      const ropeMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.7, metalness: 0.05 });

      for (let i = 0; i < numPosts; i++) {
        const angle = (i / numPosts) * Math.PI * 2;
        const px = Math.cos(angle) * postRadius;
        const pz = Math.sin(angle) * postRadius;

        // Post base
        const pBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.04, 20), brassMat);
        pBase.position.set(px, -0.44, pz);
        museumGroup.add(pBase);

        // Post pole
        const pPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 16), brassMat);
        pPole.position.set(px, -0.08, pz);
        museumGroup.add(pPole);

        // Post finial ball
        const pBall = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), brassMat);
        pBall.position.set(px, 0.30, pz);
        museumGroup.add(pBall);

        // Sagging velvet rope to next post
        const nextAngle = ((i + 1) / numPosts) * Math.PI * 2;
        const nx = Math.cos(nextAngle) * postRadius;
        const nz = Math.sin(nextAngle) * postRadius;

        const ropeSegments = 10;
        for (let s = 0; s < ropeSegments; s++) {
          const t1 = s / ropeSegments;
          const t2 = (s + 1) / ropeSegments;
          const tm = (t1 + t2) * 0.5;
          const mx = px + (nx - px) * tm;
          const mz = pz + (nz - pz) * tm;
          const sag = Math.sin(tm * Math.PI) * 0.14;
          const my = 0.24 - sag;

          const seg = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), ropeMat);
          seg.scale.set(1, 1, 2.6);
          seg.position.set(mx, my, mz);
          seg.lookAt(nx, 0.24 - Math.sin(t2 * Math.PI) * 0.14, nz);
          museumGroup.add(seg);
        }
      }

      // 4. Museum Rotunda Gallery Walls
      const wallGeo = new THREE.CylinderGeometry(11.2, 11.2, 7.5, 48, 1, true);
      const wallMat = new THREE.MeshStandardMaterial({
        map: createMuseumWallTexture(),
        side: THREE.BackSide,
        roughness: 0.75
      });
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      wallMesh.position.y = 3.25;
      museumGroup.add(wallMesh);

      // 5. Classical Museum Columns around the Rotunda
      const columnMat = new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.45, metalness: 0.08 });
      const colRadius = 10.55;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const cx = Math.cos(a) * colRadius;
        const cz = Math.sin(a) * colRadius;

        const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 6.8, 24), columnMat);
        colShaft.position.set(cx, 3.0, cz);
        museumGroup.add(colShaft);

        const colBase = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.45, 0.82), columnMat);
        colBase.position.set(cx, -0.22, cz);
        museumGroup.add(colBase);

        const colCap = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.35, 0.86), brassMat);
        colCap.position.set(cx, 6.45, cz);
        museumGroup.add(colCap);
      }

      // 6. Framed Museum Exhibition Wall Panels
      const bannerData = [
        { title: 'SRI LANKAN LEOPARD', sub: 'Panthera pardus kotiya', badge: 'APEX PREDATOR EXHIBIT' },
        { title: 'PURPLE-FACED LANGUR', sub: 'Semnopithecus vetulus', badge: 'ENDEMIC CANOPY EXHIBIT' },
        { title: 'INDIAN PANGOLIN', sub: 'Manis crassicaudata', badge: 'NOCTURNAL ARMOR EXHIBIT' },
        { title: 'ECHOES OF THE WILD', sub: 'Biodiversity Heritage Hall', badge: 'CONSERVATION GALLERY' }
      ];

      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const bx = Math.cos(a) * 10.75;
        const bz = Math.sin(a) * 10.75;
        const bTex = createExhibitBannerTexture(bannerData[i].title, bannerData[i].sub, bannerData[i].badge);
        const panelMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(3.4, 2.25),
          new THREE.MeshBasicMaterial({ map: bTex })
        );
        panelMesh.position.set(bx, 2.55, bz);
        panelMesh.lookAt(0, 2.55, 0);
        museumGroup.add(panelMesh);
      }

      // 7. Overhead Museum Volumetric Spotlight Cone
      const coneGeo = new THREE.ConeGeometry(2.15, 5.8, 48, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xffe4a0,
        transparent: true,
        opacity: 0.065,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const lightCone = new THREE.Mesh(coneGeo, coneMat);
      lightCone.position.y = 2.4;
      museumGroup.add(lightCone);
    }

    buildMuseumEnvironment();

    // ── True In-App AR Surface Detection & Floor Anchor Visuals ──
    const arGroup = new THREE.Group();
    scene.add(arGroup);

    // 1. Surface Scanning Point-Cloud & Reticle (Visible while detecting floor)
    const arScanGridGroup = new THREE.Group();
    arGroup.add(arScanGridGroup);

    function createARReticleTexture() {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 512, 512);

      // Outer dashed ring
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
      ctx.lineWidth = 6;
      ctx.setLineDash([28, 18]);
      ctx.beginPath();
      ctx.arc(256, 256, 220, 0, Math.PI * 2);
      ctx.stroke();

      // Inner solid ring
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(256, 256, 150, 0, Math.PI * 2);
      ctx.stroke();

      // Surface feature dots (ARCore style point cloud on plane)
      ctx.fillStyle = 'rgba(52, 211, 153, 0.85)';
      const rings = [55, 105, 150, 195];
      rings.forEach((r, ri) => {
        const count = 8 + ri * 6;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + ri * 0.3;
          const px = 256 + Math.cos(a) * r;
          const py = 256 + Math.sin(a) * r;
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Center target cross
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(236, 256); ctx.lineTo(276, 256);
      ctx.moveTo(256, 236); ctx.lineTo(256, 276);
      ctx.stroke();

      return new THREE.CanvasTexture(c);
    }

    const reticlePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 2.3),
      new THREE.MeshBasicMaterial({
        map: createARReticleTexture(),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    reticlePlane.rotation.x = -Math.PI / 2;
    reticlePlane.position.y = 0.005;
    arScanGridGroup.add(reticlePlane);

    const pulseRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.26, 48),
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    pulseRingMesh.rotation.x = -Math.PI / 2;
    pulseRingMesh.position.y = 0.008;
    arScanGridGroup.add(pulseRingMesh);

    // 2. Ground Shadow Catcher & Subtle Surface Anchor Ring (Visible after surface lock)
    const arPlacedFloorGroup = new THREE.Group();
    arPlacedFloorGroup.visible = false;
    arGroup.add(arPlacedFloorGroup);

    function createContactShadowTexture() {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
      g.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
      g.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    }

    const contactShadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({
        map: createContactShadowTexture(),
        transparent: true,
        depthWrite: false
      })
    );
    contactShadowMesh.rotation.x = -Math.PI / 2;
    contactShadowMesh.position.y = 0.002;
    arPlacedFloorGroup.add(contactShadowMesh);

    const anchorRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(1.05, 1.09, 64),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    anchorRingMesh.rotation.x = -Math.PI / 2;
    anchorRingMesh.position.y = 0.004;
    arPlacedFloorGroup.add(anchorRingMesh);

    // ── Model Container ──
    const currentModelGroup = new THREE.Group();
    scene.add(currentModelGroup);

    let baseScale = 1;
    let userScaleMultiplier = 1;
    let spawnAnimScale = 1;
    let modelHeightCenter = 0.7;
    let mixer = null;
    let currentSpeciesKey = '';
    let isARMode = false;

    // AR Surface Detection & IMU World-Space Tracking State
    let arSurfaceState = 'SCANNING'; // 'SCANNING' | 'LOCKED'
    let surfaceProgress = 0;
    let lastReportedProgress = -1;
    let sensorPitch = 0.42;
    let sensorRoll = 0.0;
    let sensorYaw = 0.0;
    let sensorStability = 0.85;
    let anchorPitch = 0.42;
    let anchorYaw = 0.0;
    let userYawOffset = 0.0;
    let arWorldOffsetX = 0.0;
    let arWorldOffsetZ = 0.0;
    let arCameraDistance = 4.1;
    let autoRotateEnabled = false;

    const clock = new THREE.Clock();

    function notifyRN(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        } catch (e) {}
      }
    }

    function lockARSurface() {
      if (arSurfaceState === 'LOCKED') return;
      arSurfaceState = 'LOCKED';
      surfaceProgress = 100;
      anchorPitch = sensorPitch;
      anchorYaw = sensorYaw;
      arScanGridGroup.visible = false;
      arPlacedFloorGroup.visible = true;
      currentModelGroup.visible = true;
      spawnAnimScale = 0.05;
      notifyRN({ type: 'AR_STATUS', state: 'LOCKED', progress: 100 });
    }

    window.resetARSurface = function() {
      if (!isARMode) {
        userScaleMultiplier = 1.0;
        userYawOffset = 0.0;
        currentModelGroup.rotation.y = 0;
        camera.position.set(0, 1.35, 4.4);
        controls.target.set(0, modelHeightCenter, 0);
        controls.update();
        return;
      }
      arSurfaceState = 'SCANNING';
      surfaceProgress = 0;
      lastReportedProgress = -1;
      arWorldOffsetX = 0;
      arWorldOffsetZ = 0;
      currentModelGroup.visible = false;
      arScanGridGroup.visible = true;
      arPlacedFloorGroup.visible = false;
      notifyRN({ type: 'AR_STATUS', state: 'SCANNING', progress: 0 });
    };

    // Receive hardware IMU orientation from NativeARModule.kt
    window.onNativeSensor = function(pitch, roll, yaw, stability) {
      sensorPitch = pitch;
      sensorRoll = roll;
      sensorYaw = yaw;
      sensorStability = stability;
    };

    // Touch gesture handling in AR mode (1-finger rotate/move on floor, 2-finger pinch scale)
    let touchCount = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let lastPinchDist = 0;
    let touchMoved = false;

    renderer.domElement.addEventListener('touchstart', (e) => {
      if (!isARMode) return;
      touchCount = e.touches.length;
      touchMoved = false;
      if (touchCount === 1) {
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      } else if (touchCount === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist = Math.hypot(dx, dy);
      }
    }, { passive: true });

    renderer.domElement.addEventListener('touchmove', (e) => {
      if (!isARMode) return;
      touchMoved = true;
      if (e.touches.length === 1 && touchCount === 1 && arSurfaceState === 'LOCKED') {
        const cx = e.touches[0].clientX;
        const cy = e.touches[0].clientY;
        const dx = cx - lastTouchX;
        const dy = cy - lastTouchY;
        lastTouchX = cx;
        lastTouchY = cy;

        // Rotate animal on surface horizontally, and slide depth on surface vertically
        userYawOffset += dx * 0.012;
        arWorldOffsetZ = Math.max(-2.2, Math.min(2.0, arWorldOffsetZ + dy * 0.008));
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (lastPinchDist > 10) {
          const ratio = dist / lastPinchDist;
          userScaleMultiplier = Math.max(0.4, Math.min(2.8, userScaleMultiplier * ratio));
        }
        lastPinchDist = dist;
      }
    }, { passive: true });

    renderer.domElement.addEventListener('touchend', (e) => {
      if (!isARMode) return;
      // If user taps on the detected floor reticle during scanning, lock immediately!
      if (!touchMoved && touchCount === 1 && arSurfaceState === 'SCANNING' && surfaceProgress > 20) {
        lockARSurface();
      }
      touchCount = e.touches.length;
    }, { passive: true });

    function animate() {
      requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);

      if (mixer && (!isARMode || arSurfaceState === 'LOCKED')) {
        mixer.update(delta);
      }

      if (isARMode) {
        controls.enabled = false;

        if (arSurfaceState === 'SCANNING') {
          // Rotate and pulse the floor scanning reticle
          reticlePlane.rotation.z += delta * 0.55;
          const pulse = ( (clock.getElapsedTime() * 1.4) % 1 );
          const pScale = 0.3 + pulse * 4.0;
          pulseRingMesh.scale.set(pScale, pScale, 1);
          pulseRingMesh.material.opacity = (1 - pulse) * 0.75;

          // Tilt camera with real device pitch/roll so reticle lies flat on real floor perspective
          const scanElev = Math.max(0.22, Math.min(1.25, 0.48 + (sensorPitch - 0.35) * 0.65));
          const camDist = 3.8;
          camera.position.set(
            Math.sin(sensorYaw * 0.35) * 0.4,
            Math.sin(scanElev) * camDist,
            Math.cos(scanElev) * camDist
          );
          camera.lookAt(0, 0, 0);
          camera.rotation.z = -sensorRoll * 0.35;

          // Progress surface detection when phone is held steady pointing at floor/table
          const rate = sensorStability > 0.25 ? 72 : 28;
          surfaceProgress = Math.min(100, surfaceProgress + delta * rate);
          const rounded = Math.round(surfaceProgress);
          if (Math.abs(rounded - lastReportedProgress) >= 5 || rounded >= 100) {
            lastReportedProgress = rounded;
            notifyRN({ type: 'AR_STATUS', state: 'SCANNING', progress: rounded });
          }
          if (surfaceProgress >= 100) {
            lockARSurface();
          }
        } else {
          // SURFACE_LOCKED: Smoothly spring-in the animal on the floor surface
          if (spawnAnimScale < 1.0) {
            spawnAnimScale = Math.min(1.0, spawnAnimScale + delta * 2.8);
          }
          const effectiveScale = baseScale * userScaleMultiplier * spawnAnimScale;
          currentModelGroup.scale.set(effectiveScale, effectiveScale, effectiveScale);

          if (autoRotateEnabled) {
            userYawOffset += delta * 0.65;
          }
          currentModelGroup.rotation.y = userYawOffset;
          currentModelGroup.position.set(arWorldOffsetX, 0, arWorldOffsetZ);
          arPlacedFloorGroup.position.set(arWorldOffsetX, 0, arWorldOffsetZ);
          const shadowScale = userScaleMultiplier * spawnAnimScale;
          arPlacedFloorGroup.scale.set(shadowScale, 1, shadowScale);

          // Fade subtle emerald anchor ring after placement so animal looks naturally grounded
          if (anchorRingMesh.material.opacity > 0.14) {
            anchorRingMesh.material.opacity = Math.max(0.14, anchorRingMesh.material.opacity - delta * 0.15);
          }

          // World-Space Anchored Camera Tracking from Hardware Gyroscope / Rotation Vector!
          // Moving/tilting the phone shifts the camera view angle relative to the floor anchor,
          // so the 3D animal stays planted on the physical floor instead of sticking to the screen!
          const relYaw = sensorYaw - anchorYaw;
          const relPitch = sensorPitch - anchorPitch;

          const elev = Math.max(0.12, Math.min(1.32, 0.36 + relPitch * 0.75));
          const camY = Math.sin(elev) * arCameraDistance;
          const camHoriz = Math.cos(elev) * arCameraDistance;

          // Position camera and shift lookAt target opposite to phone pan/tilt
          // so turning phone right moves floor & animal left in viewport (world-locked!)
          camera.position.set(0, camY, camHoriz);
          const lookOffsetX = Math.tan(Math.max(-1.1, Math.min(1.1, relYaw))) * arCameraDistance * 0.92;
          const lookOffsetY = (modelHeightCenter * userScaleMultiplier) - Math.tan(Math.max(-0.85, Math.min(0.85, relPitch))) * arCameraDistance * 0.78;
          camera.lookAt(lookOffsetX, lookOffsetY, 0);
          camera.rotation.z = -sensorRoll * 0.45;
        }
      } else {
        // 3D MUSEUM HALL MODE
        controls.enabled = true;
        const s = baseScale * userScaleMultiplier;
        currentModelGroup.scale.set(s, s, s);
        currentModelGroup.position.set(0, 0, 0);
        if (!autoRotateEnabled) {
          currentModelGroup.rotation.y = userYawOffset;
        }
        controls.update();
      }

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    function setupModel(gltf, nameHint) {
      while (currentModelGroup.children.length > 0) {
        currentModelGroup.remove(currentModelGroup.children[0]);
      }
      if (mixer) {
        mixer.stopAllAction();
        mixer = null;
      }

      const model = gltf.scene;
      model.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Anchor animal's FEET directly on the y = 0 floor / pedestal surface!
      model.position.x = -center.x;
      model.position.y = -box.min.y;
      model.position.z = -center.z;

      const maxDim = Math.max(size.x, size.y, size.z);
      baseScale = maxDim > 0 ? (2.15 / maxDim) : 1;
      modelHeightCenter = (size.y * baseScale) * 0.45;

      const s = baseScale * userScaleMultiplier;
      currentModelGroup.scale.set(s, s, s);
      currentModelGroup.add(model);

      controls.target.set(0, modelHeightCenter, 0);

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        const activeClip = gltf.animations.find(a => /idle|walk|run|principal/i.test(a.name)) || gltf.animations[0];
        const action = mixer.clipAction(activeClip);

        const hint = (nameHint || currentSpeciesKey).toLowerCase();
        if (hint.includes('leopard') || activeClip.name.toLowerCase().includes('principal')) {
          mixer.timeScale = 0.30;
        } else if (hint.includes('langur')) {
          mixer.timeScale = 0.60;
        } else {
          mixer.timeScale = 0.50;
        }

        action.play();
      }

      document.getElementById('loading').style.display = 'none';
      notifyRN({ type: 'LOADED' });
    }

    window.showSpecies = function(speciesId) {
      const clean = (speciesId || '').toLowerCase().trim();
      let b64 = null;
      let key = 'leopard';
      if (clean.includes('langur')) {
        b64 = EMBEDDED_MODELS.langur;
        key = 'langur';
      } else if (clean.includes('pangolin')) {
        b64 = EMBEDDED_MODELS.pangolin;
        key = 'pangolin';
      } else {
        b64 = EMBEDDED_MODELS.leopard;
        key = 'leopard';
      }

      if (b64) {
        window.loadModelFromBase64(b64, key);
      }
    };

    window.loadModelFromBase64 = function(base64, nameHint) {
      if (!base64) return;
      currentSpeciesKey = (nameHint || '').toLowerCase();
      document.getElementById('loading').style.display = 'block';
      try {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const loader = new GLTFLoader();
        loader.parse(bytes.buffer, '', (gltf) => {
          setupModel(gltf, currentSpeciesKey);
        }, (err) => {
          console.error('GLTF parse error:', err);
          document.getElementById('loading').innerText = 'Could not load 3D model';
        });
      } catch (err) {
        console.error('Base64 decode error:', err);
        document.getElementById('loading').innerText = 'Could not load 3D model';
      }
    };

    window.setScaleMultiplier = function(m) {
      userScaleMultiplier = m;
    };

    window.setRotationY = function(rot) {
      userYawOffset = rot;
    };

    window.setAutoRotate = function(val) {
      autoRotateEnabled = !!val;
      controls.autoRotate = !!val;
      controls.autoRotateSpeed = 1.8;
    };

    window.setBackgroundMode = function(isAR) {
      isARMode = !!isAR;
      if (!isARMode) {
        // 3D Natural History Museum Hall Mode
        renderer.setClearColor(0x181c24, 1);
        museumGroup.visible = true;
        arGroup.visible = false;
        currentModelGroup.visible = true;
        spawnAnimScale = 1.0;
        camera.rotation.z = 0;
        camera.position.set(0, 1.35, 4.4);
        controls.target.set(0, modelHeightCenter, 0);
        controls.enabled = true;
        controls.update();
      } else {
        // True Surface-Anchored AR Mode
        renderer.setClearColor(0x000000, 0);
        museumGroup.visible = false;
        arGroup.visible = true;
        controls.enabled = false;
        window.resetARSurface();
      }
    };
  </script>
</body>
</html>
`;

const tsContent = `// Auto-generated self-contained 3D viewer HTML for React Native WebView
export const VIEWER_HTML = ${JSON.stringify(htmlTemplate)};
`;

fs.writeFileSync(path.join(__dirname, '..', 'assets', 'viewer', 'viewerHtml.ts'), tsContent, 'utf8');
console.log('viewerHtml.ts generated! Size:', fs.statSync(path.join(__dirname, '..', 'assets', 'viewer', 'viewerHtml.ts')).size);
