import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ name: z.string().trim().min(1).max(100) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Укажите название папки" }, { status: 400 });

    const { id } = await context.params;
    const folder = await db.folder.findUnique({ where: { id }, select: { id: true } });
    if (!folder) return NextResponse.json({ error: "Папка не найдена" }, { status: 404 });

    return NextResponse.json(await db.folder.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { assets: true } } },
    }));
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      { error: unauthorized ? "Войдите в архив" : "Не удалось переименовать папку" },
      { status: unauthorized ? 401 : 500 },
    );
  }
}
