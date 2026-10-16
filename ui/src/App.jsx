import { useEffect, useState } from "react";
import { CircleAlert, LoaderCircle, Minus, Wifi, WifiOff, X } from "lucide-react";
import { WhooshIcon } from "./WhooshIcon";

function TitlebarButton({ label, onClick, danger = false, children }) {
  const hover = danger
    ? "hover:bg-red-500 hover:text-white"
    : "hover:bg-stone-200 dark:hover:bg-stone-800";

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-9 w-11 cursor-pointer items-center justify-center text-stone-500 transition-colors dark:text-stone-400 ${hover}`}
    >
      {children}
    </button>
  );
}

function Titlebar() {
  return (
    <header className="app-drag flex h-9 shrink-0 items-center justify-between">
      <span className="flex items-center gap-2 pl-4 text-[13px] font-medium text-stone-500 dark:text-stone-400">
        <WhooshIcon className="size-[18px]" />
        Whoosh
      </span>
      <div className="app-no-drag flex">
        <TitlebarButton label="Minimize window" onClick={() => window.whoosh.minimizeWindow()}>
          <Minus className="size-4" strokeWidth={1.75} />
        </TitlebarButton>
        <TitlebarButton label="Close window" onClick={() => window.whoosh.closeWindow()} danger>
          <X className="size-4" strokeWidth={1.75} />
        </TitlebarButton>
      </div>
    </header>
  );
}

function CodeSlot({ children }) {
  return (
    <div className="relative flex size-60 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-900/5 dark:ring-white/10">
      {children}
    </div>
  );
}

function Notice({ icon: Icon, children }) {
  return (
    <p className="flex items-center justify-center gap-2 text-sm text-stone-500 dark:text-stone-400">
      {Icon ? <Icon className="size-4 shrink-0" strokeWidth={1.75} /> : null}
      <span>{children}</span>
    </p>
  );
}

export function App() {
  const [uploadUrl, setUploadUrl] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [qrLoaded, setQrLoaded] = useState(false);
  const [status, setStatus] = useState("Starting up...");
  const [startupError, setStartupError] = useState("");

  useEffect(() => {
    let mounted = true;
    let pollId = null;

    async function syncState() {
      const state = await window.whoosh.getState();
      if (!mounted) {
        return;
      }

      setStatus(state.statusText || "Starting up...");
      setStartupError(state.startupError || "");
      setUploadUrl(state.uploadUrl || "");
      setQrCodeDataUrl((prevQrCodeDataUrl) => {
        const nextQrCodeDataUrl = state.qrCodeDataUrl || "";
        if (nextQrCodeDataUrl !== prevQrCodeDataUrl) {
          setQrLoaded(false);
          return nextQrCodeDataUrl;
        }
        return prevQrCodeDataUrl;
      });
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

  const isReady = Boolean(uploadUrl && qrCodeDataUrl);
  const isOffline = !startupError && !isReady && status !== "Starting up...";

  let footer;
  if (startupError) {
    footer = <Notice icon={CircleAlert}>{startupError}</Notice>;
  } else if (isReady) {
    footer = <Notice icon={Wifi}>Keep your phone on the same WiFi as this computer.</Notice>;
  } else {
    footer = <Notice icon={isOffline ? WifiOff : null}>{status}</Notice>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Titlebar />

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-8 pb-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">Send images from your phone</h1>
          <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
            Point your phone's camera at the code to get started.
          </p>
        </div>

        <CodeSlot>
          <div
            className={`absolute inset-0 flex items-center justify-center bg-stone-100 text-stone-400 transition-opacity duration-300 dark:bg-stone-900 dark:text-stone-500 ${qrLoaded ? "opacity-0" : "opacity-100"}`}
            aria-hidden={qrLoaded}
          >
            {isOffline || startupError ? (
              <WifiOff className="size-7" strokeWidth={1.5} />
            ) : (
              <LoaderCircle className="size-7 animate-spin" strokeWidth={1.5} />
            )}
          </div>
          {qrCodeDataUrl ? (
            <img
              className={`size-full object-contain p-2 transition-opacity duration-300 ${qrLoaded ? "opacity-100" : "opacity-0"}`}
              src={qrCodeDataUrl}
              alt="Code to scan with your phone"
              onLoad={() => setQrLoaded(true)}
            />
          ) : null}
        </CodeSlot>

        <div aria-live="polite">{footer}</div>
      </main>
    </div>
  );
}
