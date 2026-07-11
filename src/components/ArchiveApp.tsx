"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Album as AlbumIcon, Archive, AudioLines, CalendarDays, CheckCircle2, ChevronDown, Copy, ExternalLink,
  File, Files, Folder, FolderPlus, Heart, Home, Image as ImageIcon, Link2, LogOut, Menu, Pencil, Plus,
  Search, Share2, ShieldAlert, Sparkles, Trash2, Upload, UserPlus, Users, Video, X,
} from "lucide-react";
import { format, isThisYear, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";
import clsx from "clsx";
import { isAudioAsset, type Album, type Asset, type Folder as FolderType, type User } from "@/components/types";
import UploadModal from "@/components/UploadModal";
import AssetViewer from "@/components/AssetViewer";

type View = "home" | "all" | "albums" | "favorite" | "video" | "files" | "trash" | `album:${string}` | `folder:${string}`;

const viewTitles: Partial<Record<View, string>> = {
  home: "Добрый день", all: "Все воспоминания", albums: "Альбомы", favorite: "Избранное",
  video: "Видео", files: "Документы и файлы", trash: "Корзина",
};

export default function ArchiveApp({ initialUser }: { initialUser: User }) {
  const [user] = useState(initialUser);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewer, setViewer] = useState<Asset | null>(null);
  const [createKind, setCreateKind] = useState<"album" | "folder" | null>(null);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [sharingFolder, setSharingFolder] = useState<FolderType | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  const loadData = useCallback(async () => {
    const [assetRes, albumRes, folderRes, usersRes] = await Promise.all([
      fetch("/api/assets"), fetch("/api/albums"), fetch("/api/folders"), fetch("/api/users"),
    ]);
    if (assetRes.status === 401) return (window.location.href = "/login");
    const [assetData, albumData, folderData, userData] = await Promise.all([
      assetRes.json(), albumRes.json(), folderRes.json(), usersRes.json(),
    ]);
    setAssets(Array.isArray(assetData) ? assetData : []);
    setAlbums(Array.isArray(albumData) ? albumData : []);
    setFolders(Array.isArray(folderData) ? folderData : []);
    setMembers(Array.isArray(userData) ? userData : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeAlbum = view.startsWith("album:") ? albums.find((a) => a.id === view.slice(6)) : null;
  const activeFolder = view.startsWith("folder:") ? folders.find((f) => f.id === view.slice(7)) : null;
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (view === "favorite" && !asset.favorite) return false;
      if (view === "video" && asset.type !== "video") return false;
      if (view === "files" && asset.type !== "file" && asset.type !== "audio") return false;
      if (view === "trash" && !asset.trashed) return false;
      if (view !== "trash" && asset.trashed) return false;
      if (view.startsWith("album:") && !asset.albums.some((a) => a.albumId === view.slice(6))) return false;
      if (view.startsWith("folder:") && asset.folderId !== view.slice(7)) return false;
      return true;
    });
  }, [assets, view]);

  const searchAssets = useMemo(() => {
    if (!normalizedQuery) return [];
    return assets.filter((asset) => {
      if (asset.trashed) return false;
      const date = new Date(asset.takenAt || asset.uploadedAt);
      const searchable = [
        asset.title,
        asset.description,
        asset.originalName,
        asset.uploader.name,
        format(date, "d MMMM yyyy", { locale: ru }),
        format(date, "LLLL yyyy", { locale: ru }),
      ];
      return searchable.some((value) => value?.toLocaleLowerCase("ru-RU").includes(normalizedQuery));
    });
  }, [assets, normalizedQuery]);

  const searchAlbums = useMemo(() => {
    if (!normalizedQuery) return [];
    return albums.filter((album) => [album.title, album.description, album.owner.name]
      .some((value) => value?.toLocaleLowerCase("ru-RU").includes(normalizedQuery)));
  }, [albums, normalizedQuery]);

  const groups = useMemo(() => {
    const result: Record<string, Asset[]> = {};
    filteredAssets.forEach((asset) => {
      const date = new Date(asset.takenAt || asset.uploadedAt);
      let label = format(date, "LLLL yyyy", { locale: ru });
      if (isToday(date)) label = "Сегодня";
      else if (isYesterday(date)) label = "Вчера";
      result[label] ||= [];
      result[label].push(asset);
    });
    return Object.entries(result);
  }, [filteredAssets]);

  function navigate(next: View) {
    setView(next); setSidebarOpen(false); setQuery("");
  }

  function updateAsset(updated: Asset) {
    setAssets((items) => items.map((item) => item.id === updated.id ? updated : item));
    setViewer(updated);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const title = activeAlbum?.title || activeFolder?.name || viewTitles[view] || "Семейный архив";
  const photos = assets.filter((a) => a.type === "photo" && !a.trashed).length;
  const videos = assets.filter((a) => a.type === "video" && !a.trashed).length;

  return (
    <div className="app-shell">
      <aside className={clsx("sidebar", sidebarOpen && "sidebar--open")}>
        <div className="sidebar-head">
          <div className="brand"><span className="brand-mark">Ф</span><span>Фото</span></div>
          <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)}><X /></button>
        </div>
        <nav className="sidebar-nav">
          <SidebarItem icon={<Home />} label="Главная" active={view === "home"} onClick={() => navigate("home")} />
          <SidebarItem icon={<ImageIcon />} label="Все воспоминания" active={view === "all"} count={assets.filter((a) => !a.trashed).length} onClick={() => navigate("all")} />
          <SidebarItem icon={<AlbumIcon />} label="Альбомы" active={view === "albums" || view.startsWith("album:")} count={albums.length} onClick={() => navigate("albums")} />
          <SidebarItem icon={<Heart />} label="Избранное" active={view === "favorite"} onClick={() => navigate("favorite")} />
          <SidebarItem icon={<Video />} label="Видео" active={view === "video"} onClick={() => navigate("video")} />
          <SidebarItem icon={<Files />} label="Файлы" active={view === "files"} onClick={() => navigate("files")} />
          <SidebarItem icon={<Trash2 />} label="Корзина" active={view === "trash"} onClick={() => navigate("trash")} />
        </nav>
        <div className="sidebar-section-head"><span>Папки</span><button onClick={() => setCreateKind("folder")} title="Новая папка"><Plus /></button></div>
        <div className="folder-list">
          {folders.map((folder) => <FolderSidebarItem key={folder.id} folder={folder} active={view === `folder:${folder.id}`} onOpen={() => navigate(`folder:${folder.id}`)} onEdit={() => setEditingFolder(folder)} />)}
          {!folders.length && <button className="empty-folder" onClick={() => setCreateKind("folder")}><FolderPlus /> Создать папку</button>}
        </div>
        <div className="sidebar-bottom">
          <button className="member-stack" onClick={() => setMembersOpen(true)}>
            <span className="avatars">{members.slice(0, 3).map((member) => <Avatar key={member.id} user={member} />)}</span>
            <span><b>{members.length || 1} {plural(members.length || 1, "участник", "участника", "участников")}</b><small>Ваша семья</small></span>
            <ChevronDown />
          </button>
          <button className="profile-button" onClick={logout}><Avatar user={user} /><span><b>{user.name}</b><small>{user.role === "admin" ? "Хранитель архива" : "Участник семьи"}</small></span><LogOut /></button>
        </div>
      </aside>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)}><Menu /></button>
          <div className="search-box"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setQuery("")} aria-label="Поиск по семейному архиву" placeholder="Найти фото, историю или человека…" />{query && <button onClick={() => setQuery("")} aria-label="Очистить поиск"><X /></button>}</div>
          <button className="button button--primary" onClick={() => setUploadOpen(true)}><Upload /> <span>Загрузить</span></button>
        </header>

        <div className="page-wrap">
          {normalizedQuery ? (
            <SearchView query={query.trim()} assets={searchAssets} albums={searchAlbums} loading={loading} onOpenAsset={setViewer} onOpenAlbum={(id) => navigate(`album:${id}`)} />
          ) : view === "home" ? (
            <HomeView user={user} photos={photos} videos={videos} albums={albums} assets={assets.filter((a) => !a.trashed).slice(0, 10)} navigate={navigate} onUpload={() => setUploadOpen(true)} onOpen={setViewer} onNewAlbum={() => setCreateKind("album")} onEditAlbum={setEditingAlbum} loading={loading} />
          ) : view === "albums" ? (
            <AlbumsView albums={albums} onOpen={(id) => navigate(`album:${id}`)} onCreate={() => setCreateKind("album")} onEdit={setEditingAlbum} loading={loading} />
          ) : (
            <GalleryView title={title} subtitle={activeAlbum?.description || (activeFolder ? "Файлы в семейной папке" : gallerySubtitle(view, filteredAssets.length))} groups={groups} loading={loading} onOpen={setViewer} onUpload={() => setUploadOpen(true)} onShare={activeFolder ? () => setSharingFolder(activeFolder) : undefined} onRename={activeFolder ? () => setEditingFolder(activeFolder) : activeAlbum ? () => setEditingAlbum(activeAlbum) : undefined} beforeContent={view === "files" ? <FolderPreviewSection folders={folders} assets={assets} onOpen={(id) => navigate(`folder:${id}`)} /> : undefined} trashed={view === "trash"} />
          )}
        </div>
      </main>

      {uploadOpen && <UploadModal albums={albums} folders={folders} defaultAlbumId={activeAlbum?.id} onClose={() => setUploadOpen(false)} onDone={(count) => { setUploadOpen(false); setToast(`${count} ${plural(count, "файл добавлен", "файла добавлены", "файлов добавлено")}`); loadData(); }} />}
      {viewer && <AssetViewer asset={viewer} albums={albums} currentUser={user} onClose={() => setViewer(null)} onUpdate={updateAsset} onDelete={() => { setAssets((items) => items.filter((item) => item.id !== viewer.id)); setViewer(null); setToast("Файл удалён навсегда"); }} />}
      {createKind && <CreateModal kind={createKind} onClose={() => setCreateKind(null)} onCreated={() => { setCreateKind(null); setToast(createKind === "album" ? "Альбом создан" : "Папка создана"); loadData(); }} />}
      {editingFolder && <RenameFolderModal folder={editingFolder} onClose={() => setEditingFolder(null)} onRenamed={(updated) => { setFolders((items) => items.map((item) => item.id === updated.id ? updated : item)); setEditingFolder(null); setToast("Папка переименована"); }} />}
      {editingAlbum && <RenameAlbumModal album={editingAlbum} onClose={() => setEditingAlbum(null)} onRenamed={(updated) => { setAlbums((items) => items.map((item) => item.id === updated.id ? updated : item)); setEditingAlbum(null); setToast("Альбом переименован"); }} />}
      {sharingFolder && <FolderShareModal folder={sharingFolder} onClose={() => setSharingFolder(null)} />}
      {membersOpen && <MembersModal members={members} currentUser={user} onClose={() => setMembersOpen(false)} />}
      {toast && <div className="toast"><Sparkles />{toast}</div>}
    </div>
  );
}

