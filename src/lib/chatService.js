import { supabase } from './supabaseClient';

/**
 * Customer Service Chat Categories
 */
export const CHAT_CATEGORIES = [
  {
    id: 'RETURN_EXCHANGE',
    label: 'Return & Exchange Queries',
    shortLabel: 'Returns',
    description: '30-day return policy, exchange requests, garment conditions',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    iconColor: 'text-rose-500',
  },
  {
    id: 'ORDER_TRACKING',
    label: 'Order Status & J&T Tracking',
    shortLabel: 'Order Tracking',
    description: 'Delivery checkpoints, rider updates, tracking numbers',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconColor: 'text-blue-500',
  },
  {
    id: 'SIZING_PRODUCT',
    label: 'Product Sizing & Fit Advice',
    shortLabel: 'Sizing & Fit',
    description: 'Bust/waist/hip measurements, garment cuts, styling advice',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconColor: 'text-indigo-500',
  },
  {
    id: 'PAYMENT_BILLING',
    label: 'Payment & Billing Verification',
    shortLabel: 'Payments',
    description: 'GCash, Maya, Credit Card, or Cash on Delivery verification',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconColor: 'text-emerald-500',
  },
  {
    id: 'GENERAL_INQUIRY',
    label: 'General Atelier Inquiries',
    shortLabel: 'General',
    description: 'Other inquiries, bespoke orders, atelier salon appointments',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    iconColor: 'text-amber-500',
  },
];

export const getCategoryMeta = (categoryId) => {
  return (
    CHAT_CATEGORIES.find((c) => c.id === categoryId) || {
      id: categoryId || 'GENERAL_INQUIRY',
      label: categoryId || 'General Inquiry',
      shortLabel: categoryId || 'General',
      description: 'Customer inquiry',
      badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
      iconColor: 'text-slate-500',
    }
  );
};

/**
 * Upload Image or Video Attachment to Supabase Storage
 * Supports photos (JPG, PNG, WebP) and videos (MP4, QuickTime, WebM) up to 50MB
 */
export async function uploadChatMedia(file) {
  if (!file) return null;

  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');

  if (!isImage && !isVideo) {
    throw new Error('Please upload an image (JPG, PNG, WebP) or video (MP4, WebM, MOV) file.');
  }

  // 50MB max file size limit
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('Attachment is too large. Maximum file size is 50MB.');
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `chat/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}`;

  const { error: uploadError } = await supabase.storage
    .from('chat_attachments')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Storage upload failed:', uploadError);
    throw new Error(`Media upload failed: ${uploadError.message}`);
  }

  const { data: publicData } = supabase.storage
    .from('chat_attachments')
    .getPublicUrl(path);

  return {
    url: publicData.publicUrl,
    type: isVideo ? 'VIDEO' : 'IMAGE',
    name: file.name,
  };
}

/**
 * Create a new Customer Service Ticket
 */
export async function createChatTicket({
  customerName,
  customerEmail,
  customerPhone = null,
  customerId = null,
  category = 'GENERAL_INQUIRY',
  initialMessage = '',
  mediaFile = null,
}) {
  const cleanName = (customerName || '').trim();
  const cleanEmail = (customerEmail || '').trim().toLowerCase();

  if (!cleanName) throw new Error('Please provide your name.');
  if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Please provide a valid email address.');
  if (!initialMessage.trim() && !mediaFile) throw new Error('Please enter a message or attach a file.');

  let mediaData = null;
  if (mediaFile) {
    mediaData = await uploadChatMedia(mediaFile);
  }

  const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

  // 1. Insert Ticket
  const { data: ticket, error: ticketErr } = await supabase
    .from('chat_tickets')
    .insert([
      {
        ticket_number: ticketNumber,
        customer_id: customerId,
        customer_name: cleanName,
        customer_email: cleanEmail,
        customer_phone: customerPhone,
        category,
        status: 'OPEN',
        last_message_preview: initialMessage || (mediaData?.type === 'VIDEO' ? '📹 Sent a video' : '📷 Sent an image'),
        last_message_at: new Date().toISOString(),
        unread_admin_count: 1,
        unread_customer_count: 0,
      },
    ])
    .select()
    .single();

  if (ticketErr) throw ticketErr;

  // 2. Insert Initial Customer Message
  const { data: firstMessage, error: msgErr } = await supabase
    .from('chat_messages')
    .insert([
      {
        ticket_id: ticket.id,
        sender_type: 'CUSTOMER',
        sender_id: customerId,
        sender_name: cleanName,
        message_text: initialMessage.trim() || null,
        media_url: mediaData?.url || null,
        media_type: mediaData?.type || null,
        media_name: mediaData?.name || null,
      },
    ])
    .select()
    .single();

  if (msgErr) throw msgErr;

  // Save active ticket reference locally scoped to customer
  const userStorageKey = customerId ? `aura_chat_ticket_${customerId}` : `aura_chat_ticket_${cleanEmail}`;
  try {
    localStorage.setItem(
      userStorageKey,
      JSON.stringify({ id: ticket.id, ticket_number: ticket.ticket_number, customer_email: cleanEmail, customer_id: customerId })
    );
  } catch (e) {}

  return { ticket, firstMessage };
}

