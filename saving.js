const path = require("path");
const fs = require("fs/promises");

const FALLBACK_NAME = "uploaded-file";
// Characters Windows refuses in file names, plus control characters.
const UNSAFE_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;
const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i;

// Phones send whatever name they like, so never let it escape the chosen folder.
function safeFileName(name) {
  const base = path.basename(String(name || "").replace(/\\/g, "/"));
  const cleaned = base.replace(UNSAFE_CHARS, "_").replace(/[. ]+$/, "").trim();
  if (!cleaned || cleaned === "." || cleaned === "..") {
    return FALLBACK_NAME;
  }
  return RESERVED_WINDOWS_NAMES.test(cleaned) ? `_${cleaned}` : cleaned;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

// Picks "name.ext", then "name (1).ext", "name (2).ext", ... skipping anything on disk or already claimed.
async function claimFreePath(dir, name, claimed) {
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length);
  for (let attempt = 0; ; attempt += 1) {
    const candidate = path.join(dir, attempt === 0 ? name : `${stem} (${attempt})${ext}`);
    const key = candidate.toLowerCase();
    if (!claimed.has(key) && !(await pathExists(candidate))) {
      claimed.add(key);
      return candidate;
    }
  }
}

// Names are claimed one by one so duplicates can't collide, then every file is written in parallel.
async function saveFilesToFolder(dir, files) {
  const claimed = new Set();
  const targets = [];
  for (const file of files) {
    targets.push(await claimFreePath(dir, safeFileName(file.originalname), claimed));
  }

  await Promise.all(targets.map((target, index) => fs.writeFile(target, files[index].buffer, { flag: "wx" })));
  return targets;
}

module.exports = {
  safeFileName,
  saveFilesToFolder
};
