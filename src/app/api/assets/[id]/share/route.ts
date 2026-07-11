import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashShareToken } from "@/lib/share";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: assetId } = await context.params;
    const asset = await db.asset.findFirst({ where: { id: assetId, trashed: false }, select: { id: true } });
    if (!asset) return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
    const token = randomBytes(32).toString("base64url");
    await db.shareLink.create({
      data: { tokenHash: hashShareToken(token), assetId, createdById: user.id },
    });
    return NextResponse.json({ path: `/share/${token}` }, { status: 201 });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Войдите в архив" : "Не удалось создать публичную ссылку" }, { status: unauthorized ? 401 : 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: assetId } = await context.params;
    const result = await db.shareLink.updateMany({
      where: { assetId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ ok: true, revoked: result.count });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Войдите в архив" : "Не удалось отключить ссылки" }, { status: unauthorized ? 401 : 500 });
  }
}
