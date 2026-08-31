import React, { useRef, useState, useEffect, useCallback } from "react";
import "./AvatarCropper.css";

const OUTPUT_SIZE = 512;
const STAGE_SIZE = 280;

// A minimal circular crop/zoom/reposition tool, built directly on
// <canvas> — drag to reposition, slider to zoom, live circular preview,
// exports a PNG File on confirm. No external cropper dependency.
export default function AvatarCropper({ file, onCancel, onConfirm }) {
  const [imgEl, setImgEl] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [minZoom, setMinZoom] = useState(1);
  const dragRef = useRef(null);
  const stageRef = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.max(STAGE_SIZE / img.width, STAGE_SIZE / img.height);
      setMinZoom(scale);
      setZoom(scale);
      setOffset({ x: 0, y: 0 });
      setImgEl(img);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clampOffset = useCallback(
    (next, z) => {
      if (!imgEl) return next;
      const w = imgEl.width * z;
      const h = imgEl.height * z;
      const maxX = Math.max(0, (w - STAGE_SIZE) / 2);
      const maxY = Math.max(0, (h - STAGE_SIZE) / 2);
      return { x: Math.min(maxX, Math.max(-maxX, next.x)), y: Math.min(maxY, Math.max(-maxY, next.y)) };
    },
    [imgEl]
  );

  const handlePointerDown = (e) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: offset };
    stageRef.current?.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset({ x: dragRef.current.origin.x + dx, y: dragRef.current.origin.y + dy }, zoom));
  };
  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleZoom = (e) => {
    const z = Number(e.target.value);
    setZoom(z);
    setOffset((prev) => clampOffset(prev, z));
  };

  const confirm = () => {
    if (!imgEl) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    const outScale = OUTPUT_SIZE / STAGE_SIZE;

    ctx.save();
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const drawW = imgEl.width * zoom * outScale;
    const drawH = imgEl.height * zoom * outScale;
    const drawX = OUTPUT_SIZE / 2 - drawW / 2 + offset.x * outScale;
    const drawY = OUTPUT_SIZE / 2 - drawH / 2 + offset.y * outScale;
    ctx.drawImage(imgEl, drawX, drawY, drawW, drawH);
    ctx.restore();

    canvas.toBlob((blob) => {
      onConfirm(new File([blob], "avatar.png", { type: "image/png" }));
    }, "image/png");
  };

  return (
    <div className="cropper">
      <div
        className="cropper-stage"
        ref={stageRef}
        style={{ width: STAGE_SIZE, height: STAGE_SIZE }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {imgEl && (
          <img
            src={imgEl.src}
            alt=""
            draggable={false}
            style={{
              width: imgEl.width * zoom,
              height: imgEl.height * zoom,
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
            }}
          />
        )}
        <div className="cropper-mask" />
      </div>

      <label className="cropper-zoom">
        <span>Zoom</span>
        <input
          type="range"
          min={minZoom}
          max={minZoom * 3}
          step={minZoom / 100}
          value={zoom}
          onChange={handleZoom}
        />
      </label>

      <div className="cropper-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={confirm} disabled={!imgEl}>
          Use photo
        </button>
      </div>
    </div>
  );
}