function SidebarItem({ icon, label, active, count, onClick }: { icon: React.ReactNode; label: string; active?: boolean; count?: number; onClick: () => void }) {
  return <button className={clsx("nav-item", active && "nav-item--active")} onClick={onClick}><span>{icon}</span><b>{label}</b>{count !== undefined && <small>{count}</small>}</button>;
}

function FolderSidebarItem({ folder, active, onOpen, onEdit }: { folder: FolderType; active: boolean; onOpen: () => void; onEdit: () => void }) {
  return <div className={clsx("folder-nav-row", active && "folder-nav-row--active")}>
    <button className={clsx("nav-item", active && "nav-item--active")} onClick={onOpen}><span><Folder /></span><b>{folder.name}</b>{folder._count?.assets !== undefined && <small>{folder._count.assets}</small>}</button>
    <button className="folder-edit-button" onClick={onEdit} aria-label={`Переименовать папку ${folder.name}`} title="Переименовать"><Pencil /></button>
  </div>;
}

function Avatar({ user }: { user: Pick<User, "name" | "avatarColor"> }) {
  const initials = user.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <span className="avatar" style={{ background: user.avatarColor }}>{initials}</span>;
}

function HomeView({ user, photos, videos, albums, assets, navigate, onUpload, onOpen, onNewAlbum, onEditAlbum, loading }: { user: User; photos: number; videos: number; albums: Album[]; assets: Asset[]; navigate: (v: View) => void; onUpload: () => void; onOpen: (a: Asset) => void; onNewAlbum: () => void; onEditAlbum: (album: Album) => void; loading: boolean }) {
  const firstName = user.name.split(" ")[0];
  return <>
    <section className="welcome-row">
      <div><div className="eyebrow"><Sparkles /> Семейная летопись</div><h1>Добрый день, {firstName}</h1><p>Здесь живут моменты, к которым хочется возвращаться.</p></div>
      <div className="archive-stats"><div><ImageIcon /><span><b>{photos}</b><small>фото</small></span></div><div><Video /><span><b>{videos}</b><small>видео</small></span></div><div><AlbumIcon /><span><b>{albums.length}</b><small>альбомов</small></span></div></div>
    </section>
    <section className="memory-hero">
      <div className="memory-hero__copy"><span>Соберите вашу историю</span><h2>Каждая фотография<br />заслуживает подписи</h2><p>Добавьте даты, воспоминания и объедините важные моменты в красивый альбом.</p><button className="button button--cream" onClick={onUpload}><Plus /> Добавить воспоминания</button></div>
      <div className="hero-frames" aria-hidden="true"><div className="hero-photo hero-photo--a">наши<br />истории</div><div className="hero-photo hero-photo--b">лето</div><div className="hero-stamp">бережно<br />храним</div></div>
    </section>
    <SectionHead title="Последние воспоминания" action="Смотреть все" onAction={() => navigate("all")} />
    {loading ? <SkeletonGrid /> : assets.length ? <div className="asset-grid asset-grid--recent">{assets.slice(0, 6).map((asset) => <AssetCard asset={asset} key={asset.id} onOpen={() => onOpen(asset)} />)}</div> : <EmptyState onUpload={onUpload} compact />}
    <SectionHead title="Семейные альбомы" action="Все альбомы" onAction={() => navigate("albums")} />
    <div className="album-grid album-grid--home">
      {albums.slice(0, 3).map((album) => <AlbumCard key={album.id} album={album} onOpen={() => navigate(`album:${album.id}`)} onEdit={() => onEditAlbum(album)} />)}
      <button className="new-album-card" onClick={onNewAlbum}><span><Plus /></span><b>Новый альбом</b><small>Соберите особенную историю</small></button>
    </div>
  </>;
}

