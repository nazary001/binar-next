import "server-only";
import { randomBytes } from "node:crypto";
import { collection, type ClientDoc, type ContractDoc, type CounterpartyDoc } from "../../../db/collections";
import { newId } from "../../../ids";
import { newInviteToken } from "../../../repos/clients";
import { kyivToday } from "../../../time";
import type { ClientInput, ContractInput, CounterpartyInput } from "../contract";
import { failed, guarded, mapPool, ok, same, type ApplyResult, type Outcome } from "../batch";

// PUT /clients: the B2B hierarchy of BAS. A client (holding) -> its
// counterparties (legal entities with an EDRPOU) -> their contracts
// (number, discount, credit limit, debt).
//
// - The company is upserted by its GUID. A new one gets the defaults a
//   company created on the site gets (repos/clients.ts createClient: an
//   invitation token, no credit lines, no discount); it is built here
//   rather than through createClient so it is inserted together with its
//   GUID in one write, and the unique index on externalId keeps two
//   parallel batches from creating it twice.
// - Counterparties are upserted by GUID inside the company, contracts by
//   GUID inside their counterparty. Site-only rows (a counterparty a
//   partner added in the cabinet, a contract under review) stay. With
//   mode "full" the item carries the company's complete lists, and the
//   counterparties / contracts with a GUID it no longer names are switched
//   off ("inactive" / "completed").
// - After each company, what the cabinet reads today is recomputed:
//   creditLimits (one row per counterparty, by NAME, with the sum of its
//   active contracts' limits) and discountPercent (the discount of the
//   first active contract in counterparty order; kept when there is none).

const CONCURRENCY = 3;

const shortId = (prefix: string) => `${prefix}-${randomBytes(4).toString("hex")}`;

const contractActive = (contract: ContractDoc) => contract.status === "active" && contract.isActive !== false;

type Context = {
  priceTypeIdOf: Map<string, string>;
  groups: Set<string>;
  full: boolean;
};

// The ERP part of a contract as stored.
function contractFields(input: ContractInput, context: Context): Omit<ContractDoc, "id" | "file" | "date"> {
  return {
    number: input.number,
    status: input.isActive ? "active" : "completed",
    externalId: input.externalId,
    discountPercent: input.discountPercent,
    creditLimit: input.creditLimit,
    currentDebt: input.currentDebt,
    overdueDebt: input.overdueDebt,
    oldestDebtDays: input.oldestDebtDays,
    paymentTerms: input.paymentTerms ?? "",
    paymentDays: input.paymentDays ?? null,
    priceTypeId: input.priceTypeExternalId ? (context.priceTypeIdOf.get(input.priceTypeExternalId) ?? null) : null,
    isActive: input.isActive,
  };
}

function mergeContracts(stored: ContractDoc[], inputs: ContractInput[], context: Context): ContractDoc[] {
  const named = new Set(inputs.map((input) => input.externalId));
  const result: ContractDoc[] = stored.map((contract) => {
    // Full mode: a contract of BAS that BAS no longer lists is closed.
    if (context.full && contract.externalId && !named.has(contract.externalId) && contractActive(contract)) {
      return { ...contract, status: "completed", isActive: false };
    }
    return contract;
  });
  for (const input of inputs) {
    const at = result.findIndex((contract) => contract.externalId === input.externalId);
    const fields = contractFields(input, context);
    if (at >= 0) {
      const current = result[at];
      result[at] = { ...current, ...fields, date: input.date ? input.date.day : current.date };
    } else {
      result.push({
        id: shortId("ct"),
        date: input.date ? input.date.day : kyivToday(),
        file: { name: "", size: 0, format: "" },
        ...fields,
      });
    }
  }
  return result;
}

type CounterpartyWrite = { doc: CounterpartyDoc; isNew: boolean; changed: boolean };

