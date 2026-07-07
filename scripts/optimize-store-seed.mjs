import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const seedPath = path.join(repoRoot, "artifacts", "eclat", "public", "seed", "store.json");
const mediaDir = path.join(repoRoot, "artifacts", "eclat", "public", "seed", "media");
const mediaPublicPrefix = "/seed/media";

const MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
};

const dataUrlPattern = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

function ensureCleanMediaDir() {
  fs.rmSync(mediaDir, { recursive: true, force: true });
  fs.mkdirSync(mediaDir, { recursive: true });
}

function writeImageFromDataUrl(dataUrl, contextKey) {
  const match = dataUrl.match(dataUrlPattern);
  if (!match) {
    return dataUrl;
  }

  const [, mimeType, base64Payload] = match;
  const extension = MIME_TO_EXT[mimeType] || "";
  const buffer = Buffer.from(base64Payload, "base64");
  const digest = createHash("sha1").update(buffer).digest("hex");
  const safeContext = contextKey.replace(/[^a-zA-Z0-9/_-]+/g, "-").replace(/-+/g, "-");
  const relativeDir = path.dirname(safeContext);
  const outputDir = path.join(mediaDir, relativeDir === "." ? "" : relativeDir);
  const fileName = `${path.basename(safeContext)}-${digest}${extension}`;
  const outputPath = path.join(outputDir, fileName);

  fs.mkdirSync(outputDir, { recursive: true });
  if (!fs.existsSync(outputPath)) {
    fs.writeFileSync(outputPath, buffer);
  }

  const publicPath = path.posix.join(mediaPublicPrefix, relativeDir === "." ? "" : relativeDir.replace(/\\/g, "/"), fileName);
  return publicPath;
}

function transformValue(value, contextKey = "asset") {
  if (typeof value === "string") {
    return value.startsWith("data:image/")
      ? writeImageFromDataUrl(value, contextKey)
      : value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => transformValue(item, `${contextKey}/${index}`));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, transformValue(child, `${contextKey}/${key}`)])
    );
  }

  return value;
}

function main() {
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file not found: ${seedPath}`);
  }

  const original = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  ensureCleanMediaDir();

  const optimized = Object.fromEntries(
    Object.entries(original).map(([collection, records]) => [
      collection,
      Array.isArray(records)
        ? records.map((record, index) => {
            const recordId = record && typeof record === "object" && "id" in record ? String(record.id) : String(index);
            return transformValue(record, `${collection}/${recordId}`);
          })
        : transformValue(records, collection),
    ])
  );

  fs.writeFileSync(seedPath, JSON.stringify(optimized));

  const sizeMb = (fs.statSync(seedPath).size / (1024 * 1024)).toFixed(2);
  console.log(`Optimized store seed written to ${seedPath}`);
  console.log(`New store.json size: ${sizeMb} MB`);
}

main();
