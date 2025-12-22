import React, { useEffect, useRef } from "react";

export function dashboard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current || document.getElementById("gauge") as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
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
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.fillStyle = "white";
      ctx.font = "17px Courier New";
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
        ctx.fillText(String(i), cx + Math.cos(a) * (rOuter + 50), cy + Math.sin(a) * (rOuter + 50));
      }

      ctx.restore();
    }

    function drawSpeedScale() {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.fillStyle = "white";
      ctx.font = "16px Courier New";
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
        ctx.fillText(String(val), cx + Math.cos(a) * (rInner + 11), cy + Math.sin(a) * (rInner + 11));
      }

      ctx.restore();
    }

    function drawGauge() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawRpmScale();
      drawSpeedScale();

      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, start, end);
      ctx.strokeStyle = "rgba(140,140,160,0.2)";
      ctx.lineWidth = 45;
      ctx.stroke();

      const p = Math.min(rpm / 8000, 1);
      const rpmEnd = start + (end - start) * p;
      ctx.save();
      ctx.strokeStyle = rpmGrad;
      ctx.lineWidth = 45;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, start, rpmEnd);
      ctx.stroke();
      ctx.restore();

      const sp = Math.min(speed / 255, 1);
      const ang = start + (end - start) * sp;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * rInner, cy + Math.sin(ang) * rInner);
      ctx.strokeStyle = "white";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = "small-caps 120px 'Verdana'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "cyan";
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
    <div className="w-full h-full flex justify-center items-center">
      <style>{`\n/* Pechschwarzer Hintergrund, komplett clean */\n.carbon { background-color: #000; position: relative; }\ncanvas { image-rendering: optimizeSpeed; image-rendering: crisp-edges; }\n.neon-text { text-shadow: 0 0 8px rgba(0,255,255,0.7), 0 0 16px rgba(0,255,255,0.5), 0 0 24px rgba(0,255,255,0.3); }\n.side-box { margin-top: 10px; background: rgba(0,0,0,0.55); border-left: 4px solid #0ff; border-top: 4px solid #0ff; border-radius: 16px; padding: 14px 18px; display: flex; flex-direction: column; justify-content: space-around; height: 90%; backdrop-filter: blur(6px); box-shadow: 0 0 12px rgba(0,255,255,0.2); }\n.value-glow:hover { text-shadow: 0 0 12px #0ff, 0 0 24px #0ff; transform: scale(1.05); transition: all 0.2s ease-in-out; }\n.shift-arrow { position: absolute; margin-top: -20px; font-size: 3.5rem; font-weight: bold; z-index: 20; user-select: none; pointer-events: none; transform: translateY(-50%); top: 50%; }\n#downshift { left: 220px; color: red; display: none; }\n#upshift { right: 240px; color: lime; display: none; }\n      `}</style>

      <div id="wrap" className="carbon w-[1280px] h-[400px] rounded-3xl shadow-2xl relative border border-gray-800 flex">

        <div className="absolute left-4 top-2 bottom-2 flex flex-col justify-between side-box text-white">
          <div>
            <div className="text-gray-400 text-xs tracking-widest">OIL TEMP</div>
            <div id="oil" className="text-cyan-400 neon-text text-2xl font-bold value-glow">60°C</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs tracking-widest">FUEL</div>
            <div id="fuel" className="text-cyan-400 neon-text text-2xl font-bold value-glow">73%</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs tracking-widest">COOLANT</div>
            <div id="temp" className="text-cyan-400 neon-text text-2xl font-bold value-glow">20°C</div>
          </div>
        </div>

        <div id="downshift" className="shift-arrow">⬇</div>
        <div id="upshift" className="shift-arrow">⬆</div>

        <div className="absolute right-4 top-2 bottom-2 flex flex-col justify-between side-box text-white">
          <div>
            <div className="text-gray-400 text-xs tracking-widest">BATTERY</div>
            <div id="voltage" className="text-cyan-400 neon-text text-2xl font-bold value-glow">12.1V</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs tracking-widest">BOOST</div>
            <div id="boost" className="text-cyan-400 neon-text text-2xl font-bold value-glow">1.1 bar</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs tracking-widest">OIL PRESS</div>
            <div id="oilpress" className="text-cyan-400 neon-text text-2xl font-bold value-glow">0.3 bar</div>
          </div>
        </div>

        <canvas ref={canvasRef} id="gauge" width="1250" height="390" className="absolute left-0 top-0"></canvas>

      </div>
    </div>
  );
}
