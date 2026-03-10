const path = require("path");
const fs = require("fs/promises");
const dotenv = require("dotenv");
const express = require("express");
const multer = require("multer");
const QRCode = require("qrcode");
const ngrok = require("@ngrok/ngrok");
const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");

dotenv.config({ path: path.join(__dirname, ".env") });

let mainWindow = null;
let server = null;
let tunnel = null;
let uploadUrl = "";
let qrCodeDataUrl = "";
let localPort = null;
let statusText = "Starting backend...";
let startupError = "";
let ngrokValidated = false;
let shuttingDown = false;
let uploadViteServer = null;
const viteDevServerUrl = process.env.VITE_DEV_SERVER_URL;
const uploadUiDistDir = path.join(__dirname, "dist", "upload-ui");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }
});

async function createExpressApp() {
  const expressApp = express();
  const useUploadUiHmr = !app.isPackaged && process.env.UPLOAD_UI_HMR !== "0";

  if (useUploadUiHmr) {
    const { createServer } = await import("vite");
    uploadViteServer = await createServer({
      configFile: path.join(__dirname, "vite.upload.config.mjs"),
      server: {
        middlewareMode: true
      },
      appType: "custom"
    });

    expressApp.use(uploadViteServer.middlewares);
    expressApp.get("/", async (req, res, next) => {
      try {
        const indexPath = path.join(__dirname, "upload-ui", "index.html");
        const template = await fs.readFile(indexPath, "utf8");
        const html = await uploadViteServer.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (error) {
        uploadViteServer.ssrFixStacktrace(error);
        next(error);
      }
    });
  } else {
    expressApp.use(express.static(uploadUiDistDir));
    expressApp.get("/", (_req, res) => {
      res.sendFile(path.join(uploadUiDistDir, "index.html"));
    });
  }

  expressApp.post("/upload", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).send("No file received. Please pick an image first.");
        return;
      }

      if (!req.file.mimetype.startsWith("image/")) {
        res.status(400).send("Only image files are allowed.");
        return;
      }

      const suggestedName = req.file.originalname || "uploaded-image";
      const defaultPath = path.join(app.getPath("downloads"), suggestedName);

      const saveResult = await dialog.showSaveDialog(mainWindow, {
        title: "Save uploaded image",
        defaultPath,
        buttonLabel: "Save Image"
      });

      if (saveResult.canceled || !saveResult.filePath) {
        res.status(400).send("Save canceled.");
        return;
      }

      await fs.writeFile(saveResult.filePath, req.file.buffer);
      res.send(`Saved successfully to: ${saveResult.filePath}`);
      sendUiStatus(`Saved ${suggestedName}`);
    } catch (error) {
      res.status(500).send("Failed to save uploaded image.");
      sendUiStatus(`Upload failed: ${error.message}`);
    }
  });

  return expressApp;
}

function sendUiStatus(statusText) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("whoosh:status", statusText);
  }
}

function setStatus(nextStatus) {
  statusText = nextStatus;
  sendUiStatus(nextStatus);
}

async function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function withRetries(operation, options) {
  const {
    attempts,
    initialDelayMs,
    backoffMultiplier = 1.5
  } = options;
  let nextDelayMs = initialDelayMs;
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, nextDelayMs));
        nextDelayMs = Math.ceil(nextDelayMs * backoffMultiplier);
      }
    }
  }

  throw lastError;
}

async function validateNgrokUrl(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith("http")) {
      return false;
    }

    const response = await withRetries(
      () => withTimeout(fetch(url, { method: "GET" }), 12000, "Timed out validating ngrok URL"),
      {
        attempts: 6,
        initialDelayMs: 1000,
        backoffMultiplier: 1.5
      }
    );

    return response.ok;
  } catch (_error) {
    return false;
  }
}

function resolveNgrokToken() {
  const rawToken = process.env.NGROK_AUTHTOKEN || process.env.NGROK_TOKEN || "";
  return rawToken.trim();
}

async function startBackend() {
  const expressApp = await createExpressApp();
  startupError = "";
  ngrokValidated = false;
  setStatus("Starting local server...");

  server = await new Promise((resolve, reject) => {
    const httpServer = expressApp.listen(0, "127.0.0.1", () => resolve(httpServer));
    httpServer.on("error", reject);
  });

  ({ port: localPort } = server.address());
  setStatus(`Local server ready on ${localPort}. Creating ngrok URL...`);
  const ngrokToken = resolveNgrokToken();

  if (!ngrokToken) {
    throw new Error("Missing NGROK_AUTHTOKEN (or NGROK_TOKEN) in .env");
  }

  setStatus("ngrok token found. Connecting tunnel...");

  tunnel = await withRetries(
    () => withTimeout(
      ngrok.connect({
        addr: localPort,
        authtoken: ngrokToken
      }),
      30000,
      "ngrok connection timed out"
    ),
    {
      attempts: 4,
      initialDelayMs: 1500,
      backoffMultiplier: 1.6
    }
  );

  uploadUrl = tunnel.url();
  if (!uploadUrl) {
    throw new Error("ngrok did not return a URL");
  }

  setStatus("Validating ngrok URL...");
  ngrokValidated = await validateNgrokUrl(uploadUrl);

  qrCodeDataUrl = await QRCode.toDataURL(uploadUrl);
  setStatus(ngrokValidated ? "Ready for uploads" : "Ready for uploads (validation skipped)");
}

async function waitForUrl(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch (_error) {
      // Keep trying until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for renderer at ${url}`);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 490,
    height: 490,
    minWidth: 490,
    minHeight: 490,
    maxWidth: 490,
    maxHeight: 490,
    frame: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (viteDevServerUrl) {
    await waitForUrl(viteDevServerUrl, 20000);
    await mainWindow.loadURL(viteDevServerUrl);
    return;
  }

  await mainWindow.loadFile(path.join(__dirname, "dist", "ui", "index.html"));
}

async function stopServices() {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  try {
    if (tunnel) {
      await tunnel.close();
      tunnel = null;
    }
  } catch (_error) {
    // Keep shutdown sequence going.
  }

  try {
    await ngrok.kill();
  } catch (_error) {
    // Keep shutdown sequence going.
  }

  if (server) {
    await new Promise((resolve) => {
      server.close(() => resolve());
    });
    server = null;
  }

  if (uploadViteServer) {
    await uploadViteServer.close();
    uploadViteServer = null;
  }
}

ipcMain.handle("whoosh:get-state", async () => ({
  uploadUrl,
  qrCodeDataUrl,
  localPort,
  statusText,
  startupError,
  ngrokValidated
}));

ipcMain.handle("whoosh:open-upload-page", async () => {
  if (uploadUrl) {
    await shell.openExternal(uploadUrl);
  }
});

ipcMain.handle("whoosh:window-minimize", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.handle("whoosh:window-close", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

app.whenReady().then(async () => {
  await createWindow();

  try {
    await startBackend();
    setStatus("Tunnel online");
  } catch (error) {
    startupError = error.message;
    setStatus(`Startup failed: ${error.message}`);
  }
});

app.on("before-quit", async (event) => {
  if (!shuttingDown) {
    event.preventDefault();
    await stopServices();
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
