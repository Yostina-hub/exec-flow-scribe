import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Shield, Lock, Unlock, FileText, Mic, Calendar, Search, Download, Filter, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AuditEntry {
  id: string;
  user_id: string;
  action: 'encrypt' | 'decrypt';
  resource_type: 'transcription' | 'recording' | 'meeting';
  resource_id: string;
  metadata: any;
  timestamp: string;
}

export function EncryptionAuditLog() {
  const { toast } = useToast();
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('encryption_audit_log')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(100);

      const { data, error } = await query;

      if (error) throw error;
      setAuditLogs((data || []) as AuditEntry[]);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load encryption audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = searchQuery === '' || 
      log.resource_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesResource = resourceFilter === 'all' || log.resource_type === resourceFilter;
    
    return matchesSearch && matchesAction && matchesResource;
  });

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'transcription':
        return <FileText className="h-4 w-4" />;
      case 'recording':
        return <Mic className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    if (action === 'encrypt') {
      return (
        <Badge variant="default" className="gap-1 bg-green-500">
          <Lock className="h-3 w-3" />
          Encrypted
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="gap-1">
          <Unlock className="h-3 w-3" />
          Decrypted
        </Badge>
      );
    }
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Action', 'Resource Type', 'Resource ID', 'Metadata'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      log.action,
      log.resource_type,
      log.resource_id,
      JSON.stringify(log.metadata),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `encryption-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Audit log exported successfully',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Encryption Audit Log</CardTitle>
              <CardDescription>
                Track all encryption and decryption operations for compliance
              </CardDescription>
            </div>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by resource ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="encrypt">Encrypt</SelectItem>
              <SelectItem value="decrypt">Decrypt</SelectItem>
            </SelectContent>
          </Select>
          <Select value={resourceFilter} onValueChange={setResourceFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Resource Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="meeting">Meetings</SelectItem>
              <SelectItem value="transcription">Transcriptions</SelectItem>
              <SelectItem value="recording">Recordings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Audit Log Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading audit logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {searchQuery || actionFilter !== 'all' || resourceFilter !== 'all'
                ? 'No audit logs match your filters'
                : 'No encryption activity yet'}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Resource ID</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getResourceIcon(log.resource_type)}
                        <span className="capitalize">{log.resource_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">
                      {log.resource_id}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.metadata?.size && (
                        <span>Size: {(log.metadata.size / 1024).toFixed(1)} KB</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Total Operations</p>
            <p className="text-2xl font-bold">{filteredLogs.length}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Encryptions</p>
            <p className="text-2xl font-bold text-green-500">
              {filteredLogs.filter(l => l.action === 'encrypt').length}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Decryptions</p>
            <p className="text-2xl font-bold text-blue-500">
              {filteredLogs.filter(l => l.action === 'decrypt').length}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Last Activity</p>
            <p className="text-sm font-semibold">
              {filteredLogs.length > 0
                ? format(new Date(filteredLogs[0].timestamp), 'MMM d, HH:mm')
                : 'N/A'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
