'use client';

import { useEffect, useState } from 'react';
import { getCurrentConfig, ENV } from '@/config/environment';

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  resourceCount: number;
}

interface PerformanceMonitorProps {
  enabledInProduction?: boolean;
  reportInterval?: number;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

/**
 * 簡易パフォーマンス監視コンポーネント
 * 
 * 基本的なページロード時間を監視します。
 */
export function PerformanceMonitor({
  enabledInProduction = false,
  reportInterval = 30000,
  onMetricsUpdate,
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const config = getCurrentConfig();
    
    // 有効化条件をチェック
    const shouldEnable = config.ENABLE_DEVTOOLS && 
      (ENV.IS_DEVELOPMENT || ENV.IS_STAGING || enabledInProduction);
    
    setIsEnabled(shouldEnable);

    if (!shouldEnable || typeof window === 'undefined') {
      return;
    }

    // 簡易パフォーマンスメトリクス収集
    const collectMetrics = (): PerformanceMetrics | null => {
      try {
        if (!performance.timing) {
          return null;
        }

        const timing = performance.timing;
        const resources = performance.getEntriesByType('resource');
        
        return {
          loadTime: timing.loadEventEnd - timing.navigationStart,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          resourceCount: resources.length,
        };
      } catch (error) {
        console.error('Failed to collect performance metrics:', error);
        return null;
      }
    };

    // 初回メトリクス収集
    const initialMetrics = collectMetrics();
    if (initialMetrics) {
      setMetrics(initialMetrics);
      onMetricsUpdate?.(initialMetrics);
    }

    // 定期的なメトリクス更新
    const interval = setInterval(() => {
      const currentMetrics = collectMetrics();
      if (currentMetrics) {
        setMetrics(currentMetrics);
        onMetricsUpdate?.(currentMetrics);
      }
    }, reportInterval);

    return () => clearInterval(interval);
  }, [enabledInProduction, reportInterval, onMetricsUpdate]);

  // パフォーマンス警告の表示（開発環境のみ）
  useEffect(() => {
    if (!ENV.IS_DEVELOPMENT || !metrics) {
      return;
    }

    const warnings = [];

    // ロード時間の警告
    if (metrics.loadTime > 3000) {
      warnings.push(`⚠️ Slow page load: ${(metrics.loadTime / 1000).toFixed(2)}s`);
    }

    if (warnings.length > 0) {
      console.group('🚨 Performance Warnings');
      warnings.forEach(warning => console.warn(warning));
      console.groupEnd();
    }
  }, [metrics]);

  // 本番環境では何も表示しない
  if (!isEnabled) {
    return null;
  }

  // 開発環境でのみ詳細表示
  if (ENV.IS_DEVELOPMENT && metrics) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-black/80 text-white text-xs p-3 rounded-lg backdrop-blur-sm max-w-xs">
        <div className="font-semibold mb-2">⚡ Performance</div>
        <div className="space-y-1">
          <div>Load: {(metrics.loadTime / 1000).toFixed(2)}s</div>
          <div>DOM: {(metrics.domContentLoaded / 1000).toFixed(2)}s</div>
          <div>Resources: {metrics.resourceCount}</div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * 簡易Web Vitals レポート用のフック
 */
export function useWebVitals(callback?: (metric: any) => void) {
  useEffect(() => {
    const config = getCurrentConfig();
    
    if (!config.ENABLE_DEVTOOLS) {
      return;
    }

    // 基本的なパフォーマンス情報のみ収集
    if (typeof window !== 'undefined' && performance.timing) {
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      if (callback && loadTime > 0) {
        callback({
          name: 'page-load',
          value: loadTime,
          id: 'page-load-' + Date.now(),
        });
      }
    }
  }, [callback]);
}

export default PerformanceMonitor; 