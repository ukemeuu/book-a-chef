import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_SUPABASE_URL = "https://mtmxezxpioelurgrujlk.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bXhlenhwaW9lbHVyZ3J1amxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDE2MTQsImV4cCI6MjA5MjA3NzYxNH0.kIm0WymYZKFxT9wo5Xng3G6Nq5vAxzFhNttrEI5nW3M";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
