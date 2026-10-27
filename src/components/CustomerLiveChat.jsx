import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  Image as ImageIcon,
  Video,
  CheckCheck,
  Sparkles,
  RotateCcw,
  Package,
  HelpCircle,
  CreditCard,
  Maximize2,
  Minimize2,
  Loader2,
  ChevronDown,
  Info,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
  CHAT_CATEGORIES,
  getCategoryMeta,
  createChatTicket,
  fetchTicket,
  fetchCustomerTickets,
  fetchTicketMessages,
  sendChatMessage,
  markTicketAsRead,
} from '../lib/chatService';

// Memoized Single Message Bubble to prevent entire thread re-renders
const ChatMessageItem = React.memo(({ msg, onExpandImage }) => {
  const isCustomer = msg.sender_type === 'CUSTOMER';
  const isAutoReply = Boolean(msg.is_auto_reply);

  const formattedTime = useMemo(() => {
    try {
      const d = new Date(msg.created_at);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }, [msg.created_at]);

  return (
    <div
      className={`flex flex-col ${
        isCustomer ? 'items-end' : 'items-start'
      } space-y-1 my-2.5 max-w-[85%] ${isCustomer ? 'ml-auto' : 'mr-auto'}`}
    >
      {/* Sender Header */}
      <div className="flex items-center gap-1.5 px-1 text-[10px] text-[#A38E88]">
        {!isCustomer && (
          <span className="font-bold text-[#2C1E1B]">{msg.sender_name || 'Aura Support'}</span>
        )}
        {isAutoReply && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[9px] font-semibold">
            <Sparkles className="w-2.5 h-2.5 text-amber-500" />
            <span>Instant Auto-Reply</span>
          </span>
        )}
        <span>{formattedTime}</span>
      </div>

      {/* Bubble Content */}
      <div
        className={`p-3.5 rounded-2xl text-xs leading-relaxed break-words shadow-xs ${
          isCustomer
            ? 'bg-[#2C1E1B] text-white rounded-tr-none'
            : 'bg-white border border-[#E8DCD7] text-[#2C1E1B] rounded-tl-none'
        }`}
      >
        {/* Text */}
        {msg.message_text && (
          <p className="whitespace-pre-wrap">{msg.message_text}</p>
        )}

        {/* Media Attachments */}
        {msg.media_url && (
          <div className="mt-2.5 overflow-hidden rounded-xl border border-black/10">
            {msg.media_type === 'VIDEO' ? (
              <video
                src={msg.media_url}
                controls
                playsInline
                preload="metadata"
                className="max-h-56 w-full bg-black object-contain rounded-lg"
              />
            ) : (
              <div
                onClick={() => onExpandImage(msg.media_url)}
                className="relative cursor-pointer group bg-slate-100"
              >
                <img
                  src={msg.media_url}
                  alt={msg.media_name || 'Attachment'}
                  loading="lazy"
                  className="max-h-60 w-full object-cover rounded-lg group-hover:opacity-95 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium gap-1">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Click to expand</span>
                </div>
              </div>
            )}
            {msg.media_name && (
              <p
                className={`text-[10px] px-2 py-1 truncate ${
                  isCustomer ? 'text-white/70 bg-black/20' : 'text-[#705B56] bg-slate-50'
                }`}
              >
                {msg.media_name}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

ChatMessageItem.displayName = 'ChatMessageItem';

export default function CustomerLiveChat() {
  const { user, profile } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // New Ticket Form State
  const [selectedCategory, setSelectedCategory] = useState(CHAT_CATEGORIES[0].id);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [initialMessageText, setInitialMessageText] = useState('');
  const [isStartingTicket, setIsStartingTicket] = useState(false);
  const [ticketError, setTicketError] = useState('');

  // Active Chat Message Input State
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isSending, setIsSending] = useState(false);

  // Image Lightbox Modal
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const startFileInputRef = useRef(null);

  // Clean up any legacy shared storage key on mount
  useEffect(() => {
    try {
      localStorage.removeItem('aura_active_chat_ticket');
    } catch (e) {}
  }, []);

  // Account-isolated chat session sync:
  // When a user logs in, registers a new account, or logs out,
  // ensure the chat state strictly belongs to that specific user only!
  useEffect(() => {
    let isSubscribed = true;

    // Reset previous ticket and messages when auth state switches
    setActiveTicket(null);
    setMessages([]);
    setUnreadCount(0);

    if (user?.id) {
      // Authenticated Account
      const email = user.email || '';
      const name = profile?.full_name || user.user_metadata?.full_name || '';
      const phone = profile?.phone || '';
      setCustomerName(name);
      setCustomerEmail(email);
      setCustomerPhone(phone);

      const userStorageKey = `aura_chat_ticket_${user.id}`;
      let cachedTicketId = null;
      try {
        const raw = localStorage.getItem(userStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.id) cachedTicketId = parsed.id;
        }
      } catch (e) {}

      // Fetch tickets strictly belonging to this authenticated user
      fetchCustomerTickets({ customerId: user.id, customerEmail: email }).then((userTickets) => {
        if (!isSubscribed) return;

        if (userTickets && userTickets.length > 0) {
          // Find matching cached ticket or pick the latest ticket of this user
          const matched = cachedTicketId
            ? userTickets.find((t) => t.id === cachedTicketId) || userTickets[0]
            : userTickets[0];

          setActiveTicket(matched);
          setUnreadCount(matched.unread_customer_count || 0);

          try {
            localStorage.setItem(
              userStorageKey,
              JSON.stringify({
                id: matched.id,
                ticket_number: matched.ticket_number,
                customer_email: matched.customer_email,
                customer_id: matched.customer_id,
              })
            );
          } catch (e) {}
        } else {
          // Brand new user or user with no previous tickets: Clean ticket selection screen
          setActiveTicket(null);
          setMessages([]);
          setUnreadCount(0);
        }
      });
    } else {
      // Guest User (not logged in)
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');

      const guestKey = 'aura_chat_ticket_guest';
      let cachedGuestId = null;
      try {
        const raw = localStorage.getItem(guestKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.id) cachedGuestId = parsed.id;
        }
      } catch (e) {}

      if (cachedGuestId) {
        fetchTicket(cachedGuestId).then((t) => {
          if (!isSubscribed) return;
          // Only restore if this was a guest ticket without a customer_id
          if (t && !t.customer_id) {
            setActiveTicket(t);
            setUnreadCount(t.unread_customer_count || 0);
          } else {
            setActiveTicket(null);
            setMessages([]);
            setUnreadCount(0);
          }
        });
      } else {
        setActiveTicket(null);
        setMessages([]);
        setUnreadCount(0);
      }
    }

    return () => {
      isSubscribed = false;
    };
  }, [user?.id, user?.email, profile]);

  // Fetch ticket messages whenever activeTicket changes
  useEffect(() => {
    if (!activeTicket?.id) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);

    fetchTicketMessages(activeTicket.id).then((data) => {
      if (isMounted) {
        setMessages(data);
        setIsLoadingMessages(false);
        // Mark as read on customer side if opened
        if (isOpen) {
          markTicketAsRead(activeTicket.id, 'CUSTOMER');
          setUnreadCount(0);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeTicket?.id, isOpen]);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [isOpen, messages.length, scrollToBottom]);

  // Subscribe to Realtime messages for active ticket
  useEffect(() => {
    if (!activeTicket?.id) return;

    const channelName = `realtime-chat-${activeTicket.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `ticket_id=eq.${activeTicket.id}`,
        },
        (payload) => {
          if (payload.new) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });

            if (!isOpen && payload.new.sender_type !== 'CUSTOMER') {
              setUnreadCount((c) => c + 1);
            } else if (isOpen && payload.new.sender_type !== 'CUSTOMER') {
              markTicketAsRead(activeTicket.id, 'CUSTOMER');
            }

            setTimeout(() => scrollToBottom(true), 100);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_tickets',
          filter: `id=eq.${activeTicket.id}`,
        },
        (payload) => {
          if (payload.new) {
            setActiveTicket((prev) => ({ ...prev, ...payload.new }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTicket?.id, isOpen, scrollToBottom]);

  // Handle File Selection
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreview({ type: 'IMAGE', url, name: file.name });
    } else if (file.type.startsWith('video/')) {
      setFilePreview({ type: 'VIDEO', url: null, name: file.name });
    }
  }, []);

  const clearFileSelection = useCallback(() => {
    setSelectedFile(null);
    if (filePreview?.url && filePreview.type === 'IMAGE') {
      URL.revokeObjectURL(filePreview.url);
    }
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (startFileInputRef.current) startFileInputRef.current.value = '';
  }, [filePreview]);

  // Start New Ticket
  const handleStartTicket = async (e) => {
    e.preventDefault();
    setTicketError('');

    if (!customerName.trim()) {
      setTicketError('Please provide your name.');
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setTicketError('Please enter a valid email address.');
      return;
    }
    if (!initialMessageText.trim() && !selectedFile) {
      setTicketError('Please describe your concern or attach a photo/video.');
      return;
    }

    setIsStartingTicket(true);
    try {
      const { ticket, firstMessage } = await createChatTicket({
        customerName,
        customerEmail,
        customerPhone,
        customerId: user?.id || null,
        category: selectedCategory,
        initialMessage: initialMessageText,
        mediaFile: selectedFile,
      });

      setActiveTicket(ticket);
      setMessages([firstMessage]);
      clearFileSelection();
      setInitialMessageText('');
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to create ticket:', err);
      setTicketError(err.message || 'Failed to start inquiry. Please try again.');
    } finally {
      setIsStartingTicket(false);
    }
  };

  // Send Next Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!activeTicket?.id) return;
    if (!inputText.trim() && !selectedFile) return;

    const textToSend = inputText;
    const fileToSend = selectedFile;

    // Optimistic clean inputs
    setInputText('');
    clearFileSelection();
    setIsSending(true);

    try {
      await sendChatMessage({
        ticketId: activeTicket.id,
        senderType: 'CUSTOMER',
        senderName: customerName || user?.user_metadata?.full_name || 'Customer',
        senderId: user?.id || null,
        messageText: textToSend,
        mediaFile: fileToSend,
      });
      scrollToBottom(true);
    } catch (err) {
      console.error('Error sending message:', err);
      alert(err.message || 'Failed to send message. Please try again.');
      // Restore on failure
      setInputText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  // Start fresh ticket inquiry
  const handleResetTicket = useCallback(() => {
    if (
      window.confirm(
        'Start a new inquiry? You can pick a new concern topic.'
      )
    ) {
      const storageKey = user?.id ? `aura_chat_ticket_${user.id}` : 'aura_chat_ticket_guest';
      try {
        localStorage.removeItem(storageKey);
        localStorage.removeItem('aura_active_chat_ticket');
      } catch (e) {}
      setActiveTicket(null);
      setMessages([]);
      setUnreadCount(0);
      setInitialMessageText('');
      clearFileSelection();
    }
  }, [user?.id, clearFileSelection]);

  const categoryMeta = useMemo(() => {
    return getCategoryMeta(activeTicket?.category);
  }, [activeTicket?.category]);

  return (
    <>
      {/* 1. Floating Atelier Concierge Chat Launcher Button */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        <motion.button
          onClick={() => {
            setIsOpen((prev) => !prev);
            if (!isOpen && activeTicket?.id) {
              markTicketAsRead(activeTicket.id, 'CUSTOMER');
              setUnreadCount(0);
            }
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative group p-4 rounded-full bg-[#2C1E1B] text-white shadow-2xl border border-[#E8DCD7]/30 hover:bg-[#3D2B27] transition-all flex items-center justify-center cursor-pointer"
          aria-label="Atelier Customer Service Live Chat"
          title="Chat with Aura Concierge"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform rotate-0 group-hover:rotate-90" />
          ) : (
            <MessageCircle className="w-6 h-6 text-white stroke-[1.8]" />
          )}

          {/* Unread Message Pill Badge */}
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[10px] animate-pulse shadow-md border-2 border-white">
              {unreadCount}
            </span>
          )}

          {/* Pulse Ripple indicator when closed and ready */}
          {!isOpen && unreadCount === 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
          )}
        </motion.button>
      </div>

      {/* 2. Interactive Chat Drawer / Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-4 sm:right-6 z-40 w-[calc(100vw-32px)] sm:w-[420px] h-[580px] max-h-[85vh] bg-[#FAF5F2] border border-[#E8DCD7] shadow-2xl flex flex-col rounded-none overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="p-4 bg-[#2C1E1B] text-white flex items-center justify-between border-b border-black/10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm font-bold text-amber-200">
                    A
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#2C1E1B]" />
                </div>
                <div>
                  <h3 className="font-brand text-xs font-bold tracking-widest uppercase text-white">
                    Aura Atelier Concierge
                  </h3>
                  <p className="text-[10px] text-white/70 flex items-center gap-1">
                    <span>Atelier Support Online</span>
                    {activeTicket && (
                      <span className="text-amber-300 font-mono font-semibold">
                        • {activeTicket.ticket_number}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {activeTicket && (
                  <button
                    type="button"
                    onClick={handleResetTicket}
                    className="p-1.5 text-white/70 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Start New Inquiry"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SCREEN 1: Concern / Ticket Selection Screen */}
            {!activeTicket ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#FAF5F2]">
                <div className="text-center space-y-1">
                  <span className="text-[10px] font-brand uppercase tracking-[0.25em] text-[#B86B60] font-bold">
                    Direct Atelier Assistance
                  </span>
                  <h4 className="font-brand text-base font-bold text-[#2C1E1B]">
                    How May We Assist You?
                  </h4>
                  <p className="text-[11px] text-[#705B56] leading-relaxed max-w-xs mx-auto">
                    Select your topic below. Our automated guidance will respond instantly, followed by live atelier support.
                  </p>
                </div>

                <form onSubmit={handleStartTicket} className="space-y-4 text-xs">
                  {/* Category Selection Cards */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-[#705B56] mb-2">
                      Select Topic *
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {CHAT_CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        return (
                          <div
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`p-3 border transition-all cursor-pointer flex items-start gap-3 rounded-none ${
                              isSelected
                                ? 'border-[#2C1E1B] bg-white shadow-xs'
                                : 'border-[#E8DCD7] hover:border-[#B86B60] bg-[#FAF5F2]'
                            }`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex items-center justify-center ${
                                isSelected ? 'border-[#2C1E1B]' : 'border-[#A38E88]'
                              }`}
                            >
                              {isSelected && (
                                <div className="w-1.5 h-1.5 rounded-full bg-[#2C1E1B]" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-[#2C1E1B] text-[11px]">
                                {cat.label}
                              </p>
                              <p className="text-[10px] text-[#705B56] mt-0.5">
                                {cat.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customer Information (Pre-filled if logged in) */}
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-[#705B56] mb-1">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Maria Clara"
                        className="w-full px-3 py-2 bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-[#705B56] mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="client@example.com"
                          className="w-full px-3 py-2 bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-[#705B56] mb-1">
                          Mobile (Optional)
                        </label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="09171234567"
                          className="w-full px-3 py-2 bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-[#705B56] mb-1">
                        How can we help? *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={initialMessageText}
                        onChange={(e) => setInitialMessageText(e.target.value)}
                        placeholder="Type your question, order reference, or sizing request..."
                        className="w-full px-3 py-2 bg-white border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none resize-none"
                      />
                    </div>

                    {/* Media File Attachment for initial message */}
                    <div>
                      <input
                        ref={startFileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />

                      {filePreview ? (
                        <div className="p-2 bg-white border border-[#E8DCD7] flex items-center justify-between">
                          <div className="flex items-center gap-2 truncate">
                            {filePreview.type === 'VIDEO' ? (
                              <Video className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            ) : (
                              <img
                                src={filePreview.url}
                                alt="Preview"
                                className="w-8 h-8 object-cover rounded bg-slate-100 flex-shrink-0"
                              />
                            )}
                            <span className="text-[11px] text-[#2C1E1B] truncate">
                              {filePreview.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={clearFileSelection}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startFileInputRef.current?.click()}
                          className="w-full py-2 px-3 border border-dashed border-[#E8DCD7] bg-white hover:bg-slate-50 text-[11px] text-[#705B56] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-[#A38E88]" />
                          <span>Attach Photo or Video (Optional, max 50MB)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {ticketError && (
                    <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
                      {ticketError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isStartingTicket}
                    className="w-full py-3.5 px-4 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs uppercase font-bold tracking-[0.2em] shadow-md transition-all rounded-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                  >
                    {isStartingTicket ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Connecting with Atelier...</span>
                      </>
                    ) : (
                      <>
                        <span>Start Conversation</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* SCREEN 2: Active Chat Conversation Stream */
              <div className="flex-1 flex flex-col h-full bg-[#FAF5F2] overflow-hidden">
                {/* Active Category Bar */}
                <div className="px-4 py-2 bg-white border-b border-[#E8DCD7] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${categoryMeta.badgeClass}`}
                    >
                      {categoryMeta.shortLabel}
                    </span>
                    <span className="text-[#705B56] text-[10px] truncate max-w-[160px]">
                      {categoryMeta.label}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-[#A38E88]">
                    {activeTicket.status}
                  </span>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  {isLoadingMessages ? (
                    <div className="h-full flex items-center justify-center text-xs text-[#A38E88] gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#B86B60]" />
                      <span>Loading conversation...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-[#A38E88] space-y-1">
                      <MessageCircle className="w-8 h-8 text-[#E8DCD7]" />
                      <p className="font-semibold text-[#705B56]">Conversation Started</p>
                      <p className="text-[11px]">Our team has received your ticket.</p>
                    </div>
                  ) : (
                    messages.map((m) => (
                      <ChatMessageItem
                        key={m.id}
                        msg={m}
                        onExpandImage={(url) => setLightboxUrl(url)}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* File Attachment Chip before sending */}
                {filePreview && (
                  <div className="px-4 py-2 bg-white border-t border-[#E8DCD7] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      {filePreview.type === 'VIDEO' ? (
                        <Video className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      ) : (
                        <img
                          src={filePreview.url}
                          alt="preview"
                          className="w-7 h-7 object-cover rounded bg-slate-100 flex-shrink-0"
                        />
                      )}
                      <span className="text-[11px] text-[#2C1E1B] truncate font-medium">
                        {filePreview.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearFileSelection}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Chat Composer Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 bg-white border-t border-[#E8DCD7] flex items-end gap-2"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {/* Attachment Button */}
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-[#705B56] hover:text-[#2C1E1B] hover:bg-[#FAF5F2] rounded-lg transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50"
                    title="Upload photo or video (max 50MB)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Textarea */}
                  <textarea
                    rows={1}
                    value={inputText}
                    disabled={isSending}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message... (Shift+Enter for line break)"
                    className="flex-1 max-h-24 py-2 px-3 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none resize-none leading-relaxed"
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={isSending || (!inputText.trim() && !selectedFile)}
                    className="p-2 bg-[#2C1E1B] hover:bg-[#B86B60] text-white rounded-none shadow-xs transition-colors cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed flex-shrink-0"
                    title="Send Message"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Lightbox Preview Modal */}
      <AnimatePresence>
        {lightboxUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-3xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxUrl}
                alt="Expanded media attachment"
                className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
              />
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
