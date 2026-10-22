const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("os");
const path = require("path");
const fs = require("fs/promises");
const { safeFileName, saveFilesToFolder } = require("../saving");

function upload(originalname, text) {
  return { originalname, buffer: Buffer.from(text) };
}

test("safeFileName strips folders and unsafe characters", () => {
  assert.equal(safeFileName("../../evil.js"), "evil.js");
  assert.equal(safeFileName("..\\..\\Windows\\evil.py"), "evil.py");
  assert.equal(safeFileName("notes: draft?.txt"), "notes_ draft_.txt");
  assert.equal(safeFileName("report.pdf. . "), "report.pdf");
  assert.equal(safeFileName("CON.txt"), "_CON.txt");
  assert.equal(safeFileName("résumé.pdf"), "résumé.pdf");
});

test("safeFileName falls back when nothing usable is left", () => {
  assert.equal(safeFileName(""), "uploaded-file");
  assert.equal(safeFileName(undefined), "uploaded-file");
  assert.equal(safeFileName(".."), "uploaded-file");
  assert.equal(safeFileName("/"), "uploaded-file");
});

test("saveFilesToFolder writes every file and never overwrites", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "whoosh-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.writeFile(path.join(dir, "photo.jpg"), "already here");

  const saved = await saveFilesToFolder(dir, [
    upload("photo.jpg", "first"),
    upload("photo.jpg", "second"),
    upload("Main.java", "class Main {}"),
    upload("../escape.txt", "stay inside")
  ]);

  assert.deepEqual(saved.map((filePath) => path.basename(filePath)), [
    "photo (1).jpg",
    "photo (2).jpg",
    "Main.java",
    "escape.txt"
  ]);
  for (const filePath of saved) {
    assert.equal(path.dirname(filePath), dir);
  }
  assert.equal(await fs.readFile(path.join(dir, "photo.jpg"), "utf8"), "already here");
  assert.equal(await fs.readFile(path.join(dir, "photo (1).jpg"), "utf8"), "first");
  assert.equal(await fs.readFile(path.join(dir, "photo (2).jpg"), "utf8"), "second");
  assert.equal(await fs.readFile(path.join(dir, "escape.txt"), "utf8"), "stay inside");
});
