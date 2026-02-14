import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
// accept the latest sb_ keys and common fallbacks for the service/secret key
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SECRET ||
  '';

// Only create the real client when both env vars are present; otherwise export a safe stub
let supabaseAdmin: any;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
} else {
  // Safe no-op stub used when SUPABASE isn't configured (prevents build/runtime crashes).
  // Methods return empty results or throw when actually used so callers still behave correctly.
  // eslint-disable-next-line no-console
  console.warn('Supabase admin client not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  supabaseAdmin = {
    storage: {
      from: () => ({
        list: async () => ({ data: [], error: null }),
        upload: async () => ({ data: null, error: new Error('Supabase not configured') }),
        remove: async () => ({ data: null, error: new Error('Supabase not configured') }),
        getPublicUrl: () => ({ data: { publicUrl: '' }, error: null }),
      }),
    },
  };
}

export default supabaseAdmin;
