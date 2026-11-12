// Mutations of the profile lists (store.ts). Each one stays synchronous for
// the page: it changes the mirrored lists at once (and returns the new row
// where the page needs its id), then posts the change through one ordered
// queue (lib/session/push.ts). The server checks it, stores the row it
// builds from the same input with the same defaults, and answers with it;
// the mirror adopts that row. A refused change refreshes the session and
// the server's lists replace the optimistic ones. The ids are made here
// (newId), so the row the page already shows is the row the server keeps.
"use client";

import { api, type ApiOptions } from "@/lib/api/client";
import { refreshSession, registerDomainApplier } from "@/lib/session/bootstrap";
import { readDomain, writeDomain } from "@/lib/session/cache";
import { createPushQueue } from "@/lib/session/push";
import {
  fileFormat,
  mockContractNumber,
  newId,
  type Contract,
  type Counterparty,
  type Employee,
  type ProfileData,
} from "./data";
import { updateProfile } from "./store";

// The uploaded scans themselves are not kept (neither in the browser nor
// on the server: only the metadata travels): this session keeps an object
// URL per contract so the eye / «Завантажити» open the real file until the
// tab closes; seeded and older contracts open the placeholder document.
const fileUrls = new Map<string, string>();
const PLACEHOLDER_PDF = "/figma-export/materials/placeholder.pdf";

export function contractFileUrl(contractId: string): string {
  return fileUrls.get(contractId) ?? PLACEHOLDER_PDF;
}

// --- sending ------------------------------------------------------------

const queue = createPushQueue();

// Requests on the way, per account, and the accounts whose session answer
// arrived meanwhile. While an account's changes are on the way a session
// answer may not know them yet (it would drop the row the page just
// added), so it is set aside and asked again once they are all answered.
const pending = new Map<string, number>();
const deferred = new Set<string>();

// The accounts that sent a change since the last session answer this
// store applied. An answer that arrives after a change was sent may still
// have been read by the server before the change was stored (a slow boot
// or visibility refresh; refreshSession also hands a caller the request
// already on its way), so it is not written: the store asks again, once
// every change is answered, and that request reads them all. (This costs
// one more GET /api/session after a change, never a wrong list.)
const touched = new Set<string>();

function askAgain() {
  // After the current refresh has settled (refreshSession shares the
  // request on its way until then), so this one starts anew.
  setTimeout(() => void refreshSession(), 0);
}

// (With nothing mirrored, e.g. right after a sign-out and back in, the
// answer is written at once: there is no optimistic row to protect.)
registerDomainApplier("profile", (value, account) => {
  const id = account.id;
  if (readDomain("profile", id) === undefined) {
    touched.delete(id);
    writeDomain("profile", id, value);
    return;
  }
  if ((pending.get(id) ?? 0) > 0) {
    deferred.add(id);
    return;
  }
  if (touched.delete(id)) {
    askAgain();
    return;
  }
  writeDomain("profile", id, value);
});

function send<T>(accountId: string, path: string, options: ApiOptions, adopt?: (data: T) => void) {
  touched.add(accountId);
  pending.set(accountId, (pending.get(accountId) ?? 0) + 1);
  queue.push(async () => {
    const result = await api<T>(path, options);
    const left = (pending.get(accountId) ?? 1) - 1;
    if (left > 0) pending.set(accountId, left);
    else pending.delete(accountId);
    if (result.ok && adopt && result.data) {
      // With later changes still on the way the stored row may already be
      // older than the mirror (a second edit of the same employee), so it
      // is not adopted then; the lists are asked for once all are in.
      if (left === 0) adopt(result.data);
      else deferred.add(accountId);
    }
    // A refusal refreshes the session by itself (push.ts); after a success
    // the answer that was set aside is asked for again.
    if (left === 0 && deferred.delete(accountId) && result.ok) void refreshSession();
    return result;
  });
}

// Writes the server's row into the mirror, unless the account's mirror is
// gone (signed out meanwhile): a late answer never brings it back.
function adoptInto(accountId: string, updater: (prev: ProfileData) => ProfileData) {
  if (readDomain("profile", accountId) === undefined) return;
  updateProfile(accountId, updater);
}

const segment = (id: string) => encodeURIComponent(id);

// --- counterparties and contracts --------------------------------------

function contractFromFile(file: File, existing: Contract[]): Contract {
  const today = new Date();
  const contract: Contract = {
    id: newId("ct"),
    number: mockContractNumber(existing, today),
    date: today.toISOString().slice(0, 10),
    status: "review",
    file: { name: file.name, size: file.size, format: fileFormat(file.name, file.type) },
  };
  try {
    fileUrls.set(contract.id, URL.createObjectURL(file));
  } catch {
    // No object URLs (old browser): the placeholder stands in.
  }
  return contract;
}

