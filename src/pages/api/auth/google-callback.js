import { supabase } from '../../../lib/supabaseClient'

// This runs on your backend/API
// If using Vite, create this in a Node.js backend or Supabase Edge Function

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { code, userId } = req.body

    if (!code || !userId) {
      return res.status(400).json({ error: 'Missing code or userId' })
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.VITE_GOOGLE_CLIENT_ID,
        client_secret: process.env.VITE_GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.VITE_APP_URL}/auth/google/callback`
      })
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange auth code for tokens')
    }

    const tokens = await tokenResponse.json()

    // Get Gmail profile to extract email
    const profileResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/profile',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`
        }
      }
    )

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch Gmail profile')
    }

    const profile = await profileResponse.json()
    const email = profile.emailAddress

    // Save to email_accounts table
    const { data, error } = await supabase
      .from('email_accounts')
      .upsert({
        user_id: userId,
        email,
        provider: 'gmail',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
        is_connected: true,
        connected_at: new Date()
      }, {
        onConflict: 'user_id,email'
      })

    if (error) throw error

    return res.status(200).json({
      success: true,
      email,
      message: 'Gmail account connected successfully'
    })
  } catch (error) {
    console.error('OAuth callback error:', error)
    return res.status(500).json({
      error: error.message || 'Failed to connect Gmail account'
    })
  }
}