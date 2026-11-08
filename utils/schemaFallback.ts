/**
 * Tolerate schema drift between the repo and the live database.
 *
 * WHY THIS EXISTS
 *   The live Supabase project is missing columns that the application writes
 *   (see `supabase/migrations/20260101000500_chef_onboarding.sql`). PostgREST
 *   rejects the WHOLE statement when any named column is unknown, so a single
 *   drifted field silently discarded entire chef applications and bookings.
 *
 *   This helper retries an insert/update without the unknown column, and
 *   reports which keys were dropped so callers can fold the data into a
 *   supported column instead of losing it.
 *
 *   It is a bridge, not a substitute for the migration. Once the migration is
 *   applied the retries simply never fire.
 */

type Run<T> = (payload: Record<string, any>) => PromiseLike<{
  data: T | null;
  error: any;
}>;

const COLUMN_PATTERNS = [
  /column\s+(?:"?[a-zA-Z0-9_]+"?\.)?"?([a-zA-Z0-9_]+)"?\s+does not exist/i,
  /Could not find the '([^']+)' column/i,
  /record\s+"[^"]+"\s+has\s+no\s+field\s+"([^"]+)"/i,
];

export function missingColumnFromError(error: any): string | null {
  if (!error) return null;

  const code = String(error.code || "");
  if (
    code !== "42703" &&
    code !== "PGRST204" &&
    code !== "PGRST205" &&
    !/column|field/i.test(String(error.message || ""))
  ) {
    return null;
  }

  const message = `${error.message || ""} ${error.details || ""} ${error.hint || ""}`;
  for (const pattern of COLUMN_PATTERNS) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function isMissingTableError(error: any): boolean {
  return (
    String(error?.code || "") === "PGRST205" ||
    /Could not find the table/i.test(String(error?.message || ""))
  );
}

/**
 * Run a write, dropping unknown columns until it succeeds.
 *
 * @example
 *   const { data, error, dropped } = await runWithSchemaFallback(payload, (p) =>
 *     supabase.from("bookings").insert([p]).select().single()
 *   );
 */
export async function runWithSchemaFallback<T>(
  payload: Record<string, any>,
  run: Run<T>
): Promise<{ data: T | null; error: any; dropped: string[] }> {
  let current = { ...payload };
  const dropped: string[] = [];

  // A hard cap prevents an infinite loop on a non-column error.
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { data, error } = await run(current);

    if (!error) return { data, error: null, dropped };

    const column = missingColumnFromError(error);
    if (!column || !(column in current)) {
      return { data: null, error, dropped };
    }

    delete current[column];
    dropped.push(column);
  }

  return {
    data: null,
    error: new Error("Schema fallback exhausted after 30 retries."),
    dropped,
  };
}

/**
 * Non-blocking dispatch audit log.
 *
 * `dispatch_log` is absent on the live project today. Logging is useful but
 * never important enough to fail an assignment or an acceptance.
 */
export async function safeDispatchLog(
  supabase: any,
  row: Record<string, any>
): Promise<boolean> {
  try {
    const { error } = await supabase.from("dispatch_log").insert([row]);
    return !error;
  } catch {
    return false;
  }
}
