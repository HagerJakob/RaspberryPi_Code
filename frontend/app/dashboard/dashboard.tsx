import { useEffect, useRef, useState } from "react";

type ThemeName = "teal" | "ember" | "emerald" | "sapphire" | "crimson" | "solar" | "lime" | "copper" | "ice";
type BackgroundMode = "dark-carbon" | "dark-clean";

const THEMES: Record<ThemeName, {
  accent: string;
  accentSoft: string;
  accentDeep: string;
  rpmTick: string;
  speedTick: string;
  scaleText: string;
  scaleTextSecondary: string;
  beamMid: string;
  beamEnd: string;
  glow: string;
  speedText: string;
  speedShadow: string;
  hiltStroke: string;
  hiltGuard: string;
}> = {
  teal: {
    accent: "#00CED1",
    accentSoft: "#5DADE2",
    accentDeep: "#20B2AA",
    rpmTick: "rgba(32, 178, 170, 0.6)",
    speedTick: "rgba(0, 206, 209, 0.5)",
    scaleText: "#EDEFF2",
    scaleTextSecondary: "#9AA3AE",
    beamMid: "rgba(0, 206, 209, 0.6)",
    beamEnd: "rgba(93, 173, 226, 1)",
    glow: "rgba(0, 206, 209, 0.8)",
    speedText: "#FFFFFF",
    speedShadow: "rgba(0, 206, 209, 0.2)",
    hiltStroke: "rgba(0, 206, 209, 0.35)",
    hiltGuard: "rgba(0, 206, 209, 0.6)",
  },
  ember: {
    accent: "#FF7A18",
    accentSoft: "#FFB347",
    accentDeep: "#FF3D00",
    rpmTick: "rgba(255, 77, 0, 0.6)",
    speedTick: "rgba(255, 122, 24, 0.5)",
    scaleText: "#F7E9E2",
    scaleTextSecondary: "#B3A49A",
    beamMid: "rgba(255, 122, 24, 0.6)",
    beamEnd: "rgba(255, 179, 71, 1)",
    glow: "rgba(255, 122, 24, 0.8)",
    speedText: "#FFF5EE",
    speedShadow: "rgba(255, 122, 24, 0.25)",
    hiltStroke: "rgba(255, 122, 24, 0.35)",
    hiltGuard: "rgba(255, 122, 24, 0.7)",
  },
  emerald: {
    accent: "#4AF2A1",
    accentSoft: "#92F2D7",
    accentDeep: "#2BC48A",
    rpmTick: "rgba(43, 196, 138, 0.6)",
    speedTick: "rgba(74, 242, 161, 0.5)",
    scaleText: "#E8F5EE",
    scaleTextSecondary: "#9FB7A8",
    beamMid: "rgba(74, 242, 161, 0.6)",
    beamEnd: "rgba(146, 242, 215, 1)",
    glow: "rgba(74, 242, 161, 0.8)",
    speedText: "#F4FFF9",
    speedShadow: "rgba(74, 242, 161, 0.25)",
    hiltStroke: "rgba(74, 242, 161, 0.35)",
    hiltGuard: "rgba(74, 242, 161, 0.7)",
  },
  sapphire: {
    accent: "#3B82F6",
    accentSoft: "#60A5FA",
    accentDeep: "#1D4ED8",
    rpmTick: "rgba(29, 78, 216, 0.6)",
    speedTick: "rgba(59, 130, 246, 0.5)",
    scaleText: "#EEF2FF",
    scaleTextSecondary: "#A5B4FC",
    beamMid: "rgba(59, 130, 246, 0.6)",
    beamEnd: "rgba(96, 165, 250, 1)",
    glow: "rgba(59, 130, 246, 0.85)",
    speedText: "#F8FAFF",
    speedShadow: "rgba(59, 130, 246, 0.25)",
    hiltStroke: "rgba(59, 130, 246, 0.35)",
    hiltGuard: "rgba(59, 130, 246, 0.7)",
  },
  crimson: {
    accent: "#E11D48",
    accentSoft: "#FB7185",
    accentDeep: "#BE123C",
    rpmTick: "rgba(190, 18, 60, 0.6)",
    speedTick: "rgba(225, 29, 72, 0.5)",
    scaleText: "#FEEEF1",
    scaleTextSecondary: "#FCA5A5",
    beamMid: "rgba(225, 29, 72, 0.6)",
    beamEnd: "rgba(251, 113, 133, 1)",
    glow: "rgba(225, 29, 72, 0.8)",
    speedText: "#FFF5F7",
    speedShadow: "rgba(225, 29, 72, 0.25)",
    hiltStroke: "rgba(225, 29, 72, 0.35)",
    hiltGuard: "rgba(225, 29, 72, 0.7)",
  },
  solar: {
    accent: "#F59E0B",
    accentSoft: "#FCD34D",
    accentDeep: "#D97706",
    rpmTick: "rgba(217, 119, 6, 0.6)",
    speedTick: "rgba(245, 158, 11, 0.5)",
    scaleText: "#FFF7E6",
    scaleTextSecondary: "#FACC15",
    beamMid: "rgba(245, 158, 11, 0.6)",
    beamEnd: "rgba(252, 211, 77, 1)",
    glow: "rgba(245, 158, 11, 0.8)",
    speedText: "#FFF9ED",
    speedShadow: "rgba(245, 158, 11, 0.25)",
    hiltStroke: "rgba(245, 158, 11, 0.35)",
    hiltGuard: "rgba(245, 158, 11, 0.7)",
  },
  lime: {
    accent: "#6EEB83",
    accentSoft: "#B9FBC0",
    accentDeep: "#2DC653",
    rpmTick: "rgba(45, 198, 83, 0.6)",
    speedTick: "rgba(110, 235, 131, 0.5)",
    scaleText: "#EFFFF1",
    scaleTextSecondary: "#A7D7B4",
    beamMid: "rgba(110, 235, 131, 0.6)",
    beamEnd: "rgba(185, 251, 192, 1)",
    glow: "rgba(110, 235, 131, 0.8)",
    speedText: "#F5FFF7",
    speedShadow: "rgba(110, 235, 131, 0.25)",
    hiltStroke: "rgba(110, 235, 131, 0.35)",
    hiltGuard: "rgba(110, 235, 131, 0.7)",
  },
  copper: {
    accent: "#C97B63",
    accentSoft: "#F4B183",
    accentDeep: "#8C4A36",
    rpmTick: "rgba(140, 74, 54, 0.6)",
    speedTick: "rgba(201, 123, 99, 0.5)",
    scaleText: "#F7E9E2",
    scaleTextSecondary: "#D1B1A6",
    beamMid: "rgba(201, 123, 99, 0.6)",
    beamEnd: "rgba(244, 177, 131, 1)",
    glow: "rgba(201, 123, 99, 0.8)",
    speedText: "#FFF4EE",
    speedShadow: "rgba(201, 123, 99, 0.25)",
    hiltStroke: "rgba(201, 123, 99, 0.35)",
    hiltGuard: "rgba(201, 123, 99, 0.7)",
  },
  ice: {
    accent: "#5BD6FF",
    accentSoft: "#A0E9FF",
    accentDeep: "#1E96C8",
    rpmTick: "rgba(30, 150, 200, 0.6)",
    speedTick: "rgba(91, 214, 255, 0.5)",
    scaleText: "#EAF7FF",
    scaleTextSecondary: "#B6D9F2",
    beamMid: "rgba(91, 214, 255, 0.6)",
    beamEnd: "rgba(160, 233, 255, 1)",
    glow: "rgba(91, 214, 255, 0.85)",
    speedText: "#F7FCFF",
    speedShadow: "rgba(91, 214, 255, 0.25)",
    hiltStroke: "rgba(91, 214, 255, 0.35)",
    hiltGuard: "rgba(91, 214, 255, 0.7)",
  },
};

