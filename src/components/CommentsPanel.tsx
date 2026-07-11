"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { MessageCircle, Reply, Send, SmilePlus, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { User } from "@/components/types";

const emojis = ["❤️", "👍", "😂", "😮", "😢", "🔥"] as const;

type Reaction = {
  id: string;
  emoji: string;
  userId: string;
  user: Pick<User, "id" | "name" | "avatarColor">;
};

type Comment = {
  id: string;
  body: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  assetId: string;
  authorId: string;
  parentId: string | null;
  author: Pick<User, "id" | "name" | "avatarColor">;
  reactions: Reaction[];
};

type CommentNode = Comment & { replies: CommentNode[] };

export default function CommentsPanel({ assetId, currentUser }: { assetId: string; currentUser: User }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [assetReactions, setAssetReactions] = useState<Reaction[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/assets/${assetId}/comments`);
    if (response.ok) {
      const data = await response.json();
      setComments(data.comments || []);
      setAssetReactions(data.reactions || []);
    } else setError("Не удалось загрузить обсуждение");
    setLoading(false);
  }, [assetId]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const tree = useMemo(() => buildTree(comments), [comments]);

  async function addComment(text: string, parentId?: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    const response = await fetch(`/api/assets/${assetId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text, parentId: parentId || null }),
    });
    if (response.ok) {
      const comment = await response.json();
      setComments((items) => [...items, comment]);
      if (parentId) { setReplyBody(""); setReplyTo(null); }
      else setBody("");
    } else setError((await response.json()).error || "Не удалось отправить комментарий");
    setSending(false);
  }

  async function toggleAssetReaction(emoji: string) {
    const response = await fetch(`/api/assets/${assetId}/reactions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emoji }),
    });
    if (response.ok) setAssetReactions(await response.json());
  }

  async function toggleCommentReaction(commentId: string, emoji: string) {
    const response = await fetch(`/api/comments/${commentId}/reactions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emoji }),
    });
    if (response.ok) {
      const reactions = await response.json();
      setComments((items) => items.map((comment) => comment.id === commentId ? { ...comment, reactions } : comment));
    }
  }

  async function deleteComment(commentId: string) {
    const response = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (response.ok) setComments((items) => items.map((comment) => comment.id === commentId ? { ...comment, body: "", deleted: true, reactions: [] } : comment));
  }

  return <section className="comments-panel" id={`comments-${assetId}`}>
    <div className="file-reactions">
      <span><SmilePlus /> Реакции на файл</span>
      <ReactionBar reactions={assetReactions} currentUserId={currentUser.id} onToggle={toggleAssetReaction} expanded />
    </div>

    <div className="comments-heading"><div><MessageCircle /><h2>Комментарии</h2><span>{comments.filter((comment) => !comment.deleted).length}</span></div><p>Обсудите этот момент всей семьёй</p></div>

    <div className="comment-composer">
      <Avatar user={currentUser} />
      <div><textarea value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") addComment(body); }} placeholder="Напишите комментарий…" rows={2} /><button onClick={() => addComment(body)} disabled={!body.trim() || sending}><Send /> Отправить</button></div>
    </div>
    {error && <div className="comments-error">{error}</div>}

    <div className="comments-list">
      {loading ? <div className="comments-loading">Загружаем обсуждение…</div> : tree.length ? tree.map((comment) => <CommentItem key={comment.id} comment={comment} depth={0} currentUser={currentUser} replyTo={replyTo} replyBody={replyBody} sending={sending} onReply={(item) => { setReplyTo(item); setReplyBody(""); }} onReplyBody={setReplyBody} onSubmitReply={() => replyTo && addComment(replyBody, replyTo.id)} onCancelReply={() => setReplyTo(null)} onReaction={toggleCommentReaction} onDelete={deleteComment} />) : <div className="comments-empty"><MessageCircle /><b>Пока без комментариев</b><span>Начните семейное обсуждение первым</span></div>}
    </div>
  </section>;
}

