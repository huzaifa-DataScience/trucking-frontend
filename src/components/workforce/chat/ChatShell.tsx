"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkforce } from "@/contexts/WorkforceContext";
import { useWorkforceChat } from "@/hooks/useWorkforceChat";
import { useToast } from "@/components/ui/ToastProvider";
import { WorkforceGate } from "@/components/workforce/WorkforceGate";
import { ChatCreateChannelModal } from "@/components/workforce/chat/ChatCreateChannelModal";
import { ChatInboxPanel } from "@/components/workforce/chat/ChatInboxPanel";
import { ChatThreadPanel } from "@/components/workforce/chat/ChatThreadPanel";
import { getApiErrorMessage } from "@/lib/api/client";
import { chatConversationIdFromPath } from "@/lib/workforce/chat-utils";

const BASE_HREF = "/workforce/chat";

/** Mounted once in chat layout — survives thread navigation without remounting. */
export function ChatShell() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { me } = useWorkforce();
  const { showToast } = useToast();

  const conversationId = chatConversationIdFromPath(pathname);
  const connecteamUserId = me?.connecteamUser?.userId ?? null;
  const chat = useWorkforceChat(conversationId, {
    connecteamUserId,
    appUserId: user?.id ?? null,
  });
  const [showCreate, setShowCreate] = useState(false);

  const canSend = Boolean(me?.linked && connecteamUserId);
  const sendDisabledReason = !me?.linked
    ? isAdmin
      ? "Workforce profile not linked — browse as admin, or link under Crew to send as yourself."
      : "Workforce profile not linked — ask an admin to link your account before sending messages."
    : undefined;

  const selectConversation = useCallback(
    (id: string) => {
      router.push(`${BASE_HREF}/${encodeURIComponent(id)}`, { scroll: false });
    },
    [router]
  );

  const clearConversation = useCallback(() => {
    router.push(BASE_HREF, { scroll: false });
  }, [router]);

  const handleSend = useCallback(
    async (text: string) => {
      try {
        const res = await chat.sendMessage(text, connecteamUserId ?? undefined);
        if (res?.connecteam && res.connecteam.sent === false) {
          showToast(
            res.connecteam.error ??
              "Saved on portal only — Connecteam outbound sync is not configured.",
            "info"
          );
        }
      } catch (e) {
        showToast(getApiErrorMessage(e, "Send failed"), "error");
      }
    },
    [chat, connecteamUserId, showToast]
  );

  const handleCreateChannel = useCallback(
    async (title: string) => {
      const conv = await chat.createChannel(title);
      router.push(`${BASE_HREF}/${encodeURIComponent(conv.conversationId)}`, { scroll: false });
      return conv;
    },
    [chat, router]
  );

  const showInboxOnMobile = !conversationId;
  const showThreadOnMobile = Boolean(conversationId);

  return (
    <WorkforceGate>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex h-full min-h-0 flex-1 overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface shadow-[0_1px_3px_rgba(1,1,1,0.04)]">
          <ChatInboxPanel
            conversations={chat.conversations}
            total={chat.inboxTotal}
            loading={chat.inboxLoading}
            loadingMore={chat.loadingMoreInbox}
            hasMore={chat.hasMoreInbox}
            error={chat.inboxError}
            activeId={conversationId}
            filter={chat.filter}
            search={chat.search}
            socketStatus={chat.socketStatus}
            isFallbackPolling={chat.isFallbackPolling}
            onFilterChange={chat.setFilter}
            onSearchChange={chat.setSearch}
            onNewChannel={() => setShowCreate(true)}
            onSelectConversation={selectConversation}
            onLoadMore={() => void chat.loadMoreInbox()}
            showOnMobile={showInboxOnMobile}
          />

          <ChatThreadPanel
            conversation={conversationId ? chat.activeConversation : null}
            messages={chat.messages}
            messagesTotal={chat.messagesTotal}
            loading={chat.threadLoading}
            loadingOlder={chat.loadingOlder}
            hasOlderMessages={chat.hasOlderMessages}
            error={chat.threadError}
            sending={chat.sending}
            canSend={canSend}
            sendDisabledReason={sendDisabledReason}
            connecteamUserId={connecteamUserId}
            appUserId={user?.id ?? null}
            onSend={handleSend}
            onLoadOlder={() => void chat.loadOlderMessages()}
            onBack={clearConversation}
            showOnMobile={showThreadOnMobile}
            threadPendingNew={chat.threadPendingNew}
            onThreadAtBottom={chat.handleThreadAtBottom}
          />
        </div>
      </div>

      <ChatCreateChannelModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreateChannel}
      />
    </WorkforceGate>
  );
}
