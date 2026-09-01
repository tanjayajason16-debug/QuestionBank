-- ============================================================
-- CREATE ADMIN USER: admin@sekolah.com / sekolah123
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- Step 1: Create the auth user with confirmed email
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@sekolah.com',
  crypt('sekolah123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Administrator","role":"admin"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
);

-- Step 2: The handle_new_user trigger will auto-create the profile row.
-- But if it doesn't fire (e.g. trigger not set up yet), run this as fallback:
-- INSERT INTO public.profiles (id, email, full_name, role)
-- SELECT id, email, 'Administrator', 'admin'
-- FROM auth.users
-- WHERE email = 'admin@sekolah.com'
-- ON CONFLICT (id) DO NOTHING;

-- Verify:
SELECT u.id, u.email, u.email_confirmed_at, p.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'admin@sekolah.com';
