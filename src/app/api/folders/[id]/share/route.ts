import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashShareToken } from "@/lib/share";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: folderId } = await context.params;
    const folder = await db.folder.findUnique({ where: { id: folderId }, select: { id: true } });
    if (!folder) return NextResponse.json({ error: "Папка не найдена" }, { status: 404 });

    const token = randomBytes(32).toString("base64url");
    await db.folderShareLink.create({
      data: { tokenHash: hashShareToken(token), folderId, createdById: user.id },
    });
    return NextResponse.json({ path: `/share/folder/${token}` }, { status: 201 });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      { error: unauthorized ? "Войдите в архив" : "Не удалось создать публичную ссылку на папку" },
      { status: unauthorized ? 401 : 500 },
    );
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: folderId } = await context.params;
    const result = await db.folderShareLink.updateMany({
      where: { folderId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ ok: true, revoked: result.count });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      { error: unauthorized ? "Войдите в архив" : "Не удалось отключить ссылки на папку" },
      { status: unauthorized ? 401 : 500 },
    );
  }
}
