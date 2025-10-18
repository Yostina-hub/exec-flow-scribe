import * as React from 'react';
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
  const [clientId, setClientId] = React.useState('');
  const [clientSecret, setClientSecret] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [isConfigured, setIsConfigured] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
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

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Save credentials as Supabase secrets
      const { data, error } = await supabase.functions.invoke('save-google-credentials', {
        body: { 
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim()
        }
      });

      if (error) throw error;

      toast.success('Google API credentials saved successfully!');
      setClientId('');
      setClientSecret('');
      setIsConfigured(true);
      
      // Recheck configuration
      await checkConfiguration();
    } catch (error: any) {
      toast.error('Failed to save credentials: ' + error.message);
    } finally {
      setLoading(false);
    }
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">OAuth 2.0 Credentials</CardTitle>
                    <CardDescription>
                      Enter your Google Cloud Console credentials below
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientId">Client ID</Label>
                      <Input
                        id="clientId"
                        type="text"
                        placeholder="Enter your Google Client ID"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your OAuth 2.0 Client ID from Google Cloud Console
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientSecret">Client Secret</Label>
                      <Input
                        id="clientSecret"
                        type="password"
                        placeholder="Enter your Google Client Secret"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your OAuth 2.0 Client Secret (kept secure)
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSave} 
                        disabled={loading || !clientId.trim() || !clientSecret.trim()}
                      >
                        {loading ? 'Saving...' : 'Save Credentials'}
                      </Button>
                      {isConfigured && (
                        <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                          {testing ? 'Testing...' : 'Test Connection'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">Configuration Status</h4>
                          <p className="text-sm text-muted-foreground">
                            Current status of Google API integration
                          </p>
                        </div>
                        <Badge variant={isConfigured ? "default" : "secondary"} className="ml-2">
                          {isConfigured ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Active</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Not Configured</>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="services" className="space-y-4">
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  All Google Cloud services share the same OAuth 2.0 credentials configured above.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {/* Communication & Collaboration */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Communication & Collaboration</h3>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Google Calendar API</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        Create and manage calendar events, sync schedules, and automate meeting workflows
                      </p>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={isConfigured ? "default" : "secondary"}>
                            {isConfigured ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>• <strong>Free Tier:</strong> 1,000,000 queries/day</div>
                          <div>• <strong>Paid:</strong> No additional cost beyond quota</div>
                          <div>• <strong>Features:</strong> Event management, reminders, attendees, recurring events</div>
                        </div>
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
                        Generate Meet video conference links automatically with Calendar events
                      </p>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={isConfigured ? "default" : "secondary"}>
                            {isConfigured ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>• <strong>Free Tier:</strong> 60 min meetings, unlimited 1:1 calls</div>
                          <div>• <strong>Business:</strong> $12/user/month (300 participants, recording)</div>
                          <div>• <strong>Enterprise:</strong> $18/user/month (500 participants, advanced features)</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Gmail API</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        Send emails, read inbox, manage labels, and automate email workflows
                      </p>
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary">Available</Badge>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>• <strong>Free Tier:</strong> 1 billion quota units/day</div>
                          <div>• <strong>Paid:</strong> Additional quota at $0.50/1M units</div>
                          <div>• <strong>Features:</strong> Send/receive, attachments, filters, threading</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* AI & Machine Learning */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">AI & Machine Learning</h3>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Google Gemini AI</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        Advanced AI models for text generation, analysis, and multimodal understanding
                      </p>
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary">Available</Badge>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>• <strong>Gemini 2.0 Flash:</strong> Free (2 RPM) | Paid: $0.075/1M input, $0.30/1M output</div>
                          <div>• <strong>Gemini 1.5 Flash:</strong> Free (15 RPM) | Paid: $0.075/1M input, $0.30/1M output</div>
                          <div>• <strong>Gemini 1.5 Pro:</strong> Free (2 RPM) | Paid: $1.25/1M input, $5.00/1M output</div>
                          <div>• <strong>Context:</strong> Up to 2M tokens | Multimodal: text, images, video, audio</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Cloud Speech-to-Text</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        Convert audio to text with automatic speech recognition for meeting transcriptions
                      </p>
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary">Available</Badge>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>• <strong>Free Tier:</strong> 60 minutes/month</div>
                          <div>• <strong>Standard:</strong> $0.006/15 seconds</div>
                          <div>• <strong>Enhanced:</strong> $0.009/15 seconds (better accuracy)</div>
                          <div>• <strong>Features:</strong> 125+ languages, timestamps, speaker diarization</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Cloud Text-to-Speech</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        Generate natural-sounding speech from text for audio briefings and announcements
                      </p>
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary">Available</Badge>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>• <strong>Free Tier:</strong> 1M characters/month (Standard), 100K (WaveNet/Neural2)</div>
                          <div>• <strong>Standard:</strong> $4.00/1M characters</div>
                          <div>• <strong>WaveNet:</strong> $16.00/1M characters (premium quality)</div>
                          <div>• <strong>Features:</strong> 380+ voices, 50+ languages, SSML support</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Cloud Translation</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        Translate text between languages for international meetings and documentation
                      </p>
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary">Available</Badge>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>• <strong>Free Tier:</strong> 500,000 characters/month</div>
                          <div>• <strong>Basic:</strong> $20/1M characters</div>
                          <div>• <strong>Advanced:</strong> $20/1M characters (glossary, custom models)</div>
                          <div>• <strong>Features:</strong> 100+ languages, auto-detect, document translation</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Storage & Documents */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Storage & Documents</h3>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Google Drive API</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        Store, access, and manage meeting documents, minutes, and files
                      </p>
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary">Available</Badge>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>• <strong>Free Tier:</strong> 15 GB storage per user</div>
                          <div>• <strong>Business:</strong> $12/user/month (2 TB storage)</div>
                          <div>• <strong>Enterprise:</strong> $18/user/month (5 TB storage)</div>
                          <div>• <strong>API:</strong> 20,000 queries/100 seconds (free)</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Google Docs/Sheets API</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        Create and edit documents and spreadsheets programmatically for automated reporting
                      </p>
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary">Available</Badge>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>• <strong>Free Tier:</strong> Included with Workspace or free Google account</div>
                          <div>• <strong>API Quota:</strong> 500 reads/100 sec, 500 writes/100 sec</div>
                          <div>• <strong>Features:</strong> Rich formatting, formulas, charts, collaboration</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Cloud Storage</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        Object storage for meeting recordings, audio files, and large documents
                      </p>
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary">Available</Badge>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>• <strong>Free Tier:</strong> 5 GB/month storage, 1 GB/month egress</div>
                          <div>• <strong>Standard:</strong> $0.020/GB/month storage, $0.12/GB egress</div>
                          <div>• <strong>Nearline:</strong> $0.010/GB/month (30-day archive)</div>
                          <div>• <strong>Features:</strong> 99.95% availability, versioning, encryption</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Analytics & Monitoring */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Analytics & Monitoring</h3>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Cloud Natural Language</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        Analyze meeting sentiment, extract entities, and classify content
                      </p>
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary">Available</Badge>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>• <strong>Free Tier:</strong> 5,000 units/month</div>
                          <div>• <strong>Paid:</strong> $1.00/1,000 units</div>
                          <div>• <strong>Features:</strong> Sentiment analysis, entity recognition, syntax analysis</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Cloud Vision</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        Analyze images from meetings, extract text (OCR), and detect objects
                      </p>
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary">Available</Badge>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>• <strong>Free Tier:</strong> 1,000 units/month</div>
                          <div>• <strong>Paid:</strong> $1.50-$3.00/1,000 features (varies by type)</div>
                          <div>• <strong>Features:</strong> OCR, label detection, face detection, logo recognition</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Note:</strong> All pricing is current as of 2025. Visit the{' '}
                    <a 
                      href="https://cloud.google.com/pricing" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Google Cloud Pricing Calculator <ExternalLink className="h-3 w-3" />
                    </a>
                    {' '}for the most up-to-date information and to estimate costs for your usage.
                  </AlertDescription>
                </Alert>
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
