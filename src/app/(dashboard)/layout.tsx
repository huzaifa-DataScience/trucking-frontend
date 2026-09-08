import { RequireAuth } from "@/components/auth/RequireAuth";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <CompanyProvider>
        <DashboardShell>{children}</DashboardShell>
      </CompanyProvider>
    </RequireAuth>
  );
}
