import type { FilterFieldDef } from "@/lib/filters/types";

export const FILTER_FIELDS: FilterFieldDef[] = [
  { key: "estimateNumber", label: "Estimate #", section: "Bid Information", kind: "text" },
  { key: "bidName", label: "Bid name", section: "Bid Information", kind: "text" },
  { key: "companyName", label: "Company", section: "Bid Information", kind: "text" },
  { key: "clientCompanyName", label: "Client / GC company", section: "Bid Information", kind: "text" },
  { key: "ownerProjectNumber", label: "Owner project #", section: "Bid Information", kind: "text" },
  {
    key: "mechanicalEngineerProjectNumber",
    label: "Mechanical engineer project #",
    section: "Bid Information",
    kind: "text",
  },
  {
    key: "status",
    label: "Status",
    section: "Bid Data",
    kind: "select",
    options: [
      { value: "draft", label: "Draft" },
      { value: "submitted", label: "Submitted" },
      { value: "archived", label: "Archived" },
    ],
  },
  {
    key: "workType",
    label: "Work type",
    section: "Bid Data",
    kind: "select",
    options: [
      { value: "insulation", label: "Insulation" },
      { value: "demo", label: "Demo" },
      { value: "gc", label: "GC" },
      { value: "masonry", label: "Masonry" },
      { value: "other", label: "Other" },
    ],
  },
  {
    key: "processStage",
    label: "Stage",
    section: "Bid Data",
    kind: "select",
    options: [
      { value: "intake", label: "Intake" },
      { value: "assignment", label: "Assignment" },
      { value: "estimating_setup", label: "Setup" },
      { value: "takeoff", label: "Takeoff" },
      { value: "proposal", label: "Proposal" },
      { value: "post_bid", label: "Post-Bid" },
      { value: "result", label: "Outcome" },
    ],
  },
  {
    key: "outcomeStatus",
    label: "Outcome",
    section: "Bid Data",
    kind: "select",
    options: [
      { value: "open", label: "Open" },
      { value: "awarded", label: "Awarded" },
      { value: "lost", label: "Lost" },
      { value: "no_bid", label: "No bid" },
      { value: "cancelled", label: "Cancelled" },
      { value: "postponed", label: "Postponed" },
    ],
  },
  { key: "bidDate", label: "Bid date", section: "Bid Data", kind: "dateRange" },
  { key: "dueDate", label: "Due date", section: "Bid Data", kind: "dateRange" },
  { key: "submitDate", label: "Submit date", section: "Bid Data", kind: "dateRange" },
];

export const BIDDING_SAVED_VIEWS_KEY = "bidding-saved-views";
