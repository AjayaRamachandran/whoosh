const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { pickLanAddress, createSessionToken, requireToken } = require("../lan");

function ipv4(address, internal = false) {
  return { address, family: "IPv4", internal };
}

test("pickLanAddress prefers the Wi-Fi adapter over virtual adapters", () => {
  const address = pickLanAddress({
    "vEthernet (WSL)": [ipv4("172.20.80.1")],
    "VirtualBox Host-Only Network": [ipv4("192.168.56.1")],
    "Wi-Fi": [{ address: "fe80::1", family: "IPv6", internal: false }, ipv4("192.168.1.42")],
    "Loopback Pseudo-Interface 1": [ipv4("127.0.0.1", true)]
  });
  assert.equal(address, "192.168.1.42");
});

test("pickLanAddress skips internal and link-local addresses", () => {
  assert.equal(pickLanAddress({
    lo: [ipv4("127.0.0.1", true)],
    Ethernet: [ipv4("169.254.10.2")]
  }), null);
});

test("pickLanAddress ranks private ranges and uses overlay VPNs only as a last resort", () => {
  assert.equal(pickLanAddress({
    Tailscale: [ipv4("100.101.102.103")],
    Ethernet: [ipv4("10.0.0.5")]
  }), "10.0.0.5");
  assert.equal(pickLanAddress({ Tailscale: [ipv4("100.101.102.103")] }), "100.101.102.103");
});

test("pickLanAddress accepts numeric family values", () => {
  assert.equal(pickLanAddress({ en0: [{ address: "192.168.0.9", family: 4, internal: false }] }), "192.168.0.9");
});

test("createSessionToken returns unique url-safe tokens", () => {
  const first = createSessionToken();
  const second = createSessionToken();
  assert.match(first, /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(first, second);
});

test("requireToken guards upload requests", async (t) => {
  const token = createSessionToken();
  const expressApp = express();
  expressApp.post("/upload", requireToken(() => token), (_req, res) => res.send("ok"));

  const server = await new Promise((resolve) => {
    const httpServer = expressApp.listen(0, "127.0.0.1", () => resolve(httpServer));
  });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}/upload`;

  const viaHeader = await fetch(baseUrl, { method: "POST", headers: { "x-whoosh-token": token } });
  assert.equal(viaHeader.status, 200);

  const viaQuery = await fetch(`${baseUrl}?t=${token}`, { method: "POST" });
  assert.equal(viaQuery.status, 200);

  const missing = await fetch(baseUrl, { method: "POST" });
  assert.equal(missing.status, 403);
  assert.match(await missing.text(), /Scan the QR code/);

  const wrong = await fetch(baseUrl, { method: "POST", headers: { "x-whoosh-token": createSessionToken() } });
  assert.equal(wrong.status, 403);

  const wrongLength = await fetch(`${baseUrl}?t=short`, { method: "POST" });
  assert.equal(wrongLength.status, 403);
});
