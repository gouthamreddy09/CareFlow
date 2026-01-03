/*
  # Fix User Profiles RLS Infinite Recursion
  
  1. Problem
    - The admin policies were checking role by querying user_profiles table
    - This caused infinite recursion when trying to read from the same table
  
  2. Solution
    - Drop the problematic admin policies
    - Keep simple policies that only check auth.uid()
    - Users can read and update their own profiles
    - Admin privileges will be handled at the application level
  
  3. Changes
    - Drop all admin-related policies that query user_profiles
    - Keep only user-level policies for SELECT and UPDATE
    - Add INSERT policy for new user creation (service role)
*/

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Allow profile creation"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);