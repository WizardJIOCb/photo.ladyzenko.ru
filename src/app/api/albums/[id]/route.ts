import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ title: z.string().trim().min(1).max(100) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Укажите название альбома" }, { status: 400 });

    const { id } = await context.params;
    const album = await db.album.findUnique({ where: { id }, select: { id: true } });
    if (!album) return NextResponse.json({ error: "Альбом не найден" }, { status: 404 });

    return NextResponse.json(await db.album.update({
      where: { id },
      data: parsed.data,
      include: {
        owner: { select: { id: true, name: true, avatarColor: true } },
        assets: { orderBy: { position: "asc" }, take: 4, include: { asset: true } },
        _count: { select: { assets: true } },
      },
    }));
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      { error: unauthorized ? "Войдите в архив" : "Не удалось переименовать альбом" },
      { status: unauthorized ? 401 : 500 },
    );
  }
}
