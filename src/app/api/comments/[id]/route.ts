import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const parsed = z.object({ body: z.string().trim().min(1).max(3000) }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Комментарий не может быть пустым" }, { status: 400 });
    const comment = await db.assetComment.findUnique({ where: { id } });
    if (!comment) return NextResponse.json({ error: "Комментарий не найден" }, { status: 404 });
    if (comment.authorId !== user.id && user.role !== "admin") return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    return NextResponse.json(await db.assetComment.update({ where: { id }, data: { body: parsed.data.body } }));
  } catch {
    return NextResponse.json({ error: "Не удалось изменить комментарий" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const comment = await db.assetComment.findUnique({ where: { id } });
    if (!comment) return NextResponse.json({ error: "Комментарий не найден" }, { status: 404 });
    if (comment.authorId !== user.id && user.role !== "admin") return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    await db.$transaction([
      db.commentReaction.deleteMany({ where: { commentId: id } }),
      db.assetComment.update({ where: { id }, data: { body: "", deleted: true } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось удалить комментарий" }, { status: 500 });
  }
}
