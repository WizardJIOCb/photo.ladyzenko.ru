import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { mediaContentType, parseByteRange } from "@/lib/media-response";
import { safeStoragePath } from "@/lib/storage";

export async function GET(request: Request, context: { params: Promise<{ kind: string; name: string }> }) {
  if (!(await getCurrentUser())) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { kind, name } = await context.params;
    if (kind !== "originals" && kind !== "thumbs") return new NextResponse("Not found", { status: 404 });

    const filePath = safeStoragePath(kind, name);
    const info = await stat(filePath);
    const contentType = mediaContentType(name);
    const rangeHeader = request.headers.get("range");
    const baseHeaders = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };

    if (rangeHeader) {
      const range = parseByteRange(rangeHeader, info.size);
      if (!range) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      const length = range.end - range.start + 1;
      const stream = Readable.toWeb(createReadStream(filePath, { start: range.start, end: range.end }));
      return new NextResponse(stream as unknown as BodyInit, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${range.start}-${range.end}/${info.size}`,
          "Content-Length": String(length),
        },
      });
    }

    const stream = Readable.toWeb(createReadStream(filePath));
    return new NextResponse(stream as unknown as BodyInit, { headers: { ...baseHeaders, "Content-Length": String(info.size) } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