function AlbumsView({ albums, onOpen, onCreate, onEdit, loading }: { albums: Album[]; onOpen: (id: string) => void; onCreate: () => void; onEdit: (album: Album) => void; loading: boolean }) {
  return <><div className="page-heading"><div><div className="eyebrow"><AlbumIcon /> Ваша коллекция</div><h1>Семейные альбомы</h1><p>Истории, собранные по событиям, людям и временам года.</p></div><button className="button button--secondary" onClick={onCreate}><Plus /> Новый альбом</button></div>
    {loading ? <SkeletonGrid /> : <div className="album-grid"><button className="new-album-card new-album-card--large" onClick={onCreate}><span><Plus /></span><b>Создать альбом</b><small>Дайте истории красивое начало</small></button>{albums.map((album) => <AlbumCard key={album.id} album={album} onOpen={() => onOpen(album.id)} onEdit={() => onEdit(album)} />)}</div>}
  </>;
}

function SearchView({ query, assets, albums, loading, onOpenAsset, onOpenAlbum }: { query: string; assets: Asset[]; albums: Album[]; loading: boolean; onOpenAsset: (asset: Asset) => void; onOpenAlbum: (id: string) => void }) {
  const total = assets.length + albums.length;
  return <>
    <div className="page-heading search-heading"><div><div className="eyebrow"><Search /> Поиск по архиву</div><h1>Результаты поиска</h1><p>По запросу «{query}» {total ? `найдено ${total}` : "ничего не найдено"}</p></div></div>
    {loading ? <SkeletonGrid /> : total ? <>
      {albums.length > 0 && <section className="search-section"><div className="timeline-head"><h2>Альбомы</h2><span>{albums.length}</span></div><div className="album-grid search-album-grid">{albums.map((album) => <AlbumCard key={album.id} album={album} onOpen={() => onOpenAlbum(album.id)} />)}</div></section>}
      {assets.length > 0 && <section className="search-section"><div className="timeline-head"><h2>Фото, видео и файлы</h2><span>{assets.length}</span></div><div className="asset-grid">{assets.map((asset) => <AssetCard key={asset.id} asset={asset} onOpen={() => onOpenAsset(asset)} />)}</div></section>}
    </> : <div className="empty-state search-empty"><div className="empty-illustration"><Search /><span>?</span></div><h3>Ничего не нашлось</h3><p>Попробуйте имя файла, название альбома, подпись, имя участника или дату — например «июль 2026».</p></div>}
  </>;
}

