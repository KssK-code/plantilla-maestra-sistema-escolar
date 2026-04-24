import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { action, payload } = await req.json()

    switch (action) {
      case 'createUser':
        return await handleCreateUser(supabaseAdmin, payload)
      case 'inviteUser':
        return await handleInviteUser(supabaseAdmin, payload)
      case 'deleteUser':
        return await handleDeleteUser(supabaseAdmin, payload)
      case 'listUsers':
        return await handleListUsers(supabaseAdmin)
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleCreateUser(supabaseAdmin, { email, password, fullName, role = 'receptionist' }) {
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  })

  if (authError) throw authError

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      { id: authData.user.id, email, full_name: fullName, role },
      { onConflict: 'id' }
    )

  if (profileError) throw profileError

  return new Response(
    JSON.stringify({ success: true, user: authData.user }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleInviteUser(supabaseAdmin, { email, fullName, role = 'receptionist' }) {
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role }
  })

  if (authError) throw authError

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      { id: authData.user.id, email, full_name: fullName, role },
      { onConflict: 'id' }
    )

  if (profileError) throw profileError

  return new Response(
    JSON.stringify({ success: true, user: authData.user }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleDeleteUser(supabaseAdmin, { userId }) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) throw error

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleListUsers(supabaseAdmin) {
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true, users: profiles ?? [] }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
