# Whoosh Uploader

Desktop app that starts a local upload server, exposes it through ngrok, and shows a QR code to open from your phone.

## Setup

1. Install dependencies:
   - `npm install`
2. Add ngrok token in `.env`:
   - `NGROK_AUTHTOKEN=your_token_here`
3. Start dev mode (Vite hot reloading + Electron):
   - `npm start`
4. Optional production renderer build:
   - `npm run build:ui`
   - `npm run start:prod`
5. Full app distributable build:
   - `npm run dist`

## How it works

- App opens with a QR code for the generated public URL.
- Phone opens that URL and uploads an image.
- Desktop app prompts you with a "Save As" dialog when image is received.
- On close, the app shuts down both localhost server and ngrok tunnel.
- The Electron window uses a custom top bar with minimize/close controls.
