import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { usePrimaryHome } from '@/hooks/usePrimaryHome';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Mail, UserPlus, Shield, Trash2, Crown, User, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InviteByCode } from '@/components/InviteByCode';

interface HomeMember {
  member_id: number;
  user_id: string;
  email: string;
  role: string;
  joined_at: string;
  device_permissions_count: number;
}

interface Invitation {
  id: number;
  invitee_email: string;
  role: string;
  status: string;
  invited_at: string;
  expires_at: string;
}

interface MyInvitation {
  id: number;
  home: { id: number; name: string };
  inviter: { email: string };
  role: string;
  invited_at: string;
}

export default function HomeSettings() {
  const primaryHomeQuery = usePrimaryHome();
  const primaryHome = primaryHomeQuery.data?.homeId;
  const { toast } = useToast();
  
  const [members, setMembers] = useState<HomeMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [myInvitations, setMyInvitations] = useState<MyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  
  // Security PIN
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [hasCustomPin, setHasCustomPin] = useState(false);
  
  // Delete confirmation
  const [memberToRemove, setMemberToRemove] = useState<HomeMember | null>(null);

  useEffect(() => {
    if (primaryHome) {
      fetchMembers();
      fetchInvitations();
      fetchMyInvitations();
      checkSecurityStatus();
    }
  }, [primaryHome]);

  const fetchMembers = async () => {
    try {
      const data = await api.get<{ success: boolean; members: HomeMember[] }>(
        `/api/v2/homes/${primaryHome}/members`
      );
      if (data.success) {
        setMembers(data.members);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const data = await api.get<{ success: boolean; invitations: Invitation[] }>(
        `/api/v2/homes/${primaryHome}/invitations`
      );
      if (data.success) {
        setInvitations(data.invitations.filter(inv => inv.status === 'pending'));
      }
    } catch (error: any) {
      console.error('Failed to fetch invitations:', error);
    }
  };

  const fetchMyInvitations = async () => {
    try {
      const data = await api.get<{ success: boolean; invitations: MyInvitation[] }>(
        `/api/v2/invitations/my`
      );
      if (data.success) {
        setMyInvitations(data.invitations);
      }
    } catch (error: any) {
      console.error('Failed to fetch my invitations:', error);
    }
  };

  const checkSecurityStatus = async () => {
    try {
      const data = await api.get<{ success: boolean; has_custom_pin: boolean }>(
        `/api/v2/homes/${primaryHome}/security`
      );
      if (data.success) {
        setHasCustomPin(data.has_custom_pin);
      }
    } catch (error: any) {
      console.error('Failed to check security status:', error);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteRole) {
      toast({
        title: 'Error',
        description: 'Please enter email and select role',
        variant: 'destructive',
      });
      return;
    }

    setInviting(true);
    try {
      const data = await api.post<{ success: boolean; invitation: any }>(
        '/api/v2/homes/invite',
        {
          home_id: primaryHome,
          invitee_email: inviteEmail,
          role: inviteRole,
        }
      );

      if (data.success) {
        toast({
          title: 'Invitation Sent!',
          description: `Invitation sent to ${inviteEmail}`,
        });
        setInviteEmail('');
        fetchInvitations();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      const data = await api.delete<{ success: boolean }>(
        `/api/v2/members/${memberToRemove.member_id}`
      );

      if (data.success) {
        toast({
          title: 'Member Removed',
          description: `${memberToRemove.email} has been removed`,
        });
        fetchMembers();
        setMemberToRemove(null);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateRole = async (memberId: number, newRole: string) => {
    try {
      const data = await api.put<{ success: boolean }>('/api/v2/members/role', {
        member_id: memberId,
        role: newRole,
      });

      if (data.success) {
        toast({
          title: 'Role Updated',
          description: `Member role changed to ${newRole}`,
        });
        fetchMembers();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdatePin = async () => {
    if (newPin !== confirmPin) {
      toast({
        title: 'Error',
        description: 'PINs do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast({
        title: 'Error',
        description: 'PIN must be exactly 4 digits',
        variant: 'destructive',
      });
      return;
    }

    try {
      const data = await api.put<{ success: boolean }>('/api/v2/homes/security-pin', {
        home_id: primaryHome,
        old_pin: oldPin || '0000',
        new_pin: newPin,
      });

      if (data.success) {
        toast({
          title: 'PIN Updated',
          description: 'Your security PIN has been updated',
        });
        setShowPinDialog(false);
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
        checkSecurityStatus();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'member':
        return <User className="w-4 h-4 text-green-500" />;
      default:
        return <UserCheck className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'member':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Home Settings</h1>
        <p className="text-muted-foreground">Manage members, invitations, and security</p>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* MEMBERS TAB */}
        <TabsContent value="members" className="space-y-4">
            {/* Invite by Code Component */}
            <InviteByCode 
              homeId={primaryHome!} 
              onInviteSent={() => {
                fetchMembers();
                fetchInvitations();
              }}
            />

          <Card>
            <CardHeader>
              <CardTitle>Home Members ({members.length})</CardTitle>
              <CardDescription>
                Manage who has access to your home
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.member_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getRoleIcon(member.role)}
                      <div>
                        <p className="font-medium">{member.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.device_permissions_count} device permissions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role !== 'owner' ? (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              handleUpdateRole(member.member_id, value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="guest">Guest</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setMemberToRemove(member)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Badge className={getRoleBadgeColor(member.role)}>
                          Owner
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVITATIONS TAB */}
        <TabsContent value="invitations" className="space-y-4">
          {/* My Invitations (to accept) */}
          <Card>
            <CardHeader>
              <CardTitle>My Invitations ({myInvitations.length})</CardTitle>
              <CardDescription>
                Invitations you've received — accept to join the home
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myInvitations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No invitations for you
                </p>
              ) : (
                <div className="space-y-3">
                  {myInvitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{inv.home.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Invited as {inv.role} • {new Date(inv.invited_at).toLocaleString()} • by {inv.inviter.email}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await api.put(`/api/v2/invitations/${inv.id}/accept`, {});
                              toast({ title: 'Joined home successfully' });
                              fetchMembers();
                              fetchInvitations();
                              fetchMyInvitations();
                            } catch (err: any) {
                              toast({ title: 'Error', description: err.message, variant: 'destructive' });
                            }
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            try {
                              await api.put(`/api/v2/invitations/${inv.id}/reject`, {});
                              toast({ title: 'Invitation declined' });
                              fetchMyInvitations();
                              fetchInvitations();
                            } catch (err: any) {
                              toast({ title: 'Error', description: err.message, variant: 'destructive' });
                            }
                          }}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invitations for this home (sent by you/others) */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations ({invitations.length})</CardTitle>
              <CardDescription>
                Invitations waiting to be accepted
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No pending invitations
                </p>
              ) : (
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{invitation.invitee_email}</p>
                          <p className="text-sm text-muted-foreground">
                            Invited as {invitation.role} •{' '}
                            {new Date(invitation.invited_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={getRoleBadgeColor(invitation.role)}>
                        {invitation.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security PIN</CardTitle>
              <CardDescription>
                Set a 4-digit PIN to protect sensitive actions like device deletion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Current PIN Status</p>
                    <p className="text-sm text-muted-foreground">
                      {hasCustomPin
                        ? 'Custom PIN is set'
                        : 'Using default PIN (0000)'}
                    </p>
                  </div>
                  <Button onClick={() => setShowPinDialog(true)}>
                    <Shield className="w-4 h-4 mr-2" />
                    {hasCustomPin ? 'Change PIN' : 'Set PIN'}
                  </Button>
                </div>
                {!hasCustomPin && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Warning: You're using the default PIN (0000). Please set a
                      custom PIN for better security.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Remove Member Confirmation */}
      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={() => setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.email} from your home?
              They will lose access to all devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change PIN Dialog */}
      <AlertDialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasCustomPin ? 'Change Security PIN' : 'Set Security PIN'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Enter a 4-digit PIN to protect sensitive actions
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            {hasCustomPin && (
              <div>
                <Label htmlFor="old-pin">Current PIN</Label>
                <Input
                  id="old-pin"
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label htmlFor="new-pin">New PIN</Label>
              <Input
                id="new-pin"
                type="password"
                maxLength={4}
                placeholder="••••"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirm-pin">Confirm PIN</Label>
              <Input
                id="confirm-pin"
                type="password"
                maxLength={4}
                placeholder="••••"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setOldPin('');
              setNewPin('');
              setConfirmPin('');
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdatePin}>
              Update PIN
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