/**
 * Fetch tickets specifically belonging to a customer (by ID or Email)
 */
export async function fetchCustomerTickets({ customerId = null, customerEmail = null }) {
  if (!customerId && !customerEmail) return [];

  let query = supabase
    .from('chat_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  const cleanEmail = (customerEmail || '').trim().toLowerCase();

  if (customerId && cleanEmail) {
    query = query.or(`customer_id.eq.${customerId},customer_email.eq.${cleanEmail}`);
  } else if (customerId) {
    query = query.eq('customer_id', customerId);
  } else if (cleanEmail) {
    query = query.eq('customer_email', cleanEmail);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching customer tickets:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetch a single Ticket by ID
 */
export async function fetchTicket(ticketId) {
  if (!ticketId) return null;
  const { data, error } = await supabase
    .from('chat_tickets')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching ticket:', error);
    return null;
  }
  return data;
}

/**
 * Fetch messages for a ticket
 */
export async function fetchTicketMessages(ticketId) {
  if (!ticketId) return [];
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  return data || [];
}

/**
 * Send a chat message (from customer or admin)
 */
export async function sendChatMessage({
  ticketId,
  senderType = 'CUSTOMER',
  senderName = 'Customer',
  senderId = null,
  messageText = '',
  mediaFile = null,
}) {
  if (!ticketId) throw new Error('Ticket ID is required.');
  if (!messageText.trim() && !mediaFile) throw new Error('Message cannot be empty.');

  let mediaData = null;
  if (mediaFile) {
    mediaData = await uploadChatMedia(mediaFile);
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert([
      {
        ticket_id: ticketId,
        sender_type: senderType,
        sender_id: senderId,
        sender_name: senderName,
        message_text: messageText.trim() || null,
        media_url: mediaData?.url || null,
        media_type: mediaData?.type || null,
        media_name: mediaData?.name || null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: Fetch all tickets with filters
 */
export async function fetchAdminTickets({ category = 'ALL', status = 'ALL', searchQuery = '' } = {}) {
  let query = supabase
    .from('chat_tickets')
    .select('*')
    .order('last_message_at', { ascending: false });

  if (category && category !== 'ALL') {
    query = query.eq('category', category);
  }

  if (status && status !== 'ALL') {
    query = query.eq('status', status);
  }

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim();
    query = query.or(
      `ticket_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,last_message_preview.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching admin tickets:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetch all configurable automated replies
 */
export async function fetchAutoReplies() {
  const { data, error } = await supabase
    .from('chat_auto_replies')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching auto replies:', error);
    return [];
  }
  return data || [];
}

/**
 * Update an automated reply template (Admin / Super Admin)
 */
export async function updateAutoReply(category, { replyText, isActive = true, title }) {
  const updates = {
    reply_text: replyText,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };
  if (title) updates.title = title;

  const { data, error } = await supabase
    .from('chat_auto_replies')
    .update(updates)
    .eq('category', category)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update Ticket Status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
 */
export async function updateTicketStatus(ticketId, status) {
  const { data, error } = await supabase
    .from('chat_tickets')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark messages as read
 */
export async function markTicketAsRead(ticketId, viewerType = 'ADMIN') {
  if (!ticketId) return;

  const updateFields =
    viewerType === 'ADMIN'
      ? { unread_admin_count: 0 }
      : { unread_customer_count: 0 };

  await supabase
    .from('chat_tickets')
    .update(updateFields)
    .eq('id', ticketId);
}
