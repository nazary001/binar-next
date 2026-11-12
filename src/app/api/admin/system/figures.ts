import "server-only";
import nextPackage from "next/package.json";
import {
  FREE_CLUSTER_LIMIT_BYTES,
  type SecretsKeyState,
  type SystemCollection,
  type SystemInfo,
} from "@/components/admin/system/types";
import { secretsAvailable } from "@/server/admin/secrets";
import { getDb } from "@/server/db/client";
import { collection } from "@/server/db/collections";
import { isProduction, isTestMode, isVercel, revalidateSecret } from "@/server/env";

// The figures of the panel's system page. Only names, counts and sizes
// leave this file: the database answers also carry the host it runs on
// ($collStats "host"), which is never passed on, and neither is anything
// from the environment beyond whether a value is set.

type StorageStats = { count?: number; size?: number; storageSize?: number; totalIndexSize?: number };

function bytes(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function collectionFigures(name: string): Promise<SystemCollection> {
  const db = await getDb();
  try {
    const [row] = await db
      .collection(name)
      .aggregate<{ storageStats?: StorageStats }>([{ $collStats: { storageStats: {} } }])
      .toArray();
    const stats = row?.storageStats ?? {};
    return {
      name,
      count: bytes(stats.count),
      sizeBytes: bytes(stats.size),
      storageBytes: bytes(stats.storageSize),
      indexBytes: bytes(stats.totalIndexSize),
    };
  } catch {
    // A tier or a role without $collStats still has the count.
    return { name, count: await db.collection(name).estimatedDocumentCount(), sizeBytes: null, storageBytes: null, indexBytes: null };
  }
}

function secretsKeyState(): SecretsKeyState {
  if (process.env.SECRETS_KEY?.trim()) return secretsAvailable() ? "own" : "invalid";
  return secretsAvailable() ? "derived" : "missing";
}

export async function systemInfo(): Promise<SystemInfo> {
  const db = await getDb();
  const now = new Date();
  const stats = await db.command({ dbStats: 1 });
  const names = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((item) => item.name)
    .filter((name) => !name.startsWith("system."))
    .sort();
  const collections = await Promise.all(names.map(collectionFigures));

  const media = await collection("media");
  const folders = await media
    .aggregate<{ _id: string; count: number; bytes: number }>([
      { $group: { _id: "$folder", count: { $sum: 1 }, bytes: { $sum: "$size" } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  const [staffSessions, sessions, staff, auditLog, outbox] = await Promise.all([
    collection("staffSessions"),
    collection("sessions"),
    collection("staff"),
    collection("auditLog"),
    collection("outbox"),
  ]);
  const [liveStaffSessions, expiredStaffSessions, liveSessions, expiredSessions, staffCount, auditCount, outboxPending] =
    await Promise.all([
      staffSessions.countDocuments({ expiresAt: { $gt: now } }),
      staffSessions.countDocuments({ expiresAt: { $lte: now } }),
      sessions.countDocuments({ expiresAt: { $gt: now } }),
      sessions.countDocuments({ expiresAt: { $lte: now } }),
      staff.countDocuments({}),
      auditLog.estimatedDocumentCount(),
      outbox.countDocuments({ sentAt: null }),
    ]);

  const dataBytes = bytes(stats.dataSize);
  const indexBytes = bytes(stats.indexSize);
  return {
    database: {
      name: db.databaseName,
      collections,
      dataBytes,
      storageBytes: bytes(stats.storageSize),
      indexBytes,
      limitBytes: FREE_CLUSTER_LIMIT_BYTES,
      usedBytes: dataBytes + indexBytes,
    },
    media: {
      count: folders.reduce((sum, row) => sum + row.count, 0),
      bytes: folders.reduce((sum, row) => sum + row.bytes, 0),
      byFolder: folders.map((row) => ({ folder: String(row._id ?? ""), count: row.count, bytes: row.bytes })),
    },
    runtime: {
      node: process.version,
      next: nextPackage.version,
      production: isProduction,
      vercel: isVercel,
      testMode: isTestMode(),
      region: process.env.VERCEL_REGION || null,
    },
    security: {
      secretsKey: secretsKeyState(),
      revalidateSecret: Boolean(revalidateSecret()),
    },
    counts: {
      staff: staffCount,
      sessions: liveSessions,
      staffSessions: liveStaffSessions,
      expiredSessions,
      expiredStaffSessions,
      auditLog: auditCount,
      outboxPending,
    },
    generatedAt: now.toISOString(),
  };
}

// Removes the sessions past their expiry right away (the TTL index of both
// collections does it too, within about a minute).
export async function purgeExpiredSessions(): Promise<{ sessions: number; staffSessions: number }> {
  const now = new Date();
  const [sessions, staffSessions] = await Promise.all([collection("sessions"), collection("staffSessions")]);
  const [customers, staff] = await Promise.all([
    sessions.deleteMany({ expiresAt: { $lte: now } }),
    staffSessions.deleteMany({ expiresAt: { $lte: now } }),
  ]);
  return { sessions: customers.deletedCount, staffSessions: staff.deletedCount };
}