function counterpartyWrites(
  clientId: string,
  stored: CounterpartyDoc[],
  inputs: CounterpartyInput[],
  context: Context,
  now: Date,
): CounterpartyWrite[] {
  const named = new Set(inputs.map((input) => input.externalId));
  let nextSort = stored.reduce((max, cp) => Math.max(max, typeof cp.sort === "number" ? cp.sort : -1), -1) + 1;
  const writes: CounterpartyWrite[] = stored.map((cp) => {
    // Full mode: a counterparty of BAS that BAS no longer lists is switched
    // off, and so are its contracts (they are not listed either).
    if (context.full && cp.externalId && !named.has(cp.externalId)) {
      const next: CounterpartyDoc = {
        ...cp,
        status: cp.status === "active" ? "inactive" : cp.status,
        contracts: mergeContracts(cp.contracts, [], context),
      };
      return { doc: next, isNew: false, changed: !same(stripStamps(cp), stripStamps(next)) };
    }
    return { doc: cp, isNew: false, changed: false };
  });
  for (const input of inputs) {
    const at = writes.findIndex((write) => write.doc.externalId === input.externalId);
    const current = at >= 0 ? writes[at].doc : null;
    const next: CounterpartyDoc = {
      ...(current ?? {
        _id: shortId("cp"),
        clientId,
        sort: nextSort++,
        createdAt: now,
        updatedAt: now,
      }),
      clientId,
      name: input.name,
      signatory: input.signatory ?? current?.signatory ?? "",
      code: input.edrpou,
      status: input.isActive === false ? "inactive" : "active",
      externalId: input.externalId,
      contracts: mergeContracts(current?.contracts ?? [], input.contracts ?? [], context),
    } as CounterpartyDoc;
    if (at >= 0) {
      writes[at] = { doc: next, isNew: false, changed: writes[at].changed || !same(stripStamps(current!), stripStamps(next)) };
    } else {
      writes.push({ doc: next, isNew: true, changed: true });
    }
  }
  return writes;
}

function stripStamps(cp: CounterpartyDoc): Omit<CounterpartyDoc, "createdAt" | "updatedAt" | "seed"> {
  const { createdAt: _c, updatedAt: _u, seed: _s, ...rest } = cp;
  void _c;
  void _u;
  void _s;
  return rest;
}

// What the cabinet reads from the company document.
function cabinetTerms(counterparties: CounterpartyDoc[]): {
  creditLimits: ClientDoc["creditLimits"];
  discountPercent: number | null;
} {
  const ordered = [...counterparties].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const creditLimits = ordered.map((cp) => ({
    counterparty: cp.name,
    limit:
      Math.round(cp.contracts.filter(contractActive).reduce((total, c) => total + (c.creditLimit ?? 0), 0) * 100) / 100,
  }));
  const first = ordered
    .flatMap((cp) => cp.contracts)
    .find((contract) => contractActive(contract) && typeof contract.discountPercent === "number");
  return { creditLimits, discountPercent: first ? (first.discountPercent as number) : null };
}

