// Getting a face: webcam snapshot (with a 3-second countdown) or file upload.
// Both return a 512x512 square canvas.
import { loadImage, squareCanvas } from "./imageutil.js";

export async function fromFile(file) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const url = URL.createObjectURL(file);
  try {
    return squareCanvas(await loadImage(url), 512);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function fromCamera(modal, video, countEl, snapBtn, cancelBtn) {
  return new Promise(async (resolve, reject) => {
    let stream;
    const close = () => {
      stream && stream.getTracks().forEach((t) => t.stop());
      countEl.textContent = "";
      modal.close();
    };
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (e) {
      return reject(new Error("Camera not available. Allow camera access, or upload a photo instead."));
    }
    video.srcObject = stream;
    await video.play().catch(() => {});
    modal.showModal();
    snapBtn.disabled = false;

    const onCancel = () => { cleanup(); close(); reject(new Error("cancelled")); };
    const onSnap = async () => {
      snapBtn.disabled = true;
      for (let n = 3; n > 0; n--) { countEl.textContent = n; await new Promise((r) => setTimeout(r, 800)); }
      countEl.textContent = "";
      // un-mirror: the preview is mirrored like a selfie, the photo is drawn mirrored too
      const sq = squareCanvas(video, 512);
      const out = document.createElement("canvas");
      out.width = out.height = 512;
      const g = out.getContext("2d");
      g.translate(512, 0);
      g.scale(-1, 1);
      g.drawImage(sq, 0, 0);
      cleanup();
      close();
      resolve(out);
    };
    const cleanup = () => {
      snapBtn.removeEventListener("click", onSnap);
      cancelBtn.removeEventListener("click", onCancel);
      modal.removeEventListener("cancel", onCancel);
    };
    snapBtn.addEventListener("click", onSnap);
    cancelBtn.addEventListener("click", onCancel);
    modal.addEventListener("cancel", onCancel);
  });
}
