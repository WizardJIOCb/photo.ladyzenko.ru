import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await db.folder.findMany({ include: { _count: { select: { assets: true } } } }));
  } catch {
    return NextResponse.json({ error: "Войдите в архив" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = z.object({ name: z.string().trim().min(1).max(100), parentId: z.string().optional() }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Укажите название папки" }, { status: 400 });
    return NextResponse.json(await db.folder.create({ data: { ...parsed.data, ownerId: user.id } }), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Не удалось создать папку" }, { status: 500 });
  }
}
