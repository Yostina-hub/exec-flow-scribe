import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RetryStatusBadgeProps {
  distributionHistoryId: string;
}

interface RetryInfo {
  status: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  last_error: string | null;
}

export function RetryStatusBadge({ distributionHistoryId }: RetryStatusBadgeProps) {
  const [retryInfo, setRetryInfo] = useState<RetryInfo | null>(null);

  useEffect(() => {
    fetchRetryInfo();

    // Set up realtime subscription
    const channel = supabase
      .channel(`retry-status-${distributionHistoryId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'distribution_retry_queue',
          filter: `distribution_history_id=eq.${distributionHistoryId}`,
        },
        () => {
          fetchRetryInfo();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [distributionHistoryId]);

  const fetchRetryInfo = async () => {
    const { data } = await supabase
      .from('distribution_retry_queue')
      .select('status, retry_count, max_retries, next_retry_at, last_error')
      .eq('distribution_history_id', distributionHistoryId)
      .maybeSingle();

    setRetryInfo(data);
  };

  if (!retryInfo) return null;

  const getRetryBadge = () => {
    switch (retryInfo.status) {
      case 'pending':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Retry Scheduled
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attempt {retryInfo.retry_count + 1}/{retryInfo.max_retries}</p>
                {retryInfo.next_retry_at && (
                  <p className="text-xs">
                    Next: {new Date(retryInfo.next_retry_at).toLocaleString()}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'retrying':
        return (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Retrying {retryInfo.retry_count + 1}/{retryInfo.max_retries}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500 gap-1">
            <RefreshCw className="w-3 h-3" />
            Retry Successful
          </Badge>
        );
      case 'failed':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Retry Failed
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Max retries ({retryInfo.max_retries}) reached</p>
                {retryInfo.last_error && (
                  <p className="text-xs">{retryInfo.last_error}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return null;
    }
  };

  return getRetryBadge();
}
