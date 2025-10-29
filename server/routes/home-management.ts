import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import { sendInvitationEmail } from "../lib/email";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper: Authenticate user
async function authenticateUser(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

  // =====================================================
  // GET MY INVITE CODE
  // =====================================================
  export const getMyInviteCode: RequestHandler = async (req, res) => {
    try {
      const user = await authenticateUser(req.headers.authorization);
    
      // Get user's invite code
      const { data, error } = await supabase
        .from('users')
        .select('invite_code')
        .eq('id', user.id)
        .single();
    
      if (error) {
        console.error('Error fetching invite code:', error);
        return res.status(500).json({ error: 'Failed to fetch invite code' });
      }
    
      if (!data?.invite_code) {
        return res.status(404).json({ error: 'Invite code not found' });
      }
    
      res.json({ invite_code: data.invite_code });
    } catch (error: any) {
      console.error('Get invite code error:', error);
      res.status(error.message === 'Unauthorized' ? 401 : 500).json({
        error: error.message
      });
    }
  };

// =====================================================
// SEND INVITATION
// =====================================================
export const sendInvitation: RequestHandler = async (req, res) => {
  try {
    console.log('📧 SEND INVITATION - Start');
    console.log('Body:', req.body);
    
    const user = await authenticateUser(req.headers.authorization);
    console.log('User authenticated:', user.id);
    
  const { home_id, invitee_email, role } = req.body;
  // invitee_email can now be an actual email OR an 8-char invite code
  const inviteeIdentifier: string = String(invitee_email).trim();

    if (!home_id || !invitee_email || !role) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        error: 'home_id, invitee_email, and role are required'
      });
    }

    if (!['admin', 'member'].includes(role)) {
      console.log('❌ Invalid role:', role);
      return res.status(400).json({
        error: 'Role must be admin or member'
      });
    }

    // Create user-specific Supabase client for auth.uid() context
    const token = req.headers.authorization!.split(' ')[1];
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    console.log(`Calling send_home_invitation RPC: home_id=${home_id}, identifier=${inviteeIdentifier}, role=${role}`);
    const { data, error } = await userSupabase.rpc('send_home_invitation', {
      p_home_id: home_id,
      p_invitee_identifier: inviteeIdentifier,
      p_role: role
    });

    if (error) {
      console.log('❌ RPC Error:', error.message);
      
      // Provide user-friendly error messages
      let userMessage = error.message;
      if (error.message.includes('duplicate key value') && error.message.includes('home_invitations')) {
        userMessage = 'An invitation has already been sent to this email. Please wait for them to accept or cancel the existing invitation first.';
      } else if (error.message.includes('already a member')) {
        userMessage = 'This user is already a member of your home.';
      }
      
      return res.status(400).json({ error: userMessage });
    }

    console.log('✅ Invitation created successfully');
    const invitation = data[0];

    // Get home and inviter information for the email
    const { data: homeData } = await supabase
      .from('homes')
      .select('name')
      .eq('id', home_id)
      .single();

    const { data: inviterData } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // If identifier looks like an invite code, skip email (in-app only). Otherwise, send email.
    const isInviteCode = /^[A-Z0-9]{8}$/.test(inviteeIdentifier);
    if (!isInviteCode) {
      // Send invitation email (non-blocking)
      sendInvitationEmail({
        inviteeEmail: inviteeIdentifier,
        inviterName: inviterData?.full_name || inviterData?.email || 'A home member',
        homeName: homeData?.name || 'Smart Home',
        role: role,
        invitationId: invitation.invitation_id
      }).catch(err => {
        console.error('⚠️ Email sending failed (non-critical):', err.message);
      });
    }

    res.json({
      success: true,
      invitation: invitation
    });
  } catch (err: any) {
    console.log('❌ Exception:', err.message);
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// GET INVITATIONS FOR HOME
// =====================================================
export const getHomeInvitations: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    const { home_id } = req.params;

    const { data, error } = await supabase
      .from('home_invitations')
      .select(`
        *,
        inviter:inviter_id(email)
      `)
      .eq('home_id', home_id)
      .order('invited_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      invitations: data
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// GET MY INVITATIONS (for current user)
// =====================================================
export const getMyInvitations: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);

    const { data: userData } = await supabase.auth.getUser(req.headers.authorization!.split(' ')[1]);
    
    // Get invitations without joins first
    const { data: invitations, error } = await supabase
      .from('home_invitations')
      .select('*')
      .eq('invitee_email', userData.user?.email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('invited_at', { ascending: false });

    if (error) {
      console.error('Error fetching my invitations:', error);
      return res.status(400).json({ error: error.message });
    }

    // Enrich each invitation with home and inviter details
    const enrichedInvitations = await Promise.all(
      (invitations || []).map(async (inv) => {
        // Get home details
        const { data: homeData } = await supabase
          .from('homes')
          .select('id, name')
          .eq('id', inv.home_id)
          .single();

        // Get inviter details from users table
        const { data: inviterData } = await supabase
          .from('users')
          .select('email')
          .eq('id', inv.inviter_id)
          .single();

        return {
          ...inv,
          home: homeData || { id: inv.home_id, name: 'Unknown Home' },
          inviter: { email: inviterData?.email || 'Unknown' }
        };
      })
    );

    console.log(`✅ Found ${enrichedInvitations.length} invitations for ${userData.user?.email}`);

    res.json({
      success: true,
      invitations: enrichedInvitations
    });
  } catch (err: any) {
    console.error('Get my invitations error:', err);
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// ACCEPT INVITATION
// =====================================================
export const acceptInvitation: RequestHandler = async (req, res) => {
  try {
    console.log('✅ ACCEPT INVITATION - Start');
    console.log('Params:', req.params);
    
    const user = await authenticateUser(req.headers.authorization);
    console.log('User authenticated:', user.id, user.email);
    
    const { invitation_id } = req.params;

    if (!invitation_id) {
      console.log('❌ Missing invitation_id');
      return res.status(400).json({ error: 'invitation_id is required' });
    }

    // Call RPC with the user's auth context for auth.uid() to work
    const token = req.headers.authorization!.split(' ')[1];
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    console.log(`Calling accept_home_invitation RPC: invitation_id=${invitation_id}`);
    const { data, error } = await userSupabase.rpc('accept_home_invitation', {
      p_invitation_id: parseInt(invitation_id)
    });

    if (error) {
      console.log('❌ RPC Error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Invitation accepted successfully:', JSON.stringify(data));
    res.json({
      success: true,
      result: data[0]
    });
  } catch (err: any) {
    console.log('❌ Exception:', err.message);
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// REJECT INVITATION
// =====================================================
export const rejectInvitation: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    const { invitation_id } = req.params;

    if (!invitation_id) {
      return res.status(400).json({ error: 'invitation_id is required' });
    }

    const token = req.headers.authorization!.split(' ')[1];
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { error } = await userSupabase
      .from('home_invitations')
      .update({ status: 'rejected' })
      .eq('id', parseInt(invitation_id));

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      message: 'Invitation rejected'
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// GET HOME MEMBERS
// =====================================================
export const getHomeMembers: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    const { home_id } = req.params;

    const { data, error } = await supabase.rpc('get_home_members_detailed', {
      p_home_id: parseInt(home_id)
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      members: data
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// UPDATE MEMBER ROLE
// =====================================================
export const updateMemberRole: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    const { member_id, role } = req.body;

    if (!member_id || !role) {
      return res.status(400).json({ error: 'member_id and role are required' });
    }

    if (!['admin', 'member', 'guest'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data, error } = await supabase
      .from('home_members')
      .update({ role })
      .eq('id', member_id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      member: data
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// REMOVE MEMBER
// =====================================================
export const removeMember: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    const { member_id } = req.params;

    const { data, error } = await supabase.rpc('remove_home_member', {
      p_home_member_id: parseInt(member_id)
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      result: data[0]
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// DELETE DEVICE WITH PIN
// =====================================================
export const deleteDeviceWithPin: RequestHandler = async (req, res) => {
  try {
    console.log('🗑️  DELETE DEVICE WITH PIN - Start');
    console.log('Headers:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    
    const user = await authenticateUser(req.headers.authorization);
    console.log('User authenticated:', user.id);
    
    const { device_id } = req.params;
    const { security_pin } = req.body;

    if (!device_id || !security_pin) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        error: 'device_id and security_pin are required' 
      });
    }

    // Get user's token from authorization header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.log('❌ No authentication token');
      return res.status(401).json({ error: 'No authentication token' });
    }

    console.log('Creating user supabase client...');
    console.log('SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
    console.log('ANON_KEY exists:', !!process.env.VITE_SUPABASE_ANON_KEY);
    console.log('ANON_KEY length:', process.env.VITE_SUPABASE_ANON_KEY?.length);
    
    // Create a client with the user's token (not service role)
    const userSupabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    console.log(`Calling RPC with device_id=${device_id}, pin=${security_pin.substring(0, 2)}**`);
    const { data, error } = await userSupabase.rpc('delete_device_with_pin', {
      p_appliance_id: parseInt(device_id),
      p_security_pin: security_pin
    });

    if (error) {
      console.log('❌ RPC Error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Device deleted successfully');
    res.json({
      success: true,
      result: data[0]
    });
  } catch (err: any) {
    console.log('❌ Exception:', err.message);
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// UPDATE SECURITY PIN
// =====================================================
export const updateSecurityPin: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    const { home_id, old_pin, new_pin } = req.body;

    if (!home_id || !old_pin || !new_pin) {
      return res.status(400).json({
        error: 'home_id, old_pin, and new_pin are required'
      });
    }

    const { data, error } = await supabase.rpc('update_home_security_pin', {
      p_home_id: home_id,
      p_old_pin: old_pin,
      p_new_pin: new_pin
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      result: data[0]
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// GET HOME SECURITY STATUS
// =====================================================
export const getHomeSecurityStatus: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    const { home_id } = req.params;

    const { data, error } = await supabase
      .from('homes')
      .select('id, name, security_pin')
      .eq('id', home_id)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      has_custom_pin: data.security_pin !== '0000',
      is_default_pin: data.security_pin === '0000'
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};
