import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('PROJECT_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { action, payload } = await req.json()
    console.log('🔧 User Management Action:', action, payload)

    switch (action) {
      case 'inviteUser':
        return await handleInviteUser(supabaseAdmin, payload)
      case 'deleteUser':
        return await handleDeleteUser(supabaseAdmin, payload)
      case 'listUsers':
        return await handleListUsers(supabaseAdmin, payload)
      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('❌ User Management Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function handleInviteUser(supabaseAdmin, { email, fullName, role = 'receptionist' }) {
  try {
    console.log('📧 Inviting user:', email, fullName, 'with role:', role)

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName,
        email: email,
        role: role
      }
    })

    if (authError) {
      console.error('❌ Auth invite error:', authError)
      throw authError
    }

    console.log('✅ User invited successfully:', authData.user?.email)

    // Create profile record
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: fullName,
        role: role,
        created_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('❌ Profile creation error:', profileError)
      // Don't throw here, user is already created in auth
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User invited successfully',
        user: authData.user
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Invite user error:', error)
    throw error
  }
}

async function handleDeleteUser(supabaseAdmin, { userId }) {
  try {
    console.log('🗑️ Deleting user:', userId)

    // Delete user from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('❌ Auth delete error:', authError)
      throw authError
    }

    console.log('✅ User deleted successfully:', userId)

    // Profile will be deleted automatically due to CASCADE constraint

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Delete user error:', error)
    throw error
  }
}

async function handleListUsers(supabaseAdmin, payload) {
  try {
    console.log('📋 Listing users')

    // Get users from profiles table
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('❌ Profiles query error:', profilesError)
      throw profilesError
    }

    console.log('✅ Users listed successfully:', profiles?.length || 0)

    return new Response(
      JSON.stringify({ 
        success: true, 
        users: profiles || []
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ List users error:', error)
    throw error
  }
}
