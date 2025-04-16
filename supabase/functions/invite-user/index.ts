import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400'
};

serve(async (req) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // For non-OPTIONS requests, always include CORS headers
  if (req.method === 'POST') {
    try {
      const rawBody = await req.text();
      let body;
      try {
        body = rawBody ? JSON.parse(rawBody) : {};
        console.log('Parsed request body:', body);
      } catch (e) {
        console.error('JSON parse error:', e);
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid JSON body',
          details: e.message
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        });
      }

      const { email, invitedBy } = body;
      console.log('Received invitation request for email:', email);
      const role = 'user'; // Default role for invited users

      if (!email) {
        console.error('No email provided in request');
        return new Response(JSON.stringify({
          success: false,
          error: 'Email is required'
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        });
      }

      console.log('Processing invitation for:', { email, role, invitedBy });

      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!serviceRoleKey) {
        console.error('Service role key not configured');
        return new Response(JSON.stringify({
          success: false,
          error: 'Service role key is not configured'
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        });
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      console.log('Using Supabase URL:', supabaseUrl);

      const supabaseAdmin = createClient(supabaseUrl || '', serviceRoleKey);

      try {
        // 1. Get the inviter's workspace
        console.log('1. Getting inviter workspace:', invitedBy);
        const { data: inviterWorkspace, error: workspaceError } = await supabaseAdmin
          .from('workspaces')
          .select('id')
          .eq('owner_id', invitedBy)
          .single();

        if (workspaceError || !inviterWorkspace) {
          console.error('Error getting workspace:', workspaceError);
          throw new Error('Could not find workspace for inviter');
        }

        // 2. Check if user exists in auth.users
        console.log('2. Checking if user exists for email:', email);
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
          console.error('Error listing users:', listError);
          throw listError;
        }

        const existingUser = users.find(u => u.email === email);
        let userId;

        // 3. Send email based on whether user is new or existing
        console.log('3. Sending email to:', email);
        const redirectTo = `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/auth/callback`;
        
        if (existingUser) {
          console.log('Sending recovery link to existing user:', email);
          const { data: emailData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo,
            data: { 
              recovery: true,
              workspace_id: inviterWorkspace.id
            }
          });
          
          if (inviteError || !emailData) {
            console.error('Error sending recovery email:', inviteError);
            throw inviteError;
          }
          
          userId = existingUser.id;
          
        } else {
          console.log('Sending invitation to new user:', email);
          const { data: emailData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo,
            data: { 
              role,
              workspace_id: inviterWorkspace.id
            }
          });
          
          if (inviteError || !emailData) {
            console.error('Error sending invitation:', inviteError);
            throw inviteError;
          }
          
          userId = emailData.user.id;
        }

        // 4. Create or update profile with workspace
        console.log('4. Creating/updating profile for:', { id: userId, email });
        const profileData = {
          id: userId,
          email: email,
          invited_at: new Date().toISOString(),
          status: 'invited',
          workspace_id: inviterWorkspace.id
        };

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert([profileData])
          .select()
          .single();

        if (profileError) {
          console.error('Error creating/updating profile:', profileError);
          throw profileError;
        }

        // 5. Add user role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: 'user'
          });

        if (roleError) {
          console.error('Error setting user role:', roleError);
          throw roleError;
        }

        return new Response(JSON.stringify({
          success: true,
          message: existingUser ? 'User added to workspace and email sent' : 'User created and invited successfully',
          id: userId,
          email: email
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        });

      } catch (error) {
        console.error('Operation failed:', error);
        return new Response(JSON.stringify({
          success: false,
          error: 'Operation failed',
          details: error
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        });
      }
    } catch (error) {
      console.error('Function error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Function error',
        details: error
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
  }

  // Return 405 for non-POST/OPTIONS requests
  return new Response(JSON.stringify({
    success: false,
    error: 'Method Not Allowed'
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}); 