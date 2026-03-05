import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { CompanyProvider } from "@/contexts/CompanyContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAdmin>
      <CompanyProvider>
        <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
          <Sidebar />
          <div className="pl-56">
            <Header />
            <main className="min-h-[calc(100vh-3.5rem)] p-6">{children}</main>
          </div>
        </div>
      </CompanyProvider>
    </RequireAdmin>
  );
}
