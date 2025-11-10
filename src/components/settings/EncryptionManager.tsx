import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Lock, Key, AlertTriangle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function EncryptionManager() {
  const { toast } = useToast();
  const [isSetup, setIsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keyInfo, setKeyInfo] = useState<any>(null);
  const [autoEncryptRules, setAutoEncryptRules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    checkEncryptionStatus();
  }, []);

  const checkEncryptionStatus = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_encryption_keys')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      setIsSetup(!!data);
      setKeyInfo(data);

      // Fetch auto-encryption rules
      if (data) {
        const { data: rules, error: rulesError } = await supabase
          .from('auto_encryption_rules')
          .select('*')
          .eq('user_id', user.id);

        if (!rulesError && rules) {
          const rulesMap: Record<string, boolean> = {};
          rules.forEach((rule: any) => {
            rulesMap[rule.sensitivity_level] = rule.auto_encrypt;
          });
          setAutoEncryptRules(rulesMap);
        }
      }
    } catch (error: any) {
      console.error('Error checking encryption status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupEncryption = async () => {
    if (password.length < 12) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 12 characters',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords Do Not Match',
        description: 'Please make sure both passwords match',
        variant: 'destructive',
      });
      return;
    }

    setIsSettingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('encryption-setup', {
        body: { password, hint: hint || null },
      });

      if (error) throw error;

      toast({
        title: 'Encryption Enabled',
        description: 'Your encryption key has been set up successfully',
      });

      setShowSetupDialog(false);
      setPassword('');
      setConfirmPassword('');
      setHint('');
      checkEncryptionStatus();
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to set up encryption',
        variant: 'destructive',
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleAutoEncryptToggle = async (level: string, enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('auto_encryption_rules')
        .upsert({
          user_id: user.id,
          sensitivity_level: level,
          auto_encrypt: enabled,
        }, {
          onConflict: 'user_id,sensitivity_level'
        });

      if (error) throw error;

      setAutoEncryptRules(prev => ({ ...prev, [level]: enabled }));

      toast({
        title: 'Auto-Encryption Updated',
        description: `${level} meetings will ${enabled ? 'now' : 'no longer'} be automatically encrypted`,
      });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading encryption settings...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>End-to-End Encryption</CardTitle>
                <CardDescription>
                  Secure your meeting data with user-managed encryption keys
                </CardDescription>
              </div>
            </div>
            {isSetup && (
              <Badge variant="default" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSetup ? (
            <>
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Encryption Not Enabled</AlertTitle>
                <AlertDescription>
                  Enable encryption to protect your meeting recordings and transcriptions with your own password.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important Security Notice</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>• Your encryption password is never stored or transmitted to our servers</p>
                  <p>• If you lose your password, your encrypted data CANNOT be recovered</p>
                  <p>• Store your password securely in a password manager</p>
                  <p>• Consider writing down the password hint for backup</p>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  How It Works
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span>✓</span>
                    <span>Your password generates a unique encryption key</span>
                  </li>
                  <li className="flex gap-2">
                    <span>✓</span>
                    <span>All meeting data is encrypted before storage</span>
                  </li>
                  <li className="flex gap-2">
                    <span>✓</span>
                    <span>Data can only be decrypted with your password</span>
                  </li>
                  <li className="flex gap-2">
                    <span>✓</span>
                    <span>Uses AES-256-GCM encryption (military-grade)</span>
                  </li>
                </ul>
              </div>

              <Button onClick={() => setShowSetupDialog(true)} className="w-full">
                <Shield className="w-4 h-4 mr-2" />
                Enable Encryption
              </Button>
            </>
          ) : (
            <>
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Encryption Active</AlertTitle>
                <AlertDescription>
                  Your meeting data is protected with end-to-end encryption.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Encryption Status</p>
                    <p className="text-xs text-muted-foreground">All data encrypted at rest</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>

                {keyInfo?.key_hint && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-1">Password Hint</p>
                    <p className="text-sm text-muted-foreground">{keyInfo.key_hint}</p>
                  </div>
                )}

                {keyInfo?.last_used_at && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-1">Last Used</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(keyInfo.last_used_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Encryption Key Management</AlertTitle>
                <AlertDescription>
                  Keep your password secure. Data encrypted with this key cannot be recovered if the password is lost.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Auto-Encryption Rules
                </h4>
                <p className="text-sm text-muted-foreground">
                  Automatically encrypt meetings based on sensitivity level
                </p>
                
                <div className="space-y-3">
                  {[
                    { level: 'standard', label: 'Standard', description: 'Regular meetings' },
                    { level: 'confidential', label: 'Confidential', description: 'Sensitive business information' },
                    { level: 'highly_confidential', label: 'Highly Confidential', description: 'Restricted access required' },
                    { level: 'top_secret', label: 'Top Secret', description: 'Maximum security' }
                  ].map(({ level, label, description }) => (
                    <div key={level} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={autoEncryptRules[level] || false}
                          onCheckedChange={(checked) => handleAutoEncryptToggle(level, checked)}
                        />
                        <span className="text-xs text-muted-foreground min-w-[45px]">
                          {autoEncryptRules[level] ? 'Auto' : 'Manual'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Encryption</DialogTitle>
            <DialogDescription>
              Create a strong password to protect your meeting data. This password will never be stored on our servers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Critical:</strong> If you lose this password, your encrypted data cannot be recovered. Write it down securely.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="password">Encryption Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum 12 characters. Use a mix of letters, numbers, and symbols.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hint">Password Hint (Optional)</Label>
              <Input
                id="hint"
                type="text"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="A reminder to help you remember"
              />
              <p className="text-xs text-muted-foreground">
                This hint will be stored (not encrypted) to help you remember your password.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSetupDialog(false);
                setPassword('');
                setConfirmPassword('');
                setHint('');
              }}
              disabled={isSettingUp}
            >
              Cancel
            </Button>
            <Button onClick={handleSetupEncryption} disabled={isSettingUp}>
              {isSettingUp ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting Up...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Enable Encryption
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
