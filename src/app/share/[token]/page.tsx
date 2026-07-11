import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AudioLines, CalendarDays, Download, File, Image as ImageIcon, ShieldCheck, Video } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { findActiveShare } from "@/lib/share";

export const metadata: Metadata = {
  title: "Семейное воспоминание — Фото",
  description: "Воспоминание, которым с вами поделились",
  robots: { index: false, follow: false },
};

export default async function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await findActiveShare(token);
  if (!share) notFound();

  const { asset } = share;
  const date = new Date(asset.takenAt || asset.uploadedAt);
  const mediaUrl = `/share/${token}/media`;
  const audio = asset.type === "audio" || asset.mimeType.startsWith("audio/") || /\.(aac|flac|m4a|mp3|oga|ogg|opus|wav)$/i.test(asset.originalName);

  return (
    <main className="public-share-page">
      <header className="public-share-header">
        <div className="brand"><span className="brand-mark">Ф</span><span>Фото</span></div>
        <span><ShieldCheck /> Публичная ссылка</span>
      </header>
      <section className="public-share-card">
        <div className="public-share-media">
          {asset.type === "photo" ? (
            <img src={mediaUrl} alt={asset.title || asset.originalName} />
          ) : asset.type === "video" ? (
            <video src={mediaUrl} controls playsInline />
          ) : audio ? (
            <div className="public-audio-preview"><div><AudioLines /></div><span>Аудиозапись</span><b>{asset.title || asset.originalName}</b><audio src={mediaUrl} controls preload="metadata" /></div>
          ) : (
            <div className="public-file-preview"><File /><b>{asset.originalName}</b><span>{formatBytes(asset.size)}</span></div>
          )}
        </div>
        <div className="public-share-info">
          <div className="eyebrow">
            {asset.type === "photo" ? <ImageIcon /> : asset.type === "video" ? <Video /> : audio ? <AudioLines /> : <File />}
            Семейное воспоминание
          </div>
          <h1>{asset.title || asset.originalName}</h1>
          {asset.description && <p>{asset.description}</p>}
          <div className="public-share-meta">
            <span><CalendarDays />{format(date, "d MMMM yyyy", { locale: ru })}</span>
            {asset.width && asset.height && <span>{asset.width} × {asset.height}</span>}
          </div>
          <a className="button button--primary" href={`${mediaUrl}?download=1`}><Download /> Скачать оригинал</a>
          <small>Ссылкой на этот файл поделился участник семейного архива.</small>
        </div>
      </section>
    </main>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
