import { randomUUID } from "crypto";
import path from "path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureStorage, safeStoragePath } from "@/lib/storage";

const schema = z.object({
  rotation: z.number().int().min(-360).max(360),
  brightness: z.number().min(50).max(150),
  contrast: z.number().min(50).max(150),
  saturation: z.number().min(0).max(200),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await context.params;
    const transform = schema.parse(await request.json());
    const asset = await db.asset.findUniqueOrThrow({ where: { id } });
    if (asset.type !== "photo") return NextResponse.json({ error: "Редактор доступен для фото" }, { status: 400 });
    const root = await ensureStorage();
    const storageName = `${randomUUID()}.jpg`;
    const thumbnailName = `${randomUUID()}.webp`;
    const contrast = transform.contrast / 100;
    const image = sharp(safeStoragePath("originals", asset.storageName))
      .rotate(transform.rotation)
      .modulate({ brightness: transform.brightness / 100, saturation: transform.saturation / 100 })
      .linear(contrast, 128 * (1 - contrast))
      .jpeg({ quality: 92, mozjpeg: true });
    await image.clone().toFile(path.join(root, "originals", storageName));
    await image
      .clone()
      .resize(720, 720, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(root, "thumbs", thumbnailName));
    const metadata = await sharp(path.join(root, "originals", storageName)).metadata();
    const updated = await db.asset.update({
      where: { id },
      data: {
        storageName,
        thumbnailName,
        mimeType: "image/jpeg",
        width: metadata.width,
        height: metadata.height,
        rotation: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
      },
      include: {
        uploader: { select: { id: true, name: true, avatarColor: true } },
        albums: { select: { albumId: true } },
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось обработать фото" }, { status: 500 });
  }
}
