import { createClient } from "@supabase/supabase-js";

// Server-side only — uses service role key (bypasses RLS)
export function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export const STORAGE_BUCKET = "videos";

export function storageUrl(path: string): string {
  const base = process.env.SUPABASE_URL ?? "https://yokyvnurtudaqviodizu.supabase.co";
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}
