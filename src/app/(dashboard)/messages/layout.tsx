import { WorkforceProvider } from "@/contexts/WorkforceContext";
import { ChatShell } from "@/components/workforce/chat/ChatShell";

/** Standalone Messages module — same Connecteam chat as Workforce, own workspace. */
export default function MessagesLayout({ children: _children }: { children: React.ReactNode }) {
  return (
    <WorkforceProvider>
      <div className="-mx-4 flex h-[calc(100dvh-3.75rem-3rem)] min-h-0 flex-col overflow-hidden sm:-mx-6 lg:-mx-0 lg:h-[calc(100dvh-3.75rem-4rem)]">
        <ChatShell />
      </div>
    </WorkforceProvider>
  );
}
