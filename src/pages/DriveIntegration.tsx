import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Cloud, 
  FileText, 
  Video, 
  Paperclip, 
  FolderOpen, 
  Search,
  Upload,
  Settings,
  Sparkles,
  Calendar,
  TrendingUp,
  Zap,
  Send
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function DriveIntegration() {
  const { toast } = useToast();
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [meetingFiles, setMeetingFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState({
    auto_upload_recordings: true,
    auto_save_minutes_as_docs: true,
    auto_backup_enabled: false,
    google_drive_enabled: true,
    teledrive_enabled: false,
    auto_sync_notebooks: false,
  });
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [teledriveConnected, setTeledriveConnected] = useState(false);
  const [showTeledriveDialog, setShowTeledriveDialog] = useState(false);
  const [teledriveApiHost, setTeledriveApiHost] = useState("");
  const [teledrivePhone, setTeledrivePhone] = useState("");
  const [teledrivePassword, setTeledrivePassword] = useState("");
  const [teledriveApiId, setTeledriveApiId] = useState("");
  const [teledriveApiHash, setTeledriveApiHash] = useState("");

  useEffect(() => {
    loadSettings();
    loadMeetingFiles();
    checkGoogleAuth();
  }, []);

  const checkGoogleAuth = async () => {
    // Check if user has Google OAuth token
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.provider_token) {
      setAccessToken(session.provider_token);
    }
  };

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('drive_sync_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setSettings({
        auto_upload_recordings: data.auto_upload_recordings ?? true,
        auto_save_minutes_as_docs: data.auto_save_minutes_as_docs ?? true,
        auto_backup_enabled: data.auto_backup_enabled ?? false,
        google_drive_enabled: data.google_drive_enabled ?? true,
        teledrive_enabled: data.teledrive_enabled ?? false,
        auto_sync_notebooks: data.auto_sync_notebooks ?? false,
      });
      
      if (data.teledrive_access_token) {
        setTeledriveConnected(true);
      }
    }
  };

  const connectTeleDrive = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('teledrive-auth', {
        body: {
          action: 'login',
          apiHost: teledriveApiHost,
          phoneNumber: teledrivePhone,
          password: teledrivePassword,
          apiId: teledriveApiId,
          apiHash: teledriveApiHash,
        }
      });

      if (error) throw error;

      setTeledriveConnected(true);
      setShowTeledriveDialog(false);
      toast({
        title: "TeleDrive connected",
        description: "Your TeleDrive account has been linked successfully.",
      });
      
      loadSettings();
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMeetingFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meeting_drive_files')
        .select(`
          *,
          meetings (
            title,
            start_time
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetingFiles(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading files",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (key: string, value: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('drive_sync_settings')
      .upsert({
        user_id: user.id,
        [key]: value,
      });

    if (error) {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSettings(prev => ({ ...prev, [key]: value }));
      toast({
        title: "Settings updated",
        description: "Your Drive sync preferences have been saved.",
      });
    }
  };

  const connectGoogleDrive = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-auth', {
        body: { action: 'getAuthUrl' }
      });

      if (error) throw error;
      if (data?.authUrl) {
        // Store that we're doing Drive auth
        sessionStorage.setItem('oauth_flow', 'drive');
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      toast({
        title: "Error connecting to Google Drive",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'audio': return <Video className="h-4 w-4" />;
      default: return <Paperclip className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'recording': return 'bg-red-500/10 text-red-500';
      case 'minutes': return 'bg-blue-500/10 text-blue-500';
      case 'attachment': return 'bg-green-500/10 text-green-500';
      case 'backup': return 'bg-purple-500/10 text-purple-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background p-10 shadow-xl border">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <Cloud className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight">
                  Smart Drive Hub
                </h1>
              </div>
              <p className="text-muted-foreground text-lg max-w-2xl">
                AI-powered meeting material organization with intelligent automation
              </p>
            </div>
            <div className="flex gap-3">
              {!accessToken && (
                <Button onClick={connectGoogleDrive} size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-all hover-scale">
                  <Cloud className="h-5 w-5" />
                  Connect Google Drive
                </Button>
              )}
              {!teledriveConnected && (
                <Button onClick={() => setShowTeledriveDialog(true)} size="lg" variant="outline" className="gap-2 shadow-lg hover:shadow-xl transition-all hover-scale">
                  <Send className="h-5 w-5" />
                  Connect TeleDrive
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="hover:shadow-lg transition-all hover-scale border-2 animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Total Files</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{meetingFiles.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all meetings</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all hover-scale border-2 animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Auto-Generated</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {meetingFiles.filter(f => f.auto_generated).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">AI-created documents</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all hover-scale border-2 animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">This Week</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {meetingFiles.filter(f => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return new Date(f.created_at) > weekAgo;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">New files uploaded</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all hover-scale border-2 animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Smart Sync</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground mt-1">Automation enabled</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="files" className="space-y-4">
          <TabsList>
            <TabsTrigger value="files">Meeting Files</TabsTrigger>
            <TabsTrigger value="settings">Smart Sync</TabsTrigger>
            <TabsTrigger value="browse">Browse Drive</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-4 animate-fade-in">
            <Card className="shadow-md border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Meeting Files</CardTitle>
                    <CardDescription className="text-base mt-1">
                      All files automatically synced from your meetings
                    </CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading files...</div>
                ) : meetingFiles.length === 0 ? (
                  <div className="text-center py-16 animate-scale-in">
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center mx-auto mb-6">
                      <Cloud className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <p className="text-base font-semibold mb-2">No files yet</p>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Files will appear here automatically when you record meetings and enable sync
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {meetingFiles
                      .filter(file => 
                        file.drive_file_name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-4 rounded-xl border-2 hover:border-primary/30 hover:bg-accent/50 hover:shadow-md transition-all hover-scale animate-fade-in"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-accent">
                              {getFileIcon(file.drive_file_type)}
                            </div>
                            <div>
                              <div className="font-medium">{file.drive_file_name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                {file.meetings?.title || 'Unknown meeting'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {file.auto_generated && (
                              <Badge variant="secondary" className="gap-1">
                                <Sparkles className="h-3 w-3" />
                                AI Generated
                              </Badge>
                            )}
                            <Badge className={getCategoryColor(file.file_category)}>
                              {file.file_category}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(file.drive_file_url, '_blank')}
                            >
                              Open
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 animate-fade-in">
            <Card className="shadow-md border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  Smart Automation Settings
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Configure how MeetingHub automatically manages your Drive files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-upload Recordings</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically upload meeting recordings to Drive
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_upload_recordings}
                    onCheckedChange={(checked) => 
                      updateSettings('auto_upload_recordings', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-save Minutes as Docs</Label>
                    <p className="text-sm text-muted-foreground">
                      Convert meeting minutes to editable Google Docs
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_save_minutes_as_docs}
                    onCheckedChange={(checked) => 
                      updateSettings('auto_save_minutes_as_docs', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Smart Backup</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically backup meeting data daily
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_backup_enabled}
                    onCheckedChange={(checked) => 
                      updateSettings('auto_backup_enabled', checked)
                    }
                  />
                </div>

                <div className="h-px bg-border my-4" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Google Drive</Label>
                    <p className="text-sm text-muted-foreground">
                      Sync files to Google Drive
                    </p>
                  </div>
                  <Switch
                    checked={settings.google_drive_enabled}
                    onCheckedChange={(checked) => 
                      updateSettings('google_drive_enabled', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable TeleDrive</Label>
                    <p className="text-sm text-muted-foreground">
                      Sync files to TeleDrive (Telegram storage)
                    </p>
                  </div>
                  <Switch
                    checked={settings.teledrive_enabled}
                    onCheckedChange={(checked) => 
                      updateSettings('teledrive_enabled', checked)
                    }
                  />
                </div>

                <div className="h-px bg-border my-4" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-sync Notebook Files</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically upload all notebook files to cloud storage
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_sync_notebooks}
                    onCheckedChange={(checked) => 
                      updateSettings('auto_sync_notebooks', checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="browse" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Browse Google Drive</CardTitle>
                <CardDescription>
                  Access your Drive files and attach them to meetings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  {accessToken ? (
                    <div>Drive browser coming soon...</div>
                  ) : (
                    <div>
                      <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Connect Google Drive to browse your files</p>
                      <Button onClick={connectGoogleDrive} className="mt-4">
                        Connect Now
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* TeleDrive Connection Dialog */}
        <Dialog open={showTeledriveDialog} onOpenChange={setShowTeledriveDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Connect TeleDrive
              </DialogTitle>
              <DialogDescription>
                Enter your TeleDrive credentials to enable Telegram cloud storage
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>API Host</Label>
                <Input
                  value={teledriveApiHost}
                  onChange={(e) => setTeledriveApiHost(e.target.value)}
                  placeholder="https://your-teledrive-instance.com"
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={teledrivePhone}
                  onChange={(e) => setTeledrivePhone(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={teledrivePassword}
                  onChange={(e) => setTeledrivePassword(e.target.value)}
                  placeholder="Your TeleDrive password"
                />
              </div>
              <div>
                <Label>Telegram API ID</Label>
                <Input
                  value={teledriveApiId}
                  onChange={(e) => setTeledriveApiId(e.target.value)}
                  placeholder="Get from my.telegram.org"
                />
              </div>
              <div>
                <Label>Telegram API Hash</Label>
                <Input
                  value={teledriveApiHash}
                  onChange={(e) => setTeledriveApiHash(e.target.value)}
                  placeholder="Get from my.telegram.org"
                />
              </div>
              <Button 
                onClick={connectTeleDrive} 
                disabled={loading || !teledriveApiHost || !teledrivePhone || !teledrivePassword}
                className="w-full"
              >
                {loading ? "Connecting..." : "Connect TeleDrive"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}