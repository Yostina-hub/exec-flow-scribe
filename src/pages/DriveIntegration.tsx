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
  Zap
} from "lucide-react";
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
  });
  const [accessToken, setAccessToken] = useState<string | null>(null);

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
        auto_upload_recordings: data.auto_upload_recordings,
        auto_save_minutes_as_docs: data.auto_save_minutes_as_docs,
        auto_backup_enabled: data.auto_backup_enabled,
      });
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
      const { data, error } = await supabase.functions.invoke('google-meet-auth', {
        body: { action: 'getAuthUrl' }
      });

      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      toast({
        title: "Error connecting to Google",
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
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-background p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Cloud className="h-8 w-8" />
                Smart Drive Hub
              </h1>
              <p className="text-muted-foreground mt-2">
                AI-powered meeting material organization with never-before-seen automation
              </p>
            </div>
            {!accessToken && (
              <Button onClick={connectGoogleDrive} size="lg" className="gap-2">
                <Cloud className="h-4 w-4" />
                Connect Google Drive
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{meetingFiles.length}</div>
              <p className="text-xs text-muted-foreground">Across all meetings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto-Generated</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {meetingFiles.filter(f => f.auto_generated).length}
              </div>
              <p className="text-xs text-muted-foreground">AI-created documents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {meetingFiles.filter(f => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return new Date(f.created_at) > weekAgo;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">New files uploaded</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Smart Sync</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground">Automation enabled</p>
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

          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Meeting Files</CardTitle>
                    <CardDescription>
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
                  <div className="text-center py-8 text-muted-foreground">
                    No files yet. Files will appear here automatically when you record meetings.
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
                          className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
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

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Smart Automation Settings
                </CardTitle>
                <CardDescription>
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
      </div>
    </Layout>
  );
}