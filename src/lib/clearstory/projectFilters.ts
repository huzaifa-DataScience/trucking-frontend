import type { FilterFieldDef } from "@/lib/filters/types";

export const PROJECT_FILTER_FIELDS: FilterFieldDef[] = [
  { key: "jobNumber", label: "Job #", section: "Project Information", kind: "text" },
  { key: "name", label: "Project name", section: "Project Information", kind: "text" },
  { key: "customerName", label: "Customer", section: "Project Information", kind: "text" },
  { key: "customerJobNumber", label: "Customer job #", section: "Project Information", kind: "text" },
  { key: "officeName", label: "Office", section: "Project Information", kind: "text" },
  {
    key: "originType",
    label: "Origin type",
    section: "Project Information",
    kind: "select",
    options: [
      { value: "manual", label: "Manual" },
      { value: "import", label: "Import" },
      { value: "sync", label: "Sync" },
    ],
  },
  {
    key: "archived",
    label: "Archived",
    section: "Project Information",
    kind: "select",
    options: [
      { value: "true", label: "Archived" },
      { value: "false", label: "Active" },
    ],
  },
  { key: "siteCity", label: "Site city", section: "Site & Dates", kind: "text" },
  { key: "siteState", label: "Site state", section: "Site & Dates", kind: "text" },
  { key: "siteZipCode", label: "Site zip", section: "Site & Dates", kind: "text" },
  { key: "siteCountry", label: "Site country", section: "Site & Dates", kind: "text" },
  { key: "createdAt", label: "Created", section: "Site & Dates", kind: "dateRange" },
  { key: "updatedAt", label: "Updated", section: "Site & Dates", kind: "dateRange" },
];

export const PROJECTS_SAVED_VIEWS_KEY = "clearstory-projects-saved-views";
