const DEG = Math.PI / 180;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalize(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function mat4Identity() {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function mat4Multiply(a, b) {
  const out = new Float32Array(16);
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}

function mat4Perspective(fovDeg, aspect, near, far) {
  const f = 1 / Math.tan((fovDeg * DEG) / 2);
  const nf = 1 / (near - far);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

function mat4LookAt(eye, center, up = [0, 1, 0]) {
  const z = normalize(subtract(eye, center));
  const x = normalize(cross(up, z));
  const y = cross(z, x);
  const out = mat4Identity();
  out[0] = x[0]; out[1] = y[0]; out[2] = z[0];
  out[4] = x[1]; out[5] = y[1]; out[6] = z[1];
  out[8] = x[2]; out[9] = y[2]; out[10] = z[2];
  out[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
  out[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
  out[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
  return out;
}

function mat4Translation(x, y, z) {
  const out = mat4Identity();
  out[12] = x; out[13] = y; out[14] = z;
  return out;
}

function mat4Scale(x, y, z) {
  const out = mat4Identity();
  out[0] = x; out[5] = y; out[10] = z;
  return out;
}

function mat4RotationY(rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
}

function transformPoint(matrix, point) {
  const x = point[0], y = point[1], z = point[2];
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]
  ];
}

function cameraEye(camera) {
  const cp = Math.cos(camera.pitch);
  return [
    camera.target[0] + camera.distance * cp * Math.sin(camera.yaw),
    camera.target[1] + camera.distance * Math.sin(camera.pitch),
    camera.target[2] + camera.distance * cp * Math.cos(camera.yaw)
  ];
}

function colorToArray(hex, alpha = 1) {
  const value = String(hex || '#ffffff').replace('#', '');
  const normalized = value.length === 3 ? value.split('').map(char => char + char).join('') : value.padEnd(6, 'f').slice(0, 6);
  return [
    parseInt(normalized.slice(0, 2), 16) / 255,
    parseInt(normalized.slice(2, 4), 16) / 255,
    parseInt(normalized.slice(4, 6), 16) / 255,
    alpha
  ];
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Falha no shader: ${info}`);
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  return program;
}

function pushFace(target, corners, normal, uvs, texMix = 0) {
  const order = [0, 1, 2, 0, 2, 3];
  for (const index of order) {
    target.positions.push(...corners[index]);
    target.normals.push(...normal);
    target.uvs.push(...uvs[index]);
    target.texMix.push(texMix);
  }
}

function boxGeometry(width, height, depth) {
  const x = width / 2, y = height / 2, z = depth / 2;
  const data = { positions: [], normals: [], uvs: [], texMix: [] };
  const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
  pushFace(data, [[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]], [0,0,1], uv, 0);
  pushFace(data, [[x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z]], [0,0,-1], uv, 0);
  pushFace(data, [[x,-y,z],[x,-y,-z],[x,y,-z],[x,y,z]], [1,0,0], uv, 0);
  pushFace(data, [[-x,-y,-z],[-x,-y,z],[-x,y,z],[-x,y,-z]], [-1,0,0], uv, 0);
  pushFace(data, [[-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z]], [0,1,0], uv, 0);
  pushFace(data, [[-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z]], [0,-1,0], uv, 0);
  return data;
}

function planeGeometry(width, height) {
  const x = width / 2, y = height / 2;
  const data = { positions: [], normals: [], uvs: [], texMix: [] };
  pushFace(data, [[-x,-y,0],[x,-y,0],[x,y,0],[-x,y,0]], [0,0,1], [[0,0],[1,0],[1,1],[0,1]], 1);
  return data;
}

function createLabelCanvas(item, scale = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(5, 12, 24, 0.86)';
  ctx.roundRect(18, 16, 604, 188, 30);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(74 * scale)}px Arial, sans-serif`;
  ctx.fillText(String(item.value), 320, 77);
  ctx.fillStyle = '#dbe7fa';
  ctx.font = `700 ${Math.round(40 * scale)}px Arial, sans-serif`;
  const name = String(item.name || '').toUpperCase();
  ctx.fillText(name.length > 22 ? `${name.slice(0, 21)}…` : name, 320, 155);
  return canvas;
}

function createPlaceholderCanvas(item) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 384, 384);
  ctx.beginPath();
  ctx.arc(192, 192, 168, 0, Math.PI * 2);
  ctx.fillStyle = item.color || '#3b82f6';
  ctx.fill();
  ctx.lineWidth = 16;
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = '700 150px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(item.name || '?').trim().slice(0, 1).toUpperCase(), 192, 205);
  return canvas;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Não foi possível abrir ${url}`));
    image.src = url;
  });
}

async function baseGeometryFromImage(url, thickness, platformWidth, alphaThreshold) {
  const image = await loadImage(url);
  const maxCells = 72;
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
  for (let y = 0; y < heightCells; y++) {
    for (let x = 0; x < widthCells; x++) {
      active[y * widthCells + x] = pixels[(y * widthCells + x) * 4 + 3] > threshold ? 1 : 0;
    }
  }
  const cell = platformWidth / widthCells;
  const depth = cell * heightCells;
  const data = { positions: [], normals: [], uvs: [], texMix: [] };
  const isActive = (x, y) => x >= 0 && x < widthCells && y >= 0 && y < heightCells && active[y * widthCells + x] === 1;
  for (let y = 0; y < heightCells; y++) {
    for (let x = 0; x < widthCells; x++) {
      if (!isActive(x, y)) continue;
      const x0 = -platformWidth / 2 + x * cell;
      const x1 = x0 + cell;
      const z1 = depth / 2 - y * cell;
      const z0 = z1 - cell;
      const u0 = x / widthCells, u1 = (x + 1) / widthCells;
      const v1 = 1 - y / heightCells, v0 = 1 - (y + 1) / heightCells;
      pushFace(data, [[x0,thickness,z0],[x1,thickness,z0],[x1,thickness,z1],[x0,thickness,z1]], [0,1,0], [[u0,v0],[u1,v0],[u1,v1],[u0,v1]], 1);
      if (!isActive(x - 1, y)) pushFace(data, [[x0,0,z1],[x0,0,z0],[x0,thickness,z0],[x0,thickness,z1]], [-1,0,0], [[0,0],[1,0],[1,1],[0,1]], 0);
      if (!isActive(x + 1, y)) pushFace(data, [[x1,0,z0],[x1,0,z1],[x1,thickness,z1],[x1,thickness,z0]], [1,0,0], [[0,0],[1,0],[1,1],[0,1]], 0);
      if (!isActive(x, y - 1)) pushFace(data, [[x1,0,z1],[x0,0,z1],[x0,thickness,z1],[x1,thickness,z1]], [0,0,1], [[0,0],[1,0],[1,1],[0,1]], 0);
      if (!isActive(x, y + 1)) pushFace(data, [[x0,0,z0],[x1,0,z0],[x1,thickness,z0],[x0,thickness,z0]], [0,0,-1], [[0,0],[1,0],[1,1],[0,1]], 0);
    }
  }
  return { data, image, depth };
}

export class BroadcastRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.interactive = Boolean(options.interactive);
    this.gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!this.gl) throw new Error('WebGL 2 não está disponível neste navegador.');
    this.state = null;
    this.camera = { yaw: 0.7, pitch: 0.38, distance: 13.5, target: [0, 1.8, 0], fov: 42 };
    this.meshes = [];
    this.overlayMeshes = [];
    this.textureCache = new Map();
    this.canvasTextureCache = new Map();
    this.baseBuildToken = 0;
    this.needsFrame = true;
    this.drag = null;
    this.initGL();
    this.initControls();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement || canvas);
    this.resize();
    this.loop();
  }

  initGL() {
    const gl = this.gl;
    const vertex = `#version 300 es
      precision highp float;
      in vec3 aPosition;
      in vec3 aNormal;
      in vec2 aUv;
      in float aTexMix;
      uniform mat4 uMvp;
      uniform mat4 uModel;
      out vec3 vNormal;
      out vec2 vUv;
      out float vTexMix;
      void main() {
        gl_Position = uMvp * vec4(aPosition, 1.0);
        vNormal = mat3(uModel) * aNormal;
        vUv = aUv;
        vTexMix = aTexMix;
      }
    `;
    const fragment = `#version 300 es
      precision highp float;
      in vec3 vNormal;
      in vec2 vUv;
      in float vTexMix;
      uniform vec4 uColor;
      uniform sampler2D uTexture;
      uniform float uUseTexture;
      uniform float uAmbient;
      uniform float uKey;
      out vec4 outColor;
      void main() {
        vec4 textureColor = texture(uTexture, vUv);
        vec4 base = mix(uColor, textureColor, clamp(vTexMix * uUseTexture, 0.0, 1.0));
        if (base.a < 0.035) discard;
        vec3 n = normalize(vNormal);
        vec3 lightDir = normalize(vec3(-0.45, 0.95, 0.55));
        float diffuse = max(dot(n, lightDir), 0.0);
        float lighting = clamp(uAmbient + diffuse * uKey, 0.0, 1.55);
        outColor = vec4(base.rgb * lighting, base.a);
      }
    `;
    this.program = createProgram(gl, vertex, fragment);
    this.locations = {
      position: gl.getAttribLocation(this.program, 'aPosition'),
      normal: gl.getAttribLocation(this.program, 'aNormal'),
      uv: gl.getAttribLocation(this.program, 'aUv'),
      texMix: gl.getAttribLocation(this.program, 'aTexMix'),
      mvp: gl.getUniformLocation(this.program, 'uMvp'),
      model: gl.getUniformLocation(this.program, 'uModel'),
      color: gl.getUniformLocation(this.program, 'uColor'),
      texture: gl.getUniformLocation(this.program, 'uTexture'),
      useTexture: gl.getUniformLocation(this.program, 'uUseTexture'),
      ambient: gl.getUniformLocation(this.program, 'uAmbient'),
      key: gl.getUniformLocation(this.program, 'uKey')
    };
    this.whiteTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.whiteTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  initControls() {
    if (!this.interactive) return;
    this.canvas.addEventListener('pointerdown', event => {
      this.canvas.setPointerCapture(event.pointerId);
      this.drag = { x: event.clientX, y: event.clientY, yaw: this.camera.yaw, pitch: this.camera.pitch, target: [...this.camera.target], pan: event.shiftKey || event.button === 1 };
    });
    this.canvas.addEventListener('pointermove', event => {
      if (!this.drag) return;
      const dx = event.clientX - this.drag.x;
      const dy = event.clientY - this.drag.y;
      if (this.drag.pan) {
        const speed = this.camera.distance * 0.0017;
        const right = [Math.cos(this.camera.yaw), 0, -Math.sin(this.camera.yaw)];
        this.camera.target[0] = this.drag.target[0] - right[0] * dx * speed;
        this.camera.target[2] = this.drag.target[2] - right[2] * dx * speed;
        this.camera.target[1] = this.drag.target[1] + dy * speed;
      } else {
        this.camera.yaw = this.drag.yaw - dx * 0.008;
        this.camera.pitch = clamp(this.drag.pitch + dy * 0.006, -0.02, 1.36);
      }
      this.needsFrame = true;
      this.dispatchCameraChange();
    });
    const end = () => { this.drag = null; };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
    this.canvas.addEventListener('wheel', event => {
      event.preventDefault();
      this.camera.distance = clamp(this.camera.distance * Math.exp(event.deltaY * 0.001), 3, 45);
      this.needsFrame = true;
      this.dispatchCameraChange();
    }, { passive: false });
  }

  dispatchCameraChange() {
    this.canvas.dispatchEvent(new CustomEvent('camera-change', { detail: this.getCameraSnapshot() }));
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(2, Math.floor(rect.width * dpr));
    const height = Math.max(2, Math.floor(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.needsFrame = true;
    }
  }

  setState(state) {
    const next = structuredClone(state);
    const signature = JSON.stringify(next.scene || {});
    const changed = signature !== this.sceneSignature;
    this.sceneSignature = signature;
    this.state = next;
    if (changed) this.rebuildScene();
    else this.needsFrame = true;
  }

  setCamera(camera) {
    if (!camera) return;
    this.camera = {
      yaw: Number(camera.yaw ?? 0.7),
      pitch: Number(camera.pitch ?? 0.38),
      distance: Number(camera.distance ?? 13.5),
      target: Array.isArray(camera.target) ? camera.target.map(Number) : [0, 1.8, 0],
      fov: Number(camera.fov ?? 42)
    };
    this.needsFrame = true;
    this.dispatchCameraChange();
  }

  getCameraSnapshot() {
    return {
      yaw: Number(this.camera.yaw),
      pitch: Number(this.camera.pitch),
      distance: Number(this.camera.distance),
      target: this.camera.target.map(Number),
      fov: Number(this.camera.fov)
    };
  }

  setFov(value) {
    this.camera.fov = clamp(Number(value) || 42, 15, 100);
    this.needsFrame = true;
    this.dispatchCameraChange();
  }

  createMesh(data) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const createBuffer = (values, location, size) => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
      return buffer;
    };
    const buffers = [
      createBuffer(data.positions, this.locations.position, 3),
      createBuffer(data.normals, this.locations.normal, 3),
      createBuffer(data.uvs, this.locations.uv, 2),
      createBuffer(data.texMix, this.locations.texMix, 1)
    ];
    gl.bindVertexArray(null);
    return { vao, buffers, count: data.positions.length / 3 };
  }

  disposeMesh(mesh) {
    if (!mesh) return;
    for (const buffer of mesh.buffers || []) this.gl.deleteBuffer(buffer);
    if (mesh.vao) this.gl.deleteVertexArray(mesh.vao);
  }

  textureFromCanvas(key, canvas) {
    if (this.canvasTextureCache.has(key)) return this.canvasTextureCache.get(key);
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.canvasTextureCache.set(key, texture);
    return texture;
  }

  requestTexture(url) {
    if (!url) return this.whiteTexture;
    const cached = this.textureCache.get(url);
    if (cached?.texture) return cached.texture;
    if (cached?.loading) return this.whiteTexture;
    const record = { loading: true, texture: null };
    this.textureCache.set(url, record);
    loadImage(url).then(image => {
      const gl = this.gl;
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      record.loading = false;
      record.texture = texture;
      this.needsFrame = true;
    }).catch(() => { record.loading = false; });
    return this.whiteTexture;
  }

  anchorMatrix() {
    const anchor = this.state?.scene?.anchor || {};
    let model = mat4Translation(Number(anchor.x || 0), Number(anchor.y || 0), Number(anchor.z || 0));
    model = mat4Multiply(model, mat4RotationY(Number(anchor.rotationY || 0) * DEG));
    const scale = Number(anchor.scale || 1);
    return mat4Multiply(model, mat4Scale(scale, scale, scale));
  }

  async rebuildScene() {
    if (!this.state?.scene) return;
    const token = ++this.baseBuildToken;
    for (const entry of [...this.meshes, ...this.overlayMeshes]) this.disposeMesh(entry.mesh);
    this.meshes = [];
    this.overlayMeshes = [];
    this.canvasTextureCache.clear();
    const scene = this.state.scene;
    const base = scene.base;
    try {
      const result = await baseGeometryFromImage(base.imageUrl, Number(base.thickness), Number(base.scale), Number(base.alphaThreshold));
      if (token !== this.baseBuildToken) return;
      this.meshes.push({
        mesh: this.createMesh(result.data),
        model: this.anchorMatrix(),
        color: colorToArray(base.color),
        textureUrl: base.imageUrl,
        useTexture: true
      });
    } catch (error) {
      console.warn(error.message);
    }
    const items = Array.isArray(scene.items) ? scene.items : [];
    const bars = scene.bars || {};
    const maxValue = Math.max(1, ...items.map(item => Number(item.value) || 0));
    const width = Number(bars.width || 0.9);
    const depth = Number(bars.depth || 0.78);
    const gap = Number(bars.gap || 0.48);
    const total = items.length * width + Math.max(0, items.length - 1) * gap;
    const startX = -total / 2 + width / 2;
    const baseY = Number(base.thickness || 0.32);
    const anchor = this.anchorMatrix();
    items.forEach((item, index) => {
      const height = Math.max(0.22, (Number(item.value) || 0) / maxValue * Number(bars.maxHeight || 4.8));
      const x = startX + index * (width + gap);
      const barModel = mat4Multiply(anchor, mat4Translation(x, baseY + height / 2, 0));
      this.meshes.push({ mesh: this.createMesh(boxGeometry(width, height, depth)), model: barModel, color: colorToArray(item.color), textureUrl: '', useTexture: false });
      const worldImage = transformPoint(anchor, [x, baseY + height + 0.78 * Number(bars.imageScale || 1), 0]);
      const imageTexture = item.imageUrl ? this.requestTexture(item.imageUrl) : this.textureFromCanvas(`icon:${item.id}:${item.color}`, createPlaceholderCanvas(item));
      this.overlayMeshes.push({
        mesh: this.createMesh(planeGeometry(1.15 * Number(bars.imageScale || 1), 1.15 * Number(bars.imageScale || 1))),
        billboardPosition: worldImage,
        color: [1,1,1,1], texture: imageTexture, textureUrl: item.imageUrl || '', useTexture: true
      });
      const worldLabel = transformPoint(anchor, [x, baseY + height + 1.72 * Number(bars.labelScale || 1), 0]);
      const labelTexture = this.textureFromCanvas(`label:${item.id}:${item.name}:${item.value}:${bars.labelScale}`, createLabelCanvas(item, 1));
      this.overlayMeshes.push({
        mesh: this.createMesh(planeGeometry(2.15 * Number(bars.labelScale || 1), 0.74 * Number(bars.labelScale || 1))),
        billboardPosition: worldLabel,
        color: [1,1,1,1], texture: labelTexture, useTexture: true
      });
    });
    this.needsFrame = true;
  }

  billboardMatrix(position, eye, target) {
    const forward = normalize(subtract(target, eye));
    const right = normalize(cross(forward, [0, 1, 0]));
    const up = normalize(cross(right, forward));
    const normal = [-forward[0], -forward[1], -forward[2]];
    return new Float32Array([
      right[0], right[1], right[2], 0,
      up[0], up[1], up[2], 0,
      normal[0], normal[1], normal[2], 0,
      position[0], position[1], position[2], 1
    ]);
  }

  drawEntry(entry, viewProjection, eye) {
    const gl = this.gl;
    const model = entry.billboardPosition ? this.billboardMatrix(entry.billboardPosition, eye, this.camera.target) : entry.model;
    const mvp = mat4Multiply(viewProjection, model);
    gl.bindVertexArray(entry.mesh.vao);
    gl.uniformMatrix4fv(this.locations.model, false, model);
    gl.uniformMatrix4fv(this.locations.mvp, false, mvp);
    gl.uniform4fv(this.locations.color, entry.color || [1,1,1,1]);
    let texture = entry.texture || this.whiteTexture;
    if (entry.textureUrl) texture = this.requestTexture(entry.textureUrl);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.locations.texture, 0);
    gl.uniform1f(this.locations.useTexture, entry.useTexture ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, entry.mesh.count);
  }

  render() {
    const gl = this.gl;
    const width = this.canvas.width;
    const height = this.canvas.height;
    if (!width || !height) return;
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!this.state?.outputVisible) return;
    gl.useProgram(this.program);
    const lighting = this.state?.scene?.lighting || {};
    gl.uniform1f(this.locations.ambient, Number(lighting.ambient ?? 0.58));
    gl.uniform1f(this.locations.key, Number(lighting.key ?? 1.15));
    const eye = cameraEye(this.camera);
    const projection = mat4Perspective(this.camera.fov, width / height, 0.05, 120);
    const view = mat4LookAt(eye, this.camera.target);
    const viewProjection = mat4Multiply(projection, view);
    gl.depthMask(true);
    for (const entry of this.meshes) this.drawEntry(entry, viewProjection, eye);
    gl.depthMask(false);
    for (const entry of this.overlayMeshes) this.drawEntry(entry, viewProjection, eye);
    gl.depthMask(true);
    gl.bindVertexArray(null);
  }

  loop() {
    const tick = () => {
      if (this.needsFrame || this.interactive) {
        this.render();
        this.needsFrame = false;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
