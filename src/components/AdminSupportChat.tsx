import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Image as ImageIcon, X, Maximize2, 
  Search, RefreshCw, Loader2, CheckCheck, User as UserIcon,
  ShieldCheck, AlertCircle, Phone, Mail, Wallet, ArrowUpRight,
  Plus, Sparkles, Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../lib/utils';
import { fetchAdminConversations, fetchAdminMessagesForUser, sendAdminMessage } from '../lib/supabaseService';

interface Conversation {
  userId: string;
  user: {
    _id?: string;
    name: string;
    email: string;
    phone?: string;
    walletBalance?: number;
    totalPledged?: number;
  };
  lastMessage?: {
    text: string;
    imageUrl?: string | null;
    createdAt: string;
    senderRole: 'user' | 'admin';
  } | null;
  unreadCount: number;
  totalMessages: number;
}

interface Message {
  _id: string;
  userId: string;
  senderRole: 'user' | 'admin';
  senderName: string;
  text: string;
  imageUrl?: string | null;
  imageName?: string | null;
  readByAdmin: boolean;
  readByUser: boolean;
  createdAt: string;
}

interface AdminSupportChatProps {
  adminToken: string;
  onTotalUnreadChange?: (count: number) => void;
  initialUserId?: string | null;
  allUsers?: any[];
}

