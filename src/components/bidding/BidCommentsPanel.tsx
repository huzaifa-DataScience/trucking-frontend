"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import * as biddingApi from "@/lib/api/endpoints/bidding";
import { useAuth } from "@/contexts/AuthContext";
import { useBidSheet } from "@/contexts/BidSheetContext";
import { useConfirmDialog } from "@/contexts/ConfirmDialogContext";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  BidComment,
  BidCommentAttachment,
  BidMentionUser,
} from "@/lib/bidding/types";
import { personDisplayName, personInitials } from "@/lib/bidding/person-label";

const MAX_FILES = 5;
const ACCEPT = "image/jpeg,image/png,image/webp";
const ACCEPT_SET = new Set(["image/jpeg", "image/png", "image/webp"]);

function formatCommentTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function commentAuthorLabel(c: BidComment) {
  return personDisplayName({
    firstName: c.authorFirstName,
    lastName: c.authorLastName,
    name: c.authorName,
    email: c.authorEmail,
  });
}

function commentAuthorInitials(c: BidComment) {
  return personInitials({
    firstName: c.authorFirstName,
    lastName: c.authorLastName,
    name: c.authorName,
    email: c.authorEmail,
  });
}

function mentionUserLabel(u: BidMentionUser): string {
  return personDisplayName({
    firstName: u.firstName,
    lastName: u.lastName,
    name: u.name,
    email: u.email,
  });
}

/** Active `@query` ending at cursor (prefix after @). */
function findActiveMention(
  text: string,
  cursor: number
): { start: number; query: string } | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([a-zA-Z0-9._+-]*)$/);
  if (!match) return null;
  return { start: before.length - match[0].length, query: match[1] ?? "" };
}

