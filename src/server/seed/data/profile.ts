import "server-only";
import type { ContractFile, ProfileData } from "@/components/platform/profile/data";

// The demo partner's profile lists, exactly as the browser mock shipped
// them (src/components/platform/profile/data.ts seedProfile before the
// database). Read by src/server/seed/profile.ts only.
//
// The rows are verbatim from the frames: the table of 4868:30958 (texts
// from the screenshot - the design context returns "Cell") and the cards
// of 4868:31376. «ТОВ “Флексмакс”» has the documents glyph and «+ 2», i.e.
// three contracts - the three tiles of «Кілька договорів» 4868:31197 (Діє /
// Завершений / Діє, files dogovir_289-03 / 932-06 / 245-01.pdf; the master
// repeats «№289-03» on every tile, so the numbers here follow the file
// names and the table's «№123-04»). File meta «19.09.2025 · 0.9 МБ · PDF» on
// every tile.
//
// The invitation's invitedAt was "the moment the browser first wrote the
// record". The seed stores the moment it runs and flags the row as
// floating (seed/profile.ts), so the profile answer stamps the current time
// and every viewer reads "Запрошення дійсне 48 год" like a first visit did,
// however long ago the seed ran. The invitation token is the company's
// (clients.inviteToken, seeded by seed/users.ts).
const pdf = (name: string): ContractFile => ({ name, size: 943_718, format: "PDF" });

export function seedProfile(): ProfileData {
  return {
    counterparties: [
      {
        id: "cp-mirotel",
        name: "ТОВ “Міротель”",
        signatory: "Іваненко С.П",
        code: "412356789",
        status: "active",
        contracts: [
          { id: "ct-432-01", number: "№432-01", date: "2025-09-19", status: "active", file: pdf("dogovir_432-01.pdf") },
        ],
      },
      {
        id: "cp-mirotel-west",
        name: "ТОВ “Міротель Захід”",
        signatory: "Добрій Л.М",
        code: "189977289",
        status: "inactive",
        contracts: [
          { id: "ct-289-03", number: "№289-03", date: "2025-09-19", status: "active", file: pdf("dogovir_289-03.pdf") },
        ],
      },
      {
        id: "cp-flexmax",
        name: "ТОВ “Флексмакс”",
        signatory: "ТОВ “Міротель”",
        code: "412356789",
        status: "active",
        contracts: [
          { id: "ct-123-04", number: "№123-04", date: "2025-09-19", status: "active", file: pdf("dogovir_123-04.pdf") },
          { id: "ct-932-06", number: "№932-06", date: "2025-09-19", status: "completed", file: pdf("dogovir_932-06.pdf") },
          { id: "ct-245-01", number: "№245-01", date: "2025-09-19", status: "active", file: pdf("dogovir_245-01.pdf") },
        ],
      },
    ],
    employees: [
      {
        id: "emp-levchenko",
        status: "active",
        fullName: "Марина Левченко",
        position: "Закупівельник",
        phone: "0671234567",
        email: "sales@binar2000.com",
      },
      {
        id: "emp-invite-sales",
        status: "invited",
        fullName: "",
        position: "",
        phone: "",
        email: "sales@binar2000.com",
        invitedAt: new Date().toISOString(),
      },
      {
        id: "emp-melnyk",
        status: "active",
        fullName: "Наталія Мельник",
        position: "Закупівельник",
        phone: "0671234567",
        email: "sales@binar2000.com",
      },
      {
        id: "emp-bondarenko",
        status: "active",
        fullName: "Ірина Бондаренко",
        position: "Закупівельник",
        phone: "0671234567",
        email: "sales@binar2000.com",
      },
    ],
    inviteToken: "a8f3k2",
  };
}
