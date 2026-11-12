import "server-only";

// Environment access for the server. Values are read lazily (inside
// functions), so importing a server module never throws at module load and
// a missing variable is reported where it is first needed.

export const isProduction = process.env.NODE_ENV === "production";

// True on Vercel (builds and functions, Production and Preview alike).
export const isVercel = Boolean(process.env.VERCEL);

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in (see README, "Database").`,
    );
  }
  return value;
}

export function mongoUri(): string {
  return required("MONGODB_URI");
}

export function mongoDbName(): string {
  return process.env.MONGODB_DB || "binar";
}

// Test mode switches the /api/dev/* helpers on and the rate limits off. It
// can never be on in a production build or anywhere on Vercel.
export function isTestMode(): boolean {
  return !isProduction && !isVercel && process.env.BINAR_TEST_MODE === "1";
}

// Shared secret of POST /api/revalidate. Undefined = the route is closed in
// production and open in development.
export function revalidateSecret(): string | undefined {
  return process.env.REVALIDATE_SECRET || undefined;
}
