import { useEffect, useState } from "react";
import { MinusIcon, XIcon } from "lucide-react";

export function App() {
  const [uploadUrl, setUploadUrl] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [qrLoaded, setQrLoaded] = useState(false);
  const [status, setStatus] = useState("Starting backend...");
  const [startupError, setStartupError] = useState("");
  const [ngrokValidated, setNgrokValidated] = useState(false);
  const [localPort, setLocalPort] = useState(null);

  useEffect(() => {
    let mounted = true;
    let pollId = null;

    async function syncState() {
      const state = await window.whoosh.getState();
      if (!mounted) {
        return;
      }

      setStatus(state.statusText || "Starting backend...");
      setStartupError(state.startupError || "");
      setNgrokValidated(Boolean(state.ngrokValidated));
      setLocalPort(state.localPort);

      if (state.uploadUrl) {
        setUploadUrl(state.uploadUrl);
        setQrCodeDataUrl((prevQrCodeDataUrl) => {
          if (state.qrCodeDataUrl !== prevQrCodeDataUrl) {
            setQrLoaded(false);
            return state.qrCodeDataUrl;
          }
          return prevQrCodeDataUrl;
        });
      }
    }

    syncState();
    pollId = setInterval(syncState, 1500);

    window.whoosh.onStatus(async (statusText) => {
      if (!mounted) {
        return;
      }

      setStatus(statusText);
      await syncState();
    });

    return () => {
      mounted = false;
      if (pollId) {
        clearInterval(pollId);
      }
    };
  }, []);

  return (
    <div className="window-shell">
      <header className="titlebar">
        <span className="titlebar-title">Whoosh - A Cross-Platform File Dropper</span>
        <div className="titlebar-actions">
          <button
            type="button"
            className="titlebar-btn"
            aria-label="Minimize window"
            onClick={() => window.whoosh.minimizeWindow()}
          >
            <MinusIcon
              className="w-4 h-4"
            />
          </button>
          <button
            type="button"
            className="titlebar-btn titlebar-btn-close"
            aria-label="Close window"
            onClick={() => window.whoosh.closeWindow()}
          >
            <XIcon
              className="w-4 h-4"
            />
          </button>
        </div>
      </header>

      <main className="card">
        {/* <h1>Whoosh</h1> */}
        <div className="qr-frame" aria-busy={!qrLoaded}>
          <div className={`qr-placeholder${qrLoaded ? " qr-fade-out" : ""}`}>
            Preparing QR code...
          </div>
          {qrCodeDataUrl ? (
            <img
              className={`qr${qrLoaded ? " qr-loaded" : ""}`}
              src={qrCodeDataUrl}
              alt="QR code for upload page"
              onLoad={() => setQrLoaded(true)}
            />
          ) : null}
        </div>
        {/* <p className="url">{uploadUrl || "Waiting for ngrok URL..."}</p> */}
        {/*<div className="meta">
          <span className={ngrokValidated ? "chip chip-ok" : "chip"}>
            {ngrokValidated ? "ngrok validated" : "ngrok not validated"}
          </span>
          {localPort ? <span className="chip">{`localhost:${localPort}`}</span> : null}
        </div>
        <button
          className="open-link-btn"
          type="button"
          onClick={() => window.whoosh.openUploadPage()}
          disabled={!uploadUrl}
        >
          Open Upload Page On This PC
        </button>
        <p className="status">{status}</p>
        {startupError ? <p className="error">{startupError}</p> : null}*/}
      </main>
    </div>
  );
}
