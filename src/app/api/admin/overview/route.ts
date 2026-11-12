import {
  DEFAULT_OVERVIEW_PERIOD,
  OVERVIEW_PERIODS,
  type OverviewResponse,
} from "@/components/admin/overview/types";
import { HttpError, adminHandler, json } from "@/server/admin/http";
import { oneOf } from "@/server/admin/list";
import { overviewData } from "@/server/admin/repos/overview";

// GET /api/admin/overview?period=7d|30d|90d|12m|all - every figure of the
// overview page in one answer: { ok: true, overview: OverviewData }
// (src/components/admin/overview/types.ts). Without `period` the default
// one is used; an unknown value is a 400, not a silent fallback, so a
// broken link shows up instead of showing the wrong period. Sections the
// role may not see are left out by the repo.
export const GET = adminHandler("dashboard.view", async ({ staff, url }) => {
  const asked = url.searchParams.get("period");
  const period = asked ? oneOf(url.searchParams, "period", OVERVIEW_PERIODS) : DEFAULT_OVERVIEW_PERIOD;
  if (!period) throw new HttpError(400, "bad-request");
  const overview = await overviewData(staff, period);
  return json({ ok: true, overview } satisfies OverviewResponse);
});
