const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  aac: "audio/aac",
  m4a: "audio/mp4",
  flac: "audio/flac",
  oga: "audio/ogg",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  pdf: "application/pdf",
};

export function mediaContentType(name: string, fallback?: string | null) {
  const extension = name.split(".").pop()?.toLowerCase() || "";
  return contentTypes[extension] || fallback || "application/octet-stream";
}

export function canRenderInline(contentType: string) {
  return (
    (contentType.startsWith("image/") && contentType !== "image/svg+xml")
    || contentType.startsWith("video/")
    || contentType.startsWith("audio/")
    || contentType === "application/pdf"
  );
}

export function parseByteRange(value: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2]) || size < 1) return null;

  let start: number;
  let end: number;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }

  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return null;
  return { start, end: Math.min(end, size - 1) };
}
