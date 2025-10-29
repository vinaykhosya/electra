// Comprehensive test script for all fixed endpoints
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const API_URL = 'http://localhost:3001/api';

// Test users
const PARENT_EMAIL = 'vinayroyale123@gmail.com';
const CHILD_EMAIL = 'vinaybal26@gmail.com';

let parentToken = '';
let childToken = '';

async function login(email) {
  console.log(`\n🔑 Logging in as ${email}...`);
  // Note: You'll need to get the user tokens manually
  // This is just a placeholder - implement proper auth flow
  return null;
}

async function testHomeInvitations() {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📨 TESTING HOME INVITATIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test sending invitation
  console.log('1. Sending invitation to child...');
  const sendResponse = await fetch(`${API_URL}/home-management/send-invitation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      home_id: 5,
      invitee_email: CHILD_EMAIL,
      role: 'member'
    })
  });
  
  const sendResult = await sendResponse.json();
  console.log('   Result:', sendResponse.status, sendResult);

  // Test duplicate invitation (should work now!)
  console.log('\n2. Sending duplicate invitation (should work now)...');
  const dupResponse = await fetch(`${API_URL}/home-management/send-invitation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      home_id: 5,
      invitee_email: CHILD_EMAIL,
      role: 'admin'
    })
  });
  
  const dupResult = await dupResponse.json();
  console.log('   Result:', dupResponse.status, dupResult);
}

async function testParentalControls() {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👨‍👧 TESTING PARENTAL CONTROLS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test inviting child
  console.log('1. Inviting child for parental control...');
  const inviteResponse = await fetch(`${API_URL}/parental-controls/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      child_email: CHILD_EMAIL
    })
  });
  
  const inviteResult = await inviteResponse.json();
  console.log('   Result:', inviteResponse.status, inviteResult);

  // Test getting invitations
  console.log('\n2. Getting pending invitations (as child)...');
  const invitationsResponse = await fetch(`${API_URL}/parental-controls/invitations`, {
    headers: {
      'Authorization': `Bearer ${childToken}`,
    }
  });
  
  const invitationsResult = await invitationsResponse.json();
  console.log('   Result:', invitationsResponse.status, invitationsResult);

  // Test accepting invitation
  console.log('\n3. Accepting invitation (as child)...');
  const acceptResponse = await fetch(`${API_URL}/parental-controls/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${childToken}`,
    },
    body: JSON.stringify({
      parent_id: 'a6e45981-1c89-428c-947e-d91248bd5fff' // Parent ID
    })
  });
  
  const acceptResult = await acceptResponse.json();
  console.log('   Result:', acceptResponse.status, acceptResult);

  // Test getting children
  console.log('\n4. Getting children list (as parent)...');
  const childrenResponse = await fetch(`${API_URL}/parental-controls/children`, {
    headers: {
      'Authorization': `Bearer ${parentToken}`,
    }
  });
  
  const childrenResult = await childrenResponse.json();
  console.log('   Result:', childrenResponse.status, childrenResult);
}

async function testPermissions() {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 TESTING PERMISSIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const childId = 'df14bb1a-af8d-406d-b8d1-0480e1f5b5ee';
  const applianceId = 1; // Replace with actual appliance ID

  // Test granting permission
  console.log('1. Granting appliance permission...');
  const grantResponse = await fetch(`${API_URL}/permissions/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      child_id: childId,
      appliance_id: applianceId
    })
  });
  
  const grantResult = await grantResponse.json();
  console.log('   Result:', grantResponse.status, grantResult);

  // Test listing permissions
  console.log('\n2. Listing child permissions...');
  const listResponse = await fetch(`${API_URL}/permissions/list/${childId}`, {
    headers: {
      'Authorization': `Bearer ${parentToken}`,
    }
  });
  
  const listResult = await listResponse.json();
  console.log('   Result:', listResponse.status, listResult);

  // Test revoking permission
  console.log('\n3. Revoking appliance permission...');
  const revokeResponse = await fetch(`${API_URL}/permissions/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      child_id: childId,
      appliance_id: applianceId
    })
  });
  
  const revokeResult = await revokeResponse.json();
  console.log('   Result:', revokeResponse.status, revokeResult);
}

async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║  COMPREHENSIVE ENDPOINT TESTING SUITE    ║');
  console.log('╚═══════════════════════════════════════════╝');

  console.log('\n⚠️  MANUAL SETUP REQUIRED:');
  console.log('   1. Make sure the server is running on http://localhost:3001');
  console.log('   2. Get auth tokens for both users:');
  console.log(`      - Parent: ${PARENT_EMAIL}`);
  console.log(`      - Child: ${CHILD_EMAIL}`);
  console.log('   3. Update the parentToken and childToken variables in this script');
  console.log('   4. Update the appliance_id in testPermissions function\n');

  if (!parentToken || !childToken) {
    console.log('❌ Auth tokens not set. Please update the script and run again.');
    return;
  }

  try {
    await testHomeInvitations();
    await testParentalControls();
    await testPermissions();

    console.log('\n\n╔═══════════════════════════════════════════╗');
    console.log('║          TEST SUITE COMPLETE             ║');
    console.log('╚═══════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Error running tests:', error);
  }
}

main();
