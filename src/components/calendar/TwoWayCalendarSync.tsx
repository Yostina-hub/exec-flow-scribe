import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const TwoWayCalendarSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  useEffect(() => {
    loadSyncSettings();
  }, []);

  const loadSyncSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', `calendar_sync_${user.id}`)
        .single();

      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        const syncData = data.value as { autoSync?: boolean; lastSync?: string };
        setIsAutoSyncEnabled(syncData.autoSync || false);
        setLastSync(syncData.lastSync ? new Date(syncData.lastSync) : null);
      }
    } catch (error) {
      console.error('Error loading sync settings:', error);
    }
  };

  const saveSyncSettings = async (autoSync: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: `calendar_sync_${user.id}`,
          value: {
            autoSync,
            lastSync: lastSync?.toISOString()
          }
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving sync settings:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'twoWaySync' }
      });

      if (error) throw error;

      setLastSync(new Date());
      setSyncStatus('success');
      
      toast({
        title: "Calendar Synced",
        description: `Synced ${data.importedCount} events from Google Calendar and exported ${data.exportedCount} meetings.`,
      });

      // Update last sync time
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('system_settings')
          .upsert({
            key: `calendar_sync_${user.id}`,
            value: {
              autoSync: isAutoSyncEnabled,
              lastSync: new Date().toISOString()
            }
          });
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync calendar",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAutoSyncToggle = async (enabled: boolean) => {
    setIsAutoSyncEnabled(enabled);
    await saveSyncSettings(enabled);
    
    toast({
      title: enabled ? "Auto-Sync Enabled" : "Auto-Sync Disabled",
      description: enabled 
        ? "Your calendar will sync automatically every hour" 
        : "Manual sync only",
    });
  };

  const formatLastSync = () => {
    if (!lastSync) return "Never synced";
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Two-Way Calendar Sync
            </CardTitle>
            <CardDescription>
              Sync meetings between your app and Google Calendar in both directions
            </CardDescription>
          </div>
          {syncStatus === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
          {syncStatus === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-sync">Automatic Sync</Label>
            <p className="text-sm text-muted-foreground">
              Sync calendar every hour automatically
            </p>
          </div>
          <Switch
            id="auto-sync"
            checked={isAutoSyncEnabled}
            onCheckedChange={handleAutoSyncToggle}
          />
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last Sync</span>
            <Badge variant="outline">{formatLastSync()}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            • Imports Google Calendar events as meetings<br/>
            • Exports your meetings to Google Calendar<br/>
            • Updates changes in both directions
          </p>
        </div>

        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="w-full"
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
