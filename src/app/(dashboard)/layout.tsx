import { CompanyProvider } from "@/contexts/CompanyContext";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CompanyProvider>
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
        <Sidebar />
        <div className="pl-56">
          <Header />
          <main className="min-h-[calc(100vh-3.5rem)] p-6">{children}</main>
        </div>
      </div>
    </CompanyProvider>
  );
}
