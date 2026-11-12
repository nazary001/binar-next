import "server-only";
import type { AssortmentDoc } from "../db/collections";
import { DEFAULT_LINES } from "./data/assortment";
import { DEMO_B2B_ID, replaceSeedDocs, type SeedContext } from "./util";

// Seeds the demo partner's saved assortment (the mock's 48 lines, in
// order). A reseed puts back the lines a test removed and the quantities it
// changed. Other buyers' assortments are never touched (the default scope
// is the documents the seed wrote).
export async function seedAssortment(ctx: SeedContext): Promise<string> {
  void ctx;
  const doc: AssortmentDoc = {
    _id: DEMO_B2B_ID,
    lines: DEFAULT_LINES.map((line) => ({ ...line })),
    updatedAt: new Date(),
  };
  return replaceSeedDocs("assortments", [doc]);
}
