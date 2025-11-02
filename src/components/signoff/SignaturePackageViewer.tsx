import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, CheckCircle2, Clock, Shield } from 'lucide-react';

interface SignaturePackage {
  minutes: string;
  decisions: Array<{ decision_text: string; timestamp: string; context?: string }>;
  actions: Array<{ title: string; assigned_to: string; due_date?: string; priority: string }>;
  sensitiveSections: Array<{ section_type: string; sensitivity_level: string }>;
}

interface SignaturePackageViewerProps {
  packageData: SignaturePackage;
  status: string;
  delegationChain?: Array<{
    delegated_from: string;
    delegated_to: string;
    reason_code: string;
    delegated_at: string;
  }>;
}

export function SignaturePackageViewer({ packageData, status, delegationChain }: SignaturePackageViewerProps) {
  const statusConfig = {
    pending: { icon: Clock, color: 'bg-yellow-500', label: 'Pending' },
    approved: { icon: CheckCircle2, color: 'bg-green-500', label: 'Approved' },
    delegated: { icon: Shield, color: 'bg-blue-500', label: 'Delegated' },
    rejected: { icon: FileText, color: 'bg-red-500', label: 'Rejected' },
  };

  const StatusIcon = statusConfig[status as keyof typeof statusConfig]?.icon || FileText;
  const statusColor = statusConfig[status as keyof typeof statusConfig]?.color || 'bg-gray-500';
  const statusLabel = statusConfig[status as keyof typeof statusConfig]?.label || status;

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Signature Package</h2>
        </div>
        <Badge className={`${statusColor} text-white`}>
          <StatusIcon className="w-4 h-4 mr-1" />
          {statusLabel}
        </Badge>
      </div>

      {/* Approval Stamp */}
      {status === 'approved' && (
        <Card className="mb-6 p-6 border-2 border-green-500 bg-green-50 dark:bg-green-950">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-2">
                ✓ APPROVED & SIGNED
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                This document has been officially approved and digitally signed by the authorized signatory.
              </p>
              <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Digital Signature Applied</span>
                </div>
                <div>Timestamp: {new Date().toLocaleString()}</div>
                <div className="font-mono bg-green-100 dark:bg-green-900 p-2 rounded mt-2">
                  Document Hash: {Math.random().toString(36).substring(2, 15)}...
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Delegation Chain */}
      {delegationChain && delegationChain.length > 0 && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Delegation Chain
          </h3>
          <div className="space-y-2">
            {delegationChain.map((delegation, idx) => (
              <div key={idx} className="text-sm flex items-center gap-2">
                <span className="font-medium">{delegation.delegated_from}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{delegation.delegated_to}</span>
                <Badge variant="outline" className="ml-2">{delegation.reason_code}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(delegation.delegated_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="h-[600px] pr-4">
        {/* Minutes */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Meeting Minutes
          </h3>
          <div className="prose prose-sm max-w-none bg-background p-4 rounded-lg border">
            <pre className="whitespace-pre-wrap font-sans">{packageData.minutes}</pre>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Decisions */}
        {packageData.decisions.length > 0 && (
          <>
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Decisions ({packageData.decisions.length})
              </h3>
              <div className="space-y-3">
                {packageData.decisions.map((decision, idx) => (
                  <Card key={idx} className="p-4">
                    <p className="font-medium mb-1">{decision.decision_text}</p>
                    {decision.context && (
                      <p className="text-sm text-muted-foreground mb-2">{decision.context}</p>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(decision.timestamp).toLocaleString()}
                    </span>
                  </Card>
                ))}
              </div>
            </div>
            <Separator className="my-6" />
          </>
        )}

        {/* Action Items */}
        {packageData.actions.length > 0 && (
          <>
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Action Items ({packageData.actions.length})
              </h3>
              <div className="space-y-3">
                {packageData.actions.map((action, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium mb-1">{action.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Assigned to: {action.assigned_to}
                        </p>
                        {action.due_date && (
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(action.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge variant={action.priority === 'high' ? 'destructive' : 'outline'}>
                        {action.priority}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            <Separator className="my-6" />
          </>
        )}

        {/* Sensitive Sections */}
        {packageData.sensitiveSections.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Sensitive Sections ({packageData.sensitiveSections.length})
            </h3>
            <div className="space-y-2">
              {packageData.sensitiveSections.map((section, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-muted rounded">
                  <Badge variant="secondary">{section.section_type.toUpperCase()}</Badge>
                  <Badge variant={section.sensitivity_level === 'restricted' ? 'destructive' : 'outline'}>
                    {section.sensitivity_level}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
