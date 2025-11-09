import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, Clock, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo, memo } from 'react';
import ethioTelecomLogo from '@/assets/ethio-telecom-logo.png';
import ethioTelecomHeader from '@/assets/ethio-telecom-header.png';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

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

const ITEMS_PER_PAGE = 5;

export const SignaturePackageViewer = memo(function SignaturePackageViewer({ packageData, status, delegationChain }: SignaturePackageViewerProps) {
  const [decisionsPage, setDecisionsPage] = useState(1);
  const [actionsPage, setActionsPage] = useState(1);

  const statusConfig = useMemo(() => ({
    pending: { icon: Clock, color: 'bg-yellow-500', label: 'Pending' },
    approved: { icon: CheckCircle2, color: 'bg-green-500', label: 'Approved' },
    delegated: { icon: Shield, color: 'bg-blue-500', label: 'Delegated' },
    rejected: { icon: FileText, color: 'bg-red-500', label: 'Rejected' },
  }), []);

  const StatusIcon = statusConfig[status as keyof typeof statusConfig]?.icon || FileText;
  const statusColor = statusConfig[status as keyof typeof statusConfig]?.color || 'bg-gray-500';
  const statusLabel = statusConfig[status as keyof typeof statusConfig]?.label || status;

  // Paginated data
  const paginatedDecisions = useMemo(() => {
    const start = (decisionsPage - 1) * ITEMS_PER_PAGE;
    return packageData.decisions.slice(start, start + ITEMS_PER_PAGE);
  }, [packageData.decisions, decisionsPage]);

  const paginatedActions = useMemo(() => {
    const start = (actionsPage - 1) * ITEMS_PER_PAGE;
    return packageData.actions.slice(start, start + ITEMS_PER_PAGE);
  }, [packageData.actions, actionsPage]);

  const totalDecisionPages = Math.ceil(packageData.decisions.length / ITEMS_PER_PAGE);
  const totalActionPages = Math.ceil(packageData.actions.length / ITEMS_PER_PAGE);

  // Check if content contains Ethiopic script
  const hasEthiopicScript = useMemo(() => 
    /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/.test(packageData.minutes),
    [packageData.minutes]
  );

  return (
    <div className="space-y-6">
      {/* Ethio Telecom Header */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B00] via-[#FF8C00] to-[#00A651] opacity-95" />
        <img 
          src={ethioTelecomHeader} 
          alt="Ethio Telecom Header" 
          className="w-full h-48 object-cover mix-blend-overlay opacity-20"
        />
        <div className="absolute inset-0 flex items-center justify-between px-12">
          <div className="flex items-center gap-6">
            <img 
              src={ethioTelecomLogo} 
              alt="Ethio Telecom" 
              className="h-20 w-auto filter brightness-0 invert drop-shadow-lg"
            />
            <div className="text-white">
              <h1 className="text-4xl font-bold tracking-tight font-display drop-shadow-md">
                Ethio Telecom
              </h1>
              <p className="text-lg font-medium tracking-wider uppercase opacity-95 mt-1">
                Official Meeting Minutes
              </p>
            </div>
          </div>
          <div className="text-right text-white/90 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
            <Badge className={`${statusColor} text-white mb-2`}>
              <StatusIcon className="w-4 h-4 mr-1" />
              {statusLabel}
            </Badge>
            <p className="text-sm font-semibold tracking-wide">DOC-{Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
            <p className="text-xs opacity-90">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      <Card className="p-8 border-2 border-primary/20 shadow-lg">

        {/* Approval Stamp */}
        {status === 'approved' && (
          <div className="mb-6 p-8 rounded-xl relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600 text-white shadow-2xl">
            <div className="absolute top-0 right-0 text-[200px] opacity-10 font-black leading-none">✓</div>
            <div className="relative z-10 flex items-start gap-6">
              <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                <CheckCircle2 className="w-16 h-16 text-white drop-shadow-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-3xl font-black tracking-tight mb-3 drop-shadow-md">
                  ✓ OFFICIALLY APPROVED & SIGNED
                </h3>
                <p className="text-lg font-medium mb-4 text-white/95">
                  This document has been officially approved and digitally signed by the authorized signatory.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 border border-white/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm font-bold uppercase tracking-wide">Digital Signature</span>
                    </div>
                    <p className="text-xs opacity-90">Applied & Verified</p>
                  </div>
                  <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 border border-white/30">
                    <p className="text-sm font-bold uppercase tracking-wide mb-1">Timestamp</p>
                    <p className="text-xs opacity-90">{new Date().toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4 bg-white/15 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1">Document Hash</p>
                  <code className="text-xs font-mono opacity-90 break-all">
                    {Math.random().toString(36).substring(2, 15)}{Math.random().toString(36).substring(2, 15)}...
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delegation Chain */}
        {delegationChain && delegationChain.length > 0 && (
          <div className="mb-6 p-6 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border-2 border-primary/20">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-primary">
              <Shield className="w-5 h-5" />
              Delegation Chain
            </h3>
            <div className="space-y-3">
              {delegationChain.map((delegation, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-background/80 backdrop-blur-sm rounded-lg border border-border/50">
                  <span className="font-semibold text-foreground">{delegation.delegated_from}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold text-foreground">{delegation.delegated_to}</span>
                  <Badge variant="secondary" className="ml-2">{delegation.reason_code}</Badge>
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
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-3 text-primary border-b-4 border-primary pb-3">
              <div className="bg-primary text-primary-foreground rounded-xl p-2">
                <FileText className="w-6 h-6" />
              </div>
              Meeting Minutes
            </h3>
            <div className={`prose prose-sm max-w-none bg-background/50 backdrop-blur-sm p-8 rounded-xl border-2 border-primary/20 shadow-md ${hasEthiopicScript ? 'font-ethiopic' : ''}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  h1: ({ children }) => <h1 className={`text-2xl font-bold text-primary mt-6 mb-4 pb-2 border-b-2 border-primary/30 ${hasEthiopicScript ? 'leading-loose tracking-wide' : ''}`}>{children}</h1>,
                  h2: ({ children }) => <h2 className={`text-xl font-semibold text-secondary mt-5 mb-3 ${hasEthiopicScript ? 'leading-loose tracking-wide' : ''}`}>{children}</h2>,
                  h3: ({ children }) => <h3 className={`text-lg font-semibold text-foreground mt-4 mb-2 ${hasEthiopicScript ? 'leading-loose tracking-wide' : ''}`}>{children}</h3>,
                  p: ({ children }) => <p className={`my-3 text-foreground/90 leading-relaxed ${hasEthiopicScript ? 'text-[15px] leading-loose tracking-wider' : ''}`}>{children}</p>,
                  ul: ({ children }) => <ul className="my-4 ml-6 space-y-2">{children}</ul>,
                  ol: ({ children }) => <ol className="my-4 ml-6 space-y-2">{children}</ol>,
                  li: ({ children }) => <li className={`text-foreground/90 ${hasEthiopicScript ? 'text-[15px] leading-loose tracking-wider' : ''}`}>{children}</li>,
                  strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                  em: ({ children }) => <em className="italic text-secondary">{children}</em>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">{children}</blockquote>,
                  table: ({ children }) => <table className="w-full border-collapse my-4">{children}</table>,
                  th: ({ children }) => <th className="border border-border bg-muted p-2 text-left font-semibold">{children}</th>,
                  td: ({ children }) => <td className={`border border-border p-2 ${hasEthiopicScript ? 'text-[15px] leading-loose' : ''}`}>{children}</td>,
                }}
              >
                {packageData.minutes}
              </ReactMarkdown>
            </div>
          </div>

          <Separator className="my-8 bg-primary/20" />

          {/* Decisions with Pagination */}
          {packageData.decisions.length > 0 && (
            <>
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold flex items-center gap-3 text-primary">
                    <div className="bg-amber-500 text-white rounded-xl p-2">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    Decisions ({packageData.decisions.length})
                  </h3>
                {totalDecisionPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDecisionsPage(p => Math.max(1, p - 1))}
                      disabled={decisionsPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {decisionsPage} / {totalDecisionPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDecisionsPage(p => Math.min(totalDecisionPages, p + 1))}
                      disabled={decisionsPage === totalDecisionPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                </div>
                <div className="space-y-4">
                  {paginatedDecisions.map((decision, idx) => (
                    <div key={idx} className="p-6 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 border-l-4 border-amber-500 shadow-md">
                      <p className="font-bold text-lg mb-2 text-amber-900 dark:text-amber-100">{decision.decision_text}</p>
                      {decision.context && (
                        <p className="text-sm text-amber-800 dark:text-amber-200 mb-3 leading-relaxed">{decision.context}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(decision.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator className="my-8 bg-primary/20" />
          </>
        )}

          {/* Action Items with Pagination */}
          {packageData.actions.length > 0 && (
            <>
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold flex items-center gap-3 text-primary">
                    <div className="bg-blue-500 text-white rounded-xl p-2">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    Action Items ({packageData.actions.length})
                  </h3>
                {totalActionPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActionsPage(p => Math.max(1, p - 1))}
                      disabled={actionsPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {actionsPage} / {totalActionPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActionsPage(p => Math.min(totalActionPages, p + 1))}
                      disabled={actionsPage === totalActionPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                </div>
                <div className="space-y-4">
                  {paginatedActions.map((action, idx) => (
                    <div key={idx} className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950 dark:to-sky-950 border-l-4 border-blue-500 shadow-md">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-bold text-lg mb-2 text-blue-900 dark:text-blue-100">{action.title}</p>
                          <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                            <p className="flex items-center gap-2">
                              <span className="font-semibold">Assigned to:</span>
                              <span>{action.assigned_to}</span>
                            </p>
                            {action.due_date && (
                              <p className="flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                <span className="font-semibold">Due:</span>
                                <span>{new Date(action.due_date).toLocaleDateString()}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant={action.priority === 'high' ? 'destructive' : action.priority === 'medium' ? 'default' : 'secondary'}
                          className="text-xs font-bold uppercase"
                        >
                          {action.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator className="my-8 bg-primary/20" />
          </>
        )}

          {/* Sensitive Sections */}
          {packageData.sensitiveSections.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-3 text-destructive">
                <div className="bg-destructive text-destructive-foreground rounded-xl p-2">
                  <Shield className="w-6 h-6" />
                </div>
                Sensitive Sections ({packageData.sensitiveSections.length})
              </h3>
              <div className="space-y-3">
                {packageData.sensitiveSections.map((section, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 bg-destructive/5 border-2 border-destructive/20 rounded-xl">
                    <Badge variant="secondary" className="text-xs font-bold uppercase">{section.section_type}</Badge>
                    <Badge variant={section.sensitivity_level === 'restricted' ? 'destructive' : 'outline'} className="text-xs font-bold uppercase">
                      {section.sensitivity_level}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
});
