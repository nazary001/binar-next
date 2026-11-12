import "server-only";
import { collection, type CustomerGroupDoc } from "../db/collections";
import { ensureSystemRoles } from "./staff";

// What the panel needs to exist in a database before anybody opens it: the
// built-in staff roles and the two system buyer groups. Idempotent; called
// by `npm run db:setup` (and its :dev twin). No next/* import.

export const GUESTS_GROUP_ID = "guests";
export const REGISTERED_GROUP_ID = "registered";

const SYSTEM_GROUPS: Pick<CustomerGroupDoc, "_id" | "name" | "description">[] = [
  {
    _id: GUESTS_GROUP_ID,
    name: "Гості",
    description: "Відвідувачі без акаунта: бачать роздрібні ціни.",
  },
  {
    _id: REGISTERED_GROUP_ID,
    name: "Зареєстровані покупці",
    description: "Усі, хто має акаунт і не належить до іншої групи.",
  },
];

export async function ensureAdminDefaults(): Promise<string[]> {
  const lines: string[] = [];
  const roles = await ensureSystemRoles();
  lines.push(`staff roles: ${roles} written`);

  const groups = await collection("customerGroups");
  const now = new Date();
  let created = 0;
  for (const group of SYSTEM_GROUPS) {
    const result = await groups.updateOne(
      { _id: group._id },
      {
        $setOnInsert: {
          name: group.name,
          description: group.description,
          priceTypeId: null,
          showStock: false,
          paymentMethods: [],
          deliveryMethods: [],
          hiddenCategories: [],
          system: true as const,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
    created += result.upsertedCount;
  }
  lines.push(`buyer groups: ${created} created`);
  return lines;
}
