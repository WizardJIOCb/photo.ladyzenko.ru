import { open, readFile, stat } from "fs/promises";
import { NextResponse } from "next/server";
import { findActiveShare } from "@/lib/share";
import { safeStoragePath } from "@/lib/storage";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const share = await findActiveShare(token);
    if (!share) return new NextResponse("Not found", { status: 404 });
    const { asset } = share;
    const filePath = safeStoragePath("originals", asset.storageName);
    const info = await stat(filePath);
    const download = new URL(request.url).searchParams.get("download") === "1";
    const safeInline = (
      (asset.mimeType.startsWith("image/") && asset.mimeType !== "image/svg+xml")
      || asset.mimeType.startsWith("video/")
      || asset.mimeType === "application/pdf"
    );
    const forceDownload = download || !safeInline;
    const disposition = `${forceDownload ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`;
    const range = request.headers.get("range");
    const baseHeaders = {
      "Content-Type": safeInline ? asset.mimeType : "application/octet-stream",
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
      "Accept-Ranges": "bytes",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    };

    if (range) {
      const [startText, endText] = range.replace(/bytes=/, "").split("-");
      const start = Math.max(0, Number(startText) || 0);
      const end = Math.min(endText ? Number(endText) : info.size - 1, info.size - 1);
      if (start > end) return new NextResponse(null, { status: 416 });
      const length = end - start + 1;
      const handle = await open(filePath, "r");
      const buffer = Buffer.alloc(length);
      try { await handle.read(buffer, 0, length, start); } finally { await handle.close(); }
      return new NextResponse(buffer, {
        status: 206,
        headers: { ...baseHeaders, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Content-Length": String(length) },
      });
    }

    return new NextResponse(await readFile(filePath), {
      headers: { ...baseHeaders, "Content-Length": String(info.size) },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
