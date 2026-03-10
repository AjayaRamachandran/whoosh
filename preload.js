const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("whoosh", {
  getState: () => ipcRenderer.invoke("whoosh:get-state"),
  openUploadPage: () => ipcRenderer.invoke("whoosh:open-upload-page"),
  minimizeWindow: () => ipcRenderer.invoke("whoosh:window-minimize"),
  closeWindow: () => ipcRenderer.invoke("whoosh:window-close"),
  onStatus: (callback) => {
    ipcRenderer.on("whoosh:status", (_event, statusText) => callback(statusText));
  }
});
