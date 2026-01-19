import { useEffect, useRef } from "react";
import backgroundImage from "../background/background.png";

export function dashboard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current || document.getElementById("gauge") as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    let speed = 0;
    let rpm = 0;

    const cx = 640;
    const cy = 390;
    const rOuter = 320;
    const rInner = 250;
    const start = Math.PI * 1.05;
    const end = Math.PI * 1.95;

    const rpmGrad = ctx.createLinearGradient(cx - rOuter, cy - rOuter, cx + rOuter, cy + rOuter);
    rpmGrad.addColorStop(0, "#ff00ff");
    rpmGrad.addColorStop(0.5, "#d64cff");
    rpmGrad.addColorStop(1, "#ff00ff");

    function drawRpmScale() {
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(0,255,255,0.6)";
      ctx.fillStyle = "rgba(0,255,255,0.8)";
      ctx.font = "bold 18px 'Arial'";
      ctx.textAlign = "center";

      for (let i = 0; i <= 8; i++) {
        const a = start + (end - start) * (i / 8);
        const x1 = cx + Math.cos(a) * (rOuter + 15);
        const y1 = cy + Math.sin(a) * (rOuter + 15);
        const x2 = cx + Math.cos(a) * (rOuter + 40);
        const y2 = cy + Math.sin(a) * (rOuter + 40);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.shadowColor = "rgba(0,255,255,0.5)";
        ctx.shadowBlur = 4;
        ctx.fillText(String(i), cx + Math.cos(a) * (rOuter + 55), cy + Math.sin(a) * (rOuter + 55));
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    function drawSpeedScale() {
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(0,255,255,0.5)";
      ctx.fillStyle = "rgba(0,255,255,0.7)";
      ctx.font = "bold 15px 'Arial'";
      ctx.textAlign = "center";

      for (let i = 0; i <= 17; i++) {
        const p = i / 17;
        const a = start + (end - start) * p;
        const val = Math.round(p * 255);
        const x1 = cx + Math.cos(a) * (rInner + 55);
        const y1 = cy + Math.sin(a) * (rInner + 55);
        const x2 = cx + Math.cos(a) * (rInner + 30);
        const y2 = cy + Math.sin(a) * (rInner + 30);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.shadowColor = "rgba(0,255,255,0.4)";
        ctx.shadowBlur = 3;
        ctx.fillText(String(val), cx + Math.cos(a) * (rInner + 11), cy + Math.sin(a) * (rInner + 11));
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    function drawGauge() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawRpmScale();
      drawSpeedScale();

      // Background circle
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, start, end);
      ctx.strokeStyle = "rgba(0,255,255,0.1)";
      ctx.lineWidth = 45;
      ctx.stroke();

      // RPM gradient arc
      const p = Math.min(rpm / 8000, 1);
      const rpmEnd = start + (end - start) * p;
      ctx.save();
      ctx.strokeStyle = rpmGrad;
      ctx.lineWidth = 45;
      ctx.shadowColor = "rgba(0,255,255,0.4)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, start, rpmEnd);
      ctx.stroke();
      ctx.restore();

      // Speed needle
      const sp = Math.min(speed / 255, 1);
      const ang = start + (end - start) * sp;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * rInner, cy + Math.sin(ang) * rInner);
      ctx.strokeStyle = "rgba(0,255,255,0.8)";
      ctx.lineWidth = 4;
      ctx.shadowColor = "rgba(0,255,255,0.6)";
      ctx.shadowBlur = 6;
      ctx.stroke();

      // Speed value
      ctx.font = "small-caps bold 120px 'Verdana'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "cyan";
      ctx.shadowColor = "rgba(0,255,255,0.6)";
      ctx.shadowBlur = 10;
      ctx.fillText(String(speed), cx, cy - 140);
    }

    // WebSocket connection to backend
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.hostname || "localhost";
    const wsUrl = `${proto}://${host}:5000/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.RPM !== undefined) rpm = parseInt(data.RPM);
        if (data.SPEED !== undefined) speed = parseInt(data.SPEED);
        if (data.COOLANT !== undefined) {
          const el = document.getElementById("temp");
          if (el) el.textContent = data.COOLANT;
        }

        // Downshift & Upshift indicators
        const down = document.getElementById("downshift");
        const up = document.getElementById("upshift");
        if (down) down.style.display = rpm < 1000 ? "block" : "none";
        if (up) up.style.display = rpm > 6000 ? "block" : "none";

        drawGauge();
      } catch (e) {
        // ignore
      }
    };

    // initial draw
    drawGauge();

    return () => {
      try {
        ws.close();
      } catch {}
    };
  }, []);

  return (
    <div className="w-full h-full flex justify-center items-center bg-gray-900">
      <style>{`\n/* Background with image */\n.carbon { background: url(${backgroundImage}) center/cover; position: relative; background-size: cover; background-position: center; background-attachment: fixed; }\n.carbon::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,255,255,0.05) 0%, rgba(255,0,255,0.05) 100%); pointer-events: none; }\ncanvas { image-rendering: optimizeSpeed; image-rendering: crisp-edges; filter: drop-shadow(0 0 8px rgba(0,255,255,0.3)); }\n.neon-text { text-shadow: 0 0 8px rgba(0,255,255,0.7), 0 0 16px rgba(0,255,255,0.5), 0 0 24px rgba(0,255,255,0.3); color: #00ffff; }\n.side-box { margin-top: 10px; background: linear-gradient(135deg, rgba(0,0,0,0.65), rgba(0,30,40,0.65)); border-left: 3px solid #00ffff; border-top: 3px solid #00ffff; border-radius: 12px; padding: 16px 20px; display: flex; flex-direction: column; justify-content: space-around; height: 90%; backdrop-filter: blur(8px); box-shadow: 0 0 20px rgba(0,255,255,0.15), inset 0 0 12px rgba(0,255,255,0.08); border-bottom: 1px solid rgba(0,255,255,0.2); border-right: 1px solid rgba(0,255,255,0.2); }\n.value-glow { transition: all 0.2s ease-in-out; }\n.value-glow:hover { text-shadow: 0 0 16px #0ff, 0 0 32px #0ff, 0 0 48px #0ff; transform: scale(1.08); filter: brightness(1.2); }\n.shift-arrow { position: absolute; margin-top: -20px; font-size: 3.5rem; font-weight: bold; z-index: 20; user-select: none; pointer-events: none; transform: translateY(-50%); top: 50%; text-shadow: 0 0 12px; filter: drop-shadow(0 0 8px); }\n#downshift { left: 220px; color: #ff3333; display: none; text-shadow: 0 0 12px #ff3333; }\n#upshift { right: 240px; color: #00ff00; display: none; text-shadow: 0 0 12px #00ff00; }\n.label-text { text-transform: uppercase; letter-spacing: 0.15em; font-size: 0.7rem; color: rgba(0,255,255,0.6); font-weight: 600; }\n      `}</style>

      <div id="wrap" className="carbon w-[1280px] h-[400px] rounded-2xl shadow-2xl relative border border-cyan-900 flex overflow-hidden">

        <div className="absolute left-4 top-2 bottom-2 flex flex-col justify-between side-box">
          <div className="space-y-1">
            <div className="label-text">OIL TEMP</div>
            <div id="oil" className="neon-text text-3xl font-bold value-glow">60°C</div>
          </div>
          <div className="space-y-1">
            <div className="label-text">FUEL</div>
            <div id="fuel" className="neon-text text-3xl font-bold value-glow">73%</div>
          </div>
          <div className="space-y-1">
            <div className="label-text">COOLANT</div>
            <div id="temp" className="neon-text text-3xl font-bold value-glow">20°C</div>
          </div>
        </div>

        <div id="downshift" className="shift-arrow">⬇</div>
        <div id="upshift" className="shift-arrow">⬆</div>

        <div className="absolute right-4 top-2 bottom-2 flex flex-col justify-between side-box">
          <div className="space-y-1">
            <div className="label-text">BATTERY</div>
            <div id="voltage" className="neon-text text-3xl font-bold value-glow">12.1V</div>
          </div>
          <div className="space-y-1">
            <div className="label-text">BOOST</div>
            <div id="boost" className="neon-text text-3xl font-bold value-glow">1.1 bar</div>
          </div>
          <div className="space-y-1">
            <div className="label-text">OIL PRESS</div>
            <div id="oilpress" className="neon-text text-3xl font-bold value-glow">0.3 bar</div>
          </div>
        </div>

        <canvas ref={canvasRef} id="gauge" width="1250" height="390" className="absolute left-0 top-0"></canvas>

      </div>
    </div>
  );
}
