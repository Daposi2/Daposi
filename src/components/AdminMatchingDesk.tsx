import React, { useState, useEffect } from 'react';
import { 
  Users, ArrowRight, ShieldCheck, CheckCircle2, Clock, 
  AlertCircle, Edit2, Trash2, Phone, Building, CreditCard, 
  RefreshCw, Loader2, X, Plus, Search, Check, Maximize2,
  MessageSquare
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  fetchAdminStats,
  createPeerMatch,
  updatePeerMatch,
  updatePayerPhone,
  deletePeerMatch,
  confirmPeerMatchByAdmin
} from '../lib/supabaseService';

interface Match {
  _id: string;
  pledgerId: any;
  receiverId: any;
  amount: number;
  status: 'Pending' | 'Paid' | 'Confirmed' | 'Cancelled';
  receiverName: string;
  receiverBankName: string;
  receiverAccountNumber: string;
  receiverAccountName: string;
  receiverPhone: string;
  pledgerName: string;
  pledgerPhone: string;
  paymentProof?: string | null;
  paymentProofName?: string | null;
  popNote?: string;
  popSubmittedAt?: string;
  adminConfirmed?: boolean;
  notes?: string;
  createdAt: string;
}

interface AdminMatchingDeskProps {
  adminToken: string;
  stats: any;
  onRefreshStats: () => void;
  initialPledgerId?: string | null;
  initialReceiverId?: string | null;
  onClearPreselection?: () => void;
  onMessageUser?: (userId: string) => void;
}

