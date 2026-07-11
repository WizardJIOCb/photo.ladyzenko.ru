import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import exifr from "exifr";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureStorage } from "@/lib/storage";
import { generateMediaPreview, getMediaDimensions } from "@/lib/previews";

function unauthorized(error: unknown) {
  return error instanceof Error && error.message === "UNAUTHORIZED";
}

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const type = searchParams.get("type");
    const favorite = searchParams.get("favorite") === "true";
    const albumId = searchParams.get("albumId");
    const trashed = searchParams.get("trashed") === "true";

    const assets = await db.asset.findMany({
      where: {
        trashed,
        ...(q
          ? {
              OR: [
                { originalName: { contains: q } },
                { title: { contains: q } },
                { description: { contains: q } },
              ],
            }
          : {}),
        ...(type && type !== "all" ? { type } : {}),
        ...(favorite ? { favorite: true } : {}),
        ...(albumId ? { albums: { some: { albumId } } } : {}),
      },
      include: {
        uploader: { select: { id: true, name: true, avatarColor: true } },
        albums: { select: { albumId: true } },
      },
      orderBy: [{ takenAt: "desc" }, { uploadedAt: "desc" }],
    });
    return NextResponse.json(assets);
  } catch (error) {
    return NextResponse.json(
      { error: unauthorized(error) ? "Войдите в архив" : "Не удалось загрузить файлы" },
      { status: unauthorized(error) ? 401 : 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const files = form.getAll("files").filter((item): item is File => item instanceof File);
    const albumId = String(form.get("albumId") || "");
    const folderId = String(form.get("folderId") || "");
    const maxBytes = Number(process.env.MAX_UPLOAD_MB || 100) * 1024 * 1024;
    if (!files.length) return NextResponse.json({ error: "Выберите файлы" }, { status: 400 });
    if (files.some((file) => file.size > maxBytes)) {
      return NextResponse.json({ error: `Один из файлов больше ${process.env.MAX_UPLOAD_MB || 100} МБ` }, { status: 413 });
    }

    const root = await ensureStorage();
    const created = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 10);
      const storageName = `${randomUUID()}${ext || ""}`;
      const type = file.type.startsWith("image/")
        ? "photo"
        : file.type.startsWith("video/")
          ? "video"
          : "file";
      const originalPath = path.join(root, "originals", storageName);
      await writeFile(originalPath, buffer);

      let width: number | undefined;
      let height: number | undefined;
      let thumbnailName: string | undefined;
      let takenAt: Date | undefined;
      if (type === "photo") {
        try {
          const meta = await sharp(buffer).metadata();
          width = meta.width;
          height = meta.height;
          thumbnailName = `${randomUUID()}.webp`;
          await sharp(buffer)
            .rotate()
            .resize(720, 720, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 82 })
            .toFile(path.join(root, "thumbs", thumbnailName));
        } catch {
          try {
            const candidate = `${randomUUID()}.webp`;
            await generateMediaPreview(originalPath, path.join(root, "thumbs", candidate), false);
            thumbnailName = candidate;
            const dimensions = await getMediaDimensions(originalPath);
            width = dimensions.width;
            height = dimensions.height;
          } catch {
            thumbnailName = undefined;
          }
        }
        try {
          const exif = await exifr.parse(buffer, ["DateTimeOriginal", "CreateDate"]);
          const exifDate = exif?.DateTimeOriginal || exif?.CreateDate;
          if (exifDate) takenAt = new Date(exifDate);
        } catch {
          // EXIF is optional and is absent from many image formats.
        }
      } else if (type === "video") {
        try {
          const candidate = `${randomUUID()}.webp`;
          await generateMediaPreview(originalPath, path.join(root, "thumbs", candidate), true);
          thumbnailName = candidate;
          const dimensions = await getMediaDimensions(originalPath);
          width = dimensions.width;
          height = dimensions.height;
        } catch {
          thumbnailName = undefined;
        }
      }

      const asset = await db.asset.create({
        data: {
          type,
          originalName: file.name,
          storageName,
          thumbnailName,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          width,
          height,
          takenAt,
          uploaderId: user.id,
          folderId: folderId || null,
          ...(albumId ? { albums: { create: { albumId } } } : {}),
        },
        include: {
          uploader: { select: { id: true, name: true, avatarColor: true } },
          albums: { select: { albumId: true } },
        },
      });
      created.push(asset);
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: unauthorized(error) ? "Войдите в архив" : "Не удалось сохранить файлы" },
      { status: unauthorized(error) ? 401 : 500 },
    );
  }
}