function GalleryView({ title, subtitle, groups, loading, onOpen, onUpload, onShare, onRename, beforeContent, trashed }: { title: string; subtitle: string; groups: [string, Asset[]][]; loading: boolean; onOpen: (a: Asset) => void; onUpload: () => void; onShare?: () => void; onRename?: () => void; beforeContent?: React.ReactNode; trashed: boolean }) {
  const total = groups.reduce((sum, [, items]) => sum + items.length, 0);
  return <><div className="page-heading"><div><div className="eyebrow"><CalendarDays /> По времени и событиям</div><h1>{title}</h1><p>{subtitle}</p></div><div className="page-heading-actions">{onShare && <button className="button button--secondary" onClick={onShare}><Share2 /> Поделиться</button>}{onRename && <button className="button button--secondary" onClick={onRename}><Pencil /> Переименовать</button>}{!trashed && <button className="button button--secondary" onClick={onUpload}><Upload /> Добавить</button>}</div></div>
    {beforeContent}{loading ? <SkeletonGrid /> : total ? groups.map(([label, items]) => <section className="timeline-group" key={label}><div className="timeline-head"><h2>{label}</h2><span>{items.length} {plural(items.length, "момент", "момента", "моментов")}</span></div><div className="asset-grid">{items.map((asset) => <AssetCard key={asset.id} asset={asset} onOpen={() => onOpen(asset)} />)}</div></section>) : <EmptyState onUpload={onUpload} hiddenUpload={trashed} />}
  </>;
}

