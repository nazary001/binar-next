import { adminApi, type ApiResult } from "../lib/api";
import { countOf } from "../lib/format";
import { invalidate, setQueryData } from "../lib/query";
import { toast, toastError } from "../ui/Toast";
import {
  LEAD_ERRORS,
  type LeadBulkResult,
  type LeadDetail,
  type LeadNoteDto,
  type LeadPatchBody,
  type LeadStatus,
} from "./types";

// The changes the inbox makes, each with its refresh and its message: the
// detail answer of a change goes straight into the cache of the drawer,
// every list and the menu's counter are fetched again, and a refusal is
// said in a toast (never silent).

export type LeadAnswer = { ok: true; lead: LeadDetail };

export function leadPath(id: string): string {
  return `/leads/${encodeURIComponent(id)}`;
}

// Every list of the inbox ("/leads?..."), the menu badge of new
// submissions and the overview's figures.
export function refreshInbox(): void {
  invalidate("/leads?");
  invalidate("/nav-counts");
  invalidate("/overview");
}

function settle(result: ApiResult<LeadAnswer>): LeadDetail | null {
  if (!result.ok) {
    toastError(result, LEAD_ERRORS);
    // Gone meanwhile: the lists must stop showing it.
    if (result.status === 404) refreshInbox();
    return null;
  }
  setQueryData(leadPath(result.data.lead.id), result.data);
  refreshInbox();
  return result.data.lead;
}

export async function patchLead(id: string, body: LeadPatchBody): Promise<LeadDetail | null> {
  return settle(await adminApi<LeadAnswer>(leadPath(id), { method: "PATCH", body }));
}

export async function addNote(id: string, text: string): Promise<LeadDetail | null> {
  const result = await adminApi<LeadAnswer & { note: LeadNoteDto }>(`${leadPath(id)}/notes`, { method: "POST", body: { text } });
  return settle(result);
}

export async function deleteNote(id: string, noteId: string): Promise<LeadDetail | null> {
  return settle(await adminApi<LeadAnswer>(`${leadPath(id)}/notes/${encodeURIComponent(noteId)}`, { method: "DELETE" }));
}

export async function deleteLead(id: string): Promise<boolean> {
  const result = await adminApi<{ ok: true }>(leadPath(id), { method: "DELETE" });
  if (!result.ok) {
    toastError(result, LEAD_ERRORS);
    return false;
  }
  // Not the detail itself: the drawer that shows it is still sliding out
  // and would ask for a record that is gone.
  refreshInbox();
  return true;
}

const LEADS_WORDS = ["заявку", "заявки", "заявок"] as const;

export async function bulkStatus(ids: string[], status: LeadStatus, label: string): Promise<boolean> {
  const result = await adminApi<LeadBulkResult>("/leads/bulk", { method: "POST", body: { ids, status } });
  if (!result.ok) {
    toastError(result, LEAD_ERRORS);
    return false;
  }
  refreshInbox();
  // The drawers and caches of the changed submissions show the new status.
  invalidate("/leads/");
  const { matched, updated } = result.data;
  if (updated === 0) toast.info(`Усі обрані заявки вже мають статус «${label}».`);
  else if (updated < matched) toast.success(`Статус «${label}»: змінено ${countOf(updated, LEADS_WORDS)}, решта вже мала його.`);
  else toast.success(`Статус «${label}»: ${countOf(updated, LEADS_WORDS)}.`);
  return true;
}
