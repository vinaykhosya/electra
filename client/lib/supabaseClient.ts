import { createClient } from "@supabase/supabase-js";

// --- TEMPORARY DEBUGGING STEP ---
// We are hardcoding the keys to bypass any .env file loading issues.
// This is not for production, but it will help us solve the "Invalid API key" error.

const supabaseUrl = "https://ttlaijowwmkggymseoze.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bGFpam93d21rZ2d5bXNlb3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NDYyNjksImV4cCI6MjA3NTIyMjI2OX0.A4oxK9W-AHi4RE85Wbuab35FQHK9MElaKWE9gqlWq9c";

// The original code that reads from .env file is commented out below:
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or Anon Key is missing.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