function AssetCard({ asset, onOpen }: { asset: Asset; onOpen: () => void }) {
  const date = new Date(asset.takenAt || asset.uploadedAt);
  const audio = isAudioAsset(asset);
  return <article className={clsx("asset-card", `asset-card--${audio ? "audio" : asset.type}`)} onClick={onOpen} onKeyDown={(event) => event.target === event.currentTarget && (event.key === "Enter" || event.key === " ") && onOpen()} role="button" tabIndex={0}>
    <div className="asset-media">
      {asset.thumbnailName ? <img src={`/media/thumbs/${asset.thumbnailName}`} alt={asset.title || asset.originalName} loading="lazy" /> : asset.type === "video" ? <div className="file-preview file-preview--video"><Video /><span>Видео</span></div> : audio ? <div className="file-preview file-preview--audio"><AudioLines /><span>{asset.originalName.split(".").pop()?.toUpperCase() || "Аудио"}</span><audio className="audio-card-player" src={`/media/originals/${asset.storageName}`} controls preload="metadata" onClick={(event) => event.stopPropagation()} aria-label={`Воспроизвести ${asset.title || asset.originalName}`} /></div> : <div className="file-preview"><File /><span>{asset.originalName.split(".").pop()?.toUpperCase()}</span></div>}
      {asset.favorite && <span className="favorite-badge"><Heart fill="currentColor" /></span>}
      {asset.type === "video" && <span className="play-badge">▶</span>}
    </div>
    <div className="asset-caption"><b>{asset.title || asset.originalName}</b><span>{isThisYear(date) ? format(date, "d MMMM", { locale: ru }) : format(date, "d MMMM yyyy", { locale: ru })}</span></div>
  </article>;
}

