NIPPON SALE — USERNAME/PASSWORD LOGIN SETUP

1) Create a Supabase project.
2) In Supabase SQL Editor, run supabase-setup.sql.
3) In Supabase Dashboard > Authentication > Users, create a user with a normal email address, for example:
   Email: your-real-email@example.com
   Password: choose a strong password
   Then make sure public.profiles has username = admin for that user.
   The app asks only for "admin" + password.
4) Copy the project's Project URL and anon/publishable key.
5) Open supabase-config.js and replace:
   https://YOUR-PROJECT.supabase.co
   YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
6) Deploy ALL files to Netlify. Keep index.html at the site root.

IMPORTANT:
- Never put a Supabase service_role/secret key in the website.
- The browser uses only the anon/publishable key.
- The login is real Supabase Auth, not a password stored in index.html.
- This version keeps the existing NIPPON SALE sales UI and local storage behavior unchanged.
- The existing sales data is not automatically moved into a shared cloud database by this login layer.
  If you want multiple users/devices to share the same sales database, that is a separate migration step.
