
<p align="center">
  <img src="public/icon.png" alt="Whoosh Uploader" width="100" />
  <h1 align="center">Whoosh: A Cross-Platform File Dropper</h1>
</p>
<p align="center">
<img src="https://img.shields.io/badge/React-blue?logo=React">
<img src="https://img.shields.io/badge/Electron-gray?logo=Electron">
<img src="https://img.shields.io/badge/Vite-purple?logo=Vite">
<img src="https://img.shields.io/badge/Ngrok-black?logo=Ngrok">
</p>

Whoosh is a minimal cross-platform desktop app that lets you quickly transfer images from your phone to your computer over a local network or the internet. The app spins up a local upload server, exposes it securely via [ngrok](https://ngrok.com/), and shows you a QR code. Scan it with your phone to instantly upload and save files directly to your computer.

---

## Features

- **Instant image transfer:** Shows a public (ngrok) URL and QR code as soon as you open the app.
- **Super easy uploads:** Scan QR code with your phone and upload images/files instantly, no typing or pairing required.
- **Secure tunnel:** Uses *your* ngrok account for secure public access.
- **Save As dialog:** Prompts you when uploads are received, so you can name & save images where you want.
- **Auto cleanup:** Closes both server and tunnel on app exit.
- **Cross-platform:** Works on Windows, macOS, and Linux.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure ngrok authentication

Save your ngrok authtoken in a `.env` file at the project root:

```
NGROK_AUTHTOKEN=your_token_here
```

You can get your token for free from [ngrok](https://dashboard.ngrok.com/get-started/your-authtoken).

### 3. Start in development mode

This launches the Electron app with Vite hot-reloading for rapid UI development:

```bash
npm start
```

### 5. Create a distributable desktop app

Generate distributable installers/packages for your OS:

```bash
npm run dist
```

The output will appear in the `dist/` or `release/` directory.

---

## How It Works

1. **Launch the app** – The Electron window opens with a QR code and the generated public upload URL.
2. **Scan the QR code** – Use your phone camera or QR code app to open the upload page.
3. **Upload an image** – Select an image or file and upload it from your phone.
4. **Receive & save** – The desktop app will pop up a "Save As" dialog for each received file.
5. **Quit cleanly** – Closing the window will safely shut down both the local server and the ngrok tunnel.

---

## License

[MIT](LICENSE)

