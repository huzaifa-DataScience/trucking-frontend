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
        <div className="min-h-screen bg-canvas">
          <Sidebar />
          <div className="flex min-h-screen flex-col pl-64">
            <Header />
            <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col bg-canvas px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col">
                {children}
              </div>
            </main>
          </div>
        </div>
      </CompanyProvider>
    </RequireAdmin>
  );
}
