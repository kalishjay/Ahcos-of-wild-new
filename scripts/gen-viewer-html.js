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
      color: #f59e0b;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      font-weight: bold;
      background: rgba(0,0,0,0.7);
      padding: 10px 20px;
      border-radius: 20px;
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
  <div id="loading">Loading 3D Model...</div>
  <script>
    // Self-contained embedded models for 100% offline, 0ms instant loading
    const EMBEDDED_MODELS = {
      leopard: "` + leopardBase64 + `",
      langur: "` + langurBase64 + `",
      pangolin: "` + pangolinBase64 + `"
    };

    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.6, 3.8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.5;
    controls.maxDistance = 15;
    controls.enabled = true;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;

    // Realistic multi-angle lighting for wildlife exhibits
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(5, 10, 7.5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(0, 5, 2);
    scene.add(pointLight);

    const currentModelGroup = new THREE.Group();
    scene.add(currentModelGroup);

    let baseScale = 1;
    let userScaleMultiplier = 1;
    let mixer = null;
    let currentSpeciesKey = '';
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (mixer) {
        mixer.update(delta);
      }
      controls.update();
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
      model.position.y = -center.y;
      model.position.z = -center.z;

      const maxDim = Math.max(size.x, size.y, size.z);
      baseScale = maxDim > 0 ? (2.4 / maxDim) : 1;
      const s = baseScale * userScaleMultiplier;
      currentModelGroup.scale.set(s, s, s);

      currentModelGroup.add(model);

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        const activeClip = gltf.animations.find(a => /idle|walk|run|principal/i.test(a.name)) || gltf.animations[0];
        const action = mixer.clipAction(activeClip);

        // Slow down leopard animation speed to a realistic, natural walking pace
        const hint = (nameHint || currentSpeciesKey).toLowerCase();
        if (hint.includes('leopard') || activeClip.name.toLowerCase().includes('principal')) {
          mixer.timeScale = 0.30; // Calm, realistic walking speed
        } else if (hint.includes('langur')) {
          mixer.timeScale = 0.60;
        } else {
          mixer.timeScale = 0.50;
        }

        action.play();
      }

      document.getElementById('loading').style.display = 'none';

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOADED' }));
      }
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

    window.loadModelFromUrl = function(url, nameHint) {
      if (!url) return;
      currentSpeciesKey = (nameHint || url).toLowerCase();
      document.getElementById('loading').style.display = 'block';
      const loader = new GLTFLoader();
      loader.load(url, (gltf) => {
        setupModel(gltf, currentSpeciesKey);
      }, undefined, (err) => {
        console.warn('URL load failed, trying embedded offline model...', err);
        window.showSpecies(currentSpeciesKey);
      });
    };

    window.setScaleMultiplier = function(m) {
      userScaleMultiplier = m;
      const s = baseScale * userScaleMultiplier;
      currentModelGroup.scale.set(s, s, s);
    };

    window.setRotationY = function(rot) {
      currentModelGroup.rotation.y = rot;
    };

    window.setAutoRotate = function(val) {
      controls.autoRotate = !!val;
      controls.autoRotateSpeed = 2.0;
    };

    window.setBackgroundMode = function(isAR) {
      if (!isAR) {
        renderer.setClearColor(0x1a1a1a, 1);
        camera.position.set(0, 0.6, 3.8);
      } else {
        renderer.setClearColor(0x000000, 0);
      }
      // Controls enabled in both modes so user can drag to rotate and zoom freely
      controls.enabled = true;
      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.enablePan = true;
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
