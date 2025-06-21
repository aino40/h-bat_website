import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  max: number
  variant?: 'default' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value, 
    max, 
    variant = 'default', 
    showLabel = false,
    size = 'md',
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    
    const baseStyles = 'w-full bg-gray-200 rounded-full overflow-hidden'
    
    const variants = {
      default: 'bg-primary-500',
      success: 'bg-green-500',
      warning: 'bg-orange-500',
      error: 'bg-red-500'
    }
    
    const sizes = {
      sm: 'h-2',
      md: 'h-3',
      lg: 'h-4'
    }

    return (
      <div className="space-y-2">
        {showLabel && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        )}
        <div
          className={cn(baseStyles, sizes[size], className)}
          ref={ref}
          {...props}
        >
          <div
            className={cn(
              'h-full transition-all duration-500 ease-out rounded-full',
              variants[variant]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }
)

Progress.displayName = 'Progress'

export { Progress, type ProgressProps } 