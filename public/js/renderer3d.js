import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const DEG = Math.PI / 180;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cameraEye(camera) {
  const cp = Math.cos(camera.pitch);
  return [
    camera.target[0] + camera.distance * cp * Math.sin(camera.yaw),
    camera.target[1] + camera.distance * Math.sin(camera.pitch),
    camera.target[2] + camera.distance * cp * Math.cos(camera.yaw)
  ];
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Não foi possível abrir ${url}`));
    image.src = url;
  });
}

function createLabelCanvas(item) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 250;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(5, 12, 24, 0.9)';
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(18, 16, 732, 218, 30);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 4;
    ctx.stroke();
  } else {
    ctx.fillRect(18, 16, 732, 218);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 84px Arial, sans-serif';
  ctx.fillText(String(item.value), 384, 86);
  ctx.fillStyle = '#dbe7fa';
  ctx.font = '700 44px Arial, sans-serif';
  const name = String(item.name || '').toUpperCase();
  ctx.fillText(name.length > 24 ? `${name.slice(0, 23)}…` : name, 384, 177);
  return canvas;
}

function createPlaceholderCanvas(item) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);
  ctx.beginPath();
  ctx.arc(256, 256, 224, 0, Math.PI * 2);
  ctx.fillStyle = item.color || '#3b82f6';
  ctx.fill();
  ctx.lineWidth = 18;
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = '700 200px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(item.name || '?').trim().slice(0, 1).toUpperCase(), 256, 275);
  return canvas;
}

function pushFace(target, corners, normal, uvs) {
  const order = [0, 1, 2, 0, 2, 3];
  for (const index of order) {
    target.positions.push(...corners[index]);
    target.normals.push(...normal);
    target.uvs.push(...uvs[index]);
  }
}

function bufferGeometry(data) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
  geometry.computeBoundingSphere();
  return geometry;
}

async function baseGeometryFromImage(url, thickness, platformWidth, alphaThreshold) {
  const image = await loadImage(url);
  const maxCells = 82;
  const ratio = image.width / image.height || 1;
  let widthCells = maxCells;
  let heightCells = Math.max(8, Math.round(maxCells / ratio));
  if (heightCells > maxCells) {
    heightCells = maxCells;
    widthCells = Math.max(8, Math.round(maxCells * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = widthCells;
  canvas.height = heightCells;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, widthCells, heightCells);
  ctx.drawImage(image, 0, 0, widthCells, heightCells);
  const pixels = ctx.getImageData(0, 0, widthCells, heightCells).data;
  const active = new Uint8Array(widthCells * heightCells);
  const threshold = clamp(alphaThreshold, 0, 1) * 255;

  for (let y = 0; y < heightCells; y += 1) {
    for (let x = 0; x < widthCells; x += 1) {
      active[y * widthCells + x] = pixels[(y * widthCells + x) * 4 + 3] > threshold ? 1 : 0;
    }
  }

  const cell = platformWidth / widthCells;
  const platformDepth = cell * heightCells;
  const top = { positions: [], normals: [], uvs: [] };
  const side = { positions: [], normals: [], uvs: [] };
  const isActive = (x, y) => x >= 0 && x < widthCells && y >= 0 && y < heightCells && active[y * widthCells + x] === 1;

  for (let y = 0; y < heightCells; y += 1) {
    for (let x = 0; x < widthCells; x += 1) {
      if (!isActive(x, y)) continue;
      const x0 = -platformWidth / 2 + x * cell;
      const x1 = x0 + cell;
      const z1 = platformDepth / 2 - y * cell;
      const z0 = z1 - cell;
      const u0 = x / widthCells;
      const u1 = (x + 1) / widthCells;
      const v1 = 1 - y / heightCells;
      const v0 = 1 - (y + 1) / heightCells;

      pushFace(top, [[x0, thickness, z0], [x0, thickness, z1], [x1, thickness, z1], [x1, thickness, z0]], [0, 1, 0], [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]);
      if (!isActive(x - 1, y)) pushFace(side, [[x0, 0, z0], [x0, 0, z1], [x0, thickness, z1], [x0, thickness, z0]], [-1, 0, 0], [[0,0],[1,0],[1,1],[0,1]]);
      if (!isActive(x + 1, y)) pushFace(side, [[x1, 0, z1], [x1, 0, z0], [x1, thickness, z0], [x1, thickness, z1]], [1, 0, 0], [[0,0],[1,0],[1,1],[0,1]]);
      if (!isActive(x, y - 1)) pushFace(side, [[x0, 0, z1], [x1, 0, z1], [x1, thickness, z1], [x0, thickness, z1]], [0, 0, 1], [[0,0],[1,0],[1,1],[0,1]]);
      if (!isActive(x, y + 1)) pushFace(side, [[x1, 0, z0], [x0, 0, z0], [x0, thickness, z0], [x1, thickness, z0]], [0, 0, -1], [[0,0],[1,0],[1,1],[0,1]]);
    }
  }

  return { top: bufferGeometry(top), side: bufferGeometry(side), image };
}

function disposeMaterial(material) {
  if (!material) return;
  const materials = Array.isArray(material) ? material : [material];
  for (const entry of materials) {
    for (const key of ['map', 'alphaMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) {
      entry[key]?.dispose?.();
    }
    entry.dispose?.();
  }
}

function disposeGroup(group) {
  if (!group) return;
  group.traverse(object => {
    if (object.geometry) object.geometry.dispose?.();
    if (object.material) disposeMaterial(object.material);
  });
  group.clear();
}

function textureFromCanvas(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function normalizedState(input) {
  const state = structuredClone(input || {});
  const previousVersion = Number(state.version || 0);
  state.outputVisible = state.outputVisible !== false;
  state.scene ||= {};
  state.scene.anchor = { x: 0, y: 0, z: 0, rotationY: 0, scale: 1, locked: true, ...(state.scene.anchor || {}) };
  state.scene.base = { imageUrl: '/assets/default-base.png', thickness: 0.32, scale: 8.5, color: '#d9e1ec', alphaThreshold: 0.18, ...(state.scene.base || {}) };
  state.scene.bars = { width: 0.9, depth: 0.78, maxHeight: 4.8, gap: 0.48, labelScale: 1, imageScale: 1.05, ...(state.scene.bars || {}) };
  state.scene.items = Array.isArray(state.scene.items) ? state.scene.items.map(item => ({ ...item, scale: Number.isFinite(Number(item.scale ?? item.indice)) ? Number(item.scale ?? item.indice) : Number(item.value || 0) })) : [];
  state.scene.lighting = { ambient: 0.58, key: 1.15, shadowOpacity: 0.28, ...(state.scene.lighting || {}) };
  state.scene.lights = Array.isArray(state.scene.lights) ? state.scene.lights : [];
  state.scene.model = {
    url: '', name: '', format: '', visible: true,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1,
    animation: { speed: 1 },
    ...(state.scene.model || {})
  };
  state.scene.model.position = { x: 0, y: 0, z: 0, ...(state.scene.model.position || {}) };
  state.scene.model.rotation = { x: 0, y: 0, z: 0, ...(state.scene.model.rotation || {}) };
  state.scene.model.animation = { speed: 1, ...(state.scene.model.animation || {}) };
  state.scene.generatedGraphVisible = state.scene.generatedGraphVisible ?? true;
  if (previousVersion > 0 && previousVersion < 6 && state.scene.model.url && state.scene.generatedGraphVisible === false) state.scene.generatedGraphVisible = true;
  state.scene.playback = { startedAt: 0, playToken: 0, resetToken: 0, graphStart: 1, graphDuration: 1.4, ...(state.scene.playback || {}) };
  state.scene.dataSource = { type: 'google-sheets', enabled: true, url: '', gid: '0', autoRefresh: true, refreshSeconds: 5, lastUpdated: '', lastRowCount: 0, ...(state.scene.dataSource || {}) };
  state.scene.dataSource.enabled = state.scene.dataSource.enabled !== false;
  return state;
}

export class BroadcastRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.interactive = Boolean(options.interactive);
    this.state = normalizedState({});
    this.cameraState = { yaw: 0.7, pitch: 0.38, distance: 13.5, target: [0, 1.8, 0], fov: 42 };
    this.drag = null;
    this.coreToken = 0;
    this.modelToken = 0;
    this.currentModelUrl = '';
    this.modelAnimations = [];
    this.modelStats = { nodes: 0, meshes: 0, transparentMaterials: 0 };
    this.mixer = null;
    this.activeActions = [];
    this.modelDuration = 0;
    this.graphAnimatedObjects = [];
    this.currentPlayToken = null;
    this.currentResetToken = null;
    this.coreReady = false;
    this.modelReady = true;
    this.pendingPlayToken = null;
    this.localPlaybackStartedAt = null;
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene3d = new THREE.Scene();
    this.camera3d = new THREE.PerspectiveCamera(42, 16 / 9, 0.03, 250);
    this.anchorGroup = new THREE.Group();
    this.coreGroup = new THREE.Group();
    this.modelPivot = new THREE.Group();
    this.lightGroup = new THREE.Group();
    this.helperGroup = new THREE.Group();
    this.anchorGroup.add(this.coreGroup, this.modelPivot);
    this.scene3d.add(this.anchorGroup, this.lightGroup, this.helperGroup);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.58);
    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
    this.keyLight.position.set(-7, 11, 8);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.near = 0.1;
    this.keyLight.shadow.camera.far = 60;
    this.keyLight.shadow.camera.left = -16;
    this.keyLight.shadow.camera.right = 16;
    this.keyLight.shadow.camera.top = 16;
    this.keyLight.shadow.camera.bottom = -16;
    this.scene3d.add(this.ambientLight, this.keyLight);

    this.shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.28, transparent: true })
    );
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.position.y = -0.004;
    this.shadowPlane.receiveShadow = true;
    this.anchorGroup.add(this.shadowPlane);

    this.gltfLoader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/libs/draco/');
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
    this.objLoader = new OBJLoader();
    this.textureLoader = new THREE.TextureLoader();

    this.initControls();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement || canvas);
    this.resize();
    this.loop();
  }

  initControls() {
    if (!this.interactive) return;
    this.canvas.addEventListener('pointerdown', event => {
      this.canvas.setPointerCapture(event.pointerId);
      this.drag = {
        x: event.clientX,
        y: event.clientY,
        yaw: this.cameraState.yaw,
        pitch: this.cameraState.pitch,
        target: [...this.cameraState.target],
        pan: event.shiftKey || event.button === 1
      };
    });
    this.canvas.addEventListener('pointermove', event => {
      if (!this.drag) return;
      const dx = event.clientX - this.drag.x;
      const dy = event.clientY - this.drag.y;
      if (this.drag.pan) {
        const speed = this.cameraState.distance * 0.0017;
        const right = [Math.cos(this.cameraState.yaw), 0, -Math.sin(this.cameraState.yaw)];
        this.cameraState.target[0] = this.drag.target[0] - right[0] * dx * speed;
        this.cameraState.target[2] = this.drag.target[2] - right[2] * dx * speed;
        this.cameraState.target[1] = this.drag.target[1] + dy * speed;
      } else {
        this.cameraState.yaw = this.drag.yaw - dx * 0.008;
        this.cameraState.pitch = clamp(this.drag.pitch + dy * 0.006, -1.55, 1.55);
      }
      this.dispatchCameraChange();
    });
    const end = () => { this.drag = null; };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
    this.canvas.addEventListener('wheel', event => {
      event.preventDefault();
      this.cameraState.distance = clamp(this.cameraState.distance * Math.exp(event.deltaY * 0.001), 2, 60);
      this.dispatchCameraChange();
    }, { passive: false });
  }

  dispatchCameraChange() {
    this.canvas.dispatchEvent(new CustomEvent('camera-change', { detail: this.getCameraSnapshot() }));
  }

  dispatchModelInfo() {
    this.canvas.dispatchEvent(new CustomEvent('model-info', {
      detail: {
        name: this.state.scene.model.name || '',
        format: this.state.scene.model.format || '',
        animations: this.modelAnimations.map((clip, index) => ({ name: clip.name || `Animação ${index + 1}`, duration: Number(clip.duration || 0) })),
        stats: { ...this.modelStats }
      }
    }));
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(2, Math.floor(rect.width));
    const height = Math.max(2, Math.floor(rect.height));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera3d.aspect = width / height;
    this.camera3d.updateProjectionMatrix();
  }

  setState(input) {
    const next = normalizedState(input);
    const coreSignature = JSON.stringify({
      anchor: next.scene.anchor,
      base: next.scene.base,
      bars: next.scene.bars,
      items: next.scene.items,
      generatedGraphVisible: next.scene.generatedGraphVisible,
      dataSourceEnabled: next.scene.dataSource?.enabled !== false
    });
    const lightSignature = JSON.stringify({ lighting: next.scene.lighting, lights: next.scene.lights });
    const modelUrlChanged = next.scene.model.url !== this.currentModelUrl;
    const coreChanged = coreSignature !== this.coreSignature;
    const lightsChanged = lightSignature !== this.lightSignature;

    this.state = next;
    this.coreSignature = coreSignature;
    this.lightSignature = lightSignature;
    if (coreChanged) this.coreReady = false;
    if (modelUrlChanged) this.modelReady = !next.scene.model.url;
    this.applyAnchor();
    this.applyGlobalLighting();
    this.coreGroup.visible = next.scene.generatedGraphVisible !== false && next.scene.dataSource?.enabled !== false;
    if (coreChanged) this.rebuildCore();
    if (lightsChanged) this.rebuildLights();
    if (modelUrlChanged) this.loadModel();
    else this.applyModelSettings();
    this.applyPlaybackState();
  }

  setCamera(camera) {
    if (!camera) return;
    this.cameraState = {
      yaw: Number(camera.yaw ?? 0.7),
      pitch: Number(camera.pitch ?? 0.38),
      distance: Number(camera.distance ?? 13.5),
      target: Array.isArray(camera.target) ? camera.target.map(Number) : [0, 1.8, 0],
      fov: Number(camera.fov ?? 42)
    };
    this.dispatchCameraChange();
  }

  getCameraSnapshot() {
    return {
      yaw: Number(this.cameraState.yaw),
      pitch: Number(this.cameraState.pitch),
      distance: Number(this.cameraState.distance),
      target: this.cameraState.target.map(Number),
      fov: Number(this.cameraState.fov)
    };
  }

  setFov(value) {
    this.cameraState.fov = clamp(Number(value) || 42, 15, 100);
    this.dispatchCameraChange();
  }

  applyAnchor() {
    const anchor = this.state.scene.anchor;
    this.anchorGroup.position.set(Number(anchor.x || 0), Number(anchor.y || 0), Number(anchor.z || 0));
    this.anchorGroup.rotation.set(0, Number(anchor.rotationY || 0) * DEG, 0);
    const scale = Math.max(0.001, Number(anchor.scale || 1));
    this.anchorGroup.scale.setScalar(scale);
  }

  applyGlobalLighting() {
    const lighting = this.state.scene.lighting;
    this.ambientLight.intensity = Number(lighting.ambient ?? 0.58);
    this.keyLight.intensity = Number(lighting.key ?? 1.15);
    this.shadowPlane.material.opacity = Number(lighting.shadowOpacity ?? 0.28);
  }

  async loadTexture(url) {
    if (!url) return null;
    const texture = await this.textureLoader.loadAsync(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  async rebuildCore() {
    const token = ++this.coreToken;
    this.coreReady = false;
    disposeGroup(this.coreGroup);
    this.graphAnimatedObjects = [];
    const scene = this.state.scene;
    const base = scene.base;

    try {
      const [geometry, topTexture] = await Promise.all([
        baseGeometryFromImage(base.imageUrl, Number(base.thickness), Number(base.scale), Number(base.alphaThreshold)),
        this.loadTexture(base.imageUrl)
      ]);
      if (token !== this.coreToken) {
        geometry.top.dispose();
        geometry.side.dispose();
        topTexture?.dispose();
        return;
      }
      const topMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: topTexture,
        transparent: true,
        alphaTest: 0.02,
        side: THREE.DoubleSide,
        roughness: 0.74,
        metalness: 0.04
      });
      const sideMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(base.color || '#d9e1ec'),
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.03
      });
      const topMesh = new THREE.Mesh(geometry.top, topMaterial);
      const sideMesh = new THREE.Mesh(geometry.side, sideMaterial);
      topMesh.receiveShadow = true;
      topMesh.castShadow = true;
      sideMesh.receiveShadow = true;
      sideMesh.castShadow = true;
      this.coreGroup.add(sideMesh, topMesh);
      this.graphAnimatedObjects.push({ type: 'base', object: sideMesh });
      this.graphAnimatedObjects.push({ type: 'base', object: topMesh });
    } catch (error) {
      console.warn(error.message);
    }

    const items = scene.items;
    const bars = scene.bars;
    const maxScale = Math.max(1, ...items.map(item => Number(item.scale ?? item.indice ?? item.value) || 0));
    const width = Number(bars.width || 0.9);
    const depth = Number(bars.depth || 0.78);
    const gap = Number(bars.gap || 0.48);
    const total = items.length * width + Math.max(0, items.length - 1) * gap;
    const startX = -total / 2 + width / 2;
    const baseY = Number(base.thickness || 0.32);

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const scaleValue = Number(item.scale ?? item.indice ?? item.value) || 0;
      const height = Math.max(0.22, scaleValue / maxScale * Number(bars.maxHeight || 4.8));
      const x = startX + index * (width + gap);
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(item.color || '#3b82f6'), roughness: 0.46, metalness: 0.08 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, baseY + height / 2, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.coreGroup.add(mesh);
      this.graphAnimatedObjects.push({ type: 'bar', object: mesh, index, baseY, height });

      let iconTexture;
      try {
        iconTexture = item.imageUrl ? await this.loadTexture(item.imageUrl) : textureFromCanvas(createPlaceholderCanvas(item));
      } catch {
        iconTexture = textureFromCanvas(createPlaceholderCanvas(item));
      }
      if (token !== this.coreToken) {
        iconTexture?.dispose();
        return;
      }
      const iconMaterial = new THREE.SpriteMaterial({ map: iconTexture, transparent: true, alphaTest: 0.02, depthTest: true, depthWrite: false });
      const icon = new THREE.Sprite(iconMaterial);
      const iconScale = 1.28 * Number(bars.imageScale || 1);
      icon.scale.set(iconScale, iconScale, 1);
      icon.position.set(x, baseY + height + iconScale * 0.62, 0);
      icon.renderOrder = 5;
      this.coreGroup.add(icon);
      this.graphAnimatedObjects.push({ type: 'icon', object: icon, index, scaleX: iconScale, scaleY: iconScale });

      const labelTexture = textureFromCanvas(createLabelCanvas(item));
      const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture, transparent: true, alphaTest: 0.02, depthTest: true, depthWrite: false });
      const label = new THREE.Sprite(labelMaterial);
      const labelScale = Number(bars.labelScale || 1);
      label.scale.set(2.4 * labelScale, 0.78 * labelScale, 1);
      label.position.set(x, baseY + height + iconScale + 0.62 * labelScale, 0);
      label.renderOrder = 6;
      this.coreGroup.add(label);
      this.graphAnimatedObjects.push({ type: 'label', object: label, index, scaleX: 2.4 * labelScale, scaleY: 0.78 * labelScale });
    }

    if (token !== this.coreToken) return;
    this.coreReady = true;
    this.applyModelSettings();
    this.tryStartPendingPlayback();
    const elapsed = this.playbackElapsed();
    this.applyGraphAnimation(elapsed);
    this.canvas.dispatchEvent(new CustomEvent('graph-ready', {
      detail: { items: scene.items.length }
    }));
  }

  rebuildLights() {
    disposeGroup(this.lightGroup);
    disposeGroup(this.helperGroup);
    const lights = this.state.scene.lights;
    for (const data of lights) {
      if (data.enabled === false) continue;
      const light = new THREE.PointLight(
        new THREE.Color(data.color || '#ffffff'),
        Number(data.intensity ?? 2),
        Number(data.distance ?? 18),
        2
      );
      light.position.set(Number(data.x || 0), Number(data.y || 4), Number(data.z || 0));
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      light.shadow.bias = -0.001;
      this.lightGroup.add(light);
      if (this.interactive) {
        const helper = new THREE.PointLightHelper(light, 0.22, new THREE.Color(data.color || '#ffffff'));
        this.helperGroup.add(helper);
      }
    }
  }

  clearModel() {
    if (this.mixer) this.mixer.stopAllAction();
    this.activeActions = [];
    this.modelDuration = 0;
    this.mixer = null;
    this.modelAnimations = [];
    this.modelStats = { nodes: 0, meshes: 0, transparentMaterials: 0 };
    disposeGroup(this.modelPivot);
    this.dispatchModelInfo();
  }

  async loadModel() {
    const token = ++this.modelToken;
    const model = this.state.scene.model;
    this.currentModelUrl = model.url || '';
    this.modelReady = !model.url;
    this.clearModel();
    if (!model.url) {
      this.tryStartPendingPlayback();
      return;
    }

    this.canvas.dispatchEvent(new CustomEvent('model-loading', {
      detail: { name: model.name || 'modelo', loaded: 0, total: 0, percent: 0 }
    }));

    try {
      let root;
      let animations = [];
      const format = String(model.format || '').toLowerCase();
      const onProgress = event => {
        const loaded = Number(event?.loaded || 0);
        const total = Number(event?.total || 0);
        const percent = total > 0 ? Math.min(100, Math.round(loaded / total * 100)) : 0;
        this.canvas.dispatchEvent(new CustomEvent('model-loading', {
          detail: { name: model.name || 'modelo', loaded, total, percent }
        }));
      };

      if (format === 'obj') {
        const response = await fetch(model.url);
        if (!response.ok) throw new Error(`Falha ao abrir OBJ (${response.status})`);
        const text = await response.text();
        onProgress({ loaded: text.length, total: text.length });
        root = this.objLoader.parse(text);
      } else {
        const gltf = await this.gltfLoader.loadAsync(model.url, onProgress);
        root = gltf.scene || gltf.scenes?.[0];
        animations = Array.isArray(gltf.animations) ? gltf.animations : [];
      }
      if (token !== this.modelToken || !root) return;

      let nodes = 0;
      let meshes = 0;
      let transparentMaterials = 0;
      root.traverse(object => {
        nodes += 1;
        if (!object.isMesh) return;
        meshes += 1;
        object.receiveShadow = true;
        if (format === 'obj') {
          const source = Array.isArray(object.material) ? object.material[0] : object.material;
          object.material = new THREE.MeshStandardMaterial({
            color: source?.color || new THREE.Color('#d7dde8'),
            roughness: 0.58,
            metalness: 0.06,
            side: THREE.DoubleSide
          });
          object.castShadow = true;
          return;
        }

        const materials = Array.isArray(object.material) ? object.material : [object.material];
        let meshHasBlend = false;
        for (const material of materials) {
          if (!material) continue;
          const hasTransparency = Boolean(material.transparent || material.opacity < 0.999 || material.alphaTest > 0);
          if (hasTransparency) {
            transparentMaterials += 1;
            meshHasBlend = true;
            material.transparent = true;
            material.depthWrite = material.alphaTest > 0.001;
          }
          material.needsUpdate = true;
        }
        // Evita sombras retangulares em planos PNG com alpha BLEND.
        object.castShadow = !meshHasBlend;
      });

      this.modelPivot.add(root);
      this.modelAnimations = animations;
      this.modelDuration = animations.reduce((maximum, clip) => Math.max(maximum, Number(clip.duration || 0)), 0);
      if (animations.length) {
        this.mixer = new THREE.AnimationMixer(root);
        this.prepareModelActions();
        // O SP05 começa com os objetos em escala zero. Calculamos o enquadramento
        // usando a pose final, e depois retornamos ao frame inicial.
        this.applyModelAnimationAtTime(this.modelDuration + 0.001);
      }

      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root, true);
      if (!box.isEmpty()) {
        const center = box.getCenter(new THREE.Vector3());
        root.position.x -= center.x;
        root.position.z -= center.z;
        root.position.y -= box.min.y;
      }

      this.modelStats = { nodes, meshes, transparentMaterials };
      this.prepareModelActions();
      this.dispatchModelInfo();
      this.applyModelSettings();
      this.modelReady = true;
      this.tryStartPendingPlayback();
      const elapsed = this.playbackElapsed();
      this.applyModelAnimationAtTime(elapsed);
      this.canvas.dispatchEvent(new CustomEvent('model-ready', {
        detail: {
          name: model.name || 'modelo',
          animations: animations.length,
          duration: this.modelDuration,
          stats: { ...this.modelStats }
        }
      }));
    } catch (error) {
      console.error(error);
      if (token === this.modelToken) {
        // Não bloqueia o gráfico do Sheets quando apenas o GLB falha.
        this.modelReady = true;
        this.tryStartPendingPlayback();
      }
      this.canvas.dispatchEvent(new CustomEvent('model-error', { detail: { message: error.message || 'Falha ao carregar o modelo.' } }));
    }
  }

  applyModelSettings() {
    const model = this.state.scene.model;
    this.modelPivot.visible = Boolean(model.visible && model.url);
    const position = model.position;
    const rotation = model.rotation;
    const graphEnabled = this.state.scene.generatedGraphVisible !== false && this.state.scene.dataSource?.enabled !== false;
    const supportHeight = graphEnabled ? Number(this.state.scene.base.thickness || 0) : 0;
    this.modelPivot.position.set(
      Number(position.x || 0),
      supportHeight + Number(position.y || 0),
      Number(position.z || 0)
    );
    this.modelPivot.rotation.set(Number(rotation.x || 0) * DEG, Number(rotation.y || 0) * DEG, Number(rotation.z || 0) * DEG);
    const scale = Math.max(0.001, Number(model.scale || 1));
    this.modelPivot.scale.setScalar(scale);
  }

  prepareModelActions() {
    if (!this.mixer || !this.modelAnimations.length) return;
    this.mixer.stopAllAction();
    this.mixer.setTime(0);
    this.activeActions = this.modelAnimations.map(clip => {
      const action = this.mixer.clipAction(clip);
      const duration = Math.max(0, Number(clip.duration || 0));
      action.enabled = true;
      action.reset();
      action.setEffectiveWeight(1);
      action.setEffectiveTimeScale(1);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.paused = true;
      action.play();
      return { action, clip, duration };
    });
    this.applyModelAnimationAtTime(0);
  }

  applyModelAnimationAtTime(elapsedSeconds) {
    if (!this.mixer || !this.activeActions.length) return;
    const speed = Math.max(0.01, Number(this.state.scene.model.animation?.speed || 1));
    const masterTime = Math.max(0, Number(elapsedSeconds || 0) * speed);

    for (const entry of this.activeActions) {
      const action = entry.action;
      const duration = Math.max(0, Number(entry.duration || entry.clip?.duration || 0));
      const localTime = duration > 0 ? Math.min(masterTime, duration) : 0;
      const finished = duration <= 0 || masterTime >= duration;

      action.enabled = true;
      action.setEffectiveWeight(1);
      action.setEffectiveTimeScale(1);
      action.time = localTime;
      action.paused = finished;
    }

    // Avalia todas as ações no tempo definido. Ações concluídas permanecem
    // habilitadas e pausadas no último frame, sem voltar à pose inicial.
    this.mixer.update(0);
  }

  sceneReadyForPlayback() {
    const scene = this.state.scene || {};
    const graphRequired = scene.generatedGraphVisible !== false && scene.dataSource?.enabled !== false;
    const modelRequired = Boolean(scene.model?.url && scene.model?.visible !== false);
    return (!graphRequired || this.coreReady) && (!modelRequired || this.modelReady);
  }

  tryStartPendingPlayback() {
    if (this.pendingPlayToken == null || !this.sceneReadyForPlayback()) return false;
    const token = this.pendingPlayToken;
    this.pendingPlayToken = null;
    this.prepareModelActions();
    this.localPlaybackStartedAt = performance.now();
    this.applyModelAnimationAtTime(0);
    this.applyGraphAnimation(0);
    this.canvas.dispatchEvent(new CustomEvent('playback-started', {
      detail: { playToken: token, startedAt: Date.now() }
    }));
    return true;
  }

  playbackElapsed() {
    const playback = this.state.scene.playback || {};
    const mode = String(playback.mode || 'preview');
    if (mode === 'final-preview') return Number.POSITIVE_INFINITY;
    if (mode === 'preview') return this.interactive ? Number.POSITIVE_INFINITY : 0;
    if (mode !== 'playing' || this.localPlaybackStartedAt == null) return 0;
    return Math.max(0, (performance.now() - this.localPlaybackStartedAt) / 1000);
  }

  applyPlaybackState(force = false) {
    const playback = this.state.scene.playback || {};
    const mode = String(playback.mode || 'preview');
    const playToken = Number(playback.playToken || 0);
    const resetToken = Number(playback.resetToken || 0);
    const playChanged = playToken !== this.currentPlayToken;
    const resetChanged = resetToken !== this.currentResetToken;
    const changed = force || playChanged || resetChanged;
    if (!changed) {
      if (mode === 'playing') this.tryStartPendingPlayback();
      return;
    }

    this.currentPlayToken = playToken;
    this.currentResetToken = resetToken;

    if (mode === 'playing') {
      if (playChanged || force || this.localPlaybackStartedAt == null) {
        this.pendingPlayToken = playToken || Date.now();
        this.localPlaybackStartedAt = null;
        this.prepareModelActions();
        this.applyModelAnimationAtTime(0);
        this.applyGraphAnimation(0);
        this.canvas.dispatchEvent(new CustomEvent('playback-waiting', {
          detail: {
            playToken: this.pendingPlayToken,
            graphReady: this.coreReady,
            modelReady: this.modelReady
          }
        }));
      }
      this.tryStartPendingPlayback();
      return;
    }

    this.pendingPlayToken = null;
    this.localPlaybackStartedAt = null;
    this.prepareModelActions();
    const elapsed = this.playbackElapsed();
    this.applyModelAnimationAtTime(elapsed);
    this.applyGraphAnimation(elapsed);
    if (mode === 'prepared') {
      this.canvas.dispatchEvent(new CustomEvent('playback-prepared', {
        detail: { resetToken }
      }));
    }
  }

  applyGraphAnimation(elapsed) {
    if (this.state.scene.generatedGraphVisible === false || this.state.scene.dataSource?.enabled === false) {
      this.coreGroup.visible = false;
      return;
    }
    this.coreGroup.visible = true;
    const playback = this.state.scene.playback || {};
    const start = Math.max(0, Number(playback.graphStart || 0));
    const duration = Math.max(0.1, Number(playback.graphDuration || 1.4));
    const itemCount = Math.max(1, this.state.scene.items.length);
    const ease = value => 1 - Math.pow(1 - clamp(value, 0, 1), 3);
    const baseProgress = ease((elapsed - start) / Math.max(0.12, duration * 0.28));
    const stagger = Math.min(0.16, duration * 0.3 / itemCount);

    for (const entry of this.graphAnimatedObjects) {
      const object = entry.object;
      if (!object) continue;
      if (entry.type === 'base') {
        object.visible = baseProgress > 0.001;
        object.scale.y = Math.max(0.001, baseProgress);
        continue;
      }
      const itemStart = start + duration * 0.18 + Number(entry.index || 0) * stagger;
      const itemDuration = Math.max(0.16, duration * 0.72);
      const progress = ease((elapsed - itemStart) / itemDuration);
      if (entry.type === 'bar') {
        object.visible = progress > 0.001;
        object.scale.y = Math.max(0.001, progress);
        object.position.y = entry.baseY + entry.height * progress / 2;
      } else {
        const reveal = ease((progress - 0.62) / 0.38);
        object.visible = reveal > 0.001;
        object.scale.set(Math.max(0.001, entry.scaleX * reveal), Math.max(0.001, entry.scaleY * reveal), 1);
        if (object.material) {
          object.material.transparent = true;
          object.material.opacity = reveal;
        }
      }
    }
  }

  updateCamera() {
    const eye = cameraEye(this.cameraState);
    this.camera3d.position.set(...eye);
    this.camera3d.up.set(0, 1, 0);
    this.camera3d.lookAt(new THREE.Vector3(...this.cameraState.target));
    this.camera3d.fov = clamp(Number(this.cameraState.fov || 42), 15, 100);
    this.camera3d.updateProjectionMatrix();
  }

  render(delta) {
    this.updateCamera();
    const elapsed = this.playbackElapsed();
    this.applyModelAnimationAtTime(elapsed);
    this.applyGraphAnimation(elapsed);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear(true, true, true);
    if (this.state.outputVisible !== false) this.renderer.render(this.scene3d, this.camera3d);
  }

  loop() {
    const tick = () => {
      const delta = Math.min(this.clock.getDelta(), 0.1);
      this.render(delta);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