export function addCounterparty(
  accountId: string,
  input: { name: string; code: string; signatory: string; file: File | null },
): Counterparty {
  const counterparty: Counterparty = {
    id: newId("cp"),
    name: input.name.trim(),
    code: input.code.trim(),
    signatory: input.signatory.trim(),
    status: "review",
    contracts: input.file ? [contractFromFile(input.file, [])] : [],
  };
  updateProfile(accountId, (p) => ({ ...p, counterparties: [...p.counterparties, counterparty] }));
  const first = counterparty.contracts[0];
  send<{ counterparty: Counterparty }>(
    accountId,
    "/api/profile/counterparties",
    {
      body: {
        id: counterparty.id,
        name: counterparty.name,
        code: counterparty.code,
        signatory: counterparty.signatory,
        file: first ? first.file : null,
        ...(first ? { contractId: first.id } : {}),
      },
    },
    ({ counterparty: stored }) =>
      adoptInto(accountId, (p) => ({
        ...p,
        counterparties: p.counterparties.map((c) => (c.id === stored.id ? stored : c)),
      })),
  );
  return counterparty;
}

export function addContract(accountId: string, counterpartyId: string, file: File) {
  const made: { contract?: Contract } = {};
  updateProfile(accountId, (p) => ({
    ...p,
    counterparties: p.counterparties.map((c) => {
      if (c.id !== counterpartyId) return c;
      made.contract = contractFromFile(file, c.contracts);
      return { ...c, contracts: [...c.contracts, made.contract] };
    }),
  }));
  const contract = made.contract;
  if (!contract) return;
  send<{ contract: Contract }>(
    accountId,
    `/api/profile/counterparties/${segment(counterpartyId)}/contracts`,
    { body: { id: contract.id, file: contract.file } },
    ({ contract: stored }) =>
      adoptInto(accountId, (p) => ({
        ...p,
        counterparties: p.counterparties.map((c) =>
          c.id === counterpartyId
            ? { ...c, contracts: c.contracts.map((k) => (k.id === stored.id ? stored : k)) }
            : c,
        ),
      })),
  );
}

export function removeContract(accountId: string, counterpartyId: string, contractId: string) {
  const url = fileUrls.get(contractId);
  if (url) {
    URL.revokeObjectURL(url);
    fileUrls.delete(contractId);
  }
  updateProfile(accountId, (p) => ({
    ...p,
    counterparties: p.counterparties.map((c) =>
      c.id === counterpartyId ? { ...c, contracts: c.contracts.filter((k) => k.id !== contractId) } : c,
    ),
  }));
  send(accountId, `/api/profile/counterparties/${segment(counterpartyId)}/contracts/${segment(contractId)}`, {
    method: "DELETE",
  });
}

// --- employees ------------------------------------------------------------

function adoptEmployee(accountId: string, stored: Employee) {
  adoptInto(accountId, (p) => ({
    ...p,
    employees: p.employees.map((e) => (e.id === stored.id ? stored : e)),
  }));
}

export function inviteEmployee(accountId: string, email: string): Employee {
  const employee: Employee = {
    id: newId("emp"),
    status: "invited",
    fullName: "",
    position: "",
    phone: "",
    email: email.trim().toLowerCase(),
    invitedAt: new Date().toISOString(),
  };
  updateProfile(accountId, (p) => ({ ...p, employees: [...p.employees, employee] }));
  send<{ employee: Employee }>(
    accountId,
    "/api/profile/employees",
    { body: { id: employee.id, email: employee.email } },
    ({ employee: stored }) => adoptEmployee(accountId, stored),
  );
  return employee;
}

export function resendInvite(accountId: string, employeeId: string) {
  const invitedAt = new Date().toISOString();
  updateProfile(accountId, (p) => ({
    ...p,
    employees: p.employees.map((e) => (e.id === employeeId ? { ...e, invitedAt } : e)),
  }));
  send<{ employee: Employee }>(
    accountId,
    `/api/profile/employees/${segment(employeeId)}/resend`,
    { method: "POST" },
    ({ employee: stored }) => adoptEmployee(accountId, stored),
  );
}

export function updateEmployee(
  accountId: string,
  employeeId: string,
  patch: Partial<Pick<Employee, "fullName" | "position" | "phone" | "email">>,
) {
  updateProfile(accountId, (p) => ({
    ...p,
    employees: p.employees.map((e) => (e.id === employeeId ? { ...e, ...patch } : e)),
  }));
  send<{ employee: Employee }>(
    accountId,
    `/api/profile/employees/${segment(employeeId)}`,
    { method: "PATCH", body: patch },
    ({ employee: stored }) => adoptEmployee(accountId, stored),
  );
}

export function removeEmployee(accountId: string, employeeId: string) {
  updateProfile(accountId, (p) => ({ ...p, employees: p.employees.filter((e) => e.id !== employeeId) }));
  send(accountId, `/api/profile/employees/${segment(employeeId)}`, { method: "DELETE" });
}