const resolveTheme = (value: string | null | undefined): ThemeName => {
  if (value === "ember" || value === "emerald" || value === "teal" || value === "sapphire" || value === "crimson" || value === "solar" || value === "lime" || value === "copper" || value === "ice") return value;
  return "teal";
};

const THEME_ORDER: ThemeName[] = ["teal", "ember", "emerald", "sapphire", "crimson", "solar", "lime", "copper", "ice"];
const BACKGROUND_ORDER: BackgroundMode[] = ["dark-carbon", "dark-clean"];

type DashboardProps = {
  theme?: ThemeName;
};

export default function Dashboard({ theme }: DashboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const elementsRef = useRef<{ [key: string]: HTMLElement | null }>({});
  const simValuesRef = useRef({ active: false, speed: 0, rpm: 0, coolant: 20 });
  const applySimRef = useRef<(() => void) | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("--:--:--");
  const [themeOverride, setThemeOverride] = useState<ThemeName | null>(null);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("dark-carbon");
  const [simSpeed, setSimSpeed] = useState(0);
  const [simRpm, setSimRpm] = useState(0);
  const [simCoolant, setSimCoolant] = useState(20);
  const themeFromQuery = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("theme") : null;
  const themeName = resolveTheme(theme ?? themeFromQuery);
  const effectiveTheme = themeOverride ?? themeName;
  const activeTheme = THEMES[effectiveTheme];

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
    const cy = 398;
    const rOuter = 320;
    const rInner = 250;
    const start = Math.PI * 1.05;
    const end = Math.PI * 1.95;

    const rpmGrad = ctx.createLinearGradient(cx - rOuter, cy - rOuter, cx + rOuter, cy + rOuter);
    rpmGrad.addColorStop(0, activeTheme.accentSoft);
    rpmGrad.addColorStop(0.5, activeTheme.accent);
    rpmGrad.addColorStop(1, activeTheme.accentDeep);

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

    // Create offscreen canvas for static scales (cache)
    const scaleCanvas = document.createElement('canvas');
    scaleCanvas.width = canvas.width;
    scaleCanvas.height = canvas.height;
    const scaleCtx = scaleCanvas.getContext("2d")!;
    scaleCtx.scale(dpr, dpr);

    function drawAndCacheScales() {
      // RPM Scale
      scaleCtx.save();
      scaleCtx.lineWidth = 2.5;
      scaleCtx.strokeStyle = activeTheme.rpmTick;
      scaleCtx.fillStyle = activeTheme.scaleText;
      scaleCtx.font = "bold 18px 'Arial'";
      scaleCtx.textAlign = "center";
      scaleCtx.textBaseline = "middle";

      for (let i = 0; i <= 8; i++) {
        const a = start + (end - start) * (i / 8);
        const x1 = cx + Math.cos(a) * (rOuter + 15);
        const y1 = cy + Math.sin(a) * (rOuter + 15);
        const x2 = cx + Math.cos(a) * (rOuter + 40);
        const y2 = cy + Math.sin(a) * (rOuter + 40);
        scaleCtx.beginPath();
        scaleCtx.moveTo(x1, y1);
        scaleCtx.lineTo(x2, y2);
        scaleCtx.stroke();
        scaleCtx.fillText(String(i), cx + Math.cos(a) * (rOuter + 55), cy + Math.sin(a) * (rOuter + 55));
      }

      // Speed Scale
      scaleCtx.lineWidth = 2.5;
      scaleCtx.strokeStyle = activeTheme.speedTick;
      scaleCtx.fillStyle = activeTheme.scaleTextSecondary;
      scaleCtx.font = "bold 15px 'Arial'";
      scaleCtx.textBaseline = "middle";

      for (let i = 0; i <= 17; i++) {
        const p = i / 17;
        const a = start + (end - start) * p;
        const val = Math.round(p * 255);
        const x1 = cx + Math.cos(a) * (rInner + 55);
        const y1 = cy + Math.sin(a) * (rInner + 55);
        const x2 = cx + Math.cos(a) * (rInner + 30);
        const y2 = cy + Math.sin(a) * (rInner + 30);
        scaleCtx.beginPath();
        scaleCtx.moveTo(x1, y1);
        scaleCtx.lineTo(x2, y2);
        scaleCtx.stroke();
        scaleCtx.fillText(String(val), cx + Math.cos(a) * (rInner + 11), cy + Math.sin(a) * (rInner + 11));
      }

      scaleCtx.restore();
    }

    drawAndCacheScales();

    function drawGauge() {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw cached scales without double-scaling
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(scaleCanvas, 0, 0);
      ctx.restore();

      // Background circle
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, start, end);
      ctx.strokeStyle = "rgba(42, 47, 54, 0.5)";
      ctx.lineWidth = 60;
      ctx.stroke();

      // RPM gradient arc
      const p = Math.min(rpm / 8000, 1);
      const rpmEnd = start + (end - start) * p;
      ctx.strokeStyle = activeTheme.accent;
      ctx.lineWidth = 60;
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, start, rpmEnd);
      ctx.stroke();

      // Laser-style speed needle with holder
      const sp = Math.max(0, Math.min(speed / 255, 1));
      const targetAngle = start + (end - start) * sp;
      const pivotY = cy - 12;
      const targetX = cx + Math.cos(targetAngle) * rInner;
      const targetY = cy + Math.sin(targetAngle) * rInner;
      const ang = Math.atan2(targetY - pivotY, targetX - cx);
      const needleLen = rInner - 2;

      ctx.save();
      ctx.translate(cx, pivotY);
      ctx.rotate(ang);

      // Glow beam
      const beamGrad = ctx.createLinearGradient(0, 0, needleLen, 0);
      beamGrad.addColorStop(0, "rgba(0, 206, 209, 0.0)");
      beamGrad.addColorStop(0.2, activeTheme.beamMid);
      beamGrad.addColorStop(1, activeTheme.beamEnd);

      ctx.shadowColor = activeTheme.glow;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(needleLen, 0);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner core for lightsaber effect
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(26, 0);
      ctx.lineTo(needleLen - 8, 0);
      ctx.stroke();

      // Holder (hilt + guard)
      ctx.fillStyle = "#0b1418";
      ctx.strokeStyle = activeTheme.hiltStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-16, -9, 42, 18, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#0f1f24";
      ctx.beginPath();
      ctx.roundRect(-4, -14, 14, 28, 6);
      ctx.fill();

      ctx.strokeStyle = activeTheme.hiltGuard;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(7, -13);
      ctx.lineTo(7, 13);
      ctx.stroke();

      ctx.restore();

      // Speed value
      ctx.font = "small-caps bold 120px 'Verdana'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = activeTheme.speedText;
      ctx.shadowColor = activeTheme.speedShadow;
      ctx.shadowBlur = 4;
      ctx.fillText(String(speed), cx, cy - 140);
      ctx.shadowBlur = 0;

      // km/h Einheit
      ctx.font = "20px 'Arial'";
      ctx.fillStyle = activeTheme.accent;
      ctx.textAlign = "center";
      ctx.fillText("km/h", cx, cy - 70);
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

    const applySimValues = () => {
      speed = simValuesRef.current.speed;
      rpm = simValuesRef.current.rpm;
      const coolant = simValuesRef.current.coolant;
      const el = elementsRef.current.temp;
      const bar = elementsRef.current.tempBar;
      if (el) el.innerHTML = `${coolant}<span class="unit">°C</span>`;
      setBarLevel(bar, (coolant / 120) * 100);
      needsRedraw = true;
      requestDraw();
    };

    applySimRef.current = applySimValues;

    let lastMessageTime = 0;
    const messageThrottle = 16; // ~60 FPS

    ws.onmessage = (ev) => {
      try {
        const now = Date.now();
        const data = JSON.parse(ev.data);
        const isSimActive = simValuesRef.current.active;
        
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

        if (isSimActive) {
          rpm = simValuesRef.current.rpm;
          speed = simValuesRef.current.speed;
        } else {
          if (data.RPM !== undefined) rpm = parseInt(data.RPM, 10);
          if (data.SPEED !== undefined) speed = parseInt(data.SPEED, 10);
        }
        
        const els = elementsRef.current;

        if (isSimActive) {
          const val = simValuesRef.current.coolant;
          const el = els.temp;
          const bar = els.tempBar;
          if (el) el.innerHTML = `${val}<span class="unit">°C</span>`;
          setBarLevel(bar, (val / 120) * 100);
        } else if (data.COOLANT !== undefined) {
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
  }, [effectiveTheme]);

  const handleThemeCycle = () => {
    const currentIndex = THEME_ORDER.indexOf(effectiveTheme);
    const nextTheme = THEME_ORDER[(currentIndex + 1) % THEME_ORDER.length];
    setThemeOverride(nextTheme);
  };

  const handleBackgroundToggle = () => {
    setBackgroundMode((prev) => {
      const currentIndex = BACKGROUND_ORDER.indexOf(prev);
      return BACKGROUND_ORDER[(currentIndex + 1) % BACKGROUND_ORDER.length];
    });
  };

  const handleSimSpeedChange = (value: number) => {
    setSimSpeed(value);
    simValuesRef.current = { ...simValuesRef.current, active: true, speed: value };
    applySimRef.current?.();
  };

  const handleSimRpmChange = (value: number) => {
    setSimRpm(value);
    simValuesRef.current = { ...simValuesRef.current, active: true, rpm: value };
    applySimRef.current?.();
  };

  const handleSimCoolantChange = (value: number) => {
    setSimCoolant(value);
    simValuesRef.current = { ...simValuesRef.current, active: true, coolant: value };
    applySimRef.current?.();
  };

  const isCleanBackground = backgroundMode.includes("clean");

  return (
    <div className={`w-full h-full flex flex-col justify-center items-center gap-4 bg-gray-900 theme-${effectiveTheme}`}>
      <style>{`
        .theme-teal {
          --accent: #00CED1;
          --accent-soft: #5DADE2;
          --accent-deep: #20B2AA;
          --accent-rgb: 0, 206, 209;
          --accent-soft-rgb: 93, 173, 226;
          --text-muted: #9AA3AE;
          --text-bright: #FFFFFF;
        }

        .theme-ember {
          --accent: #FF7A18;
          --accent-soft: #FFB347;
          --accent-deep: #FF3D00;
          --accent-rgb: 255, 122, 24;
          --accent-soft-rgb: 255, 179, 71;
          --text-muted: #B3A49A;
          --text-bright: #FFF5EE;
        }

        .theme-emerald {
          --accent: #4AF2A1;
          --accent-soft: #92F2D7;
          --accent-deep: #2BC48A;
          --accent-rgb: 74, 242, 161;
          --accent-soft-rgb: 146, 242, 215;
          --text-muted: #9FB7A8;
          --text-bright: #F4FFF9;
        }

        .theme-sapphire {
          --accent: #3B82F6;
          --accent-soft: #60A5FA;
          --accent-deep: #1D4ED8;
          --accent-rgb: 59, 130, 246;
          --accent-soft-rgb: 96, 165, 250;
          --text-muted: #A5B4FC;
          --text-bright: #F8FAFF;
        }

        .theme-crimson {
          --accent: #E11D48;
          --accent-soft: #FB7185;
          --accent-deep: #BE123C;
          --accent-rgb: 225, 29, 72;
          --accent-soft-rgb: 251, 113, 133;
          --text-muted: #FCA5A5;
          --text-bright: #FFF5F7;
        }

        .theme-solar {
          --accent: #F59E0B;
          --accent-soft: #FCD34D;
          --accent-deep: #D97706;
          --accent-rgb: 245, 158, 11;
          --accent-soft-rgb: 252, 211, 77;
          --text-muted: #FACC15;
          --text-bright: #FFF9ED;
        }

        .theme-lime {
          --accent: #6EEB83;
          --accent-soft: #B9FBC0;
          --accent-deep: #2DC653;
          --accent-rgb: 110, 235, 131;
          --accent-soft-rgb: 185, 251, 192;
          --text-muted: #A7D7B4;
          --text-bright: #F5FFF7;
        }

        .theme-copper {
          --accent: #C97B63;
          --accent-soft: #F4B183;
          --accent-deep: #8C4A36;
          --accent-rgb: 201, 123, 99;
          --accent-soft-rgb: 244, 177, 131;
          --text-muted: #D1B1A6;
          --text-bright: #FFF4EE;
        }

        .theme-ice {
          --accent: #5BD6FF;
          --accent-soft: #A0E9FF;
          --accent-deep: #1E96C8;
          --accent-rgb: 91, 214, 255;
          --accent-soft-rgb: 160, 233, 255;
          --text-muted: #B6D9F2;
          --text-bright: #F7FCFF;
        }

        .carbon { 
          position: relative;
          border-radius: 20px;
        }

        .bg-dark {
          --carbon-overlay: linear-gradient(rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.78));
          --carbon-sheen: linear-gradient(135deg, rgba(var(--accent-rgb), 0.03) 0%, rgba(var(--accent-soft-rgb), 0.01) 100%);
          --clean-overlay: linear-gradient(rgba(10, 14, 20, 0.75), rgba(6, 9, 13, 0.85));
          --dash-bg-image: url('/background.png');
          --clean-bg-image: radial-gradient(circle at 15% 20%, rgba(var(--accent-rgb), 0.2), transparent 55%),
            radial-gradient(circle at 80% 10%, rgba(var(--accent-soft-rgb), 0.18), transparent 45%),
            linear-gradient(135deg, #08131b 0%, #0a1118 100%);
          --panel-bg: linear-gradient(135deg, rgba(20, 30, 40, 0.5) 0%, rgba(15, 25, 35, 0.7) 100%);
          --bar-track: rgba(20, 30, 40, 0.6);
          --pill-bg: rgba(6, 12, 18, 0.55);
        }


        .bg-carbon {
          background-image: var(--carbon-overlay), var(--dash-bg-image);
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }

        .bg-clean {
          background-image: var(--clean-overlay), var(--clean-bg-image);
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        
        .carbon::after {
          display: none;
        }
        
        .carbon::before { 
          content: ''; 
          position: absolute; 
          inset: 0; 
          background: var(--carbon-sheen);
          pointer-events: none; 
          border-radius: 20px;
        }
        
        canvas { 
          filter: drop-shadow(0 0 8px rgba(var(--accent-rgb), 0.25)); 
          position: relative;
          z-index: 10;
        }
        
        /* Widget Card Design */
        .metric-widget {
          background: var(--panel-bg);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(var(--accent-rgb), 0.25);
          border-radius: 12px;
          padding: 14px 16px;
          position: relative;
          overflow: hidden;
          box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(var(--accent-rgb), 0.1);
          transition: all 0.2s ease;
        }
        
        .metric-widget::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.05) 0%, transparent 50%);
          pointer-events: none;
        }
        
        .metric-widget:hover {
          border-color: rgba(var(--accent-rgb), 0.4);
          box-shadow: 
            0 6px 20px rgba(var(--accent-rgb), 0.15),
            inset 0 1px 0 rgba(var(--accent-rgb), 0.15);
          transform: translateY(-1px);
        }
        
        .widget-label {
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .widget-label::before {
          content: '';
          width: 2px;
          height: 10px;
          background: linear-gradient(180deg, var(--accent) 0%, var(--accent-soft) 100%);
          border-radius: 2px;
          box-shadow: 0 0 6px rgba(var(--accent-rgb), 0.5);
        }
        
        .widget-label-right {
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          justify-content: flex-end;
          width: 100%;
        }
        
        .widget-label-right::after {
          content: '';
          width: 2px;
          height: 10px;
          background: linear-gradient(180deg, var(--accent) 0%, var(--accent-soft) 100%);
          border-radius: 2px;
          box-shadow: 0 0 6px rgba(var(--accent-rgb), 0.5);
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
          color: var(--accent);
          text-shadow: 
            0 0 10px rgba(var(--accent-rgb), 0.5),
            0 0 20px rgba(var(--accent-soft-rgb), 0.3);
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
          background: var(--bar-track);
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid rgba(var(--accent-rgb), 0.15);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .widget-bar-fill {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 0%;
          background: linear-gradient(180deg, var(--accent-soft) 0%, var(--accent) 50%, var(--accent-deep) 100%);
          box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.6);
          transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .widgets-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .connection-pill {
          background: rgba(var(--accent-rgb), 0.15);
          border: 1px solid rgba(var(--accent-rgb), 0.35);
          box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.15);
        }

        .connection-pill.is-disconnected {
          background: rgba(255, 75, 75, 0.2);
          border-color: rgba(255, 75, 75, 0.35);
          box-shadow: 0 0 12px rgba(255, 75, 75, 0.15);
        }

        .connection-dot {
          background: var(--accent);
          box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.8);
        }

        .connection-dot.is-disconnected {
          background: #ff4b4b;
          box-shadow: 0 0 8px rgba(255, 75, 75, 0.6);
        }

        .connection-text {
          color: var(--text-bright);
        }

        .time-pill {
          background: var(--pill-bg);
          border: 1px solid rgba(var(--accent-rgb), 0.35);
          box-shadow: 0 0 16px rgba(var(--accent-rgb), 0.12);
        }

        .time-dot {
          background: var(--accent);
          box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.8);
        }

        .time-text {
          color: var(--text-bright);
        }

        .theme-switch {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(var(--accent-rgb), 0.35);
          background: var(--pill-bg);
          color: var(--text-bright);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          box-shadow: 0 0 14px rgba(var(--accent-rgb), 0.12);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .theme-switch:hover {
          transform: translateY(-1px);
          border-color: rgba(var(--accent-rgb), 0.6);
          box-shadow: 0 0 18px rgba(var(--accent-rgb), 0.2);
        }

        .theme-chip {
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(var(--accent-rgb), 0.2);
          color: var(--accent);
          font-size: 0.7rem;
          letter-spacing: 0.08em;
        }

        .mode-switch {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(var(--accent-rgb), 0.35);
          background: var(--pill-bg);
          color: var(--text-bright);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          box-shadow: 0 0 14px rgba(var(--accent-rgb), 0.12);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .mode-switch:hover {
          transform: translateY(-1px);
          border-color: rgba(var(--accent-rgb), 0.6);
          box-shadow: 0 0 18px rgba(var(--accent-rgb), 0.2);
        }

        .sim-panel {
          width: 1280px;
          margin-top: 16px;
          padding: 16px 20px;
          border-radius: 16px;
          background: rgba(8, 12, 16, 0.7);
          border: 1px solid rgba(var(--accent-rgb), 0.2);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(8px);
        }

        .sim-row {
          display: grid;
          grid-template-columns: 140px 1fr 80px;
          align-items: center;
          gap: 16px;
          margin: 10px 0;
        }

        .sim-label {
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .sim-value {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-bright);
          text-align: right;
        }

        .sim-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.2), rgba(var(--accent-soft-rgb), 0.6));
          outline: none;
        }

        .sim-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.6);
          border: 2px solid rgba(255, 255, 255, 0.6);
          cursor: pointer;
        }

        .sim-range::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.6);
          border: 2px solid rgba(255, 255, 255, 0.6);
          cursor: pointer;
        }

      `}</style>

      <div id="wrap" className={`carbon w-[1280px] h-[400px] rounded-2xl shadow-2xl relative border flex overflow-hidden ${isCleanBackground ? "bg-clean" : "bg-carbon"} bg-dark`} style={{ borderColor: "rgba(0, 206, 209, 0.2)" }}>
        
        {/* Connection Status */}
        <div className="absolute top-4 left-4 z-50">
          <div className={`connection-pill flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm ${
            isConnected ? 'is-connected' : 'is-disconnected'
          }`}>
            <div className={`connection-dot w-2 h-2 rounded-full ${
              isConnected ? 'animate-pulse' : 'is-disconnected'
            }`} />
            <span className="connection-text text-sm font-medium">
              {isConnected ? 'Running' : 'Not Connected - Please Connect'}
            </span>
          </div>
        </div>

        {/* Pi Time */}
        <div className="absolute top-4 right-4 z-50">
          <div className="time-pill flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm">
            <div className="time-dot w-2 h-2 rounded-full animate-pulse" />
            <span className="time-text text-sm font-semibold tracking-wider">{currentTime}</span>
          </div>
        </div>

        {/* Theme Switch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
          <button type="button" className="theme-switch" onClick={handleThemeCycle}>
            Theme
            <span className="theme-chip">{effectiveTheme}</span>
          </button>
          <button type="button" className="mode-switch" onClick={handleBackgroundToggle}>
            Bg
            <span className="theme-chip">{backgroundMode}</span>
          </button>
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
            <div className="widget-label-right">Battery</div>
            <div className="widget-content">
              <div className="widget-bar-container">
                <div id="voltage-bar" className="widget-bar-fill"></div>
              </div>
              <div id="voltage" className="widget-value">12.1V</div>
            </div>
          </div>

          {/* Boost Widget */}
          <div className="metric-widget">
            <div className="widget-label-right">Boost Pressure</div>
            <div className="widget-content">
              <div className="widget-bar-container">
                <div id="boost-bar" className="widget-bar-fill"></div>
              </div>
              <div id="boost" className="widget-value">1.1 bar</div>
            </div>
          </div>

          {/* Oil Pressure Widget */}
          <div className="metric-widget">
            <div className="widget-label-right">Oil Pressure</div>
            <div className="widget-content">
              <div className="widget-bar-container">
                <div id="oilpress-bar" className="widget-bar-fill"></div>
              </div>
              <div id="oilpress" className="widget-value">0.3 bar</div>
            </div>
          </div>

        </div>

      </div>

      <div className="sim-panel">
        <div className="sim-row">
          <div className="sim-label">RPM</div>
          <input
            className="sim-range"
            type="range"
            min={0}
            max={8000}
            step={50}
            value={simRpm}
            onChange={(event) => handleSimRpmChange(Number(event.target.value))}
          />
          <div className="sim-value">{simRpm}</div>
        </div>

        <div className="sim-row">
          <div className="sim-label">Speed</div>
          <input
            className="sim-range"
            type="range"
            min={0}
            max={255}
            step={1}
            value={simSpeed}
            onChange={(event) => handleSimSpeedChange(Number(event.target.value))}
          />
          <div className="sim-value">{simSpeed} km/h</div>
        </div>

        <div className="sim-row">
          <div className="sim-label">Coolant</div>
          <input
            className="sim-range"
            type="range"
            min={0}
            max={120}
            step={1}
            value={simCoolant}
            onChange={(event) => handleSimCoolantChange(Number(event.target.value))}
          />
          <div className="sim-value">{simCoolant}°C</div>
        </div>
      </div>
    </div>
  );
}
