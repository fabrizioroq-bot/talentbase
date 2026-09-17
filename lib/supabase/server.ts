import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service role key. Never import this
// from a client component — the service role key bypasses row-level security.
//
// TODO(auth): once Supabase Auth is introduced, swap this for a
// request-scoped client built from the user's session (createServerClient
// from @supabase/ssr) so Storage/DB access is properly scoped per-user, and
// add auth middleware in middleware.ts to protect /upload, /candidates and
// /chat routes.
let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export const CV_BUCKET = "cv-files";