export default function AdminSupportChat({ adminToken, onTotalUnreadChange, initialUserId, allUsers = [] }: AdminSupportChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [previewLightbox, setPreviewLightbox] = useState<string | null>(null);
  
  // New chat modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingConversationsRef = useRef<NodeJS.Timeout | null>(null);
  const pollingMessagesRef = useRef<NodeJS.Timeout | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch all conversations from Supabase
  const fetchConversations = async (isInitial = false) => {
    if (!adminToken) return;
    if (isInitial) setLoadingConversations(true);
    try {
      const data: Conversation[] = await fetchAdminConversations();
      setConversations(data);
      
      // Calculate total unread
      const total = data.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      if (onTotalUnreadChange) onTotalUnreadChange(total);

      // Auto-select initial user or first conversation if none selected
      if (initialUserId) {
        setSelectedUserId(initialUserId);
      } else if (!selectedUserId && data.length > 0 && isInitial) {
        setSelectedUserId(data[0].userId);
      }
    } catch (err) {
      console.error('Error fetching admin conversations from Supabase:', err);
    } finally {
      if (isInitial) setLoadingConversations(false);
    }
  };

  // Fetch messages for active user
  const fetchMessagesForUser = async (userId: string, isInitial = false) => {
    if (!adminToken || !userId) return;
    if (isInitial) setLoadingMessages(true);
    try {
      const data = await fetchAdminMessagesForUser(userId);
      setMessages(data.messages || []);
      if (data.user) {
        setSelectedUser(data.user);
        // If conversation wasn't in list, inject it
        setConversations(prev => {
          const exists = prev.some(c => c.userId === userId);
          if (!exists) {
            return [{
              userId,
              user: data.user,
              lastMessage: data.messages?.slice(-1)[0] || null,
              unreadCount: 0,
              totalMessages: data.messages?.length || 0
            }, ...prev];
          }
          return prev.map(c => c.userId === userId ? { ...c, unreadCount: 0 } : c);
        });
      }
    } catch (err) {
      console.error('Error fetching messages for user:', err);
    } finally {
      if (isInitial) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (initialUserId) {
      setSelectedUserId(initialUserId);
      fetchMessagesForUser(initialUserId, true);
    }
  }, [initialUserId]);

  useEffect(() => {
    fetchConversations(true);

    pollingConversationsRef.current = setInterval(() => {
      fetchConversations(false);
    }, 4000);

    return () => {
      if (pollingConversationsRef.current) clearInterval(pollingConversationsRef.current);
    };
  }, [adminToken]);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessagesForUser(selectedUserId, true);

      if (pollingMessagesRef.current) clearInterval(pollingMessagesRef.current);
      pollingMessagesRef.current = setInterval(() => {
        fetchMessagesForUser(selectedUserId, false);
      }, 3000);
    }

    return () => {
      if (pollingMessagesRef.current) clearInterval(pollingMessagesRef.current);
    };
  }, [selectedUserId, adminToken]);

  // Scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Image handling
  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
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

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setSelectedImage({ dataUrl, name: file.name });
        } else {
          setSelectedImage({ dataUrl: e.target?.result as string, name: file.name });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelect(e.target.files[0]);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUserId || (!inputText.trim() && !selectedImage) || sending) return;

    setSending(true);
    setError('');

    try {
      const newMessage = await sendAdminMessage({
        userId: selectedUserId,
        text: inputText.trim(),
        imageUrl: selectedImage ? selectedImage.dataUrl : null,
        imageName: selectedImage ? selectedImage.name : null
      });

      setMessages(prev => [...prev, newMessage]);
      setInputText('');
      setSelectedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      fetchConversations(false);
    } catch (err: any) {
      setError(err.message || 'Error sending message');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c => {
    const q = searchQuery.toLowerCase();
    const nameMatch = c.user?.name?.toLowerCase().includes(q);
    const emailMatch = c.user?.email?.toLowerCase().includes(q);
    const phoneMatch = c.user?.phone?.toLowerCase().includes(q);
    return nameMatch || emailMatch || phoneMatch;
  });

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="rounded-2xl border border-[#2e422a] bg-[#1a2818] overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-12 min-h-[600px] h-[720px]">
      
      {/* LEFT COLUMN: User Conversations List */}
      <div className="lg:col-span-4 border-r border-[#283e25] flex flex-col bg-[#141f13]">
        {/* Header & Search */}
        <div className="p-4 border-b border-[#283e25] space-y-3 bg-[#111a10]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-green-400" />
              <h3 className="font-bold text-white text-base">User Inquiries</h3>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setShowNewChatModal(true)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all shadow-md"
                title="Message any registered user"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Chat</span>
              </button>
              <button
                type="button"
                onClick={() => fetchConversations(true)}
                title="Refresh"
                className="p-1.5 rounded-lg text-[#8ea489] hover:text-white hover:bg-[#20311f] transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6e8469]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user name or email..."
              className="w-full rounded-xl bg-[#1a2918] border border-[#2b3f27] pl-9 pr-4 py-2 text-xs text-white placeholder-[#6e8469] focus:outline-none focus:border-green-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#223520]">
          {loadingConversations ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-green-500" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-[#7d9378] text-sm">
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedUserId === conv.userId;
              return (
                <button
                  key={conv.userId}
                  onClick={() => setSelectedUserId(conv.userId)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start space-x-3 ${
                    isSelected ? 'bg-[#223620] border-l-4 border-green-500' : 'hover:bg-[#1a2918]'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-[#273d24] border border-[#3b5536] flex items-center justify-center font-bold text-white text-sm">
                      {conv.user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-black ring-2 ring-[#141f13]">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-sm text-white truncate">
                        {conv.user?.name || 'User'}
                      </span>
                      <span className="text-[10px] text-[#71876d] flex-shrink-0 ml-1">
                        {formatTime(conv.lastMessage?.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-[#95ab91] truncate mb-1">
                      {conv.user?.email}
                    </p>
                    <p className="text-xs text-[#6e836a] truncate italic">
                      {conv.lastMessage?.imageUrl ? '📷 [Image attachment] ' : ''}
                      {conv.lastMessage?.text || (conv.lastMessage?.imageUrl ? '' : 'No messages yet')}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Chat Thread */}
      <div className="lg:col-span-8 flex flex-col bg-[#162315] relative">
        {selectedUserId ? (
          <>
            {/* Header with User Info */}
            <div className="px-6 py-3.5 border-b border-[#283e25] bg-[#121c11] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center font-bold text-green-400">
                  {selectedUser?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-white text-base">{selectedUser?.name || 'Selected User'}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
                      User
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-[#8ca388] mt-0.5">
                    <span className="flex items-center space-x-1">
                      <Mail className="h-3 w-3" />
                      <span>{selectedUser?.email}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedUser?.email, 'email')}
                        className="p-0.5 hover:text-white"
                        title="Copy email address"
                      >
                        {copiedKey === 'email' ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </span>
                    {selectedUser?.phone && (
                      <span className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{selectedUser?.phone}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedUser?.phone, 'phone')}
                          className="p-0.5 hover:text-white"
                          title="Copy phone number"
                        >
                          {copiedKey === 'phone' ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                        <a
                          href={`tel:${selectedUser.phone}`}
                          className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 text-[10px] font-bold hover:bg-green-500/30 ml-1"
                        >
                          Call
                        </a>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* User Financial Summary */}
              <div className="flex items-center space-x-4 bg-[#192817] px-3.5 py-1.5 rounded-xl border border-[#2c4028] text-xs">
                <div>
                  <span className="text-[#7d9378] block text-[10px]">WALLET</span>
                  <span className="font-bold text-white">{formatCurrency(selectedUser?.walletBalance || 0)}</span>
                </div>
                <div className="h-6 w-px bg-[#2d4229]" />
                <div>
                  <span className="text-[#7d9378] block text-[10px]">PLEDGED</span>
                  <span className="font-bold text-green-400">{formatCurrency(selectedUser?.totalPledged || 0)}</span>
                </div>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#141f13]">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-green-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-[#7d9378]">
                  <MessageSquare className="h-10 w-10 mb-2 opacity-50" />
                  <p className="font-medium text-white mb-1">No conversation yet</p>
                  <p className="text-xs">Start a conversation or send verification info to this user below.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isAdmin = msg.senderRole === 'admin';
                  return (
                    <div
                      key={msg._id || idx}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center space-x-2 mb-1 px-1">
                        <span className="text-xs font-semibold text-[#8ca388]">
                          {isAdmin ? 'You (DAPOSI Support)' : selectedUser?.name || 'User'}
                        </span>
                        <span className="text-[10px] text-[#6d8268]">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[80%] rounded-2xl p-3.5 shadow-sm space-y-2 ${
                          isAdmin
                            ? 'bg-gradient-to-br from-[#2a4527] to-[#1e331c] text-white rounded-tr-none border border-green-500/30'
                            : 'bg-[#1e2d1d] text-[#e8f1e6] rounded-tl-none border border-[#2f462c]'
                        }`}
                      >
                        {/* Image attachment */}
                        {msg.imageUrl && (
                          <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-black/40">
                            <img
                              src={msg.imageUrl}
                              alt={msg.imageName || 'Attached proof'}
                              className="max-h-72 w-auto object-contain cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
                              onClick={() => setPreviewLightbox(msg.imageUrl || null)}
                            />
                            <button
                              type="button"
                              onClick={() => setPreviewLightbox(msg.imageUrl || null)}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                            >
                              <Maximize2 className="h-4 w-4" />
                            </button>
                            {msg.imageName && (
                              <div className="px-2 py-1 text-[11px] text-white/70 truncate bg-black/40">
                                {msg.imageName}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Text */}
                        {msg.text && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {msg.text}
                          </p>
                        )}

                        {/* Read status */}
                        {isAdmin && (
                          <div className="flex justify-end items-center space-x-1 pt-0.5 text-[10px] text-green-200/60">
                            <span>{msg.readByUser ? 'Seen by user' : 'Delivered'}</span>
                            <CheckCheck className={`h-3 w-3 ${msg.readByUser ? 'text-amber-300' : 'text-green-300'}`} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error banner if any */}
            {error && (
              <div className="px-4 py-2 bg-red-950/70 border-t border-red-800/40 text-red-300 text-xs flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError('')}><X className="h-3 w-3" /></button>
              </div>
            )}

            {/* Selected Image Preview for admin */}
            {selectedImage && (
              <div className="px-4 py-2 bg-[#11190f] border-t border-[#253821] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <img src={selectedImage.dataUrl} alt="Preview" className="h-10 w-10 rounded object-cover border border-green-500/40" />
                  <span className="text-xs text-white truncate max-w-sm">{selectedImage.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-1 text-[#8ca388] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Quick Reply Templates */}
            <div className="px-4 py-2 bg-[#10180e] border-t border-[#233520] flex items-center space-x-2 overflow-x-auto">
              <span className="text-[11px] font-semibold text-[#7d9378] flex items-center space-x-1 flex-shrink-0">
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Quick reply:</span>
              </span>
              {[
                "Hello! Your payment has been verified and confirmed. Thank you!",
                "Please upload a clear payment receipt/screenshot so we can verify.",
                "You have been matched! Please check 'Pledge Help' on your dashboard to see who to pay.",
                "Your payout has been processed and sent to your bank account.",
                "Please update your bank account details in your dashboard so we can match you."
              ].map((template, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(template)}
                  className="px-2.5 py-1 rounded-lg bg-[#182617] hover:bg-[#223620] text-[#a4bca1] hover:text-white border border-[#2a3f28] text-[11px] whitespace-nowrap transition-colors flex-shrink-0"
                >
                  {template}
                </button>
              ))}
            </div>

            {/* Admin Reply Composer */}
            <form onSubmit={handleSendMessage} className="p-4 bg-[#121c11] border-t border-[#283e25]">
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach screenshot or receipt"
                  className="flex items-center justify-center h-10 w-10 rounded-xl bg-[#1e2f1b] border border-[#2e452a] text-[#a1b89d] hover:text-amber-400 hover:border-amber-400/50 transition-colors flex-shrink-0"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Reply to ${selectedUser?.name || 'user'} (e.g. payout verified, receipt confirmed)...`}
                  disabled={sending}
                  className="flex-1 rounded-xl bg-[#1a2918] border border-[#2e452a] px-4 py-2.5 text-sm text-white placeholder-[#788e74] focus:outline-none focus:border-green-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={(!inputText.trim() && !selectedImage) || sending}
                  className="flex items-center justify-center h-10 px-4 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-medium text-sm transition-all shadow-md flex-shrink-0 space-x-1.5"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Reply</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#7d9378]">
            <MessageSquare className="h-12 w-12 mb-3 text-green-500/40" />
            <h4 className="text-base font-bold text-white mb-1">Select a User Conversation</h4>
            <p className="text-xs max-w-sm mb-4">
              Click on any user in the left panel to review their inquiry, view uploaded images or receipts, and reply directly.
            </p>
            <button
              type="button"
              onClick={() => setShowNewChatModal(true)}
              className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs shadow flex items-center space-x-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Start New Chat with Any User</span>
            </button>
          </div>
        )}
      </div>

      {/* NEW CHAT USER PICKER MODAL */}
      <AnimatePresence>
        {showNewChatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-[#2e422a] bg-[#1a2818] p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#283e25]">
                <div>
                  <h3 className="font-bold text-white text-base">Message Any Registered User</h3>
                  <p className="text-xs text-[#8ca388]">Select a user to start a live support conversation</p>
                </div>
                <button onClick={() => setShowNewChatModal(false)} className="text-[#8ca388] hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6e8469]" />
                <input
                  type="text"
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="w-full rounded-xl bg-[#141f13] border border-[#2b3f27] pl-9 pr-4 py-2 text-xs text-white placeholder-[#6e8469] focus:outline-none focus:border-green-500"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[#233520] max-h-96 pr-1">
                {allUsers
                  .filter((u: any) => u.role !== 'admin')
                  .filter((u: any) => {
                    const q = newChatSearch.toLowerCase();
                    return (
                      u.name?.toLowerCase().includes(q) ||
                      u.email?.toLowerCase().includes(q) ||
                      u.phone?.toLowerCase().includes(q)
                    );
                  })
                  .map((u: any) => (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(u._id);
                        fetchMessagesForUser(u._id, true);
                        setShowNewChatModal(false);
                      }}
                      className="w-full text-left p-3 hover:bg-[#20311f] rounded-xl transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center font-bold text-green-400 text-xs">
                          {u.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{u.name}</p>
                          <p className="text-xs text-[#8ca388]">{u.email}</p>
                          {u.phone && <p className="text-[11px] font-mono text-[#6d8268]">{u.phone}</p>}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <span className="px-2 py-1 rounded bg-[#162315] text-green-400 font-semibold border border-[#253922]">
                          Chat →
                        </span>
                      </div>
                    </button>
                  ))}
                {allUsers.filter((u: any) => u.role !== 'admin').length === 0 && (
                  <p className="text-xs text-[#7d9378] text-center py-6">No users found.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox for Admin */}
      <AnimatePresence>
        {previewLightbox && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setPreviewLightbox(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setPreviewLightbox(null)}
                className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              <img
                src={previewLightbox}
                alt="Enlarged view"
                className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/20"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