function FolderPreviewSection({ folders, assets, onOpen }: { folders: FolderType[]; assets: Asset[]; onOpen: (id: string) => void }) {
  if (!folders.length) return null;
  return <section className="folder-preview-section"><div className="section-head folder-preview-head"><h2>Папки</h2><span>Последние добавленные файлы</span></div><div className="folder-preview-grid">{folders.map((folder) => <FolderPreviewCard key={folder.id} folder={folder} assets={assets.filter((asset) => asset.folderId === folder.id && !asset.trashed)} onOpen={() => onOpen(folder.id)} />)}</div></section>;
}

function FolderPreviewCard({ folder, assets, onOpen }: { folder: FolderType; assets: Asset[]; onOpen: () => void }) {
  const ordered = [...assets].sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime());
  const previews = ordered.slice(0, 4);
  return <button className="folder-preview-card" onClick={onOpen}>
    <div className={clsx("folder-preview-collage", `folder-preview-collage--${previews.length || 0}`)}>
      {previews.length ? previews.map((asset, index) => <FolderPreviewItem key={asset.id} asset={asset} extra={index === previews.length - 1 ? Math.max(0, ordered.length - previews.length) : 0} />) : <div className="folder-preview-empty"><Folder /><span>Папка пуста</span></div>}
    </div>
    <div className="folder-preview-meta"><span><Folder /><b>{folder.name}</b></span><small>{ordered.length} {plural(ordered.length, "файл", "файла", "файлов")}{ordered[0] ? ` · обновлена ${format(new Date(ordered[0].uploadedAt), "d MMMM", { locale: ru })}` : ""}</small></div>
  </button>;
}

function FolderPreviewItem({ asset, extra }: { asset: Asset; extra: number }) {
  const audio = isAudioAsset(asset);
  return <div className={clsx("folder-preview-item", audio && "folder-preview-item--audio", !asset.thumbnailName && !audio && "folder-preview-item--file")} title={asset.title || asset.originalName}>
    {asset.thumbnailName ? <img src={`/media/thumbs/${asset.thumbnailName}`} alt="" loading="lazy" /> : audio ? <><AudioLines /><span>{asset.originalName.split(".").pop()?.toUpperCase() || "Аудио"}</span></> : asset.type === "video" ? <><Video /><span>Видео</span></> : <><File /><span>{asset.originalName.split(".").pop()?.toUpperCase() || "Файл"}</span></>}
    {asset.type === "video" && asset.thumbnailName && <i><Video /></i>}{extra > 0 && <em>+{extra}</em>}
  </div>;
}

function AlbumCard({ album, onOpen, onEdit }: { album: Album; onOpen: () => void; onEdit?: () => void }) {
  const covers = album.assets.map((item) => item.asset).filter((asset) => asset.thumbnailName).slice(0, 3);
  return <article className={clsx("album-card", `album-card--${album.color}`)}>
    <button className="album-card-main" onClick={onOpen}><div className="album-cover">{covers.length ? covers.map((asset, index) => <img key={asset.id} src={`/media/thumbs/${asset.thumbnailName}`} alt="" style={{ zIndex: 3 - index }} />) : <div className="album-placeholder"><span>Ф</span><small>семейная<br />история</small></div>}<span className="album-count">{album._count.assets}</span></div><div className="album-meta"><h3>{album.title}</h3><p>{album.description || "Семейные воспоминания"}</p><small><b>{album._count.assets} {plural(album._count.assets, "файл", "файла", "файлов")}</b><i>·</i> Создан {format(new Date(album.createdAt), "d MMMM yyyy", { locale: ru })}</small></div></button>
    {onEdit && <button className="album-edit-button" onClick={onEdit} aria-label={`Переименовать альбом ${album.title}`} title="Переименовать"><Pencil /></button>}
  </article>;
}

