import { supabase } from '../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { emailAccountId } = req.body

    if (!emailAccountId) {
      return res.status(400).json({ error: 'Missing emailAccountId' })
    }

    // Get email account with credentials
    const { data: emailAccount, error: fetchError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', emailAccountId)
      .single()

    if (fetchError || !emailAccount) {
      return res.status(404).json({ error: 'Email account not found' })
    }

    // Refresh access token if expired
    let accessToken = emailAccount.access_token
    if (new Date(emailAccount.token_expires_at) < new Date()) {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.VITE_GOOGLE_CLIENT_ID,
          client_secret: process.env.VITE_GOOGLE_CLIENT_SECRET,
          refresh_token: emailAccount.refresh_token,
          grant_type: 'refresh_token'
        })
      })

      if (tokenResponse.ok) {
        const newTokens = await tokenResponse.json()
        accessToken = newTokens.access_token

        // Update token in database
        await supabase
          .from('email_accounts')
          .update({
            access_token: newTokens.access_token,
            token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000)
          })
          .eq('id', emailAccountId)
      }
    }

    // Fetch emails from Gmail
    const messagesResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=10',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )

    if (!messagesResponse.ok) {
      throw new Error('Failed to fetch messages from Gmail')
    }

    const messagesData = await messagesResponse.json()
    const messages = messagesData.messages || []

    let syncedCount = 0

    // Process each email
    for (const message of messages) {
      // Get full message details
      const messageResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      if (!messageResponse.ok) continue

      const messageData = await messageResponse.json()
      const headers = messageData.payload.headers

      // Extract email metadata
      const from = headers.find(h => h.name === 'From')?.value || ''
      const subject = headers.find(h => h.name === 'Subject')?.value || '(No subject)'
      const date = headers.find(h => h.name === 'Date')?.value || ''

      // Extract email address from "Name <email@example.com>"
      const emailMatch = from.match(/<([^>]+)>/)
      const senderEmail = emailMatch ? emailMatch[1] : from

      // Find contact by email
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, client_id')
        .eq('email', senderEmail)
        .single()

      if (!contact) continue // Skip if contact not found

      // Check if activity already exists
      const { data: existingActivity } = await supabase
        .from('activities')
        .select('id')
        .eq('contact_id', contact.id)
        .eq('type', 'email')
        .eq('subject', subject)
        .single()

      if (existingActivity) continue // Skip if already logged

      // Create activity for this email
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          type: 'email',
          subject,
          description: `Email from ${senderEmail} received on ${date}`,
          contact_id: contact.id,
          created_by: emailAccount.user_id
        })

      if (!activityError) syncedCount++
    }

    // Update last sync time
    await supabase
      .from('email_accounts')
      .update({ last_synced_at: new Date() })
      .eq('id', emailAccountId)

    return res.status(200).json({
      success: true,
      syncedCount,
      message: `Successfully synced ${syncedCount} emails`
    })
  } catch (error) {
    console.error('Email sync error:', error)
    return res.status(500).json({
      error: error.message || 'Failed to sync emails'
    })
  }
}