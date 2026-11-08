// Image helpers: load, square-crop, resize, read pixels.

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("could not load image"));
    img.src = src;
  });
}

// Centre square crop of any image/video/canvas source, drawn at size x size.
export function squareCanvas(source, size) {
  const w = source.videoWidth || source.naturalWidth || source.width;
  const h = source.videoHeight || source.naturalHeight || source.height;
  const s = Math.min(w, h);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  // bias the crop slightly upwards: faces usually sit in the upper half
  const sy = Math.max(0, Math.min(h - s, (h - s) * 0.3));
  ctx.drawImage(source, (w - s) / 2, sy, s, s, 0, 0, size, size);
  return c;
}

export function resized(canvas, size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, size, size);
  return c;
}

export function toBase64(canvas, type = "image/jpeg", quality = 0.9) {
  return canvas.toDataURL(type, quality).split(",")[1];
}

// 8-cell brightness grid (4 x 2) used to compose the melody.
export function brightnessGrid(canvas) {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 2;
  const ctx = c.getContext("2d");
  ctx.drawImage(canvas, 0, 0, 4, 2);
  const d = ctx.getImageData(0, 0, 4, 2).data;
  const out = [];
  for (let i = 0; i < d.length; i += 4) out.push(Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]));
  return out;
}

// All pixels of an image as [r, g, b] triples (0..255).
export function pixels(img) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const out = [];
  for (let i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2]]);
  return out;
}
