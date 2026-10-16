
<p align="center">
  <img src="public/icon.png" alt="Whoosh Uploader" width="100" />
  <h1 align="center">Whoosh: A Cross-Platform File Dropper</h1>
</p>
<p align="center">
<img src="https://img.shields.io/badge/React-blue?logo=React">
<img src="https://img.shields.io/badge/Electron-gray?logo=Electron">
<img src="https://img.shields.io/badge/Vite-purple?logo=Vite">
</p>

Whoosh is a minimal cross-platform desktop app that lets you quickly transfer images from your phone to your computer over your local WiFi network. The app spins up a local upload server and shows you a QR code. Scan it with a phone on the same WiFi to instantly upload and save files directly to your computer — no accounts, no internet connection, and nothing leaves your network.

---

## Features

- **Instant image transfer:** Shows a QR code for your computer's local address as soon as you open the app.
- **Super easy uploads:** Scan QR code with your phone and upload images/files instantly, no typing or pairing required.
- **Stays on your network:** Files go straight from phone to computer over WiFi. Each QR code carries a one-time session key, so only phones that scanned it can upload.
- **Save As dialog:** Prompts you when uploads are received, so you can name & save images where you want.
- **Auto cleanup:** Closes the server on app exit.
- **Cross-platform:** Works on Windows, macOS, and Linux.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start in development mode

This launches the Electron app with Vite hot-reloading for rapid UI development:

```bash
npm start
```

### 3. Create a distributable desktop app

Generate distributable installers/packages for your OS:

```bash
npm run dist
```

The output will appear in the `dist/` or `release/` directory.

---

## How It Works

1. **Launch the app** – The Electron window opens with a QR code and the its local upload address.
2. **Scan the QR code** – With your phone on the same WiFi as your computer, use your phone camera or QR code app to open the upload page.
3. **Upload an image** – Select an image or file and upload it from your phone.
4. **Receive & save** – The desktop app will pop up a "Save As" dialog for each received file.
5. **Quit cleanly** – Closing the window will safely shut down the local server.

---

## Troubleshooting

- **Windows asks to allow network access** – Choose *Allow* for private networks. The installer adds this rule for you on per-machine installs.
- **The phone can't open the page** – Make sure both devices are on the same WiFi, and that Windows lists the network as *Private* (Settings → Network & internet → Wi-Fi → your network).
- **Public, hotel, or campus WiFi** – These networks often block devices from talking to each other. Turn on your phone's hotspot, connect your computer to it, and scan again.
- **The QR code changed** – It updates automatically when your computer switches networks, and a new one is made every time the app starts. Just scan the latest one.

---

## License

[MIT](LICENSE)

