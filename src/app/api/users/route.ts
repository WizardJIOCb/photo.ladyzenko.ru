import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await db.user.findMany({
      select: { id: true, name: true, email: true, role: true, avatarColor: true, createdAt: true, _count: { select: { assets: true } } },
      orderBy: { createdAt: "asc" },
    }));
  } catch {
    return NextResponse.json({ error: "Войдите в архив" }, { status: 401 });
  }
}
