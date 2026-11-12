// npm run admin:create -- --email <e-mail> --name "Name Surname" [--role owner]
//   [--password <password>] [--test]
// npm run admin:create:dev -- ...   (the same against the development database)
// npm run admin:create -- --roles   (prints the role ids)
// npm run admin:create -- --reset --email <e-mail> [--password <password>]
//   (a new password for an account that exists, see below)
//
// Creates a member of staff who may sign in at /admin (collection `staff`).
// The first account of a database should be an owner (the default role).
// Without --password a strong one is generated and printed ONCE, and the
// panel asks the person to replace it at the first sign-in. The environment
// variable ADMIN_CREATE_PASSWORD works like --password without putting the
// value on the command line (it stays out of the shell history).
// The built-in roles are written first, so the script also works on a
// database that has never seen the panel.
//
// A generated password opens the account for GENERATED_PASSWORD_TTL_HOURS
// only. --reset is the way back in for somebody whose password ran out (or
// was lost) when nobody else can press "reset password" in the panel: the
// account gets a new password that has to be replaced at the next sign-in,
// and its open sessions are ended.
import { OWNER_ROLE_ID } from "@/components/admin/lib/permissions";
import { GENERATED_PASSWORD_TTL_HOURS } from "@/components/admin/staff/types";
import {
  STAFF_PASSWORD_MIN,
  createStaff,
  ensureSystemRoles,
  findStaffByEmail,
  generatedStaffPassword,
  isStaffEmail,
  normalizeStaffEmail,
  setStaffPassword,
} from "@/server/admin/staff";
import { PASSWORD_MAX_LENGTH } from "@/server/auth/password";
import { closeClient, getDb } from "@/server/db/client";
import { collection } from "@/server/db/collections";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? "" : value.trim();
}

class UsageError extends Error {}

function fail(message: string): never {
  throw new UsageError(message);
}

async function main() {
  const db = await getDb();
  await ensureSystemRoles();

  if (process.argv.includes("--roles")) {
    const roles = await (await collection("staffRoles")).find({}).sort({ _id: 1 }).toArray();
    for (const role of roles) console.log(`${role._id.padEnd(12)} ${role.name}`);
    return;
  }

  const email = normalizeStaffEmail(arg("email") ?? "");
  if (!email) fail("--email is required");
  if (!isStaffEmail(email)) fail(`--email "${email}" is not a valid e-mail`);

  const given = arg("password") ?? (process.env.ADMIN_CREATE_PASSWORD || undefined);
  if (given !== undefined && (given.length < STAFF_PASSWORD_MIN || given.length > PASSWORD_MAX_LENGTH)) {
    fail(`the password must be ${STAFF_PASSWORD_MIN} to ${PASSWORD_MAX_LENGTH} characters long`);
  }
  const password = given || generatedStaffPassword();
  const holds = `it opens the account for ${GENERATED_PASSWORD_TTL_HOURS} hours and has to be replaced at the first sign-in`;

  if (process.argv.includes("--reset")) {
    const staff = await findStaffByEmail(email);
    if (!staff) fail(`no member of staff with ${email}; nothing was changed`);
    await setStaffPassword(staff._id, password, true);
    const ended = await (await collection("staffSessions")).deleteMany({ staffId: staff._id });
    console.log(`New password for ${email} in "${db.databaseName}" (${ended.deletedCount} open session(s) ended)`);
    if (!given) console.log(`  password (shown once, not stored anywhere in plain text): ${password}`);
    console.log(`  ${holds}`);
    return;
  }

  const name = (arg("name") ?? "").replace(/\s+/g, " ");
  if (!name) fail('--name is required ("Name Surname")');

  const roleId = arg("role") || OWNER_ROLE_ID;

  const created = await createStaff({
    email,
    name,
    roleId,
    password,
    // A password somebody else typed or a generated one has to be replaced.
    mustChangePassword: !process.argv.includes("--keep-password"),
    createdBy: null,
    ...(process.argv.includes("--test") ? { test: true as const } : {}),
  });
  if (!created.ok) {
    if (created.error === "exists") fail(`a member of staff with ${email} already exists; nothing was created`);
    if (created.error === "role") fail(`--role "${roleId}": no such role (see --roles)`);
    fail(`could not create the account: ${created.error}`);
  }

  console.log(`Created staff account ${created.staff._id} in "${db.databaseName}"`);
  console.log(`  signs in at /admin with: ${email}`);
  console.log(`  role: ${roleId}`);
  if (!given) console.log(`  password (shown once, not stored anywhere in plain text): ${password}`);
  if (!process.argv.includes("--keep-password")) console.log(`  ${holds}`);
}

main()
  .catch((error) => {
    if (error instanceof UsageError) console.error(`admin:create: ${error.message}`);
    else console.error("admin:create failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeClient());
