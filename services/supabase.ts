import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qquzivzmjnihybzlacvy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdXppdnptam5paHliemxhY3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NDYxNzMsImV4cCI6MjA4MDAyMjE3M30.1WqSVfAeG_BCQQJEL6SiviF9S4uIGGfasWvvP4OMmzg';

export const supabase = createClient(supabaseUrl, supabaseKey);