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

    // Data storage for circular gauges
    let oilTemp = 0;
    let fuelLevel = 0;
    let coolantTemp = 0;
    let voltage = 12.1;
    let boost = 0;
    let oilPress = 0;

    // Helper function to draw a circular gauge (filled circle)
    function drawCircularGauge(x: number, y: number, radius: number, value: number, max: number, label: string) {
      const percent = Math.min(Math.max(value / max, 0), 1);
      
      // Background circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 140, 43, 0.2)";
      ctx.lineWidth = 12;
      ctx.stroke();
      
      // Filled circle
      ctx.beginPath();
      ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * percent);
      ctx.strokeStyle = "#FF8C2B";
      ctx.lineWidth = 12;
      ctx.shadowColor = "rgba(255, 122, 24, 0.3)";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Center circle
      ctx.beginPath();
      ctx.arc(x, y, radius - 20, 0, Math.PI * 2);
      ctx.fillStyle = "#000";
      ctx.fill();
      
      // Value text in center
      ctx.font = "bold 24px 'Arial'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#FF8C2B";
      ctx.shadowColor = "rgba(255, 122, 24, 0.3)";
      ctx.shadowBlur = 4;
      ctx.fillText(String(Math.round(value)), x, y);
      ctx.shadowBlur = 0;
      
      // Label
      ctx.font = "bold 11px 'Arial'";
      ctx.fillStyle = "#9AA3AE";
      ctx.shadowBlur = 0;
      ctx.fillText(label, x, y + 45);
    }

    // Helper function to draw a three-quarter circle gauge with needle
    function drawThreeQuarterGauge(x: number, y: number, radius: number, value: number, max: number, label: string) {
      const start = Math.PI * 1.05;
      const end = Math.PI * 1.95;
      const percent = Math.min(Math.max(value / max, 0), 1);
      const needleAngle = start + (end - start) * percent;
      
      // Background arc
      ctx.beginPath();
      ctx.arc(x, y, radius, start, end);
      ctx.strokeStyle = "rgba(255, 140, 43, 0.2)";
      ctx.lineWidth = 20;
      ctx.stroke();
      
      // Filled arc
      ctx.beginPath();
      ctx.arc(x, y, radius, start, needleAngle);
      ctx.strokeStyle = "#FF8C2B";
      ctx.lineWidth = 20;
      ctx.shadowColor = "rgba(255, 122, 24, 0.3)";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Scale markers
      ctx.strokeStyle = "rgba(255, 140, 43, 0.5)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= 8; i++) {
        const a = start + (end - start) * (i / 8);
        const x1 = x + Math.cos(a) * (radius + 8);
        const y1 = y + Math.sin(a) * (radius + 8);
        const x2 = x + Math.cos(a) * (radius + 18);
        const y2 = y + Math.sin(a) * (radius + 18);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      
      // Scale labels
      ctx.font = "bold 10px 'Arial'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#EDEFF2";
      for (let i = 0; i <= 8; i++) {
        const a = start + (end - start) * (i / 8);
        ctx.fillText(String(i), x + Math.cos(a) * (radius + 32), y + Math.sin(a) * (radius + 32));
      }
      
      // Needle
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(needleAngle) * (radius - 15), y + Math.sin(needleAngle) * (radius - 15));
      ctx.strokeStyle = "#FF7A18";
      ctx.lineWidth = 4;
      ctx.shadowColor = "rgba(255, 122, 24, 0.5)";
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Center circle
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#FF8C2B";
      ctx.shadowColor = "rgba(255, 122, 24, 0.3)";
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Label
      ctx.font = "bold 11px 'Arial'";
      ctx.fillStyle = "#9AA3AE";
      ctx.fillText(label, x, y + 95);
    }

    function drawGauge() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Left side circular gauges (Oil Temp, Fuel, Coolant)
      drawCircularGauge(80, 100, 50, oilTemp, 120, "OIL");
      drawCircularGauge(80, 200, 50, fuelLevel, 100, "FUEL");
      drawCircularGauge(80, 300, 50, coolantTemp, 120, "COOLANT");
      
      // Center three-quarter gauges (RPM and Speed side by side)
      drawThreeQuarterGauge(400, 200, 90, rpm, 8000, "RPM");
      drawThreeQuarterGauge(840, 200, 90, speed, 255, "SPEED");
      
      // Right side circular gauges (Battery, Boost, Oil Pressure)
      drawCircularGauge(1170, 100, 50, voltage, 13, "BATT");
      drawCircularGauge(1170, 200, 50, boost, 2, "BOOST");
      drawCircularGauge(1170, 300, 50, oilPress, 5, "OIL P");
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
        let changed = false;
        
        if (data.RPM !== undefined) {
          rpm = parseInt(data.RPM);
          changed = true;
        }
        if (data.SPEED !== undefined) {
          speed = parseInt(data.SPEED);
          changed = true;
        }
        if (data.COOLANT !== undefined) {
          coolantTemp = parseInt(data.COOLANT);
          changed = true;
        }
        if (data.OIL !== undefined) {
          oilTemp = parseInt(data.OIL);
          changed = true;
        }
        if (data.FUEL !== undefined) {
          fuelLevel = parseInt(data.FUEL);
          changed = true;
        }
        if (data.VOLTAGE !== undefined || data.BATTERY !== undefined) {
          voltage = parseFloat(data.VOLTAGE || data.BATTERY);
          changed = true;
        }
        if (data.BOOST !== undefined) {
          boost = parseFloat(data.BOOST);
          changed = true;
        }
        if (data.OILPRESS !== undefined) {
          oilPress = parseFloat(data.OILPRESS);
          changed = true;
        }

        // Downshift & Upshift indicators
        const down = document.getElementById("downshift");
        const up = document.getElementById("upshift");
        if (down) down.style.display = rpm < 1000 ? "block" : "none";
        if (up) up.style.display = rpm > 6000 ? "block" : "none";

        if (changed) {
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
          height: 6px;
          background: linear-gradient(90deg, #FF8C2B 0%, #E6761F 100%);
          border-radius: 3px;
          margin-top: 6px;
          transition: width 0.2s ease-out;
          box-shadow: 0 0 8px rgba(255, 140, 43, 0.3);
        }
        
        .side-box { 
          margin-top: 10px; 
          display: flex; 
          flex-direction: column; 
          justify-content: space-around; 
          height: 90%; 
        }
        
        .data-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .value-glow { 
          transition: all 0.15s ease-in-out; 
        }
        
        .value-glow:hover { 
          text-shadow: 0 0 12px #FF8C2B, 0 0 24px #FF7A18; 
          transform: scale(1.05); 
          filter: brightness(1.15); 
        }
        
        .shift-arrow { 
          position: absolute; 
          margin-top: -20px; 
          font-size: 3.5rem; 
          font-weight: bold; 
          z-index: 20; 
          user-select: none; 
          pointer-events: none; 
          transform: translateY(-50%); 
          top: 50%; 
          text-shadow: 0 0 12px; 
          filter: drop-shadow(0 0 6px); 
        }
        
        #downshift { 
          left: 220px; 
          color: #FF3B30; 
          display: none; 
          text-shadow: 0 0 12px #FF3B30; 
        }
        
        #upshift { 
          right: 240px; 
          color: #34C759; 
          display: none; 
          text-shadow: 0 0 12px #34C759; 
        }
        
        .label-text { 
          text-transform: uppercase; 
          letter-spacing: 0.15em; 
          font-size: 0.65rem; 
          color: #9AA3AE; 
          font-weight: 600; 
          text-shadow: none;
        }
      `}</style>

      <div id="wrap" className="carbon w-[1280px] h-[400px] rounded-2xl shadow-2xl relative border flex overflow-hidden" style={{ borderColor: "rgba(255, 140, 43, 0.2)" }}>

        <div id="downshift" className="shift-arrow">⬇</div>
        <div id="upshift" className="shift-arrow">⬆</div>

        <canvas ref={canvasRef} id="gauge" width="1250" height="390" className="absolute left-0 top-0"></canvas>

      </div>
    </div>
  );
}
