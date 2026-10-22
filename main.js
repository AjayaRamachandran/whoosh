const path = require("path");
const http = require("http");
const fs = require("fs/promises");
const express = require("express");
const multer = require("multer");
const QRCode = require("qrcode");
const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { pickLanAddress, createSessionToken, requireToken } = require("./lan");
const { safeFileName, saveFilesToFolder } = require("./saving");

const PREFERRED_PORT = 47800;
const NETWORK_POLL_MS = 5000;
const READY_STATUS = "Ready. Scan the code with a phone on the same WiFi.";
const NO_NETWORK_STATUS = "Connect this computer to WiFi to start.";

let mainWindow = null;
let server = null;
let uploadUrl = "";
let qrCodeDataUrl = "";
let localPort = null;
let lanIp = null;
let sessionToken = "";
let networkPollId = null;
let networkChecked = false;
let statusText = "Starting up...";
let startupError = "";
let shuttingDown = false;
let uploadViteServer = null;
const viteDevServerUrl = process.env.VITE_DEV_SERVER_URL;
const uploadUiDistDir = path.join(__dirname, "dist", "upload-ui");

const MAX_FILE_MB = 30;
const MAX_FILES = 50;

const upload = multer({
  storage: multer.memoryStorage(),
  // Phones send names as UTF-8; the default would garble anything non-ASCII.
  defParamCharset: "utf8",
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: MAX_FILES }
});

const UPLOAD_LIMIT_MESSAGES = {
  LIMIT_FILE_SIZE: `One of those files is too big. Each file can be up to ${MAX_FILE_MB} MB.`,
  LIMIT_FILE_COUNT: `That's a lot of files! Please send ${MAX_FILES} or fewer at a time.`
};

function receiveFiles(req, res, next) {
  upload.array("files", MAX_FILES)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    const message = UPLOAD_LIMIT_MESSAGES[error.code];
    if (message) {
      res.status(413).send(message);
      return;
    }
    next(error);
  });
}

async function saveSingleFile(file) {
  const suggestedName = safeFileName(file.originalname);
  const saveResult = await dialog.showSaveDialog(mainWindow, {
    title: "Save uploaded file",
    defaultPath: path.join(app.getPath("downloads"), suggestedName),
    buttonLabel: "Save"
  });

  if (saveResult.canceled || !saveResult.filePath) {
    return null;
  }

  await fs.writeFile(saveResult.filePath, file.buffer);
  return saveResult.filePath;
}

async function saveManyFiles(files) {
  const folderResult = await dialog.showOpenDialog(mainWindow, {
    title: `Choose a folder for ${files.length} files`,
    defaultPath: app.getPath("downloads"),
    buttonLabel: "Save Here",
    properties: ["openDirectory", "createDirectory"]
  });

  const folder = folderResult.filePaths?.[0];
  if (folderResult.canceled || !folder) {
    return null;
  }

  await saveFilesToFolder(folder, files);
  return folder;
}

async function createExpressApp(expressApp, httpServer) {
  const useUploadUiHmr = !app.isPackaged && process.env.UPLOAD_UI_HMR !== "0";

  if (useUploadUiHmr) {
    const { createServer } = await import("vite");
    uploadViteServer = await createServer({
      configFile: path.join(__dirname, "vite.upload.config.mjs"),
      server: {
        middlewareMode: true,
        // Serve HMR over the same host/port as the page so it also works from the phone.
        hmr: { server: httpServer }
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

  expressApp.post("/upload", requireToken(() => sessionToken), receiveFiles, async (req, res) => {
    const files = req.files || [];
    if (files.length === 0) {
      res.status(400).send("No files received. Please pick something to send first.");
      return;
    }

    const label = files.length === 1 ? safeFileName(files[0].originalname) : `${files.length} files`;
    try {
      const savedTo = files.length === 1 ? await saveSingleFile(files[0]) : await saveManyFiles(files);
      if (!savedTo) {
        res.status(400).send("Save canceled.");
        return;
      }

      res.send(files.length === 1 ? `Saved successfully to: ${savedTo}` : `Saved ${label} to: ${savedTo}`);
      sendUiStatus(`Saved ${label}`);
    } catch (error) {
      console.error("Failed to save upload:", error);
      res.status(500).send("Couldn't save on your computer. Please try again.");
      sendUiStatus("Couldn't save what was sent. Please try again.");
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

function listen(httpServer, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      httpServer.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      httpServer.off("error", onError);
      resolve();
    };
    httpServer.once("error", onError);
    httpServer.once("listening", onListening);
    httpServer.listen(port, "0.0.0.0");
  });
}

async function refreshUploadUrl() {
  const nextLanIp = pickLanAddress();
  if (networkChecked && nextLanIp === lanIp) {
    return;
  }

  networkChecked = true;
  lanIp = nextLanIp;
  if (!lanIp) {
    uploadUrl = "";
    qrCodeDataUrl = "";
    setStatus(NO_NETWORK_STATUS);
    return;
  }

  const nextUploadUrl = `http://${lanIp}:${localPort}/?t=${sessionToken}`;
  qrCodeDataUrl = await QRCode.toDataURL(nextUploadUrl);
  uploadUrl = nextUploadUrl;
  setStatus(READY_STATUS);
}

async function startBackend() {
  const expressApp = express();
  const httpServer = http.createServer(expressApp);
  await createExpressApp(expressApp, httpServer);
  startupError = "";
  sessionToken = createSessionToken();
  setStatus("Starting up...");

  try {
    await listen(httpServer, PREFERRED_PORT);
  } catch (error) {
    if (error.code !== "EADDRINUSE") {
      throw error;
    }
    await listen(httpServer, 0);
  }

  server = httpServer;
  ({ port: localPort } = server.address());

  await refreshUploadUrl();
  networkPollId = setInterval(() => {
    refreshUploadUrl().catch((error) => console.error("Failed to refresh network address:", error));
  }, NETWORK_POLL_MS);
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

  if (networkPollId) {
    clearInterval(networkPollId);
    networkPollId = null;
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
  lanIp
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
  } catch (error) {
    console.error("Failed to start backend:", error);
    startupError = "Something went wrong while starting Whoosh. Please restart the app.";
    setStatus(startupError);
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
