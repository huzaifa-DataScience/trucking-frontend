/**
 * Process draft lives in ProcessDraftContext so every bid stage shares one
 * draft + Save handler (captain, intake, setup, etc.).
 */
export { useProcessDraft, ProcessDraftProvider } from "@/contexts/ProcessDraftContext";
