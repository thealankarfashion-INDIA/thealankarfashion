# thealankarfashion

E-commerce website for The Alankar.

## Admin Portal

Public admin URL:

`https://thealankarfashion-india.github.io/thealankarfashion/#/admin`

Admin login uses Supabase Auth only. There is no frontend admin password and no `admin` username login.

Admin email:

`thealankar.fashion@gmail.com`

## Supabase Admin Setup

1. In Supabase Authentication, create or keep the user:

   `thealankar.fashion@gmail.com`

2. Run the SQL migration in:

   `supabase_admin_portal_fix.sql`

   This creates the `public.admin_roles` table, the secure `public.is_admin()` helper, required RLS policies, and assigns the admin role to `thealankar.fashion@gmail.com`.

3. In Supabase Authentication settings, configure these URLs:

   Site URL:

   `https://thealankarfashion-india.github.io/thealankarfashion/`

   Redirect URLs:

   `https://thealankarfashion-india.github.io/thealankarfashion/admin/reset-password`

   Keep this legacy hash redirect allowed too:

   `https://thealankarfashion-india.github.io/thealankarfashion/#/admin/reset-password`

   For local testing, also allow:

   `http://localhost:5173/admin/reset-password`

## Password Reset

The admin login page has a forgot-password flow. It sends a Supabase recovery email and returns to:

`/admin/reset-password`

The reset page validates:

- Minimum 8 characters
- Confirm password matches

After the password update succeeds, the app signs out and asks the admin to log in again with the new password.

## Environment Variables

Use the existing Supabase browser-safe variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Never place the Supabase `service_role` key, admin passwords, or private secrets in frontend code or committed files.

## Admin Test Checklist

- Login with `thealankar.fashion@gmail.com`
- Try an incorrect password
- Request forgot-password email
- Open the reset email link
- Verify invalid or expired reset links show the recovery-session warning
- Validate password length and confirm-password mismatch
- Update password and log in again
- Confirm unauthorized users cannot open the admin dashboard
- Refresh the admin dashboard and confirm the session remains active
- Logout and confirm Supabase signs out
- Verify products, orders, invoices, delivery settings, and Razorpay settings still load
