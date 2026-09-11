import { RequireAuth } from "@/components/auth/RequireAuth";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ConfirmDialogProvider } from "@/contexts/ConfirmDialogContext";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <CompanyProvider>
        <ConfirmDialogProvider>
          <DashboardShell>{children}</DashboardShell>
        </ConfirmDialogProvider>
      </CompanyProvider>
    </RequireAuth>
  );
}
