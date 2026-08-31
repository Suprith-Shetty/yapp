// ============================================================
// Default non-human illustrated avatars (build spec section 2, option 1).
//
// These are drawn on a <canvas> rather than shipped as image files —
// simple geometric/abstract glyphs on a flat tinted background, never
// a human face or figure. Picking one rasterizes it to a PNG File and
// uploads it through the same existing Cloudinary profile-picture
// endpoint a custom upload would use (no separate "default avatar"
// backend concept — see the build summary).
// ============================================================

export const DEFAULT_AVATARS = [
  { id: "comet", label: "Comet", bg: "#5865f2" },
  { id: "wave", label: "Wave", bg: "#23a55a" },
  { id: "spark", label: "Spark", bg: "#f0b232" },
  { id: "moon", label: "Moon", bg: "#6fb2ff" },
  { id: "leaf", label: "Leaf", bg: "#3ba774" },
  { id: "orbit", label: "Orbit", bg: "#7c5cff" },
];

const SIZE = 256;

function drawGlyph(ctx, id) {
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const c = SIZE / 2;

  if (id === "comet") {
    ctx.beginPath();
    ctx.arc(c + 26, c - 26, 22, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(c + 8 - i * 14, c - 8 + i * 14);
      ctx.lineTo(c - 70 + i * 6, c + 70 - i * 4);
      ctx.globalAlpha = 0.55 - i * 0.15;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (id === "wave") {
    ctx.beginPath();
    ctx.moveTo(c - 80, c);
    ctx.bezierCurveTo(c - 55, c - 40, c - 25, c - 40, c, c);
    ctx.bezierCurveTo(c + 25, c + 40, c + 55, c + 40, c + 80, c);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c - 80, c + 34);
    ctx.bezierCurveTo(c - 55, c - 6, c - 25, c - 6, c, c + 34);
    ctx.bezierCurveTo(c + 25, c + 74, c + 55, c + 74, c + 80, c + 34);
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (id === "spark") {
    ctx.beginPath();
    ctx.moveTo(c, c - 78);
    ctx.lineTo(c + 20, c - 16);
    ctx.lineTo(c + 78, c);
    ctx.lineTo(c + 20, c + 16);
    ctx.lineTo(c, c + 78);
    ctx.lineTo(c - 20, c + 16);
    ctx.lineTo(c - 78, c);
    ctx.lineTo(c - 20, c - 16);
    ctx.closePath();
    ctx.fill();
  } else if (id === "moon") {
    ctx.beginPath();
    ctx.arc(c, c, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(c + 30, c - 18, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  } else if (id === "leaf") {
    ctx.beginPath();
    ctx.moveTo(c, c - 70);
    ctx.bezierCurveTo(c + 70, c - 60, c + 70, c + 50, c, c + 70);
    ctx.bezierCurveTo(c - 70, c + 50, c - 70, c - 60, c, c - 70);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(c, c - 60);
    ctx.lineTo(c, c + 62);
    ctx.stroke();
  } else if (id === "orbit") {
    ctx.beginPath();
    ctx.arc(c, c, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(c, c, 78, 32, Math.PI / 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(c, c, 78, 32, -Math.PI / 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export function renderDefaultAvatarDataUrl(id) {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  const meta = DEFAULT_AVATARS.find((a) => a.id === id);
  ctx.fillStyle = meta?.bg || "#5865f2";
  ctx.fillRect(0, 0, SIZE, SIZE);
  drawGlyph(ctx, id);
  return canvas.toDataURL("image/png");
}

export function defaultAvatarToFile(id) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    const meta = DEFAULT_AVATARS.find((a) => a.id === id);
    ctx.fillStyle = meta?.bg || "#5865f2";
    ctx.fillRect(0, 0, SIZE, SIZE);
    drawGlyph(ctx, id);
    canvas.toBlob((blob) => {
      resolve(new File([blob], `${id}.png`, { type: "image/png" }));
    }, "image/png");
  });
}
