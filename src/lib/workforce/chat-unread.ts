/** Cross-component unread total sync — counts come from backend API + Socket.IO */

export const CHAT_UNREAD_EVENT = "workforce-chat-unread-updated";

export function dispatchChatUnreadTotal(totalUnread: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CHAT_UNREAD_EVENT, { detail: { totalUnread } })
  );
}
