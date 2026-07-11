"use client";

import { useEffect, useRef, useState } from "react";
import { Check, File as FileIcon, Folder, Image as ImageIcon, UploadCloud, Video, X } from "lucide-react";
import type { Album, Folder as FolderType } from "@/components/types";
import { plural } from "@/components/ArchiveApp";

type LocalFile = { file: File; url?: string };

export default function UploadModal({ albums, folders, defaultAlbumId, onClose, onDone }: { albums: Album[]; folders: FolderType[]; defaultAlbumId?: string; onClose: () => void; onDone: (count: number) => void }) {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [albumId, setAlbumId] = useState(defaultAlbumId || "");
  const [folderId, setFolderId] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => files.forEach((item) => item.url && URL.revokeObjectURL(item.url)), [files]);

  function addFiles(list: FileList | File[]) {
    const next = Array.from(list).map((file) => ({ file, url: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined }));
    setFiles((current) => [...current, ...next].filter((item, index, all) => all.findIndex((candidate) => candidate.file.name === item.file.name && candidate.file.size === item.file.size) === index));
  }

  function upload() {
    if (!files.length) return;
    setProgress(0); setError("");
    const data = new FormData();
    files.forEach(({ file }) => data.append("files", file));
    if (albumId) data.append("albumId", albumId);
    if (folderId) data.append("folderId", folderId);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/assets");
    xhr.upload.onprogress = (event) => event.lengthComputable && setProgress(Math.round(event.loaded / event.total * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) onDone(files.length);
      else { setError(JSON.parse(xhr.responseText || "{}").error || "Не удалось загрузить файлы"); setProgress(null); }
    };
    xhr.onerror = () => { setError("Соединение прервалось. Попробуйте снова."); setProgress(null); };
    xhr.send(data);
  }

  const totalSize = files.reduce((sum, item) => sum + item.file.size, 0);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && progress === null && onClose()}><div className="upload-modal">
    <div className="modal-header"><div><span className="eyebrow"><UploadCloud /> Новые воспоминания</span><h2>Загрузить в архив</h2><p>Фото, видео и любые важные семейные файлы.</p></div><button className="modal-close" onClick={onClose} disabled={progress !== null}><X /></button></div>
    <div className={`dropzone ${dragging ? "dropzone--dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }} onClick={() => inputRef.current?.click()}>
      <input ref={inputRef} type="file" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt" />
      <div className="dropzone-icon"><UploadCloud /></div><h3>Перетащите файлы сюда</h3><p>или нажмите, чтобы выбрать на устройстве</p><small>До 100 МБ на файл · JPG, HEIC, PNG, MP4, MOV, PDF и другие</small>
    </div>
    {files.length > 0 && <div className="upload-selection"><div className="selection-head"><b>{files.length} {plural(files.length, "файл выбран", "файла выбрано", "файлов выбрано")}</b><span>{formatBytes(totalSize)}</span></div><div className="selected-files">{files.slice(0, 6).map((item, index) => <div key={`${item.file.name}-${index}`} className="selected-file">{item.url ? <img src={item.url} alt="" /> : <span>{item.file.type.startsWith("video/") ? <Video /> : <FileIcon />}</span>}<div><b>{item.file.name}</b><small>{formatBytes(item.file.size)}</small></div><button onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}><X /></button></div>)}{files.length > 6 && <div className="more-files">+ ещё {files.length - 6}</div>}</div></div>}
    <div className="upload-options"><label><span><ImageIcon /> Добавить в альбом</span><select value={albumId} onChange={(e) => setAlbumId(e.target.value)}><option value="">Без альбома</option>{albums.map((album) => <option value={album.id} key={album.id}>{album.title}</option>)}</select></label><label><span><Folder /> Сохранить в папку</span><select value={folderId} onChange={(e) => setFolderId(e.target.value)}><option value="">Без папки</option>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.name}</option>)}</select></label></div>
    {error && <div className="form-error">{error}</div>}
    {progress !== null && <div className="progress-wrap"><div><span>Загружаем и создаём миниатюры…</span><b>{progress}%</b></div><div className="progress-bar"><span style={{ width: `${progress}%` }} /></div></div>}
    <div className="modal-actions"><button className="button button--ghost" onClick={onClose} disabled={progress !== null}>Отмена</button><button className="button button--primary" onClick={upload} disabled={!files.length || progress !== null}>{progress === 100 ? <><Check /> Обрабатываем…</> : <><UploadCloud /> Загрузить {files.length ? `(${files.length})` : ""}</>}</button></div>
  </div></div>;
}

function formatBytes(bytes: number) { if (!bytes) return "0 Б"; const units = ["Б", "КБ", "МБ", "ГБ"]; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`; }
