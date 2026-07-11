import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reactionSelect } from "@/lib/reactions";

const createSchema = z.object({
  body: z.string().trim().min(1).max(3000),
  parentId: z.string().nullable().optional(),
});

const authorSelect = { id: true, name: true, avatarColor: true } as const;

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: assetId } = await context.params;
    const [comments, reactions] = await Promise.all([
      db.assetComment.findMany({
        where: { assetId },
        include: {
          author: { select: authorSelect },
          reactions: { select: reactionSelect, orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      }),
      db.assetReaction.findMany({
        where: { assetId },
        select: reactionSelect,
        orderBy: { createdAt: "asc" },
      }),
    ]);
    return NextResponse.json({ comments, reactions });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Войдите в архив" : "Не удалось загрузить обсуждение" }, { status: unauthorized ? 401 : 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: assetId } = await context.params;
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Напишите комментарий" }, { status: 400 });
    if (parsed.data.parentId) {
      const parent = await db.assetComment.findFirst({ where: { id: parsed.data.parentId, assetId } });
      if (!parent) return NextResponse.json({ error: "Комментарий для ответа не найден" }, { status: 404 });
    }
    const comment = await db.assetComment.create({
      data: { body: parsed.data.body, parentId: parsed.data.parentId || null, assetId, authorId: user.id },
      include: { author: { select: authorSelect }, reactions: { select: reactionSelect } },
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Войдите в архив" : "Не удалось добавить комментарий" }, { status: unauthorized ? 401 : 500 });
  }
}
