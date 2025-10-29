import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Props {
  homeId: number;
  onInviteSent: () => void;
}

export function InviteByCode({ homeId, onInviteSent }: Props) {
  const { toast } = useToast();
  const [myInviteCode, setMyInviteCode] = useState<string>('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMyInviteCode();
  }, []);

  const fetchMyInviteCode = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ invite_code: string }>('/api/v2/user/invite-code');
      setMyInviteCode(data.invite_code);
    } catch (error: any) {
      console.error('Error fetching invite code:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your invite code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(myInviteCode);
      setCopied(true);
      toast({
        title: '✅ Copied!',
        description: 'Invite code copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy code',
        variant: 'destructive',
      });
    }
  };

  const handleSendInvite = async () => {
    if (!inviteCodeInput || inviteCodeInput.length !== 8) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a valid 8-character invite code',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const data = await api.post<{ success: boolean; invitation: any }>(
        '/api/v2/homes/invite',
        {
          home_id: homeId,
          invitee_email: inviteCodeInput.toUpperCase(), // Backend will handle code vs email
          role: role,
        }
      );

      if (data.success) {
        toast({
          title: '✅ Invitation Sent!',
          description: 'The user will receive an in-app notification',
        });
        setInviteCodeInput('');
        onInviteSent();
      }
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast({
        title: '❌ Error',
        description: error.response?.data?.error || 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* My Invite Code Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Your Invite Code
          </CardTitle>
          <CardDescription>
            Share this code with others so they can invite you to their homes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-gray-500">Loading...</div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
                <div className="text-3xl font-mono font-bold tracking-wider text-primary">
                  {myInviteCode || 'XXXXXXXX'}
                </div>
              </div>
              <Button
                onClick={handleCopyCode}
                variant="outline"
                size="lg"
                className="h-14"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-3">
            💡 This is your unique invite code. Anyone can use this to add you to their home.
          </p>
        </CardContent>
      </Card>

      {/* Invite Someone Card */}
      <Card>
        <CardHeader>
          <CardTitle>Invite Someone to This Home</CardTitle>
          <CardDescription>
            Enter their 8-character invite code to send them an invitation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="invite-code">Invite Code</Label>
            <Input
              id="invite-code"
              placeholder="ABCD1234"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
              maxLength={8}
              className="font-mono text-lg tracking-wider"
            />
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              <strong>Admin:</strong> Can manage devices, schedules, and view all members<br />
              <strong>Member:</strong> Can control assigned devices only
            </p>
          </div>

          <Button
            onClick={handleSendInvite}
            disabled={sending || !inviteCodeInput || inviteCodeInput.length !== 8}
            className="w-full"
          >
            {sending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-2">How It Works:</h4>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Share your invite code with others so they can add you</li>
            <li>To invite someone, ask them for their invite code</li>
            <li>Enter their code and select their role</li>
            <li>They'll get an in-app notification to accept/reject</li>
            <li>No emails needed - everything happens in the app!</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
