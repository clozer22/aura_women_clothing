import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Paperclip,
  Image as ImageIcon,
  Video,
  X,
  Play,
  Check,
  CheckCheck,
  Settings,
  RefreshCw,
  User,
  Mail,
  Phone,
  Tag,
  Maximize2,
  ChevronRight,
  Sparkles,
  Bot,
  ExternalLink,
  ShieldAlert,
  Sliders,
  Archive,
  CornerDownRight,
  Smile
} from 'lucide-react';
import { supabaseAdmin as supabase } from '../../lib/supabaseClient';
import {
  CHAT_CATEGORIES,
  getCategoryMeta,
  fetchAdminTickets,
  fetchTicketMessages,
  sendChatMessage,
  updateTicketStatus,
  markTicketAsRead,
  fetchAutoReplies,
  updateAutoReply
} from '../../lib/chatService';

// Format timestamp helper
function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Memoized Ticket List Item to prevent re-rendering unaffected list items
const TicketListItem = memo(function TicketListItem({
  ticket,
  isSelected,
  onSelect
}) {
  const cat = getCategoryMeta(ticket.category);
  const hasUnread = ticket.unread_admin_count > 0;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200">OPEN</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">IN PROGRESS</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">RESOLVED</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-600 border border-slate-200">CLOSED</span>;
      default:
        return null;
    }
  };

  return (
    <button
      onClick={() => onSelect(ticket)}
      className={`w-full text-left p-3.5 border-b border-slate-100 transition-all flex flex-col gap-2 relative ${
        isSelected
          ? 'bg-[#2C1E1B]/5 border-l-4 border-l-[#2C1E1B]'
          : 'hover:bg-slate-50/80 bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-900 truncate">
            {ticket.customer_name}
          </span>
          <span className="text-[10px] text-slate-400 font-mono shrink-0">
            {ticket.ticket_number}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasUnread && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-extrabold rounded-full">
              {ticket.unread_admin_count}
            </span>
          )}
          {getStatusBadge(ticket.status)}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cat.badgeClass}`}>
          {cat.shortLabel}
        </span>
        <span className="text-[11px] text-slate-500 truncate flex-1">
          {ticket.last_message_preview || 'No messages yet'}
        </span>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span className="truncate max-w-[150px]">{ticket.customer_email}</span>
        <span>{formatTime(ticket.last_message_at)}</span>
      </div>
    </button>
  );
});

