/** Chat shell lives in layout so inbox state persists when switching threads. */
import { ChatShell } from "@/components/workforce/chat/ChatShell";

export default function WorkforceChatLayout({ children: _children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 flex h-[calc(100dvh-3.75rem-3rem)] min-h-0 flex-col overflow-hidden sm:-mx-6 lg:-mx-0 lg:h-[calc(100dvh-3.75rem-4rem)]">
      <ChatShell />
    </div>
  );
}
