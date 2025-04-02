const supabaseUrl = 'https://zerxvnmivtqcwgmapdfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inplcnh2bm1pdnRxY3dnbWFwZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjg2MDcsImV4cCI6MjA1ODg0NDYwN30.EszG4RuKictOA7k91CWRkUPSeJxfggazhqkVYVbcsy8'; // Use anon key for initial setup
// make supabaseClient available globally

const { createClient } = window.supabase; // window is global variable
supabase = createClient(supabaseUrl, supabaseKey);
