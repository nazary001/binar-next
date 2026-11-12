import "server-only";
import { seedAssortment } from "./assortment";
import { seedBlog } from "./blog";
import { seedCatalog } from "./catalog";
import { seedMaterials } from "./materials";
import { seedOrders } from "./orders";
import { seedProfile } from "./profile";
import { seedUsers } from "./users";
import type { SeedContext, Seeder } from "./util";

// Every seeder, in dependency order: the demo accounts and their company
// first, then the data that hangs off them. Used by `npm run db:seed` and by
// POST /api/dev/reset (test mode). No next/* import may enter this graph:
// the same code runs under plain Node.
export const SEEDERS: { name: string; run: Seeder }[] = [
  { name: "users", run: seedUsers },
  { name: "catalog", run: seedCatalog },
  { name: "materials", run: seedMaterials },
  { name: "blog", run: seedBlog },
  { name: "orders", run: seedOrders },
  { name: "profile", run: seedProfile },
  { name: "assortment", run: seedAssortment },
];

export async function runSeed(ctx: SeedContext, only?: string[]): Promise<string[]> {
  const unknown = (only ?? []).filter((name) => !SEEDERS.some((s) => s.name === name));
  if (unknown.length) {
    throw new Error(`Unknown seeder: ${unknown.join(", ")}. Known: ${SEEDERS.map((s) => s.name).join(", ")}.`);
  }
  const lines: string[] = [];
  for (const seeder of SEEDERS) {
    if (only?.length && !only.includes(seeder.name)) continue;
    const line = `${seeder.name}: ${await seeder.run(ctx)}`;
    ctx.log(line);
    lines.push(line);
  }
  return lines;
}
