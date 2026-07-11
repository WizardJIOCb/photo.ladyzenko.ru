import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reactionSchema, reactionSelect } from "@/lib/reactions";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: commentId } = await context.params;
    const parsed = reactionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Неизвестная реакция" }, { status: 400 });
    const key = { commentId_userId_emoji: { commentId, userId: user.id, emoji: parsed.data.emoji } };
    const existing = await db.commentReaction.findUnique({ where: key });
    if (existing) await db.commentReaction.delete({ where: { id: existing.id } });
    else await db.commentReaction.create({ data: { commentId, userId: user.id, emoji: parsed.data.emoji } });
    return NextResponse.json(await db.commentReaction.findMany({ where: { commentId }, select: reactionSelect, orderBy: { createdAt: "asc" } }));
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Войдите в архив" : "Не удалось сохранить реакцию" }, { status: unauthorized ? 401 : 500 });
  }
}