function SectionHead({ title, action, onAction }: { title: string; action: string; onAction: () => void }) { return <div className="section-head"><h2>{title}</h2><button onClick={onAction}>{action} <span>→</span></button></div>; }
function SkeletonGrid() { return <div className="asset-grid">{[1,2,3,4,5,6].map((n) => <div className="skeleton" key={n} />)}</div>; }
function EmptyState({ onUpload, compact, hiddenUpload }: { onUpload: () => void; compact?: boolean; hiddenUpload?: boolean }) { return <div className={clsx("empty-state", compact && "empty-state--compact")}><div className="empty-illustration"><Archive /><span>✦</span></div><h3>Здесь скоро появятся воспоминания</h3><p>Загрузите фотографии, видео или документы — мы бережно разложим их по датам.</p>{!hiddenUpload && <button className="button button--primary" onClick={onUpload}><Upload /> Выбрать файлы</button>}</div>; }

function CreateModal({ kind, onClose, onCreated }: { kind: "album" | "folder"; onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); const data = Object.fromEntries(new FormData(event.currentTarget)); const response = await fetch(`/api/${kind === "album" ? "albums" : "folders"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); if (response.ok) onCreated(); else { setError((await response.json()).error); setLoading(false); } }
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="small-modal"><button className="modal-close" onClick={onClose}><X /></button><div className="modal-icon">{kind === "album" ? <AlbumIcon /> : <Folder />}</div><h2>{kind === "album" ? "Новый семейный альбом" : "Новая папка"}</h2><p>{kind === "album" ? "Придумайте название для будущей истории." : "Папка поможет аккуратно разложить файлы."}</p><form onSubmit={submit}><label>Название<input name={kind === "album" ? "title" : "name"} required placeholder={kind === "album" ? "Например, Лето на даче" : "Например, Старые сканы"} autoFocus /></label>{kind === "album" && <><label>Короткое описание<textarea name="description" placeholder="О чём этот альбом?" rows={3} /></label><label>Цвет обложки<select name="color"><option value="terracotta">Терракотовый</option><option value="sage">Шалфейный</option><option value="lavender">Лавандовый</option><option value="sand">Песочный</option><option value="ocean">Морской</option></select></label></>}{error && <div className="form-error">{error}</div>}<button className="button button--primary button--wide" disabled={loading}>{loading ? "Создаём…" : "Создать"}</button></form></div></div>;
}

function RenameFolderModal({ folder, onClose, onRenamed }: { folder: FolderType; onClose: () => void; onRenamed: (folder: FolderType) => void }) {
  const [name, setName] = useState(folder.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch(`/api/folders/${folder.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json();
    if (response.ok) onRenamed(data);
    else { setError(data.error || "Не удалось переименовать папку"); setLoading(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="small-modal"><button className="modal-close" onClick={onClose}><X /></button><div className="modal-icon"><Pencil /></div><h2>Переименовать папку</h2><p>Название изменится у всех участников семейного архива.</p><form onSubmit={submit}><label>Название<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} autoFocus /></label>{error && <div className="form-error">{error}</div>}<button className="button button--primary button--wide" disabled={loading || !name.trim()}>{loading ? "Сохраняем…" : "Сохранить название"}</button></form></div></div>;
}

function RenameAlbumModal({ album, onClose, onRenamed }: { album: Album; onClose: () => void; onRenamed: (album: Album) => void }) {
  const [title, setTitle] = useState(album.title);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch(`/api/albums/${album.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    const data = await response.json();
    if (response.ok) onRenamed(data);
    else { setError(data.error || "Не удалось переименовать альбом"); setLoading(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="small-modal"><button className="modal-close" onClick={onClose}><X /></button><div className="modal-icon"><Pencil /></div><h2>Переименовать альбом</h2><p>Новое название сразу увидят все участники семейного архива.</p><form onSubmit={submit}><label>Название<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={100} autoFocus /></label>{error && <div className="form-error">{error}</div>}<button className="button button--primary button--wide" disabled={loading || !title.trim()}>{loading ? "Сохраняем…" : "Сохранить название"}</button></form></div></div>;
}

function FolderShareModal({ folder, onClose }: { folder: FolderType; onClose: () => void }) {
  const started = useRef(false);
  const [shareUrl, setShareUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function createShare() {
      try {
        const response = await fetch(`/api/folders/${folder.id}/share`, { method: "POST" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Не удалось создать ссылку");
        const url = new URL(data.path, window.location.origin).toString();
        setShareUrl(url);
        try { await navigator.clipboard.writeText(url); setCopied(true); } catch { /* The URL remains available for manual copying. */ }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Не удалось создать ссылку");
      } finally {
        setLoading(false);
      }
    }
    createShare();
  }, [folder.id]);

  async function copyShare() {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); }
    catch { setError("Браузер запретил доступ к буферу. Скопируйте ссылку из поля вручную."); }
  }

  async function revokeShares() {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/folders/${folder.id}/share`, { method: "DELETE" });
    const data = await response.json();
    if (response.ok) onClose();
    else { setError(data.error || "Не удалось отключить ссылки"); setLoading(false); }
  }

  return <div className="share-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="folder-share-title"><button className="modal-close share-dialog-close" onClick={onClose} aria-label="Закрыть"><X /></button><div className="modal-icon"><Link2 /></div><h2 id="folder-share-title">Поделиться папкой</h2><p>Публичная ссылка на папку «{folder.name}» откроется без входа в семейный архив.</p>{loading && !shareUrl ? <div className="share-dialog-loading">Создаём защищённую ссылку…</div> : <div className="share-link-field"><input value={shareUrl} readOnly onFocus={(event) => event.currentTarget.select()} aria-label="Публичная ссылка на папку" /><button onClick={copyShare} disabled={!shareUrl}>{copied ? <CheckCircle2 /> : <Copy />}{copied ? "Скопировано" : "Копировать"}</button></div>}{error && <div className="share-dialog-error">{error}</div>}<div className="share-dialog-warning"><ShieldAlert /><span><b>Важно:</b> любой человек по ссылке увидит текущие и будущие файлы этой папки. Комментарии и остальной архив останутся закрытыми.</span></div><div className="share-dialog-actions"><button className="share-revoke" onClick={revokeShares} disabled={loading || !shareUrl}>Отключить публичные ссылки</button>{shareUrl && <a className="button button--primary" href={shareUrl} target="_blank" rel="noreferrer"><ExternalLink /> Открыть</a>}</div></div></div>;
}

function MembersModal({ members, currentUser, onClose }: { members: User[]; currentUser: User; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copyInvite() { const response = await fetch("/api/invite"); const data = await response.json(); if (!response.ok || !data.code) return; const link = new URL("/login", window.location.origin); link.searchParams.set("invite", data.code); await navigator.clipboard.writeText(link.toString()); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="small-modal members-modal"><button className="modal-close" onClick={onClose}><X /></button><div className="modal-icon"><Users /></div><h2>Ваша семья</h2><p>Все участники видят общий архив и могут добавлять воспоминания.</p><div className="member-list">{members.map((member) => <div key={member.id}><Avatar user={member} /><span><b>{member.name}{member.id === currentUser.id && " · вы"}</b><small>{member.email}</small></span><em>{member.role === "admin" ? "Хранитель" : `${member._count?.assets || 0} файлов`}</em></div>)}</div><button className="button button--secondary button--wide" onClick={copyInvite}><UserPlus />{copied ? "Ссылка скопирована" : "Скопировать ссылку-приглашение"}</button></div></div>;
}

function gallerySubtitle(view: View, count: number) {
  if (view === "favorite") return `${count} самых дорогих моментов`;
  if (view === "video") return `${count} живых историй вашей семьи`;
  if (view === "files") return `${count} важных документов и других файлов`;
  if (view === "trash") return "Файлы, которые можно восстановить или удалить навсегда";
  return `${count} ${plural(count, "воспоминание", "воспоминания", "воспоминаний")} в хронологическом порядке`;
}

export function plural(value: number, one: string, few: string, many: string) { const mod10 = value % 10, mod100 = value % 100; return mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many; }
