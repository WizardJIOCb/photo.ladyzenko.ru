import { unlink } from "fs/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { safeStoragePath } from "@/lib/storage";

const schema = z.object({
  title: z.string().max(120).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  takenAt: z.string().datetime().nullable().optional(),
  favorite: z.boolean().optional(),
  trashed: z.boolean().optional(),
  albumIds: z.array(z.string()).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await context.params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    const { albumIds, takenAt, ...data } = parsed.data;
    const asset = await db.asset.update({
      where: { id },
      data: {
        ...data,
        ...(takenAt !== undefined ? { takenAt: takenAt ? new Date(takenAt) : null } : {}),
        ...(albumIds
          ? {
              albums: {
                deleteMany: {},
                create: albumIds.map((albumId) => ({ albumId })),
              },
            }
          : {}),
      },
      include: {
        uploader: { select: { id: true, name: true, avatarColor: true } },
        albums: { select: { albumId: true } },
      },
    });
    return NextResponse.json(asset);
  } catch {
    return NextResponse.json({ error: "Не удалось обновить файл" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await context.params;
    const asset = await db.asset.delete({ where: { id } });
    await Promise.allSettled([
      unlink(safeStoragePath("originals", asset.storageName)),
      ...(asset.thumbnailName ? [unlink(safeStoragePath("thumbs", asset.thumbnailName))] : []),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось удалить файл" }, { status: 500 });
  }
}
