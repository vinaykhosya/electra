// Simulate accepting an invitation as vinaybal26@gmail.com
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function simulateAccept() {
  console.log('\n=== Simulating Invitation Accept ===\n');

  // Get vinaybal26's user
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  const vinaybal = users.find(u => u.email === 'vinaybal26@gmail.com');
  
  if (!vinaybal) {
    console.log('❌ User vinaybal26@gmail.com not found');
    return;
  }

  console.log(`✅ Found user: ${vinaybal.email} (${vinaybal.id})`);

  // Create a session token for this user
  const { data: sessionData, error: sessionError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: vinaybal.email
  });

  if (sessionError) {
    console.log('❌ Error generating session:', sessionError.message);
    return;
  }

  // Extract token from the magic link
  const url = new URL(sessionData.properties.action_link);
  const token = url.searchParams.get('token');
  
  if (!token) {
    console.log('❌ No token found in magic link');
    return;
  }

  // Verify the token and get a session
  const userClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: verifyData, error: verifyError } = await userClient.auth.verifyOtp({
    token_hash: token,
    type: 'magiclink'
  });

  if (verifyError) {
    console.log('❌ Token verification failed:', verifyError.message);
    return;
  }

  console.log(`✅ Session created for ${vinaybal.email}`);

  // Now call accept_home_invitation with the user's token
  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${verifyData.session.access_token}`
      }
    }
  });

  console.log('\n📨 Accepting invitation #5...');
  const { data, error } = await userSupabase.rpc('accept_home_invitation', {
    p_invitation_id: 5
  });

  if (error) {
    console.log('❌ Accept failed:', error.message);
    return;
  }

  console.log('✅ Invitation accepted!', data);

  // Check home_members
  const { data: members } = await adminClient
    .from('home_members')
    .select('id, home_id, user_id, role')
    .eq('home_id', 5);

  console.log('\n👥 Updated home members (home_id=5):');
  for (const member of members || []) {
    const { data: { user } } = await adminClient.auth.admin.getUserById(member.user_id);
    console.log(`   - ${user?.email} (${member.role})`);
  }

  console.log('\n=== Test Complete ===\n');
}

simulateAccept().catch(console.error);
