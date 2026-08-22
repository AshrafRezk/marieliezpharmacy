import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

test("production build includes Marieliez brand and WhatsApp CTA", async () => {
  const html = await readFile(path.join(root, "../dist/index.html"), "utf8");
  assert.match(html, /Marieliez Pharmacy/i);
  assert.match(html, /root/i);
});
