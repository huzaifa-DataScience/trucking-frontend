"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { ClearstorySwaggerTable } from "@/components/clearstory/ClearstorySwaggerTable";
import { useClearstoryTable } from "@/hooks/useClearstoryTable";

export default function ClearstoryCustomersTablePage() {
  const { rows, total, page, pageSize, setPage, setPageSize, totalPages, isLoading, error } =
    useClearstoryTable("customers");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        title="Customers"
        subtitle="Customer directory synced from Clearstory. Browse and inspect details."
      />

      <ClearstorySwaggerTable
        title="Customer rows"
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={isLoading}
        error={error}
      />
    </div>
  );
}
