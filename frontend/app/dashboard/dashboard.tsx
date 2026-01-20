import { useEffect, useRef } from "react";

export default function dashboard() {
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
    rpmGrad.addColorStop(0, "#FF8C2B");
    rpmGrad.addColorStop(0.5, "#FF7A18");
    rpmGrad.addColorStop(1, "#E6761F");

    const clampPercent = (value: number) => {
      if (!Number.isFinite(value)) return 0;
      return Math.max(0, Math.min(value, 100));
    };

    const setBarLevel = (bar: HTMLElement | null, percent: number) => {
      if (!bar) return;
      const level = clampPercent(percent) / 100;
      bar.style.transform = `scaleY(${level})`;
    };

    function drawRpmScale() {
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(255, 140, 43, 0.6)";
      ctx.fillStyle = "#EDEFF2";
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
        ctx.shadowColor = "rgba(255, 140, 43, 0.3)";
        ctx.shadowBlur = 3;
        ctx.fillText(String(i), cx + Math.cos(a) * (rOuter + 55), cy + Math.sin(a) * (rOuter + 55));
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    function drawSpeedScale() {
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(255, 140, 43, 0.5)";
      ctx.fillStyle = "#9AA3AE";
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
        ctx.shadowColor = "rgba(255, 140, 43, 0.2)";
        ctx.shadowBlur = 2;
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
      ctx.strokeStyle = "rgba(42, 47, 54, 0.5)";
      ctx.lineWidth = 60;
      ctx.stroke();

      // RPM gradient arc
      const p = Math.min(rpm / 8000, 1);
      const rpmEnd = start + (end - start) * p;
      ctx.save();
      ctx.strokeStyle = "#FF8C2B";
      ctx.lineWidth = 60;
      ctx.shadowColor = "rgba(255, 122, 24, 0.3)";
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
      ctx.strokeStyle = "#FF7A18";
      ctx.lineWidth = 5;
      ctx.shadowColor = "rgba(255, 122, 24, 0.5)";
      ctx.shadowBlur = 6;
      ctx.stroke();

      // Speed value
      ctx.font = "small-caps bold 120px 'Verdana'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#EDEFF2";
      ctx.shadowColor = "rgba(255, 122, 24, 0.3)";
      ctx.shadowBlur = 8;
      ctx.fillText(String(speed), cx, cy - 140);
    }

    // WebSocket connection to backend
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.hostname || "localhost";
    const wsUrl = `${proto}://${host}:5000/ws`;
    const ws = new WebSocket(wsUrl);

    let animationId: number;
    let needsRedraw = true;

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        const oldRpm = rpm;
        const oldSpeed = speed;
        
        if (data.RPM !== undefined) rpm = parseInt(data.RPM);
        if (data.SPEED !== undefined) speed = parseInt(data.SPEED);
        
        if (data.COOLANT !== undefined) {
          const el = document.getElementById("temp");
          const bar = document.getElementById("temp-bar");
          if (el) el.textContent = data.COOLANT;
          setBarLevel(bar, (parseInt(data.COOLANT) / 120) * 100);
        }
        if (data.OIL !== undefined) {
          const el = document.getElementById("oil");
          const bar = document.getElementById("oil-bar");
          if (el) el.textContent = data.OIL;
          setBarLevel(bar, (parseInt(data.OIL) / 120) * 100);
        }
        if (data.FUEL !== undefined) {
          const el = document.getElementById("fuel");
          const bar = document.getElementById("fuel-bar");
          if (el) el.textContent = data.FUEL;
          // FUEL is in % (0-100)
          setBarLevel(bar, parseInt(data.FUEL));
        }
        if (data.VOLTAGE !== undefined || data.BATTERY !== undefined) {
          const el = document.getElementById("voltage");
          const bar = document.getElementById("voltage-bar");
          const voltage = parseFloat(data.VOLTAGE || data.BATTERY);
          if (el) el.textContent = voltage;
          // VOLTAGE: 11.8V (0%) to 12.3V (100%)
          const vMin = 11.8;
          const vMax = 12.3;
          const vPercent = ((voltage - vMin) / (vMax - vMin)) * 100;
          setBarLevel(bar, vPercent);
        }
        if (data.BOOST !== undefined) {
          const el = document.getElementById("boost");
          const bar = document.getElementById("boost-bar");
          if (el) el.textContent = data.BOOST;
          // BOOST: 0-2 bar
          setBarLevel(bar, (parseFloat(data.BOOST) / 2) * 100);
        }
        if (data.OILPRESS !== undefined) {
          const el = document.getElementById("oilpress");
          const bar = document.getElementById("oilpress-bar");
          if (el) el.textContent = data.OILPRESS;
          // OIL PRESSURE: 0-5 bar
          setBarLevel(bar, (parseFloat(data.OILPRESS) / 5) * 100);
        }

        if (rpm !== oldRpm || speed !== oldSpeed) {
          needsRedraw = true;
        }
      } catch (e) {
        console.error("Parse error:", e);
      }
    };

    // Continuous animation loop - redraws at 60fps
    const animate = () => {
      if (needsRedraw) {
        drawGauge();
        needsRedraw = false;
      }
      animationId = requestAnimationFrame(animate);
    };

    // initial draw
    drawGauge();
    animate();

    return () => {
      try {
        if (animationId) cancelAnimationFrame(animationId);
        ws.close();
      } catch {}
    };
  }, []);

  return (
    <div className="w-full h-full flex justify-center items-center bg-gray-900">
      <style>{`
        /* Background with image */
        .carbon { 
          background: #000;
          position: relative;
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          border-radius: 20px;
        }
        
        .carbon::before { 
          content: ''; 
          position: absolute; 
          inset: 0; 
          background: linear-gradient(135deg, rgba(255, 140, 43, 0.03) 0%, rgba(255, 140, 43, 0.01) 100%); 
          pointer-events: none; 
          border-radius: 20px;
        }
        
        canvas { 
          image-rendering: optimizeSpeed; 
          image-rendering: crisp-edges; 
          filter: drop-shadow(0 0 8px rgba(255, 122, 24, 0.2)); 
        }
        
        .neon-text { 
          text-shadow: 0 0 8px rgba(255, 122, 24, 0.4), 0 0 16px rgba(255, 140, 43, 0.2); 
          color: #FF8C2B; 
        }
        
        .value-bar {
          width: 12px;
          height: 52px;
          background: linear-gradient(180deg, #FF8C2B 0%, #E6761F 100%);
          border-radius: 10px;
          transition: transform 0.2s ease-out;
          box-shadow: 0 0 8px rgba(255, 140, 43, 0.3);
          transform-origin: bottom;
          transform: scaleY(0);
        }
        
        .side-box { 
          margin-top: 10px; 
          display: grid; 
          grid-template-rows: repeat(3, 1fr);
          align-items: center;
          row-gap: 0;
          height: calc(100% - 20px);
        }
        
        .data-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-start;
        }

        .value-row {
          display: grid;
          grid-template-columns: 110px auto;
          align-items: center;
          column-gap: 4px;
        }

        .value-number {
          font-size: 2.1rem;
          line-height: 1.05;
          text-align: left;
        }

        .right-box .value-row {
          grid-template-columns: auto 110px;
        }

        .right-box .value-number {
          grid-column: 2;
          text-align: right;
        }

        .right-box .value-bar {
          grid-column: 1;
          justify-self: end;
        }

        .right-box .label-text {
          text-align: right;
          width: 100%;
        }
        
        .value-glow { 
          transition: all 0.15s ease-in-out; 
        }
        
        .value-glow:hover { 
          text-shadow: 0 0 12px #FF8C2B, 0 0 24px #FF7A18; 
          transform: scale(1.05); 
          filter: brightness(1.15); 
        }
        
        .label-text { 
          text-transform: uppercase; 
          letter-spacing: 0.15em; 
          font-size: 0.8rem; 
          color: #9AA3AE; 
          font-weight: 700; 
          text-shadow: none;
        }
      `}</style>

      <div id="wrap" className="carbon w-[1280px] h-[400px] rounded-2xl shadow-2xl relative border flex overflow-hidden" style={{ borderColor: "rgba(255, 140, 43, 0.2)" }}>

        <div className="absolute left-1 top-2 bottom-2 flex flex-col justify-between side-box">
          <div className="data-item">
            <div className="label-text">OIL TEMP</div>
            <div className="value-row">
              <div id="oil" className="value-number neon-text font-bold value-glow">60°C</div>
              <div id="oil-bar" className="value-bar"></div>
            </div>
          </div>
          <div className="data-item">
            <div className="label-text">FUEL</div>
            <div className="value-row">
              <div id="fuel" className="value-number neon-text font-bold value-glow">73%</div>
              <div id="fuel-bar" className="value-bar"></div>
            </div>
          </div>
          <div className="data-item">
            <div className="label-text">COOLANT</div>
            <div className="value-row">
              <div id="temp" className="value-number neon-text font-bold value-glow">20°C</div>
              <div id="temp-bar" className="value-bar"></div>
            </div>
          </div>
        </div>

        <div className="absolute right-1 top-2 bottom-2 flex flex-col justify-between side-box right-box">
          <div className="data-item">
            <div className="label-text">BATTERY</div>
            <div className="value-row">
              <div id="voltage-bar" className="value-bar"></div>
              <div id="voltage" className="value-number neon-text font-bold value-glow">12.1V</div>
            </div>
          </div>
          <div className="data-item">
            <div className="label-text">BOOST</div>
            <div className="value-row">
              <div id="boost-bar" className="value-bar"></div>
              <div id="boost" className="value-number neon-text font-bold value-glow">1.1 bar</div>
            </div>
          </div>
          <div className="data-item">
            <div className="label-text">OIL PRESS</div>
            <div className="value-row">
              <div id="oilpress-bar" className="value-bar"></div>
              <div id="oilpress" className="value-number neon-text font-bold value-glow">0.3 bar</div>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} id="gauge" width="1250" height="390" className="absolute left-0 top-0"></canvas>

      </div>
    </div>
  );
}
