import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

interface Child {
  id: string;
  full_name: string;
  email: string;
}

interface Appliance {
  id: number;
  name: string;
}

interface Permission {
  appliance_id: number;
  can_view: boolean;
  can_control: boolean;
  can_schedule: boolean;
}

interface ChildPermissions {
  child: Child;
  appliances: (Appliance & Permission)[];
}

export function ManagePermissions() {
  const [children, setChildren] = useState<Child[]>([]);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [childPermissions, setChildPermissions] = useState<ChildPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      // Fetch children
      const { data: childrenData, error: childrenError } = await supabase
        .from('parental_controls')
        .select('child_id, children:child_id(id, full_name, email)')
        .eq('parent_id', user.id)
        .eq('status', 'accepted');

      if (childrenError) throw childrenError;
      const fetchedChildren: Child[] = childrenData.map((pc: any) => pc.children);
      setChildren(fetchedChildren);

      // Fetch appliances owned by the parent's home
      const { data: homeMember, error: homeMemberError } = await supabase
        .from('home_members')
        .select('home_id')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (homeMemberError || !homeMember) {
        setError('Admin home not found.');
        setLoading(false);
        return;
      }

      const { data: appliancesData, error: appliancesError } = await supabase
        .from('appliances')
        .select('id, name')
        .eq('home_id', homeMember.home_id);

      if (appliancesError) throw appliancesError;
      setAppliances(appliancesData);

      // Fetch existing permissions for each child and appliance
      const allChildPermissions: ChildPermissions[] = await Promise.all(
        fetchedChildren.map(async (child) => {
          const { data: childHomeMember, error: childHomeMemberError } = await supabase
            .from('home_members')
            .select('id')
            .eq('user_id', child.id)
            .eq('home_id', homeMember.home_id)
            .limit(1)
            .single();

          if (childHomeMemberError || !childHomeMember) {
            console.warn(`Child ${child.full_name} is not a member of the parent's home.`);
            return { child, appliances: [] };
          }

          const { data: permissionsData, error: permissionsError } = await supabase
            .from('appliance_permissions')
            .select('appliance_id, can_view, can_control, can_schedule')
            .eq('home_member_id', childHomeMember.id);

          if (permissionsError) throw permissionsError;

          const appliancesWithPermissions = appliancesData.map(appliance => {
            const existingPermission = permissionsData.find(p => p.appliance_id === appliance.id);
            return {
              ...appliance,
              appliance_id: appliance.id,
              can_view: existingPermission?.can_view || false,
              can_control: existingPermission?.can_control || false,
              can_schedule: existingPermission?.can_schedule || false,
            };
          });

          return { child, appliances: appliancesWithPermissions };
        })
      );
      setChildPermissions(allChildPermissions);

    } catch (err: any) {
      console.error('Error fetching permissions data:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = async (
    childId: string,
    applianceId: number,
    permissionType: 'can_view' | 'can_control' | 'can_schedule',
    value: boolean
  ) => {
    setChildPermissions(prev =>
      prev.map(cp =>
        cp.child.id === childId
          ? {
              ...cp,
              appliances: cp.appliances.map(app =>
                app.id === applianceId ? { ...app, [permissionType]: value } : app
              ),
            }
          : cp
      )
    );

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: childHomeMember, error: childHomeMemberError } = await supabase
        .from('home_members')
        .select('id')
        .eq('user_id', childId)
        .limit(1)
        .single();

      if (childHomeMemberError || !childHomeMember) throw new Error('Child is not a home member.');

      const { data: existingPermission, error: fetchPermissionError } = await supabase
        .from('appliance_permissions')
        .select('id')
        .eq('home_member_id', childHomeMember.id)
        .eq('appliance_id', applianceId)
        .limit(1)
        .single();

      if (fetchPermissionError && fetchPermissionError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw fetchPermissionError;
      }

      const permissionUpdate = { [permissionType]: value };

      if (existingPermission) {
        // Update existing permission
        const { error } = await supabase
          .from('appliance_permissions')
          .update(permissionUpdate)
          .eq('id', existingPermission.id);
        if (error) throw error;
      } else {
        // Insert new permission
        const { error } = await supabase
          .from('appliance_permissions')
          .insert({
            home_member_id: childHomeMember.id,
            appliance_id: applianceId,
            can_view: permissionType === 'can_view' ? value : false,
            can_control: permissionType === 'can_control' ? value : false,
            can_schedule: permissionType === 'can_schedule' ? value : false,
          });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Error updating permission:', err.message);
      setError(err.message);
      // Revert UI on error
      setChildPermissions(prev =>
        prev.map(cp =>
          cp.child.id === childId
            ? {
                ...cp,
                appliances: cp.appliances.map(app =>
                  app.id === applianceId ? { ...app, [permissionType]: !value } : app
                ),
              }
            : cp
        )
      );
    }
  };

  if (loading) return <p>Loading permissions...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div className="space-y-8">
      {childPermissions.length === 0 && <p>No children found or no appliances in your home to manage permissions for.</p>}
      {childPermissions.map(cp => (
        <Card key={cp.child.id}>
          <CardHeader>
            <CardTitle>{cp.child.full_name || cp.child.email}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cp.appliances.length === 0 && <p>No appliances to manage for this child.</p>}
            {cp.appliances.map(appliance => (
              <div key={appliance.id} className="flex items-center justify-between p-2 border rounded-md">
                <p className="font-medium">{appliance.name}</p>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`view-${cp.child.id}-${appliance.id}`}
                      checked={appliance.can_view}
                      onCheckedChange={(checked) => handlePermissionChange(cp.child.id, appliance.id, 'can_view', checked)}
                    />
                    <Label htmlFor={`view-${cp.child.id}-${appliance.id}`}>Can View</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`control-${cp.child.id}-${appliance.id}`}
                      checked={appliance.can_control}
                      onCheckedChange={(checked) => handlePermissionChange(cp.child.id, appliance.id, 'can_control', checked)}
                    />
                    <Label htmlFor={`control-${cp.child.id}-${appliance.id}`}>Can Control</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`schedule-${cp.child.id}-${appliance.id}`}
                      checked={appliance.can_schedule}
                      onCheckedChange={(checked) => handlePermissionChange(cp.child.id, appliance.id, 'can_schedule', checked)}
                    />
                    <Label htmlFor={`schedule-${cp.child.id}-${appliance.id}`}>Can Schedule</Label>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}