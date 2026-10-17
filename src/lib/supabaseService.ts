import { supabase } from '../supabaseClient';

export const REFERRAL_BONUS_PER_USER = 9000;

// Helper to generate a unique referral code like DAPOSI-A1B2
export function generateReferralCode(name: string): string {
  const cleanName = (name || 'DAPOSI').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'DAP';
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}${randomPart}`;
}

// Map database profile to frontend User object with camelCase properties
export function mapProfileToUser(p: any, referralCount = 0): any {
  if (!p) return null;
  const totalRef = Math.max(Number(p.referral_bonus || 0), referralCount * REFERRAL_BONUS_PER_USER);
  const withdrawnRef = Number(p.withdrawn_referral_bonus || 0);
  const availRef = Math.max(0, totalRef - withdrawnRef);

  return {
    _id: p.id,
    id: p.id,
    name: p.name || '',
    email: p.email || '',
    phone: p.phone || '',
    role: p.role || 'user',
    walletBalance: Number(p.wallet_balance || 0),
    totalPledged: Number(p.total_pledged || 0),
    totalReceived: Number(p.total_received || 0),
    referralCode: p.referral_code || '',
    referredBy: p.referred_by || null,
    referralBonus: Number(p.referral_bonus || 0),
    withdrawnReferralBonus: withdrawnRef,
    bankName: p.bank_name || '',
    accountNumber: p.account_number || '',
    accountName: p.account_name || p.name || '',
    isBanned: Boolean(p.is_banned),
    banReason: p.ban_reason || '',
    isLocked: Boolean(p.is_locked),
    lockReason: p.lock_reason || '',
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    // Calculated referral fields
    referralCount,
    referralBonusPerUser: REFERRAL_BONUS_PER_USER,
    totalReferralBonus: totalRef,
    availableReferralBonus: availRef,
    canWithdrawReferral: referralCount >= 4 && availRef > 0
  };
}

// Map Match record
export function mapMatch(m: any): any {
  if (!m) return null;
  return {
    _id: m.id,
    id: m.id,
    pledgeId: m.pledge_id,
    getHelpId: m.get_help_id,
    pledgerId: m.pledger_id,
    receiverId: m.receiver_id,
    amount: Number(m.amount || 0),
    status: m.status || 'Pending',
    receiverName: m.receiver_name || '',
    receiverBankName: m.receiver_bank_name || '',
    receiverAccountNumber: m.receiver_account_number || '',
    receiverAccountName: m.receiver_account_name || '',
    receiverPhone: m.receiver_phone || '',
    pledgerName: m.pledger_name || '',
    pledgerPhone: m.pledger_phone || '',
    paymentProof: m.payment_proof || null,
    paymentProofName: m.payment_proof_name || null,
    popNote: m.pop_note || '',
    popSubmittedAt: m.pop_submitted_at || null,
    adminConfirmed: Boolean(m.admin_confirmed),
    adminConfirmedAt: m.admin_confirmed_at || null,
    receiverConfirmedHelp: Boolean(m.receiver_confirmed_help),
    receiverConfirmedHelpAt: m.receiver_confirmed_help_at || null,
    notes: m.notes || '',
    createdAt: m.created_at,
    updatedAt: m.updated_at
  };
}

// Map Pledge record
export function mapPledge(p: any): any {
  if (!p) return null;
  return {
    _id: p.id,
    id: p.id,
    userId: p.user_id,
    amount: Number(p.amount || 0),
    status: p.status || 'Pledged',
    expectedDividend: Number(p.expected_dividend || 0),
    growthCycleDays: p.growth_cycle_days || 28,
    customDaysPassed: p.custom_days_passed,
    approvedAt: p.approved_at || null,
    maturityDate: p.maturity_date || null,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  };
}

// Map GetHelp record
export function mapGetHelp(g: any): any {
  if (!g) return null;
  return {
    _id: g.id,
    id: g.id,
    userId: g.user_id,
    amount: Number(g.amount || 0),
    status: g.status || 'Pending',
    createdAt: g.created_at,
    updatedAt: g.updated_at
  };
}

// Map Transaction record
export function mapTransaction(t: any): any {
  if (!t) return null;
  return {
    _id: t.id,
    id: t.id,
    userId: t.user_id,
    type: t.type,
    amount: Number(t.amount || 0),
    status: t.status || 'Completed',
    notes: t.notes || '',
    createdAt: t.created_at
  };
}

// Map Message record
export function mapMessage(msg: any): any {
  if (!msg) return null;
  return {
    _id: msg.id,
    id: msg.id,
    userId: msg.user_id,
    senderRole: msg.sender_role,
    senderName: msg.sender_name,
    text: msg.text || '',
    imageUrl: msg.image_url || null,
    imageName: msg.image_name || null,
    readByAdmin: Boolean(msg.read_by_admin),
    readByUser: Boolean(msg.read_by_user),
    createdAt: msg.created_at
  };
}

// ----------------------------------------------------------------------------
// AUTHENTICATION SERVICES
// ----------------------------------------------------------------------------

export async function signUpWithSupabase(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  referredBy?: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}) {
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanPhone = data.phone.trim();
  const cleanName = data.name.trim();

  // 1. Check if user with phone already exists in profiles
  const { data: existingPhone } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', cleanPhone)
    .maybeSingle();

  if (existingPhone) {
    throw new Error('A user with this phone number is already registered.');
  }

  // 2. Call Supabase Auth SignUp
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: cleanEmail,
    password: data.password,
    options: {
      data: {
        name: cleanName,
        phone: cleanPhone
      }
    }
  });

  if (authError) {
    throw new Error(authError.message || 'Registration failed');
  }

  const userId = authData.user?.id;
  if (!userId) {
    throw new Error('Failed to retrieve user ID from authentication service');
  }

  // 3. Generate referral code
  const referralCode = generateReferralCode(cleanName);
  const cleanReferredBy = data.referredBy ? data.referredBy.trim().toUpperCase() : null;

  // 4. Create profile in public.profiles
  const profilePayload = {
    id: userId,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    role: 'user',
    wallet_balance: 0,
    total_pledged: 0,
    total_received: 0,
    referral_code: referralCode,
    referred_by: cleanReferredBy,
    referral_bonus: 0,
    withdrawn_referral_bonus: 0,
    bank_name: data.bankName.trim(),
    account_number: data.accountNumber.trim(),
    account_name: (data.accountName || cleanName).trim(),
    is_banned: false,
    ban_reason: '',
    is_locked: false,
    lock_reason: '',
    created_at: new Date().toISOString()
  };

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(profilePayload);

  if (profileError) {
    console.error('Error creating profile:', profileError);
    // Continue if already created by trigger
  }

  // 5. If referred by an existing member, award ₦9,000 referral bonus
  if (cleanReferredBy) {
    try {
      const { data: referrer } = await supabase
        .from('profiles')
        .select('*')
        .eq('referral_code', cleanReferredBy)
        .maybeSingle();

      if (referrer) {
        const newBonus = Number(referrer.referral_bonus || 0) + REFERRAL_BONUS_PER_USER;
        const newWallet = Number(referrer.wallet_balance || 0) + REFERRAL_BONUS_PER_USER;

        await supabase
          .from('profiles')
          .update({
            referral_bonus: newBonus,
            wallet_balance: newWallet
          })
          .eq('id', referrer.id);

        await supabase
          .from('transactions')
          .insert({
            user_id: referrer.id,
            type: 'Referral',
            amount: REFERRAL_BONUS_PER_USER,
            status: 'Completed',
            notes: `Referral bonus from new member ${cleanName} (DAPOSI ₦9,000 Reward)`
          });
      }
    } catch (err) {
      console.warn('Error applying referral reward:', err);
    }
  }

  const token = authData.session?.access_token || userId;
  return {
    token,
    user: {
      id: userId,
      _id: userId,
      name: cleanName,
      email: cleanEmail,
      role: 'user'
    }
  };
}

export async function signInWithSupabase(identifier: string, password: string) {
  const cleanId = identifier.trim();

  let emailToUse = cleanId;

  // Check if identifier is a phone number or name instead of an email
  if (!cleanId.includes('@')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, id')
      .or(`phone.eq.${cleanId},name.eq.${cleanId}`)
      .maybeSingle();

    if (profile && profile.email) {
      emailToUse = profile.email;
    }
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: emailToUse,
    password
  });

  if (authError) {
    throw new Error(authError.message || 'Invalid email/phone or password');
  }

  const userId = authData.user?.id;
  if (!userId) {
    throw new Error('Failed to retrieve user ID');
  }

  // Check user profile for ban or lock status
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profile) {
    if (profile.is_banned) {
      await supabase.auth.signOut();
      throw new Error(
        profile.ban_reason
          ? `Your account has been banned: ${profile.ban_reason}. DAPOSI Terms violation.`
          : 'Your account has been banned by DAPOSI administration. Multiple accounts are strictly prohibited.'
      );
    }

    if (profile.is_locked) {
      await supabase.auth.signOut();
      throw new Error(
        profile.lock_reason
          ? `Your account is temporarily locked: ${profile.lock_reason}`
          : 'Your account has been temporarily locked by DAPOSI administration. Please contact support.'
      );
    }
  }

  const token = authData.session?.access_token || userId;
  return {
    token,
    user: profile ? mapProfileToUser(profile) : { id: userId, _id: userId, email: emailToUse }
  };
}

export async function signOutSupabase() {
  await supabase.auth.signOut();
}

export async function resetPasswordSupabase(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
  if (error) {
    throw new Error(error.message || 'Failed to send password reset email');
  }
}

// ----------------------------------------------------------------------------
// DASHBOARD & USER DATA SERVICES
// ----------------------------------------------------------------------------

export async function fetchCurrentUserData() {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    throw new Error('Not authenticated');
  }

  // Fetch profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error || !profile) {
    throw new Error('Profile not found');
  }

  // Count referrals
  let referralCount = 0;
  if (profile.referral_code) {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', profile.referral_code);
    referralCount = count || 0;
  }

  // Fetch active pledge to compute growth progress
  const { data: pledges } = await supabase
    .from('pledges')
    .select('*')
    .eq('user_id', authUser.id)
    .order('created_at', { ascending: false });

  const activePledge = pledges && pledges.length > 0 ? pledges[0] : null;

  let growthProgress = 0;
  let daysPassed = 0;
  let accruedDividend = 0;
  let isMatured = false;

  if (activePledge && activePledge.status === 'Approved' && activePledge.approved_at) {
    const approvedTime = new Date(activePledge.approved_at).getTime();
    const actualDays = Math.max(0, Math.floor((Date.now() - approvedTime) / (1000 * 60 * 60 * 24)));
    daysPassed = activePledge.custom_days_passed !== null && activePledge.custom_days_passed !== undefined
      ? activePledge.custom_days_passed
      : actualDays;

    daysPassed = Math.min(28, daysPassed);
    growthProgress = Math.min(100, Math.round((daysPassed / 28) * 100));
    accruedDividend = Math.round(Number(activePledge.expected_dividend || 0) * (daysPassed / 28));
    isMatured = daysPassed >= 28;
  }

  const mappedUser = mapProfileToUser(profile, referralCount);

  return {
    ...mappedUser,
    activePledge: activePledge ? mapPledge(activePledge) : null,
    growthProgress,
    daysPassed,
    accruedDividend,
    isMatured
  };
}

export async function fetchUserTransactions(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
  return (data || []).map(mapTransaction);
}

export async function fetchUserMatches(userId: string) {
  const [
    { data: pledgerMatches, error: pErr },
    { data: receiverMatches, error: rErr },
    { data: userPledges, error: plErr },
    { data: userGetHelps, error: ghErr }
  ] = await Promise.all([
    supabase.from('matches').select('*').eq('pledger_id', userId).neq('status', 'Cancelled').order('created_at', { ascending: false }),
    supabase.from('matches').select('*').eq('receiver_id', userId).neq('status', 'Cancelled').order('created_at', { ascending: false }),
    supabase.from('pledges').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('get_helps').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  ]);

  if (pErr || rErr) {
    console.error('Error fetching matches:', pErr || rErr);
  }

  return {
    asPledger: (pledgerMatches || []).map(mapMatch),
    asReceiver: (receiverMatches || []).map(mapMatch),
    pledges: (userPledges || []).map(mapPledge),
    getHelps: (userGetHelps || []).map(mapGetHelp)
  };
}

export async function fetchUserUnreadMessagesCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('sender_role', 'admin')
    .eq('read_by_user', false);

  if (error) return 0;
  return count || 0;
}

// ----------------------------------------------------------------------------
// ACTIONS (Pledge, Get Help, Deposit, Bank, POP, Referral Withdrawal)
// ----------------------------------------------------------------------------

export async function submitPledge(userId: string, amount: number) {
  if (amount < 20000 || amount > 20000000) {
    throw new Error('Invalid pledge amount. Minimum is ₦20,000 and maximum is ₦20,000,000 per slot.');
  }

  const expectedDividend = Math.round(amount * 0.20); // 20% dividend

  // 1. Insert into pledges
  const { data: pledge, error: pledgeErr } = await supabase
    .from('pledges')
    .insert({
      user_id: userId,
      amount,
      expected_dividend: expectedDividend,
      growth_cycle_days: 28,
      status: 'Pledged'
    })
    .select()
    .single();

  if (pledgeErr) {
    throw new Error(pledgeErr.message || 'Failed to submit support pledge');
  }

  // 2. Insert into transactions
  await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'Pledge',
      amount,
      status: 'Completed',
      notes: `Pledge support of ₦${amount.toLocaleString()} (20% harvest dividend expected in 28 days)`
    });

  // 3. Increment user's total_pledged
  const { data: curProfile } = await supabase
    .from('profiles')
    .select('total_pledged')
    .eq('id', userId)
    .single();

  const newTotal = (Number(curProfile?.total_pledged || 0)) + amount;
  await supabase
    .from('profiles')
    .update({ total_pledged: newTotal })
    .eq('id', userId);

  return mapPledge(pledge);
}

export async function submitGetHelp(userId: string, amount: number) {
  if (!amount || amount <= 0) {
    throw new Error('Please enter a valid withdrawal amount.');
  }

  // 1. Insert into get_helps
  const { data: gh, error: ghErr } = await supabase
    .from('get_helps')
    .insert({
      user_id: userId,
      amount,
      status: 'Pending'
    })
    .select()
    .single();

  if (ghErr) {
    throw new Error(ghErr.message || 'Failed to submit withdrawal request');
  }

  // 2. Insert into transactions
  await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'GetHelp',
      amount,
      status: 'Pending',
      notes: `Requested Help / Payout of ₦${amount.toLocaleString()} (Awaiting admin approval & peer match)`
    });

  return mapGetHelp(gh);
}

export async function submitDeposit(userId: string, amount: number) {
  if (!amount || amount <= 0) {
    throw new Error('Please enter a valid deposit amount.');
  }

  // Update wallet balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', userId)
    .single();

  const newBalance = Number(profile?.wallet_balance || 0) + amount;

  await supabase
    .from('profiles')
    .update({ wallet_balance: newBalance })
    .eq('id', userId);

  // Add transaction
  await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'Deposit',
      amount,
      status: 'Completed',
      notes: `Online deposit of ₦${amount.toLocaleString()} credited to platform wallet`
    });

  return newBalance;
}

export async function updateUserBankDetails(userId: string, bankDetails: {
  bankName: string;
  accountNumber: string;
  accountName: string;
}) {
  const { error } = await supabase
    .from('profiles')
    .update({
      bank_name: bankDetails.bankName.trim(),
      account_number: bankDetails.accountNumber.trim(),
      account_name: bankDetails.accountName.trim()
    })
    .eq('id', userId);

  if (error) {
    throw new Error(error.message || 'Failed to update bank details');
  }
}

export async function withdrawReferralBonus(userId: string, amountToWithdraw?: number) {
  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) throw new Error('User not found');

  // 2. Count referrals
  const { count: referralCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', profile.referral_code);

  const numRefs = referralCount || 0;
  if (numRefs < 4) {
    throw new Error(`Referral withdrawal locked: You currently have ${numRefs} referral${numRefs === 1 ? '' : 's'}. You need a minimum of 4 referrals to withdraw your bonus.`);
  }

  const totalBonus = Math.max(Number(profile.referral_bonus || 0), numRefs * REFERRAL_BONUS_PER_USER);
  const withdrawnBonus = Number(profile.withdrawn_referral_bonus || 0);
  const availableBonus = Math.max(0, totalBonus - withdrawnBonus);

  if (availableBonus <= 0) {
    throw new Error('No available referral bonus to withdraw.');
  }

  const withdrawAmount = amountToWithdraw && amountToWithdraw > 0 
    ? Math.min(amountToWithdraw, availableBonus)
    : availableBonus;

  if (withdrawAmount < 1000) {
    throw new Error('Minimum referral withdrawal amount is ₦1,000.');
  }

  // Update withdrawn referral bonus
  const newWithdrawn = withdrawnBonus + withdrawAmount;
  await supabase
    .from('profiles')
    .update({ withdrawn_referral_bonus: newWithdrawn })
    .eq('id', userId);

  // Insert GetHelp request
  await supabase
    .from('get_helps')
    .insert({
      user_id: userId,
      amount: withdrawAmount,
      status: 'Pending'
    });

  // Record transaction
  await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'Referral',
      amount: withdrawAmount,
      status: 'Completed',
      notes: `Referral bonus withdrawal request for ₦${withdrawAmount.toLocaleString()} (${numRefs} active referrals)`
    });

  return {
    withdrawnAmount: withdrawAmount,
    remainingBonus: availableBonus - withdrawAmount
  };
}

export async function submitPaymentProof(matchId: string, payload: {
  paymentProof: string;
  paymentProofName?: string;
  popNote?: string;
}) {
  const { error } = await supabase
    .from('matches')
    .update({
      payment_proof: payload.paymentProof,
      payment_proof_name: payload.paymentProofName || 'proof_receipt.jpg',
      pop_note: payload.popNote || '',
      pop_submitted_at: new Date().toISOString(),
      status: 'Paid'
    })
    .eq('id', matchId);

  if (error) {
    throw new Error(error.message || 'Failed to submit proof of payment');
  }
}

export async function confirmReceivedHelp(matchId: string, receiverId: string) {
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (!match) throw new Error('Match not found');

  const { error } = await supabase
    .from('matches')
    .update({
      receiver_confirmed_help: true,
      receiver_confirmed_help_at: new Date().toISOString(),
      status: 'Confirmed'
    })
    .eq('id', matchId);

  if (error) throw new Error(error.message || 'Failed to confirm received help');

  // Update receiver total_received
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_received')
    .eq('id', receiverId)
    .single();

  const newTotalReceived = Number(profile?.total_received || 0) + Number(match.amount || 0);
  await supabase
    .from('profiles')
    .update({ total_received: newTotalReceived })
    .eq('id', receiverId);
}

// ----------------------------------------------------------------------------
// SUPPORT CHAT SERVICES
// ----------------------------------------------------------------------------

export async function fetchUserMessages(userId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) return [];

  // Mark admin messages as read
  await supabase
    .from('messages')
    .update({ read_by_user: true })
    .eq('user_id', userId)
    .eq('sender_role', 'admin')
    .eq('read_by_user', false);

  return (data || []).map(mapMessage);
}

export async function sendUserMessage(payload: {
  userId: string;
  userName: string;
  text: string;
  imageUrl?: string | null;
  imageName?: string | null;
}) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      user_id: payload.userId,
      sender_role: 'user',
      sender_name: payload.userName || 'Farmer',
      text: payload.text || '',
      image_url: payload.imageUrl || null,
      image_name: payload.imageName || null,
      read_by_admin: false,
      read_by_user: true
    })
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to send message');
  return mapMessage(data);
}

export async function fetchAdminConversations() {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !messages) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*');

  const profileMap = new Map((profiles || []).map(p => [p.id, mapProfileToUser(p)]));

  // Group by user_id
  const convMap = new Map<string, any>();
  for (const m of messages) {
    const uid = m.user_id;
    if (!convMap.has(uid)) {
      const u = profileMap.get(uid) || { id: uid, _id: uid, name: m.sender_name || 'User', email: '', phone: '' };
      convMap.set(uid, {
        userId: uid,
        user: u,
        lastMessage: mapMessage(m),
        unreadCount: 0,
        totalMessages: 0
      });
    }
    const conv = convMap.get(uid);
    conv.totalMessages += 1;
    if (m.sender_role === 'user' && !m.read_by_admin) {
      conv.unreadCount += 1;
    }
  }

  return Array.from(convMap.values());
}

export async function fetchAdminMessagesForUser(userId: string) {
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // Mark as read by admin
  await supabase
    .from('messages')
    .update({ read_by_admin: true })
    .eq('user_id', userId)
    .eq('sender_role', 'user')
    .eq('read_by_admin', false);

  return {
    user: profile ? mapProfileToUser(profile) : { id: userId, _id: userId, name: 'User' },
    messages: (messages || []).map(mapMessage)
  };
}

export async function sendAdminMessage(payload: {
  userId: string;
  text: string;
  imageUrl?: string | null;
  imageName?: string | null;
}) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      user_id: payload.userId,
      sender_role: 'admin',
      sender_name: 'DAPOSI Support',
      text: payload.text || '',
      image_url: payload.imageUrl || null,
      image_name: payload.imageName || null,
      read_by_admin: true,
      read_by_user: false
    })
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to send message');
  return mapMessage(data);
}

// ----------------------------------------------------------------------------
// ADMIN PORTAL & MATCHING DESK SERVICES
// ----------------------------------------------------------------------------

export async function adminLogin(usernameInput: string, passwordInput: string) {
  const cleanUser = usernameInput.trim();
  const cleanPass = passwordInput.trim();

  // Primary DAPOSI admin credentials: Cobo#@ / Cob2026@$
  const defaultAdminUser = 'Cobo#@';
  const defaultAdminPass = 'Cob2026@$';

  if (
    (cleanUser === defaultAdminUser || cleanUser.toLowerCase() === 'admin@daposi.com' || cleanUser === 'admin') &&
    cleanPass === defaultAdminPass
  ) {
    const adminToken = `daposi-admin-supabase-${Date.now()}`;
    return { token: adminToken, role: 'admin', name: defaultAdminUser };
  }

  // Otherwise, try standard Supabase Auth
  const email = cleanUser.includes('@') ? cleanUser : `${cleanUser}@daposi.com`;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: cleanPass
  });

  if (error) {
    throw new Error('Invalid Admin credentials');
  }

  // Check if role is admin in profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', data.user.id)
    .single();

  if (profile?.role !== 'admin') {
    await supabase.auth.signOut();
    throw new Error('Access denied: You do not have DAPOSI administrator privileges');
  }

  return { token: data.session.access_token, role: 'admin', name: profile?.name || cleanUser };
}

export async function fetchAdminStats() {
  const [
    { data: rawUsers },
    { data: rawPledges },
    { data: rawGetHelps },
    { data: rawMatches },
    { data: rawTransactions }
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('pledges').select('*').order('created_at', { ascending: false }),
    supabase.from('get_helps').select('*').order('created_at', { ascending: false }),
    supabase.from('matches').select('*').order('created_at', { ascending: false }),
    supabase.from('transactions').select('*').order('created_at', { ascending: false })
  ]);

  const userMap = new Map((rawUsers || []).map(u => [u.id, u]));

  // Count referrals for each user
  const referralCounts = new Map<string, number>();
  for (const u of (rawUsers || [])) {
    if (u.referral_code) {
      const count = (rawUsers || []).filter(o => o.referred_by === u.referral_code).length;
      referralCounts.set(u.id, count);
    }
  }

  const users = (rawUsers || []).map(u => mapProfileToUser(u, referralCounts.get(u.id) || 0));

  // Enrich pledges with user data
  const pledges = (rawPledges || []).map(p => {
    const u = userMap.get(p.user_id);
    return {
      ...mapPledge(p),
      userId: u ? mapProfileToUser(u) : { _id: p.user_id, id: p.user_id, name: 'Unknown User' }
    };
  });

  // Enrich getHelps with user data
  const getHelps = (rawGetHelps || []).map(gh => {
    const u = userMap.get(gh.user_id);
    return {
      ...mapGetHelp(gh),
      userId: u ? mapProfileToUser(u) : { _id: gh.user_id, id: gh.user_id, name: 'Unknown User' }
    };
  });

  const matches = (rawMatches || []).map(mapMatch);
  const transactions = (rawTransactions || []).map(mapTransaction);

  const totalUsers = users.length;
  const totalPledged = (rawPledges || []).reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const totalPaidOut = (rawGetHelps || []).filter(g => g.status === 'Paid').reduce((acc, g) => acc + Number(g.amount || 0), 0);
  const pendingPayouts = (rawGetHelps || []).filter(g => g.status === 'Pending').length;
  const activePledges = (rawPledges || []).filter(p => p.status === 'Approved' || p.status === 'Pledged').length;

  return {
    totalUsers,
    totalPledged,
    totalPaidOut,
    pendingPayouts,
    activePledges,
    users,
    pledges,
    getHelps,
    matches,
    transactions
  };
}

export async function approvePayout(getHelpId: string) {
  const { data: gh } = await supabase
    .from('get_helps')
    .select('*')
    .eq('id', getHelpId)
    .single();

  if (!gh) throw new Error('Payout request not found');

  await supabase
    .from('get_helps')
    .update({ status: 'Paid' })
    .eq('id', getHelpId);

  // Update user total_received
  const { data: prof } = await supabase
    .from('profiles')
    .select('total_received')
    .eq('id', gh.user_id)
    .single();

  const newTotal = Number(prof?.total_received || 0) + Number(gh.amount || 0);
  await supabase
    .from('profiles')
    .update({ total_received: newTotal })
    .eq('id', gh.user_id);

  // Update transaction if exists
  await supabase
    .from('transactions')
    .update({ status: 'Completed' })
    .eq('user_id', gh.user_id)
    .eq('type', 'GetHelp')
    .eq('amount', gh.amount);
}

export async function rejectPayout(getHelpId: string) {
  await supabase
    .from('get_helps')
    .update({ status: 'Rejected' })
    .eq('id', getHelpId);
}

export async function approvePledge(pledgeId: string) {
  const maturityDate = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('pledges')
    .update({
      status: 'Approved',
      approved_at: new Date().toISOString(),
      maturity_date: maturityDate
    })
    .eq('id', pledgeId);
}

export async function updatePledgeProgress(targetId: string, day: number, isPledgeId: boolean) {
  if (isPledgeId) {
    await supabase
      .from('pledges')
      .update({ custom_days_passed: day })
      .eq('id', targetId);
  } else {
    // Set for latest pledge of user
    const { data: pledges } = await supabase
      .from('pledges')
      .select('id')
      .eq('user_id', targetId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (pledges && pledges.length > 0) {
      await supabase
        .from('pledges')
        .update({ custom_days_passed: day })
        .eq('id', pledges[0].id);
    }
  }
}

export async function setBanStatus(userId: string, isBanned: boolean, banReason = '') {
  await supabase
    .from('profiles')
    .update({
      is_banned: isBanned,
      ban_reason: isBanned ? banReason : ''
    })
    .eq('id', userId);
}

export async function setLockStatus(userId: string, isLocked: boolean, lockReason = '') {
  await supabase
    .from('profiles')
    .update({
      is_locked: isLocked,
      lock_reason: isLocked ? lockReason : ''
    })
    .eq('id', userId);
}

export async function createPeerMatch(payload: {
  pledgerId: string;
  receiverId: string;
  amount: number;
  receiverBankName?: string;
  receiverAccountNumber?: string;
  receiverAccountName?: string;
  receiverPhone?: string;
  pledgerPhone?: string;
  pledgeId?: string;
  getHelpId?: string;
}) {
  const [pledgerRes, receiverRes] = await Promise.all([
    supabase.from('profiles').select('name, phone').eq('id', payload.pledgerId).single(),
    supabase.from('profiles').select('name, phone, bank_name, account_number, account_name').eq('id', payload.receiverId).single()
  ]);

  const pledger = pledgerRes.data;
  const receiver = receiverRes.data;

  const matchRecord = {
    pledger_id: payload.pledgerId,
    receiver_id: payload.receiverId,
    amount: payload.amount,
    pledge_id: payload.pledgeId || null,
    get_help_id: payload.getHelpId || null,
    receiver_name: receiver?.name || '',
    receiver_bank_name: payload.receiverBankName || receiver?.bank_name || '',
    receiver_account_number: payload.receiverAccountNumber || receiver?.account_number || '',
    receiver_account_name: payload.receiverAccountName || receiver?.account_name || receiver?.name || '',
    receiver_phone: payload.receiverPhone || receiver?.phone || '',
    pledger_name: pledger?.name || '',
    pledger_phone: payload.pledgerPhone || pledger?.phone || '',
    status: 'Pending'
  };

  const { data, error } = await supabase
    .from('matches')
    .insert(matchRecord)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to create match');

  if (payload.pledgeId) {
    await supabase.from('pledges').update({ status: 'Matched' }).eq('id', payload.pledgeId);
  }
  if (payload.getHelpId) {
    await supabase.from('get_helps').update({ status: 'Matched' }).eq('id', payload.getHelpId);
  }

  return mapMatch(data);
}

export async function updatePeerMatch(matchId: string, payload: any) {
  const updateData: any = {};
  if (payload.pledgerPhone !== undefined) updateData.pledger_phone = payload.pledgerPhone;
  if (payload.receiverPhone !== undefined) updateData.receiver_phone = payload.receiverPhone;
  if (payload.receiverBankName !== undefined) updateData.receiver_bank_name = payload.receiverBankName;
  if (payload.receiverAccountNumber !== undefined) updateData.receiver_account_number = payload.receiverAccountNumber;
  if (payload.receiverAccountName !== undefined) updateData.receiver_account_name = payload.receiverAccountName;
  if (payload.amount !== undefined) updateData.amount = payload.amount;
  if (payload.status !== undefined) updateData.status = payload.status;

  const { error } = await supabase
    .from('matches')
    .update(updateData)
    .eq('id', matchId);

  if (error) throw new Error(error.message || 'Failed to update match');
}

export async function updatePayerPhone(matchId: string, phone: string) {
  const { error } = await supabase
    .from('matches')
    .update({ pledger_phone: phone.trim() })
    .eq('id', matchId);

  if (error) throw new Error(error.message || 'Failed to update payer phone');
}

export async function deletePeerMatch(matchId: string) {
  const { data: match } = await supabase
    .from('matches')
    .select('pledge_id, get_help_id')
    .eq('id', matchId)
    .single();

  if (match) {
    if (match.pledge_id) {
      await supabase.from('pledges').update({ status: 'Pledged' }).eq('id', match.pledge_id);
    }
    if (match.get_help_id) {
      await supabase.from('get_helps').update({ status: 'Pending' }).eq('id', match.get_help_id);
    }
  }

  await supabase.from('matches').delete().eq('id', matchId);
}

export async function confirmPeerMatchByAdmin(matchId: string) {
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (!match) throw new Error('Match not found');

  await supabase
    .from('matches')
    .update({
      admin_confirmed: true,
      admin_confirmed_at: new Date().toISOString(),
      status: 'Confirmed'
    })
    .eq('id', matchId);

  if (match.pledge_id) {
    await supabase.from('pledges').update({ status: 'Completed' }).eq('id', match.pledge_id);
  }
  if (match.get_help_id) {
    await supabase.from('get_helps').update({ status: 'Paid' }).eq('id', match.get_help_id);
  }
}

export async function fetchUserDashboardSummary(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) throw new Error('User not found');

  const { count: refCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', profile.referral_code);

  const [
    { data: pledges },
    { data: getHelps },
    { data: matches },
    { data: transactions }
  ] = await Promise.all([
    supabase.from('pledges').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('get_helps').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('matches').select('*').or(`pledger_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }),
    supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  ]);

  const mappedPledges = (pledges || []).map(mapPledge);
  const activePledge = mappedPledges.find(p => p.status !== 'Completed') || mappedPledges[0] || null;

  let daysPassed = 0;
  if (activePledge && activePledge.approvedAt) {
    const approvedTime = new Date(activePledge.approvedAt).getTime();
    const actualDays = Math.max(0, Math.floor((Date.now() - approvedTime) / (1000 * 60 * 60 * 24)));
    daysPassed = activePledge.customDaysPassed !== null && activePledge.customDaysPassed !== undefined
      ? activePledge.customDaysPassed
      : actualDays;
    daysPassed = Math.min(28, daysPassed);
  }

  return {
    user: mapProfileToUser(profile, refCount || 0),
    activePledge,
    daysPassed,
    pledges: mappedPledges,
    getHelps: (getHelps || []).map(mapGetHelp),
    matches: (matches || []).map(mapMatch),
    transactions: (transactions || []).map(mapTransaction)
  };
}
