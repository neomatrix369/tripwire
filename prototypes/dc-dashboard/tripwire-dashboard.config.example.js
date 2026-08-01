// Copy to tripwire-dashboard.config.js (gitignored) and fill in your Supabase anon key.
// The anon key is safe for browser use — it only grants access through RLS policies.
// Get it from: Supabase → Project Settings → API → anon / public key.
window.__TRIPWIRE_CONFIG = {
  SUPABASE_URL: "",        // e.g. "https://<ref>.supabase.co"
  SUPABASE_ANON_KEY: "",   // anon/public key — NOT service_role
};
