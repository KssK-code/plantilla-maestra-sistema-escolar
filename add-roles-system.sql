-- Add roles system to the database
-- Run this in your Supabase SQL Editor

-- 1. Add role column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'receptionist';

-- 2. Create role enum type for better validation
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'receptionist');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Set your user as admin (replace with your actual email)
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'forzzaserrano@gmail.com';

-- 4. Ensure all other users are receptionists by default
UPDATE profiles 
SET role = 'receptionist' 
WHERE role IS NULL OR role != 'admin';

-- 5. Remove the default before changing type
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;

-- 6. Update the role column to use the enum
ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;

-- 7. Set new default with correct type
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'receptionist'::user_role;

-- 8. Add constraint to ensure role is always set
ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;

-- 9. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Verify the changes
SELECT id, email, full_name, role, created_at 
FROM profiles 
ORDER BY created_at;
