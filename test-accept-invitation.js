// Test script to verify invitation acceptance
// Run with: node test-accept-invitation.cjs

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testAcceptInvitation() {
  console.log('\n=== Testing Invitation Accept Flow ===\n');

  // Step 1: Check pending invitations
  const adminClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: invitations } = await adminClient
    .from('home_invitations')
    .select('*')
    .eq('status', 'pending')
    .order('invited_at', { ascending: false });

  console.log('📋 Pending invitations:', JSON.stringify(invitations, null, 2));

  if (!invitations || invitations.length === 0) {
    console.log('\n❌ No pending invitations found');
    return;
  }

  // Step 2: Check if users exist for these invitations
  for (const inv of invitations) {
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    const user = users.find(u => u.email === inv.invitee_email);
    
    console.log(`\n📧 Invitation ${inv.id} for ${inv.invitee_email}:`);
    console.log(`   Home: ${inv.home_id}, Role: ${inv.role}`);
    console.log(`   User exists: ${user ? '✅ Yes (id: ' + user.id + ')' : '❌ No'}`);
    
    if (user && user.email_confirmed_at) {
      console.log(`   Email confirmed: ✅ ${user.email_confirmed_at}`);
      console.log(`\n   To test accept: Log in as ${user.email} and click Accept in the app`);
    } else if (user) {
      console.log(`   Email confirmed: ❌ Not confirmed yet`);
      console.log(`   User needs to confirm email before accepting invite`);
    }
  }

  // Step 3: Check current home members
  const { data: members } = await adminClient
    .from('home_members')
    .select('id, home_id, user_id, role')
    .eq('home_id', 5);

  console.log('\n👥 Current home members (home_id=5):');
  for (const member of members || []) {
    const { data: { user } } = await adminClient.auth.admin.getUserById(member.user_id);
    console.log(`   - ${user?.email} (${member.role})`);
  }

  console.log('\n=== Test Complete ===\n');
}

testAcceptInvitation().catch(console.error);
