import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/use-toast";
import { api } from "../lib/api";

export function InviteChildForm({ onInvitationSent }: { onInvitationSent: () => void }) {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/parental-controls/invite", { child_email: email });
      toast({ title: "Invitation sent!" });
      setEmail("");
      onInvitationSent();
    } catch (error) {
      toast({ title: "Error sending invitation", description: "Please try again later." });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="email"
        placeholder="Child's email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit">Send Invitation</Button>
    </form>
  );
}
