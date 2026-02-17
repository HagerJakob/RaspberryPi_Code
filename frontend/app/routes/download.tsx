import { useState } from "react";

export default function DownloadPage() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const apiHost = window.location.hostname || "localhost";
      window.location.href = `http://${apiHost}:5000/api/database/download-text`;
    } catch (error) {
      console.error("Fehler beim Herunterladen der Datenbank:", error);
      alert("Fehler beim Herunterladen der Datenbank");
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
        <h1 style={{ margin: "0 0 12px", fontSize: "22px" }}>RaspberryPi Datenbank</h1>
        <p style={{ margin: "0 0 24px", color: "#A9B7C6", lineHeight: 1.5 }}>
          Tippe auf den Button, um die aktuelle Datenbank herunterzuladen.
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
          {isDownloading ? "Download startet..." : "Datenbank herunterladen"}
        </button>
        <p style={{ margin: "16px 0 0", fontSize: "12px", color: "#7e8a96" }}>
          Falls der Download blockiert ist, benutze: <br />
          <span style={{ color: "#C4D0DC" }}>
            http://192.168.4.1:5000/api/database/download-text
          </span>
        </p>
      </div>
    </div>
  );
}