// Memoized Message Item to prevent re-rendering when typing
const MessageBubble = memo(function MessageBubble({
  message,
  onImageClick
}) {
  const isAdmin = message.sender_type === 'ADMIN';
  const isSystem = message.sender_type === 'SYSTEM';
  const isAutoReply = message.is_auto_reply;

  if (isSystem) {
    return (
      <div className="my-2 text-center">
        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-medium border border-slate-200">
          {message.message_text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col mb-3.5 ${isAdmin ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-700">
          {message.sender_name || (isAdmin ? 'Aura Staff' : 'Customer')}
        </span>
        {isAutoReply && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
            <Sparkles className="w-2.5 h-2.5" /> Auto-Reply
          </span>
        )}
        <span>•</span>
        <span>{formatTime(message.created_at)}</span>
      </div>

      <div
        className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed break-words ${
          isAdmin
            ? 'bg-[#2C1E1B] text-white rounded-br-xs'
            : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
        }`}
      >
        {message.message_text && (
          <p className="whitespace-pre-wrap">{message.message_text}</p>
        )}

        {message.media_url && message.media_type === 'IMAGE' && (
          <div className="mt-2 rounded-xl overflow-hidden cursor-pointer group relative border border-black/10">
            <img
              src={message.media_url}
              alt={message.media_name || 'Attached photo'}
              className="max-h-60 w-auto rounded-lg object-contain bg-black/5 hover:opacity-95 transition-all"
              onClick={() => onImageClick(message.media_url)}
              loading="lazy"
            />
            <div className="absolute bottom-2 right-2 bg-black/60 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {message.media_url && message.media_type === 'VIDEO' && (
          <div className="mt-2 rounded-xl overflow-hidden max-w-sm border border-black/10 bg-black">
            <video
              src={message.media_url}
              controls
              playsInline
              className="max-h-64 w-full rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
});

export default function AdminChatTab({
  currentAdmin = { name: 'Support Staff', email: 'admin@aura.com', role: 'Admin' }
}) {
  const [tickets, setTickets] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Conversation state
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [stagedMedia, setStagedMedia] = useState(null);
  const [isSending, setIsSending] = useState(false);

  // Lightbox
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);

  // Auto-replies modal
  const [isAutoRepliesModalOpen, setIsAutoRepliesModalOpen] = useState(false);
  const [autoReplies, setAutoReplies] = useState([]);
  const [isLoadingAutoReplies, setIsLoadingAutoReplies] = useState(false);
  const [savingCategory, setSavingCategory] = useState(null);
  const [autoReplyToast, setAutoReplyToast] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Selected Ticket object
  const selectedTicket = useMemo(() => {
    return tickets.find((t) => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  // Load tickets on mount & filter changes
  const loadTickets = useCallback(async () => {
    try {
      const data = await fetchAdminTickets({
        category: categoryFilter,
        status: statusFilter,
        searchQuery
      });
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  }, [categoryFilter, statusFilter, searchQuery]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Realtime subscription for chat_tickets (Instant ticket creations & status/unread updates)
  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-tickets-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_tickets' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTickets((prev) => [payload.new, ...prev.filter((t) => t.id !== payload.new.id)]);
          } else if (payload.eventType === 'UPDATE') {
            setTickets((prev) =>
              prev.map((t) => (t.id === payload.new.id ? { ...t, ...payload.new } : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setTickets((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load messages when selected ticket changes
  useEffect(() => {
    if (!selectedTicketId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);

    fetchTicketMessages(selectedTicketId)
      .then((data) => {
        if (isMounted) {
          setMessages(data);
          setIsLoadingMessages(false);
          // Mark ticket as read by admin
          markTicketAsRead(selectedTicketId, 'ADMIN');
          setTickets((prev) =>
            prev.map((t) => (t.id === selectedTicketId ? { ...t, unread_admin_count: 0 } : t))
          );
        }
      })
      .catch((err) => {
        console.error('Failed to fetch messages:', err);
        if (isMounted) setIsLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTicketId]);

  // Realtime subscription for chat_messages of the selected ticket
  useEffect(() => {
    if (!selectedTicketId) return;

    const channel = supabase
      .channel(`admin-ticket-messages-${selectedTicketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `ticket_id=eq.${selectedTicketId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Deduplicate if already present
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          // Mark read
          markTicketAsRead(selectedTicketId, 'ADMIN');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicketId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Select Ticket handler
  const handleSelectTicket = useCallback((ticket) => {
    setSelectedTicketId(ticket.id);
  }, []);

  // Update Status handler
  const handleStatusChange = async (newStatus) => {
    if (!selectedTicketId) return;
    try {
      const updated = await updateTicketStatus(selectedTicketId, newStatus);
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicketId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      alert(`Could not update status: ${err.message}`);
    }
  };

  // Staged file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isImage && !isVideo) {
      alert('Please upload an image (JPG, PNG, WebP) or video (MP4, WebM, MOV).');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('File exceeds 50MB size limit.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setStagedMedia({
      file,
      type: isVideo ? 'VIDEO' : 'IMAGE',
      previewUrl,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
    });
    e.target.value = '';
  };

  const removeStagedMedia = () => {
    if (stagedMedia?.previewUrl) {
      URL.revokeObjectURL(stagedMedia.previewUrl);
    }
    setStagedMedia(null);
  };

  // Send Admin message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!selectedTicketId || (!inputText.trim() && !stagedMedia?.file) || isSending) {
      return;
    }

    const text = inputText.trim();
    const mediaFile = stagedMedia?.file || null;

    setIsSending(true);
    setInputText('');
    removeStagedMedia();

    try {
      await sendChatMessage({
        ticketId: selectedTicketId,
        senderType: 'ADMIN',
        senderName: currentAdmin.name || 'Aura Staff',
        senderId: null,
        messageText: text,
        mediaFile: mediaFile,
      });
    } catch (err) {
      alert(`Failed to send message: ${err.message}`);
      // Restore input text on error
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  // Open Auto-Replies Configuration Modal
  const handleOpenAutoRepliesModal = async () => {
    setIsAutoRepliesModalOpen(true);
    setIsLoadingAutoReplies(true);
    try {
      const data = await fetchAutoReplies();
      setAutoReplies(data);
    } catch (err) {
      console.error('Failed to load auto-replies:', err);
    } finally {
      setIsLoadingAutoReplies(false);
    }
  };

  // Save an individual auto-reply template
  const handleSaveAutoReply = async (category, replyText, isActive, title) => {
    setSavingCategory(category);
    try {
      await updateAutoReply(category, { replyText, isActive, title });
      setAutoReplyToast(`Saved auto-reply for ${category}!`);
      setTimeout(() => setAutoReplyToast(null), 3000);
      // Refresh local array
      setAutoReplies((prev) =>
        prev.map((r) =>
          r.category === category ? { ...r, reply_text: replyText, is_active: isActive, title } : r
        )
      );
    } catch (err) {
      alert(`Failed to save auto-reply: ${err.message}`);
    } finally {
      setSavingCategory(null);
    }
  };

  // Total unread ticket count for badge
  const totalUnreadCount = useMemo(() => {
    return tickets.reduce((sum, t) => sum + (t.unread_admin_count || 0), 0);
  }, [tickets]);

  return (
    <div className="h-[calc(100vh-110px)] min-h-[600px] flex flex-col bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs">
      {/* Top Bar with Title, Summary, and Auto-Reply Manager Trigger */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2C1E1B] text-white flex items-center justify-center shadow-xs">
            <MessageSquare className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Customer Service Live Chat</h1>
              {totalUnreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-500 text-white animate-pulse">
                  {totalUnreadCount} new
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Real-time omnichannel support, customer tickets & automated replies</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAutoRepliesModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300/80 hover:bg-amber-100 transition-all shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Auto-Reply Settings</span>
          </button>
          <button
            onClick={loadTickets}
            title="Refresh tickets"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Ticket List (Left) & Active Chat Thread (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Tickets Master List */}
        <div className="w-full sm:w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-slate-200 space-y-2 bg-slate-50/60">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ticket #, customer, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#2C1E1B] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-medium no-scrollbar">
              {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg shrink-0 transition-all ${
                    statusFilter === st
                      ? 'bg-[#2C1E1B] text-white font-bold shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Category Dropdown Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 bg-white text-xs text-slate-700 py-1 px-2 rounded-lg border border-slate-200 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {CHAT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shortLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ticket Items Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {isLoadingTickets ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                Loading conversations...
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No customer inquiries matching the selected filters.
              </div>
            ) : (
              tickets.map((ticket) => (
                <TicketListItem
                  key={ticket.id}
                  ticket={ticket}
                  isSelected={ticket.id === selectedTicketId}
                  onSelect={handleSelectTicket}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation Detail */}
        <div className="flex-1 flex flex-col bg-slate-50/70">
          {selectedTicket ? (
            <>
              {/* Conversation Top Header */}
              <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center border border-slate-200 text-sm">
                    {selectedTicket.customer_name ? selectedTicket.customer_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">{selectedTicket.customer_name}</h2>
                      <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {selectedTicket.ticket_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <a href={`mailto:${selectedTicket.customer_email}`} className="flex items-center gap-1 hover:text-blue-600">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{selectedTicket.customer_email}</span>
                      </a>
                      {selectedTicket.customer_phone && (
                        <a href={`tel:${selectedTicket.customer_phone}`} className="flex items-center gap-1 hover:text-blue-600">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{selectedTicket.customer_phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Switcher & Category Badge */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${getCategoryMeta(selectedTicket.category).badgeClass}`}>
                    {getCategoryMeta(selectedTicket.category).label}
                  </span>

                  <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5">Status:</span>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="bg-white text-xs font-semibold text-slate-700 py-1 px-2.5 rounded-lg border border-slate-200 focus:outline-none"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-48 text-xs text-slate-400 gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading conversation transcript...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 text-xs text-slate-400">
                    No messages in this ticket yet.
                  </div>
                ) : (
                  messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      onImageClick={(url) => setActiveLightboxImage(url)}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Staged Media Attachment Preview */}
              {stagedMedia && (
                <div className="px-6 py-2 bg-amber-50/80 border-t border-amber-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {stagedMedia.type === 'IMAGE' ? (
                      <img
                        src={stagedMedia.previewUrl}
                        alt="Staged attachment"
                        className="w-12 h-12 object-cover rounded-lg border border-amber-300"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center text-white">
                        <Video className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{stagedMedia.name}</p>
                      <p className="text-[10px] text-slate-500">{stagedMedia.size} • Ready to upload</p>
                    </div>
                  </div>
                  <button
                    onClick={removeStagedMedia}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Admin Reply Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 bg-white border-t border-slate-200 flex items-end gap-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach Photo or Video (max 50MB)"
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all shrink-0"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <div className="flex-1 relative">
                  <textarea
                    rows={2}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder={`Reply to ${selectedTicket.customer_name} (Press Enter to send, Shift+Enter for newline)...`}
                    className="w-full bg-slate-50 focus:bg-white text-xs text-slate-800 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#2C1E1B] transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSending || (!inputText.trim() && !stagedMedia)}
                  className={`px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                    isSending || (!inputText.trim() && !stagedMedia)
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-[#2C1E1B] hover:bg-[#3D2B27] text-white shadow-xs'
                  }`}
                >
                  {isSending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-3 shadow-xs">
                <MessageSquare className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">No Ticket Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Select a customer inquiry from the left sidebar to view messages, attachments, and respond in real-time.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Auto-Replies Configuration Modal (Admin & Superadmin) */}
      {isAutoRepliesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Automated Reply Management</h3>
                  <p className="text-xs text-slate-400">
                    Configure instant automated responses dispatched when a customer submits a ticket
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAutoRepliesModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Toast */}
            {autoReplyToast && (
              <div className="bg-emerald-50 text-emerald-800 px-6 py-2.5 text-xs font-semibold border-b border-emerald-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{autoReplyToast}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingAutoReplies ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading auto-reply rules...
                </div>
              ) : (
                CHAT_CATEGORIES.map((category) => {
                  const replyConfig = autoReplies.find((r) => r.category === category.id) || {
                    category: category.id,
                    title: category.label,
                    reply_text: '',
                    is_active: true,
                  };

                  return (
                    <AutoReplyCategoryCard
                      key={category.id}
                      categoryMeta={category}
                      config={replyConfig}
                      isSaving={savingCategory === category.id}
                      onSave={(replyText, isActive, title) =>
                        handleSaveAutoReply(category.id, replyText, isActive, title)
                      }
                    />
                  );
                })
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsAutoRepliesModalOpen(false)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#2C1E1B] text-white hover:bg-[#3D2B27]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Photo Attachments */}
      {activeLightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setActiveLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={activeLightboxImage}
              alt="Full view attachment"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setActiveLightboxImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-amber-300 p-2 text-xs font-bold flex items-center gap-1"
            >
              <X className="w-5 h-5" /> Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Auto Reply Category Card with local edit state to prevent unnecessary modal-wide re-renders
function AutoReplyCategoryCard({ categoryMeta, config, isSaving, onSave }) {
  const [text, setText] = useState(config.reply_text || '');
  const [isActive, setIsActive] = useState(config.is_active ?? true);
  const [title, setTitle] = useState(config.title || categoryMeta.label);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setText(config.reply_text || '');
    setIsActive(config.is_active ?? true);
    setTitle(config.title || categoryMeta.label);
    setIsDirty(false);
  }, [config, categoryMeta]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    setIsDirty(true);
  };

  const handleToggle = () => {
    setIsActive((prev) => !prev);
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave(text, isActive, title);
    setIsDirty(false);
  };

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${categoryMeta.badgeClass}`}>
            {categoryMeta.shortLabel}
          </span>
          <span className="text-xs font-bold text-slate-800">{categoryMeta.label}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-500">
            {isActive ? 'Auto-reply Active' : 'Disabled'}
          </span>
          <button
            type="button"
            onClick={handleToggle}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
              isActive ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mb-2">{categoryMeta.description}</p>

      <textarea
        rows={3}
        value={text}
        onChange={handleTextChange}
        placeholder={`Enter automated response for ${categoryMeta.shortLabel}...`}
        className="w-full bg-white text-xs text-slate-800 p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#2C1E1B] transition-all resize-none"
      />

      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[10px] text-slate-400">
          Dispatched instantly by database trigger upon customer ticket submission
        </span>
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            isDirty && !isSaving
              ? 'bg-[#2C1E1B] text-white hover:bg-[#3D2B27] shadow-xs'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Save Template</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
