import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, ImagePlus, LoaderCircle, RefreshCw } from "lucide-react";

const sessionToken = new URLSearchParams(window.location.search).get("t") || "";
const FALLBACK_ERROR = "Something went wrong. Please try again.";

function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Only show replies that read like a sentence; anything else gets a friendly fallback.
function readableMessage(text) {
  const trimmed = (text || "").trim();
  if (!trimmed || trimmed.startsWith("<") || trimmed.length > 240) {
    return "";
  }
  return trimmed;
}

function ImagePicker({ file, previewUrl, disabled, onChange }) {
  return (
    <label
      className={`block cursor-pointer overflow-hidden rounded-3xl border border-stone-200 bg-white transition-colors dark:border-stone-800 dark:bg-stone-900 ${disabled ? "pointer-events-none opacity-60" : "hover:border-stone-300 dark:hover:border-stone-700"}`}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
      {file ? (
        <>
          <img src={previewUrl} alt="" className="aspect-[4/3] w-full bg-stone-100 object-contain dark:bg-stone-950" />
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-sm text-stone-500 tabular-nums dark:text-stone-400">{formatSize(file.size)}</p>
            </div>
            <span className="flex items-center gap-1.5 text-sm font-medium text-stone-600 dark:text-stone-300">
              <RefreshCw className="size-4" strokeWidth={1.75} />
              Change
            </span>
          </div>
        </>
      ) : (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            <ImagePlus className="size-6" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-medium">Choose an image</p>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">Tap to pick from your photos</p>
          </div>
        </div>
      )}
    </label>
  );
}

function ResultMessage({ result }) {
  if (!result) {
    return null;
  }

  const success = result.kind === "success";
  const Icon = success ? CircleCheck : CircleAlert;

  return (
    <p className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300">
      <Icon
        className={`mt-px size-4 shrink-0 ${success ? "text-primary dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
        strokeWidth={2}
      />
      <span className="min-w-0 break-words">{result.message}</span>
    </p>
  );
}

export function UploadApp() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onPick(nextFile) {
    setFile(nextFile);
    setResult(null);
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!file) {
      setResult({ kind: "error", message: "Please choose an image first." });
      return;
    }

    setIsUploading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/upload", {
        method: "POST",
        headers: { "x-whoosh-token": sessionToken },
        body: formData
      });
      const message = readableMessage(await response.text());
      if (response.ok) {
        setResult({ kind: "success", message: message || "Saved on your computer." });
        setFile(null);
      } else {
        setResult({ kind: "error", message: message || FALLBACK_ERROR });
      }
    } catch (_error) {
      setResult({
        kind: "error",
        message: "Couldn't reach your computer. Make sure your phone is on the same WiFi and try again."
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-12 pb-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Send to your computer</h1>
        <p className="mt-2 text-stone-500 dark:text-stone-400">
          Pick an image and it will show up on your computer, ready to save.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <ImagePicker file={file} previewUrl={previewUrl} disabled={isUploading} onChange={onPick} />

        <button
          type="submit"
          disabled={isUploading || !file}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <LoaderCircle className="size-5 animate-spin" strokeWidth={2} />
              Sending
            </>
          ) : (
            "Send"
          )}
        </button>

        <div aria-live="polite" className="min-h-5">
          <ResultMessage result={result} />
        </div>
      </form>
    </main>
  );
}
