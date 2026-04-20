import { useState } from "react";

export default function DownloadPage() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const text = await window.go.main.App.GetLogfileText();
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "obd_log.txt";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Fehler beim Herunterladen des Logfiles:", error);
      alert("Fehler beim Herunterladen des Logfiles");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(160deg, #0b1217 0%, #17212a 50%, #0b1217 100%)",
      color: "#E7EDF3",
      padding: "24px",
      fontFamily: "Arial, sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "16px",
        padding: "28px",
        textAlign: "center",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
      }}>
        <h1 style={{ margin: "0 0 12px", fontSize: "22px" }}>RaspberryPi Logfile</h1>
        <p style={{ margin: "0 0 24px", color: "#A9B7C6", lineHeight: 1.5 }}>
          Tippe auf den Button, um das aktuelle Logfile als TXT herunterzuladen.
        </p>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          style={{
            width: "100%",
            padding: "14px 18px",
            borderRadius: "10px",
            border: "none",
            background: isDownloading ? "#3a4a58" : "#1b7f86",
            color: "#ffffff",
            fontSize: "16px",
            fontWeight: 600,
            cursor: isDownloading ? "not-allowed" : "pointer",
            transition: "background 0.2s ease",
          }}
        >
          {isDownloading ? "Download startet..." : "Logfile herunterladen"}
        </button>
      </div>
    </div>
  );
}
