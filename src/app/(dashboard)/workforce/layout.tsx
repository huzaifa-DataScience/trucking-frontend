import { WorkforceProvider } from "@/contexts/WorkforceContext";

export default function WorkforceLayout({ children }: { children: React.ReactNode }) {
  return <WorkforceProvider>{children}</WorkforceProvider>;
}
