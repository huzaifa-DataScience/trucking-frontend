import { get } from "../client";
import type { ApiLateSubmissionRow, ApiEfficiencyOutlierRow } from "../types";
import type { LateSubmissionRow, EfficiencyOutlierRow } from "@/lib/types";
import type { Direction } from "@/lib/types";

export interface ForensicFilters {
  companyId?: string;
  startDate: string;
  endDate: string;
  jobId?: string;
  materialId?: string;
  haulerId?: string;
  truckTypeId?: string;
  direction?: Direction;
}

const toParams = (f: ForensicFilters) => ({
  startDate: f.startDate,
  endDate: f.endDate,
  // Convert IDs from string to number (backend expects numbers)
  jobId: f.jobId && f.jobId !== "all" ? Number(f.jobId) : undefined,
  materialId: f.materialId && f.materialId !== "all" ? Number(f.materialId) : undefined,
  haulerId: f.haulerId && f.haulerId !== "all" ? Number(f.haulerId) : undefined,
  truckTypeId: f.truckTypeId && f.truckTypeId !== "all" ? Number(f.truckTypeId) : undefined,
  direction: f.direction === "Both" ? undefined : f.direction,
  // Convert companyId string to number (backend expects number)
  companyId: f.companyId ? Number(f.companyId) : undefined,
});

export async function getLateSubmissions(filters: ForensicFilters): Promise<LateSubmissionRow[]> {
  const rows = await get<ApiLateSubmissionRow[]>("/forensic/late-submission", toParams(filters));
  return rows;
}

export async function getEfficiencyOutliers(filters: ForensicFilters): Promise<EfficiencyOutlierRow[]> {
  const rows = await get<ApiEfficiencyOutlierRow[]>("/forensic/efficiency-outlier", toParams(filters));
  return rows.map((r) => {
    // Calculate what we can from existing fields
    const totalTickets = r.thisTruckLoads;
    const isSingleLoad = totalTickets === 1;
    
    // Work Duration: Format impliedHours as "Hours:Minutes"
    const hours = Math.floor(r.impliedHours);
    const minutes = Math.round((r.impliedHours - hours) * 60);
    const workDuration = `${hours}:${minutes.toString().padStart(2, "0")}`;
    
    // My Avg Cycle: Duration / (Total Tickets - 1) in minutes
    // If single load, set to 0 or null
    const myAvgCycleMinutes = isSingleLoad
      ? 0
      : Math.round((r.impliedHours * 60) / (totalTickets - 1));
    
    // Fleet Benchmark: Use backend value if provided, otherwise use fleetAvgLoads as placeholder
    // Note: Backend should calculate this as average of all trucks' My Avg Cycles in peer group
    const fleetBenchmarkMinutes = r.fleetBenchmarkMinutes ?? (r.fleetAvgLoads > 0 ? myAvgCycleMinutes : 0);
    
    // Status: Calculate if not provided by backend
    let status: "green" | "red" | "grey" = r.status ?? "green";
    if (isSingleLoad) {
      status = "grey";
    } else if (r.fleetBenchmarkMinutes != null && myAvgCycleMinutes > 0) {
      const threshold = fleetBenchmarkMinutes * 1.15;
      status = myAvgCycleMinutes > threshold ? "red" : "green";
    }
    
    // Route: Format as "Material Name → Destination Site" per spec
    const route = r.materialName
      ? `${r.materialName} → ${r.routeName}`
      : `${r.jobName} / ${r.routeName}`; // Fallback if materialName not available
    
    return {
      date: r.date,
      jobName: r.jobName,
      route,
      truckNumber: r.truckNumber,
      haulerName: r.haulerName,
      totalTickets,
      workDuration,
      myAvgCycle: myAvgCycleMinutes,
      fleetBenchmark: fleetBenchmarkMinutes,
      status,
      // Keep legacy fields for backward compatibility
      fleetAvgLoads: r.fleetAvgLoads,
      thisTruckLoads: r.thisTruckLoads,
      firstTicketTime: r.firstTicketTime,
      lastTicketTime: r.lastTicketTime,
      impliedHours: r.impliedHours,
      loadsPerHour: r.loadsPerHour,
    };
  });
}
