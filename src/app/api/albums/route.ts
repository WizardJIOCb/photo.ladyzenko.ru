import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().max(1000).optional(),
  color: z.enum(["terracotta", "sage", "lavender", "sand", "ocean"]).default("terracotta"),
});

export async function GET() {
  try {
    await requireUser();
    const albums = await db.album.findMany({
      include: {
        owner: { select: { id: true, name: true, avatarColor: true } },
        assets: {
          orderBy: { asset: { uploadedAt: "desc" } },
          take: 4,
          include: { asset: true },
        },
        _count: { select: { assets: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(albums);
  } catch {
    return NextResponse.json({ error: "Войдите в архив" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Укажите название альбома" }, { status: 400 });
    const album = await db.album.create({
      data: { ...parsed.data, ownerId: user.id },
      include: {
        owner: { select: { id: true, name: true, avatarColor: true } },
        assets: { include: { asset: true } },
        _count: { select: { assets: true } },
      },
    });
    return NextResponse.json(album, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Не удалось создать альбом" }, { status: 500 });
  }
}
