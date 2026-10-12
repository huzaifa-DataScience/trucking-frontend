import { redirect } from "next/navigation";

/** Legacy path — Messages is a standalone module at `/messages`. */
export default async function WorkforceChatThreadRedirect({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  redirect(`/messages/${encodeURIComponent(conversationId)}`);
}
