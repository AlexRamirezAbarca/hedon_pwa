-- HEDON Database Schema
-- Version: 1.0.0
-- Description: Core tables for users, couples, and game sessions.

-- 1. Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & TYPES
-- Subscription Tier: 'FREE', 'PREMIUM'
CREATE TYPE subscription_tier AS ENUM ('FREE', 'PREMIUM');
-- User Role: 'USER', 'ADMIN'
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
-- Couple Status: 'PENDING', 'ACTIVE', 'BLOCKED'
CREATE TYPE couple_status AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED');
-- Session Status: 'WAITING', 'Active', 'FINISHED', 'ABANDONED'
CREATE TYPE session_status AS ENUM ('WAITING', 'ACTIVE', 'FINISHED', 'ABANDONED');

-- 3. PROFILES Table (Public User Info)
-- Linked to auth.users.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'USER',
  tier subscription_tier DEFAULT 'FREE',
  stripe_customer_id TEXT, -- For future payments
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
-- Users can view their own profile.
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile.
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 4. COUPLES Table (Connecting 2 Users)
CREATE TABLE public.couples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id UUID REFERENCES public.profiles(id) NOT NULL,
  user_b_id UUID REFERENCES public.profiles(id), -- Can be NULL initially if invite sent
  couple_code TEXT UNIQUE DEFAULT substring(md5(random()::text) from 0 for 7), -- Simple join code
  status couple_status DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_users UNIQUE (user_a_id, user_b_id) -- Prevent duplicate couple records
);

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
-- Policy: Participants can view their couple data.
CREATE POLICY "View couple data" ON public.couples
  FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Policy: Users can create their own couple data
CREATE POLICY "Users can create couple" ON public.couples
  FOR INSERT WITH CHECK (auth.uid() = user_a_id);

-- Policy: Users can update their couple data
CREATE POLICY "Users can update couple" ON public.couples
  FOR UPDATE USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Policy: Allow users to find pending couples by code
CREATE POLICY "Users can find pending couples" ON public.couples
  FOR SELECT USING (status = 'PENDING');

-- Enable realtime for couples table
ALTER PUBLICATION supabase_realtime ADD TABLE public.couples;
CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES public.profiles(id) NOT NULL,
  couple_id UUID REFERENCES public.couples(id), -- Optional, can play solo or ad-hoc too
  status session_status DEFAULT 'WAITING',
  current_step JSONB DEFAULT '{}'::jsonb, -- Stores game progress (e.g. { step: 3, role_a: 'master' })
  initial_context JSONB DEFAULT '{}'::jsonb, -- Stores Lobby configuration (roles, scenario)
  access_code TEXT UNIQUE, -- QR Code content or short link
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
-- Policy: Host and participants (via couple logic or session_participants table) can view.
-- Simplified for MVP: Host can view/update.
CREATE POLICY "Host manages session" ON public.game_sessions
  USING (auth.uid() = host_id);


-- 6. AUDIT LOG Function (Auto-update 'updated_at')
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic updated_at
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_couples_modtime BEFORE UPDATE ON public.couples FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_sessions_modtime BEFORE UPDATE ON public.game_sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 7. AUTO-PROFILE Creation Trigger (Standard Supabase Pattern)
-- Automatically creates a profile row when a new user signs up via Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, tier)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'USER', 'FREE');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- COMMENTARY
COMMENT ON TABLE public.profiles IS 'Stores public user information and subscription status.';
COMMENT ON TABLE public.couples IS 'Links two users together for shared experiences.';
COMMENT ON TABLE public.game_sessions IS 'Tracks active game instances and their state.';
