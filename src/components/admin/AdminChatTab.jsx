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
  ArrowLeft,
  Sparkles,
  Bot,
  ExternalLink,
  ShieldAlert,
  Sliders,
  Archive,
  CornerDownRight,
  Smile,
  Bookmark,
  Copy,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Zap,
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
  updateAutoReply,
  fetchSavedMessages,
  createSavedMessage,
  updateSavedMessage,
  deleteSavedMessage,
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

  // Saved Messages (Canned Responses) State
  const [savedMessages, setSavedMessages] = useState([]);
  const [isLoadingSavedMessages, setIsLoadingSavedMessages] = useState(false);
  const [isSavedMessagesModalOpen, setIsSavedMessagesModalOpen] = useState(false);
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState(false);
  const [savedMessageSearch, setSavedMessageSearch] = useState('');
  const [savedCategoryFilter, setSavedCategoryFilter] = useState('ALL');
  const [copiedSavedMessageId, setCopiedSavedMessageId] = useState(null);

  // Add / Edit Saved Message Form State
  const [isAddingNewSavedMessage, setIsAddingNewSavedMessage] = useState(false);
  const [editingSavedMessageId, setEditingSavedMessageId] = useState(null);
  const [savedFormTitle, setSavedFormTitle] = useState('');
  const [savedFormContent, setSavedFormContent] = useState('');
  const [savedFormCategory, setSavedFormCategory] = useState('GENERAL');
  const [savedFormShortcut, setSavedFormShortcut] = useState('');
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [savedMessageToast, setSavedMessageToast] = useState(null);

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

  // Load Saved Messages
  const loadSavedMessages = useCallback(async () => {
    setIsLoadingSavedMessages(true);
    try {
      const data = await fetchSavedMessages();
      setSavedMessages(data);
    } catch (err) {
      console.error('Failed to load saved messages:', err);
    } finally {
      setIsLoadingSavedMessages(false);
    }
  }, []);

  useEffect(() => {
    loadSavedMessages();
  }, [loadSavedMessages]);

  // Copy Saved Message Content to Clipboard
  const handleCopySavedMessage = (msg) => {
    if (!msg?.content) return;
    try {
      navigator.clipboard.writeText(msg.content);
      setCopiedSavedMessageId(msg.id);
      setTimeout(() => setCopiedSavedMessageId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Insert Saved Message into Active Chat Textarea
  const handleInsertSavedMessage = (msg) => {
    if (!msg?.content) return;
    setInputText((prev) => (prev.trim() ? `${prev.trim()}\n\n${msg.content}` : msg.content));
    setIsQuickRepliesOpen(false);
  };

  // Send Saved Message Directly to Active Customer Ticket
  const handleSendSavedMessageDirectly = async (msg) => {
    if (!selectedTicket?.id || !msg?.content) return;
    setIsSending(true);
    setIsQuickRepliesOpen(false);
    try {
      await sendChatMessage({
        ticketId: selectedTicket.id,
        senderType: 'ADMIN',
        senderName: currentAdmin.name || 'Aura Support Staff',
        senderId: currentAdmin.id || null,
        messageText: msg.content,
      });
      scrollToBottom(true);
    } catch (err) {
      console.error('Failed to send saved message:', err);
      alert('Failed to send saved message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Open Edit Form for an existing Saved Message
  const handleStartEditSavedMessage = (msg) => {
    setEditingSavedMessageId(msg.id);
    setSavedFormTitle(msg.title || '');
    setSavedFormContent(msg.content || '');
    setSavedFormCategory(msg.category || 'GENERAL');
    setSavedFormShortcut(msg.shortcut || '');
    setIsAddingNewSavedMessage(true);
  };

  // Cancel Add / Edit Form
  const handleCancelSavedMessageForm = () => {
    setIsAddingNewSavedMessage(false);
    setEditingSavedMessageId(null);
    setSavedFormTitle('');
    setSavedFormContent('');
    setSavedFormCategory('GENERAL');
    setSavedFormShortcut('');
  };

  // Submit Add / Update Saved Message
  const handleSaveMessageSubmit = async (e) => {
    e.preventDefault();
    if (!savedFormTitle.trim() || !savedFormContent.trim()) {
      alert('Please fill in both title and message content.');
      return;
    }
    setIsSavingMessage(true);
    try {
      if (editingSavedMessageId) {
        await updateSavedMessage(editingSavedMessageId, {
          title: savedFormTitle,
          content: savedFormContent,
          category: savedFormCategory,
          shortcut: savedFormShortcut,
        });
        setSavedMessageToast('Saved message updated successfully!');
      } else {
        await createSavedMessage({
          title: savedFormTitle,
          content: savedFormContent,
          category: savedFormCategory,
          shortcut: savedFormShortcut,
          createdBy: currentAdmin.email || currentAdmin.name || 'Admin',
        });
        setSavedMessageToast('New saved message created successfully!');
      }
      setTimeout(() => setSavedMessageToast(null), 3000);
      handleCancelSavedMessageForm();
      await loadSavedMessages();
    } catch (err) {
      console.error('Error saving message:', err);
      alert(err.message || 'Failed to save message.');
    } finally {
      setIsSavingMessage(false);
    }
  };

  // Delete Saved Message
  const handleDeleteSavedMessage = async (msgId) => {
    if (!window.confirm('Are you sure you want to delete this saved message?')) return;
    try {
      await deleteSavedMessage(msgId);
      await loadSavedMessages();
      setSavedMessageToast('Saved message deleted.');
      setTimeout(() => setSavedMessageToast(null), 2500);
    } catch (err) {
      console.error('Error deleting saved message:', err);
      alert('Failed to delete saved message.');
    }
  };

  // Filtered Saved Messages for Search & Category
  const filteredSavedMessages = useMemo(() => {
    let list = Array.isArray(savedMessages) ? savedMessages : [];
    if (savedCategoryFilter && savedCategoryFilter !== 'ALL') {
      list = list.filter((m) => (m.category || 'GENERAL').toUpperCase() === savedCategoryFilter);
    }
    if (savedMessageSearch.trim()) {
      const q = savedMessageSearch.toLowerCase().trim();
      list = list.filter(
        (m) =>
          (m.title && m.title.toLowerCase().includes(q)) ||
          (m.content && m.content.toLowerCase().includes(q)) ||
          (m.shortcut && m.shortcut.toLowerCase().includes(q))
      );
    }
    return list;
  }, [savedMessages, savedCategoryFilter, savedMessageSearch]);

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
            onClick={() => setIsSavedMessagesModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            title="Manage saved messages and quick replies"
          >
            <Bookmark className="w-4 h-4 text-amber-600" />
            <span>Saved Messages ({savedMessages.length})</span>
          </button>
          <button
            onClick={handleOpenAutoRepliesModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300/80 hover:bg-amber-100 transition-all shadow-xs cursor-pointer"
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
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Column: Tickets Master List */}
        <div
          className={`${
            selectedTicket ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-96 min-w-0 md:min-w-[320px] md:max-w-[384px] shrink-0 bg-white border-r border-slate-200 flex-col`}
        >
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
        <div
          className={`${
            !selectedTicket ? 'hidden md:flex' : 'flex'
          } flex-1 min-w-0 flex-col bg-slate-50/70 overflow-hidden`}
        >
          {selectedTicket ? (
            <>
              {/* Conversation Top Header */}
              <div className="px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Mobile Back to Tickets List */}
                  <button
                    type="button"
                    onClick={() => setSelectedTicketId(null)}
                    className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all shrink-0 cursor-pointer"
                    title="Back to Tickets List"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center border border-slate-200 text-sm shrink-0">
                    {selectedTicket.customer_name ? selectedTicket.customer_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 truncate">{selectedTicket.customer_name}</h2>
                      <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                        {selectedTicket.ticket_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 truncate">
                      <a href={`mailto:${selectedTicket.customer_email}`} className="flex items-center gap-1 hover:text-blue-600 truncate max-w-[200px]">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{selectedTicket.customer_email}</span>
                      </a>
                      {selectedTicket.customer_phone && (
                        <a href={`tel:${selectedTicket.customer_phone}`} className="flex items-center gap-1 hover:text-blue-600 shrink-0">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{selectedTicket.customer_phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Switcher & Category Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${getCategoryMeta(selectedTicket.category).badgeClass}`}>
                    {getCategoryMeta(selectedTicket.category).label}
                  </span>

                  <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5">Status:</span>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="bg-white text-xs font-semibold text-slate-700 py-1 px-2.5 rounded-lg border border-slate-200 focus:outline-none cursor-pointer"
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

              {/* Quick Saved Replies Shortcut Bar */}
              {savedMessages.length > 0 && (
                <div className="w-full min-w-0 px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs select-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Saved:</span>
                  </span>
                  {savedMessages.slice(0, 6).map((sm) => (
                    <button
                      key={sm.id}
                      type="button"
                      onClick={() => handleInsertSavedMessage(sm)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-400 text-slate-800 text-[11px] font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 hover:bg-slate-100 shadow-2xs max-w-[170px]"
                      title={`${sm.title} - Click to insert into input`}
                    >
                      {sm.shortcut && (
                        <span className="font-mono text-indigo-600 font-bold text-[10px] shrink-0">
                          {sm.shortcut}
                        </span>
                      )}
                      <span className="truncate">{sm.title}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsSavedMessagesModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold hover:bg-amber-100 transition-all shrink-0 cursor-pointer whitespace-nowrap"
                  >
                    + View All ({savedMessages.length})
                  </button>
                </div>
              )}

              {/* Admin Reply Composer Form */}
              <div className="relative">
                {/* Floating Quick Replies Popover */}
                {isQuickRepliesOpen && (
                  <div className="absolute bottom-full left-4 right-4 mb-2 z-30 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 max-h-80 flex flex-col">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-4 h-4 text-amber-600" />
                        <h4 className="text-xs font-bold text-slate-900">Saved Messages & Quick Replies</h4>
                        <span className="text-[10px] text-slate-400">({savedMessages.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsQuickRepliesOpen(false);
                            setIsSavedMessagesModalOpen(true);
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                        >
                          Manage All
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsQuickRepliesOpen(false)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Search */}
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                      <input
                        type="text"
                        value={savedMessageSearch}
                        onChange={(e) => setSavedMessageSearch(e.target.value)}
                        placeholder="Search quick replies..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-800"
                      />
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 space-y-1 pr-1">
                      {filteredSavedMessages.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No saved messages found.
                        </div>
                      ) : (
                        filteredSavedMessages.map((msg) => {
                          const isCopied = copiedSavedMessageId === msg.id;
                          return (
                            <div
                              key={msg.id}
                              className="p-2.5 hover:bg-slate-50 rounded-xl transition-colors flex flex-col gap-1.5 group"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {msg.title}
                                  </span>
                                  {msg.shortcut && (
                                    <span className="font-mono text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200">
                                      {msg.shortcut}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded">
                                  {msg.category || 'GENERAL'}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                                {msg.content}
                              </p>

                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleCopySavedMessage(msg)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                    isCopied
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                      : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-600'
                                  }`}
                                  title="Copy text to clipboard"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span>Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-slate-400" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleInsertSavedMessage(msg)}
                                  className="px-2.5 py-1 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all cursor-pointer flex items-center gap-1"
                                  title="Insert into reply box to edit"
                                >
                                  <span>Insert to Input</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSendSavedMessageDirectly(msg)}
                                  className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#2C1E1B] hover:bg-[#3D2B27] text-white transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                  title="Send immediately to customer"
                                >
                                  <Send className="w-2.5 h-2.5" />
                                  <span>Send Direct</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <form
                  onSubmit={handleSendMessage}
                  className="w-full min-w-0 p-3 sm:p-4 bg-white border-t border-slate-200 flex items-end gap-2 sm:gap-3"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                    className="hidden"
                  />

                  {/* Attachment Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach Photo or Video (max 50MB)"
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all shrink-0 cursor-pointer"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Saved Replies Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsQuickRepliesOpen((prev) => !prev)}
                    title="Toggle Saved Messages Popover"
                    className={`p-2.5 rounded-xl border transition-all shrink-0 cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                      isQuickRepliesOpen
                        ? 'bg-[#2C1E1B] text-white border-[#2C1E1B] shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Bookmark className="w-4 h-4 text-amber-500" />
                    <span className="hidden sm:inline">Saved</span>
                  </button>

                  <div className="flex-1 min-w-0 relative">
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
                    className={`px-4 sm:px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
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
              </div>
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
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
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
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#2C1E1B] text-white hover:bg-[#3D2B27] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Messages (Quick Replies) Management Modal */}
      {isSavedMessagesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <Bookmark className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">Saved Messages & Quick Replies</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {savedMessages.length} Templates
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Create reusable answers that staff can copy, insert, or dispatch directly to customers
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSavedMessagesModalOpen(false);
                  handleCancelSavedMessageForm();
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Toast */}
            {savedMessageToast && (
              <div className="bg-emerald-50 text-emerald-800 px-6 py-2.5 text-xs font-semibold border-b border-emerald-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{savedMessageToast}</span>
              </div>
            )}

            {/* Search, Filter & New Button Toolbar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={savedMessageSearch}
                    onChange={(e) => setSavedMessageSearch(e.target.value)}
                    placeholder="Search by title, shortcut, or message keywords..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800"
                  />
                  {savedMessageSearch && (
                    <button
                      onClick={() => setSavedMessageSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Add New Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isAddingNewSavedMessage) {
                      handleCancelSavedMessageForm();
                    } else {
                      setIsAddingNewSavedMessage(true);
                      setEditingSavedMessageId(null);
                      setSavedFormTitle('');
                      setSavedFormContent('');
                      setSavedFormCategory('GENERAL');
                      setSavedFormShortcut('');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#2C1E1B] hover:bg-[#3D2B27] text-white shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  {isAddingNewSavedMessage ? (
                    <>
                      <X className="w-4 h-4" />
                      <span>Close Form</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create Saved Message</span>
                    </>
                  )}
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                {['ALL', 'GREETING', 'SHIPPING', 'RETURNS', 'PAYMENT', 'GENERAL'].map((catKey) => (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setSavedCategoryFilter(catKey)}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-[11px] ${
                      savedCategoryFilter === catKey
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    {catKey === 'ALL' ? 'All Templates' : catKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Inline Add / Edit Saved Message Form */}
            {isAddingNewSavedMessage && (
              <form
                onSubmit={handleSaveMessageSubmit}
                className="p-5 bg-amber-50/60 border-b border-amber-200 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>{editingSavedMessageId ? 'Edit Saved Message' : 'New Saved Message'}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleCancelSavedMessageForm}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={savedFormTitle}
                      onChange={(e) => setSavedFormTitle(e.target.value)}
                      placeholder="e.g. Return Policy Overview"
                      className="w-full px-3 py-2 bg-white text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                      Category
                    </label>
                    <select
                      value={savedFormCategory}
                      onChange={(e) => setSavedFormCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                    >
                      <option value="GENERAL">General</option>
                      <option value="GREETING">Greeting</option>
                      <option value="SHIPPING">Shipping & Courier</option>
                      <option value="RETURNS">Replacements & Exchanges</option>
                      <option value="PAYMENT">Payment & Billing</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                      Shortcut (Optional)
                    </label>
                    <input
                      type="text"
                      value={savedFormShortcut}
                      onChange={(e) => setSavedFormShortcut(e.target.value)}
                      placeholder="e.g. /return or /hello"
                      className="w-full px-3 py-2 bg-white text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                    Message Content *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={savedFormContent}
                    onChange={(e) => setSavedFormContent(e.target.value)}
                    placeholder="Enter the complete response text that will be copied or sent to the customer..."
                    className="w-full px-3 py-2.5 bg-white text-xs text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelSavedMessageForm}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingMessage}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#2C1E1B] hover:bg-[#3D2B27] text-white transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingMessage ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{editingSavedMessageId ? 'Update Message' : 'Save Message'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Saved Messages Cards List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {isLoadingSavedMessages ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                  Loading saved messages...
                </div>
              ) : filteredSavedMessages.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-400 space-y-2">
                  <Bookmark className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-700">No Saved Messages Found</p>
                  <p className="text-[11px] max-w-sm mx-auto">
                    {savedMessageSearch || savedCategoryFilter !== 'ALL'
                      ? 'Try clearing your search or category filters.'
                      : 'Click "Create Saved Message" above to add your first reusable canned response!'}
                  </p>
                </div>
              ) : (
                filteredSavedMessages.map((msg) => {
                  const isCopied = copiedSavedMessageId === msg.id;
                  return (
                    <div
                      key={msg.id}
                      className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{msg.title}</h4>
                          {msg.shortcut && (
                            <span className="font-mono text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">
                              {msg.shortcut}
                            </span>
                          )}
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 py-0.5 bg-slate-100 rounded-md">
                            {msg.category || 'GENERAL'}
                          </span>
                        </div>

                        {/* Top-right card actions */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEditSavedMessage(msg)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                            title="Edit this saved message"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSavedMessage(msg.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                            title="Delete this saved message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content Block */}
                      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400">
                          Created {msg.created_at ? new Date(msg.created_at).toLocaleDateString() : ''}
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Copy Button */}
                          <button
                            type="button"
                            onClick={() => handleCopySavedMessage(msg)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                            title="Copy message to clipboard"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Copied to Clipboard!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>Copy Text</span>
                              </>
                            )}
                          </button>

                          {/* Contextual actions if ticket is selected */}
                          {selectedTicket && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  handleInsertSavedMessage(msg);
                                  setIsSavedMessagesModalOpen(false);
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all cursor-pointer"
                                title="Insert text into composer to edit before sending"
                              >
                                Insert into Chat
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  handleSendSavedMessageDirectly(msg);
                                  setIsSavedMessagesModalOpen(false);
                                }}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#2C1E1B] hover:bg-[#3D2B27] text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                title={`Send directly to ${selectedTicket.customer_name}`}
                              >
                                <Send className="w-3 h-3" />
                                <span>Send to Customer</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Tip: Type shortcut or click <Zap className="w-3 h-3 inline text-amber-500" /> in the chat box for instant access.
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsSavedMessagesModalOpen(false);
                  handleCancelSavedMessageForm();
                }}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#2C1E1B] text-white hover:bg-[#3D2B27] cursor-pointer"
              >
                Close
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
