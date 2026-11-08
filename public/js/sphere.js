// Bloch sphere of both faces. Tessa encodes each pixel as a point on the colour
// sphere (hue -> azimuth phi, lightness -> polar angle theta). We place every
// measured pixel of both decohered portraits on a qubit's Bloch sphere.
import * as THREE from "three";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function blochPoints(pixels, jitterSeed) {
  const pos = [], col = [];
  let k = jitterSeed;
  const rnd = () => ((k = (k * 16807) % 2147483647) / 2147483647);
  for (const [r, g, b] of pixels) {
    const [h, s, l] = rgbToHsl(r, g, b);
    const theta = (1 - l) * Math.PI;                  // bright -> |0> (north pole)
    const phi = h * 2 * Math.PI + (s < 0.05 ? rnd() * 2 * Math.PI : 0); // grey has no phase: spread it
    const rad = 0.9 + 0.1 * s + (rnd() - 0.5) * 0.02;
    pos.push(rad * Math.sin(theta) * Math.cos(phi), rad * Math.cos(theta), rad * Math.sin(theta) * Math.sin(phi));
    col.push(r / 255, g / 255, b / 255);
  }
  return { pos, col };
}

function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.4, "rgba(255,255,255,0.8)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function label(text, color) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const g = c.getContext("2d");
  g.font = "600 34px JetBrains Mono, monospace";
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 128, 32);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  sp.scale.set(0.6, 0.15, 1);
  return sp;
}

export function makeSphere(container, pixelsA, pixelsB) {
  container.innerHTML = "";
  const w = container.clientWidth || 400, h = container.clientHeight || 320;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
  camera.position.set(2.6, 1.3, 2.6);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 6;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;

  // the sphere itself: faint shell, equator, meridians and the z axis
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0xb38cff, transparent: true, opacity: 0.05, depthWrite: false })
  );
  scene.add(shell);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xb38cff, transparent: true, opacity: 0.35 });
  const circle = (rotX, rotY) => {
    const pts = [];
    for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a))); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
    l.rotation.set(rotX, rotY, 0);
    scene.add(l);
  };
  circle(0, 0);
  circle(Math.PI / 2, 0);
  circle(Math.PI / 2, Math.PI / 2);
  const axis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.25, 0), new THREE.Vector3(0, 1.25, 0)]),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
  );
  scene.add(axis);
  const l0 = label("|0⟩ bright", "#f1eefb"); l0.position.set(0, 1.42, 0); scene.add(l0);
  const l1 = label("|1⟩ dark", "#a49fb8"); l1.position.set(0, -1.42, 0); scene.add(l1);

  const tex = dotTexture();
  const addCloud = (pixels, seed) => {
    const { pos, col } = blochPoints(pixels, seed);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.075, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(pts);
    return pts;
  };
  addCloud(pixelsA, 12345);
  addCloud(pixelsB, 67890);

  let raf;
  const loop = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
  loop();

  const onResize = () => {
    const W = container.clientWidth, H = container.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", onResize);
  return { dispose() { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); renderer.dispose(); }, resize: onResize };
}
