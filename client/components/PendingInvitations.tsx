import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Mail, Check, X } from 'lucide-react';

interface Invitation {
  id: number;
  home_id: number;
  home_name: string;
  inviter_email: string;
  role: string;
  status: string;
  invited_at: string;
  expires_at: string;
}

export function PendingInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const data = await api.get<{ success: boolean; invitations: Invitation[] }>(
        '/api/v2/invitations/my'
      );
      if (data.success) {
        setInvitations(data.invitations.filter(inv => inv.status === 'pending'));
      }
    } catch (error: any) {
      console.error('Failed to fetch invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: number) => {
    setProcessing(invitationId);
    try {
      const data = await api.put<{ success: boolean }>(
        `/api/v2/invitations/${invitationId}/accept`,
        {}
      );

      if (data.success) {
        toast({
          title: 'Invitation Accepted!',
          description: 'You have joined the home',
        });
        fetchInvitations();
        // Refresh the page to update home memberships
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (invitationId: number) => {
    setProcessing(invitationId);
    try {
      const data = await api.put<{ success: boolean }>(
        `/api/v2/invitations/${invitationId}/reject`,
        {}
      );

      if (data.success) {
        toast({
          title: 'Invitation Rejected',
          description: 'The invitation has been declined',
        });
        fetchInvitations();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return null;
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Pending Invitations ({invitations.length})
        </CardTitle>
        <CardDescription>
          You have been invited to join the following homes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-blue-50"
            >
              <div>
                <p className="font-medium">{invitation.home_name}</p>
                <p className="text-sm text-muted-foreground">
                  Invited by {invitation.inviter_email} as{' '}
                  <Badge variant="outline" className="ml-1">
                    {invitation.role}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(invitation.id)}
                  disabled={processing === invitation.id}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(invitation.id)}
                  disabled={processing === invitation.id}
                >
                  <X className="w-4 h-4 mr-1" />
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
