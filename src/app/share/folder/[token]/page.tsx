import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AudioLines, Download, File, Folder, Image as ImageIcon, ShieldCheck, Video } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { db } from "@/lib/db";
import { findActiveFolderShare } from "@/lib/share";

export const metadata: Metadata = {
  title: "Семейная папка — Фото",
  description: "Семейные файлы, которыми с вами поделились",
  robots: { index: false, follow: false },
};

export default async function PublicFolderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await findActiveFolderShare(token);
  if (!share) notFound();

  const assets = await db.asset.findMany({
    where: { folderId: share.folderId, trashed: false },
    orderBy: [{ takenAt: "desc" }, { uploadedAt: "desc" }],
  });

  return (
    <main className="public-folder-page">
      <header className="public-share-header">
        <div className="brand"><span className="brand-mark">Ф</span><span>Фото</span></div>
        <span><ShieldCheck /> Публичная папка</span>
      </header>
      <section className="public-folder-heading">
        <div className="eyebrow"><Folder /> Семейная коллекция</div>
        <h1>{share.folder.name}</h1>
        <p>{assets.length} {plural(assets.length, "файл", "файла", "файлов")} · доступ без регистрации</p>
      </section>

      {assets.length ? (
        <div className="public-folder-grid">
          {assets.map((asset) => {
            const mediaUrl = `/share/folder/${token}/media/${asset.id}`;
            const audio = isAudio(asset.type, asset.mimeType, asset.originalName);
            return (
              <article className="public-folder-card" key={asset.id}>
                <div className="public-folder-media">
                  {asset.type === "photo" ? (
                    <a href={mediaUrl} target="_blank" rel="noreferrer"><img src={`${mediaUrl}${asset.thumbnailName ? "?thumbnail=1" : ""}`} alt={asset.title || asset.originalName} loading="lazy" /></a>
                  ) : asset.type === "video" ? (
                    <video src={mediaUrl} poster={asset.thumbnailName ? `${mediaUrl}?thumbnail=1` : undefined} controls preload="metadata" playsInline />
                  ) : audio ? (
                    <div className="public-folder-audio"><AudioLines /><span>{asset.originalName.split(".").pop()?.toUpperCase()}</span><audio src={mediaUrl} controls preload="metadata" /></div>
                  ) : (
                    <div className="public-folder-file"><File /><span>{asset.originalName.split(".").pop()?.toUpperCase() || "Файл"}</span></div>
                  )}
                </div>
                <div className="public-folder-meta">
                  <div><TypeIcon type={asset.type} audio={audio} /><span><b>{asset.title || asset.originalName}</b><small>{format(new Date(asset.takenAt || asset.uploadedAt), "d MMMM yyyy", { locale: ru })}</small></span></div>
                  <a href={`${mediaUrl}?download=1`} aria-label={`Скачать ${asset.title || asset.originalName}`} title="Скачать"><Download /></a>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="public-folder-empty"><Folder /><h2>Папка пока пуста</h2><p>Здесь появятся файлы, добавленные владельцем ссылки.</p></div>
      )}
      <footer className="public-folder-footer">По ссылке доступна только эта папка. Остальной семейный архив остаётся закрытым.</footer>
    </main>
  );
}

function TypeIcon({ type, audio }: { type: string; audio: boolean }) {
  return type === "photo" ? <ImageIcon /> : type === "video" ? <Video /> : audio ? <AudioLines /> : <File />;
}

function isAudio(type: string, mimeType: string, name: string) {
  return type === "audio" || mimeType.startsWith("audio/") || /\.(aac|flac|m4a|mp3|oga|ogg|opus|wav)$/i.test(name);
}

function plural(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  return mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
}
