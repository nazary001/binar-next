import "server-only";
import type { Filter } from "mongodb";
import {
  ACTION_PREFIX_LABELS,
  ENTITY_HREFS,
  ENTITY_TYPE_LABELS,
  JOURNAL_ACTION_GROUPS,
  JOURNAL_ENTITY_LIMIT,
  JOURNAL_GROUP_KEYS,
  SETTINGS_HREFS,
  type JournalActionGroup,
  type JournalActorFacet,
  type JournalActorKind,
  type JournalEntityTypeFacet,
  type JournalFacets,
  type JournalPrefixFacet,
  type JournalRow,
} from "@/components/admin/audit/types";
import { collection, type AuditLogDoc } from "../../db/collections";
import { contains, dayParam, listQuery, oneOf, paginate, type Page } from "../list";

// Reading the journal of actions (collection `audit_log`; the lines are
// written by admin/audit.ts). Also home of two small query helpers the
// other repos of this area share: Kyiv day ranges and string prefix ranges.

// --- shared query helpers -----------------------------------------------------

const KYIV_OFFSET = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Kyiv", timeZoneName: "longOffset" });

// The offset of Kyiv from UTC at a moment, in ms ("GMT+02:00" -> 7 200 000).
function kyivOffsetMs(at: Date): number {
  const name = KYIV_OFFSET.formatToParts(at).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return (match[1] === "+" ? 1 : -1) * minutes * 60_000;
}

function parseDay(day: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  // "2026-02-31" rolls over into March: not a real day.
  return new Date(utc).toISOString().slice(0, 10) === day ? utc : null;
}

// The moment a Kyiv day ("YYYY-MM-DD") begins. Kyiv changes its clock at
// 03:00/04:00 local time (01:00 UTC), never around midnight, so the offset
// at 00:00 UTC of that date is the offset of its local midnight.
export function kyivDayStart(day: string): Date | null {
  const utc = parseDay(day);
  return utc === null ? null : new Date(utc - kyivOffsetMs(new Date(utc)));
}

