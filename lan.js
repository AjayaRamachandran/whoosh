const os = require("os");
const crypto = require("crypto");

// Adapters that never reach the phone (VMs, containers, WSL, loopback, etc.).
const VIRTUAL_ADAPTER_PATTERN = /vEthernet|WSL|VirtualBox|vboxnet|VMware|Hyper-V|Loopback|Bluetooth|docker|^br-|^veth/i;
// Overlay VPNs work only if the phone is on the same VPN, so keep them as a last resort.
const OVERLAY_ADAPTER_PATTERN = /tailscale|zerotier/i;
const WIRELESS_ADAPTER_PATTERN = /Wi-?Fi|Wireless|WLAN|^wl|^en0$/i;
const WIRED_ADAPTER_PATTERN = /Ethernet|^eth|^en\d/i;

function isIPv4(entry) {
  return entry.family === "IPv4" || entry.family === 4;
}

function privateRangeScore(address) {
  const [a, b] = address.split(".").map(Number);
  if (a === 192 && b === 168) {
    return 30;
  }
  if (a === 10) {
    return 20;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return 10;
  }
  return 0;
}

function scoreAddress(name, address) {
  let score = privateRangeScore(address);
  if (WIRELESS_ADAPTER_PATTERN.test(name)) {
    score += 5;
  } else if (WIRED_ADAPTER_PATTERN.test(name)) {
    score += 3;
  }
  if (OVERLAY_ADAPTER_PATTERN.test(name)) {
    score -= 100;
  }
  return score;
}

function pickLanAddress(interfaces = os.networkInterfaces()) {
  let best = null;

  for (const [name, entries] of Object.entries(interfaces || {})) {
    if (VIRTUAL_ADAPTER_PATTERN.test(name)) {
      continue;
    }

    for (const entry of entries || []) {
      if (!isIPv4(entry) || entry.internal || entry.address.startsWith("169.254.")) {
        continue;
      }

      const score = scoreAddress(name, entry.address);
      if (!best || score > best.score) {
        best = { address: entry.address, score };
      }
    }
  }

  return best ? best.address : null;
}

function createSessionToken() {
  return crypto.randomBytes(16).toString("base64url");
}

function tokensMatch(expected, provided) {
  if (typeof provided !== "string") {
    return false;
  }
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function requireToken(getToken) {
  return (req, res, next) => {
    const provided = req.get("x-whoosh-token") || req.query.t;
    if (tokensMatch(getToken(), provided)) {
      next();
      return;
    }
    res.status(403).send("This link has expired. Scan the QR code on your computer again.");
  };
}

module.exports = {
  pickLanAddress,
  createSessionToken,
  requireToken
};