function CommentItem({ comment, depth, currentUser, replyTo, replyBody, sending, onReply, onReplyBody, onSubmitReply, onCancelReply, onReaction, onDelete }: { comment: CommentNode; depth: number; currentUser: User; replyTo: Comment | null; replyBody: string; sending: boolean; onReply: (comment: Comment) => void; onReplyBody: (value: string) => void; onSubmitReply: () => void; onCancelReply: () => void; onReaction: (commentId: string, emoji: string) => void; onDelete: (commentId: string) => void }) {
  const canDelete = !comment.deleted && (comment.authorId === currentUser.id || currentUser.role === "admin");
  return <div className="comment-thread" style={{ marginLeft: `${Math.min(depth, 4) * 22}px` }}>
    <article className={clsx("comment-card", comment.deleted && "comment-card--deleted")}>
      <Avatar user={comment.author} />
      <div className="comment-content">
        <div className="comment-meta"><b>{comment.author.name}</b><span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ru })}</span></div>
        {comment.deleted ? <p className="deleted-comment">Комментарий удалён</p> : <p>{comment.body}</p>}
        {!comment.deleted && <div className="comment-actions"><ReactionBar reactions={comment.reactions} currentUserId={currentUser.id} onToggle={(emoji) => onReaction(comment.id, emoji)} /><button onClick={() => onReply(comment)}><Reply /> Ответить</button>{canDelete && <button className="comment-delete" onClick={() => onDelete(comment.id)}><Trash2 /> Удалить</button>}</div>}
      </div>
    </article>
    {replyTo?.id === comment.id && <div className="reply-composer"><div>Ответ для <b>{comment.author.name}</b><button onClick={onCancelReply}>Отмена</button></div><textarea autoFocus value={replyBody} onChange={(event) => onReplyBody(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") onSubmitReply(); }} placeholder="Напишите ответ…" rows={2} /><button onClick={onSubmitReply} disabled={!replyBody.trim() || sending}><Send /> Ответить</button></div>}
    {comment.replies.map((reply) => <CommentItem key={reply.id} comment={reply} depth={depth + 1} currentUser={currentUser} replyTo={replyTo} replyBody={replyBody} sending={sending} onReply={onReply} onReplyBody={onReplyBody} onSubmitReply={onSubmitReply} onCancelReply={onCancelReply} onReaction={onReaction} onDelete={onDelete} />)}
  </div>;
}

function ReactionBar({ reactions, currentUserId, onToggle, expanded }: { reactions: Reaction[]; currentUserId: string; onToggle: (emoji: string) => void; expanded?: boolean }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const grouped = emojis.map((emoji) => ({ emoji, items: reactions.filter((reaction) => reaction.emoji === emoji) })).filter((group) => group.items.length > 0);
  return <div className="reaction-wrap"><div className="reaction-list">{grouped.map((group) => <button key={group.emoji} className={clsx("reaction-chip", group.items.some((item) => item.userId === currentUserId) && "reaction-chip--active")} title={group.items.map((item) => item.user.name).join(", ")} onClick={() => onToggle(group.emoji)}><span>{group.emoji}</span><b>{group.items.length}</b></button>)}<button className="reaction-add" onClick={() => setPickerOpen(!pickerOpen)} aria-label="Добавить реакцию"><SmilePlus /></button></div>{(pickerOpen || expanded && !grouped.length) && <div className="reaction-picker">{emojis.map((emoji) => <button key={emoji} className={reactions.some((item) => item.emoji === emoji && item.userId === currentUserId) ? "active" : ""} onClick={() => onToggle(emoji)}>{emoji}</button>)}</div>}</div>;
}

function Avatar({ user }: { user: Pick<User, "name" | "avatarColor"> }) {
  const initials = user.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <span className="comment-avatar" style={{ background: user.avatarColor }}>{initials}</span>;
}

function buildTree(comments: Comment[]): CommentNode[] {
  const nodes = new Map(comments.map((comment) => [comment.id, { ...comment, replies: [] } as CommentNode]));
  const roots: CommentNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parentId ? nodes.get(node.parentId) : null;
    if (parent && parent.id !== node.id) parent.replies.push(node);
    else roots.push(node);
  });
  return roots;
}
