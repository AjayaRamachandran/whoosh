import { useEffect, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, File, FileCode, FilePlus, FileText, LoaderCircle, RefreshCw } from "lucide-react";

const sessionToken = new URLSearchParams(window.location.search).get("t") || "";
const FALLBACK_ERROR = "Something went wrong. Please try again.";
const MAX_STACKED = 4;
const CODE_EXTENSIONS = new Set([
  "py", "js", "jsx", "ts", "tsx", "java", "c", "h", "cpp", "cs", "go", "rs", "rb", "php", "swift", "kt",
  "html", "css", "json", "xml", "yml", "yaml", "sh", "sql"
]);
const TEXT_EXTENSIONS = new Set(["pdf", "txt", "md", "doc", "docx", "rtf", "csv", "odt", "pages"]);

function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extensionOf(name) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function isImage(file) {
  return file.type.startsWith("image/");
}

// Only show replies that read like a sentence; anything else gets a friendly fallback.
function readableMessage(text) {
  const trimmed = (text || "").trim();
  if (!trimmed || trimmed.startsWith("<") || trimmed.length > 240) {
    return "";
  }
  return trimmed;
}

// Object URLs for the image files being shown; everything else gets "".
function usePreviewUrls(files) {
  const [urls, setUrls] = useState([]);
  useEffect(() => {
    const next = files.map((file) => (isImage(file) ? URL.createObjectURL(file) : ""));
    setUrls(next);
    return () => next.forEach((url) => url && URL.revokeObjectURL(url));
  }, [files]);
  return urls;
}

function FileTile({ file, className = "" }) {
  const ext = extensionOf(file.name);
  const Icon = CODE_EXTENSIONS.has(ext) ? FileCode : TEXT_EXTENSIONS.has(ext) ? FileText : File;
  return (
    <div className={`flex flex-col items-center justify-center gap-1.5 bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 ${className}`}>
      <Icon className="size-8" strokeWidth={1.5} />
      {ext ? <span className="max-w-[80%] truncate text-xs font-semibold tracking-wide uppercase">{ext}</span> : null}
    </div>
  );
}

function Thumb({ file, previewUrl, className = "" }) {
  const [failed, setFailed] = useState(false);
  if (!previewUrl || failed) {
    return <FileTile file={file} className={className} />;
  }
  return <img src={previewUrl} alt="" onError={() => setFailed(true)} className={className} />;
}

// Overlapping, slightly fanned thumbnails for when several files are picked.
function ThumbStack({ files, previewUrls, total }) {
  const middle = (files.length - 1) / 2;
  return (
    <div className="relative aspect-[4/3] w-full bg-stone-100/60 dark:bg-stone-950">
      {files.map((file, index) => {
        const offset = index - middle;
        return (
          <div
            key={`${file.name}-${index}`}
            className="absolute top-1/2 left-1/2 size-28 overflow-hidden rounded-2xl bg-white shadow-[0_4px_14px_rgba(0,0,0,0.18)] ring-3 ring-white dark:bg-stone-900 dark:ring-stone-900"
            style={{ transform: `translate(-50%, -50%) translateX(${offset * 52}px) rotate(${offset * 6}deg)` }}
          >
            <Thumb file={file} previewUrl={previewUrls[index]} className="size-full object-cover" />
          </div>
        );
      })}
      {total > files.length ? (
        <span className="absolute right-4 bottom-4 rounded-full bg-stone-900/80 px-2.5 py-1 text-xs font-medium text-white tabular-nums dark:bg-white/90 dark:text-stone-900">
          +{total - files.length} more
        </span>
      ) : null}
    </div>
  );
}

function FilePicker({ files, disabled, onChange }) {
  const shown = useMemo(() => files.slice(0, MAX_STACKED), [files]);
  const previewUrls = usePreviewUrls(shown);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const single = files.length === 1 ? files[0] : null;

  let preview = null;
  if (single && previewUrls[0]) {
    preview = (
      <Thumb
        file={single}
        previewUrl={previewUrls[0]}
        className="aspect-[4/3] w-full bg-stone-100 object-contain dark:bg-stone-950"
      />
    );
  } else if (single) {
    preview = (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-stone-100/60 dark:bg-stone-950">
        <FileTile file={single} className="size-28 rounded-2xl" />
      </div>
    );
  } else if (files.length > 1) {
    preview = <ThumbStack files={shown} previewUrls={previewUrls} total={files.length} />;
  }

  return (
    <label
      className={`block cursor-pointer overflow-hidden rounded-3xl border border-stone-200 bg-white transition-colors dark:border-stone-800 dark:bg-stone-900 ${disabled ? "pointer-events-none opacity-60" : "hover:border-stone-300 dark:hover:border-stone-700"}`}
    >
      <input
        type="file"
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          onChange(Array.from(event.target.files || []));
          // Let the same file be picked again after a send.
          event.target.value = "";
        }}
      />
      {preview ? (
        <>
          {preview}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{single ? single.name : `${files.length} files`}</p>
              <p className="text-sm text-stone-500 tabular-nums dark:text-stone-400">{formatSize(totalSize)}</p>
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
            <FilePlus className="size-6" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-medium">Choose photos or files</p>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">Tap to pick one or several</p>
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
        className={`mt-px size-4 shrink-0 ${success ? "text-primary" : "text-red-600 dark:text-red-400"}`}
        strokeWidth={2}
      />
      <span className="min-w-0 break-words">{result.message}</span>
    </p>
  );
}

export function UploadApp() {
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  function onPick(nextFiles) {
    if (nextFiles.length === 0) {
      return;
    }
    setFiles(nextFiles);
    setResult(null);
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (files.length === 0) {
      setResult({ kind: "error", message: "Please choose something to send first." });
      return;
    }

    setIsUploading(true);
    setResult(null);
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    try {
      const response = await fetch("/upload", {
        method: "POST",
        headers: { "x-whoosh-token": sessionToken },
        body: formData
      });
      const message = readableMessage(await response.text());
      if (response.ok) {
        setResult({ kind: "success", message: message || "Saved on your computer." });
        setFiles([]);
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
          Pick photos or files and they'll show up on your computer, ready to save.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FilePicker files={files} disabled={isUploading} onChange={onPick} />

        <button
          type="submit"
          disabled={isUploading || files.length === 0}
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
