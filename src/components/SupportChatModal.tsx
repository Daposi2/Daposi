import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Image as ImageIcon, Paperclip, X, 
  Maximize2, CheckCheck, Loader2, ShieldCheck, RefreshCw, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchUserMessages, sendUserMessage } from '../lib/supabaseService';
import { supabase } from '../supabaseClient';

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

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  userName: string;
}

export default function SupportChatModal({ isOpen, onClose, token, userName }: SupportChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [previewLightbox, setPreviewLightbox] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch messages from Supabase
  const fetchMessages = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const data = await fetchUserMessages(user.id);
      setMessages(data);
    } catch (err) {
      console.error('Error fetching support messages:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages(true);
      // Poll every 3 seconds while chat is active
      pollingRef.current = setInterval(() => {
        fetchMessages(false);
      }, 3000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isOpen, token]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Compress and convert image to base64 Data URL
  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG, WEBP)');
      return;
    }
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize image if greater than 1600px width/height for optimal performance
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

  // Drag and drop support
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageSelect(e.dataTransfer.files[0]);
    }
  };

  // Paste support (e.g. screenshot pasted from clipboard)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) handleImageSelect(file);
        break;
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || sending) return;

    setSending(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newMessage = await sendUserMessage({
        userId: user.id,
        userName: userName || 'Farmer',
        text: inputText.trim(),
        imageUrl: selectedImage ? selectedImage.dataUrl : null,
        imageName: selectedImage ? selectedImage.name : null
      });

      setMessages((prev) => [...prev, newMessage]);
      setInputText('');
      setSelectedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || 'Error sending message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onPaste={handlePaste}
              className="flex flex-col w-full max-w-2xl h-[92vh] max-h-[720px] rounded-2xl bg-[#162315] border border-[#2d4429] shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#283d25] bg-[#121c11]">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-[#121c11]" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-white text-base">DAPOSI Admin & Support</h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30">
                        Official Desk
                      </span>
                    </div>
                    <p className="text-xs text-[#8ca388]">
                      Direct communication channel for payments, pledges & inquiries
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => fetchMessages(false)}
                    title="Refresh messages"
                    className="p-2 rounded-lg text-[#8ca388] hover:text-white hover:bg-[#20311f] transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-[#8ca388] hover:text-white hover:bg-[#20311f] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#141f13]">
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-green-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                    <div className="h-14 w-14 rounded-2xl bg-[#20311f] border border-[#2d4429] flex items-center justify-center text-green-400">
                      <MessageSquare className="h-7 w-7" />
                    </div>
                    <div className="max-w-md">
                      <h4 className="text-lg font-bold text-white mb-1">Welcome, {userName}!</h4>
                      <p className="text-sm text-[#9db299]">
                        You can send messages and upload images or receipts directly to DAPOSI administrators here. We are active and ready to assist you.
                      </p>
                    </div>

                    {/* Quick Suggestions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md pt-2">
                      {[
                        '📷 I want to upload a payment receipt',
                        '🌾 Questions about my support and dividend',
                        '💰 Assistance with Redeem Support payout',
                        '🔒 Confirm my account verification'
                      ].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInputText(prompt)}
                          className="text-left text-xs text-[#c2d3bd] p-2.5 rounded-xl bg-[#1b2b1a] border border-[#2c4028] hover:border-green-500/40 hover:bg-[#223620] transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-center my-2">
                      <span className="text-[11px] font-medium text-[#7d9378] bg-[#1a2818] px-3 py-1 rounded-full border border-[#273a25]">
                        Live Secure Communication Channel
                      </span>
                    </div>

                    {messages.map((msg, idx) => {
                      const isUser = msg.senderRole === 'user';
                      return (
                        <div
                          key={msg._id || idx}
                          className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center space-x-2 mb-1 px-1">
                            <span className="text-xs font-semibold text-[#8ca388]">
                              {isUser ? 'You' : 'DAPOSI Admin'}
                            </span>
                            <span className="text-[10px] text-[#6d8268]">
                              {formatDateLabel(msg.createdAt)} {formatTime(msg.createdAt)}
                            </span>
                          </div>

                          <div
                            className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-sm space-y-2 ${
                              isUser
                                ? 'bg-gradient-to-br from-green-700 to-green-800 text-white rounded-tr-none border border-green-600/30'
                                : 'bg-[#1e2d1d] text-[#e8f1e6] rounded-tl-none border border-[#2f462c]'
                            }`}
                          >
                            {/* Attached Image if present */}
                            {msg.imageUrl && (
                              <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-black/30">
                                <img
                                  src={msg.imageUrl}
                                  alt={msg.imageName || 'Uploaded proof'}
                                  className="max-h-64 sm:max-h-80 w-auto object-contain cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
                                  onClick={() => setPreviewLightbox(msg.imageUrl || null)}
                                />
                                <button
                                  type="button"
                                  onClick={() => setPreviewLightbox(msg.imageUrl || null)}
                                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                                  title="View Full Size"
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

                            {/* Message Text */}
                            {msg.text && (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {msg.text}
                              </p>
                            )}

                            {/* Read indicator for user messages */}
                            {isUser && (
                              <div className="flex justify-end items-center space-x-1 pt-0.5 text-[10px] text-green-200/70">
                                <span>{msg.readByAdmin ? 'Seen by Admin' : 'Sent'}</span>
                                <CheckCheck className={`h-3 w-3 ${msg.readByAdmin ? 'text-amber-300' : 'text-green-300'}`} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Error Notice if any */}
              {error && (
                <div className="px-4 py-2 bg-red-950/60 border-t border-red-800/40 text-red-300 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                  <button onClick={() => setError('')} className="p-1 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Selected Image Preview before sending */}
              {selectedImage && (
                <div className="px-4 py-3 bg-[#11190f] border-t border-[#253821] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-green-500/40 bg-black">
                      <img
                        src={selectedImage.dataUrl}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md">
                        {selectedImage.name}
                      </p>
                      <p className="text-[11px] text-green-400">Ready to send with message</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1.5 rounded-lg text-[#8ca388] hover:text-white hover:bg-[#20311f] transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Message Composer */}
              <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-[#121c11] border-t border-[#283d25]">
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
                    title="Attach image or receipt"
                    className="flex items-center justify-center h-10 w-10 rounded-xl bg-[#1e2f1b] border border-[#2e452a] text-[#a1b89d] hover:text-amber-400 hover:border-amber-400/50 hover:bg-[#273d24] transition-colors flex-shrink-0"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={selectedImage ? "Add an optional caption..." : "Message admin (or drag & drop/paste image)..."}
                      disabled={sending}
                      className="w-full rounded-xl bg-[#1a2918] border border-[#2e452a] px-4 py-2.5 text-sm text-white placeholder-[#788e74] focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !selectedImage) || sending}
                    className="flex items-center justify-center h-10 w-10 sm:w-auto sm:px-4 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:hover:bg-green-600 text-white font-medium text-sm transition-all shadow-md flex-shrink-0 space-x-1.5"
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">Send</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#6d8268] px-1">
                  <span>Supports image upload (receipts, proofs, documents)</span>
                  <span className="hidden sm:inline">Tip: You can paste screenshots with Ctrl+V / Cmd+V</span>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Image Lightbox */}
      <AnimatePresence>
        {previewLightbox && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setPreviewLightbox(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