async function applyClient(item: ClientInput, context: Context): Promise<Outcome> {
  if (item.groupId && !context.groups.has(item.groupId)) return failed(`unknown-group: ${item.groupId}`);
  for (const cp of item.counterparties) {
    for (const contract of cp.contracts ?? []) {
      if (contract.priceTypeExternalId && !context.priceTypeIdOf.has(contract.priceTypeExternalId)) {
        return failed(`unknown-price-type: ${contract.priceTypeExternalId}`);
      }
    }
  }

  const clients = await collection("clients");
  const counterparties = await collection("counterparties");
  const company = await clients.findOne({ externalId: item.externalId });
  const cpExternalIds = item.counterparties.map((cp) => cp.externalId);
  const stored = await counterparties
    .find(
      company
        ? { $or: [{ clientId: company._id }, { externalId: { $in: cpExternalIds } }] }
        : { externalId: { $in: cpExternalIds } },
    )
    .toArray();
  const elsewhere = stored.find((cp) => cp.clientId !== company?._id);
  if (elsewhere) return failed(`counterparty-elsewhere: ${elsewhere.externalId} belongs to another client`);

  const now = new Date();
  const clientId = company?._id ?? newId("client");
  const writes = counterpartyWrites(clientId, stored, item.counterparties, context, now);
  const terms = cabinetTerms(writes.map((write) => write.doc));

  const fields = {
    name: item.name,
    ...(item.edrpou !== undefined ? { edrpou: item.edrpou } : {}),
    ...(item.region !== undefined ? { region: item.region } : {}),
    ...(item.city !== undefined ? { city: item.city } : {}),
    ...(item.isActive !== undefined ? { isActive: item.isActive } : {}),
    ...(item.groupId !== undefined ? { groupId: item.groupId } : {}),
    creditLimits: terms.creditLimits,
    ...(terms.discountPercent !== null ? { discountPercent: terms.discountPercent } : {}),
  };

  if (!company) {
    const doc: ClientDoc = {
      _id: clientId,
      name: item.name,
      edrpou: item.edrpou ?? "",
      region: item.region ?? "",
      city: item.city ?? "",
      inviteToken: newInviteToken(),
      discountPercent: terms.discountPercent ?? 0,
      creditLimits: terms.creditLimits,
      demoToday: null,
      createdAt: now,
      updatedAt: now,
      externalId: item.externalId,
      isActive: item.isActive ?? true,
      ...(item.groupId !== undefined ? { groupId: item.groupId } : {}),
      erpSyncedAt: now,
    };
    await clients.insertOne(doc);
  }

  const cpChanged = writes.filter((write) => write.changed);
  for (const write of cpChanged) {
    if (write.isNew) {
      await counterparties.insertOne({ ...write.doc, createdAt: now, updatedAt: now });
    } else {
      const { _id, createdAt: _created, seed: _seed, ...rest } = write.doc;
      void _created;
      void _seed;
      await counterparties.updateOne({ _id }, { $set: { ...rest, updatedAt: now }, $unset: { seed: "" } });
    }
  }
  if (!company) return ok("created");

  const current = Object.fromEntries(Object.keys(fields).map((key) => [key, (company as Record<string, unknown>)[key]]));
  const companyChanged = !same(current, fields);
  if (!companyChanged && cpChanged.length === 0) return ok("unchanged");
  await clients.updateOne(
    { _id: company._id },
    { $set: { ...fields, erpSyncedAt: now, updatedAt: now }, $unset: { seed: "" } },
  );
  return ok("updated");
}

export async function applyClients(items: ClientInput[], mode: "delta" | "full" | undefined): Promise<ApplyResult> {
  const priceTypeIds = [
    ...new Set(
      items.flatMap((item) =>
        item.counterparties.flatMap((cp) =>
          (cp.contracts ?? []).flatMap((contract) => (contract.priceTypeExternalId ? [contract.priceTypeExternalId] : [])),
        ),
      ),
    ),
  ];
  const groupIds = [...new Set(items.flatMap((item) => (item.groupId ? [item.groupId] : [])))];
  const [types, groups] = await Promise.all([
    priceTypeIds.length
      ? (await collection("priceTypes")).find({ externalId: { $in: priceTypeIds } }, { projection: { externalId: 1 } }).toArray()
      : [],
    groupIds.length
      ? (await collection("customerGroups")).find({ _id: { $in: groupIds } }, { projection: { _id: 1 } }).toArray()
      : [],
  ]);
  const context: Context = {
    priceTypeIdOf: new Map(types.flatMap((type) => (type.externalId ? [[type.externalId, type._id] as const] : []))),
    groups: new Set(groups.map((group) => group._id)),
    full: mode === "full",
  };
  const outcomes = await mapPool(items, CONCURRENCY, (item) => guarded("client", () => applyClient(item, context)));
  return { outcomes };
}

// The keys of the records a company item touches (the duplicate rule of
// the batch): the company and every counterparty and contract it names.
export function clientKeys(item: ClientInput): string[] {
  return [
    `c:${item.externalId}`,
    ...item.counterparties.flatMap((cp) => [
      `cp:${cp.externalId}`,
      ...(cp.contracts ?? []).map((contract) => `ct:${contract.externalId}`),
    ]),
  ];
}
