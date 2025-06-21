import { Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VolumeIndicatorProps {
  level: number // 0-100
  threshold?: number // 閾値表示
  variant?: 'linear' | 'circular'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function VolumeIndicator({
  level,
  threshold,
  variant = 'linear',
  size = 'md',
  showLabel = true,
  className
}: VolumeIndicatorProps) {
  const clampedLevel = Math.min(Math.max(level, 0), 100)
  
  const sizes = {
    sm: { width: 'w-32', height: 'h-2', text: 'text-xs' },
    md: { width: 'w-48', height: 'h-3', text: 'text-sm' },
    lg: { width: 'w-64', height: 'h-4', text: 'text-base' }
  }
  
  const sizeConfig = sizes[size]
  
  // 音量レベルに基づく色の決定
  const getVolumeColor = (level: number) => {
    if (level === 0) return 'bg-gray-300'
    if (level < 30) return 'bg-green-500'
    if (level < 70) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (variant === 'circular') {
    const circumference = 2 * Math.PI * 45 // radius = 45
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (clampedLevel / 100) * circumference
    
    return (
      <div className={cn('flex flex-col items-center space-y-2', className)}>
        <div className="relative">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className={cn(
                'transition-all duration-500 ease-out',
                clampedLevel === 0 ? 'text-gray-300' :
                clampedLevel < 30 ? 'text-green-500' :
                clampedLevel < 70 ? 'text-orange-500' : 'text-red-500'
              )}
              strokeLinecap="round"
            />
            {/* Threshold marker */}
            {threshold && (
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="2"
                fill="transparent"
                strokeDasharray="2 4"
                className="text-blue-500"
                transform={`rotate(${(threshold / 100) * 360 - 90} 50 50)`}
              />
            )}
          </svg>
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            {clampedLevel === 0 ? (
              <VolumeX className="w-6 h-6 text-gray-400" />
            ) : (
              <Volume2 className="w-6 h-6 text-gray-600" />
            )}
          </div>
        </div>
        
        {showLabel && (
          <div className={cn('text-center', sizeConfig.text)}>
            <div className="font-semibold">{Math.round(clampedLevel)}%</div>
            {threshold && (
              <div className="text-xs text-gray-500">
                閾値: {Math.round(threshold)}%
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Linear variant
  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {clampedLevel === 0 ? (
              <VolumeX className="w-4 h-4 text-gray-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-gray-600" />
            )}
            <span className={cn('font-medium', sizeConfig.text)}>音量</span>
          </div>
          <span className={cn('font-semibold', sizeConfig.text)}>
            {Math.round(clampedLevel)}%
          </span>
        </div>
      )}
      
      <div className="relative">
        {/* Background bar */}
        <div className={cn(
          'bg-gray-200 rounded-full overflow-hidden',
          sizeConfig.width,
          sizeConfig.height
        )}>
          {/* Volume bar */}
          <div
            className={cn(
              'h-full transition-all duration-300 ease-out rounded-full',
              getVolumeColor(clampedLevel)
            )}
            style={{ width: `${clampedLevel}%` }}
          />
        </div>
        
        {/* Threshold marker */}
        {threshold && (
          <div
            className="absolute top-0 h-full w-0.5 bg-blue-500"
            style={{ left: `${threshold}%` }}
          >
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full" />
          </div>
        )}
      </div>
      
      {threshold && showLabel && (
        <div className={cn('text-center text-blue-600', sizeConfig.text)}>
          閾値: {Math.round(threshold)}%
        </div>
      )}
    </div>
  )
} 