function renderCommentBody(body: string, handles: string[]) {
  if (!handles.length) {
    return (
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
        {body}
      </p>
    );
  }
  const escaped = handles
    .map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter(Boolean);
  if (!escaped.length) {
    return (
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
        {body}
      </p>
    );
  }
  const re = new RegExp(`(@(?:${escaped.join("|")}))`, "gi");
  const parts = body.split(re);
  return (
    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
      {parts.map((part, i) =>
        part.startsWith("@") &&
        handles.some((h) => part.slice(1).toLowerCase() === h.toLowerCase()) ? (
          <span key={i} className="font-semibold text-brand">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

function CommentThumb({ attachment }: { attachment: BidCommentAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    void biddingApi
      .fetchBidAttachmentBlob(attachment.downloadPath)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.downloadPath]);

  if (error) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-ink/[0.04] text-[10px] text-ink/40">
        Failed
      </div>
    );
  }

  if (!url) {
    return (
      <div className="h-20 w-20 animate-pulse rounded-lg bg-ink/[0.06]" />
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-lg border border-ink/10"
      title={attachment.fileName}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={attachment.fileName}
        className="h-20 w-20 object-cover"
      />
    </a>
  );
}

export function BidCommentsPanel() {
  const { bid, canWrite } = useBidSheet();
  const { user } = useAuth();
  const confirmDialog = useConfirmDialog();
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [items, setItems] = useState<BidComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** userId → handle, from autocomplete picks */
  const [mentionMap, setMentionMap] = useState<Map<number, string>>(
    () => new Map()
  );
  const [mentionActive, setMentionActive] = useState<{
    start: number;
    query: string;
  } | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<
    BidMentionUser[]
  >([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);

  const bidId = bid?.id;
  const archived = bid?.status === "archived";
  const canPost = Boolean(canWrite && !archived);

  const load = useCallback(async () => {
    if (!bidId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await biddingApi.getBidComments(bidId);
      setItems(Array.isArray(res.items) ? res.items : []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load comments"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [bidId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!mentionActive) {
      setMentionSuggestions([]);
      setMentionLoading(false);
      return;
    }
    const q = mentionActive.query;
    let cancelled = false;
    setMentionLoading(true);
    const t = window.setTimeout(() => {
      void biddingApi
        .getBiddingMentionUsers(q || "a")
        .then((list) => {
          if (cancelled) return;
          const filtered = list.filter((u) => u.id !== user?.id);
          setMentionSuggestions(filtered);
          setMentionIndex(0);
        })
        .catch(() => {
          if (!cancelled) setMentionSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setMentionLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [mentionActive, user?.id]);

  const canDeleteComment = (c: BidComment) => {
    if (!user || archived) return false;
    if (user.role === "admin" || user.role === "super_admin") return true;
    return user.id === c.authorUserId;
  };

  const syncMentionFromCursor = (text: string, cursor: number) => {
    setMentionActive(findActiveMention(text, cursor));
  };

  const insertMention = (u: BidMentionUser) => {
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? body.length;
    const active = findActiveMention(body, cursor) ?? mentionActive;
    if (!active) return;
    const before = body.slice(0, active.start);
    const after = body.slice(cursor);
    const insert = `@${u.handle} `;
    const next = `${before}${insert}${after}`;
    setBody(next);
    setMentionMap((prev) => {
      const m = new Map(prev);
      m.set(u.id, u.handle);
      return m;
    });
    setMentionActive(null);
    setMentionSuggestions([]);
    requestAnimationFrame(() => {
      const pos = before.length + insert.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  const onPickFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const next: File[] = [...files];
    for (const f of Array.from(list)) {
      if (!ACCEPT_SET.has(f.type)) continue;
      if (next.length >= MAX_FILES) break;
      next.push(f);
    }
    setFiles(next);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const mentionUserIdsForPost = (): number[] => {
    const ids: number[] = [];
    for (const [id, handle] of mentionMap) {
      const re = new RegExp(
        `@${handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-zA-Z0-9._+-])`,
        "i"
      );
      if (re.test(body)) ids.push(id);
    }
    return ids;
  };

  const runPost = async () => {
    if (!bidId || !canPost) return;
    const text = body.trim();
    if (!text && files.length === 0) {
      setError("Add a message or an image");
      return;
    }
    setPosting(true);
    setError(null);
    try {
      await biddingApi.postBidComment(bidId, {
        body: text || undefined,
        files: files.length ? files : undefined,
        mentionUserIds: mentionUserIdsForPost(),
      });
      setBody("");
      setFiles([]);
      setMentionMap(new Map());
      setMentionActive(null);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to post comment"));
    } finally {
      setPosting(false);
    }
  };

  const runDelete = async (comment: BidComment) => {
    if (!bidId || !canDeleteComment(comment)) return;
    const ok = await confirmDialog({
      title: "Delete comment?",
      message: "This comment will be removed from the thread.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;
    setDeletingId(comment.id);
    setError(null);
    try {
      await biddingApi.deleteBidComment(bidId, comment.id);
      setItems((prev) => prev.filter((c) => c.id !== comment.id));
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to delete comment"));
    } finally {
      setDeletingId(null);
    }
  };

  const onComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionActive || mentionSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((i) => (i + 1) % mentionSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex(
        (i) => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const pick = mentionSuggestions[mentionIndex];
      if (pick) insertMention(pick);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMentionActive(null);
    }
  };

  if (!bid) return null;

  const showMentionMenu =
    Boolean(mentionActive) &&
    (mentionLoading || mentionSuggestions.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {canPost ? (
        <div className="flex flex-col gap-2">
          <label className="relative flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">
              New comment
            </span>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => {
                const next = e.target.value;
                setBody(next);
                syncMentionFromCursor(next, e.target.selectionStart);
              }}
              onClick={(e) =>
                syncMentionFromCursor(body, e.currentTarget.selectionStart)
              }
              onKeyUp={(e) =>
                syncMentionFromCursor(body, e.currentTarget.selectionStart)
              }
              onKeyDown={onComposerKeyDown}
              rows={3}
              disabled={posting}
              className="resize-y rounded-xl border border-ink/10 bg-canvas/40 px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-brand disabled:opacity-60"
              placeholder="Write a note… use @ to mention"
            />
            {showMentionMenu ? (
              <ul
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-auto rounded-xl border border-ink/10 bg-surface py-1 shadow-lg"
                role="listbox"
              >
                {mentionLoading && mentionSuggestions.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-ink/45">Searching…</li>
                ) : (
                  mentionSuggestions.map((u, i) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={i === mentionIndex}
                        className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm transition ${
                          i === mentionIndex
                            ? "bg-brand/10 text-brand"
                            : "text-ink hover:bg-ink/[0.03]"
                        }`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertMention(u);
                        }}
                      >
                        <span className="font-semibold">
                          {mentionUserLabel(u)}
                        </span>
                        <span className="text-xs text-ink/50">
                          @{u.handle}
                          {u.email ? ` · ${u.email}` : ""}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </label>

          {files.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-1.5 rounded-lg border border-ink/10 bg-canvas/50 px-2 py-1 text-xs text-ink/70"
                >
                  <span className="max-w-[10rem] truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-ink/40 hover:text-danger"
                    aria-label="Remove file"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <button
              type="button"
              disabled={posting || files.length >= MAX_FILES}
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border border-ink/10 px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/[0.03] disabled:opacity-40"
            >
              Attach image
            </button>
            <button
              type="button"
              disabled={posting || (!body.trim() && files.length === 0)}
              onClick={() => void runPost()}
              className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-40"
            >
              {posting ? "Posting…" : "Post"}
            </button>
            <span className="text-[10px] text-ink/40">
              Up to {MAX_FILES} jpeg/png/webp
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-ink/45">
          {archived ? "Archived — comments are read only" : "Read only"}
        </p>
      )}

      <div className="border-t border-ink/[0.06] pt-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink/40">
          Thread
        </p>
        {loading ? (
          <p className="text-sm text-ink/45">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink/45">No comments yet</p>
        ) : (
          <ul className="space-y-3">
            {items.map((c) => {
              const handles = (c.mentions ?? []).flatMap((m) => {
                const email = m.email || m.name;
                const local = email.includes("@")
                  ? email.split("@")[0]!
                  : email;
                return [local, email].filter(Boolean);
              });
              const authorLabel = commentAuthorLabel(c);
              const authorInitials = commentAuthorInitials(c);
              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-ink/[0.06] bg-canvas/50 px-3 py-2.5"
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-bold text-brand"
                      aria-hidden
                      title={c.authorEmail || c.authorName}
                    >
                      {authorInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <p
                          className="truncate text-sm font-semibold text-ink"
                          title={c.authorEmail || c.authorName}
                        >
                          {authorLabel}
                        </p>
                        <p className="text-[10px] font-medium text-ink/40">
                          {formatCommentTime(c.createdAt)}
                        </p>
                      </div>
                      {c.body?.trim()
                        ? renderCommentBody(c.body, handles)
                        : null}
                      {c.attachments?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {c.attachments.map((a) => (
                            <CommentThumb key={a.id} attachment={a} />
                          ))}
                        </div>
                      ) : null}
                      {canDeleteComment(c) ? (
                        <button
                          type="button"
                          disabled={deletingId === c.id}
                          onClick={() => void runDelete(c)}
                          className="mt-2 text-[11px] font-medium text-ink/40 transition hover:text-danger disabled:opacity-40"
                        >
                          {deletingId === c.id ? "Deleting…" : "Delete"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
