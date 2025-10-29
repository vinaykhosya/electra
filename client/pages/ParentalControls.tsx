import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { InviteChildForm } from "../components/InviteChildForm";
import { MyChildren } from "../components/MyChildren";
import { Invitations } from "../components/Invitations";
import { ManagePermissions } from "../components/ManagePermissions";
import { supabase } from '../lib/supabaseClient';

interface Child {
  id: string;
  full_name: string;
  email: string;
}

interface Invitation {
  parent_id: string;
  parent_name: string;
  parent_email: string;
}

export function ParentalControls() {
  const [children, setChildren] = useState<Child[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    // Get parental control relationships
    const { data: pcData, error: pcError } = await supabase
      .from('parental_controls')
      .select('child_id')
      .eq('parent_id', user.id)
      .eq('status', 'accepted');
    
    if (pcError) throw pcError;
    if (!pcData || pcData.length === 0) return [];

    // Get child details from auth
    const children = await Promise.all(
      pcData.map(async (pc) => {
        const { data: userData } = await supabase.auth.admin.getUserById(pc.child_id);
        return {
          id: pc.child_id,
          email: userData?.user?.email || 'Unknown',
          full_name: userData?.user?.user_metadata?.full_name || userData?.user?.email || 'Unknown User',
        };
      })
    );
    
    return children;
  }, []);

  const fetchInvitations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    // Get pending invitations
    const { data: pcData, error: pcError } = await supabase
      .from('parental_controls')
      .select('parent_id')
      .eq('child_id', user.id)
      .eq('status', 'pending');
    
    if (pcError) throw pcError;
    if (!pcData || pcData.length === 0) return [];

    // Get parent details from auth
    const invitations = await Promise.all(
      pcData.map(async (pc) => {
        const { data: userData } = await supabase.auth.admin.getUserById(pc.parent_id);
        return {
          parent_id: pc.parent_id,
          parent_email: userData?.user?.email || 'Unknown',
          parent_name: userData?.user?.user_metadata?.full_name || userData?.user?.email || 'Unknown Parent',
        };
      })
    );
    
    return invitations;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [childrenData, invitationsData] = await Promise.all([
        fetchChildren(),
        fetchInvitations(),
      ]);
      setChildren(childrenData);
      setInvitations(invitationsData);
    } catch (err: any) {
      console.error('Error fetching parental controls data:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchChildren, fetchInvitations]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <p>Loading parental controls...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Parental Controls</h1>
      <Tabs defaultValue="my-children">
        <TabsList>
          <TabsTrigger value="my-children">My Children</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="manage-permissions">Manage Permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="my-children">
          <div className="mt-6">
            <h2 className="text-2xl font-semibold mb-4">Invite a Child</h2>
            <InviteChildForm onInvitationSent={fetchData} />
          </div>
          <div className="mt-10">
            <h2 className="text-2xl font-semibold mb-4">Your Children</h2>
            <MyChildren children={children} onChildRemoved={fetchData} />
          </div>
        </TabsContent>
        <TabsContent value="invitations">
            <div className="mt-10">
                <h2 className="text-2xl font-semibold mb-4">Pending Invitations</h2>
                <Invitations invitations={invitations} onInvitationAction={fetchData} />
            </div>
        </TabsContent>
        <TabsContent value="manage-permissions">
            <div className="mt-10">
                <h2 className="text-2xl font-semibold mb-4">Manage Child Permissions</h2>
                <ManagePermissions />
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
