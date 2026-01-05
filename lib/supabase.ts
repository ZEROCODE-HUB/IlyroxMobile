import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl2 = "https://kpgmcebtzbeatmznwbfb.supabase.co";
const supabaseAnonKey2 =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZ21jZWJ0emJlYXRtem53YmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4NzEzNDYsImV4cCI6MjA2MTQ0NzM0Nn0.Gh04DTgvIwDh1aHldOfza8oj9r9tCyar7Ke2wXh5Dnc";

const supabaseUrl = (
  process.env.EXPO_PUBLIC_SUPABASE_URL || supabaseUrl2
).trim();
const supabaseAnonKey = (
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey2
).trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase config missing! Check your .env file.");
} else {
  console.log("Supabase config loaded:", {
    urlLength: supabaseUrl.length,
    keyLength: supabaseAnonKey.length,
    urlStart: supabaseUrl.substring(0, 8) + "...",
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
