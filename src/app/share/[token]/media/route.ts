import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { findActiveShare } from "@/lib/share";
import { canRenderInline, mediaContentType, parseByteRange } from "@/lib/media-response";
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
    const contentType = mediaContentType(asset.storageName, asset.mimeType);
    const safeInline = canRenderInline(contentType);
    const forceDownload = download || !safeInline;
    const disposition = `${forceDownload ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`;
    const range = request.headers.get("range");
    const baseHeaders = {
      "Content-Type": safeInline ? contentType : "application/octet-stream",
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
      "Accept-Ranges": "bytes",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    };

    if (range) {
      const parsedRange = parseByteRange(range, info.size);
      if (!parsedRange) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      const length = parsedRange.end - parsedRange.start + 1;
      const stream = Readable.toWeb(createReadStream(filePath, { start: parsedRange.start, end: parsedRange.end }));
      return new NextResponse(stream as unknown as BodyInit, {
        status: 206,
        headers: { ...baseHeaders, "Content-Range": `bytes ${parsedRange.start}-${parsedRange.end}/${info.size}`, "Content-Length": String(length) },
      });
    }

    const stream = Readable.toWeb(createReadStream(filePath));
    return new NextResponse(stream as unknown as BodyInit, {
      headers: { ...baseHeaders, "Content-Length": String(info.size) },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