// A filter on a date field for the Kyiv days `from` .. `to`, both
// inclusive; undefined when neither is a valid day.
export function kyivDayRange(from?: string, to?: string): { $gte?: Date; $lt?: Date } | undefined {
  const range: { $gte?: Date; $lt?: Date } = {};
  const start = from ? kyivDayStart(from) : null;
  if (start) range.$gte = start;
  const last = to ? parseDay(to) : null;
  if (last !== null) {
    const next = new Date(last + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const end = kyivDayStart(next);
    if (end) range.$lt = end;
  }
  return range.$gte || range.$lt ? range : undefined;
}

// Every string that starts with `text`, as a range instead of a regular
// expression: case-sensitive and served by an index on the field (the _id
// of orders, `action` of the journal). "order." -> [ "order.", "order/" ).
export function prefixRange(text: string): { $gte: string; $lt: string } {
  const last = text.charCodeAt(text.length - 1);
  return { $gte: text, $lt: text.slice(0, -1) + String.fromCharCode(last + 1) };
}

// --- rows -------------------------------------------------------------------

const ACTOR_KINDS: readonly JournalActorKind[] = ["staff", "system", "integration", "customer"];

export function entityHref(type: string, id: string): string | null {
  // A settings line opens the page or tab where its group is edited.
  if (type === "settings" && Object.hasOwn(SETTINGS_HREFS, id)) return SETTINGS_HREFS[id];
  const pattern = Object.hasOwn(ENTITY_HREFS, type) ? ENTITY_HREFS[type] : undefined;
  return pattern ? pattern.replace("{id}", encodeURIComponent(id)) : null;
}

export function toJournalRow(doc: AuditLogDoc): JournalRow {
  const kind = (ACTOR_KINDS as readonly string[]).includes(doc.actor?.kind) ? doc.actor.kind : "staff";
  return {
    id: doc._id,
    at: doc.at.toISOString(),
    actor: { id: doc.actor?.id ?? "", name: doc.actor?.name ?? "", kind },
    action: doc.action,
    entity: doc.entity
      ? { type: doc.entity.type, id: doc.entity.id, label: doc.entity.label, href: entityHref(doc.entity.type, doc.entity.id) }
      : null,
    summary: doc.summary,
    meta: doc.meta ?? {},
    ip: doc.ip ?? null,
  };
}

// --- list -------------------------------------------------------------------

// Shapes the filters must have before they reach the query.
const ACTION = /^[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)*\.?$/;
// Lower case, digits, "-" and "_" (blog_post, material_file).
export const ENTITY_TYPE = /^[a-z][a-z0-9_-]{0,39}$/;
// Entity and actor ids: business ids, UUIDs, settings keys, "<kind>:<id>".
export const ENTITY_ID = /^[A-Za-z0-9][A-Za-z0-9_.:@-]{0,127}$/;

function param(params: URLSearchParams, name: string, shape: RegExp, max: number): string | undefined {
  const value = params.get(name)?.trim();
  return value && value.length <= max && shape.test(value) ? value : undefined;
}

// The filter of one action group: any of its prefixes or exact actions,
// minus the actions another group owns (served by the action_at index).
function groupClause(group: JournalActionGroup): Filter<AuditLogDoc> {
  const any: Filter<AuditLogDoc>[] = group.prefixes.map((prefix) => ({ action: prefixRange(prefix) }));
  if (group.actions.length > 0) any.push({ action: { $in: group.actions } });
  const clause: Filter<AuditLogDoc> = any.length === 1 ? any[0] : { $or: any };
  return group.exclude.length > 0 ? { $and: [clause, { action: { $nin: group.exclude } }] } : clause;
}

export async function listJournal(url: URL): Promise<Page<JournalRow>> {
  const query = listQuery(url, { sortable: ["at"], defaultSort: "-at", defaultLimit: 50, maxLimit: 100 });
  const { params } = query;
  const clauses: Filter<AuditLogDoc>[] = [];

  const actorId = param(params, "actorId", ENTITY_ID, 128);
  if (actorId) clauses.push({ "actor.id": actorId });
  const actorKind = oneOf(params, "actorKind", ACTOR_KINDS);
  if (actorKind) clauses.push({ "actor.kind": actorKind });

  // "order." = every action of the prefix; "order.status" = exactly that.
  const action = param(params, "action", ACTION, 80);
  if (action) clauses.push({ action: action.endsWith(".") ? prefixRange(action) : action });
  const groupKey = oneOf(params, "group", JOURNAL_GROUP_KEYS);
  const group = groupKey ? JOURNAL_ACTION_GROUPS.find((item) => item.key === groupKey) : undefined;
  if (group) clauses.push(groupClause(group));

  const entityType = param(params, "entityType", ENTITY_TYPE, 40);
  if (entityType) clauses.push({ "entity.type": entityType });
  const entityId = param(params, "entityId", ENTITY_ID, 128);
  if (entityId) clauses.push({ "entity.id": entityId });

  const at = kyivDayRange(dayParam(params, "from"), dayParam(params, "to"));
  if (at) clauses.push({ at });

  if (query.q) clauses.push({ summary: contains(query.q) });

  const filter: Filter<AuditLogDoc> = clauses.length ? { $and: clauses } : {};
  return paginate(await collection("auditLog"), filter, query, { map: toJournalRow });
}

// The last lines about one record, newest first (index entity_at).
export async function entityHistory(type: string, id: string, limit = JOURNAL_ENTITY_LIMIT): Promise<JournalRow[]> {
  const docs = await (await collection("auditLog"))
    .find({ "entity.type": type, "entity.id": id })
    .sort({ at: -1, _id: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toJournalRow);
}

// --- facets -----------------------------------------------------------------

function labelOf(labels: Record<string, string>, key: string): string {
  return Object.hasOwn(labels, key) ? labels[key] : key;
}

export async function journalFacets(): Promise<Omit<JournalFacets, "ok">> {
  const log = await collection("auditLog");
  const [actorDocs, actionValues, typeValues] = await Promise.all([
    // The latest name of every actor (index actor_at serves the sort).
    log
      .aggregate<{ _id: string; name: string; kind: string }>([
        { $sort: { "actor.id": 1, at: -1 } },
        { $group: { _id: "$actor.id", name: { $first: "$actor.name" }, kind: { $first: "$actor.kind" } } },
        { $limit: 500 },
      ])
      .toArray(),
    log.distinct("action"),
    log.distinct("entity.type"),
  ]);

  const actors: JournalActorFacet[] = actorDocs
    .filter((doc) => typeof doc._id === "string" && doc._id)
    .map((doc) => ({
      id: doc._id,
      name: typeof doc.name === "string" && doc.name ? doc.name : doc._id,
      kind: (ACTOR_KINDS as readonly string[]).includes(doc.kind) ? (doc.kind as JournalActorKind) : "staff",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "uk"));

  const actions = actionValues.filter((value): value is string => typeof value === "string").sort();
  const prefixes = [...new Set(actions.map((action) => action.split(".")[0]).filter(Boolean))].sort();
  const actionPrefixes: JournalPrefixFacet[] = prefixes.map((prefix) => ({
    prefix: `${prefix}.`,
    label: labelOf(ACTION_PREFIX_LABELS, prefix),
  }));

  const entityTypes: JournalEntityTypeFacet[] = typeValues
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .sort()
    .map((type) => ({ type, label: labelOf(ENTITY_TYPE_LABELS, type) }));

  return { actors, actionPrefixes, actions, entityTypes };
}
