import { readFile, stat } from "fs/promises";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { safeStoragePath } from "@/lib/storage";

const contentTypes: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  heic: "image/heic", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", pdf: "application/pdf",
};

export async function GET(request: Request, context: { params: Promise<{ kind: string; name: string }> }) {
  if (!(await getCurrentUser())) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const { kind, name } = await context.params;
    if (kind !== "originals" && kind !== "thumbs") return new NextResponse("Not found", { status: 404 });
    const filePath = safeStoragePath(kind, name);
    const info = await stat(filePath);
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const type = contentTypes[ext] || "application/octet-stream";
    const range = request.headers.get("range");
    if (range) {
      const [startText, endText] = range.replace(/bytes=/, "").split("-");
      const start = Number(startText);
      const end = endText ? Number(endText) : info.size - 1;
      const file = await readFile(filePath);
      return new NextResponse(file.subarray(start, end + 1), {
        status: 206,
        headers: {
          "Content-Type": type,
          "Content-Range": `bytes ${start}-${end}/${info.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(end - start + 1),
          "Cache-Control": "private, max-age=31536000, immutable",
        },
      });
    }
    return new NextResponse(await readFile(filePath), {
      headers: { "Content-Type": type, "Content-Length": String(info.size), "Cache-Control": "private, max-age=31536000, immutable" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