export default function AdminMatchingDesk({ 
  adminToken, 
  stats, 
  onRefreshStats,
  initialPledgerId,
  initialReceiverId,
  onClearPreselection,
  onMessageUser
}: AdminMatchingDeskProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State for creating match
  const [selectedPledgerId, setSelectedPledgerId] = useState('');
  const [selectedReceiverId, setSelectedReceiverId] = useState('');
  const [matchAmount, setMatchAmount] = useState('');
  
  // Custom / Overridable details
  const [pledgerPhone, setPledgerPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverBankName, setReceiverBankName] = useState('');
  const [receiverAccountNumber, setReceiverAccountNumber] = useState('');
  const [receiverAccountName, setReceiverAccountName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [selectedPledgeId, setSelectedPledgeId] = useState('');
  const [selectedGetHelpId, setSelectedGetHelpId] = useState('');

  // Quick inline phone editing state for matches table
  const [quickPhoneMatchId, setQuickPhoneMatchId] = useState<string | null>(null);
  const [quickPhoneVal, setQuickPhoneVal] = useState('');
  const [quickPhoneLoading, setQuickPhoneLoading] = useState(false);

  // Editing existing match modal
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editPledgerPhone, setEditPledgerPhone] = useState('');
  const [editReceiverPhone, setEditReceiverPhone] = useState('');
  const [editReceiverBank, setEditReceiverBank] = useState('');
  const [editReceiverAccountNo, setEditReceiverAccountNo] = useState('');
  const [editReceiverAccountName, setEditReceiverAccountName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editStatus, setEditStatus] = useState<any>('Pending');

  // Lightbox
  const [previewProof, setPreviewProof] = useState<string | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminStats();
      setMatches(data.matches || []);
    } catch (err) {
      console.error('Error fetching matches from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [adminToken]);

  useEffect(() => {
    if (initialPledgerId && stats?.users) {
      handlePledgerChange(initialPledgerId);
    }
    if (initialReceiverId && stats?.users) {
      handleReceiverChange(initialReceiverId);
    }
    if (onClearPreselection && (initialPledgerId || initialReceiverId)) {
      onClearPreselection();
    }
  }, [initialPledgerId, initialReceiverId, stats?.users]);

  // When a pledger is selected in the creation form
  const handlePledgerChange = (userId: string) => {
    setSelectedPledgerId(userId);
    const user = stats?.users?.find((u: any) => u._id === userId);
    if (user) {
      setPledgerPhone(user.phone || '');
      // Look for pending pledge
      const pendingPledge = stats?.pledges?.find((p: any) => (p.userId?._id === userId || p.userId === userId) && p.status === 'Pledged');
      if (pendingPledge) {
        setSelectedPledgeId(pendingPledge._id);
        if (!matchAmount) setMatchAmount(String(pendingPledge.amount));
      }
    }
  };

  // When a receiver is selected in the creation form
  const handleReceiverChange = (userId: string) => {
    setSelectedReceiverId(userId);
    const user = stats?.users?.find((u: any) => u._id === userId);
    if (user) {
      setReceiverName(user.name || '');
      setReceiverBankName(user.bankName || 'Access Bank');
      setReceiverAccountNumber(user.accountNumber || '0123456789');
      setReceiverAccountName(user.accountName || user.name || '');
      setReceiverPhone(user.phone || '');

      // Look for pending Get Help
      const pendingGH = stats?.getHelps?.find((gh: any) => (gh.userId?._id === userId || gh.userId === userId) && gh.status === 'Pending');
      if (pendingGH) {
        setSelectedGetHelpId(pendingGH._id);
        if (!matchAmount) setMatchAmount(String(pendingGH.amount));
      }
    }
  };

  // Create Match Handler
  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPledgerId || !selectedReceiverId || !matchAmount) {
      setMessage({ type: 'error', text: 'Please select both users and specify the amount.' });
      return;
    }

    if (selectedPledgerId === selectedReceiverId) {
      setMessage({ type: 'error', text: 'Pledger and Receiver cannot be the same user.' });
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const pledger = stats?.users?.find((u: any) => u._id === selectedPledgerId);
      const receiver = stats?.users?.find((u: any) => u._id === selectedReceiverId);

      const payload = {
        pledgerId: selectedPledgerId,
        receiverId: selectedReceiverId,
        amount: Number(matchAmount),
        receiverName: receiverName || receiver?.name || 'Receiver',
        receiverBankName: receiverBankName || 'Access Bank',
        receiverAccountNumber: receiverAccountNumber || '0123456789',
        receiverAccountName: receiverAccountName || receiver?.name || '',
        receiverPhone: receiverPhone || receiver?.phone || '',
        pledgerName: pledger?.name || 'Pledger',
        pledgerPhone: pledgerPhone || pledger?.phone || '',
        pledgeId: selectedPledgeId || undefined,
        getHelpId: selectedGetHelpId || undefined
      };

      await createPeerMatch(payload);

      setMessage({ type: 'success', text: `Match created successfully! Supporter will see payment details on "Support" and Receiver will see Payer's phone number on "Redeem Support".` });
      
      // Reset form
      setSelectedPledgerId('');
      setSelectedReceiverId('');
      setMatchAmount('');
      setPledgerPhone('');
      setReceiverBankName('');
      setReceiverAccountNumber('');
      setReceiverAccountName('');
      setReceiverPhone('');
      setSelectedPledgeId('');
      setSelectedGetHelpId('');

      fetchMatches();
      onRefreshStats();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error creating match' });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (m: Match) => {
    setEditingMatch(m);
    setEditPledgerPhone(m.pledgerPhone || '');
    setEditReceiverPhone(m.receiverPhone || '');
    setEditReceiverBank(m.receiverBankName || '');
    setEditReceiverAccountNo(m.receiverAccountNumber || '');
    setEditReceiverAccountName(m.receiverAccountName || '');
    setEditAmount(String(m.amount));
    setEditStatus(m.status);
  };

  // Save Edit Match
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;

    setActionLoading(true);
    try {
      await updatePeerMatch(editingMatch._id, {
        pledgerPhone: editPledgerPhone,
        receiverPhone: editReceiverPhone,
        receiverBankName: editReceiverBank,
        receiverAccountNumber: editReceiverAccountNo,
        receiverAccountName: editReceiverAccountName,
        amount: Number(editAmount),
        status: editStatus
      });

      setMessage({ type: 'success', text: 'Match and phone number updated successfully!' });
      setEditingMatch(null);
      fetchMatches();
      onRefreshStats();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error updating match' });
    } finally {
      setActionLoading(false);
    }
  };

  // Quick inline update for Payer's Phone Number
  const handleSaveQuickPhone = async (matchId: string) => {
    if (!quickPhoneVal.trim()) return;
    setQuickPhoneLoading(true);
    try {
      await updatePayerPhone(matchId, quickPhoneVal.trim());
      setMessage({ 
        type: 'success', 
        text: `Payer phone number updated to ${quickPhoneVal.trim()}! The recipient will now see this phone number when clicking "Redeem Support".` 
      });
      setQuickPhoneMatchId(null);
      fetchMatches();
      onRefreshStats();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error updating phone' });
    } finally {
      setQuickPhoneLoading(false);
    }
  };

  // Delete Match
  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to cancel and delete this match? The pledge and get help requests will be returned to the queue.')) return;

    try {
      await deletePeerMatch(matchId);
      setMessage({ type: 'success', text: 'Match cancelled and removed.' });
      fetchMatches();
      onRefreshStats();
    } catch (err) {
      console.error(err);
    }
  };

  // Confirm Match
  const handleConfirmMatch = async (matchId: string) => {
    try {
      await confirmPeerMatchByAdmin(matchId);
      setMessage({ type: 'success', text: 'Match marked as Confirmed and completed!' });
      fetchMatches();
      onRefreshStats();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Alert Banner */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center justify-between border ${
          message.type === 'success' 
            ? 'bg-green-500/10 border-green-500/30 text-green-300' 
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? <CheckCircle2 className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* MATCH MAKER SECTION */}
      <div className="rounded-2xl border border-[#2e422a] bg-[#202e1c] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#283e25]">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Users className="h-5 w-5 text-amber-400" />
              <span>Peer-to-Peer Account Matching Desk</span>
            </h3>
            <p className="text-xs text-[#9db299] mt-1">
              Match any pledger to pay directly into another user's bank account, and assign the payer's phone number for the receiver to contact.
            </p>
          </div>
          <button
            onClick={() => { fetchMatches(); onRefreshStats(); }}
            title="Refresh"
            className="p-2 rounded-xl bg-[#162315] hover:bg-[#253922] text-[#8ea489] hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleCreateMatch} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LEFT: PLEDGER (WHO PAYS) */}
            <div className="rounded-xl border border-green-500/30 bg-[#162315] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#243821] pb-2">
                <span className="text-xs font-bold text-green-400 uppercase tracking-wider">
                  1. Pledger (User Who Will Pay)
                </span>
                <span className="text-[11px] text-[#71876e]">Displays on "Pledge Help"</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c2d3bd] mb-1.5">
                  Select Pledging User
                </label>
                <select
                  value={selectedPledgerId}
                  onChange={(e) => handlePledgerChange(e.target.value)}
                  required
                  className="w-full rounded-xl bg-[#1d2d1b] border border-[#2e442a] p-3 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">-- Choose Pledger --</option>
                  {stats?.users?.map((u: any) => {
                    const pledge = stats?.pledges?.find((p: any) => (p.userId?._id === u._id || p.userId === u._id) && p.status === 'Pledged');
                    return (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email}) {pledge ? `— Pledged: ₦${pledge.amount.toLocaleString()}` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c2d3bd] mb-1.5">
                  Payer's Phone Number <span className="text-amber-400">(Visible to Receiver on Redeem Support)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-[#7d9378]" />
                  <input
                    type="text"
                    required
                    value={pledgerPhone}
                    onChange={(e) => setPledgerPhone(e.target.value)}
                    placeholder="e.g. +2348031234567"
                    className="w-full rounded-xl bg-[#1d2d1b] border border-[#2e442a] pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-[#7e9579] mt-1">
                  Admin can enter or modify the phone number the receiver will see when clicking "Redeem Support".
                </p>
              </div>
            </div>

            {/* RIGHT: RECEIVER (WHO RECEIVES MONEY) */}
            <div className="rounded-xl border border-amber-500/30 bg-[#162315] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#243821] pb-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  2. Recipient (User To Be Paid)
                </span>
                <span className="text-[11px] text-[#71876e]">Account details given to Pledger</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c2d3bd] mb-1.5">
                  Select Recipient User
                </label>
                <select
                  value={selectedReceiverId}
                  onChange={(e) => handleReceiverChange(e.target.value)}
                  required
                  className="w-full rounded-xl bg-[#1d2d1b] border border-[#2e442a] p-3 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose Recipient --</option>
                  {stats?.users?.map((u: any) => {
                    const gh = stats?.getHelps?.find((g: any) => (g.userId?._id === u._id || g.userId === u._id) && g.status === 'Pending');
                    return (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email}) {gh ? `— GH Request: ₦${gh.amount.toLocaleString()}` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#c2d3bd] mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={receiverBankName}
                    onChange={(e) => setReceiverBankName(e.target.value)}
                    placeholder="e.g. Access Bank"
                    className="w-full rounded-xl bg-[#1d2d1b] border border-[#2e442a] px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c2d3bd] mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={receiverAccountNumber}
                    onChange={(e) => setReceiverAccountNumber(e.target.value)}
                    placeholder="e.g. 0123456789"
                    className="w-full rounded-xl bg-[#1d2d1b] border border-[#2e442a] px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#c2d3bd] mb-1">Account Name</label>
                  <input
                    type="text"
                    required
                    value={receiverAccountName}
                    onChange={(e) => setReceiverAccountName(e.target.value)}
                    placeholder="e.g. Chioma Eze"
                    className="w-full rounded-xl bg-[#1d2d1b] border border-[#2e442a] px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c2d3bd] mb-1">Recipient Phone</label>
                  <input
                    type="text"
                    required
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="e.g. +2348012345678"
                    className="w-full rounded-xl bg-[#1d2d1b] border border-[#2e442a] px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AMOUNT & SUBMIT */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#162315] border border-[#2e422a]">
            <div className="w-full sm:w-72">
              <label className="block text-xs font-semibold text-[#c2d3bd] mb-1">
                Amount to Match (NGN)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-[#7d9378] font-bold">₦</span>
                <input
                  type="number"
                  required
                  min="1000"
                  value={matchAmount}
                  onChange={(e) => setMatchAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full rounded-xl bg-[#1d2d1b] border border-[#2e442a] pl-8 pr-4 py-2 text-base font-bold text-white focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold text-sm shadow-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              <span>Create Peer Match</span>
            </button>
          </div>
        </form>
      </div>

      {/* ACTIVE & HISTORICAL MATCHES TABLE */}
      <div className="rounded-2xl border border-[#2e422a] bg-[#202e1c] overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#283e25] bg-[#162214]/70 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Active & Historical Matches</h3>
            <p className="text-xs text-[#8ca388]">All assigned peer payments across the platform</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 text-xs font-bold">
            {matches.length} Total Matches
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#c2d3bd]">
            <thead className="border-b border-[#283e25] bg-[#121c11] uppercase text-[11px] text-[#8ca388]">
              <tr>
                <th className="px-4 py-3 font-semibold">Pledger (Payer)</th>
                <th className="px-4 py-3 font-semibold">Payer Phone (Seen on GH)</th>
                <th className="px-4 py-3 font-semibold">Recipient Bank Details</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Proof</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243720]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#7d9378]">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-green-500" />
                    Loading matches...
                  </td>
                </tr>
              ) : matches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#7d9378]">
                    No matches created yet. Select a pledger and recipient above to assign a match!
                  </td>
                </tr>
              ) : (
                matches.map((m) => (
                  <tr key={m._id} className="hover:bg-[#1a2918] transition-colors">
                    {/* Pledger */}
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div>
                          <div className="font-semibold text-white">{m.pledgerName || m.pledgerId?.name || 'User'}</div>
                          <div className="text-xs text-[#8ca388]">{m.pledgerId?.email}</div>
                        </div>
                        {onMessageUser && (
                          <button
                            type="button"
                            onClick={() => onMessageUser(m.pledgerId?._id || m.pledgerId)}
                            title="Message Pledger"
                            className="p-1 rounded-md bg-[#253922] hover:bg-[#314c2c] text-[#a4bca1] hover:text-white transition-colors ml-auto"
                          >
                            <MessageSquare className="h-3 w-3 text-green-400" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Pledger Phone (Seen by Receiver on Redeem Support) */}
                    <td className="px-4 py-3">
                      {quickPhoneMatchId === m._id ? (
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="text"
                            value={quickPhoneVal}
                            onChange={(e) => setQuickPhoneVal(e.target.value)}
                            placeholder="+234..."
                            className="px-2 py-1 rounded bg-[#131f12] border border-amber-500 text-xs font-mono text-white w-32 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveQuickPhone(m._id);
                              if (e.key === 'Escape') setQuickPhoneMatchId(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveQuickPhone(m._id)}
                            disabled={quickPhoneLoading}
                            className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold"
                            title="Save Phone"
                          >
                            {quickPhoneLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickPhoneMatchId(null)}
                            className="p-1 text-[#8ca388] hover:text-white text-xs"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1.5 font-mono text-xs text-amber-300 font-semibold bg-[#142013] px-2.5 py-1 rounded-lg border border-[#2a3f27] inline-flex">
                            <Phone className="h-3 w-3 text-amber-400" />
                            <span>{m.pledgerPhone || 'Not set'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setQuickPhoneMatchId(m._id); setQuickPhoneVal(m.pledgerPhone || ''); }}
                            className="p-1 px-1.5 rounded bg-[#1e2f1c] hover:bg-[#284025] text-amber-400 hover:text-amber-300 text-[11px] flex items-center space-x-1 border border-[#30482b]"
                            title="Add or update phone number seen on Redeem Support"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>{m.pledgerPhone ? 'Edit' : '+ Add Phone'}</span>
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Recipient */}
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div>
                          <div className="font-semibold text-white">{m.receiverName}</div>
                          <div className="text-xs text-[#a1b89d]">
                            {m.receiverBankName} • <span className="font-mono text-white font-medium">{m.receiverAccountNumber}</span>
                          </div>
                          <div className="text-[11px] text-[#7d9378]">
                            Name: {m.receiverAccountName} • Tel: {m.receiverPhone}
                          </div>
                        </div>
                        {onMessageUser && (
                          <button
                            type="button"
                            onClick={() => onMessageUser(m.receiverId?._id || m.receiverId)}
                            title="Message Recipient"
                            className="p-1 rounded-md bg-[#253922] hover:bg-[#314c2c] text-[#a4bca1] hover:text-white transition-colors ml-auto self-start mt-0.5"
                          >
                            <MessageSquare className="h-3 w-3 text-amber-400" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 font-bold text-white text-sm">
                      {formatCurrency(m.amount)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center space-x-1 ${
                        m.status === 'Confirmed' 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : m.status === 'Paid'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20'
                      }`}>
                        {m.status === 'Confirmed' ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        <span>{m.status}</span>
                      </span>
                    </td>

                    {/* Proof */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 max-w-[160px]">
                        {m.paymentProof ? (
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => setPreviewProof(m.paymentProof || null)}
                              className="relative group rounded-lg overflow-hidden border border-green-500/40 h-9 w-9 block flex-shrink-0"
                              title="Click to view full receipt"
                            >
                              <img src={m.paymentProof} alt="Proof" className="h-full w-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Maximize2 className="h-3.5 w-3.5 text-white" />
                              </div>
                            </button>
                            <span className="text-[10px] text-green-300 font-semibold truncate">Receipt Uploaded</span>
                          </div>
                        ) : null}

                        {m.popNote ? (
                          <div className="text-[11px] text-[#b8ccb5] bg-black/30 p-1 rounded border border-[#2b3e27] truncate" title={m.popNote}>
                            <span className="text-amber-400 font-bold">POP: </span>{m.popNote}
                          </div>
                        ) : null}

                        {!m.paymentProof && !m.popNote && (
                          <span className="text-xs text-[#6e826b] italic">No receipt</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          title="Edit Phone & Bank Details"
                          className="p-1.5 rounded-lg bg-[#243821] hover:bg-[#2e472a] text-[#a4bca1] hover:text-white transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        {m.status !== 'Confirmed' && (
                          <button
                            onClick={() => handleConfirmMatch(m._id)}
                            title="Confirm Payment Completed"
                            className="p-1.5 rounded-lg bg-green-600/30 hover:bg-green-600 text-green-300 hover:text-white transition-colors border border-green-500/30"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteMatch(m._id)}
                          title="Cancel Match"
                          className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900 text-red-300 hover:text-white transition-colors border border-red-800/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-[#2e422a] bg-[#1a2818] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#283e25]">
                <h3 className="font-bold text-white text-base">Edit Match Details & Phone Numbers</h3>
                <button onClick={() => setEditingMatch(null)} className="text-[#8ca388] hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1">
                    Payer's Phone Number (Displayed to Receiver on "Redeem Support")
                  </label>
                  <input
                    type="text"
                    required
                    value={editPledgerPhone}
                    onChange={(e) => setEditPledgerPhone(e.target.value)}
                    className="w-full rounded-xl bg-[#142013] border border-[#2e442a] p-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#c2d3bd] mb-1">Receiver Bank</label>
                    <input
                      type="text"
                      required
                      value={editReceiverBank}
                      onChange={(e) => setEditReceiverBank(e.target.value)}
                      className="w-full rounded-xl bg-[#142013] border border-[#2e442a] p-2.5 text-sm text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#c2d3bd] mb-1">Receiver Account No</label>
                    <input
                      type="text"
                      required
                      value={editReceiverAccountNo}
                      onChange={(e) => setEditReceiverAccountNo(e.target.value)}
                      className="w-full rounded-xl bg-[#142013] border border-[#2e442a] p-2.5 text-sm text-white font-mono focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#c2d3bd] mb-1">Receiver Account Name</label>
                    <input
                      type="text"
                      required
                      value={editReceiverAccountName}
                      onChange={(e) => setEditReceiverAccountName(e.target.value)}
                      className="w-full rounded-xl bg-[#142013] border border-[#2e442a] p-2.5 text-sm text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#c2d3bd] mb-1">Receiver Phone</label>
                    <input
                      type="text"
                      required
                      value={editReceiverPhone}
                      onChange={(e) => setEditReceiverPhone(e.target.value)}
                      className="w-full rounded-xl bg-[#142013] border border-[#2e442a] p-2.5 text-sm text-white font-mono focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#c2d3bd] mb-1">Amount (NGN)</label>
                    <input
                      type="number"
                      required
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full rounded-xl bg-[#142013] border border-[#2e442a] p-2.5 text-sm text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#c2d3bd] mb-1">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full rounded-xl bg-[#142013] border border-[#2e442a] p-2.5 text-sm text-white focus:outline-none focus:border-green-500"
                    >
                      <option value="Pending">Pending (Awaiting Payment)</option>
                      <option value="Paid">Paid (Receipt Uploaded)</option>
                      <option value="Confirmed">Confirmed (Completed)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#283e25]">
                  <button
                    type="button"
                    onClick={() => setEditingMatch(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8ca388] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs shadow-md transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX FOR PROOF */}
      <AnimatePresence>
        {previewProof && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setPreviewProof(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setPreviewProof(null)}
                className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              <img
                src={previewProof}
                alt="Enlarged Proof"
                className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/20"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
