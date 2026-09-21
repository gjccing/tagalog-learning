import { createHash } from "node:crypto";

export function normalizeTagalogText(text: string) {
  return text.normalize("NFC").trim();
}

export function audioSrcFor(text: string) {
  const hash = createHash("md5")
    .update(normalizeTagalogText(text), "utf8")
    .digest("hex");
  return `/audios/${hash}.mp3`;
}
