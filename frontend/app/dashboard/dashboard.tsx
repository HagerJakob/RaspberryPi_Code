import { useEffect, useRef, useState } from "react";

export default function dashboard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const elementsRef = useRef<{ [key: string]: HTMLElement | null }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("--:--:--");

  useEffect(() => {
    const canvas = canvasRef.current || (document.getElementById("gauge") as HTMLCanvasElement | null);
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    // Scale canvas for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const width = 1250;
    const height = 390;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    let speed = 0;
    let rpm = 0;

    const cx = 640;
    const cy = 390;
    const rOuter = 320;
    const rInner = 250;
    const start = Math.PI * 1.05;
    const end = Math.PI * 1.95;

    const rpmGrad = ctx.createLinearGradient(cx - rOuter, cy - rOuter, cx + rOuter, cy + rOuter);
    rpmGrad.addColorStop(0, "#5DADE2");
    rpmGrad.addColorStop(0.5, "#00CED1");
    rpmGrad.addColorStop(1, "#20B2AA");

    const clampPercent = (value: number) => {
      if (!Number.isFinite(value)) return 0;
      return Math.max(0, Math.min(value, 100));
    };

    const setBarLevel = (bar: HTMLElement | null, percent: number) => {
      if (!bar) return;
      const level = clampPercent(percent);
      bar.style.height = `${level}%`;
    };

    // Cache metric elements once to avoid repeated DOM lookups on every message
    elementsRef.current = {
      temp: document.getElementById("temp"),
      tempBar: document.getElementById("temp-bar"),
      oil: document.getElementById("oil"),
      oilBar: document.getElementById("oil-bar"),
      fuel: document.getElementById("fuel"),
      fuelBar: document.getElementById("fuel-bar"),
      voltage: document.getElementById("voltage"),
      voltageBar: document.getElementById("voltage-bar"),
      boost: document.getElementById("boost"),
      boostBar: document.getElementById("boost-bar"),
      oilpress: document.getElementById("oilpress"),
      oilpressBar: document.getElementById("oilpress-bar"),
    };

    function drawRpmScale() {
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(32, 178, 170, 0.6)";
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
        ctx.shadowColor = "rgba(0, 206, 209, 0.3)";
        ctx.shadowBlur = 3;
        ctx.fillText(String(i), cx + Math.cos(a) * (rOuter + 55), cy + Math.sin(a) * (rOuter + 55));
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    function drawSpeedScale() {
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(0, 206, 209, 0.5)";
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
        ctx.shadowColor = "rgba(93, 173, 226, 0.2)";
        ctx.shadowBlur = 2;
        ctx.fillText(String(val), cx + Math.cos(a) * (rInner + 11), cy + Math.sin(a) * (rInner + 11));
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    function drawGauge() {
      if (!canvas) return;
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
      ctx.strokeStyle = "#00CED1";
      ctx.lineWidth = 60;
      ctx.shadowColor = "rgba(0, 206, 209, 0.3)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, start, rpmEnd);
      ctx.stroke();
      ctx.restore();

      // Speed needle - spitzer Pfeil
      const sp = Math.min(speed / 255, 1);
      const ang = start + (end - start) * sp;
      
      // Berechne Pfeilspitze
      const tipX = cx + Math.cos(ang) * rInner;
      const tipY = cy + Math.sin(ang) * rInner;
      
      // Berechne Basis-Punkte (perpendikular zum Pfeil)
      const baseWidth = 8;
      const baseLength = 30;
      const perpAngle = ang + Math.PI / 2;
      
      const base1X = cx + Math.cos(perpAngle) * baseWidth - Math.cos(ang) * baseLength;
      const base1Y = cy + Math.sin(perpAngle) * baseWidth - Math.sin(ang) * baseLength;
      const base2X = cx - Math.cos(perpAngle) * baseWidth - Math.cos(ang) * baseLength;
      const base2Y = cy - Math.sin(perpAngle) * baseWidth - Math.sin(ang) * baseLength;
      
      // Zeichne Pfeil als gefülltes Dreieck
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(base1X, base1Y);
      ctx.lineTo(base2X, base2Y);
      ctx.closePath();
      ctx.fillStyle = "#00CED1";
      ctx.shadowColor = "rgba(0, 206, 209, 0.5)";
      ctx.shadowBlur = 6;
      ctx.fill();

      // Speed value
      ctx.font = "small-caps bold 120px 'Verdana'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0, 206, 209, 0.3)";
      ctx.shadowBlur = 8;
      ctx.fillText(String(speed), cx, cy - 140);
    }

    // WebSocket connection to backend
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.hostname || "localhost";
    const wsUrl = `${proto}://${host}:5000/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    let frameId: number | null = null;
    let needsRedraw = true;
    let lastUpdateTime = 0;
    const updateThrottle = 16; // ~60 FPS

    const requestDraw = () => {
      if (frameId !== null) return;
      frameId = requestAnimationFrame((timestamp) => {
        frameId = null;
        if (timestamp - lastUpdateTime >= updateThrottle && needsRedraw) {
          lastUpdateTime = timestamp;
          drawGauge();
          needsRedraw = false;
        } else if (needsRedraw) {
          requestDraw();
        }
      });
    };

    let lastMessageTime = 0;
    const messageThrottle = 16; // ~60 FPS

    ws.onmessage = (ev) => {
      try {
        const now = Date.now();
        const data = JSON.parse(ev.data);
        
        // Update connection status based on UART connection
        if (data.UART_CONNECTED !== undefined) {
          setIsConnected(Boolean(data.UART_CONNECTED));
        }

        // Update current time from Pi if present
        if (data.TIME) {
          setCurrentTime(String(data.TIME));
        }
        
        // Throttle updates zu ~60 FPS
        if (now - lastMessageTime < messageThrottle) {
          return;
        }
        lastMessageTime = now;
        
        const oldRpm = rpm;
        const oldSpeed = speed;
        
        if (data.RPM !== undefined) rpm = parseInt(data.RPM, 10);
        if (data.SPEED !== undefined) speed = parseInt(data.SPEED, 10);
        
        const els = elementsRef.current;

        if (data.COOLANT !== undefined) {
          const val = parseInt(data.COOLANT, 10);
          const el = els.temp;
          const bar = els.tempBar;
          if (el) el.innerHTML = `${val}<span class="unit">°C</span>`;
          setBarLevel(bar, (val / 120) * 100);
        }
        if (data.OIL !== undefined) {
          const val = parseInt(data.OIL, 10);
          const el = els.oil;
          const bar = els.oilBar;
          if (el) el.innerHTML = `${val}<span class="unit">°C</span>`;
          setBarLevel(bar, (val / 120) * 100);
        }
        if (data.FUEL !== undefined) {
          const val = parseInt(data.FUEL, 10);
          const el = els.fuel;
          const bar = els.fuelBar;
          if (el) el.innerHTML = `${val}<span class="unit">%</span>`;
          setBarLevel(bar, val);
        }
        if (data.VOLTAGE !== undefined || data.BATTERY !== undefined) {
          const voltage = parseFloat(data.VOLTAGE || data.BATTERY);
          const el = els.voltage;
          const bar = els.voltageBar;
          if (Number.isFinite(voltage)) {
            if (el) el.innerHTML = `${voltage.toFixed(1)}<span class="unit">V</span>`;
            const vMin = 11.8;
            const vMax = 12.3;
            const vPercent = ((voltage - vMin) / (vMax - vMin)) * 100;
            setBarLevel(bar, vPercent);
          }
        }
        if (data.BOOST !== undefined) {
          const val = parseFloat(data.BOOST);
          const el = els.boost;
          const bar = els.boostBar;
          if (Number.isFinite(val)) {
            if (el) el.innerHTML = `${val.toFixed(1)}<span class="unit">bar</span>`;
            setBarLevel(bar, (val / 2) * 100);
          }
        }
        if (data.OILPRESS !== undefined) {
          const val = parseFloat(data.OILPRESS);
          const el = els.oilpress;
          const bar = els.oilpressBar;
          if (Number.isFinite(val)) {
            if (el) el.innerHTML = `${val.toFixed(1)}<span class="unit">bar</span>`;
            // OIL PRESSURE: 0-5 bar
            setBarLevel(bar, (val / 5) * 100);
          }
        }

        if (rpm !== oldRpm || speed !== oldSpeed) {
          needsRedraw = true;
          requestDraw();
        }
      } catch (e) {
        console.error("Parse error:", e);
      }
    };

    // initial draw on next animation frame
    needsRedraw = true;
    requestDraw();

    return () => {
      try {
        if (frameId !== null) cancelAnimationFrame(frameId);
        ws.close();
      } catch {}
    };
  }, []);

  return (
    <div className="w-full h-full flex justify-center items-center bg-gray-900">
      <style>{`
        .carbon { 
          background: #000;
          position: relative;
          border-radius: 20px;
        }
        
        .carbon::before { 
          content: ''; 
          position: absolute; 
          inset: 0; 
          background: linear-gradient(135deg, rgba(0, 206, 209, 0.03) 0%, rgba(93, 173, 226, 0.01) 100%); 
          pointer-events: none; 
          border-radius: 20px;
        }
        
        canvas { 
          filter: drop-shadow(0 0 8px rgba(0, 206, 209, 0.2)); 
          position: relative;
          z-index: 10;
        }
        
        /* Widget Card Design */
        .metric-widget {
          background: linear-gradient(135deg, rgba(20, 30, 40, 0.5) 0%, rgba(15, 25, 35, 0.7) 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 206, 209, 0.25);
          border-radius: 12px;
          padding: 14px 16px;
          position: relative;
          overflow: hidden;
          box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(0, 206, 209, 0.1);
          transition: all 0.2s ease;
        }
        
        .metric-widget::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0, 206, 209, 0.05) 0%, transparent 50%);
          pointer-events: none;
        }
        
        .metric-widget:hover {
          border-color: rgba(0, 206, 209, 0.4);
          box-shadow: 
            0 6px 20px rgba(0, 206, 209, 0.15),
            inset 0 1px 0 rgba(0, 206, 209, 0.15);
          transform: translateY(-1px);
        }
        
        .widget-label {
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(154, 163, 174, 0.8);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .widget-label::before {
          content: '';
          width: 2px;
          height: 10px;
          background: linear-gradient(180deg, #00CED1 0%, #5DADE2 100%);
          border-radius: 2px;
          box-shadow: 0 0 6px rgba(0, 206, 209, 0.5);
        }
        
        .widget-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        
        .widget-value {
          font-size: 2.25rem;
          font-weight: 700;
          line-height: 1;
          color: #00CED1;
          text-shadow: 
            0 0 10px rgba(0, 206, 209, 0.5),
            0 0 20px rgba(93, 173, 226, 0.3);
        }
        
        .widget-value .unit {
          font-size: 1.2rem;
          font-weight: 400;
          margin-left: 6px;
          opacity: 0.7;
          vertical-align: super;
          font-size: 0.75rem;
        }
        
        .widget-bar-container {
          position: relative;
          width: 12px;
          height: 48px;
          background: rgba(20, 30, 40, 0.6);
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid rgba(0, 206, 209, 0.15);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .widget-bar-fill {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 0%;
          background: linear-gradient(180deg, #5DADE2 0%, #00CED1 50%, #20B2AA 100%);
          box-shadow: 0 0 12px rgba(0, 206, 209, 0.6);
          transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .widgets-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
      `}</style>

      <div id="wrap" className="carbon w-[1280px] h-[400px] rounded-2xl shadow-2xl relative border flex overflow-hidden" style={{ borderColor: "rgba(0, 206, 209, 0.2)" }}>
        
        {/* Connection Status */}
        <div className="absolute top-4 left-4 z-50">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm ${
            isConnected 
              ? 'bg-cyan-500/20 border border-cyan-500/40' 
              : 'bg-red-500/20 border border-red-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-cyan-400 animate-pulse' : 'bg-red-400'
            }`} />
            <span className={`text-sm font-medium ${
              isConnected ? 'text-cyan-200' : 'text-red-200'
            }`}>
              {isConnected ? 'Running' : 'Not Connected - Please Connect'}
            </span>
          </div>
        </div>

        {/* Pi Time */}
        <div className="absolute top-4 right-4 z-50">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm bg-[#0a192f]/60 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm font-semibold text-cyan-100 tracking-wider">{currentTime}</span>
          </div>
        </div>

        {/* Left Widgets */}
        <div className="absolute left-4 top-16 bottom-4 w-[200px] widgets-container">
          
          {/* Oil Temp Widget */}
          <div className="metric-widget">
            <div className="widget-label">Oil Temp</div>
            <div className="widget-content">
              <div id="oil" className="widget-value">60°C</div>
              <div className="widget-bar-container">
                <div id="oil-bar" className="widget-bar-fill"></div>
              </div>
            </div>
          </div>

          {/* Fuel Widget */}
          <div className="metric-widget">
            <div className="widget-label">Fuel Level</div>
            <div className="widget-content">
              <div id="fuel" className="widget-value">73%</div>
              <div className="widget-bar-container">
                <div id="fuel-bar" className="widget-bar-fill"></div>
              </div>
            </div>
          </div>

          {/* Coolant Widget */}
          <div className="metric-widget">
            <div className="widget-label">Coolant Temp</div>
            <div className="widget-content">
              <div id="temp" className="widget-value">20°C</div>
              <div className="widget-bar-container">
                <div id="temp-bar" className="widget-bar-fill"></div>
              </div>
            </div>
          </div>

        </div>

        {/* Center Canvas */}
        <canvas ref={canvasRef} id="gauge" width="1250" height="390" className="absolute left-0 top-0 z-10"></canvas>

        {/* Right Widgets */}
        <div className="absolute right-4 top-16 bottom-4 w-[200px] widgets-container">
          
          {/* Battery Widget */}
          <div className="metric-widget">
            <div className="widget-label">Battery</div>
            <div className="widget-content">
              <div className="widget-bar-container">
                <div id="voltage-bar" className="widget-bar-fill"></div>
              </div>
              <div id="voltage" className="widget-value">12.1V</div>
            </div>
          </div>

          {/* Boost Widget */}
          <div className="metric-widget">
            <div className="widget-label">Boost Pressure</div>
            <div className="widget-content">
              <div className="widget-bar-container">
                <div id="boost-bar" className="widget-bar-fill"></div>
              </div>
              <div id="boost" className="widget-value">1.1 bar</div>
            </div>
          </div>

          {/* Oil Pressure Widget */}
          <div className="metric-widget">
            <div className="widget-label">Oil Pressure</div>
            <div className="widget-content">
              <div className="widget-bar-container">
                <div id="oilpress-bar" className="widget-bar-fill"></div>
              </div>
              <div id="oilpress" className="widget-value">0.3 bar</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
