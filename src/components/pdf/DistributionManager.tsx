import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Mail, Plus, Trash2 } from 'lucide-react';

interface DistributionProfile {
  id: string;
  name: string;
  description?: string;
  audience_type: string;
  include_sensitive_sections: boolean;
  redact_financial: boolean;
  redact_hr: boolean;
  redact_legal: boolean;
}

export function DistributionManager() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<DistributionProfile[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [newProfile, setNewProfile] = useState({
    name: '',
    description: '',
    audience_type: 'exec_team',
    include_sensitive_sections: false,
    redact_financial: false,
    redact_hr: false,
    redact_legal: false,
  });
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProfiles();
    fetchUsers();
  }, []);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('distribution_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProfiles(data);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email');

    if (!error && data) {
      setUsers(data);
    }
  };

  const handleCreateProfile = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!newProfile.name) {
        toast({ title: 'Error', description: 'Profile name is required', variant: 'destructive' });
        return;
      }

      // Create profile
      const { data: profile, error: profileError } = await supabase
        .from('distribution_profiles')
        .insert({
          ...newProfile,
          created_by: user.id,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Add recipients
      if (selectedRecipients.length > 0) {
        const { error: recipError } = await supabase
          .from('distribution_recipients')
          .insert(
            selectedRecipients.map(userId => ({
              profile_id: profile.id,
              user_id: userId,
            }))
          );

        if (recipError) throw recipError;
      }

      toast({ title: 'Success', description: 'Distribution profile created' });
      fetchProfiles();
      setNewProfile({
        name: '',
        description: '',
        audience_type: 'exec_team',
        include_sensitive_sections: false,
        redact_financial: false,
        redact_hr: false,
        redact_legal: false,
      });
      setSelectedRecipients([]);
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const audienceTypeLabels = {
    exec_team: 'Executive Team',
    council_chairs: 'Council Chairs',
    project_owners: 'Project Owners',
    board: 'Board Members',
    custom: 'Custom',
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Distribution Profiles</h3>
      </div>

      {/* Existing Profiles */}
      {profiles.length > 0 && (
        <div className="mb-6 space-y-3">
          <h4 className="font-semibold text-sm">Existing Profiles</h4>
          {profiles.map((profile) => (
            <Card key={profile.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{profile.name}</div>
                  {profile.description && (
                    <div className="text-sm text-muted-foreground mt-1">{profile.description}</div>
                  )}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary">
                      {audienceTypeLabels[profile.audience_type as keyof typeof audienceTypeLabels]}
                    </Badge>
                    {profile.include_sensitive_sections && (
                      <Badge variant="outline">Includes Sensitive</Badge>
                    )}
                    {profile.redact_financial && <Badge variant="outline">Redact Financial</Badge>}
                    {profile.redact_hr && <Badge variant="outline">Redact HR</Badge>}
                    {profile.redact_legal && <Badge variant="outline">Redact Legal</Badge>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create New Profile */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-semibold text-sm">Create New Profile</h4>

        <div className="space-y-2">
          <Label>Profile Name *</Label>
          <Input
            value={newProfile.name}
            onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
            placeholder="Executive Distribution"
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            value={newProfile.description}
            onChange={(e) => setNewProfile({ ...newProfile, description: e.target.value })}
            placeholder="For executive team review"
          />
        </div>

        <div className="space-y-2">
          <Label>Audience Type</Label>
          <Select
            value={newProfile.audience_type}
            onValueChange={(value) => setNewProfile({ ...newProfile, audience_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exec_team">Executive Team</SelectItem>
              <SelectItem value="council_chairs">Council Chairs</SelectItem>
              <SelectItem value="project_owners">Project Owners</SelectItem>
              <SelectItem value="board">Board Members</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Content Filters</Label>
          <div className="flex items-center justify-between">
            <Label>Include Sensitive Sections</Label>
            <Switch
              checked={newProfile.include_sensitive_sections}
              onCheckedChange={(checked) =>
                setNewProfile({ ...newProfile, include_sensitive_sections: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Redact Financial Information</Label>
            <Switch
              checked={newProfile.redact_financial}
              onCheckedChange={(checked) => setNewProfile({ ...newProfile, redact_financial: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Redact HR Information</Label>
            <Switch
              checked={newProfile.redact_hr}
              onCheckedChange={(checked) => setNewProfile({ ...newProfile, redact_hr: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Redact Legal Information</Label>
            <Switch
              checked={newProfile.redact_legal}
              onCheckedChange={(checked) => setNewProfile({ ...newProfile, redact_legal: checked })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Recipients</Label>
          <Select
            value=""
            onValueChange={(userId) => {
              if (!selectedRecipients.includes(userId)) {
                setSelectedRecipients([...selectedRecipients, userId]);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Add recipients" />
            </SelectTrigger>
            <SelectContent>
              {users
                .filter(u => !selectedRecipients.includes(u.id))
                .map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {selectedRecipients.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {selectedRecipients.map(userId => {
                const user = users.find(u => u.id === userId);
                return (
                  <Badge key={userId} variant="secondary" className="gap-2">
                    {user?.full_name || user?.email}
                    <button
                      onClick={() => setSelectedRecipients(selectedRecipients.filter(id => id !== userId))}
                      className="hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        <Button onClick={handleCreateProfile} disabled={isLoading} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          {isLoading ? 'Creating...' : 'Create Profile'}
        </Button>
      </div>
    </Card>
  );
}
