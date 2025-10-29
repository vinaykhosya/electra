import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";

interface Invitation {
  parent_id: string;
  parent_name: string;
  parent_email: string;
}

export function Invitations({ invitations, onInvitationAction }: { invitations: Invitation[]; onInvitationAction: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const acceptInvitationMutation = useMutation({
    mutationFn: (parentId: string) => api.post(`/parental-controls/accept`, { parent_id: parentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast({ title: "Invitation accepted" });
      onInvitationAction();
    },
    onError: () => {
        toast({ title: "Error accepting invitation" });
    }
  });

  const declineInvitationMutation = useMutation({
    mutationFn: (parentId: string) => api.post(`/parental-controls/decline`, { parent_id: parentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast({ title: "Invitation declined" });
      onInvitationAction();
    },
    onError: () => {
        toast({ title: "Error declining invitation" });
    }
  });

  if (!invitations || invitations.length === 0) {
    return <p>No pending invitations.</p>;
  }

  return (
    <div>
      {invitations.map((invitation) => (
        <div key={invitation.parent_id} className="flex items-center justify-between p-2 border-b">
          <div>
            <p className="font-semibold">{invitation.parent_name}</p>
            <p className="text-sm text-gray-500">{invitation.parent_email}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => acceptInvitationMutation.mutate(invitation.parent_id)}>
              Accept
            </Button>
            <Button variant="destructive" onClick={() => declineInvitationMutation.mutate(invitation.parent_id)}>
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
