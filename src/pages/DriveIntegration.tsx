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
  Send,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Download,
  ExternalLink
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/contexts/ThemeContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DriveIntegration() {
  const { toast } = useToast();
  const { theme } = useTheme();
  const isEthioTelecom = theme === 'ethio-telecom';
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
  const [teledrivePhone, setTeledrivePhone] = useState("");
  const [teledrivePassword, setTeledrivePassword] = useState("");

  useEffect(() => {
    loadSettings();
    loadMeetingFiles();
    checkGoogleAuth();
    
    // Real-time file updates
    const filesChannel = supabase
      .channel('drive-files-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_drive_files' }, () => {
        loadMeetingFiles();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(filesChannel);
    };
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
          phoneNumber: teledrivePhone,
          password: teledrivePassword,
        }
      });

      if (error) throw error;

      setTeledriveConnected(true);
      setShowTeledriveDialog(false);
      toast({
        title: "Ethio Telecom Drive connected",
        description: "Your Ethio Telecom Drive account has been linked successfully.",
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
        <div className={`relative overflow-hidden rounded-2xl p-10 shadow-xl border animate-fade-in ${
          isEthioTelecom 
            ? 'bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border-primary/20' 
            : 'bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-emerald-500/10 border-cyan-500/20'
        }`}>
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl animate-pulse ${
            isEthioTelecom 
              ? 'bg-gradient-to-br from-primary/20 to-transparent' 
              : 'bg-gradient-to-br from-cyan-500/20 to-transparent'
          }`} />
          
          <div className="relative flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-2xl animate-glow ${
                  isEthioTelecom 
                    ? 'bg-gradient-to-br from-primary via-secondary to-accent' 
                    : 'bg-gradient-to-br from-cyan-500 via-blue-500 to-emerald-500'
                }`}>
                  <Cloud className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-5xl font-black font-['Space_Grotesk']">
                  Smart Drive Hub
                </h1>
              </div>
              <p className="text-muted-foreground text-lg max-w-2xl">
                AI-powered cloud storage with multi-provider sync (Google Drive + Ethio Telecom Drive)
              </p>
              
              {/* Connection Status */}
              <div className="flex items-center gap-4 pt-2">
                {accessToken && (
                  <Badge variant="outline" className="gap-2 border-green-500/30 bg-green-500/10">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Google Drive Connected
                  </Badge>
                )}
                {teledriveConnected && (
                  <Badge variant="outline" className={`gap-2 ${
                    isEthioTelecom 
                      ? 'border-primary/30 bg-primary/10' 
                      : 'border-blue-500/30 bg-blue-500/10'
                  }`}>
                    <CheckCircle2 className={`h-3 w-3 ${isEthioTelecom ? 'text-primary' : 'text-blue-500'}`} />
                    Ethio Telecom Drive
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              {!accessToken && (
                <Button onClick={connectGoogleDrive} size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-all hover-scale">
                  <Cloud className="h-5 w-5" />
                  Connect Google Drive
                </Button>
              )}
              {!teledriveConnected && (
                <Button 
                  onClick={() => setShowTeledriveDialog(true)} 
                  size="lg" 
                  variant={isEthioTelecom ? "default" : "outline"}
                  className={`gap-2 shadow-lg hover:shadow-xl transition-all hover-scale ${
                    isEthioTelecom ? 'bg-gradient-to-r from-primary to-secondary' : ''
                  }`}
                >
                  <HardDrive className="h-5 w-5" />
                  Connect Ethio Telecom Drive
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className={`hover:shadow-lg transition-all hover-scale border-2 animate-fade-in ${
            isEthioTelecom ? 'border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background' : ''
          }`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Total Files</CardTitle>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                isEthioTelecom ? 'bg-primary/10' : 'bg-blue-500/10'
              }`}>
                <FolderOpen className={`h-5 w-5 ${isEthioTelecom ? 'text-primary' : 'text-blue-500'}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{meetingFiles.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all meetings</p>
            </CardContent>
          </Card>

          <Card className={`hover:shadow-lg transition-all hover-scale border-2 animate-fade-in ${
            isEthioTelecom ? 'border-secondary/20 bg-gradient-to-br from-background via-secondary/5 to-background' : ''
          }`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Auto-Generated</CardTitle>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                isEthioTelecom ? 'bg-secondary/10' : 'bg-purple-500/10'
              }`}>
                <Sparkles className={`h-5 w-5 ${isEthioTelecom ? 'text-secondary' : 'text-purple-500'}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {meetingFiles.filter(f => f.auto_generated).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">AI-created documents</p>
            </CardContent>
          </Card>

          <Card className={`hover:shadow-lg transition-all hover-scale border-2 animate-fade-in ${
            isEthioTelecom ? 'border-accent/20 bg-gradient-to-br from-background via-accent/5 to-background' : ''
          }`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">This Week</CardTitle>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                isEthioTelecom ? 'bg-accent/10' : 'bg-green-500/10'
              }`}>
                <TrendingUp className={`h-5 w-5 ${isEthioTelecom ? 'text-accent' : 'text-green-500'}`} />
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

          <Card className={`hover:shadow-lg transition-all hover-scale border-2 animate-fade-in ${
            isEthioTelecom ? 'border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background' : ''
          }`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Storage Providers</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <HardDrive className="h-5 w-5 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {(accessToken ? 1 : 0) + (teledriveConnected ? 1 : 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Connected services</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Ethio Telecom Drive Info Alert */}
        {!teledriveConnected && isEthioTelecom && (
          <Alert className="border-primary/30 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription>
              <strong>Ethio Telecom Drive:</strong> Connect your Ethio Telecom account to enable seamless cloud storage for meeting files. Ethio Telecom Drive provides secure, high-speed file storage integrated with Ethiopia's leading telecom network.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs defaultValue="files" className="space-y-4">
          <TabsList className={`grid w-full grid-cols-4 ${
            isEthioTelecom ? 'bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10' : ''
          }`}>
            <TabsTrigger value="files" className={`gap-2 ${
              isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground' : ''
            }`}>
              <FolderOpen className="h-4 w-4" />
              Meeting Files
            </TabsTrigger>
            <TabsTrigger value="settings" className={`gap-2 ${
              isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground' : ''
            }`}>
              <Settings className="h-4 w-4" />
              Smart Sync
            </TabsTrigger>
            <TabsTrigger value="browse" className={`gap-2 ${
              isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground' : ''
            }`}>
              <Cloud className="h-4 w-4" />
              Browse Drive
            </TabsTrigger>
            <TabsTrigger value="teledrive" className={`gap-2 ${
              isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground' : ''
            }`}>
              <HardDrive className="h-4 w-4" />
              Ethio Telecom Drive
            </TabsTrigger>
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
                    <Label>Enable Ethio Telecom Drive</Label>
                    <p className="text-sm text-muted-foreground">
                      Sync files to Ethio Telecom's cloud storage
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

          <TabsContent value="browse" className="space-y-4 animate-fade-in">
            <Card className={isEthioTelecom ? 'border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-primary" />
                  Browse Google Drive
                </CardTitle>
                <CardDescription>
                  Access your Drive files and attach them to meetings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  {accessToken ? (
                    <div className="space-y-4">
                      <div className="h-16 w-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      </div>
                      <p className="font-semibold">Google Drive Connected</p>
                      <p className="text-sm text-muted-foreground">Advanced file browser coming soon...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                        <Cloud className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="font-semibold">Connect Google Drive to browse your files</p>
                      <Button onClick={connectGoogleDrive} className="mt-4 gap-2">
                        <Cloud className="h-4 w-4" />
                        Connect Now
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teledrive" className="space-y-4 animate-fade-in">
            <Card className={isEthioTelecom ? 'border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-primary" />
                  Ethio Telecom Drive Integration
                </CardTitle>
                <CardDescription>
                  {isEthioTelecom 
                    ? "Ethiopia's premier cloud storage solution for your meeting files"
                    : "Enterprise cloud storage for your meeting files"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Key Features Section */}
                <div className={`grid gap-4 md:grid-cols-2 rounded-lg p-6 border-2 ${
                  isEthioTelecom 
                    ? 'border-primary/20 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5' 
                    : 'border-muted bg-gradient-to-br from-background to-muted/20'
                }`}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-5 w-5 ${isEthioTelecom ? 'text-primary' : 'text-green-500'}`} />
                      <h4 className="font-semibold">Automatic Backup</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All your meetings are automatically stored on Ethio Telecom Drive. Every recording, document, and minute is backed up in real-time without any manual intervention.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-5 w-5 ${isEthioTelecom ? 'text-primary' : 'text-green-500'}`} />
                      <h4 className="font-semibold">Never Lose Anything</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your data is permanently secured with enterprise-grade redundancy. Files are replicated across multiple data centers to ensure zero data loss, even in case of hardware failure.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-5 w-5 ${isEthioTelecom ? 'text-primary' : 'text-green-500'}`} />
                      <h4 className="font-semibold">Safe & Secure</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Protected by military-grade encryption (AES-256). Your data is secured both in transit and at rest, with full compliance to international data protection standards.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-5 w-5 ${isEthioTelecom ? 'text-primary' : 'text-green-500'}`} />
                      <h4 className="font-semibold">Complete History</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Access your entire meeting history anytime, anywhere. All documents, recordings, and transcriptions are organized chronologically for instant retrieval and reference.
                    </p>
                  </div>
                </div>

                {teledriveConnected ? (
                  <>
                    <Alert className={`border-green-500/30 bg-green-500/10 ${isEthioTelecom ? 'border-primary/30 bg-primary/10' : ''}`}>
                      <CheckCircle2 className={`h-4 w-4 ${isEthioTelecom ? 'text-primary' : 'text-green-500'}`} />
                      <AlertDescription>
                        <strong>Ethio Telecom Drive Connected:</strong> Your meeting files will automatically sync to Ethio Telecom Drive when enabled in Smart Sync settings.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        Ethio Telecom Drive Files
                      </h3>
                      <div className="space-y-2">
                        {meetingFiles.filter(f => f.storage_provider === 'teledrive').length > 0 ? (
                          meetingFiles
                            .filter(f => f.storage_provider === 'teledrive')
                            .map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between p-4 rounded-xl border-2 hover:border-primary/30 hover:bg-accent/50 transition-all"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="p-2 rounded-lg bg-accent">
                                    {getFileIcon(file.drive_file_type)}
                                  </div>
                                  <div>
                                    <div className="font-medium">{file.drive_file_name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {file.meetings?.title || 'Unknown meeting'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`gap-1 ${isEthioTelecom ? 'border-primary/30 bg-primary/10' : ''}`}>
                                    <HardDrive className="h-3 w-3" />
                                    Ethio Telecom
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(file.drive_file_url, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No files stored in Ethio Telecom Drive yet</p>
                            <p className="text-sm mt-2">Enable Ethio Telecom Drive sync in Smart Sync settings</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mx-auto ${
                      isEthioTelecom ? 'bg-gradient-to-br from-primary/20 to-secondary/20' : 'bg-muted'
                    }`}>
                      <HardDrive className={`h-8 w-8 ${isEthioTelecom ? 'text-primary' : 'text-muted-foreground/50'}`} />
                    </div>
                    <div>
                      <p className="font-semibold mb-2">Connect Ethio Telecom Drive</p>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                        {isEthioTelecom 
                          ? "Ethio Telecom Drive provides secure, high-speed cloud storage integrated with Ethiopia's leading telecom network. Connect your account to enable automatic file syncing."
                          : "Enterprise cloud storage solution. Connect your account to enable automatic file syncing."}
                      </p>
                    </div>
                    <Button onClick={() => setShowTeledriveDialog(true)} className={`gap-2 ${
                      isEthioTelecom ? 'bg-gradient-to-r from-primary to-secondary' : ''
                    }`}>
                      <HardDrive className="h-4 w-4" />
                      Connect Ethio Telecom Drive
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Ethio Telecom Drive Connection Dialog */}
        <Dialog open={showTeledriveDialog} onOpenChange={setShowTeledriveDialog}>
          <DialogContent className={`max-w-md ${isEthioTelecom ? 'border-primary/20' : ''}`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                Connect Ethio Telecom Drive
              </DialogTitle>
              <DialogDescription>
                {isEthioTelecom 
                  ? "Connect your Ethio Telecom account to access cloud storage"
                  : "Connect to Ethio Telecom's cloud storage service"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {isEthioTelecom && (
                <Alert className="border-primary/30 bg-primary/5">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-xs">
                    Use your Ethio Telecom mobile number and account password to connect.
                  </AlertDescription>
                </Alert>
              )}
              
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={teledrivePhone}
                  onChange={(e) => setTeledrivePhone(e.target.value)}
                  placeholder="+251911234567"
                  type="tel"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your Ethio Telecom mobile number
                </p>
              </div>
              
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={teledrivePassword}
                  onChange={(e) => setTeledrivePassword(e.target.value)}
                  placeholder="Your Ethio Telecom account password"
                />
              </div>
              
              <Button 
                onClick={connectTeleDrive} 
                disabled={loading || !teledrivePhone || !teledrivePassword}
                className={`w-full ${isEthioTelecom ? 'bg-gradient-to-r from-primary to-secondary' : ''}`}
              >
                {loading ? "Connecting..." : "Connect Ethio Telecom Drive"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}