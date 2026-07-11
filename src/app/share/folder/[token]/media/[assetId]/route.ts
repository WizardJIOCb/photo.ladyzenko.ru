import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canRenderInline, mediaContentType, parseByteRange } from "@/lib/media-response";
import { findActiveFolderShare } from "@/lib/share";
import { safeStoragePath } from "@/lib/storage";

export async function GET(request: Request, context: { params: Promise<{ token: string; assetId: string }> }) {
  try {
    const { token, assetId } = await context.params;
    const share = await findActiveFolderShare(token);
    if (!share) return new NextResponse("Not found", { status: 404 });

    const asset = await db.asset.findFirst({
      where: { id: assetId, folderId: share.folderId, trashed: false },
    });
    if (!asset) return new NextResponse("Not found", { status: 404 });

    const url = new URL(request.url);
    const thumbnail = url.searchParams.get("thumbnail") === "1" && Boolean(asset.thumbnailName);
    const download = url.searchParams.get("download") === "1";
    const storageName = thumbnail ? asset.thumbnailName! : asset.storageName;
    const originalContentType = mediaContentType(storageName, thumbnail ? "image/webp" : asset.mimeType);
    const safeInline = canRenderInline(originalContentType);
    const filePath = safeStoragePath(thumbnail ? "thumbs" : "originals", storageName);
    const info = await stat(filePath);
    const disposition = `${download || !safeInline ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`;
    const baseHeaders = {
      "Content-Type": safeInline ? originalContentType : "application/octet-stream",
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
      "Accept-Ranges": "bytes",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    };
    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      const range = parseByteRange(rangeHeader, info.size);
      if (!range) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      const stream = Readable.toWeb(createReadStream(filePath, { start: range.start, end: range.end }));
      return new NextResponse(stream as unknown as BodyInit, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${range.start}-${range.end}/${info.size}`,
          "Content-Length": String(range.end - range.start + 1),
        },
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
