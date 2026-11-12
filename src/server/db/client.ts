import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { MongoClient, type Db, type MongoClientOptions } from "mongodb";
import { isVercel, mongoDbName, mongoUri } from "../env";

// One MongoClient (one connection pool) per server process.
//
// The connect promise is cached on globalThis: in `next dev` Turbopack
// re-evaluates this module on every save, and without the cache each save
// would open a new pool (the free cluster allows 500 connections in total).
// A failed connect clears the cache so the next request tries again.
type MongoCache = { ready?: Promise<MongoClient> };
const globalCache = globalThis as typeof globalThis & { __binarMongo?: MongoCache };
const cache: MongoCache = (globalCache.__binarMongo ??= {});

function options(): MongoClientOptions {
  return {
    appName: "binar-web",
    maxPoolSize: 10,
    minPoolSize: 0,
    // On Vercel idle sockets are closed quickly and attachDatabasePool keeps
    // the function instance alive until they are, so a suspended instance
    // never leaves connections behind. Elsewhere (local dev, scripts) a
    // longer idle time avoids paying the TLS handshake after every pause.
    maxIdleTimeMS: isVercel ? 5_000 : 120_000,
    serverSelectionTimeoutMS: 8_000,
  };
}

export function getClient(): Promise<MongoClient> {
  if (!cache.ready) {
    const client = new MongoClient(mongoUri(), options());
    if (isVercel) attachDatabasePool(client);
    cache.ready = client.connect().catch((error: unknown) => {
      cache.ready = undefined;
      throw error;
    });
  }
  return cache.ready;
}

export async function getDb(): Promise<Db> {
  return (await getClient()).db(mongoDbName());
}

// For scripts: closes the pool so the process can exit.
export async function closeClient(): Promise<void> {
  const ready = cache.ready;
  cache.ready = undefined;
  if (ready) await (await ready).close().catch(() => {});
}
