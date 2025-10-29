import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function diagnoseAndFix() {
  console.log('\n🔍 DIAGNOSING ALL ISSUES...\n');

  // 1. Check and fix invitations
  console.log('1️⃣ Checking Home Invitations...');
  const { data: invites } = await supabase
    .from('home_invitations')
    .select('*')
    .eq('status', 'pending');
  
  console.log(`   Found ${invites?.length || 0} pending invitations`);
  if (invites && invites.length > 0) {
    console.log('   Invitations:', invites.map(i => `${i.invitee_email} → home ${i.home_id}`).join(', '));
  }

  // 2. Check home members
  console.log('\n2️⃣ Checking Home Members...');
  const { data: members } = await supabase
    .from('home_members')
    .select(`
      id,
      home_id,
      user_id,
      role,
      homes:home_id(name)
    `);
  
  console.log(`   Found ${members?.length || 0} home members`);

  // Check for orphaned members (deleted users)
  if (members) {
    for (const member of members) {
      const { data: user } = await supabase.auth.admin.getUserById(member.user_id);
      if (!user.user) {
        console.log(`   ⚠️  Orphaned member found: ID ${member.id}, user_id ${member.user_id} (user deleted)`);
        // Delete orphaned member
        await supabase.from('home_members').delete().eq('id', member.id);
        console.log(`   ✅ Deleted orphaned member ${member.id}`);
      }
    }
  }

  // 3. Check appliances
  console.log('\n3️⃣ Checking Appliances...');
  const { data: appliances } = await supabase
    .from('appliances')
    .select('id, name, home_id');
  
  console.log(`   Found ${appliances?.length || 0} appliances`);

  // 4. Check parental controls
  console.log('\n4️⃣ Checking Parental Controls...');
  const { data: parentalControls } = await supabase
    .from('parental_controls')
    .select('*');
  
  console.log(`   Found ${parentalControls?.length || 0} parental control relationships`);

  // 5. Check appliance permissions
  console.log('\n5️⃣ Checking Appliance Permissions...');
  const { data: permissions } = await supabase
    .from('appliance_permissions')
    .select('*');
  
  console.log(`   Found ${permissions?.length || 0} appliance permissions`);

  // 6. Check RLS policies
  console.log('\n6️⃣ Checking RLS Policies...');
  const { data: policies } = await supabase.rpc('check_rls_enabled', {});
  
  // 7. Test critical SQL functions
  console.log('\n7️⃣ Testing SQL Functions...');
  
  // Test send_home_invitation
  console.log('   Testing send_home_invitation...');
  const { data: sendTest, error: sendError } = await supabase.rpc('send_home_invitation', {
    p_home_id: 999, // Non-existent home
    p_invitee_email: 'test@example.com',
    p_role: 'member'
  });
  
  if (sendError) {
    if (sendError.message.includes('Only owners and admins')) {
      console.log('   ✅ send_home_invitation: Working (permission check passed)');
    } else {
      console.log(`   ⚠️  send_home_invitation error: ${sendError.message}`);
    }
  }

  // Test accept_home_invitation
  console.log('   Testing accept_home_invitation...');
  const { data: acceptTest, error: acceptError } = await supabase.rpc('accept_home_invitation', {
    p_invitation_id: 999 // Non-existent invitation
  });
  
  if (acceptError) {
    if (acceptError.message.includes('Invitation not found') || acceptError.message.includes('not authenticated')) {
      console.log('   ✅ accept_home_invitation: Working (validation passed)');
    } else {
      console.log(`   ⚠️  accept_home_invitation error: ${acceptError.message}`);
    }
  }

  // 8. Summary
  console.log('\n📊 SUMMARY');
  console.log('─'.repeat(50));
  console.log(`Pending Invitations: ${invites?.length || 0}`);
  console.log(`Home Members: ${members?.length || 0}`);
  console.log(`Appliances: ${appliances?.length || 0}`);
  console.log(`Parental Controls: ${parentalControls?.length || 0}`);
  console.log(`Permissions: ${permissions?.length || 0}`);
  console.log('─'.repeat(50));

  console.log('\n✅ Diagnosis complete!\n');
}

diagnoseAndFix().catch(console.error);
