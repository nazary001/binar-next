// Mutations of the profile lists (store.ts). Each one is what a CRM call
// will do later; for now they patch the browser record of the account.
"use client";

import {
  fileFormat,
  mockContractNumber,
  newId,
  type Contract,
  type Counterparty,
  type Employee,
} from "./data";
import { updateProfile } from "./store";

// The uploaded scans themselves are not kept in localStorage (a 5-MB PDF
// would not fit): this session keeps an object URL per contract so the
// eye / «Завантажити» open the real file until the tab closes; seeded
// and older contracts open the placeholder document.
const fileUrls = new Map<string, string>();
const PLACEHOLDER_PDF = "/figma-export/materials/placeholder.pdf";

export function contractFileUrl(contractId: string): string {
  return fileUrls.get(contractId) ?? PLACEHOLDER_PDF;
}

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
  return counterparty;
}

export function addContract(accountId: string, counterpartyId: string, file: File) {
  updateProfile(accountId, (p) => ({
    ...p,
    counterparties: p.counterparties.map((c) =>
      c.id === counterpartyId ? { ...c, contracts: [...c.contracts, contractFromFile(file, c.contracts)] } : c,
    ),
  }));
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
  return employee;
}

export function resendInvite(accountId: string, employeeId: string) {
  const invitedAt = new Date().toISOString();
  updateProfile(accountId, (p) => ({
    ...p,
    employees: p.employees.map((e) => (e.id === employeeId ? { ...e, invitedAt } : e)),
  }));
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
}

export function removeEmployee(accountId: string, employeeId: string) {
  updateProfile(accountId, (p) => ({ ...p, employees: p.employees.filter((e) => e.id !== employeeId) }));
}
