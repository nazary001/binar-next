// npm run user:create -- --type b2b|b2c --login <phone or e-mail> --name "Surname Name"
//   [--email <e-mail>] [--phone <phone>] [--role <owner|admin|purchasing|accountant|other>]
//   [--position <text>] [--password <password>]
//   b2b only: --company "<name>" [--edrpou <8 digits>] [--region <region>] [--city <city>]
//             [--discount <percent, default 8.4>]
//         or: --client <company id>   (another buyer of an EXISTING company;
//             no company is created, the company flags above are not used)
//
// Creates a real account in the `binar` database:
// - b2c: a retail customer, as the site's sign-up would make it;
// - b2b: a partner company document plus its first user (role b2b_admin).
//   The account is not "welcomed" yet, so the welcome modal (logo upload)
//   shows on the first sign-in.
// The login and the optional --email become sign-in identifiers; --phone
// does too when the login is an e-mail. With a phone login, --phone is only
// the contact number shown in the profile (the login already is the
// account's phone). An identifier that already opens an account is refused.
// Without --password a strong one is generated and printed ONCE; pass
// --password only from a private shell (it stays in the shell history).
// The environment variable USER_CREATE_PASSWORD works like --password
// without putting the value on the command line.
import { randomBytes } from "node:crypto";
import {
  EMPTY_COMPANY,
  PASSWORD_MIN,
  ROLES,
  isEmailLike,
  isValidEmail,
  isValidLogin,
  isValidPhone,
  normalizeLogin,
  phoneDigits,
  type CompanyData,
  type PersonData,
} from "@/components/auth/data";
import { hashPassword, PASSWORD_MAX_LENGTH } from "@/server/auth/password";
import { closeClient, getDb } from "@/server/db/client";
import { collection, type UserDoc } from "@/server/db/collections";
import { newAccountId } from "@/server/ids";
import { createClient } from "@/server/repos/clients";
import { insertUser, loginKeysOf, loginTaken } from "@/server/repos/users";

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

function generatedPassword(): string {
  // 18 random bytes = 24 base64url characters (144 bits).
  return randomBytes(18).toString("base64url");
}

async function main() {
  const type = arg("type");
  if (type !== "b2b" && type !== "b2c") fail("--type must be b2b or b2c");

  const rawLogin = arg("login") ?? "";
  if (!rawLogin) fail("--login is required (a phone like 0671234567 or an e-mail)");
  if (!isValidLogin(rawLogin)) fail(`--login "${rawLogin}" is neither a valid e-mail nor a Ukrainian mobile number`);
  const login = normalizeLogin(rawLogin);
  const loginIsEmail = isEmailLike(login);

  const fullName = (arg("name") ?? "").replace(/\s+/g, " ");
  if (!fullName) fail('--name is required ("Surname Name")');

  const rawEmail = arg("email");
  if (rawEmail !== undefined && rawEmail !== "" && !isValidEmail(rawEmail)) fail(`--email "${rawEmail}" is not valid`);
  const rawPhone = arg("phone");
  if (rawPhone !== undefined && rawPhone !== "" && !isValidPhone(rawPhone)) fail(`--phone "${rawPhone}" is not valid`);

  const email = rawEmail ? rawEmail.toLowerCase() : loginIsEmail ? login : "";
  // The top-level phone is a sign-in identifier (the login when it is a
  // phone); person.phone is the contact number shown in the profile.
  const phone = loginIsEmail ? (rawPhone ? phoneDigits(rawPhone) : "") : login;

  const role = arg("role") ?? "";
  if (role && !ROLES.some((r) => r.value === role)) {
    fail(`--role must be one of: ${ROLES.map((r) => r.value).join(", ")}`);
  }
  const position = arg("position") ?? "";

  const given = arg("password") ?? (process.env.USER_CREATE_PASSWORD || undefined);
  if (given !== undefined && (given.length < PASSWORD_MIN || given.length > PASSWORD_MAX_LENGTH)) {
    fail(`--password must be ${PASSWORD_MIN} to ${PASSWORD_MAX_LENGTH} characters long`);
  }
  const password = given || generatedPassword();

  const joinClientId = arg("client");
  if (joinClientId !== undefined && type !== "b2b") fail("--client is for b2b accounts only");
  if (joinClientId === "") fail("--client needs a company id");

  let company: CompanyData = { ...EMPTY_COMPANY };
  let discountPercent = 8.4;
  if (type === "b2b" && !joinClientId) {
    company = {
      name: arg("company") ?? "",
      edrpou: arg("edrpou") ?? "",
      region: arg("region") ?? "",
      city: arg("city") ?? "",
    };
    if (!company.name) fail('--company "<name>" is required for a b2b account');
    if (company.edrpou && !/^\d{8}$/.test(company.edrpou)) fail("--edrpou must be 8 digits");
    const discount = arg("discount");
    if (discount !== undefined) {
      discountPercent = Number(discount);
      if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent >= 100) {
        fail("--discount must be a percentage from 0 to 99.99");
      }
    }
  }

  const person: PersonData = {
    fullName,
    role: type === "b2b" ? role : "",
    position: type === "b2b" ? position : "",
    phone: rawPhone ? phoneDigits(rawPhone) : loginIsEmail ? "" : login,
    email,
  };
  const loginKeys = loginKeysOf({ login, phone, person });

  // Connect first: a missing MONGODB_URI is reported before anything else.
  await getDb();
  if (await loginTaken(loginKeys)) {
    fail(`an account that signs in with ${loginKeys.join(" / ")} already exists; nothing was created`);
  }

  let clientId: string | null = null;
  // True when this run made the company (and may undo it).
  let createdCompany = false;
  if (type === "b2b" && joinClientId) {
    const existing = await (await collection("clients")).findOne({ _id: joinClientId });
    if (!existing) fail(`--client "${joinClientId}": no such company; nothing was created`);
    clientId = existing._id;
    company = { name: existing.name, edrpou: existing.edrpou, region: existing.region, city: existing.city };
  } else if (type === "b2b") {
    const client = await createClient({ ...company, discountPercent });
    clientId = client._id;
    createdCompany = true;
  }

  const now = new Date();
  const doc: UserDoc = {
    _id: newAccountId(),
    type,
    login,
    phone,
    loginKeys,
    passwordHash: await hashPassword(password),
    person,
    // A partner's company card is the company document, never this field.
    company: { ...EMPTY_COMPANY },
    clientId,
    role: type === "b2b" ? "b2b_admin" : null,
    isActive: true,
    welcomed: type !== "b2b",
    logo: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const created = await insertUser(doc);
  if (created === "exists") {
    // Lost a race with another sign-up: undo the company created above.
    if (clientId && createdCompany) await (await collection("clients")).deleteOne({ _id: clientId });
    fail(`an account that signs in with ${loginKeys.join(" / ")} already exists; nothing was created`);
  }

  console.log(`Created ${type} account ${doc._id}`);
  if (clientId) console.log(`  company ${clientId}: ${company.name}${createdCompany ? "" : " (existing company)"}`);
  console.log(`  signs in with: ${loginKeys.join(", ")}`);
  if (!given) {
    console.log(`  password (shown once, not stored anywhere in plain text): ${password}`);
  }
}

main()
  .catch((error) => {
    if (error instanceof UsageError) console.error(`user:create: ${error.message}`);
    else console.error("user:create failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeClient());
