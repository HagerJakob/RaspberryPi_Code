import { useState, useEffect } from "react";
import Home from "./routes/home";
import DownloadPage from "./routes/download";

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const onLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", onLocationChange);
    return () => window.removeEventListener("popstate", onLocationChange);
  }, []);

  if (currentPath === "/download") {
    return <DownloadPage />;
  }
  
  return <Home />;
}