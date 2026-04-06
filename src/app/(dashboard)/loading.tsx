import { LogoLoader } from "@/components/ui/LogoLoader";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LogoLoader size={40} />
    </div>
  );
}
