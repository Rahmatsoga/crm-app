import { supabase } from "./supabaseClient";
import { sendSMS, sendWhatsApp } from "./twilioService";

// Default Sample Meetings for Social Media Demo
export const SAMPLE_MEETINGS = [
  {
    id: "mtg-1",
    title: "Discovery Call — Voice AI Bot",
    meeting_type: "discovery_call",
    client_name: "Apex Dental Group",
    client_phone: "+1 (555) 234-5678",
    meeting_id: "836 485 9102",
    passcode: "ELEV88",
    start_time: new Date(Date.now() + 3600000 * 2).toISOString(),
    end_time: new Date(Date.now() + 3600000 * 3).toISOString(),
    zoom_join_url: "https://zoom.us/join",
    google_calendar_url: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Discovery+Call+Apex+Dental",
    host_name: "Rahmat (Admin)",
    status: "scheduled",
    notes: "Review AI appointment booking workflow and Twilio WebRTC integration."
  },
  {
    id: "mtg-2",
    title: "Voiceover & Script Final Review",
    meeting_type: "voiceover_review",
    client_name: "SaaSify Scale",
    client_phone: "+1 (555) 987-6543",
    meeting_id: "912 304 8810",
    passcode: "MAAZ07",
    start_time: new Date(Date.now() + 3600000 * 24).toISOString(),
    end_time: new Date(Date.now() + 3600000 * 25).toISOString(),
    zoom_join_url: "https://zoom.us/join",
    google_calendar_url: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Voiceover+Review+SaaSify",
    host_name: "Maaz (Sales)",
    status: "scheduled",
    notes: "Approve 070 Sea Disasters script and audio voiceover samples."
  }
];

// Helper to generate Google Calendar Event URL
export function generateGoogleCalendarUrl({ title, description, startTime, endTime, location }) {
  const formatTime = (isoStr) => {
    return new Date(isoStr).toISOString().replace(/-|:|\.\d\d\d/g, "");
  };
  const start = formatTime(startTime || new Date().toISOString());
  const end = formatTime(endTime || new Date(Date.now() + 3600000).toISOString());
  
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title || "Elevatech CRM Discovery Call",
    details: description || "Scheduled via Elevatech Software House CRM",
    location: location || "https://zoom.us/join",
    dates: `${start}/${end}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Helper to generate Zoom Join Link
export function generateZoomMeetingUrl(meetingTitle, customZoomUrl) {
  if (customZoomUrl && customZoomUrl.trim()) {
    return customZoomUrl.trim();
  }
  return "https://zoom.us/join";
}

// Helper for instant 1-click open WebRTC video room
export function generateInstantVideoUrl() {
  const roomHash = Math.random().toString(36).substring(2, 10);
  return `https://meet.jit.si/room-${roomHash}`;
}

// Helper for Google Meet Instant Meeting
export function generateGoogleMeetUrl() {
  return "https://meet.google.com/new";
}

// Schedule New Meeting Function
export async function scheduleMeeting(meetingData) {
  const meetingId = meetingData.custom_meeting_id || `${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
  const passcode = meetingData.custom_passcode || Math.random().toString(36).substring(2, 8).toUpperCase();

  const zoomUrl = meetingData.custom_zoom_link && meetingData.custom_zoom_link.trim()
    ? meetingData.custom_zoom_link.trim()
    : `https://zoom.us/join`;

  const gcalUrl = generateGoogleCalendarUrl({
    title: meetingData.title,
    description: `Meeting ID: ${meetingId} | Passcode: ${passcode}\n${meetingData.notes || ""}`,
    startTime: meetingData.start_time,
    endTime: meetingData.end_time,
    location: zoomUrl,
  });

  const payload = {
    client_id: meetingData.client_id || null,
    deal_id: meetingData.deal_id || null,
    card_id: meetingData.card_id || null,
    title: meetingData.title,
    meeting_type: meetingData.meeting_type || "discovery_call",
    meeting_id: meetingId,
    passcode: passcode,
    start_time: meetingData.start_time,
    end_time: meetingData.end_time || new Date(new Date(meetingData.start_time).getTime() + 1800000).toISOString(),
    location_or_url: zoomUrl,
    zoom_join_url: zoomUrl,
    google_calendar_url: gcalUrl,
    host_name: meetingData.host_name || "Rahmat (Admin)",
    notes: meetingData.notes || "Scheduled via Elevatech CRM Meeting Booker",
    status: "scheduled",
  };

  // Insert to Supabase DB if available
  let inserted = null;
  try {
    const { data, error } = await supabase.from("meetings").insert([payload]).select().single();
    if (!error && data) {
      inserted = data;
    }
  } catch (err) {
    console.warn("Meetings DB insert fallback:", err);
  }

  const finalMeeting = inserted || { ...payload, id: `mtg-${Date.now()}` };

  // Dispatch Twilio SMS notification if phone is present
  if (meetingData.client_phone) {
    const timeFormatted = new Date(meetingData.start_time).toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const message = `📅 Elevatech Confirmation: Your meeting "${meetingData.title}" is scheduled for ${timeFormatted}.\nMeeting ID: ${meetingId}\nPasscode: ${passcode}\nZoom Link: ${zoomUrl}\nGoogle Cal: ${gcalUrl}`;
    
    sendSMS({
      to: meetingData.client_phone,
      message_body: message,
      deal_id: meetingData.deal_id,
      card_id: meetingData.card_id,
      client_id: meetingData.client_id,
    });
  }

  return finalMeeting;
}

// Fetch Meetings
export async function getMeetings({ deal_id, card_id, client_id }) {
  try {
    let query = supabase.from("meetings").select("*").order("start_time", { ascending: true });
    if (deal_id) query = query.eq("deal_id", deal_id);
    if (card_id) query = query.eq("card_id", card_id);
    if (client_id) query = query.eq("client_id", client_id);

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (e) {
    console.warn("Fetch meetings fallback:", e);
  }
  return SAMPLE_MEETINGS;
}
