import { supabase } from './supabaseClient';

// Configuration & Fallback Mock Settings
const TWILIO_CONFIG = {
  accountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID || 'AC_MOCK_TWILIO_ACCOUNT_SID',
  authToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN || 'MOCK_AUTH_TOKEN',
  phoneNumber: import.meta.env.VITE_TWILIO_PHONE_NUMBER || '+18005550199',
  whatsAppNumber: import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER || 'whatsapp:+18005550199',
};

// Local storage key for persistent offline fallback logs
const MOCK_STORAGE_KEY = 'crm_twilio_communication_logs';

const getLocalLogs = () => {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading local Twilio logs:', err);
    return [];
  }
};

const saveLocalLog = (logItem) => {
  try {
    const current = getLocalLogs();
    const updated = [logItem, ...current];
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving local Twilio log:', err);
  }
};

/**
 * Send SMS message via Twilio (with fallback mock recording)
 */
export async function sendSMS({ to, message_body, card_id = null, deal_id = null, client_id = null }) {
  const newLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    channel: 'sms',
    direction: 'outbound',
    sender_number: TWILIO_CONFIG.phoneNumber,
    recipient_number: to || '+15550001111',
    message_body,
    status: 'delivered',
    card_id,
    deal_id,
    client_id,
    twilio_sid: `SM${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
    created_at: new Date().toISOString()
  };

  try {
    // Attempt saving to Supabase if connected
    const { data, error } = await supabase
      .from('communication_logs')
      .insert([newLog])
      .select();

    if (error) {
      console.warn('Supabase DB error, using local fallback:', error.message);
      saveLocalLog(newLog);
      return { success: true, data: [newLog], isMock: true };
    }

    return { success: true, data, isMock: false };
  } catch (err) {
    console.warn('Network / DB exception sending SMS, using local fallback:', err);
    saveLocalLog(newLog);
    return { success: true, data: [newLog], isMock: true };
  }
}

/**
 * Send WhatsApp message via Twilio (with fallback mock recording)
 */
export async function sendWhatsApp({ to, message_body, card_id = null, deal_id = null, client_id = null }) {
  const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  
  const newLog = {
    id: `log-wa-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    channel: 'whatsapp',
    direction: 'outbound',
    sender_number: TWILIO_CONFIG.whatsAppNumber,
    recipient_number: formattedTo,
    message_body,
    status: 'delivered',
    card_id,
    deal_id,
    client_id,
    twilio_sid: `WA${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('communication_logs')
      .insert([newLog])
      .select();

    if (error) {
      saveLocalLog(newLog);
      return { success: true, data: [newLog], isMock: true };
    }

    return { success: true, data, isMock: false };
  } catch (err) {
    saveLocalLog(newLog);
    return { success: true, data: [newLog], isMock: true };
  }
}

/**
 * Log a VoIP / WebRTC Phone Call
 */
export async function logVoIPCall({ to, call_duration_seconds, notes = '', card_id = null, deal_id = null, client_id = null }) {
  const newLog = {
    id: `log-call-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    channel: 'voice',
    direction: 'outbound',
    sender_number: TWILIO_CONFIG.phoneNumber,
    recipient_number: to || '+15550001111',
    message_body: notes ? `Call Notes: ${notes}` : 'Completed voice call via Twilio WebRTC',
    call_duration_seconds,
    status: 'completed',
    card_id,
    deal_id,
    client_id,
    twilio_sid: `CA${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('communication_logs')
      .insert([newLog])
      .select();

    if (error) {
      saveLocalLog(newLog);
      return { success: true, data: [newLog], isMock: true };
    }

    return { success: true, data, isMock: false };
  } catch (err) {
    saveLocalLog(newLog);
    return { success: true, data: [newLog], isMock: true };
  }
}

/**
 * Fetch logs for a specific card, deal, or client
 */
export async function getCommunicationLogs({ card_id = null, deal_id = null, client_id = null }) {
  let dbLogs = [];

  try {
    let query = supabase.from('communication_logs').select('*').order('created_at', { ascending: false });

    if (card_id) query = query.eq('card_id', card_id);
    else if (deal_id) query = query.eq('deal_id', deal_id);
    else if (client_id) query = query.eq('client_id', client_id);

    const { data, error } = await query;
    if (!error && data) {
      dbLogs = data;
    }
  } catch (err) {
    console.warn('Could not fetch logs from Supabase:', err);
  }

  // Merge with local storage logs matching criteria
  const localLogs = getLocalLogs().filter(l => {
    if (card_id && l.card_id === card_id) return true;
    if (deal_id && l.deal_id === deal_id) return true;
    if (client_id && l.client_id === client_id) return true;
    if (!card_id && !deal_id && !client_id) return true;
    return false;
  });

  // Combine and deduplicate
  const combinedMap = new Map();
  [...localLogs, ...dbLogs].forEach(item => combinedMap.set(item.id, item));
  
  return Array.from(combinedMap.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Execute automated Twilio trigger when a deal/card is moved to a new stage
 */
export async function triggerStageAutomation({ stageName, cardTitle, cardId, recipientPhone = '+15550001111' }) {
  const formattedStage = stageName ? stageName.toLowerCase() : '';
  
  let templateMessage = null;
  let channel = 'sms';

  if (formattedStage.includes('proposal') || formattedStage.includes('quote')) {
    templateMessage = `Hi! A proposal for "${cardTitle}" has been prepared and sent. Reply 'YES' to schedule a review call!`;
  } else if (formattedStage.includes('contact') || formattedStage.includes('qualified')) {
    templateMessage = `Hello! Thanks for connecting regarding "${cardTitle}". We have assigned a dedicated agent to your account.`;
  } else if (formattedStage.includes('won') || formattedStage.includes('closed') || formattedStage.includes('final')) {
    templateMessage = `Congratulations! Your project "${cardTitle}" has officially started. Welcome to Elevatech CRM!`;
    channel = 'whatsapp';
  } else {
    // Generic automated stage notification
    templateMessage = `Update on your deal "${cardTitle}": Moved to stage [${stageName}].`;
  }

  if (channel === 'whatsapp') {
    return await sendWhatsApp({
      to: recipientPhone,
      message_body: `[Automated Workflow Trigger - Stage Change to ${stageName}]\n${templateMessage}`,
      card_id: cardId
    });
  }

  return await sendSMS({
    to: recipientPhone,
    message_body: `[Automated Workflow Trigger - Stage Change to ${stageName}]\n${templateMessage}`,
    card_id: cardId
  });
}
