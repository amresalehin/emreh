import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Clock,
  KeyRound,
  ShieldAlert,
  ServerCrash,
  SearchX,
  X,
  ExternalLink,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { SyncErrorCategory, RateLimitDetails } from '../../utils/resilientFetch';

export interface SyncStatusBannerProps {
  type?: 'error' | 'warning' | 'success' | 'info';
  category?: SyncErrorCategory;
  statusCode?: number;
  message: string;
  rateLimit?: RateLimitDetails;
  isProxied?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
  onDismiss?: () => void;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const SyncStatusBanner: React.FC<SyncStatusBannerProps> = ({
  type = 'error',
  category = 'unknown',
  statusCode,
  message,
  rateLimit,
  isProxied = false,
  onRetry,
  isRetrying = false,
  onDismiss,
  actionButton,
  className = ''
}) => {
  // Rate limit countdown timer
  const initialSeconds = rateLimit?.retryAfterSeconds || (statusCode === 429 ? 60 : 0);
  const [countdown, setCountdown] = useState<number>(initialSeconds);

  useEffect(() => {
    setCountdown(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Derived styling & icons
  const isRateLimited = category === 'rate_limit' || statusCode === 429 || countdown > 0;

  const getIcon = () => {
    if (type === 'success') return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
    if (isRateLimited) return <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />;
    if (category === 'auth') return <KeyRound className="w-5 h-5 text-red-400 shrink-0" />;
    if (category === 'forbidden') return <ShieldAlert className="w-5 h-5 text-orange-400 shrink-0" />;
    if (category === 'server') return <ServerCrash className="w-5 h-5 text-purple-400 shrink-0" />;
    if (category === 'not_found') return <SearchX className="w-5 h-5 text-blue-400 shrink-0" />;
    return <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
  };

  const getContainerStyles = () => {
    if (type === 'success') {
      return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200';
    }
    if (isRateLimited) {
      return 'bg-amber-500/15 border-amber-500/40 text-amber-200';
    }
    if (category === 'auth') {
      return 'bg-rose-500/15 border-rose-500/40 text-rose-200';
    }
    if (category === 'server') {
      return 'bg-purple-500/15 border-purple-500/40 text-purple-200';
    }
    return 'bg-red-500/15 border-red-500/30 text-red-200';
  };

  const getTitle = () => {
    if (type === 'success') return 'Synchronization Complete';
    if (isRateLimited) return 'API Rate Limit Reached';
    if (category === 'auth') return 'Authentication Failed (HTTP 401)';
    if (category === 'forbidden') return 'Access Forbidden (HTTP 403)';
    if (category === 'not_found') return 'Resource Not Found (HTTP 404)';
    if (category === 'server') return `Server Error (HTTP ${statusCode || 500})`;
    if (category === 'network') return 'Network Connection Issue';
    return statusCode ? `Sync Error (HTTP ${statusCode})` : 'Sync Notice';
  };

  return (
    <div
      id="sync-status-banner"
      className={`relative p-3.5 rounded-xl border backdrop-blur-md transition-all shadow-lg ${getContainerStyles()} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              {getTitle()}
            </span>

            {/* Backend Proxy Indicator */}
            {isProxied && (
              <span
                id="sync-proxy-badge"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                title="Request securely routed via Express server proxy to bypass browser CORS"
              >
                <ShieldCheck className="w-3 h-3" />
                Backend Proxy Active
              </span>
            )}

            {/* Rate Limit Countdown Pill */}
            {isRateLimited && countdown > 0 && (
              <span
                id="rate-limit-countdown-badge"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40 animate-pulse"
              >
                <Clock className="w-3 h-3" />
                Retry in {countdown}s
              </span>
            )}
          </div>

          <p className="text-xs leading-relaxed opacity-95 break-words">
            {message}
          </p>

          {/* Contextual guidance tips */}
          {category === 'auth' && (
            <p className="text-[11px] mt-1.5 opacity-80 text-rose-300">
              Tip: Access tokens may expire or require specific read scopes (e.g. bookmarks_read). Double check token in settings.
            </p>
          )}

          {isRateLimited && countdown === 0 && (
            <p className="text-[11px] mt-1.5 font-medium text-emerald-300">
              Cool-down period completed! You can retry the synchronization now.
            </p>
          )}

          {/* Action and Retry Buttons */}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {onRetry && (
              <button
                type="button"
                id="sync-retry-btn"
                onClick={onRetry}
                disabled={isRetrying || (isRateLimited && countdown > 0)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                  isRateLimited && countdown > 0
                    ? 'bg-amber-500/20 text-amber-300/60 border border-amber-500/20 cursor-not-allowed'
                    : 'bg-white/15 hover:bg-white/25 active:scale-95 text-white border border-white/20'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : countdown > 0 ? `Wait (${countdown}s)` : 'Retry Now'}
              </button>
            )}

            {actionButton && (
              <button
                type="button"
                id="sync-action-btn"
                onClick={actionButton.onClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-black/20 hover:bg-black/35 text-white/90 border border-white/10 transition-colors"
              >
                {actionButton.label}
              </button>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            id="sync-banner-dismiss-btn"
            onClick={onDismiss}
            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
