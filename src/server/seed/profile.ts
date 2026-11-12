import "server-only";
import type { CounterpartyDoc, EmployeeDoc } from "../db/collections";
import { seedProfile as demoProfileData } from "./data/profile";
import { DEMO_CLIENT_ID, replaceSeedDocs, type SeedContext } from "./util";

// Seeds the demo company's counterparties (contracts embedded) and
// employees: the mock's ids, values and order (`sort` = the list position).
// The scope is the whole demo company, so a reseed also removes the rows a
// test added and restores the ones it edited or deleted. The invitation
// token is the company's own (clients.inviteToken, seed/users.ts).
export async function seedProfile(ctx: SeedContext): Promise<string> {
  void ctx;
  const data = demoProfileData();
  const now = new Date();

  const counterparties: CounterpartyDoc[] = data.counterparties.map((c, sort) => ({
    _id: c.id,
    clientId: DEMO_CLIENT_ID,
    name: c.name,
    signatory: c.signatory,
    code: c.code,
    status: c.status,
    contracts: c.contracts.map((k) => ({ ...k, file: { ...k.file } })),
    sort,
    createdAt: now,
    updatedAt: now,
    seed: true,
  }));

  // A seeded invitation floats (repos/profile.ts toEmployee): every viewer
  // reads it as just sent, "Запрошення дійсне 48 год", as the mock showed
  // it on a first visit, however long ago the seed ran.
  const employees: EmployeeDoc[] = data.employees.map(({ id, ...fields }, sort) => ({
    _id: id,
    clientId: DEMO_CLIENT_ID,
    ...fields,
    ...(fields.status === "invited" ? { invitedAtFloating: true as const } : {}),
    sort,
    createdAt: now,
    updatedAt: now,
    seed: true,
  }));

  const counterpartiesLine = await replaceSeedDocs("counterparties", counterparties, { clientId: DEMO_CLIENT_ID });
  const employeesLine = await replaceSeedDocs("employees", employees, { clientId: DEMO_CLIENT_ID });
  return `${counterpartiesLine}; ${employeesLine}`;
}
