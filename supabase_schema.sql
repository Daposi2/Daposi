-- ==============================================================================
-- DAPOSI AGRICULTURAL PLATFORM - SUPABASE PRODUCTION DATABASE SCHEMA
-- ==============================================================================
-- INSTRUCTIONS FOR SUPABASE SQL EDITOR:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Click "New Query"
-- 3. Paste this entire SQL file and click "Run" (Ctrl+Enter / Cmd+Enter)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLE: PROFILES (User accounts linked to auth.users or standalone)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  wallet_balance NUMERIC DEFAULT 0,
  total_pledged NUMERIC DEFAULT 0,
  total_received NUMERIC DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by TEXT DEFAULT NULL,
  referral_bonus NUMERIC DEFAULT 0,
  withdrawn_referral_bonus NUMERIC DEFAULT 0,
  bank_name TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  account_name TEXT DEFAULT '',
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT DEFAULT '',
  is_locked BOOLEAN DEFAULT FALSE,
  lock_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE: PLEDGES (Support / 28-day Harvest Growth Cycle)
CREATE TABLE IF NOT EXISTS public.pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount >= 20000 AND amount <= 20000000),
  status TEXT DEFAULT 'Pledged' CHECK (status IN ('Pending', 'Pledged', 'Approved', 'Matched', 'Paid', 'Completed')),
  expected_dividend NUMERIC NOT NULL,
  growth_cycle_days INTEGER DEFAULT 28,
  custom_days_passed INTEGER DEFAULT NULL,
  approved_at TIMESTAMPTZ DEFAULT NULL,
  maturity_date TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE: GET_HELPS (Redeem Support / Withdrawal Requests)
CREATE TABLE IF NOT EXISTS public.get_helps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Matched', 'Paid', 'Rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE: TRANSACTIONS (Financial History & Audit Trail)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Deposit', 'Withdraw', 'Pledge', 'GetHelp', 'Dividend', 'Referral')),
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'Completed' CHECK (status IN ('Pending', 'Completed', 'Failed')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLE: MATCHES (Peer-to-Peer Matching Desk)
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pledge_id UUID REFERENCES public.pledges(id) ON DELETE SET NULL,
  get_help_id UUID REFERENCES public.get_helps(id) ON DELETE SET NULL,
  pledger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Confirmed', 'Cancelled')),
  receiver_name TEXT DEFAULT '',
  receiver_bank_name TEXT DEFAULT '',
  receiver_account_number TEXT DEFAULT '',
  receiver_account_name TEXT DEFAULT '',
  receiver_phone TEXT DEFAULT '',
  pledger_name TEXT DEFAULT '',
  pledger_phone TEXT DEFAULT '',
  payment_proof TEXT DEFAULT NULL,
  payment_proof_name TEXT DEFAULT NULL,
  pop_note TEXT DEFAULT '',
  pop_submitted_at TIMESTAMPTZ DEFAULT NULL,
  admin_confirmed BOOLEAN DEFAULT FALSE,
  admin_confirmed_at TIMESTAMPTZ DEFAULT NULL,
  receiver_confirmed_help BOOLEAN DEFAULT FALSE,
  receiver_confirmed_help_at TIMESTAMPTZ DEFAULT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLE: MESSAGES (Support & Live Assistance)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'admin')),
  sender_name TEXT NOT NULL,
  text TEXT DEFAULT '',
  image_url TEXT DEFAULT NULL,
  image_name TEXT DEFAULT NULL,
  read_by_admin BOOLEAN DEFAULT FALSE,
  read_by_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. INDEXES FOR HIGH QUERY SPEED
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_pledges_user_id ON public.pledges(user_id);
CREATE INDEX IF NOT EXISTS idx_get_helps_user_id ON public.get_helps(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_pledger_id ON public.matches(pledger_id);
CREATE INDEX IF NOT EXISTS idx_matches_receiver_id ON public.matches(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.get_helps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Comprehensive policies for static frontend apps connected directly to Supabase:
CREATE POLICY "Allow select on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow insert on profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Allow delete on profiles" ON public.profiles FOR DELETE USING (true);

CREATE POLICY "Allow all on pledges" ON public.pledges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on get_helps" ON public.get_helps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on matches" ON public.matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- 10. REALTIME ENABLEMENT (Optional - enables instant updates)
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles, public.pledges, public.get_helps, public.matches, public.messages, public.transactions;

-- 11. DEFAULT ADMIN ACCOUNT SEEDING HELPER
-- Admin username: Cobo#@ / Email: admin@daposi.com
-- Once you sign up with admin@daposi.com in Supabase Auth, you can promote the account to admin:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@daposi.com';
