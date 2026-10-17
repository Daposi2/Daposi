import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, Wallet, ArrowUpRight, ArrowDownLeft, 
  Activity, Clock, CheckCircle, CheckCircle2, AlertCircle, X,
  Sprout, ArrowRight, Check, MessageSquare, Phone,
  Copy, CheckCheck, Building, CreditCard, ExternalLink,
  Image as ImageIcon, Loader2, Maximize2, ShieldCheck, User as UserIcon,
  Gift, TrendingUp, Users, Sparkles, Lock, Unlock
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import SupportChatModal from './SupportChatModal';
import { 
  fetchCurrentUserData, 
  fetchUserTransactions, 
  fetchUserMatches, 
  fetchUserUnreadMessagesCount,
  submitPledge,
  submitGetHelp,
  submitDeposit,
  updateUserBankDetails,
  withdrawReferralBonus,
  submitPaymentProof,
  confirmReceivedHelp
} from '../lib/supabaseService';
import { supabase } from '../supabaseClient';

export default function Dashboard({ token, setToken }: { token: string, setToken: (t: string | null) => void }) {
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [matches, setMatches] = useState<{ asPledger: any[]; asReceiver: any[]; pledges?: any[]; getHelps?: any[] }>({ asPledger: [], asReceiver: [], pledges: [], getHelps: [] });
  const [selectedPledgeIdx, setSelectedPledgeIdx] = useState(0);
  const [selectedGetHelpIdx, setSelectedGetHelpIdx] = useState(0);
  const [selectedGrowthPledgeIdx, setSelectedGrowthPledgeIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Modals state
  const [showPledgeModal, setShowPledgeModal] = useState(false);
  const [showGetHelpModal, setShowGetHelpModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false);
  const [showReferralWithdrawModal, setShowReferralWithdrawModal] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Referral Withdrawal State
  const [referralWithdrawAmount, setReferralWithdrawAmount] = useState('');
  const [referralWithdrawBank, setReferralWithdrawBank] = useState('');
  const [referralWithdrawAccount, setReferralWithdrawAccount] = useState('');
  const [referralWithdrawName, setReferralWithdrawName] = useState('');
  const [referralWithdrawLoading, setReferralWithdrawLoading] = useState(false);
  const [referralWithdrawError, setReferralWithdrawError] = useState('');
  const [referralWithdrawSuccess, setReferralWithdrawSuccess] = useState('');

  // Match interaction state
  const [forceNewPledgeForm, setForceNewPledgeForm] = useState(false);
  const [forceNewGetHelpForm, setForceNewGetHelpForm] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [proofImage, setProofImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [popNote, setPopNote] = useState('');
  const [popSuccessNotice, setPopSuccessNotice] = useState('');
  const [matchActionLoading, setMatchActionLoading] = useState(false);
  const [previewImageLightbox, setPreviewImageLightbox] = useState<string | null>(null);

  // Incomplete Cycle Alert Modal State
  const [cycleIncompleteNotice, setCycleIncompleteNotice] = useState<{
    daysPassed: number;
    daysRemaining: number;
    maturityDate: string;
    pledgedAmount: number;
  } | null>(null);

  // Confirm Help Received to Admin Modal State
  const [showConfirmHelpModal, setShowConfirmHelpModal] = useState(false);
  const [confirmHelpMatch, setConfirmHelpMatch] = useState<any>(null);
  const [confirmHelpNote, setConfirmHelpNote] = useState('');

  // Bank Form State
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSuccess, setBankSuccess] = useState(false);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchUnreadCount = async () => {
    if (!user?.id) return;
    try {
      const count = await fetchUserUnreadMessagesCount(user.id);
      setUnreadMessages(count);
    } catch (err) {
      // silent
    }
  };

  const fetchMatches = async () => {
    if (!user?.id) return;
    try {
      const data = await fetchUserMatches(user.id);
      setMatches(data);
    } catch (err) {
      // silent
    }
  };

  const fetchUserData = async () => {
    try {
      const userData = await fetchCurrentUserData();
      const txData = await fetchUserTransactions(userData.id);
      
      setUser(userData);
      setBankName(userData.bankName || '');
      setAccountNumber(userData.accountNumber || '');
      setAccountName(userData.accountName || '');
      setReferralWithdrawBank(userData.bankName || '');
      setReferralWithdrawAccount(userData.accountNumber || '');
      setReferralWithdrawName(userData.accountName || userData.name || '');
      setTransactions(txData);

      const [unreadCount, matchesData] = await Promise.all([
        fetchUserUnreadMessagesCount(userData.id),
        fetchUserMatches(userData.id)
      ]);
      setUnreadMessages(unreadCount);
      setMatches(matchesData);
    } catch (err: any) {
      console.error('Error fetching user data from Supabase:', err);
      if (err.message === 'Not authenticated' || err.message === 'Profile not found') {
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();

    // Check unread message count and matches every 10 seconds
    const interval = setInterval(() => {
      if (user?.id) {
        fetchUserUnreadMessagesCount(user.id).then(setUnreadMessages).catch(() => {});
        fetchUserMatches(user.id).then(setMatches).catch(() => {});
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  const handlePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setModalError('');
    setModalLoading(true);
    try {
      await submitPledge(user.id, Number(amount));
      setShowPledgeModal(false);
      setAmount('');
      fetchUserData();
    } catch (err: any) {
      setModalError(err.message || 'Error submitting support pledge');
    } finally {
      setModalLoading(false);
    }
  };

  const handleGetHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setModalError('');
    setModalLoading(true);
    try {
      await submitGetHelp(user.id, Number(amount));
      setShowGetHelpModal(false);
      setAmount('');
      fetchUserData();
    } catch (err: any) {
      setModalError(err.message || 'Error submitting withdrawal request');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setModalError('');
    setModalLoading(true);
    try {
      await submitDeposit(user.id, Number(amount));
      setShowDepositModal(false);
      setAmount('');
      fetchUserData();
    } catch (err: any) {
      setModalError(err.message || 'Error making deposit');
    } finally {
      setModalLoading(false);
    }
  };

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setBankLoading(true);
    setBankSuccess(false);
    try {
      await updateUserBankDetails(user.id, { bankName, accountNumber, accountName });
      setBankSuccess(true);
      fetchUserData();
      setTimeout(() => {
        setShowBankDetailsModal(false);
        setBankSuccess(false);
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Error updating bank details');
    } finally {
      setBankLoading(false);
    }
  };

  const handleReferralWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const referralCount = user?.referralCount || 0;
    if (referralCount < 4) {
      setReferralWithdrawError(`Referral bonus withdrawal is locked! You can only withdraw your referral bonus once you have up to 4 referrals. You currently have ${referralCount} referral(s).`);
      return;
    }

    const refBonusRate = user?.referralBonusPerUser || 9000;
    const availableBonus = user?.availableReferralBonus !== undefined 
      ? user.availableReferralBonus 
      : Math.max(0, ((user?.referralCount || 0) * refBonusRate) - (user?.withdrawnReferralBonus || 0));
    const withdrawAmt = referralWithdrawAmount ? Number(referralWithdrawAmount) : availableBonus;

    if (isNaN(withdrawAmt) || withdrawAmt <= 0) {
      setReferralWithdrawError('Please enter a valid withdrawal amount.');
      return;
    }

    if (withdrawAmt > availableBonus) {
      setReferralWithdrawError(`Requested amount exceeds your available referral bonus balance of ₦${availableBonus.toLocaleString()}`);
      return;
    }

    const finalBank = (referralWithdrawBank || bankName || user?.bankName || '').trim();
    const finalAccount = (referralWithdrawAccount || accountNumber || user?.accountNumber || '').trim();
    const finalName = (referralWithdrawName || accountName || user?.accountName || user?.name || '').trim();

    if (!finalBank || !finalAccount) {
      setReferralWithdrawError('Please enter your Bank Name and Account Number to receive payment.');
      return;
    }

    try {
      setReferralWithdrawLoading(true);
      setReferralWithdrawError('');
      setReferralWithdrawSuccess('');

      const res = await withdrawReferralBonus(user.id, withdrawAmt);

      setReferralWithdrawSuccess(`₦${withdrawAmt.toLocaleString()} referral bonus withdrawn successfully to ${finalBank} (${finalAccount})!`);
      fetchUserData();
      setTimeout(() => {
        setShowReferralWithdrawModal(false);
        setReferralWithdrawSuccess('');
      }, 2500);
    } catch (err: any) {
      setReferralWithdrawError(err.message || 'Error processing referral withdrawal');
    } finally {
      setReferralWithdrawLoading(false);
    }
  };

  const handleProofImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setProofImage({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), name: file.name });
        } else {
          setProofImage({ dataUrl: e.target?.result as string, name: file.name });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDropPOP = async (matchId: string) => {
    if (!proofImage && !popNote.trim()) {
      alert('Please upload a payment receipt image or enter your transfer session ID / reference note.');
      return;
    }
    setMatchActionLoading(true);
    setPopSuccessNotice('');
    try {
      await submitPaymentProof(matchId, {
        paymentProof: proofImage ? proofImage.dataUrl : '',
        paymentProofName: proofImage ? proofImage.name : 'receipt.jpg',
        popNote: popNote.trim()
      });
      setProofImage(null);
      setPopNote('');
      setPopSuccessNotice('Proof of Payment (POP) dropped successfully! Admin and recipient notified.');
      fetchMatches();
      fetchUserData();
    } catch (err: any) {
      alert(err.message || 'Error submitting proof of payment');
    } finally {
      setMatchActionLoading(false);
    }
  };

  const handleConfirmPledgePayment = async (matchId: string) => {
    handleDropPOP(matchId);
  };

  const handleConfirmHelpToAdmin = async (matchId: string) => {
    if (!user?.id) return;
    setMatchActionLoading(true);
    try {
      await confirmReceivedHelp(matchId, user.id);
      setShowConfirmHelpModal(false);
      setConfirmHelpMatch(null);
      setConfirmHelpNote('');
      setShowGetHelpModal(false);
      fetchMatches();
      fetchUserData();
      alert('Help confirmation sent to Admin! Your harvest cycle is completed and your dashboard has refreshed to zero.');
    } catch (err: any) {
      alert(err.message || 'Error confirming help received to admin');
    } finally {
      setMatchActionLoading(false);
    }
  };

  const handleConfirmReceipt = async (matchId: string) => {
    handleConfirmHelpToAdmin(matchId);
  };

  const activePledgeMatch = (matches.asPledger && matches.asPledger.length > 0)
    ? (matches.asPledger[selectedPledgeIdx] || matches.asPledger[0])
    : null;

  const activeGetHelpMatch = (matches.asReceiver && matches.asReceiver.length > 0)
    ? (matches.asReceiver[selectedGetHelpIdx] || matches.asReceiver[0])
    : null;

  const pendingUnmatchedPledge = matches.pledges?.find((p: any) => p.status === 'Pledged');
  const pendingUnmatchedGetHelp = matches.getHelps?.find((g: any) => g.status === 'Pending');

  // User's active pledge(s) for the 28-day Dividend Progress Bar
  const allUserPledges = matches.pledges || [];
  const activeUserPledges = allUserPledges.filter((p: any) => p.status !== 'Completed');
  const hasCompletedCycle = allUserPledges.some((p: any) => p.status === 'Completed');
  const currentGrowthPledge = (user?.totalPledged > 0 && activeUserPledges.length > 0)
    ? (activeUserPledges[selectedGrowthPledgeIdx] || activeUserPledges[0])
    : (user?.totalPledged > 0 ? (allUserPledges[selectedGrowthPledgeIdx] || allUserPledges[0]) : null);

  const isPledgeApproved = Boolean(currentGrowthPledge && (currentGrowthPledge.status === 'Approved' || currentGrowthPledge.approvedAt || currentGrowthPledge.status === 'Paid'));
  
  // Calculate 28-day progression
  const growthTotalDays = currentGrowthPledge?.growthCycleDays || 28;
  const approvedTimestamp = currentGrowthPledge?.approvedAt 
    ? new Date(currentGrowthPledge.approvedAt).getTime() 
    : (currentGrowthPledge?.createdAt ? new Date(currentGrowthPledge.createdAt).getTime() : Date.now());
  const nowTimestamp = Date.now();
  const elapsedDaysMs = Math.max(0, nowTimestamp - approvedTimestamp);
  const rawDaysPassed = Math.floor(elapsedDaysMs / (1000 * 60 * 60 * 24)) + 1;
  const daysPassed = (currentGrowthPledge?.customDaysPassed !== undefined && currentGrowthPledge?.customDaysPassed !== null)
    ? Math.min(growthTotalDays, Math.max(0, currentGrowthPledge.customDaysPassed))
    : (isPledgeApproved ? Math.min(growthTotalDays, Math.max(1, rawDaysPassed)) : 0);
  const growthProgressPercent = isPledgeApproved 
    ? Math.min(100, Math.max(4, Math.round((daysPassed / growthTotalDays) * 100))) 
    : 0;
  const growthExpectedDividend = currentGrowthPledge?.expectedDividend || (currentGrowthPledge?.amount ? currentGrowthPledge.amount * 0.20 : 0);
  const growthAccruedDividend = isPledgeApproved 
    ? Math.round(growthExpectedDividend * (daysPassed / growthTotalDays)) 
    : 0;
  const growthDaysRemaining = isPledgeApproved ? Math.max(0, growthTotalDays - daysPassed) : growthTotalDays;
  const maturityDateString = currentGrowthPledge 
    ? new Date(currentGrowthPledge.maturityDate || (approvedTimestamp + growthTotalDays * 24 * 60 * 60 * 1000)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'In 28 Days';

  const activeOrdersCount = (matches.asPledger?.filter(m => m.status === 'Pending' || m.status === 'Paid').length || 0) +
    (matches.asReceiver?.filter(m => m.status === 'Pending' || m.status === 'Paid').length || 0) +
    (matches.pledges?.filter((p: any) => p.status === 'Pledged').length || 0) +
    (matches.getHelps?.filter((g: any) => g.status === 'Pending').length || 0);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#182416]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#182416] pb-12 font-sans text-[#f2f6f0]">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 border-b border-[#2d4028] bg-[#141f13]/85 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-white shadow-sm">
              <Sprout className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">DAPOSI</span>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowSupportModal(true)}
              className="relative flex items-center space-x-1.5 text-sm font-medium text-[#c2d3bd] hover:text-white bg-[#1e2f1b] border border-[#2e4429] hover:border-green-500/50 px-3 py-1.5 rounded-xl transition-all shadow-sm"
            >
              <MessageSquare className="h-4 w-4 text-green-400" />
              <span>Contact Admin</span>
              {unreadMessages > 0 && (
                <span className="flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-black animate-pulse">
                  {unreadMessages}
                </span>
              )}
            </button>
            {user?.role === 'admin' && (
              <button 
                onClick={() => navigate('/admin')}
                className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
              >
                Admin Panel
              </button>
            )}
            <button 
              onClick={() => setToken(null)}
              className="flex items-center space-x-2 text-sm text-[#9db299] hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* LEFT PANEL */}
          <div className="space-y-6 lg:col-span-4">
            
            {/* User Profile & Wallet */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-[#2e422a] bg-[#202e1c] p-6 shadow-sm"
            >
              <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-[#2e422a]">
                <div className="h-12 w-12 rounded-full bg-[#2b3e26] flex items-center justify-center text-lg font-bold text-green-400 border border-[#3b5235]">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{user?.name}</h2>
                  <p className="text-sm text-[#9db299]">{user?.email}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => user?.referralCode && copyToClipboard(user.referralCode, 'refCode')}
                      className="text-xs text-green-300 bg-green-500/15 hover:bg-green-500/25 px-2 py-0.5 rounded-full border border-green-500/30 font-medium tracking-wide flex items-center space-x-1"
                      title="Click to copy referral code"
                    >
                      <span>Code: {user?.referralCode || 'N/A'}</span>
                      {copiedKey === 'refCode' ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <span className="text-xs text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold tracking-wide">
                      {user?.referralCount || 0} Ref (₦{(user?.totalReferralBonus !== undefined ? user.totalReferralBonus : (user?.referralCount || 0) * (user?.referralBonusPerUser || 9000)).toLocaleString()})
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-[#9db299] mb-1">USER WALLET</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold text-white tracking-tight">
                    {formatCurrency(user?.walletBalance || 0)}
                  </h3>
                  <button 
                    onClick={() => setShowDepositModal(true)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                  >
                    + Deposit NGN
                  </button>
                </div>
              </div>

              {/* ₦5,000 Referral Program & Withdrawal Box */}
              <div className="mt-4 rounded-xl bg-[#162514] border border-[#2c4428] p-3.5 text-xs space-y-3">
                <div className="flex items-center justify-between text-amber-400 font-bold">
                  <span className="flex items-center space-x-1.5">
                    <Gift className="h-4 w-4 text-amber-400" />
                    <span>Referral Program (₦5,000 / Farmer)</span>
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border ${
                    (user?.referralCount || 0) >= 4 
                      ? 'text-green-300 bg-green-500/15 border-green-500/30' 
                      : 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                  }`}>
                    {(user?.referralCount || 0) >= 4 ? 'Eligible for Payout' : `${user?.referralCount || 0}/4 Referrals`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-[#10190e] p-2.5 rounded-lg border border-[#22351f] text-[11px]">
                  <div>
                    <span className="text-[#8ca388] block text-[10px]">Total Accrued</span>
                    <span className="font-bold text-white text-xs">
                      ₦{(user?.totalReferralBonus !== undefined ? user.totalReferralBonus : (user?.referralCount || 0) * (user?.referralBonusPerUser || 9000)).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[#71856e] block">{user?.referralCount || 0} farmers invited</span>
                  </div>
                  <div>
                    <span className="text-[#8ca388] block text-[10px]">Available to Withdraw</span>
                    <span className="font-bold text-green-400 text-xs">
                      ₦{(user?.availableReferralBonus !== undefined ? user.availableReferralBonus : Math.max(0, ((user?.referralCount || 0) * (user?.referralBonusPerUser || 9000)) - (user?.withdrawnReferralBonus || 0))).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[#71856e] block">
                      Withdrawn: ₦{(user?.withdrawnReferralBonus || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress bar toward 4 referrals */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[#9db299]">Withdrawal Unlock Requirement:</span>
                    <span className={`font-semibold ${
                      (user?.referralCount || 0) >= 4 ? 'text-green-400' : 'text-amber-300'
                    }`}>
                      {Math.min(user?.referralCount || 0, 4)} of 4 Referrals
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#0d140b] rounded-full overflow-hidden border border-[#22351f]">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        (user?.referralCount || 0) >= 4 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                          : 'bg-gradient-to-r from-amber-500 to-green-500'
                      }`}
                      style={{ width: `${Math.min(100, ((user?.referralCount || 0) / 4) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-[#a4bca0] leading-relaxed">
                  Share your referral code <span className="font-mono font-bold text-white bg-black/40 px-1.5 py-0.5 rounded border border-[#2c4428]">{user?.referralCode}</span>.
                  {(user?.referralCount || 0) >= 4 ? (
                    <span className="text-green-300 font-medium block mt-1">
                      ✓ Target reached ({user?.referralCount} referrals)! You can now withdraw your referral bonus to your bank account.
                    </span>
                  ) : (
                    <span className="text-amber-300 block mt-1">
                      ⚠️ One will only be able to withdraw his/her referral bonus once he/she has up to 4 referrals ({4 - (user?.referralCount || 0)} more needed).
                    </span>
                  )}
                </div>

                {/* Withdrawal button for referral */}
                <button
                  type="button"
                  onClick={() => {
                    setReferralWithdrawError('');
                    setReferralWithdrawSuccess('');
                    const avail = Math.max(0, ((user?.referralCount || 0) * 5000) - (user?.withdrawnReferralBonus || 0));
                    setReferralWithdrawAmount(String(avail));
                    setShowReferralWithdrawModal(true);
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-sm ${
                    (user?.referralCount || 0) >= 4
                      ? 'bg-gradient-to-r from-amber-500 to-green-600 hover:from-amber-400 hover:to-green-500 text-white cursor-pointer hover:shadow-green-900/40 ring-1 ring-amber-400/40'
                      : 'bg-[#1e2f1b] hover:bg-[#253921] text-amber-300 border border-amber-500/25 cursor-pointer'
                  }`}
                >
                  {(user?.referralCount || 0) >= 4 ? (
                    <>
                      <Wallet className="h-4 w-4 text-white" />
                      <span>Withdraw Referral Bonus</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1 text-white" />
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5 text-amber-400" />
                      <span>Withdraw Referral Bonus (Needs 4 Referrals)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setForceNewPledgeForm(false);
                    setShowPledgeModal(true);
                  }}
                  className="flex flex-col items-center justify-center rounded-xl bg-[#283b24] hover:bg-[#324a2d] p-4 transition-colors border border-[#375032] group relative"
                >
                  <div className="mb-2 rounded-full bg-green-500/15 p-2 text-green-400 group-hover:scale-110 transition-transform">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-white">Support</span>
                  {activePledgeMatch && (
                    <span className="mt-1 text-[10px] font-bold text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded-full border border-green-500/30">
                      Matched to Pay
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setForceNewGetHelpForm(false);
                    // If user is already matched with a payer or has pending Redeem Support, open modal to view details
                    if (activeGetHelpMatch || pendingUnmatchedGetHelp) {
                      setShowGetHelpModal(true);
                      return;
                    }

                    // Check if user has an active support
                    if (!currentGrowthPledge || (user?.totalPledged === 0 && !currentGrowthPledge)) {
                      alert('You do not have active support. You must first support African agriculture for 28 days to be eligible to Redeem Support.');
                      return;
                    }

                    // Check if support is approved by admin
                    if (!isPledgeApproved) {
                      alert('Your support is awaiting Admin Approval. The 28-day harvest dividend growth cycle begins once approved. You cannot Redeem Support until your cycle is completed.');
                      return;
                    }

                    // REQUIREMENT 5: If cycle is not completed, tell user he/she cannot redeem support until cycle is completed
                    if (daysPassed < 28) {
                      setCycleIncompleteNotice({
                        daysPassed,
                        daysRemaining: growthDaysRemaining,
                        maturityDate: maturityDateString,
                        pledgedAmount: currentGrowthPledge.amount
                      });
                      return;
                    }

                    // REQUIREMENT 8: Once cycle is completed (28 days), amount automatically appears and is locked (exact figure)
                    const exactMaturedReturn = Math.round(currentGrowthPledge.amount * 1.20);
                    setAmount(String(exactMaturedReturn));
                    setShowGetHelpModal(true);
                  }}
                  className="flex flex-col items-center justify-center rounded-xl bg-[#283b24] hover:bg-[#324a2d] p-4 transition-colors border border-[#375032] group relative"
                >
                  <div className="mb-2 rounded-full bg-amber-500/15 p-2 text-amber-400 group-hover:scale-110 transition-transform">
                    <ArrowDownLeft className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-white">Redeem Support</span>
                  {activeGetHelpMatch && (
                    <span className="mt-1 text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-full border border-amber-500/30">
                      Payer Assigned
                    </span>
                  )}
                </button>
              </div>

              {/* Direct Message Admin Action Card */}
              <button
                onClick={() => setShowSupportModal(true)}
                className="mt-3 w-full flex items-center justify-between rounded-xl bg-gradient-to-r from-[#21351e] to-[#1c2c1a] hover:from-[#2a4527] hover:to-[#223620] p-3.5 transition-all border border-[#385333] group shadow-sm"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative rounded-lg bg-green-500/20 p-2 text-green-400 group-hover:scale-105 transition-transform">
                    <MessageSquare className="h-5 w-5" />
                    {unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-black ring-2 ring-[#182416]">
                        {unreadMessages}
                      </span>
                    )}
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-semibold text-white block">Message Admin Desk</span>
                    <span className="text-xs text-[#9db299]">Upload receipts & ask questions</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#8da388] group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>

            {/* Transaction History */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-[#2e422a] bg-[#202e1c] p-6 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                <button className="text-sm text-[#9db299] hover:text-white">View All</button>
              </div>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {transactions.length === 0 ? (
                  <p className="text-sm text-[#7d9378] py-4 text-center">No transactions yet.</p>
                ) : (
                  transactions.slice(0, 8).map((tx, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-[#2e422a]/50 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center space-x-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          tx.type === 'Pledge' ? 'bg-green-500/15 text-green-400' :
                          tx.type === 'GetHelp' ? 'bg-amber-500/15 text-amber-400' :
                          tx.type === 'Deposit' ? 'bg-emerald-500/15 text-emerald-400' :
                          'bg-[#283b24] text-[#9db299]'
                        }`}>
                          {tx.type === 'Pledge' ? <ArrowUpRight className="h-4 w-4" /> :
                           tx.type === 'GetHelp' ? <ArrowDownLeft className="h-4 w-4" /> :
                           <Activity className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {tx.type === 'Pledge' ? 'Support' : tx.type === 'GetHelp' ? 'Redeem Support' : tx.type}
                          </p>
                          <p className="text-xs text-[#9db299]">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${
                          ['Deposit', 'GetHelp', 'Dividend'].includes(tx.type) ? 'text-green-400' : 'text-white'
                        }`}>
                          {['Deposit', 'GetHelp', 'Dividend'].includes(tx.type) ? '+' : '-'} {formatCurrency(tx.amount)}
                        </p>
                        <p className="text-xs text-[#7d9378]">{tx.status}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* RIGHT PANEL */}
          <div className="lg:col-span-8 space-y-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-[#2e422a] bg-[#202e1c] p-6 flex flex-col justify-between shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-[#9db299]">Total Supported</p>
                  <div className="rounded-md bg-green-500/15 p-2 text-green-400">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white">{formatCurrency(user?.totalPledged || 0)}</h3>
                <p className="mt-2 text-xs text-[#7d9378]">Funded verified agricultural farms</p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-[#2e422a] bg-[#202e1c] p-6 flex flex-col justify-between shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-[#9db299]">Total Dividend Earned</p>
                  <div className="rounded-md bg-amber-500/15 p-2 text-amber-400">
                    <ArrowDownLeft className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white">{formatCurrency(user?.totalReceived || 0)}</h3>
                <p className="mt-2 text-xs text-[#7d9378]">Total amount received from payouts</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl border border-[#2e422a] bg-[#202e1c] p-6 flex flex-col justify-between shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-[#9db299]">Active Orders</p>
                  <div className="rounded-md bg-green-500/15 p-2 text-green-400">
                    <Activity className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white">{activeOrdersCount}</h3>
                <p className="mt-2 text-xs text-[#7d9378]">Pending matches for PH/GH</p>
              </motion.div>
            </div>

            {/* 28-DAY DIVIDEND GROWTH PROGRESS BAR */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 border-green-500/40 bg-gradient-to-br from-[#1b2b19] via-[#162415] to-[#121c11] p-6 shadow-xl relative overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#283e25]">
                <div className="flex items-center space-x-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-green-600 to-amber-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
                    <Sprout className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-white tracking-tight">28-Day Dividend Growth Cycle</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        20% Dividend
                      </span>
                    </div>
                    <p className="text-xs text-[#8ca388]">
                      {isPledgeApproved 
                        ? 'Admin approved • Live daily dividend counter running'
                        : currentGrowthPledge 
                        ? 'Support submitted • Awaiting admin approval to start counting'
                        : 'Fund verified agricultural crops and start your 28-day growth cycle'}
                    </p>
                  </div>
                </div>

                <div>
                  {isPledgeApproved ? (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/40 inline-flex items-center space-x-2 shadow-sm">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span>Day {daysPassed} of 28 ({growthDaysRemaining} Days Left)</span>
                    </span>
                  ) : currentGrowthPledge ? (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center space-x-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                      <span>Pending Admin Approval</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => { setForceNewPledgeForm(false); setShowPledgeModal(true); }}
                      className="px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all shadow"
                    >
                      + Start 28-Day Support
                    </button>
                  )}
                </div>
              </div>

              {allUserPledges.length > 1 && (
                <div className="flex items-center space-x-2 overflow-x-auto pb-3 mb-2">
                  {allUserPledges.map((p: any, idx: number) => (
                    <button
                      key={p._id || idx}
                      onClick={() => setSelectedGrowthPledgeIdx(idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        selectedGrowthPledgeIdx === idx
                          ? 'bg-green-600 text-white shadow'
                          : 'bg-[#142013] text-[#9db299] hover:text-white border border-[#233520]'
                      }`}
                    >
                      Support #{idx + 1} ({formatCurrency(p.amount)}) - {p.status}
                    </button>
                  ))}
                </div>
              )}

              {currentGrowthPledge ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#c2d3bd] flex items-center space-x-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                        <span>Growth Progress: {growthProgressPercent}% Completed</span>
                      </span>
                      <span className="font-mono font-bold text-amber-400">
                        {isPledgeApproved ? `${daysPassed} / 28 Days` : '0 / 28 Days (On Hold)'}
                      </span>
                    </div>

                    <div className="w-full h-5 rounded-full bg-[#0d160c] border border-[#283e25] p-0.5 relative overflow-hidden shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${growthProgressPercent}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-full rounded-full transition-all relative ${
                          isPledgeApproved
                            ? 'bg-gradient-to-r from-emerald-500 via-green-400 to-amber-400 shadow-lg'
                            : 'bg-amber-500/30'
                        }`}
                      >
                        {isPledgeApproved && (
                          <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
                        )}
                      </motion.div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#7d9378] pt-1 px-1">
                      <span className="flex items-center space-x-1">
                        <span>🌱 Day 1: Planting</span>
                      </span>
                      <span className="flex items-center space-x-1 text-center">
                        <span>🌿 Day 14: Mid-Cycle</span>
                      </span>
                      <span className="flex items-center space-x-1 font-semibold text-amber-300">
                        <span>🚜 Day 28: Harvest Payout</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-[#121c11] border border-[#253922] p-3 rounded-xl">
                      <span className="text-[10px] uppercase font-semibold text-[#7d9378] block">Supported Capital</span>
                      <span className="text-sm font-bold text-white mt-0.5 block">{formatCurrency(currentGrowthPledge.amount)}</span>
                    </div>

                    <div className="bg-[#121c11] border border-[#253922] p-3 rounded-xl">
                      <span className="text-[10px] uppercase font-semibold text-[#7d9378] block">Accrued Profit</span>
                      <span className="text-sm font-bold text-green-400 mt-0.5 block">
                        +{formatCurrency(growthAccruedDividend)}
                      </span>
                    </div>

                    <div className="bg-[#121c11] border border-[#253922] p-3 rounded-xl">
                      <span className="text-[10px] uppercase font-semibold text-[#7d9378] block">Expected (20%)</span>
                      <span className="text-sm font-bold text-amber-400 mt-0.5 block">
                        +{formatCurrency(growthExpectedDividend)}
                      </span>
                    </div>

                    <div className="bg-[#121c11] border border-[#253922] p-3 rounded-xl">
                      <span className="text-[10px] uppercase font-semibold text-[#7d9378] block">Maturity Date</span>
                      <span className="text-xs font-semibold text-[#d4e4d0] mt-1 block truncate">
                        {maturityDateString}
                      </span>
                    </div>
                  </div>

                  {!isPledgeApproved && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 flex-shrink-0 text-amber-400" />
                        <span>
                          Support awaiting Admin Approval. Once approved, the 28-day dividend progress bar will begin counting!
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSupportModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600 text-white font-bold text-xs whitespace-nowrap transition-colors self-start sm:self-auto"
                      >
                        Message Admin Desk
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center space-y-3">
                  <p className="text-sm text-[#b5cab2]">
                    No active support yet. Fund African agriculture to activate your <span className="font-bold text-amber-400">28-day dividend progress bar</span> and receive up to <span className="font-bold text-green-400">20% return</span>!
                  </p>
                  <button
                    type="button"
                    onClick={() => { setForceNewPledgeForm(false); setShowPledgeModal(true); }}
                    className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center space-x-2"
                  >
                    <Sprout className="h-4 w-4" />
                    <span>Support & Start 28-Day Counter</span>
                  </button>
                </div>
              )}
            </motion.div>

            {/* P2P MATCH NOTIFICATIONS & QUICK ACCESS BANNER */}
            {(activePledgeMatch || activeGetHelpMatch || pendingUnmatchedPledge || pendingUnmatchedGetHelp || !user?.bankName) && (
              <div className="space-y-3">
                {/* When user is matched to pay someone */}
                {activePledgeMatch && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-[#172715] to-[#121e11] border border-green-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-xl bg-green-500/20 text-green-400 mt-0.5">
                        <ArrowUpRight className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-green-400">
                            Matched Payment Required
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            activePledgeMatch.status === 'Confirmed' ? 'bg-green-500/20 text-green-300' :
                            activePledgeMatch.status === 'Paid' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-yellow-500/20 text-yellow-300'
                          }`}>
                            {activePledgeMatch.status === 'Pending' ? 'Action Required' : activePledgeMatch.status}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white mt-0.5">
                          You are matched to pay <span className="text-green-300">{activePledgeMatch.receiverName}</span> {formatCurrency(activePledgeMatch.amount)}
                        </p>
                        <p className="text-xs text-[#8ca388]">
                          Bank: {activePledgeMatch.receiverBankName || 'Access Bank'} • Acc: {activePledgeMatch.receiverAccountNumber}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForceNewPledgeForm(false);
                        setShowPledgeModal(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs shadow transition-all flex items-center space-x-1 whitespace-nowrap self-stretch sm:self-auto justify-center"
                    >
                      <span>View Account to Pay</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                )}

                {/* When user has been assigned a payer for Redeem Support */}
                {activeGetHelpMatch && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-[#261f14] to-[#1a1711] border border-amber-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 mt-0.5">
                        <ArrowDownLeft className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                            Payer Matched for Payout
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            activeGetHelpMatch.status === 'Confirmed' ? 'bg-green-500/20 text-green-300' :
                            activeGetHelpMatch.status === 'Paid' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-yellow-500/20 text-yellow-300'
                          }`}>
                            {activeGetHelpMatch.status === 'Pending' ? 'Payer Assigned' : activeGetHelpMatch.status}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white mt-0.5">
                          <span className="text-amber-300">{activeGetHelpMatch.pledgerName || 'Assigned User'}</span> is scheduled to pay you {formatCurrency(activeGetHelpMatch.amount)}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-[#b8ccb4]">Payer Phone:</span>
                          <span className="font-mono text-xs font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded border border-amber-500/30">
                            {activeGetHelpMatch.pledgerPhone || 'Phone Not Added'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 self-stretch sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setForceNewGetHelpForm(false);
                          setShowGetHelpModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition-all flex items-center justify-center space-x-1 whitespace-nowrap w-full sm:w-auto"
                      >
                        <span>View Payer Phone & Details</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>

                      {activeGetHelpMatch.status !== 'Confirmed' && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmHelpMatch(activeGetHelpMatch);
                            setShowConfirmHelpModal(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold text-xs shadow transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap w-full sm:w-auto border border-green-500/30"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-green-300" />
                          <span>Confirm Support Received to Admin</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Bank account setup reminder */}
                {!user?.bankName && (
                  <div className="p-3.5 rounded-xl bg-[#1a2b18]/70 border border-[#2e472a] flex items-center justify-between text-xs text-[#a3bba0]">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-green-400" />
                      <span>Add your bank account details so matched supporters can pay you directly.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBankDetailsModal(true)}
                      className="text-amber-400 hover:underline font-semibold ml-2 whitespace-nowrap"
                    >
                      Set Bank Details →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Informational Graphic or Stats Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-[#2e422a] bg-[#202e1c] p-8 min-h-[300px] flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm"
            >
              <div className="absolute inset-0 z-0 bg-gradient-to-br from-green-900/10 via-transparent to-emerald-950/20 pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="h-16 w-16 rounded-full bg-[#2b3e26] flex items-center justify-center mb-4 border border-[#3b5235]">
                  <Sprout className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Grow Wealth Through Agriculture</h3>
                <p className="text-[#c2d3bd] max-w-md mx-auto">
                  When you provide support, you are directly funding African farmers. After a successful harvest cycle (28 days), you receive your capital back along with up to 20% dividend.
                </p>
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl">
                  <div className="text-center">
                    <p className="text-amber-400 font-bold text-lg">20%</p>
                    <p className="text-xs text-[#7d9378] uppercase font-semibold">Max Dividend</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-400 font-bold text-lg">28 Days</p>
                    <p className="text-xs text-[#7d9378] uppercase font-semibold">Growth Cycle</p>
                  </div>
                  <div className="text-center">
                    <p className="text-amber-400 font-bold text-lg">100%</p>
                    <p className="text-xs text-[#7d9378] uppercase font-semibold">Verified Farms</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* MODALS */}
      <AnimatePresence>
        {showPledgeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-[#2e422a] bg-[#1a2818] p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#283e25]">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                    <Sprout className="h-5 w-5 text-green-400" />
                    <span>{activePledgeMatch && !forceNewPledgeForm ? 'Matched Payment Details' : 'Support (Fund Farm)'}</span>
                  </h3>
                  <p className="text-xs text-[#8ca388] mt-0.5">
                    {activePledgeMatch && !forceNewPledgeForm 
                      ? 'Transfer funds directly to the verified farm/recipient account below'
                      : 'Support African agriculture and earn 20% in 28 days'}
                  </p>
                </div>
                <button onClick={() => setShowPledgeModal(false)} className="text-[#9db299] hover:text-white p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {modalError && (
                <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                  {modalError}
                </div>
              )}

              {/* VIEW 1: MATCHED PAYMENT DETAILS */}
              {activePledgeMatch && !forceNewPledgeForm ? (
                <div className="space-y-5">
                  {/* Tabs if user has multiple matched orders */}
                  {matches.asPledger && matches.asPledger.length > 1 && (
                    <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                      {matches.asPledger.map((m, idx) => (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => setSelectedPledgeIdx(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                            selectedPledgeIdx === idx 
                              ? 'bg-green-600 text-white shadow' 
                              : 'bg-[#142013] text-[#9db299] hover:text-white border border-[#233520]'
                          }`}
                        >
                          Payment #{idx + 1} ({formatCurrency(m.amount)})
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl border border-green-500/30 bg-[#142013] p-4 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-green-400 uppercase tracking-wide flex items-center space-x-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>You Have Been Matched To Pay</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activePledgeMatch.status === 'Confirmed' ? 'bg-green-500/20 text-green-300' :
                        activePledgeMatch.status === 'Paid' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {activePledgeMatch.status === 'Pending' ? 'Awaiting Your Transfer' : activePledgeMatch.status}
                      </span>
                    </div>
                    <p className="text-[#95ab91]">
                      Please pay <span className="font-bold text-white text-sm">{formatCurrency(activePledgeMatch.amount)}</span> into the recipient account below.
                    </p>
                  </div>

                  {/* Account Details Box */}
                  <div className="rounded-2xl border border-[#2e452a] bg-[#121c11] p-5 space-y-3.5">
                    <div>
                      <span className="text-[11px] uppercase font-semibold text-[#768c73] block mb-0.5">Recipient Full Name</span>
                      <span className="text-base font-bold text-white">{activePledgeMatch.receiverName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#223520]">
                      <div>
                        <span className="text-[11px] uppercase font-semibold text-[#768c73] block mb-0.5">Bank Name</span>
                        <span className="text-sm font-bold text-amber-400 flex items-center space-x-1">
                          <Building className="h-3.5 w-3.5" />
                          <span>{activePledgeMatch.receiverBankName || 'Access Bank'}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] uppercase font-semibold text-[#768c73] block mb-0.5">Account Number</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-base font-mono font-bold text-white">{activePledgeMatch.receiverAccountNumber}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(activePledgeMatch.receiverAccountNumber, 'accNo')}
                            className="p-1 rounded bg-[#20311f] hover:bg-[#2c442b] text-[#9db299] hover:text-white"
                            title="Copy Account Number"
                          >
                            {copiedKey === 'accNo' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#223520]">
                      <span className="text-[11px] uppercase font-semibold text-[#768c73] block mb-0.5">Account Name</span>
                      <span className="text-sm font-semibold text-[#d4e4d0]">{activePledgeMatch.receiverAccountName || activePledgeMatch.receiverName}</span>
                    </div>

                    <div className="pt-2 border-t border-[#223520] flex items-center justify-between">
                      <div>
                        <span className="text-[11px] uppercase font-semibold text-[#768c73] block mb-0.5">Recipient Phone</span>
                        <span className="text-sm font-mono text-white font-medium">{activePledgeMatch.receiverPhone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={`tel:${activePledgeMatch.receiverPhone}`}
                          className="px-2.5 py-1.5 rounded-lg bg-[#1e2f1b] border border-[#2d4429] hover:border-green-500/50 text-xs text-green-300 font-medium flex items-center space-x-1"
                        >
                          <Phone className="h-3 w-3" />
                          <span>Call</span>
                        </a>
                        <a
                          href={`https://wa.me/${(activePledgeMatch.receiverPhone || '').replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-green-700/40 border border-green-600/40 hover:bg-green-700 text-xs text-white font-medium"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Payment Confirmation & Proof of Payment (POP) Dropping */}
                  {activePledgeMatch.status === 'Pending' && (
                    <div className="rounded-2xl border-2 border-green-500/40 bg-[#162315] p-5 space-y-4 shadow-lg">
                      <div className="flex items-center space-x-2 text-white font-bold text-sm">
                        <ShieldCheck className="h-5 w-5 text-green-400" />
                        <span>Drop Proof of Payment (POP) for Admin Confirmation</span>
                      </div>
                      <p className="text-xs text-[#a4bca0]">
                        After transferring funds directly to {activePledgeMatch.receiverName}, upload your payment receipt below so DAPOSI Admin can verify and approve your 28-day growth cycle.
                      </p>

                      <div>
                        <label className="block text-xs font-semibold text-white mb-1.5">
                          1. Upload Transfer Receipt / Screenshot
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleProofImageSelect(e.target.files[0])}
                          className="w-full text-xs text-[#8ca388] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-green-600 file:text-white hover:file:bg-green-500 cursor-pointer"
                        />
                        {proofImage && (
                          <div className="mt-2 flex items-center justify-between text-xs text-green-400 bg-black/40 p-2.5 rounded-xl border border-green-500/30">
                            <div className="flex items-center space-x-2 truncate">
                              <ImageIcon className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{proofImage.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setProofImage(null)}
                              className="text-red-400 hover:text-red-300 text-[11px] font-bold ml-2"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-white mb-1.5">
                          2. Transfer Session ID / Reference Note for Admin
                        </label>
                        <input
                          type="text"
                          value={popNote}
                          onChange={(e) => setPopNote(e.target.value)}
                          placeholder="e.g. Session ID 102938102, transferred from GTBank"
                          className="w-full rounded-xl border border-[#2e422a] bg-[#121c11] py-2.5 px-3.5 text-xs text-white placeholder-[#6d8268] focus:border-green-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={matchActionLoading}
                        onClick={() => handleDropPOP(activePledgeMatch._id)}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center space-x-2"
                      >
                        {matchActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        <span>Drop Proof of Payment (POP) to Admin</span>
                      </button>
                    </div>
                  )}

                  {activePledgeMatch.status === 'Paid' && (
                    <div className="rounded-2xl border border-amber-500/40 bg-[#1a2516] p-4 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
                        <Clock className="h-4 w-4 flex-shrink-0 text-amber-400 animate-spin" />
                        <span>Proof of Payment Dropped • Awaiting Admin Confirmation</span>
                      </div>
                      <p className="text-xs text-[#a4bca0]">
                        Your payment receipt has been submitted to the Admin Desk and recipient. Once DAPOSI Admin confirms the proof, your 28-day harvest dividend counter will immediately begin counting!
                      </p>
                      {activePledgeMatch.paymentProof && (
                        <div className="flex items-center space-x-3 p-2 rounded-lg bg-black/40">
                          <img
                            src={activePledgeMatch.paymentProof}
                            alt="Receipt"
                            className="h-12 w-12 rounded object-cover cursor-pointer border border-amber-500/30"
                            onClick={() => setPreviewImageLightbox(activePledgeMatch.paymentProof)}
                          />
                          <div className="text-xs">
                            <span className="font-semibold text-white block">Receipt Attached</span>
                            <button
                              type="button"
                              onClick={() => setPreviewImageLightbox(activePledgeMatch.paymentProof)}
                              className="text-amber-400 hover:underline text-[11px]"
                            >
                              Click to view uploaded receipt
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activePledgeMatch.status === 'Confirmed' && (
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-xs flex items-center space-x-2.5">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-400" />
                      <span>Proof of Payment confirmed by Admin! Your 28-day agricultural dividend growth cycle is officially running.</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setForceNewPledgeForm(true)}
                      className="text-xs font-semibold text-amber-400 hover:underline"
                    >
                      + Support Another Amount
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPledgeModal(false)}
                      className="px-4 py-2 rounded-xl bg-[#20311f] hover:bg-[#293e28] text-xs font-semibold text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : !activePledgeMatch && !forceNewPledgeForm && pendingUnmatchedPledge ? (
                /* VIEW 2: PENDING AWAITING MATCH */
                <div className="space-y-4">
                  <div className="rounded-xl border border-yellow-500/30 bg-[#142013] p-4 text-xs space-y-2">
                    <div className="flex items-center space-x-2 text-yellow-400 font-bold text-sm">
                      <Clock className="h-4 w-4" />
                      <span>Your Support is Awaiting Admin Matching</span>
                    </div>
                    <p className="text-[#c2d3bd]">
                      You supported <span className="font-bold text-white text-sm">{formatCurrency(pendingUnmatchedPledge.amount)}</span>. 
                      The DAPOSI administrator is pairing your support with a recipient farmer/user.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#121c11] border border-[#2b3e27] text-xs text-[#9db299] space-y-2">
                    <p className="font-bold text-white">Who are you going to pay?</p>
                    <p>Once matched, the recipient's verified account details (Name, Bank Name, Account Number, and Phone Number) will appear right here under <strong>"Support"</strong>.</p>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setForceNewPledgeForm(true)}
                      className="text-xs font-semibold text-amber-400 hover:underline"
                    >
                      + Support Another Amount
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPledgeModal(false)}
                      className="px-4 py-2 rounded-xl bg-[#20311f] hover:bg-[#293e28] text-xs font-semibold text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                /* VIEW 3: NEW SUPPORT FORM */
                <form onSubmit={handlePledge}>
                  {(activePledgeMatch || pendingUnmatchedPledge) && (
                    <button
                      type="button"
                      onClick={() => setForceNewPledgeForm(false)}
                      className="mb-4 text-xs text-green-400 hover:underline flex items-center space-x-1"
                    >
                      <span>← Back to Matched / Queued Support</span>
                    </button>
                  )}

                  <label className="block text-sm font-medium text-[#c2d3bd] mb-2">Amount to Support (NGN)</label>
                  <div className="relative mb-6">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7d9378] font-medium">₦</span>
                    <input
                      type="number"
                      required
                      min="20000"
                      max="20000000"
                      className="w-full rounded-xl border border-[#2e422a] bg-[#141d12] py-3 pl-10 pr-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                      placeholder="20,000 - 20,000,000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="mb-6 rounded-lg bg-[#141d12] p-4 border border-[#2e422a]">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[#9db299]">Expected Dividend:</span>
                      <span className="font-semibold text-green-400">+{formatCurrency(Number(amount || 0) * 0.20)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#9db299]">Total Return (28 Days):</span>
                      <span className="font-bold text-amber-400">{formatCurrency(Number(amount || 0) * 1.20)}</span>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition-colors shadow-md"
                  >
                    {modalLoading ? 'Processing...' : 'Confirm Support'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {showGetHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-[#2e422a] bg-[#1a2818] p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#283e25]">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                    <ArrowDownLeft className="h-5 w-5 text-amber-400" />
                    <span>{activeGetHelpMatch && !forceNewGetHelpForm ? 'Matched Payout & Payer Details' : 'Redeem Support (Request Payout)'}</span>
                  </h3>
                  <p className="text-xs text-[#8ca388] mt-0.5">
                    {activeGetHelpMatch && !forceNewGetHelpForm 
                      ? 'Review who has been assigned to pay your harvest dividend'
                      : 'Withdraw your capital and dividends into your bank account'}
                  </p>
                </div>
                <button onClick={() => setShowGetHelpModal(false)} className="text-[#9db299] hover:text-white p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {modalError && (
                <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                  {modalError}
                </div>
              )}

              {/* VIEW 1: MATCHED PAYER DETAILS WITH PHONE NUMBER */}
              {activeGetHelpMatch && !forceNewGetHelpForm ? (
                <div className="space-y-5">
                  {/* Tabs if user has multiple matched payouts */}
                  {matches.asReceiver && matches.asReceiver.length > 1 && (
                    <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                      {matches.asReceiver.map((m, idx) => (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => setSelectedGetHelpIdx(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                            selectedGetHelpIdx === idx 
                              ? 'bg-amber-600 text-white shadow' 
                              : 'bg-[#142013] text-[#9db299] hover:text-white border border-[#233520]'
                          }`}
                        >
                          Payout #{idx + 1} ({formatCurrency(m.amount)})
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl border border-amber-500/30 bg-[#162315] p-4 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400 uppercase tracking-wide flex items-center space-x-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Your Payout Is Matched!</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activeGetHelpMatch.status === 'Confirmed' ? 'bg-green-500/20 text-green-300' :
                        activeGetHelpMatch.status === 'Paid' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {activeGetHelpMatch.status === 'Pending' ? 'Payer Matched' : activeGetHelpMatch.status}
                      </span>
                    </div>
                    <p className="text-[#c2d3bd]">
                      Amount to receive: <span className="font-bold text-white text-sm">{formatCurrency(activeGetHelpMatch.amount)}</span>
                    </p>
                  </div>

                  {/* HIGHLIGHTED PAYER DETAILS & PHONE NUMBER */}
                  <div className="rounded-2xl border-2 border-amber-500/40 bg-[#121c11] p-5 space-y-4 shadow-lg">
                    <div>
                      <span className="text-[11px] uppercase font-bold text-[#8ca388] block mb-1">
                        PERSON WHO WILL PAY YOU
                      </span>
                      <span className="text-lg font-bold text-white">{activeGetHelpMatch.pledgerName || 'Assigned Pledger'}</span>
                    </div>

                    {/* VERY PROMINENT PHONE NUMBER BOX AS REQUESTED */}
                    <div className="rounded-xl bg-[#1b2b1a] border border-amber-500/50 p-4 space-y-2">
                      <span className="text-xs font-semibold text-amber-400 block">
                        Payer's Contact Phone Number:
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black font-mono text-white tracking-wide">
                          {activeGetHelpMatch.pledgerPhone || 'Phone Not Added'}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(activeGetHelpMatch.pledgerPhone, 'payerPhone')}
                          className="p-2 rounded-lg bg-[#273d25] hover:bg-[#324f2f] text-white"
                          title="Copy Phone Number"
                        >
                          {copiedKey === 'payerPhone' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>

                      {activeGetHelpMatch.pledgerPhone && (
                        <div className="flex items-center space-x-2 pt-2">
                          <a
                            href={`tel:${activeGetHelpMatch.pledgerPhone}`}
                            className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>Call Payer</span>
                          </a>
                          <a
                            href={`https://wa.me/${(activeGetHelpMatch.pledgerPhone || '').replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-2 rounded-lg bg-[#203a1d] hover:bg-[#284924] border border-green-500/40 text-green-300 font-bold text-xs flex items-center justify-center space-x-1.5"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Recipient's Own Account confirmation */}
                    <div className="text-xs text-[#8ca388] border-t border-[#233520] pt-3 flex items-center justify-between">
                      <div>
                        <span>Payment destination: </span>
                        <span className="font-semibold text-white">
                          {user?.bankName ? `${user.bankName} (${user.accountNumber})` : 'Your Registered Bank'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setShowGetHelpModal(false); setShowBankDetailsModal(true); }}
                        className="text-amber-400 hover:underline text-[11px]"
                      >
                        Update Bank
                      </button>
                    </div>
                  </div>

                  {/* Payment Status & Receipt Preview */}
                  {activeGetHelpMatch.status === 'Paid' && (
                    <div className="rounded-xl border border-green-500/40 bg-[#162315] p-4 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-green-300">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Payer Has Marked Payment as Completed!</span>
                      </div>
                      <p className="text-xs text-[#b8ccb4]">
                        Please check your bank account. Once you verify the funds have landed, click the confirmation button below.
                      </p>

                      {activeGetHelpMatch.paymentProof && (
                        <div className="flex items-center space-x-3 p-2 rounded-lg bg-black/40">
                          <img
                            src={activeGetHelpMatch.paymentProof}
                            alt="Proof"
                            className="h-12 w-12 rounded object-cover cursor-pointer border border-green-500/40"
                            onClick={() => setPreviewImageLightbox(activeGetHelpMatch.paymentProof)}
                          />
                          <div className="text-xs">
                            <span className="font-semibold text-white block">Payment Receipt Uploaded</span>
                            <button
                              type="button"
                              onClick={() => setPreviewImageLightbox(activeGetHelpMatch.paymentProof)}
                              className="text-amber-400 hover:underline text-[11px]"
                            >
                              Click to view full receipt
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={matchActionLoading}
                        onClick={() => handleConfirmReceipt(activeGetHelpMatch._id)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
                      >
                        {matchActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        <span>Confirm Payment Received</span>
                      </button>
                    </div>
                  )}

                  {activeGetHelpMatch.status === 'Pending' && (
                    <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs">
                      <Clock className="h-4 w-4 inline mr-1.5" />
                      <span>Awaiting transfer from payer. You can call or message them on the phone number above to coordinate.</span>
                    </div>
                  )}

                  {activeGetHelpMatch.status === 'Confirmed' && (
                    <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-xs flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      <span>Payment confirmed and completed! Total received has been updated.</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setForceNewGetHelpForm(true)}
                      className="text-xs font-semibold text-amber-400 hover:underline"
                    >
                      + Request Another Redeem Support
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowGetHelpModal(false)}
                      className="px-4 py-2 rounded-xl bg-[#20311f] hover:bg-[#293e28] text-xs font-semibold text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : !activeGetHelpMatch && !forceNewGetHelpForm && pendingUnmatchedGetHelp ? (
                /* VIEW 2: PENDING AWAITING PAYER MATCH */
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-500/30 bg-[#162315] p-4 text-xs space-y-2">
                    <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                      <Clock className="h-4 w-4" />
                      <span>Your Payout Request is Awaiting Payer Assignment</span>
                    </div>
                    <p className="text-[#c2d3bd]">
                      You requested <span className="font-bold text-white text-sm">{formatCurrency(pendingUnmatchedGetHelp.amount)}</span>. 
                      The DAPOSI administrator is currently pairing your request with a verified pledger.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#121c11] border border-[#2b3e27] text-xs text-[#9db299] space-y-2">
                    <p className="font-bold text-amber-400">Phone Number of Who Will Pay You:</p>
                    <p>As soon as the admin assigns a payer, their name and <strong>Contact Phone Number</strong> will be displayed right here so you can call or WhatsApp them to coordinate and confirm your payment!</p>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setForceNewGetHelpForm(true)}
                      className="text-xs font-semibold text-amber-400 hover:underline"
                    >
                      + Request Another Redeem Support
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowGetHelpModal(false)}
                      className="px-4 py-2 rounded-xl bg-[#20311f] hover:bg-[#293e28] text-xs font-semibold text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                /* VIEW 3: REDEEM SUPPORT REQUEST FORM (LOCKED EXACT FIGURE) */
                <form onSubmit={handleGetHelp}>
                  {(activeGetHelpMatch || pendingUnmatchedGetHelp) && (
                    <button
                      type="button"
                      onClick={() => setForceNewGetHelpForm(false)}
                      className="mb-4 text-xs text-amber-400 hover:underline flex items-center space-x-1"
                    >
                      <span>← Back to Matched / Queued Payout</span>
                    </button>
                  )}

                  <div className="mb-4 rounded-xl bg-green-500/15 border border-green-500/30 p-3.5 text-xs text-green-300 flex items-start space-x-2.5">
                    <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-sm text-white">28-Day Harvest Growth Cycle Completed!</span>
                      <span>Your payout amount is automatically calculated and locked to your exact guaranteed return (Capital + 20% Dividend). Extra figures cannot be added.</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-[#c2d3bd]">Matured Payout Amount (NGN)</label>
                    <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                      🔒 Exact Locked Figure
                    </span>
                  </div>
                  <div className="relative mb-4">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400 font-bold text-lg">₦</span>
                    <input
                      type="number"
                      required
                      readOnly
                      className="w-full rounded-xl border-2 border-green-500/50 bg-[#121c11] py-3.5 pl-10 pr-4 text-white font-mono font-bold text-xl cursor-not-allowed select-none focus:outline-none"
                      value={amount || String(Math.round((currentGrowthPledge?.amount || 0) * 1.20))}
                    />
                  </div>

                  <div className="mb-6 rounded-xl bg-[#141d12] p-4 border border-[#2e422a] space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#9db299]">Supported Agricultural Capital:</span>
                      <span className="font-semibold text-white">{formatCurrency(currentGrowthPledge?.amount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#9db299]">20% Harvest Dividend:</span>
                      <span className="font-bold text-green-400">+{formatCurrency((currentGrowthPledge?.amount || 0) * 0.20)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-[#223520] pt-2">
                      <span className="text-[#9db299] font-bold">Total Guaranteed Matured Return:</span>
                      <span className="font-black text-amber-400 text-sm">{formatCurrency((currentGrowthPledge?.amount || 0) * 1.20)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#223520] pt-2 text-xs">
                      <span className="text-[#7d9378]">Payout Account:</span>
                      <span className="font-semibold text-white">
                        {user?.bankName ? `${user.bankName} (${user.accountNumber})` : 'No bank set'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowBankDetailsModal(true)}
                        className="text-amber-400 hover:underline text-[11px]"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 py-3.5 font-bold text-white shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {modalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownLeft className="h-4 w-4" />}
                    <span>Redeem Support ({formatCurrency(Number(amount || (currentGrowthPledge?.amount || 0) * 1.20))})</span>
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {/* INCOMPLETE CYCLE NOTICE MODAL */}
        {cycleIncompleteNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border-2 border-amber-500/50 bg-[#1e2a1b] p-6 shadow-2xl text-center space-y-4"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Clock className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-white">Harvest Growth Cycle Not Completed</h3>
              
              <div className="p-4 rounded-xl bg-[#131d11] border border-amber-500/30 text-left space-y-2 text-xs">
                <p className="text-amber-300 font-semibold leading-relaxed">
                  You cannot Redeem Support until your 28-day harvest growth cycle is completed!
                </p>
                <div className="border-t border-[#233520] pt-2 space-y-1.5 text-[#b9ccb6]">
                  <div className="flex justify-between">
                    <span>Current Cycle Status:</span>
                    <span className="font-bold text-white font-mono">Day {cycleIncompleteNotice.daysPassed} of 28</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Days Remaining:</span>
                    <span className="font-bold text-amber-400 font-mono">{cycleIncompleteNotice.daysRemaining} Days Left</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maturity Date:</span>
                    <span className="font-bold text-white">{cycleIncompleteNotice.maturityDate}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#233520] pt-1.5">
                    <span>Expected Return at Maturity (20%):</span>
                    <span className="font-bold text-green-400">{formatCurrency(cycleIncompleteNotice.pledgedAmount * 1.20)}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#8da388]">
                Please wait for the full 28-day cycle to mature. Once matured, you will be able to request your capital + 20% dividend with one click!
              </p>

              <button
                type="button"
                onClick={() => setCycleIncompleteNotice(null)}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm shadow transition-all"
              >
                I Understand (Return to Dashboard)
              </button>
            </motion.div>
          </div>
        )}

        {/* CONFIRM HELP RECEIVED TO ADMIN MODAL */}
        {showConfirmHelpModal && confirmHelpMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border-2 border-green-500/50 bg-[#1a2818] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#283e25]">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-green-500/20 text-green-400">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Confirm Support Received to Admin</h3>
                    <p className="text-xs text-[#8ca388]">Verify receipt & complete your 28-day harvest cycle</p>
                  </div>
                </div>
                <button onClick={() => setShowConfirmHelpModal(false)} className="text-[#9db299] hover:text-white p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#121c11] border border-green-500/30 text-xs space-y-2">
                <p className="text-[#c2d3bd]">
                  Please confirm that you have checked your registered bank account and received the funds:
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[#8ca388]">Amount Received:</span>
                  <span className="text-base font-bold text-green-400">{formatCurrency(confirmHelpMatch.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8ca388]">Payer:</span>
                  <span className="font-semibold text-white">{confirmHelpMatch.pledgerName || 'Assigned Pledger'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8ca388]">Receiving Account:</span>
                  <span className="font-mono text-white">{user?.bankName} ({user?.accountNumber})</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Confirmation Note / Bank Reference for Admin (Optional)
                </label>
                <input
                  type="text"
                  value={confirmHelpNote}
                  onChange={(e) => setConfirmHelpNote(e.target.value)}
                  placeholder="e.g. Verified in my bank app, thanks DAPOSI!"
                  className="w-full rounded-xl border border-[#2e422a] bg-[#121c11] py-2.5 px-3.5 text-xs text-white placeholder-[#6d8268] focus:border-green-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <span>⚠️ Note: Once confirmed, this 28-day cycle will be finalized as paid, and your dashboard will refresh to <strong>₦0</strong> until you provide support again.</span>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmHelpModal(false)}
                  className="flex-1 py-3 rounded-xl bg-[#233520] hover:bg-[#2e452a] text-white font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={matchActionLoading}
                  onClick={() => handleConfirmHelpToAdmin(confirmHelpMatch._id)}
                  className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs shadow transition-all flex items-center justify-center space-x-2"
                >
                  {matchActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>Confirm to Admin (Refresh to ₦0)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Referral Bonus Withdrawal Modal */}
        {showReferralWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-[#2e422a] bg-[#1a2817] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2e422a]">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Withdraw Referral Bonus</h3>
                    <p className="text-xs text-[#8ca388]">DAPOSI Agricultural Partner Reward</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReferralWithdrawModal(false)}
                  className="rounded-lg p-1 text-[#8ca388] hover:bg-[#253822] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Requirement Check: If user has less than 4 referrals */}
              {(user?.referralCount || 0) < 4 ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 ring-4 ring-amber-500/10">
                      <Lock className="h-6 w-6" />
                    </div>
                    <h4 className="text-sm font-bold text-amber-300">Referral Withdrawal Locked</h4>
                    <p className="text-xs text-[#c2d3bd] leading-relaxed">
                      One will only be able to withdraw his/her referral bonus once he/she has <strong>up to 4 referrals</strong>.
                    </p>
                  </div>

                  {/* Progress detail */}
                  <div className="bg-[#121c10] border border-[#243720] rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#8ca388]">Current Referrals:</span>
                      <span className="font-bold text-amber-300 font-mono">{user?.referralCount || 0} / 4 Referrals</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#8ca388]">Referrals Needed to Unlock:</span>
                      <span className="font-bold text-white">{4 - (user?.referralCount || 0)} more referral{(4 - (user?.referralCount || 0)) === 1 ? '' : 's'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#8ca388]">Accrued Bonus:</span>
                      <span className="font-bold text-green-400 font-mono">₦{(((user?.referralCount || 0) * 5000)).toLocaleString()}</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="pt-1">
                      <div className="h-2.5 w-full bg-[#0a1109] rounded-full overflow-hidden border border-[#243720]">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-green-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, ((user?.referralCount || 0) / 4) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Share Referral Code Section */}
                  <div className="bg-[#142012] border border-[#283e24] rounded-xl p-3.5 space-y-2">
                    <span className="text-xs font-semibold text-white block">Share Your Referral Code</span>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-black/40 border border-[#2f492a] px-3 py-2 rounded-lg font-mono font-bold text-amber-300 text-sm tracking-wide">
                        {user?.referralCode || 'N/A'}
                      </div>
                      <button
                        type="button"
                        onClick={() => user?.referralCode && copyToClipboard(user.referralCode, 'refModalCode')}
                        className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        {copiedKey === 'refModalCode' ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#8ca388]">
                      Invite {4 - (user?.referralCount || 0)} more farmer{(4 - (user?.referralCount || 0)) === 1 ? '' : 's'} to register using your code to unlock instant withdrawal of your referral rewards!
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowReferralWithdrawModal(false)}
                    className="w-full py-2.5 rounded-xl bg-[#283c24] hover:bg-[#344e2f] text-white text-xs font-semibold transition-colors"
                  >
                    Got It, Close
                  </button>
                </div>
              ) : (
                /* Eligible (>= 4 Referrals) */
                <form onSubmit={handleReferralWithdraw} className="space-y-4">
                  {referralWithdrawError && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{referralWithdrawError}</span>
                    </div>
                  )}

                  {referralWithdrawSuccess && (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-300 flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                      <span>{referralWithdrawSuccess}</span>
                    </div>
                  )}

                  {/* Qualified Status Banner */}
                  <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-xs flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="font-semibold text-green-300">Requirement Met ({user?.referralCount} Referrals)</span>
                    </div>
                    <span className="text-[10px] font-mono text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full border border-green-500/30">
                      Eligible (≥ 4)
                    </span>
                  </div>

                  {/* Balances Card */}
                  <div className="grid grid-cols-3 gap-2 bg-[#121c10] border border-[#243720] rounded-xl p-3 text-center">
                    <div>
                      <span className="text-[10px] text-[#8ca388] block">Total Earned</span>
                      <span className="text-xs font-bold text-white font-mono">
                        ₦{(user?.totalReferralBonus !== undefined ? user.totalReferralBonus : (user?.referralCount || 0) * (user?.referralBonusPerUser || 9000)).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8ca388] block">Withdrawn</span>
                      <span className="text-xs font-bold text-amber-300 font-mono">
                        ₦{(user?.withdrawnReferralBonus || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8ca388] block">Available</span>
                      <span className="text-xs font-bold text-green-400 font-mono">
                        ₦{(user?.availableReferralBonus !== undefined ? user.availableReferralBonus : Math.max(0, ((user?.referralCount || 0) * (user?.referralBonusPerUser || 9000)) - (user?.withdrawnReferralBonus || 0))).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Available Amount to Withdraw */}
                  {(user?.availableReferralBonus !== undefined ? user.availableReferralBonus : Math.max(0, ((user?.referralCount || 0) * (user?.referralBonusPerUser || 9000)) - (user?.withdrawnReferralBonus || 0))) <= 0 ? (
                    <div className="bg-[#182515] border border-[#2b3e26] rounded-xl p-4 text-center space-y-2">
                      <p className="text-xs text-amber-300 font-medium">
                        All accrued referral bonuses have already been withdrawn.
                      </p>
                      <p className="text-[11px] text-[#8ca388]">
                        Share your referral code with more farmers to earn ₦{(user?.referralBonusPerUser || 9000).toLocaleString()} for each new registration!
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowReferralWithdrawModal(false)}
                        className="mt-2 w-full py-2 rounded-lg bg-[#283c24] hover:bg-[#344e2f] text-white text-xs font-semibold"
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-[#c2d3bd] mb-1">
                          Withdrawal Amount (NGN)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[#8ca388]">₦</span>
                          <input
                            type="number"
                            required
                            min="1000"
                            max={user?.availableReferralBonus !== undefined ? user.availableReferralBonus : Math.max(0, ((user?.referralCount || 0) * (user?.referralBonusPerUser || 9000)) - (user?.withdrawnReferralBonus || 0))}
                            value={referralWithdrawAmount}
                            onChange={(e) => setReferralWithdrawAmount(e.target.value)}
                            className="w-full rounded-xl border border-[#2e422a] bg-[#121c10] py-2.5 pl-8 pr-20 text-white font-mono text-sm focus:border-green-500 focus:outline-none"
                            placeholder="Enter amount"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const avail = user?.availableReferralBonus !== undefined ? user.availableReferralBonus : Math.max(0, ((user?.referralCount || 0) * (user?.referralBonusPerUser || 9000)) - (user?.withdrawnReferralBonus || 0));
                              setReferralWithdrawAmount(String(avail));
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-green-500/20 text-green-300 hover:bg-green-500/30 px-2 py-1 rounded border border-green-500/30 cursor-pointer"
                          >
                            MAX
                          </button>
                        </div>
                        <span className="text-[10px] text-[#8ca388] mt-1 block">
                          Maximum available: ₦{(user?.availableReferralBonus !== undefined ? user.availableReferralBonus : Math.max(0, ((user?.referralCount || 0) * (user?.referralBonusPerUser || 9000)) - (user?.withdrawnReferralBonus || 0))).toLocaleString()}
                        </span>
                      </div>

                      {/* Destination Bank Account Section */}
                      <div className="bg-[#121c10] border border-[#243720] rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                            <Building className="h-3.5 w-3.5 text-amber-400" />
                            <span>Destination Nigerian Bank Account</span>
                          </span>
                          <span className="text-[10px] text-[#8ca388]">Verify Details</span>
                        </div>

                        <div>
                          <label className="block text-[11px] text-[#8ca388] mb-1">Bank Name</label>
                          <input
                            type="text"
                            required
                            value={referralWithdrawBank}
                            onChange={(e) => setReferralWithdrawBank(e.target.value)}
                            placeholder="e.g. Access Bank, GTBank, Zenith, OPay"
                            className="w-full rounded-lg border border-[#2e422a] bg-[#1a2817] py-2 px-3 text-xs text-white focus:border-green-500 focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] text-[#8ca388] mb-1">Account Number</label>
                            <input
                              type="text"
                              required
                              maxLength={10}
                              value={referralWithdrawAccount}
                              onChange={(e) => setReferralWithdrawAccount(e.target.value)}
                              placeholder="10 digit number"
                              className="w-full rounded-lg border border-[#2e422a] bg-[#1a2817] py-2 px-3 text-xs text-white font-mono focus:border-green-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#8ca388] mb-1">Account Name</label>
                            <input
                              type="text"
                              required
                              value={referralWithdrawName}
                              onChange={(e) => setReferralWithdrawName(e.target.value)}
                              placeholder="Account Holder Name"
                              className="w-full rounded-lg border border-[#2e422a] bg-[#1a2817] py-2 px-3 text-xs text-white focus:border-green-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowReferralWithdrawModal(false)}
                          className="flex-1 py-2.5 rounded-xl bg-[#283c24] hover:bg-[#344e2f] text-white text-xs font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={referralWithdrawLoading}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-green-600 hover:from-amber-400 hover:to-green-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {referralWithdrawLoading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <Wallet className="h-3.5 w-3.5" />
                              <span>Confirm Withdrawal</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              )}
            </motion.div>
          </div>
        )}

        {showDepositModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-[#2e422a] bg-[#202e1c] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Deposit NGN</h3>
                <button onClick={() => setShowDepositModal(false)} className="text-[#9db299] hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleDeposit}>
                <label className="block text-sm font-medium text-[#c2d3bd] mb-2">Simulate Deposit Amount (NGN)</label>
                <div className="relative mb-6">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7d9378] font-medium">₦</span>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full rounded-xl border border-[#2e422a] bg-[#141d12] py-3 pl-10 pr-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition-colors shadow-md"
                >
                  {modalLoading ? 'Processing...' : 'Simulate Deposit'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Support & Admin Chat Trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSupportModal(true)}
          className="relative flex items-center space-x-2.5 rounded-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white px-5 py-3.5 shadow-2xl border border-green-400/30 group"
        >
          <div className="relative">
            <MessageSquare className="h-5 w-5 group-hover:scale-110 transition-transform" />
            {unreadMessages > 0 && (
              <span className="absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-black text-black ring-2 ring-[#182416] animate-bounce">
                {unreadMessages}
              </span>
            )}
          </div>
          <span className="text-sm font-semibold tracking-wide">
            {unreadMessages > 0 ? `${unreadMessages} New Message${unreadMessages > 1 ? 's' : ''}` : 'Message Admin'}
          </span>
        </motion.button>
      </div>

      {/* Support Chat Modal */}
      <SupportChatModal 
        isOpen={showSupportModal} 
        onClose={() => {
          setShowSupportModal(false);
          fetchUnreadCount();
        }}
        token={token} 
        userName={user?.name || 'User'} 
      />
    </div>
  );
}
