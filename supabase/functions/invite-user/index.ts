// @deno-types="https://deno.land/std@0.177.0/http/server.d.ts"
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @deno-types="https://esm.sh/v128/@supabase/supabase-js@2.7.1/dist/module/index.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

declare global {
  interface DenoNamespace {
    env: {
      get(key: string): string | undefined;
    };
  }
  const Deno: DenoNamespace;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface InviteRequest {
  email: string;
  invitedBy: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
      }
    });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !authUser) {
      throw new Error('Invalid authentication token');
    }

    // Get request data
    const { email, invitedBy }: InviteRequest = await req.json();
    if (!email || !invitedBy) {
      throw new Error('Missing required fields');
    }

    // Get inviter's workspace ID
    const { data: inviterProfile, error: inviterProfileError } = await supabaseClient
      .from('profiles')
      .select('workspace_id')
      .eq('id', invitedBy)
      .single();

    if (inviterProfileError || !inviterProfile?.workspace_id) {
      throw new Error('Could not find inviter\'s workspace');
    }

    // Verify inviter exists and has admin role
    const { data: inviterRole, error: inviterError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', invitedBy)
      .single();

    if (inviterError || !inviterRole || inviterRole.role !== 'admin') {
      throw new Error('Unauthorized: Inviter must be an admin');
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseClient
      .from('profiles')
      .select('id, status')
      .eq('email', email)
      .single();

    if (existingUser) {
      if (existingUser.status === 'invited') {
        throw new Error('User has already been invited');
      }
      throw new Error('User already exists');
    }

    // Create user and send invite
    const { data: user, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { 
        invitedBy,
        requiresPassword: true,
        workspace_id: inviterProfile.workspace_id
      }
    });

    if (createError) {
      throw createError;
    }

    // Create initial profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: user.user.id,
        email: email,
        status: 'invited',
        invited_by: invitedBy,
        workspace_id: inviterProfile.workspace_id,
        password_setup_complete: false,
        invited_at: new Date().toISOString()
      });

    if (profileError) {
      throw profileError;
    }

    // Set user role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: user.user.id,
        role: 'user'
      });

    if (roleError) {
      throw roleError;
    }

    // Log invite for audit
    await supabaseClient.from('audit_log').insert({
      action: 'invite_user',
      performed_by: invitedBy,
      target_user: user.user.id,
      metadata: { 
        email,
        invite_type: 'user',
        workspace_id: inviterProfile.workspace_id
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        id: user.user.id
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
        } 
      }
    );
  } catch (error) {
    console.error('Error in invite-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
        }
      }
    );
  }
}); 