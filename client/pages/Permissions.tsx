import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "../lib/supabaseClient";

interface HomeMember {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  role: string;
}

interface Appliance {
    id: number;
    name: string;
    device_type?: string;
}

export function Permissions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedAppliance, setSelectedAppliance] = useState<string | null>(null);
  const [members, setMembers] = useState<HomeMember[]>([]);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Not authenticated", variant: "destructive" });
        return;
      }
      setCurrentUserId(user.id);

      // Get user's home
      const { data: homeMember, error: homeMemberError } = await supabase
        .from('home_members')
        .select('home_id, role')
        .eq('user_id', user.id)
        .single();

      if (homeMemberError || !homeMember) {
        toast({ title: "You must be a home member", variant: "destructive" });
        return;
      }

      // Check if user is owner or admin
      if (!['owner', 'admin'].includes(homeMember.role)) {
        toast({ title: "Only owners and admins can manage permissions", variant: "destructive" });
        return;
      }

      const homeId = homeMember.home_id;

      // Fetch home members via API (includes user details from backend)
      const response: any = await api.get(`/api/v2/homes/${homeId}/members`);
      const membersData = response.members || [];

      // Filter out current user and format for our state
      const membersWithDetails = membersData
        .filter((member: any) => member.user_id !== user.id)
        .map((member: any) => ({
          id: member.member_id.toString(),
          user_id: member.user_id,
          email: member.email || 'Unknown',
          full_name: member.email || 'Unknown User',
          role: member.role
        }));

      setMembers(membersWithDetails);

      // Fetch appliances
      const { data: appliancesData, error: appliancesError } = await supabase
        .from('appliances')
        .select('id, name, device_type')
        .eq('home_id', homeId);

      if (appliancesError) throw appliancesError;
      setAppliances(appliancesData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const grantPermissionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMember || !selectedAppliance) {
        throw new Error("Please select both a member and an appliance");
      }

      // Find the selected member's user_id
      const member = members.find(m => m.id === selectedMember);
      if (!member) {
        throw new Error("Member not found");
      }

      // Grant permission via Supabase directly
      const { data, error } = await supabase
        .from('appliance_permissions')
        .insert({
          home_member_id: parseInt(selectedMember),
          appliance_id: parseInt(selectedAppliance)
        })
        .select()
        .single();

      if (error) {
        // Check if permission already exists
        if (error.code === '23505') {
          throw new Error("Permission already exists");
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast({ title: "✅ Permission granted successfully!" });
      setSelectedMember(null);
      setSelectedAppliance(null);
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
    },
    onError: (error: any) => {
      console.error('Grant permission error:', error);
      toast({ 
        title: "❌ Error granting permission", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMember && selectedAppliance) {
        grantPermissionMutation.mutate();
    } else {
      toast({
        title: "Missing selection",
        description: "Please select both a member and an appliance",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Grant Permissions</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">No Home Members Found</h3>
          <p className="text-gray-700">
            You need to invite members to your home first before granting permissions.
          </p>
          <p className="text-gray-600 mt-2">
            Go to <strong>Home Settings → Members</strong> to invite members.
          </p>
        </div>
      </div>
    );
  }

  if (appliances.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Grant Permissions</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">No Appliances Found</h3>
          <p className="text-gray-700">
            You need to add appliances to your home first before granting permissions.
          </p>
          <p className="text-gray-600 mt-2">
            Go to <strong>Devices</strong> to add appliances.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Grant Permissions</h1>
        
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
          <p className="text-gray-600 mb-6">
            Grant appliance access to home members. Only owners and admins can manage permissions.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                  <label className="block text-sm font-medium mb-2">Home Member</label>
                  <Select value={selectedMember || undefined} onValueChange={setSelectedMember}>
                      <SelectTrigger>
                          <SelectValue placeholder="Select a member" />
                      </SelectTrigger>
                      <SelectContent>
                          {members.map(member => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.full_name} ({member.email}) - {member.role}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {members.length} member(s) available
                  </p>
              </div>

              <div>
                  <label className="block text-sm font-medium mb-2">Appliance</label>
                  <Select value={selectedAppliance || undefined} onValueChange={setSelectedAppliance}>
                      <SelectTrigger>
                          <SelectValue placeholder="Select an appliance" />
                      </SelectTrigger>
                      <SelectContent>
                          {appliances.map(appliance => (
                              <SelectItem key={appliance.id.toString()} value={appliance.id.toString()}>
                                {appliance.name} {appliance.device_type ? `(${appliance.device_type})` : ''}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {appliances.length} appliance(s) available
                  </p>
              </div>

              <Button 
                type="submit" 
                disabled={grantPermissionMutation.isPending || !selectedMember || !selectedAppliance}
                className="w-full"
              >
                {grantPermissionMutation.isPending ? "Granting..." : "Grant Permission"}
              </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-2">How it works:</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Select a home member who needs access</li>
              <li>Choose which appliance they can control</li>
              <li>Click "Grant Permission" to allow access</li>
              <li>Members can only control appliances they have permission for</li>
            </ul>
          </div>
        </div>
    </div>
  );
}
