"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { ClearstorySwaggerTable } from "@/components/clearstory/ClearstorySwaggerTable";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { Card, CardHeader } from "@/components/ui/Card";
import { useClearstoryCompany } from "@/hooks/useClearstoryCompany";

export default function ClearstoryCompanyPage() {
  const { row, loading, error, refetch } = useClearstoryCompany();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        title="Company"
        subtitle="Company profile synced from Clearstory."
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-xl border border-ink/10 bg-[#f8f9fb] px-4 py-2 text-sm font-semibold text-ink hover:border-brand/30"
          >
            Refresh
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <LogoLoader size={32} />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : !row ? (
        <Card>
          <CardHeader title="No company row" subtitle="Nothing synced yet, or mirror empty. Run sync from Ops." />
        </Card>
      ) : (
        <ClearstorySwaggerTable
          title="Company (current)"
          subtitle="resourceKey is always current."
          rows={[row]}
          total={1}
          page={1}
          pageSize={1}
          totalPages={1}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          loading={false}
          error={null}
          hidePagination
        />
      )}
    </div>
  );
}
