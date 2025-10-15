import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserCog, Shield } from 'lucide-react';

export function EscalationSettings() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [chiefOfStaff, setChiefOfStaff] = useState<string>('');
  const [ceo, setCeo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (profiles) {
        setUsers(profiles);
      }

      // Fetch escalation config
      const { data: config } = await supabase
        .from('escalation_config')
        .select('*');

      const cosConfig = config?.find(c => c.role_type === 'chief_of_staff');
      const ceoConfig = config?.find(c => c.role_type === 'ceo');

      if (cosConfig) setChiefOfStaff(cosConfig.user_id);
      if (ceoConfig) setCeo(ceoConfig.user_id);
    } catch (error) {
      console.error('Error fetching escalation settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load escalation settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update Chief of Staff
      if (chiefOfStaff) {
        await supabase
          .from('escalation_config')
          .upsert({
            role_type: 'chief_of_staff',
            user_id: chiefOfStaff,
          });
      }

      // Update CEO
      if (ceo) {
        await supabase
          .from('escalation_config')
          .upsert({
            role_type: 'ceo',
            user_id: ceo,
          });
      }

      toast({
        title: 'Success',
        description: 'Escalation settings saved',
      });
    } catch (error) {
      console.error('Error saving escalation settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save escalation settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escalation Configuration</CardTitle>
        <CardDescription>
          Configure who receives escalated action items when deadlines are at risk
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium">Chief of Staff</label>
            </div>
            <Select value={chiefOfStaff} onValueChange={setChiefOfStaff}>
              <SelectTrigger>
                <SelectValue placeholder="Select Chief of Staff" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Receives escalations when actions are blocked or due within 1 day
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium">CEO</label>
            </div>
            <Select value={ceo} onValueChange={setCeo}>
              <SelectTrigger>
                <SelectValue placeholder="Select CEO" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Receives final escalations for overdue actions and weekly progress reports
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Escalation Workflow</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="font-semibold min-w-[80px]">Level 1:</span>
              <span>Action is blocked OR due within 1 day → Chief of Staff</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold min-w-[80px]">Level 2:</span>
              <span>Action is overdue AND already at Level 1 → CEO</span>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Escalation Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
