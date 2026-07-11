"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  File,
  Heart,
  Info,
  Link2,
  MessageCircle,
  RotateCw,
  Save,
  Share2,
  ShieldAlert,
  Trash2,
  User,
  WandSparkles,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import clsx from "clsx";
import type { Album, Asset, User as ArchiveUser } from "@/components/types";
import CommentsPanel from "@/components/CommentsPanel";

type Editor = { rotation: number; brightness: number; contrast: number; saturation: number };
const initialEditor: Editor = { rotation: 0, brightness: 100, contrast: 100, saturation: 100 };

type AssetViewerProps = {
  asset: Asset;
  albums: Album[];
  currentUser: ArchiveUser;
  onClose: () => void;
  onUpdate: (asset: Asset) => void;
  onDelete: () => void;
};

export default function AssetViewer({ asset, albums, currentUser, onClose, onUpdate, onDelete }: AssetViewerProps) {
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState(true);
  const [editor, setEditor] = useState<Editor>(initialEditor);
  const [title, setTitle] = useState(asset.title || "");
  const [description, setDescription] = useState(asset.description || "");
  const [date, setDate] = useState(toDateInput(asset.takenAt || asset.uploadedAt));
  const [albumIds, setAlbumIds] = useState(asset.albums.map((album) => album.albumId));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState("");

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (shareUrl) setShareUrl("");
      else onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, shareUrl]);

  async function patch(data: object) {
    const response = await fetch(`/api/assets/${asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.ok) onUpdate(await response.json());
  }

  async function saveDetails() {
    setSaving(true);
    await patch({
      title: title || null,
      description: description || null,
      takenAt: date ? new Date(`${date}T12:00:00`).toISOString() : null,
      albumIds,
    });
    setSaving(false);
  }

  async function saveEdit() {
    setSaving(true);
    const response = await fetch(`/api/assets/${asset.id}/edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editor),
    });
    if (response.ok) {
      onUpdate(await response.json());
      setEditor(initialEditor);
      setEditing(false);
    }
    setSaving(false);
  }

  async function remove() {
    if (!asset.trashed) {
      await patch({ trashed: true });
      onClose();
      return;
    }
    if (!confirmDelete) return setConfirmDelete(true);
    const response = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
    if (response.ok) onDelete();
  }

  async function createShare() {
    setShareLoading(true);
    setShareError("");
    setShareCopied(false);
    try {
      const response = await fetch(`/api/assets/${asset.id}/share`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось создать ссылку");
      const url = new URL(data.path, window.location.origin).toString();
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
      } catch {
        // The visible field still allows manual copying if clipboard access is blocked.
      }
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Не удалось создать ссылку");
    } finally {
      setShareLoading(false);
    }
  }

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
    } catch {
      setShareError("Браузер запретил доступ к буферу. Выделите ссылку и скопируйте её вручную.");
    }
  }

  async function revokeShares() {
    setShareLoading(true);
    setShareError("");
    try {
      const response = await fetch(`/api/assets/${asset.id}/share`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось отключить ссылку");
      setShareUrl("");
      setShareCopied(false);
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Не удалось отключить ссылку");
    } finally {
      setShareLoading(false);
    }
  }

  const filter = `brightness(${editor.brightness}%) contrast(${editor.contrast}%) saturate(${editor.saturation}%)`;

  return (
    <div className="viewer-backdrop">
      <div className="viewer-toolbar">
        <button onClick={onClose} aria-label="Закрыть"><X /></button>
        <div className="viewer-title">
          <b>{asset.title || asset.originalName}</b>
          <span>{format(new Date(asset.takenAt || asset.uploadedAt), "d MMMM yyyy", { locale: ru })}</span>
        </div>
        <div className="viewer-tools">
          {asset.type === "photo" && (
            <button className={clsx(editing && "active")} onClick={() => setEditing(!editing)}>
              <WandSparkles /><span>Редактор</span>
            </button>
          )}
          <button onClick={() => document.getElementById(`comments-${asset.id}`)?.scrollIntoView({ behavior: "smooth" })}>
            <MessageCircle /><span>Комментарии</span>
          </button>
          <button onClick={createShare} disabled={shareLoading}>
            <Share2 /><span>{shareLoading ? "Создаём…" : "Поделиться"}</span>
          </button>
          <a href={`/media/originals/${asset.storageName}`} download={asset.originalName}>
            <Download /><span>Скачать</span>
          </a>
          <button className={clsx(details && "active")} onClick={() => setDetails(!details)}>
            <Info /><span>Инфо</span>
          </button>
        </div>
      </div>

      <div className="viewer-body">
        <div className="viewer-main">
          <div className="viewer-stage">
            {asset.type === "photo" ? (
              <img
                key={asset.storageName}
                src={`/media/originals/${asset.storageName}`}
                alt={asset.title || asset.originalName}
                style={{ transform: `rotate(${editor.rotation}deg)`, filter }}
              />
            ) : asset.type === "video" ? (
              <video src={`/media/originals/${asset.storageName}`} controls autoPlay />
            ) : (
              <div className="document-stage">
                <File />
                <h2>{asset.originalName}</h2>
                <p>{formatBytes(asset.size)}</p>
                <a className="button button--cream" href={`/media/originals/${asset.storageName}`} download={asset.originalName}>
                  <Download /> Скачать файл
                </a>
              </div>
            )}
          </div>
          <CommentsPanel assetId={asset.id} currentUser={currentUser} />
        </div>

        {editing && (
          <div className="editor-panel">
            <div className="editor-panel-head">
              <span><WandSparkles /> Быстрая обработка</span>
              <button onClick={() => { setEditor(initialEditor); setEditing(false); }}><X /></button>
            </div>
            <div className="editor-controls">
              <label>
                <span>Поворот</span>
                <button onClick={() => setEditor((value) => ({ ...value, rotation: value.rotation + 90 }))}><RotateCw /> Повернуть на 90°</button>
              </label>
              <Range label="Яркость" value={editor.brightness} min={50} max={150} onChange={(brightness) => setEditor((value) => ({ ...value, brightness }))} />
              <Range label="Контраст" value={editor.contrast} min={50} max={150} onChange={(contrast) => setEditor((value) => ({ ...value, contrast }))} />
              <Range label="Насыщенность" value={editor.saturation} min={0} max={200} onChange={(saturation) => setEditor((value) => ({ ...value, saturation }))} />
            </div>
            <div className="editor-note">Оригинал останется нетронутым. Обработанная версия станет основной.</div>
            <button className="button button--primary button--wide" onClick={saveEdit} disabled={saving}>
              <Save />{saving ? "Сохраняем…" : "Применить обработку"}
            </button>
          </div>
        )}

        {details && (
          <aside className="details-panel">
            <div className="details-head"><span><Edit3 /> История снимка</span><button onClick={() => setDetails(false)}><X /></button></div>
            <label>Название<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={asset.originalName} /></label>
            <label>Воспоминание<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Что происходило в этот день? Кто здесь? Добавьте историю, которую важно сохранить…" rows={6} /></label>
            <label><span className="label-icon"><Calendar /> Дата</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <div className="album-checks">
              <span>Альбомы</span>
              {albums.map((album) => (
                <label key={album.id}>
                  <input
                    type="checkbox"
                    checked={albumIds.includes(album.id)}
                    onChange={(event) => setAlbumIds((ids) => event.target.checked ? [...ids, album.id] : ids.filter((id) => id !== album.id))}
                  />
                  <i><Check /></i>{album.title}
                </label>
              ))}
            </div>
            <div className="file-info">
              <div><User />Добавил {asset.uploader.name}</div>
              <div><Info />{asset.width && asset.height ? `${asset.width} × ${asset.height} · ` : ""}{formatBytes(asset.size)}</div>
            </div>
            <button className="button button--primary button--wide" onClick={saveDetails} disabled={saving}><Save />{saving ? "Сохраняем…" : "Сохранить историю"}</button>
            <button className={clsx("favorite-action", asset.favorite && "favorite-action--active")} onClick={() => patch({ favorite: !asset.favorite })}>
              <Heart fill={asset.favorite ? "currentColor" : "none"} />{asset.favorite ? "В избранном" : "Добавить в избранное"}
            </button>
            <button className={clsx("delete-action", confirmDelete && "delete-action--confirm")} onClick={remove}>
              <Trash2 />{asset.trashed ? confirmDelete ? "Нажмите ещё раз — удалить навсегда" : "Удалить навсегда" : "Переместить в корзину"}
            </button>
          </aside>
        )}
      </div>

      {shareUrl && (
        <div className="share-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShareUrl("")}>
          <div className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
            <button className="modal-close share-dialog-close" onClick={() => setShareUrl("")} aria-label="Закрыть"><X /></button>
            <div className="modal-icon"><Link2 /></div>
            <h2 id="share-dialog-title">Публичная ссылка готова</h2>
            <p>Её сможет открыть любой человек — вход в семейный архив не понадобится.</p>
            <div className="share-link-field">
              <input value={shareUrl} readOnly onFocus={(event) => event.currentTarget.select()} aria-label="Публичная ссылка" />
              <button onClick={copyShare}>{shareCopied ? <CheckCircle2 /> : <Copy />}{shareCopied ? "Скопировано" : "Копировать"}</button>
            </div>
            {shareError && <div className="share-dialog-error">{shareError}</div>}
            <div className="share-dialog-warning"><ShieldAlert /><span><b>Важно:</b> по ссылке будут видны файл, название и описание. Комментарии и участники семьи останутся закрытыми.</span></div>
            <div className="share-dialog-actions">
              <button className="share-revoke" onClick={revokeShares} disabled={shareLoading}>Отключить публичные ссылки</button>
              <a className="button button--primary" href={shareUrl} target="_blank" rel="noreferrer"><ExternalLink /> Открыть</a>
            </div>
          </div>
        </div>
      )}

      {!shareUrl && shareError && <div className="toast share-toast-error"><ShieldAlert />{shareError}</div>}
    </div>
  );
}

function Range({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="range-control"><span>{label}<b>{value}%</b></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function toDateInput(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
