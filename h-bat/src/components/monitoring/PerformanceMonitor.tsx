'use client';

import { useEffect, useState } from 'react';
import { getEnvironmentConfig } from '@/config/environment';

interface PerformanceMetrics {
  navigationTiming: {
    loadTime: number;
    domContentLoaded: number;
    firstPaint?: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
  };
  resources: {
    count: number;
    totalSize: number;
    averageLoadTime: number;
  };
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
}

interface PerformanceMonitorProps {
  enabledInProduction?: boolean;
  reportInterval?: number;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

/**
 * パフォーマンス監視コンポーネント
 * 
 * Web Vitals や Navigation Timing API を使用して
 * アプリケーションのパフォーマンスを監視します。
 */
export function PerformanceMonitor({
  enabledInProduction = false,
  reportInterval = 30000, // 30秒
  onMetricsUpdate,
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const env = getEnvironmentConfig();
    
    // 有効化条件をチェック
    const shouldEnable = env.features.performanceMonitoring && 
      (env.app.isDevelopment || env.app.isStaging || enabledInProduction);
    
    setIsEnabled(shouldEnable);

    if (!shouldEnable || typeof window === 'undefined') {
      return;
    }

    // パフォーマンスメトリクス収集
    const collectMetrics = (): PerformanceMetrics | null => {
      try {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const resources = performance.getEntriesByType('resource');
        
        // Web Vitals の収集
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')?.startTime;
        const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime;

        // LCP は PerformanceObserver で別途収集される
        let largestContentfulPaint: number | undefined;
        
        if ('PerformanceObserver' in window) {
          try {
            const lcpObserver = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              if (entries.length > 0) {
                const lastEntry = entries[entries.length - 1];
                if (lastEntry) {
                  largestContentfulPaint = lastEntry.startTime;
                }
              }
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          } catch (error) {
            console.warn('LCP observer not supported:', error);
          }
        }

        // メモリ使用量（Chrome のみ）
        const memory = (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        } : undefined;

        // ネットワーク情報（サポートされている場合）
        const connection = (navigator as any).connection ? {
          effectiveType: (navigator as any).connection.effectiveType,
          downlink: (navigator as any).connection.downlink,
          rtt: (navigator as any).connection.rtt,
        } : undefined;

        const resourcesData = {
          count: resources.length,
          totalSize: resources.reduce((sum, resource) => {
            return sum + (resource.transferSize || 0);
          }, 0),
          averageLoadTime: resources.length > 0 
            ? resources.reduce((sum, resource) => sum + resource.duration, 0) / resources.length
            : 0,
        };

        return {
          navigationTiming: {
            loadTime: navigation.loadEventEnd - navigation.navigationStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
            firstPaint,
            firstContentfulPaint,
            largestContentfulPaint,
          },
          resources: resourcesData,
          memory,
          connection,
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
    const env = getEnvironmentConfig();
    
    if (!env.app.isDevelopment || !metrics) {
      return;
    }

    const warnings = [];

    // ロード時間の警告
    if (metrics.navigationTiming.loadTime > 3000) {
      warnings.push(`⚠️ Slow page load: ${(metrics.navigationTiming.loadTime / 1000).toFixed(2)}s`);
    }

    // FCP の警告
    if (metrics.navigationTiming.firstContentfulPaint && metrics.navigationTiming.firstContentfulPaint > 2500) {
      warnings.push(`⚠️ Slow FCP: ${(metrics.navigationTiming.firstContentfulPaint / 1000).toFixed(2)}s`);
    }

    // LCP の警告
    if (metrics.navigationTiming.largestContentfulPaint && metrics.navigationTiming.largestContentfulPaint > 4000) {
      warnings.push(`⚠️ Slow LCP: ${(metrics.navigationTiming.largestContentfulPaint / 1000).toFixed(2)}s`);
    }

    // メモリ使用量の警告
    if (metrics.memory && metrics.memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB
      warnings.push(`⚠️ High memory usage: ${(metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
    }

    // リソースサイズの警告
    if (metrics.resources.totalSize > 5 * 1024 * 1024) { // 5MB
      warnings.push(`⚠️ Large bundle size: ${(metrics.resources.totalSize / 1024 / 1024).toFixed(2)}MB`);
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

  const env = getEnvironmentConfig();

  // 開発環境でのみ詳細表示
  if (env.app.isDevelopment && metrics) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-black/80 text-white text-xs p-3 rounded-lg backdrop-blur-sm max-w-xs">
        <div className="font-semibold mb-2">⚡ Performance</div>
        <div className="space-y-1">
          <div>Load: {(metrics.navigationTiming.loadTime / 1000).toFixed(2)}s</div>
          <div>DOMContentLoaded: {(metrics.navigationTiming.domContentLoaded / 1000).toFixed(2)}s</div>
          {metrics.navigationTiming.firstContentfulPaint && (
            <div>FCP: {(metrics.navigationTiming.firstContentfulPaint / 1000).toFixed(2)}s</div>
          )}
          {metrics.navigationTiming.largestContentfulPaint && (
            <div>LCP: {(metrics.navigationTiming.largestContentfulPaint / 1000).toFixed(2)}s</div>
          )}
          <div>Resources: {metrics.resources.count}</div>
          <div>Size: {(metrics.resources.totalSize / 1024).toFixed(0)}KB</div>
          {metrics.memory && (
            <div>Memory: {(metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
          )}
          {metrics.connection && (
            <div>Network: {metrics.connection.effectiveType}</div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Web Vitals レポート用のフック
 */
export function useWebVitals(callback?: (metric: any) => void) {
  useEffect(() => {
    const env = getEnvironmentConfig();
    
    if (!env.features.performanceMonitoring) {
      return;
    }

    // Web Vitals の動的インポート
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(callback);
      getFID(callback);
      getFCP(callback);
      getLCP(callback);
      getTTFB(callback);
    }).catch((error) => {
      console.warn('Web Vitals not available:', error);
    });
  }, [callback]);
}

export default PerformanceMonitor; 