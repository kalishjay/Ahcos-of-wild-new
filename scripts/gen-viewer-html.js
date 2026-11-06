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
      font-family: Georgia, serif;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.8px;
      background: rgba(15, 23, 42, 0.88);
      border: 1.5px solid rgba(212, 175, 55, 0.55);
      padding: 12px 24px;
      border-radius: 999px;
      display: none;
      pointer-events: none;
    }
  </style>
  <script>
` + threeCode + `
  </script>
</head>
<body>
  <div id="canvas-container"></div>
  <div id="loading">Preparing Expedition Exhibit...</div>
  <script>
    const EMBEDDED_MODELS = {
      leopard: "` + leopardBase64 + `",
      langur: "` + langurBase64 + `",
      pangolin: "` + pangolinBase64 + `"
    };

    const SPECIES_META = {
      leopard: {
        name: 'Sri Lankan Leopard',
        sci: 'Panthera pardus kotiya',
        tag: 'ENDANGERED APEX PREDATOR'
      },
      langur: {
        name: 'Purple-faced Langur',
        sci: 'Semnopithecus vetulus',
        tag: 'CRITICALLY ENDANGERED ENDEMIC'
      },
      pangolin: {
        name: 'Sri Lankan Pangolin',
        sci: 'Manis crassicaudata',
        tag: 'VULNERABLE NOCTURNAL FORAGER'
      }
    };

    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 120);
    camera.position.set(0, 1.45, 4.6);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 1.5;
    controls.maxDistance = 9.2;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.minPolarAngle = 0.18;
    controls.target.set(0, 0.75, 0);

    // ── Rich Adventure + Museum Lighting ──
    const ambientLight = new THREE.AmbientLight(0xfff5e0, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffecc4, 2.2);
    keyLight.position.set(4.5, 9.5, 6.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
    fillLight.position.set(-5, 4, -4);
    scene.add(fillLight);

    const expeditionSpot = new THREE.PointLight(0xffbe55, 2.1, 22);
    expeditionSpot.position.set(0, 6.2, 0.5);
    scene.add(expeditionSpot);

    // ── Web Audio API: Jungle + Adventure Ambience & Authentic Species Vocalizations ──
    let audioCtx = null;
    let masterGain = null;
    let soundEnabled = true;
    let ambienceStarted = false;
    let birdInterval = null;
    let animalCallInterval = null;
    let torchLights = [];

    function initAudioEngine() {
      if (ambienceStarted) return;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = soundEnabled ? 0.85 : 0.0;
        masterGain.connect(audioCtx.destination);

        // 1. Continuous Jungle Canopy Breeze (Filtered Pink Noise)
        const bufferSize = audioCtx.sampleRate * 3;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.025;
          b6 = white * 0.115926;
        }
        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const breezeFilter = audioCtx.createBiquadFilter();
        breezeFilter.type = 'bandpass';
        breezeFilter.frequency.value = 480;
        breezeFilter.Q.value = 1.4;

        const breezeGain = audioCtx.createGain();
        breezeGain.gain.value = 0.24;
        whiteNoise.connect(breezeFilter);
        breezeFilter.connect(breezeGain);
        breezeGain.connect(masterGain);
        whiteNoise.start(0);

        // 2. Warm Adventure Expedition Atmospheric Drone Pad (Low Fifth Harmony)
        const droneFreqs = [110.0, 164.81, 220.0];
        droneFreqs.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          osc.type = idx === 1 ? 'triangle' : 'sine';
          osc.frequency.value = freq;
          const dFilter = audioCtx.createBiquadFilter();
          dFilter.type = 'lowpass';
          dFilter.frequency.value = 340;
          const dGain = audioCtx.createGain();
          dGain.gain.value = 0.038;
          osc.connect(dFilter);
          dFilter.connect(dGain);
          dGain.connect(masterGain);
          osc.start(0);
        });

        // 3. Periodic Jungle Bird Chirps & Rainforest Insect Ambience
        birdInterval = setInterval(() => {
          if (!soundEnabled || !audioCtx || audioCtx.state !== 'running') return;
          playJungleBirdChirp();
        }, 2600);

        // 4. Periodic Species-Specific Vocalization
        animalCallInterval = setInterval(() => {
          if (!soundEnabled || !audioCtx || audioCtx.state !== 'running') return;
          playSpeciesVocalization(currentSpeciesKey);
        }, 6200);

        ambienceStarted = true;
      } catch (e) {}
    }

    function resumeAudioIfNeeded() {
      if (!ambienceStarted) initAudioEngine();
      if (audioCtx && audioCtx.state === 'suspended' && soundEnabled) {
        audioCtx.resume().catch(() => {});
      }
    }

    function playJungleBirdChirp() {
      if (!audioCtx || !masterGain) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      const baseFreq = 1950 + Math.random() * 1100;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.32, now + 0.09);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.88, now + 0.22);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.34);

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.055, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.4);
    }

    // Authentic physical-modeling synthesis for each of the 3 Sri Lankan species
    function playSpeciesVocalization(speciesKey) {
      if (!audioCtx || !masterGain || !soundEnabled) return;
      resumeAudioIfNeeded();
      const now = audioCtx.currentTime;
      const key = (speciesKey || currentSpeciesKey || 'leopard').toLowerCase();

      if (key.includes('leopard')) {
        // 🐆 Sri Lankan Leopard: Deep guttural sawing roar & chest growl (Panthera pardus kotiya)
        const pulses = [0.0, 0.42, 0.86];
        pulses.forEach((offset, idx) => {
          const t0 = now + offset;
          const dur = idx === 1 ? 0.38 : 0.32;

          const saw = audioCtx.createOscillator();
          saw.type = 'sawtooth';
          const peakFreq = idx === 1 ? 118 : 96;
          saw.frequency.setValueAtTime(68, t0);
          saw.frequency.linearRampToValueAtTime(peakFreq, t0 + dur * 0.35);
          saw.frequency.exponentialRampToValueAtTime(54, t0 + dur);

          const sub = audioCtx.createOscillator();
          sub.type = 'triangle';
          sub.frequency.setValueAtTime(36, t0);
          sub.frequency.linearRampToValueAtTime(58, t0 + dur * 0.35);
          sub.frequency.exponentialRampToValueAtTime(28, t0 + dur);

          // Vocal tract throat formant filter
          const formant = audioCtx.createBiquadFilter();
          formant.type = 'bandpass';
          formant.frequency.setValueAtTime(240, t0);
          formant.frequency.linearRampToValueAtTime(420, t0 + dur * 0.4);
          formant.frequency.linearRampToValueAtTime(190, t0 + dur);
          formant.Q.value = 2.2;

          const env = audioCtx.createGain();
          env.gain.setValueAtTime(0.001, t0);
          env.gain.linearRampToValueAtTime(0.28, t0 + 0.06);
          env.gain.exponentialRampToValueAtTime(0.002, t0 + dur);

          saw.connect(formant);
          sub.connect(formant);
          formant.connect(env);
          env.connect(masterGain);

          saw.start(t0);
          sub.start(t0);
          saw.stop(t0 + dur + 0.02);
          sub.stop(t0 + dur + 0.02);
        });
      } else if (key.includes('langur')) {
        // 🐒 Purple-faced Langur: Resonant rainforest canopy territorial whoop ("Hoo-ahoo-wah!")
        const notes = [
          { off: 0.0, f1: 310, f2: 520, d: 0.26 },
          { off: 0.30, f1: 380, f2: 740, d: 0.34 },
          { off: 0.68, f1: 680, f2: 340, d: 0.42 }
        ];
        notes.forEach((n) => {
          const t0 = now + n.off;
          const osc = audioCtx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(n.f1, t0);
          osc.frequency.exponentialRampToValueAtTime(n.f2, t0 + n.d * 0.65);
          osc.frequency.exponentialRampToValueAtTime(n.f1 * 0.85, t0 + n.d);

          const throat = audioCtx.createBiquadFilter();
          throat.type = 'bandpass';
          throat.frequency.value = 620;
          throat.Q.value = 3.0;

          const env = audioCtx.createGain();
          env.gain.setValueAtTime(0.001, t0);
          env.gain.linearRampToValueAtTime(0.24, t0 + 0.05);
          env.gain.exponentialRampToValueAtTime(0.002, t0 + n.d);

          osc.connect(throat);
          throat.connect(env);
          env.connect(masterGain);
          osc.start(t0);
          osc.stop(t0 + n.d + 0.02);
        });
      } else {
        // 🦔 Sri Lankan Pangolin: Nocturnal nasal snuffling huffs & keratin armor scale clicks
        for (let i = 0; i < 4; i++) {
          const t0 = now + i * 0.22;
          // Keratin scale click + nasal snuffle
          const clickOsc = audioCtx.createOscillator();
          clickOsc.type = 'sine';
          clickOsc.frequency.setValueAtTime(920 + i * 140, t0);
          clickOsc.frequency.exponentialRampToValueAtTime(210, t0 + 0.09);

          const env = audioCtx.createGain();
          env.gain.setValueAtTime(0.001, t0);
          env.gain.linearRampToValueAtTime(0.18, t0 + 0.015);
          env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.11);

          clickOsc.connect(env);
          env.connect(masterGain);
          clickOsc.start(t0);
          clickOsc.stop(t0 + 0.12);
        }
      }
    }

    window.setSoundEnabled = function(enabled) {
      soundEnabled = !!enabled;
      if (soundEnabled) {
        resumeAudioIfNeeded();
      }
      if (masterGain && audioCtx) {
        masterGain.gain.setTargetAtTime(soundEnabled ? 0.85 : 0.0, audioCtx.currentTime, 0.08);
      }
    };

    window.triggerAnimalCall = function() {
      resumeAudioIfNeeded();
      playSpeciesVocalization(currentSpeciesKey);
    };

    // ── 3D Adventure & Natural History Museum Rotunda (Visible in 3D Studio Mode) ──
    const museumGroup = new THREE.Group();
    scene.add(museumGroup);

    const animatedVisitors = [];
    let pedestalPlaqueMesh = null;

    function createSharpMarbleFloorTexture() {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 1024;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#1d1814';
      ctx.fillRect(0, 0, 1024, 1024);

      const tileSize = 512;
      for (let ty = 0; ty < 2; ty++) {
        for (let tx = 0; tx < 2; tx++) {
          const x = tx * tileSize;
          const y = ty * tileSize;
          const isAlt = (tx + ty) % 2 === 0;
          const grad = ctx.createLinearGradient(x, y, x + tileSize, y + tileSize);
          if (isAlt) {
            grad.addColorStop(0, '#322b25');
            grad.addColorStop(0.5, '#3d342c');
            grad.addColorStop(1, '#28221d');
          } else {
            grad.addColorStop(0, '#26211c');
            grad.addColorStop(0.5, '#302923');
            grad.addColorStop(1, '#1f1b17');
          }
          ctx.fillStyle = grad;
          ctx.fillRect(x + 4, y + 4, tileSize - 8, tileSize - 8);

          // Subtle marble veining lines
          ctx.strokeStyle = 'rgba(255, 240, 210, 0.05)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 40, y + 90);
          ctx.bezierCurveTo(x + 180, y + 140, x + 290, y + 260, x + 460, y + 390);
          ctx.stroke();

          // Gold compass inlay border
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 18, y + 18, tileSize - 36, tileSize - 36);
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = maxAniso;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(8, 8);
      return tex;
    }

    function createSharpMuseumWallTexture() {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 1024;
      const ctx = c.getContext('2d');

      const wallGrad = ctx.createLinearGradient(0, 0, 0, 1024);
      wallGrad.addColorStop(0, '#0f1722');
      wallGrad.addColorStop(0.15, '#1b2636');
      wallGrad.addColorStop(0.66, '#2d261e');
      wallGrad.addColorStop(0.70, '#d4af37'); // Crisp gold molding rail
      wallGrad.addColorStop(0.72, '#221710'); // Mahogany wainscoting
      wallGrad.addColorStop(1.0, '#120c08');
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, 1024, 1024);

      // Detailed wainscoting panels
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.38)';
      ctx.lineWidth = 4;
      for (let i = 0; i < 4; i++) {
        ctx.strokeRect(i * 256 + 24, 770, 208, 200);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.18)';
        ctx.strokeRect(i * 256 + 38, 784, 180, 172);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.38)';
      }

      // Upper adventure arch motifs
      ctx.strokeStyle = 'rgba(229, 193, 104, 0.14)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        ctx.strokeRect(i * 256 + 32, 120, 192, 520);
      }

      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = maxAniso;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(8, 1);
      return tex;
    }

    function createExhibitBannerTexture(title, subtitle, badge) {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 680;
      const ctx = c.getContext('2d');

      // Ornate gold outer frame
      ctx.fillStyle = '#b48a3e';
      ctx.fillRect(0, 0, 1024, 680);
      ctx.fillStyle = '#13201b';
      ctx.fillRect(24, 24, 976, 632);
      ctx.strokeStyle = '#f3d078';
      ctx.lineWidth = 6;
      ctx.strokeRect(42, 42, 940, 596);
      ctx.lineWidth = 2;
      ctx.strokeRect(54, 54, 916, 572);

      // Emerald & obsidian adventure radial background
      const rad = ctx.createRadialGradient(512, 300, 40, 512, 340, 480);
      rad.addColorStop(0, '#1e3f33');
      rad.addColorStop(0.6, '#122620');
      rad.addColorStop(1, '#091310');
      ctx.fillStyle = rad;
      ctx.fillRect(56, 56, 912, 568);

      // Header
      ctx.fillStyle = '#f3d078';
      ctx.font = 'bold 28px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('CEYLON WILDLIFE EXPEDITION • MUSEUM HALL', 512, 132);

      // Gold ornamental divider
      ctx.fillStyle = 'rgba(243, 208, 120, 0.55)';
      ctx.fillRect(220, 162, 584, 3);

      // Exact Species Common Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 58px Georgia, serif';
      ctx.fillText(title, 512, 290);

      // Scientific Name
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'italic 38px Georgia, serif';
      ctx.fillText(subtitle, 512, 368);

      // Conservation Status Pill
      ctx.fillStyle = 'rgba(212, 175, 55, 0.18)';
      ctx.fillRect(252, 448, 520, 78);
      ctx.strokeStyle = '#f3d078';
      ctx.lineWidth = 3;
      ctx.strokeRect(252, 448, 520, 78);
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(badge, 512, 497);

      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = maxAniso;
      return tex;
    }

    function createPedestalPlaqueTexture(speciesKey) {
      const meta = SPECIES_META[speciesKey] || SPECIES_META.leopard;
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 180;
      const ctx = c.getContext('2d');

      // Brushed brass plaque background
      const g = ctx.createLinearGradient(0, 0, 512, 180);
      g.addColorStop(0, '#c89d42');
      g.addColorStop(0.5, '#f3d078');
      g.addColorStop(1, '#a67c27');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 180);

      ctx.fillStyle = '#18130d';
      ctx.fillRect(10, 10, 492, 160);
      ctx.strokeStyle = '#e5c168';
      ctx.lineWidth = 3;
      ctx.strokeRect(18, 18, 476, 144);

      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 30px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(meta.name, 256, 76);

      ctx.fillStyle = '#a7f3d0';
      ctx.font = 'italic 20px Georgia, serif';
      ctx.fillText(meta.sci, 256, 114);

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(meta.tag, 256, 145);

      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = maxAniso;
      return tex;
    }

    // Build an articulated 3D Museum Visitor / Explorer character
    function createMuseumVisitor(coatColor, pantsColor, hatExplorer, isWalker, orbitRadius, startAngle, walkSpeed) {
      const root = new THREE.Group();

      const skinMat = new THREE.MeshStandardMaterial({ color: 0xd6a37c, roughness: 0.6 });
      const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.55 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1815, roughness: 0.8 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 });

      // Torso
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.54, 16), coatMat);
      torso.position.y = 0.86;
      root.add(torso);

      // Head Group
      const headGroup = new THREE.Group();
      headGroup.position.y = 1.24;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 16), skinMat);
      headGroup.add(head);

      if (hatExplorer) {
        // Adventure pith helmet / explorer hat
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 20), new THREE.MeshStandardMaterial({ color: 0xd6c7a9, roughness: 0.6 }));
        brim.position.y = 0.06;
        headGroup.add(brim);
        const crown = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: 0xd6c7a9, roughness: 0.6 }));
        crown.position.y = 0.05;
        headGroup.add(crown);
      } else {
        const hair = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat);
        hair.position.y = 0.02;
        headGroup.add(hair);
      }
      root.add(headGroup);

      // Articulated Left & Right Legs (pivot at hip y = 0.58)
      const leftLeg = new THREE.Group();
      leftLeg.position.set(-0.07, 0.58, 0);
      const lLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.58, 12), pantsMat);
      lLegMesh.position.y = -0.29;
      leftLeg.add(lLegMesh);
      root.add(leftLeg);

      const rightLeg = new THREE.Group();
      rightLeg.position.set(0.07, 0.58, 0);
      const rLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.58, 12), pantsMat);
      rLegMesh.position.y = -0.29;
      rightLeg.add(rLegMesh);
      root.add(rightLeg);

      // Articulated Left & Right Arms (pivot at shoulder y = 1.08)
      const leftArm = new THREE.Group();
      leftArm.position.set(-0.19, 1.08, 0);
      const lArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.46, 12), coatMat);
      lArmMesh.position.y = -0.21;
      leftArm.add(lArmMesh);
      root.add(leftArm);

      const rightArm = new THREE.Group();
      rightArm.position.set(0.19, 1.08, 0);
      const rArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.46, 12), coatMat);
      rArmMesh.position.y = -0.21;
      rightArm.add(rArmMesh);
      root.add(rightArm);

      root.position.y = -0.46; // Stand on the marble museum floor
      museumGroup.add(root);

      animatedVisitors.push({
        root,
        headGroup,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        isWalker,
        orbitRadius,
        angle: startAngle,
        walkSpeed,
        phaseOffset: Math.random() * Math.PI * 2
      });
    }

    function buildMuseumEnvironment() {
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.85 });
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x3f3d38, roughness: 0.88, metalness: 0.05 });
      const fernMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.55, side: THREE.DoubleSide });

      // 1. Sharp Polished Marble Floor
      const floorGeo = new THREE.CircleGeometry(13.5, 64);
      const floorMat = new THREE.MeshStandardMaterial({
        map: createSharpMarbleFloorTexture(),
        roughness: 0.32,
        metalness: 0.16
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.y = -0.46;
      museumGroup.add(floorMesh);

      // 2. Adventure Jungle Diorama Island & Multi-tiered Museum Plinth
      const topPadGeo = new THREE.CylinderGeometry(1.42, 1.46, 0.07, 64);
      const topPadMat = new THREE.MeshStandardMaterial({ color: 0x253528, roughness: 0.85 });
      const topPad = new THREE.Mesh(topPadGeo, topPadMat);
      topPad.position.y = -0.035;
      museumGroup.add(topPad);

      // Natural Adventure Diorama Boulders & Tropical Ferns along the outer edge of the pedestal
      const rockAngles = [0.65, 1.85, 2.75, 3.85, 5.15];
      rockAngles.forEach((ang, idx) => {
        const rad = 1.18 + (idx % 2) * 0.12;
        const rx = Math.cos(ang) * rad;
        const rz = Math.sin(ang) * rad;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13 + (idx % 3) * 0.04, 0), rockMat);
        rock.scale.set(1.2, 0.65, 1.0);
        rock.position.set(rx, 0.03, rz);
        rock.rotation.set(idx, ang, 0);
        museumGroup.add(rock);

        // Fern fronds next to rock
        for (let f = 0; f < 4; f++) {
          const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.34), fernMat);
          frond.position.set(rx, 0.12, rz);
          frond.rotation.y = ang + (f - 1.5) * 0.6;
          frond.rotation.x = 0.45;
          museumGroup.add(frond);
        }
      });

      // Glowing Museum LED Rim Ring
      const ledRing = new THREE.Mesh(
        new THREE.CylinderGeometry(1.48, 1.48, 0.026, 64),
        new THREE.MeshBasicMaterial({ color: 0xffd885 })
      );
      ledRing.position.y = -0.068;
      museumGroup.add(ledRing);

      // Main Walnut & Brass Plinth Cylinder
      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(1.55, 1.62, 0.28, 64),
        new THREE.MeshStandardMaterial({ color: 0x24160e, roughness: 0.42, metalness: 0.12 })
      );
      plinth.position.y = -0.21;
      museumGroup.add(plinth);

      const trimTop = new THREE.Mesh(new THREE.CylinderGeometry(1.57, 1.57, 0.025, 64), brassMat);
      trimTop.position.y = -0.085;
      museumGroup.add(trimTop);

      const trimBot = new THREE.Mesh(new THREE.CylinderGeometry(1.64, 1.64, 0.03, 64), brassMat);
      trimBot.position.y = -0.34;
      museumGroup.add(trimBot);

      // Lower Marble Step Base
      const baseStep = new THREE.Mesh(
        new THREE.CylinderGeometry(1.92, 2.02, 0.11, 64),
        new THREE.MeshStandardMaterial({ color: 0x171412, roughness: 0.28, metalness: 0.22 })
      );
      baseStep.position.y = -0.405;
      museumGroup.add(baseStep);

      // Dynamic Front Brass Nameplate Plaque on the Pedestal
      const plaqueGroup = new THREE.Group();
      plaqueGroup.position.set(0, -0.22, 1.66);
      plaqueGroup.rotation.x = -0.28;
      pedestalPlaqueMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.92, 0.32),
        new THREE.MeshBasicMaterial({ map: createPedestalPlaqueTexture('leopard') })
      );
      plaqueGroup.add(pedestalPlaqueMesh);
      museumGroup.add(plaqueGroup);

      // 3. Brass Stanchions & Velvet Ropes
      const numPosts = 8;
      const postRadius = 2.34;
      const ropeMat = new THREE.MeshStandardMaterial({ color: 0x881313, roughness: 0.65, metalness: 0.08 });

      for (let i = 0; i < numPosts; i++) {
        const angle = (i / numPosts) * Math.PI * 2;
        const px = Math.cos(angle) * postRadius;
        const pz = Math.sin(angle) * postRadius;

        const pBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.04, 20), brassMat);
        pBase.position.set(px, -0.44, pz);
        museumGroup.add(pBase);

        const pPole = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.72, 16), brassMat);
        pPole.position.set(px, -0.08, pz);
        museumGroup.add(pPole);

        const pBall = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 16), brassMat);
        pBall.position.set(px, 0.30, pz);
        museumGroup.add(pBall);

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
      const wallMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(11.2, 11.2, 7.6, 64, 1, true),
        new THREE.MeshStandardMaterial({
          map: createSharpMuseumWallTexture(),
          side: THREE.BackSide,
          roughness: 0.7
        })
      );
      wallMesh.position.y = 3.3;
      museumGroup.add(wallMesh);

      // 5. Classical Museum Columns & Adventure Expedition Torch Braziers
      const columnMat = new THREE.MeshStandardMaterial({ color: 0xdcd5c9, roughness: 0.42, metalness: 0.08 });
      const colRadius = 10.5;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const cx = Math.cos(a) * colRadius;
        const cz = Math.sin(a) * colRadius;

        const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.33, 6.8, 24), columnMat);
        colShaft.position.set(cx, 3.0, cz);
        museumGroup.add(colShaft);

        const colBase = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.46, 0.84), columnMat);
        colBase.position.set(cx, -0.22, cz);
        museumGroup.add(colBase);

        const colCap = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.36, 0.88), brassMat);
        colCap.position.set(cx, 6.45, cz);
        museumGroup.add(colCap);

        // Glowing Adventure Expedition Lantern on alternate columns
        if (i % 2 === 0) {
          const tx = Math.cos(a) * 9.6;
          const tz = Math.sin(a) * 9.6;
          const torchBowl = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.28, 16), brassMat);
          torchBowl.rotation.x = Math.PI;
          torchBowl.position.set(tx, 2.2, tz);
          museumGroup.add(torchBowl);

          const flame = new THREE.Mesh(
            new THREE.SphereGeometry(0.11, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0xffaa33 })
          );
          flame.scale.set(1, 1.6, 1);
          flame.position.set(tx, 2.42, tz);
          museumGroup.add(flame);
          torchLights.push(flame);
        }
      }

      // 6. Framed Museum Exhibition Wall Panels (WITH CORRECT SPECIES NAMES!)
      const bannerData = [
        { title: 'Sri Lankan Leopard', sub: 'Panthera pardus kotiya', badge: 'ENDANGERED APEX PREDATOR' },
        { title: 'Purple-faced Langur', sub: 'Semnopithecus vetulus', badge: 'CRITICALLY ENDANGERED ENDEMIC' },
        { title: 'Sri Lankan Pangolin', sub: 'Manis crassicaudata', badge: 'VULNERABLE NOCTURNAL FORAGER' },
        { title: 'Echoes of the Wild', sub: 'Sri Lankan Wildlife Expedition Hall', badge: 'NATIONAL MUSEUM ARCHIVE' }
      ];

      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const bx = Math.cos(a) * 10.72;
        const bz = Math.sin(a) * 10.72;
        const bTex = createExhibitBannerTexture(bannerData[i].title, bannerData[i].sub, bannerData[i].badge);
        const panelMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(3.6, 2.38),
          new THREE.MeshBasicMaterial({ map: bTex })
        );
        panelMesh.position.set(bx, 2.58, bz);
        panelMesh.lookAt(0, 2.58, 0);
        museumGroup.add(panelMesh);
      }

      // 7. Overhead Museum Volumetric Spotlight Cone
      const lightCone = new THREE.Mesh(
        new THREE.ConeGeometry(2.2, 5.9, 48, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xffe4a0,
          transparent: true,
          opacity: 0.068,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      lightCone.position.y = 2.45;
      museumGroup.add(lightCone);

      // 8. Animated 3D Museum Visitors & Wildlife Explorers in the Background!
      // 3 Stationary Visitors admiring the animal from outside the velvet rope
      createMuseumVisitor(0x854d0e, 0x1e293b, true, false, 3.25, 2.35, 0);   // Wildlife Explorer admiring animal
      createMuseumVisitor(0x1e3a8a, 0x334155, false, false, 3.45, -2.15, 0); // Museum guest watching
      createMuseumVisitor(0x065f46, 0x1f2937, false, false, 3.35, 0.85, 0);  // Visitor observing

      // 3 Walking Visitors strolling around the museum rotunda gallery
      createMuseumVisitor(0x7c2d12, 0x1e293b, false, true, 4.85, 0.0, 0.24);
      createMuseumVisitor(0x374151, 0x111827, true, true, 5.55, 3.14, -0.20);
      createMuseumVisitor(0x4c1d95, 0x1e293b, false, true, 6.20, 1.57, 0.18);
    }

    buildMuseumEnvironment();

    // ── Accurate In-App AR Surface Detection & Floor Anchor Visuals ──
    const arGroup = new THREE.Group();
    scene.add(arGroup);

    const arScanGridGroup = new THREE.Group();
    arGroup.add(arScanGridGroup);

    function createARReticleTexture() {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 512, 512);

      // Outer compass ticks ring
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.88)';
      ctx.lineWidth = 5;
      ctx.setLineDash([24, 16]);
      ctx.beginPath();
      ctx.arc(256, 256, 224, 0, Math.PI * 2);
      ctx.stroke();

      // Inner emerald surface lock ring
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.95)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(256, 256, 156, 0, Math.PI * 2);
      ctx.stroke();

      // LiDAR / ARCore surface plane mesh points
      ctx.fillStyle = 'rgba(52, 211, 153, 0.9)';
      const rings = [52, 104, 156, 204];
      rings.forEach((r, ri) => {
        const count = 8 + ri * 6;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + ri * 0.25;
          const px = 256 + Math.cos(a) * r;
          const py = 256 + Math.sin(a) * r;
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Center precision crosshair
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(232, 256); ctx.lineTo(280, 256);
      ctx.moveTo(256, 232); ctx.lineTo(256, 280);
      ctx.stroke();

      return new THREE.CanvasTexture(c);
    }

    const reticlePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.35, 2.35),
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
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    pulseRingMesh.rotation.x = -Math.PI / 2;
    pulseRingMesh.position.y = 0.008;
    arScanGridGroup.add(pulseRingMesh);

    const arPlacedFloorGroup = new THREE.Group();
    arPlacedFloorGroup.visible = false;
    arGroup.add(arPlacedFloorGroup);

    function createContactShadowTexture() {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 122);
      g.addColorStop(0, 'rgba(0, 0, 0, 0.68)');
      g.addColorStop(0.5, 'rgba(0, 0, 0, 0.34)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    }

    const contactShadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 2.7),
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
      new THREE.RingGeometry(1.06, 1.11, 64),
      new THREE.MeshBasicMaterial({
        color: 0xd4af37,
        transparent: true,
        opacity: 0.42,
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
    let currentSpeciesKey = 'leopard';
    let isARMode = false;

    // AR Surface Detection & IMU World-Space Tracking State
    let arSurfaceState = 'SCANNING';
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
    let targetArWorldZ = 0.0;
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
      anchorPitch = Math.max(0.18, Math.min(1.15, sensorPitch));
      anchorYaw = sensorYaw;
      arScanGridGroup.visible = false;
      arPlacedFloorGroup.visible = true;
      anchorRingMesh.material.opacity = 0.48;
      currentModelGroup.visible = true;
      spawnAnimScale = 0.05;
      notifyRN({ type: 'AR_STATUS', state: 'LOCKED', progress: 100 });
      playSpeciesVocalization(currentSpeciesKey);
    }

    window.resetARSurface = function() {
      if (!isARMode) {
        userScaleMultiplier = 1.0;
        userYawOffset = 0.0;
        currentModelGroup.rotation.y = 0;
        camera.position.set(0, 1.45, 4.6);
        controls.target.set(0, modelHeightCenter, 0);
        controls.update();
        return;
      }
      arSurfaceState = 'SCANNING';
      surfaceProgress = 0;
      lastReportedProgress = -1;
      arWorldOffsetX = 0;
      arWorldOffsetZ = 0;
      targetArWorldZ = 0;
      currentModelGroup.visible = false;
      arScanGridGroup.visible = true;
      arPlacedFloorGroup.visible = false;
      notifyRN({ type: 'AR_STATUS', state: 'SCANNING', progress: 0 });
    };

    // Move animal Forward (closer, deltaZ > 0) or Backward (further, deltaZ < 0) on the AR surface!
    window.moveAnimalDepth = function(deltaZ) {
      if (!isARMode || arSurfaceState !== 'LOCKED') return;
      targetArWorldZ = Math.max(-3.2, Math.min(1.6, targetArWorldZ + Number(deltaZ || 0)));
      anchorRingMesh.material.opacity = 0.45;
    };

    window.onNativeSensor = function(pitch, roll, yaw, stability) {
      sensorPitch = pitch;
      sensorRoll = roll;
      sensorYaw = yaw;
      sensorStability = stability;
    };

    let touchCount = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let lastPinchDist = 0;
    let touchMoved = false;

    renderer.domElement.addEventListener('touchstart', (e) => {
      resumeAudioIfNeeded();
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

        userYawOffset += dx * 0.012;
        targetArWorldZ = Math.max(-3.2, Math.min(1.6, targetArWorldZ + dy * 0.008));
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
      if (!touchMoved && touchCount === 1 && arSurfaceState === 'SCANNING' && surfaceProgress > 25) {
        lockARSurface();
      }
      touchCount = e.touches.length;
    }, { passive: true });

    function updateMuseumVisitors(elapsed, delta) {
      for (let i = 0; i < animatedVisitors.length; i++) {
        const v = animatedVisitors[i];
        if (v.isWalker) {
          v.angle += v.walkSpeed * delta;
          const vx = Math.cos(v.angle) * v.orbitRadius;
          const vz = Math.sin(v.angle) * v.orbitRadius;
          v.root.position.x = vx;
          v.root.position.z = vz;

          // Face walking tangent direction
          const dirAngle = v.angle + (v.walkSpeed >= 0 ? Math.PI / 2 : -Math.PI / 2);
          v.root.rotation.y = -dirAngle + Math.PI / 2;

          // Turn head slightly inward toward the central animal exhibit!
          v.headGroup.rotation.y = (v.walkSpeed >= 0 ? -0.45 : 0.45) + Math.sin(elapsed * 1.5 + v.phaseOffset) * 0.15;

          // Walking leg & arm swing animation
          const stride = Math.sin(elapsed * 4.2 + v.phaseOffset) * 0.42;
          v.leftLeg.rotation.x = stride;
          v.rightLeg.rotation.x = -stride;
          v.leftArm.rotation.x = -stride * 0.7;
          v.rightArm.rotation.x = stride * 0.7;
        } else {
          // Stationary observer facing the central animal exhibit
          const vx = Math.cos(v.angle) * v.orbitRadius;
          const vz = Math.sin(v.angle) * v.orbitRadius;
          v.root.position.x = vx;
          v.root.position.z = vz;
          v.root.lookAt(0, -0.46, 0);

          // Subtle head look & pointing / breathing motion
          v.headGroup.rotation.y = Math.sin(elapsed * 1.1 + v.phaseOffset) * 0.22;
          v.headGroup.rotation.x = -0.08 + Math.cos(elapsed * 0.9 + v.phaseOffset) * 0.05;
          v.rightArm.rotation.x = -0.35 - Math.sin(elapsed * 1.4 + v.phaseOffset) * 0.25;
        }
      }

      // Subtle torch flame flicker
      for (let i = 0; i < torchLights.length; i++) {
        const fl = torchLights[i];
        const s = 0.92 + Math.sin(elapsed * 11 + i * 2) * 0.12;
        fl.scale.set(s, 1.5 * s, s);
      }
    }

    function animate() {
      requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      if (mixer && (!isARMode || arSurfaceState === 'LOCKED')) {
        mixer.update(delta);
      }

      if (isARMode) {
        controls.enabled = false;

        if (arSurfaceState === 'SCANNING') {
          reticlePlane.rotation.z += delta * 0.55;
          const pulse = ((elapsed * 1.4) % 1);
          const pScale = 0.3 + pulse * 4.0;
          pulseRingMesh.scale.set(pScale, pScale, 1);
          pulseRingMesh.material.opacity = (1 - pulse) * 0.78;

          // Accurate surface pitch check: phone must be angled towards floor/table (0.10 to 1.40 rad)
          const isValidFloorAngle = sensorPitch > 0.08 && sensorPitch < 1.45;
          const scanElev = Math.max(0.20, Math.min(1.25, 0.46 + (sensorPitch - 0.35) * 0.68));
          const camDist = 3.8;
          camera.position.set(
            Math.sin(sensorYaw * 0.35) * 0.4,
            Math.sin(scanElev) * camDist,
            Math.cos(scanElev) * camDist
          );
          camera.lookAt(0, 0, 0);
          camera.rotation.z = -sensorRoll * 0.38;

          if (isValidFloorAngle) {
            const rate = sensorStability > 0.35 ? 74 : 26;
            surfaceProgress = Math.min(100, surfaceProgress + delta * rate);
          } else {
            surfaceProgress = Math.max(5, surfaceProgress - delta * 18);
          }

          const rounded = Math.round(surfaceProgress);
          if (Math.abs(rounded - lastReportedProgress) >= 5 || rounded >= 100) {
            lastReportedProgress = rounded;
            notifyRN({ type: 'AR_STATUS', state: 'SCANNING', progress: rounded });
          }
          if (surfaceProgress >= 100) {
            lockARSurface();
          }
        } else {
          // Smoothly interpolate forward/backward depth on the floor plane
          arWorldOffsetZ += (targetArWorldZ - arWorldOffsetZ) * Math.min(1, delta * 8.5);

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

          if (anchorRingMesh.material.opacity > 0.14) {
            anchorRingMesh.material.opacity = Math.max(0.14, anchorRingMesh.material.opacity - delta * 0.18);
          }

          // Accurate 6DoF World-Anchored Surface Tracking
          const relYaw = sensorYaw - anchorYaw;
          const relPitch = sensorPitch - anchorPitch;

          const elev = Math.max(0.10, Math.min(1.34, 0.36 + relPitch * 0.78));
          const camY = Math.sin(elev) * arCameraDistance;
          const camHoriz = Math.cos(elev) * arCameraDistance;

          camera.position.set(0, camY, camHoriz);
          const lookOffsetX = Math.tan(Math.max(-1.1, Math.min(1.1, relYaw))) * arCameraDistance * 0.94;
          const lookOffsetY = (modelHeightCenter * userScaleMultiplier) - Math.tan(Math.max(-0.85, Math.min(0.85, relPitch))) * arCameraDistance * 0.80;
          camera.lookAt(lookOffsetX, lookOffsetY, 0);
          camera.rotation.z = -sensorRoll * 0.45;
        }
      } else {
        // 3D ADVENTURE & MUSEUM HALL MODE
        controls.enabled = true;
        updateMuseumVisitors(elapsed, delta);
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

      // Update Front Pedestal Brass Plaque with exact species name
      const hint = (nameHint || currentSpeciesKey).toLowerCase();
      const cleanKey = hint.includes('langur') ? 'langur' : hint.includes('pangolin') ? 'pangolin' : 'leopard';
      currentSpeciesKey = cleanKey;
      if (pedestalPlaqueMesh) {
        pedestalPlaqueMesh.material.map = createPedestalPlaqueTexture(cleanKey);
        pedestalPlaqueMesh.material.needsUpdate = true;
      }

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        const activeClip = gltf.animations.find(a => /idle|walk|run|principal/i.test(a.name)) || gltf.animations[0];
        const action = mixer.clipAction(activeClip);

        if (cleanKey === 'leopard' || activeClip.name.toLowerCase().includes('principal')) {
          mixer.timeScale = 0.30;
        } else if (cleanKey === 'langur') {
          mixer.timeScale = 0.60;
        } else {
          mixer.timeScale = 0.50;
        }

        action.play();
      }

      document.getElementById('loading').style.display = 'none';
      initAudioEngine();
      if (!isARMode) {
        setTimeout(() => playSpeciesVocalization(cleanKey), 600);
      }
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
        renderer.setClearColor(0x131922, 1);
        museumGroup.visible = true;
        arGroup.visible = false;
        currentModelGroup.visible = true;
        spawnAnimScale = 1.0;
        camera.rotation.z = 0;
        camera.position.set(0, 1.45, 4.6);
        controls.target.set(0, modelHeightCenter, 0);
        controls.enabled = true;
        controls.update();
      } else {
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
