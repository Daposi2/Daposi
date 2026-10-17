import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, LogOut, Users, ArrowUpRight, ArrowDownLeft, Lock, Unlock, Ban,
  CheckCircle, CheckCircle2, XCircle, Eye, EyeOff, User as UserIcon,
  MessageSquare, Layers, Sprout, Clock, LayoutDashboard, ExternalLink,
  AlertTriangle, TrendingUp, Building, CreditCard, Calendar, X, Loader2
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import AdminSupportChat from './AdminSupportChat';
import AdminMatchingDesk from './AdminMatchingDesk';
import {
  adminLogin,
  fetchAdminStats,
  approvePayout,
  rejectPayout,
  approvePledge,
  updatePledgeProgress,
  setBanStatus,
  setLockStatus,
  fetchUserDashboardSummary
} from '../lib/supabaseService';
import { supabase } from '../supabaseClient';

export default function Admin({ token, setToken }: { token: string, setToken: (t: string | null) => void }) {
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem('adminToken'));
  const [username, setUsername] = useState('Cobo#@');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'matching' | 'messages' | 'payouts' | 'users'>('overview');
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [preselectedPledgerId, setPreselectedPledgerId] = useState<string | null>(null);
  const [preselectedReceiverId, setPreselectedReceiverId] = useState<string | null>(null);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  
  // User Dashboard Inspector State
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);
  const [inspectUserData, setInspectUserData] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectDayInput, setInspectDayInput] = useState<number>(0);
  
  // Growth Progress Control Modal State
  const [progressModalTarget, setProgressModalTarget] = useState<{
    userId?: string;
    pledgeId?: string;
    userName?: string;
    amount?: number;
    currentDay: number;
  } | null>(null);
  const [progressTargetDay, setProgressTargetDay] = useState<number>(0);
  const [progressSuccessMessage, setProgressSuccessMessage] = useState<string | null>(null);
  
  // Ban / Lock Modal State
  const [banModalUser, setBanModalUser] = useState<any | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('Multiple account violation / breach of DAPOSI terms');
  const [lockModalUser, setLockModalUser] = useState<any | null>(null);
  const [lockReasonInput, setLockReasonInput] = useState('Security investigation / temporary account hold');
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();

  const handleMessageUser = (userId: string) => {
    if (!userId) return;
    setSelectedChatUserId(userId);
    setActiveTab('messages');
  };

  const handleOpenUserDashboard = async (userId: string) => {
    setInspectUserId(userId);
    setInspectLoading(true);
    try {
      const data = await fetchUserDashboardSummary(userId);
      setInspectUserData(data);
      setInspectDayInput(data.daysPassed || 0);
    } catch (err) {
      console.error('Error opening user dashboard summary:', err);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleToggleBan = async (userId: string, shouldBan: boolean, reason?: string) => {
    setActionLoading(true);
    try {
      await setBanStatus(userId, shouldBan, reason || banReasonInput);
      setBanModalUser(null);
      fetchAdminData();
      if (inspectUserId === userId) {
        handleOpenUserDashboard(userId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLock = async (userId: string, shouldLock: boolean, reason?: string) => {
    setActionLoading(true);
    try {
      await setLockStatus(userId, shouldLock, reason || lockReasonInput);
      setLockModalUser(null);
      fetchAdminData();
      if (inspectUserId === userId) {
        handleOpenUserDashboard(userId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      localStorage.setItem('adminToken', adminToken);
      fetchAdminData();
    } else {
      localStorage.removeItem('adminToken');
    }
  }, [adminToken]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await adminLogin(username, password);
      setAdminToken(data.token);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching admin data from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (getHelpId: string) => {
    try {
      await approvePayout(getHelpId);
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (getHelpId: string) => {
    try {
      await rejectPayout(getHelpId);
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprovePledge = async (pledgeId: string) => {
    try {
      await approvePledge(pledgeId);
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGrowthProgress = async (dayToSet?: number) => {
    if (!progressModalTarget) return;
    const finalDay = dayToSet !== undefined ? dayToSet : progressTargetDay;
    setActionLoading(true);
    try {
      const targetId = progressModalTarget.pledgeId || progressModalTarget.userId;
      const isPledgeId = Boolean(progressModalTarget.pledgeId);
      await updatePledgeProgress(targetId, finalDay, isPledgeId);

      setProgressSuccessMessage(`Set to Day ${finalDay} of 28`);
      setTimeout(() => setProgressSuccessMessage(null), 3000);

      fetchAdminData();
      if (inspectUserId && (inspectUserId === progressModalTarget.userId || inspectUserData?.activePledge?._id === progressModalTarget.pledgeId)) {
        handleOpenUserDashboard(inspectUserId);
      }
      setTimeout(() => {
        setProgressModalTarget(null);
      }, 700);
    } catch (err: any) {
      alert(err.message || 'Failed to update growth progress');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickSetInspectProgress = async (day: number) => {
    if (!inspectUserId) return;
    setActionLoading(true);
    try {
      const pledgeId = inspectUserData?.activePledge?._id;
      const targetId = pledgeId || inspectUserId;
      await updatePledgeProgress(targetId, day, Boolean(pledgeId));

      handleOpenUserDashboard(inspectUserId);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update progress');
    } finally {
      setActionLoading(false);
    }
  };

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-[#182416] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#202e1c] border border-[#2e422a] rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 mb-4 border border-amber-500/20">
              <Lock className="h-8 w-8 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Admin Access</h2>
            <p className="text-[#a8bda3] mt-2 text-sm text-center">Protected area. Enter administrative credentials to continue.</p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#c2d3bd] mb-1.5">User Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7d9378]" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-[#2e422a] bg-[#141d12] py-3 pl-10 pr-4 text-white placeholder-[#6d8268] focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="Enter username (e.g. Cobo#@)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#c2d3bd] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7d9378]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#2e422a] bg-[#141d12] py-3 pl-10 pr-11 text-white placeholder-[#6d8268] focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="Enter password..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9db299] hover:text-white focus:outline-none transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-amber-600 py-3 font-semibold text-white hover:bg-amber-500 transition-colors shadow-md mt-2"
            >
              Unlock Dashboard
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full text-center text-sm text-[#9db299] hover:text-white pt-1"
            >
              Return Home
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (loading || !stats) return <div className="min-h-screen bg-[#182416] flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent"></div></div>;

  return (
    <div className="min-h-screen bg-[#182416] pb-12 font-sans text-[#f2f6f0]">
      <nav className="sticky top-0 z-40 border-b border-[#2d4028] bg-[#141f13]/85 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">DAPOSI <span className="font-light text-amber-400">ADMIN</span></span>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-sm text-[#9db299] hover:text-white transition-colors"
            >
              App Dashboard
            </button>
            <button 
              onClick={() => setAdminToken(null)}
              className="flex items-center space-x-2 text-sm text-[#9db299] hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Lock Panel</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-[#283e25] pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-[#1b2b1a] text-[#a4bba0] hover:text-white hover:bg-[#233821]'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Overview & Financials</span>
          </button>

          <button
            onClick={() => setActiveTab('matching')}
            className={`relative flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'matching'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-[#1b2b1a] text-[#a4bba0] hover:text-white hover:bg-[#233821]'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Peer Matching Desk</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold">
              {stats?.matches?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`relative flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'messages'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-[#1b2b1a] text-[#a4bba0] hover:text-white hover:bg-[#233821]'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>User Inquiries & Chat</span>
            {totalUnreadMessages > 0 && (
              <span className="flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white animate-pulse">
                {totalUnreadMessages}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('payouts')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'payouts'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-[#1b2b1a] text-[#a4bba0] hover:text-white hover:bg-[#233821]'
            }`}
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>Pending Payouts ({stats.getHelps.filter((gh: any) => gh.status === 'Pending').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-[#1b2b1a] text-[#a4bba0] hover:text-white hover:bg-[#233821]'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Registered Users ({stats.users.length})</span>
          </button>
        </div>

        {activeTab === 'matching' && (
          <AdminMatchingDesk 
            adminToken={adminToken} 
            stats={stats} 
            onRefreshStats={fetchAdminData}
            initialPledgerId={preselectedPledgerId}
            initialReceiverId={preselectedReceiverId}
            onClearPreselection={() => {
              setPreselectedPledgerId(null);
              setPreselectedReceiverId(null);
            }}
            onMessageUser={handleMessageUser}
          />
        )}

        {activeTab === 'messages' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">User Support & Inquiries Desk</h2>
              <p className="text-xs text-[#8ca388]">Communicate directly with users, view attached payment receipts, and send answers or proofs in real-time.</p>
            </div>
            <AdminSupportChat 
              adminToken={adminToken} 
              onTotalUnreadChange={setTotalUnreadMessages} 
              initialUserId={selectedChatUserId}
              allUsers={stats?.users || []}
            />
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#202e1c] border border-[#2e422a] rounded-xl p-6 shadow-sm">
            <p className="text-sm font-medium text-[#9db299] mb-1">Total Users</p>
            <h3 className="text-2xl font-bold text-white">{stats.users.length}</h3>
          </div>
          <div className="bg-[#202e1c] border border-[#2e422a] rounded-xl p-6 shadow-sm">
            <p className="text-sm font-medium text-[#9db299] mb-1">Platform Balance</p>
            <h3 className="text-2xl font-bold text-white">{formatCurrency(stats.platformBalance)}</h3>
          </div>
          <div className="bg-[#202e1c] border border-[#2e422a] rounded-xl p-6 shadow-sm">
            <p className="text-sm font-medium text-[#9db299] mb-1">Total Pledges</p>
            <h3 className="text-2xl font-bold text-green-400">{stats.pledges.length}</h3>
          </div>
          <div className="bg-[#202e1c] border border-[#2e422a] rounded-xl p-6 shadow-sm">
            <p className="text-sm font-medium text-[#9db299] mb-1">Total GH Requests</p>
            <h3 className="text-2xl font-bold text-amber-400">{stats.getHelps.length}</h3>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Payout Requests (GH) */}
          <div className="rounded-2xl border border-[#2e422a] bg-[#202e1c] overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#2e422a] bg-[#162214]/70">
              <h3 className="font-bold text-white">Pending Payout Requests (Redeem Support)</h3>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left text-sm text-[#c2d3bd]">
                <thead className="border-b border-[#2e422a] bg-[#162214]/50 uppercase text-xs text-[#9db299]">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.getHelps.filter((gh: any) => gh.status === 'Pending').map((gh: any) => (
                    <tr key={gh._id} className="border-b border-[#2e422a]/50">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{gh.userId?.name || 'Unknown'}</div>
                        <div className="text-xs text-[#9db299]">{gh.userId?.email}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-amber-400">{formatCurrency(gh.amount)}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 rounded bg-amber-500/15 text-amber-400 text-xs border border-amber-500/20">Pending</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleMessageUser(gh.userId?._id || gh.userId)}
                            className="p-1.5 rounded-lg bg-[#253922] hover:bg-[#314c2c] text-[#a4bca1] hover:text-white transition-colors"
                            title="Chat / Message with this user"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-green-400" />
                          </button>
                          <button 
                            onClick={() => {
                              setPreselectedReceiverId(gh.userId?._id || gh.userId);
                              setActiveTab('matching');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold flex items-center space-x-1 border border-amber-500/30 transition-colors"
                            title="Match this recipient with a payer"
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span>Match Payer</span>
                          </button>
                          <button onClick={() => handleApprove(gh._id)} className="p-1 rounded hover:bg-green-500/20 text-green-400" title="Approve">
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button onClick={() => handleReject(gh._id)} className="p-1 rounded hover:bg-red-500/20 text-red-400" title="Reject">
                            <XCircle className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {stats.getHelps.filter((gh: any) => gh.status === 'Pending').length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-[#7d9378]">No pending requests</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Pledges */}
          <div className="rounded-2xl border border-[#2e422a] bg-[#202e1c] overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#2e422a] bg-[#162214]/70">
              <h3 className="font-bold text-white">Active Farm Pledges</h3>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left text-sm text-[#c2d3bd]">
                <thead className="border-b border-[#2e422a] bg-[#162214]/50 uppercase text-xs text-[#9db299]">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Expected GH</th>
                    <th className="px-4 py-3 font-medium">Status / Cycle</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.pledges.slice(0, 20).map((pledge: any) => {
                    const isApproved = pledge.status === 'Approved' || pledge.approvedAt || pledge.status === 'Paid';
                    return (
                      <tr key={pledge._id} className="border-b border-[#2e422a]/50">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{pledge.userId?.name || 'Unknown'}</div>
                          <div className="text-xs text-[#9db299]">{pledge.userId?.email}</div>
                        </td>
                        <td className="px-4 py-3 font-medium text-green-400">{formatCurrency(pledge.amount)}</td>
                        <td className="px-4 py-3 text-white">{formatCurrency(pledge.amount * 1.2)}</td>
                        <td className="px-4 py-3">
                          {isApproved ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-300 border border-green-500/30 inline-flex items-center space-x-1">
                              <Sprout className="h-3 w-3" />
                              <span>Approved (28-Day Bar Counting)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Pending Admin Approval</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {!isApproved ? (
                              <button
                                onClick={() => handleApprovePledge(pledge._id)}
                                className="px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold flex items-center space-x-1 shadow transition-colors"
                                title="Approve pledge and start 28-day dividend progress bar for user"
                              >
                                <Sprout className="h-3.5 w-3.5" />
                                <span>Approve (Start 28d)</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  const currentDay = pledge.customDaysPassed !== undefined && pledge.customDaysPassed !== null
                                    ? pledge.customDaysPassed
                                    : (pledge.approvedAt ? Math.min(28, Math.max(0, Math.floor((Date.now() - new Date(pledge.approvedAt).getTime()) / (1000 * 60 * 60 * 24)))) : 0);
                                  setProgressModalTarget({
                                    pledgeId: pledge._id,
                                    userId: pledge.userId?._id || pledge.userId,
                                    userName: pledge.userId?.name || 'User',
                                    amount: pledge.amount,
                                    currentDay
                                  });
                                  setProgressTargetDay(currentDay);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold flex items-center space-x-1 border border-amber-500/30 transition-colors"
                                title="Admin: Control growth cycle progress day (0-28)"
                              >
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span>Set Day</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleMessageUser(pledge.userId?._id || pledge.userId)}
                              className="p-1.5 rounded-lg bg-[#253922] hover:bg-[#314c2c] text-[#a4bca1] hover:text-white transition-colors"
                              title="Chat / Message with this user"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-green-400" />
                            </button>
                            <button
                              onClick={() => {
                                setPreselectedPledgerId(pledge.userId?._id || pledge.userId);
                                setActiveTab('matching');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-semibold flex items-center space-x-1 border border-green-500/30 transition-colors"
                              title="Match this pledger to pay a recipient"
                            >
                              <Users className="h-3.5 w-3.5" />
                              <span>Match Recipient</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* User Management Table inside Overview */}
        <div className="rounded-2xl border border-[#2e422a] bg-[#202e1c] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#2e422a] bg-[#162214]/70 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white">Registered Users</h3>
              <p className="text-xs text-[#8ca388]">Monitor user investments, 28-day returns, referrals, and account status</p>
            </div>
            <button onClick={() => setActiveTab('users')} className="text-xs text-amber-400 hover:underline">View All ({stats.users.length})</button>
          </div>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-sm text-[#c2d3bd]">
              <thead className="border-b border-[#2e422a] bg-[#162214]/50 uppercase text-[11px] text-[#9db299]">
                <tr>
                  <th className="px-5 py-3 font-semibold">User Details</th>
                  <th className="px-4 py-3 font-semibold">Account Status</th>
                  <th className="px-4 py-3 font-semibold">Invested (Pledged)</th>
                  <th className="px-4 py-3 font-semibold">28-Day Return (20%)</th>
                  <th className="px-4 py-3 font-semibold">Referrals</th>
                  <th className="px-5 py-3 font-semibold text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#283e25]/50">
                {stats.users.slice(0, 10).map((user: any) => (
                  <tr key={user._id} className="hover:bg-[#283b24]/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-white">{user.name}</div>
                      <div className="text-xs text-[#9db299]">{user.email} • {user.phone}</div>
                      {user.bankName && (
                        <div className="text-[11px] text-[#7d9378] font-mono mt-0.5">
                          {user.bankName}: {user.accountNumber} ({user.accountName})
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        {user.isBanned ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                            Banned
                          </span>
                        ) : user.isLocked ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Locked
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/15 text-green-300 border border-green-500/25">
                            Active
                          </span>
                        )}
                        <span className="text-[10px] text-[#8ca388] font-mono capitalize">{user.role}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-bold text-green-400">
                      {formatCurrency(user.totalPledged)}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-bold text-amber-400 block">
                        {formatCurrency(user.expectedAtMaturity || user.totalPledged * 1.20)}
                      </span>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="text-[10px] text-[#8ca388]">
                          {user.latestPledge?.status === 'Approved' ? `Day ${user.daysPassed || 0}/28` : 'Cycle on hold'}
                        </span>
                        {user.latestPledge && (
                          <button
                            onClick={() => {
                              setProgressModalTarget({
                                userId: user._id,
                                pledgeId: user.latestPledge?._id,
                                userName: user.name,
                                amount: user.latestPledge?.amount || user.totalPledged,
                                currentDay: user.daysPassed || 0
                              });
                              setProgressTargetDay(user.daysPassed || 0);
                            }}
                            className="px-1.5 py-0.5 rounded bg-green-500/20 hover:bg-green-500/35 text-green-300 text-[10px] font-bold border border-green-500/30 transition-colors"
                            title="Admin: Control growth cycle progress day (0-28)"
                          >
                            ⚙️ Set Day
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-white block">
                        {user.referralCount || 0} Ref
                      </span>
                      <span className="text-[11px] text-green-400 font-mono">
                        +₦{((user.referralCount || 0) * 9000).toLocaleString()}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenUserDashboard(user._id)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold inline-flex items-center space-x-1 border border-amber-500/30 transition-colors"
                          title="View complete user dashboard overview"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Dashboard</span>
                        </button>

                        {user.isBanned ? (
                          <button
                            onClick={() => handleToggleBan(user._id, false)}
                            className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-semibold transition-colors border border-green-500/30"
                            title="Unban this user"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setBanModalUser(user)}
                            className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition-colors border border-red-500/30"
                            title="Ban user account"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {user.isLocked ? (
                          <button
                            onClick={() => handleToggleLock(user._id, false)}
                            className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition-colors border border-amber-500/30"
                            title="Unlock this user"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setLockModalUser(user)}
                            className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold transition-colors border border-amber-500/25"
                            title="Lock user account"
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleMessageUser(user._id)}
                          className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-semibold transition-colors border border-green-500/30"
                          title="Message this user"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* Tab: Payouts */}
    {activeTab === 'payouts' && (
      <div className="rounded-2xl border border-[#2e422a] bg-[#202e1c] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#2e422a] bg-[#162214]/70">
          <h3 className="font-bold text-white">All Payout Requests (Redeem Support)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#c2d3bd]">
            <thead className="border-b border-[#2e422a] bg-[#162214]/50 uppercase text-xs text-[#9db299]">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stats.getHelps.map((gh: any) => (
                <tr key={gh._id} className="border-b border-[#2e422a]/50">
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">{gh.userId?.name || 'Unknown'}</div>
                    <div className="text-xs text-[#9db299]">{gh.userId?.email}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-amber-400">{formatCurrency(gh.amount)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      gh.status === 'Paid' ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
                      gh.status === 'Pending' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                      'bg-[#283b24] text-[#c2d3bd]'
                    }`}>
                      {gh.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleMessageUser(gh.userId?._id || gh.userId)}
                        className="p-1.5 rounded-lg bg-[#253922] hover:bg-[#314c2c] text-[#a4bca1] hover:text-white transition-colors"
                        title="Chat / Message with this user"
                      >
                        <MessageSquare className="h-4 w-4 text-green-400" />
                      </button>
                      {gh.status === 'Pending' && (
                        <>
                          <button onClick={() => handleApprove(gh._id)} className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors">
                            Approve Payout
                          </button>
                          <button onClick={() => handleReject(gh._id)} className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-200 text-xs font-semibold transition-colors">
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {stats.getHelps.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-[#7d9378]">No payout requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* Tab: Users */}
    {activeTab === 'users' && (
      <div className="rounded-2xl border border-[#2e422a] bg-[#202e1c] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#2e422a] bg-[#162214]/70 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white">Registered Users ({stats.users.length})</h3>
            <p className="text-xs text-[#8ca388]">Full list of accounts with direct dashboard inspection and ban/lock controls</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#c2d3bd]">
            <thead className="border-b border-[#2e422a] bg-[#162214]/50 uppercase text-[11px] text-[#9db299]">
              <tr>
                <th className="px-6 py-4 font-semibold">User Details</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Wallet</th>
                <th className="px-4 py-4 font-semibold">Invested (Pledged)</th>
                <th className="px-4 py-4 font-semibold">Expected 28-Day Return</th>
                <th className="px-4 py-4 font-semibold">Referrals</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#283e25]/50">
              {stats.users.map((user: any) => (
                <tr key={user._id} className="hover:bg-[#283b24]/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">{user.name}</div>
                    <div className="text-xs text-[#9db299]">{user.email} • {user.phone}</div>
                    {user.bankName && (
                      <div className="text-[11px] text-[#7d9378] font-mono mt-0.5">
                        {user.bankName} - {user.accountNumber} ({user.accountName})
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {user.isBanned ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                        Banned
                      </span>
                    ) : user.isLocked ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Locked
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/15 text-green-300 border border-green-500/25">
                        Active
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4 font-semibold text-white">{formatCurrency(user.walletBalance)}</td>
                  <td className="px-4 py-4 text-green-400 font-bold">{formatCurrency(user.totalPledged)}</td>
                  
                  <td className="px-4 py-4">
                    <span className="font-bold text-amber-400 block">
                      {formatCurrency(user.expectedAtMaturity || user.totalPledged * 1.20)}
                    </span>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className="text-[10px] text-[#8ca388]">
                        {user.latestPledge?.status === 'Approved' ? `Day ${user.daysPassed || 0}/28` : 'Cycle on hold'}
                      </span>
                      {user.latestPledge && (
                        <button
                          onClick={() => {
                            setProgressModalTarget({
                              userId: user._id,
                              pledgeId: user.latestPledge?._id,
                              userName: user.name,
                              amount: user.latestPledge?.amount || user.totalPledged,
                              currentDay: user.daysPassed || 0
                            });
                            setProgressTargetDay(user.daysPassed || 0);
                          }}
                          className="px-1.5 py-0.5 rounded bg-green-500/20 hover:bg-green-500/35 text-green-300 text-[10px] font-bold border border-green-500/30 transition-colors"
                          title="Admin: Control growth cycle progress day (0-28)"
                        >
                          ⚙️ Set Day
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className="font-semibold text-white block">
                      {user.referralCount || 0} Ref
                    </span>
                    <span className="text-[11px] text-green-400 font-mono">
                      +₦{((user.referralCount || 0) * 9000).toLocaleString()}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => handleOpenUserDashboard(user._id)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold inline-flex items-center space-x-1 border border-amber-500/30 transition-colors"
                        title="View user dashboard overview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Dashboard</span>
                      </button>

                      {user.isBanned ? (
                        <button
                          onClick={() => handleToggleBan(user._id, false)}
                          className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-semibold transition-colors border border-green-500/30"
                          title="Unban user"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setBanModalUser(user)}
                          className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition-colors border border-red-500/30"
                          title="Ban user account"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {user.isLocked ? (
                        <button
                          onClick={() => handleToggleLock(user._id, false)}
                          className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition-colors border border-amber-500/30"
                          title="Unlock user"
                        >
                          <Unlock className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setLockModalUser(user)}
                          className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold transition-colors border border-amber-500/25"
                          title="Lock user account"
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleMessageUser(user._id)}
                        className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-semibold transition-colors border border-green-500/30"
                        title="Chat with user"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </main>

  {/* USER DASHBOARD INSPECTOR MODAL */}
  {inspectUserId && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl rounded-2xl border-2 border-green-500/40 bg-[#152314] p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-6 text-[#dce7da]"
      >
        {inspectLoading || !inspectUserData ? (
          <div className="py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-400 mb-3" />
            <p className="text-sm text-[#9db299]">Loading user dashboard data...</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#283e25]">
              <div className="flex items-center space-x-3.5">
                <div className="h-14 w-14 rounded-2xl bg-[#263c23] border border-green-500/30 flex items-center justify-center text-2xl font-bold text-green-400">
                  {inspectUserData.user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h2 className="text-xl font-bold text-white tracking-tight">{inspectUserData.user?.name}</h2>
                    {inspectUserData.user?.isBanned ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center space-x-1">
                        <Ban className="h-3 w-3" />
                        <span>Banned</span>
                      </span>
                    ) : inspectUserData.user?.isLocked ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                        <Lock className="h-3 w-3" />
                        <span>Locked</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30 flex items-center space-x-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#8ca388] mt-0.5">
                    {inspectUserData.user?.email} • Tel: <span className="font-mono text-white">{inspectUserData.user?.phone}</span> • Code: <span className="font-mono text-amber-300">{inspectUserData.user?.referralCode}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const uid = inspectUserId;
                    setInspectUserId(null);
                    handleMessageUser(uid);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-green-600/30 hover:bg-green-600 text-green-300 hover:text-white border border-green-500/30 text-xs font-bold transition-all flex items-center space-x-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Message User</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectUserId(null)}
                  className="p-2 rounded-xl bg-[#223520] hover:bg-[#2c442a] text-[#8ca388] hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Account Restriction Status Bar */}
            {(inspectUserData.user?.isBanned || inspectUserData.user?.isLocked) && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span>
                    <strong>Account Restricted: </strong>
                    {inspectUserData.user?.isBanned ? `Banned (${inspectUserData.user?.banReason || 'Policy violation'})` : `Locked (${inspectUserData.user?.lockReason || 'Administrative lock'})`}
                  </span>
                </div>
                {inspectUserData.user?.isBanned && (
                  <button
                    onClick={() => handleToggleBan(inspectUserData.user?._id, false)}
                    className="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-xs"
                  >
                    Unban Account
                  </button>
                )}
                {inspectUserData.user?.isLocked && !inspectUserData.user?.isBanned && (
                  <button
                    onClick={() => handleToggleLock(inspectUserData.user?._id, false)}
                    className="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-xs"
                  >
                    Unlock Account
                  </button>
                )}
              </div>
            )}

            {/* THREE PRIMARY METRICS REQUIRED BY USER */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1. How much the user invested */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1c2c1a] to-[#142013] border border-green-500/30 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-green-400 block">
                  1. How Much User Invested
                </span>
                <span className="text-2xl font-black text-white font-mono block">
                  {formatCurrency(inspectUserData.totalInvested || 0)}
                </span>
                <p className="text-[11px] text-[#8ca388]">Active capital supported into verified agriculture</p>
              </div>

              {/* 2. How much he will get at the end of 28 days */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#272115] to-[#1a1710] border border-amber-500/40 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block flex items-center justify-between">
                  <span>2. Payout at End of 28 Days</span>
                  <span className="text-[10px] bg-amber-400/20 px-1.5 py-0.5 rounded text-amber-300 font-bold">+20%</span>
                </span>
                <span className="text-2xl font-black text-amber-400 font-mono block">
                  {formatCurrency(inspectUserData.expectedMaturityAmount || 0)}
                </span>
                <p className="text-[11px] text-[#b8a786]">
                  Capital ₦{(inspectUserData.totalInvested || 0).toLocaleString()} + 20% dividend ₦{((inspectUserData.totalInvested || 0) * 0.20).toLocaleString()}
                </p>
              </div>

              {/* 3. How many referrals he has */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1a2919] to-[#121c12] border border-emerald-500/30 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                  3. Referrals Made
                </span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-white font-mono">
                    {inspectUserData.referralCount || 0}
                  </span>
                  <span className="text-xs text-emerald-300 font-bold">
                    (₦{((inspectUserData.referralCount || 0) * 9000).toLocaleString()})
                  </span>
                </div>
                <p className="text-[11px] text-[#8ca388]">₦9,000 earned per verified referral</p>
              </div>
            </div>

            {/* 28-DAY DIVIDEND PROGRESS STATUS */}
            <div className="p-5 rounded-2xl bg-[#121c11] border border-[#2b3e27] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-[#b5cab2] flex items-center space-x-1.5">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span>28-Day Dividend Growth Progress</span>
                </span>
                <span className="font-mono font-bold text-xs text-amber-400">
                  Day {inspectUserData.daysPassed} of 28 ({inspectUserData.progressPercent}%)
                </span>
              </div>

              <div className="w-full h-4 rounded-full bg-black/50 border border-[#263a23] p-0.5 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-amber-400 transition-all"
                  style={{ width: `${Math.max(4, inspectUserData.progressPercent)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div>
                  <span className="text-[10px] text-[#7d9378] block">Support Status:</span>
                  <span className="font-bold text-white">{inspectUserData.activePledge?.status || 'No Active Support'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7d9378] block">Cycle Days Left:</span>
                  <span className="font-bold text-amber-400">{inspectUserData.daysRemaining} Days</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7d9378] block">Maturity Date:</span>
                  <span className="font-bold text-white">
                    {inspectUserData.activePledge?.maturityDate 
                      ? new Date(inspectUserData.activePledge.maturityDate).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7d9378] block">Wallet Balance:</span>
                  <span className="font-bold text-white font-mono">{formatCurrency(inspectUserData.user?.walletBalance || 0)}</span>
                </div>
              </div>

              {/* INTERACTIVE ADMIN GROWTH PROGRESS CONTROLLER */}
              <div className="mt-3 pt-3 border-t border-[#263a23] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
                    <Sprout className="h-4 w-4 text-green-400" />
                    <span>Admin Growth Controller: Fast-Forward or Adjust Cycle Day</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-white bg-black/50 px-2.5 py-1 rounded-lg border border-[#2e472a]">
                      Selected: Day {inspectDayInput} of 28 ({Math.round((inspectDayInput / 28) * 100)}%)
                    </span>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleQuickSetInspectProgress(inspectDayInput)}
                      className="px-3.5 py-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs shadow transition-all flex items-center space-x-1 disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span>Apply Day {inspectDayInput}</span>
                    </button>
                  </div>
                </div>

                {/* Slider */}
                <div className="flex items-center space-x-3 pt-1">
                  <span className="text-[11px] font-mono text-[#8ca388] font-bold">Day 0</span>
                  <input
                    type="range"
                    min="0"
                    max="28"
                    step="1"
                    value={inspectDayInput}
                    onChange={(e) => setInspectDayInput(Number(e.target.value))}
                    className="flex-1 accent-green-500 cursor-pointer h-2.5 bg-black/60 rounded-lg"
                  />
                  <span className="text-[11px] font-mono text-[#8ca388] font-bold">Day 28</span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setInspectDayInput(0)}
                    className="px-2.5 py-1 rounded-lg bg-[#182617] hover:bg-[#223720] text-[11px] font-medium text-[#c2d3bd] border border-[#2b4227] transition-colors"
                  >
                    Day 0 (Start)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectDayInput(Math.max(0, inspectDayInput - 1))}
                    className="px-2.5 py-1 rounded-lg bg-[#182617] hover:bg-[#223720] text-[11px] font-bold text-white border border-[#2b4227] transition-colors"
                  >
                    -1 Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectDayInput(Math.min(28, inspectDayInput + 1))}
                    className="px-2.5 py-1 rounded-lg bg-[#182617] hover:bg-[#223720] text-[11px] font-bold text-white border border-[#2b4227] transition-colors"
                  >
                    +1 Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectDayInput(7)}
                    className="px-2.5 py-1 rounded-lg bg-[#182617] hover:bg-[#223720] text-[11px] font-medium text-[#c2d3bd] border border-[#2b4227] transition-colors"
                  >
                    Day 7 (25%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectDayInput(14)}
                    className="px-2.5 py-1 rounded-lg bg-[#182617] hover:bg-[#223720] text-[11px] font-medium text-[#c2d3bd] border border-[#2b4227] transition-colors"
                  >
                    Day 14 (Mid-Cycle 50%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectDayInput(21)}
                    className="px-2.5 py-1 rounded-lg bg-[#182617] hover:bg-[#223720] text-[11px] font-medium text-[#c2d3bd] border border-[#2b4227] transition-colors"
                  >
                    Day 21 (75%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectDayInput(28)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-[11px] font-bold text-amber-300 border border-amber-500/40 transition-colors"
                  >
                    Day 28 (Harvest Complete 100%)
                  </button>
                </div>
              </div>
            </div>

            {/* USER BANK ACCOUNT DETAILS */}
            <div className="p-4 rounded-2xl bg-[#121c11] border border-[#2b3e27] space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-amber-400 flex items-center space-x-1.5">
                <Building className="h-4 w-4" />
                <span>User's Bank Account Details (For Payouts & Matching)</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-black/30 border border-[#233520]">
                  <span className="text-[10px] text-[#7d9378] block">Bank Name</span>
                  <span className="font-bold text-white">{inspectUserData.user?.bankName || 'Not Set'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/30 border border-[#233520]">
                  <span className="text-[10px] text-[#7d9378] block">Account Number</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">{inspectUserData.user?.accountNumber || 'Not Set'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/30 border border-[#233520]">
                  <span className="text-[10px] text-[#7d9378] block">Account Name</span>
                  <span className="font-semibold text-white">{inspectUserData.user?.accountName || 'Not Set'}</span>
                </div>
              </div>
            </div>

            {/* ADMIN ACCOUNT RESTRICTION HANDLES */}
            <div className="p-4 rounded-2xl bg-[#172516] border border-[#2e472a] flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">Administrative Account Handles</span>
                <span className="text-[11px] text-[#8ca388]">Lock or ban account if duplicate accounts or violation detected</span>
              </div>
              <div className="flex items-center space-x-2">
                {inspectUserData.user?.isBanned ? (
                  <button
                    onClick={() => handleToggleBan(inspectUserData.user?._id, false)}
                    className="px-3.5 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs shadow transition-all flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Unban User</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setBanModalUser(inspectUserData.user)}
                    className="px-3.5 py-2 rounded-xl bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 font-bold text-xs shadow transition-all flex items-center space-x-1.5"
                  >
                    <Ban className="h-4 w-4" />
                    <span>Ban Account</span>
                  </button>
                )}

                {inspectUserData.user?.isLocked ? (
                  <button
                    onClick={() => handleToggleLock(inspectUserData.user?._id, false)}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition-all flex items-center space-x-1.5"
                  >
                    <Unlock className="h-4 w-4" />
                    <span>Unlock Account</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setLockModalUser(inspectUserData.user)}
                    className="px-3.5 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 font-bold text-xs shadow transition-all flex items-center space-x-1.5"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Lock Account</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )}

  {/* BAN MODAL */}
  {banModalUser && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border-2 border-red-500/50 bg-[#1e201c] p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center space-x-3 text-red-400">
          <Ban className="h-6 w-6" />
          <h3 className="text-lg font-bold text-white">Ban User Account</h3>
        </div>
        <p className="text-xs text-[#b8ccb5]">
          Are you sure you want to ban <strong className="text-white">{banModalUser.name}</strong> ({banModalUser.email})? 
          The user will be immediately blocked from logging in or using DAPOSI.
        </p>

        <div>
          <label className="block text-xs font-semibold text-white mb-1.5">Reason for Ban:</label>
          <input
            type="text"
            value={banReasonInput}
            onChange={(e) => setBanReasonInput(e.target.value)}
            className="w-full rounded-xl border border-red-500/40 bg-black/40 py-2.5 px-3.5 text-xs text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <button
            type="button"
            onClick={() => setBanModalUser(null)}
            className="flex-1 py-2.5 rounded-xl bg-[#283226] text-xs font-bold text-white hover:bg-[#344131]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => handleToggleBan(banModalUser._id, true, banReasonInput)}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow"
          >
            {actionLoading ? 'Banning...' : 'Confirm Ban'}
          </button>
        </div>
      </motion.div>
    </div>
  )}

  {/* LOCK MODAL */}
  {lockModalUser && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border-2 border-amber-500/50 bg-[#1e201c] p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center space-x-3 text-amber-400">
          <Lock className="h-6 w-6" />
          <h3 className="text-lg font-bold text-white">Lock User Account</h3>
        </div>
        <p className="text-xs text-[#b8ccb5]">
          Temporarily lock <strong className="text-white">{lockModalUser.name}</strong> ({lockModalUser.email})? 
          The user will see a temporary administrative lock notification until unlocked.
        </p>

        <div>
          <label className="block text-xs font-semibold text-white mb-1.5">Reason for Lock:</label>
          <input
            type="text"
            value={lockReasonInput}
            onChange={(e) => setLockReasonInput(e.target.value)}
            className="w-full rounded-xl border border-amber-500/40 bg-black/40 py-2.5 px-3.5 text-xs text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <button
            type="button"
            onClick={() => setLockModalUser(null)}
            className="flex-1 py-2.5 rounded-xl bg-[#283226] text-xs font-bold text-white hover:bg-[#344131]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => handleToggleLock(lockModalUser._id, true, lockReasonInput)}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow"
          >
            {actionLoading ? 'Locking...' : 'Confirm Lock'}
          </button>
        </div>
      </motion.div>
    </div>
  )}

  {/* GROWTH PROGRESS CONTROL MODAL */}
  {progressModalTarget && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-2xl border-2 border-green-500/50 bg-[#1e2a1c] p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#2e442a]">
          <div className="flex items-center space-x-3 text-green-400">
            <div className="p-2 rounded-xl bg-green-500/20">
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Control Growth Progress</h3>
              <p className="text-xs text-[#9db299]">Admin controller: adjust 28-day harvest cycle day</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setProgressModalTarget(null)}
            className="p-1 rounded-lg text-[#8ca388] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-[#142013] border border-[#2b3e27] text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-[#8ca388]">Target User:</span>
            <span className="font-bold text-white">{progressModalTarget.userName}</span>
          </div>
          {progressModalTarget.amount && (
            <div className="flex justify-between">
              <span className="text-[#8ca388]">Support Amount:</span>
              <span className="font-mono font-bold text-green-400">{formatCurrency(progressModalTarget.amount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-[#223520] pt-1.5">
            <span className="text-[#8ca388]">Current Progress:</span>
            <span className="font-mono font-bold text-amber-400">
              Day {progressModalTarget.currentDay} of 28 ({Math.round((progressModalTarget.currentDay / 28) * 100)}%)
            </span>
          </div>
        </div>

        {/* Live Target Day Display */}
        <div className="p-4 rounded-xl bg-[#111910] border border-green-500/30 text-center space-y-2">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8ca388] block">
            New Cycle Progress to Apply
          </span>
          <div className="flex items-baseline justify-center space-x-2">
            <span className="text-3xl font-black font-mono text-white">Day {progressTargetDay}</span>
            <span className="text-sm font-bold text-amber-400">/ 28 Days</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-green-500/20 text-green-300 border border-green-500/30 ml-2">
              {Math.round((progressTargetDay / 28) * 100)}% Completed
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-black/60 border border-[#283e25] p-0.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-amber-400 transition-all"
              style={{ width: `${Math.max(4, Math.round((progressTargetDay / 28) * 100))}%` }}
            />
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[#8ca388] font-mono font-semibold">
            <span>Day 0 (Start)</span>
            <span>Day 14 (Mid)</span>
            <span>Day 28 (Matured)</span>
          </div>
          <input
            type="range"
            min="0"
            max="28"
            step="1"
            value={progressTargetDay}
            onChange={(e) => setProgressTargetDay(Number(e.target.value))}
            className="w-full accent-green-500 cursor-pointer h-3 bg-black/60 rounded-lg"
          />
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-[#8ca388] block">Quick Presets:</span>
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setProgressTargetDay(0)}
              className="py-1.5 rounded-lg bg-[#182617] hover:bg-[#223720] text-[#c2d3bd] font-medium border border-[#2b4227] text-center"
            >
              Day 0 (0%)
            </button>
            <button
              type="button"
              onClick={() => setProgressTargetDay(7)}
              className="py-1.5 rounded-lg bg-[#182617] hover:bg-[#223720] text-[#c2d3bd] font-medium border border-[#2b4227] text-center"
            >
              Day 7 (25%)
            </button>
            <button
              type="button"
              onClick={() => setProgressTargetDay(14)}
              className="py-1.5 rounded-lg bg-[#182617] hover:bg-[#223720] text-[#c2d3bd] font-medium border border-[#2b4227] text-center"
            >
              Day 14 (50%)
            </button>
            <button
              type="button"
              onClick={() => setProgressTargetDay(21)}
              className="py-1.5 rounded-lg bg-[#182617] hover:bg-[#223720] text-[#c2d3bd] font-medium border border-[#2b4227] text-center"
            >
              Day 21 (75%)
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-xs pt-1">
            <button
              type="button"
              onClick={() => setProgressTargetDay(Math.max(0, progressTargetDay - 1))}
              className="py-1.5 rounded-lg bg-[#182617] hover:bg-[#223720] text-white font-bold border border-[#2b4227] text-center"
            >
              -1 Day
            </button>
            <button
              type="button"
              onClick={() => setProgressTargetDay(Math.min(28, progressTargetDay + 1))}
              className="py-1.5 rounded-lg bg-[#182617] hover:bg-[#223720] text-white font-bold border border-[#2b4227] text-center"
            >
              +1 Day
            </button>
            <button
              type="button"
              onClick={() => setProgressTargetDay(28)}
              className="py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 font-bold border border-amber-500/40 text-center"
            >
              Day 28 (100% Mature)
            </button>
          </div>
        </div>

        {progressSuccessMessage && (
          <div className="p-2.5 rounded-xl bg-green-500/20 border border-green-500/40 text-green-300 text-xs text-center font-bold">
            ✓ {progressSuccessMessage}
          </div>
        )}

        <div className="flex items-center space-x-3 pt-2">
          <button
            type="button"
            onClick={() => setProgressModalTarget(null)}
            className="flex-1 py-3 rounded-xl bg-[#283226] text-xs font-bold text-white hover:bg-[#344131]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => handleSaveGrowthProgress()}
            className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-xs font-bold text-white shadow-lg flex items-center justify-center space-x-1.5"
          >
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>Save &amp; Apply Day {progressTargetDay}</span>
          </button>
        </div>
      </motion.div>
    </div>
  )}
</div>
);
}
