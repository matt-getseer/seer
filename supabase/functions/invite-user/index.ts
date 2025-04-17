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
};

interface InviteRequest {
  email: string;
  invitedBy: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get request data
    const { email, invitedBy }: InviteRequest = await req.json();
    if (!email || !invitedBy) {
      throw new Error('Missing required fields');
    }

    // Verify inviter exists and has permission
    const { data: inviter, error: inviterError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', invitedBy)
      .single();

    if (inviterError || !inviter) {
      throw new Error('Invalid inviter');
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
    const { data: user, error: createError } = await supabaseClient.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        data: { 
          invitedBy,
          requiresPassword: true
        }
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
        role: 'user',
        status: 'invited',
        invited_by: invitedBy,
        password_setup_complete: false,
        invited_at: new Date().toISOString()
      });

    if (profileError) {
      throw profileError;
    }

    // Log invite for audit
    await supabaseClient.from('audit_log').insert({
      action: 'invite_user',
      performed_by: invitedBy,
      target_user: user.user.id,
      metadata: { 
        email,
        invite_type: 'user'
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        id: user.user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 