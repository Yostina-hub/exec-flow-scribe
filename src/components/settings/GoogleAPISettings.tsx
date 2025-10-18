import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Key, Calendar, Video, ExternalLink, Info } from 'lucide-react';

export function GoogleAPISettings() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      // Check if credentials exist by trying to get auth URL
      const { data, error } = await supabase.functions.invoke('google-meet-auth', {
        body: { action: 'getAuthUrl' }
      });

      setIsConfigured(!error && !!data?.authUrl);
    } catch (error) {
      setIsConfigured(false);
    }
  };

  const handleSave = () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    toast.info('Google API credentials are managed as environment secrets. Please contact your administrator to update them.');
    setClientId('');
    setClientSecret('');
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-meet-auth', {
        body: { action: 'getAuthUrl' }
      });

      if (error) throw error;

      toast.success('Google API connection successful!');
    } catch (error: any) {
      toast.error('Connection failed: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Google Cloud API Configuration
              </CardTitle>
              <CardDescription>
                Configure your Google Cloud Console API credentials for Calendar and Meet integration
              </CardDescription>
            </div>
            <Badge variant={isConfigured ? "default" : "secondary"}>
              {isConfigured ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Configured</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Not Configured</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="guide">Setup Guide</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Google API credentials (Client ID and Client Secret) are currently {isConfigured ? 'configured' : 'not configured'}.
                  These credentials are stored as secure environment secrets.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">Configuration Status</h4>
                          <p className="text-sm text-muted-foreground">
                            OAuth 2.0 credentials for Google services
                          </p>
                        </div>
                        <Badge variant={isConfigured ? "default" : "secondary"} className="ml-2">
                          {isConfigured ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Active</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Inactive</>
                          )}
                        </Badge>
                      </div>
                      
                      {isConfigured && (
                        <div className="pt-2">
                          <Button variant="outline" onClick={handleTestConnection} disabled={testing} size="sm">
                            {testing ? 'Testing...' : 'Test Connection'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {!isConfigured && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>To enable Google Meet integration:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                        <li>Follow the setup guide in the "Setup Guide" tab</li>
                        <li>Get your Client ID and Client Secret from Google Cloud Console</li>
                        <li>Contact your system administrator to configure the credentials</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="services" className="space-y-4">
              <div className="space-y-3">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Google Calendar API</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      Create and manage calendar events with Google Calendar
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant={isConfigured ? "default" : "secondary"}>
                        {isConfigured ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        • Free (1M requests/day)
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Google Meet</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      Generate Meet links automatically with Calendar events
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant={isConfigured ? "default" : "secondary"}>
                        {isConfigured ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        • Free (60 min meetings)
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="guide" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Follow these steps to get your Google Cloud API credentials
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
                    Go to Google Cloud Console
                  </h4>
                  <p className="text-sm text-muted-foreground pl-8">
                    Visit <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                      console.cloud.google.com <ExternalLink className="h-3 w-3" />
                    </a> and create or select a project
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
                    Enable APIs
                  </h4>
                  <p className="text-sm text-muted-foreground pl-8">
                    Enable the <strong>Google Calendar API</strong> in the API Library
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
                    Configure OAuth Consent Screen
                  </h4>
                  <p className="text-sm text-muted-foreground pl-8">
                    Go to "OAuth consent screen" and configure your app. Add these scopes:
                  </p>
                  <ul className="text-sm text-muted-foreground pl-12 list-disc space-y-1">
                    <li><code className="bg-muted px-1 rounded">https://www.googleapis.com/auth/calendar</code></li>
                    <li><code className="bg-muted px-1 rounded">https://www.googleapis.com/auth/calendar.events</code></li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">4</span>
                    Create OAuth Credentials
                  </h4>
                  <p className="text-sm text-muted-foreground pl-8">
                    Go to "Credentials" → "Create Credentials" → "OAuth client ID"
                  </p>
                  <ul className="text-sm text-muted-foreground pl-12 list-disc space-y-1">
                    <li>Application type: <strong>Web application</strong></li>
                    <li>Add your site URL to <strong>Authorized JavaScript origins</strong></li>
                    <li>Add your redirect URL to <strong>Authorized redirect URIs</strong></li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">5</span>
                    Copy Credentials
                  </h4>
                  <p className="text-sm text-muted-foreground pl-8">
                    Copy your <strong>Client ID</strong> and <strong>Client Secret</strong> and paste them in the Setup tab above
                  </p>
                </div>

                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Keep your Client Secret secure and never share it publicly.
                    It's used to authenticate your application with Google's services.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
