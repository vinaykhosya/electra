import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";

interface Child {
  id: string;
  full_name: string;
  email: string;
}

export function MyChildren({ children, onChildRemoved }: { children: Child[]; onChildRemoved: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const removeChildMutation = useMutation({
    mutationFn: (childId: string) => api.delete(`/parental-controls/children/${childId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
      toast({ title: "Child removed" });
      onChildRemoved();
    },
    onError: () => {
        toast({ title: "Error removing child" });
    }
  });

  if (!children || children.length === 0) {
    return <p>No children found.</p>;
  }

  return (
    <div>
      {children.map((child) => (
        <div key={child.id} className="flex items-center justify-between p-2 border-b">
          <div>
            <p className="font-semibold">{child.full_name}</p>
            <p className="text-sm text-gray-500">{child.email}</p>
          </div>
          <Button variant="destructive" onClick={() => removeChildMutation.mutate(child.id)}>
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}
