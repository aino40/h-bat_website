import { Check, Circle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TestProgressProps {
  currentStep: number
  totalSteps: number
  stepLabels: string[]
  completedSteps: number[]
  className?: string
  variant?: 'horizontal' | 'vertical'
  showLabels?: boolean
}

export function TestProgress({
  currentStep,
  totalSteps,
  stepLabels,
  completedSteps,
  className,
  variant = 'horizontal',
  showLabels = true
}: TestProgressProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1)
  
  const getStepStatus = (step: number) => {
    if (completedSteps.includes(step)) return 'completed'
    if (step === currentStep) return 'current'
    return 'pending'
  }
  
  const getStepIcon = (step: number, status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5 text-white" />
      case 'current':
        return <Clock className="w-5 h-5 text-white" />
      default:
        return <Circle className="w-5 h-5 text-gray-400" />
    }
  }
  
  const getStepStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 border-green-500 text-white'
      case 'current':
        return 'bg-primary-500 border-primary-500 text-white animate-pulse'
      default:
        return 'bg-white border-gray-300 text-gray-400'
    }
  }

  if (variant === 'vertical') {
    return (
      <div className={cn('space-y-4', className)}>
        {steps.map((step, index) => {
          const status = getStepStatus(step)
          const isLast = index === steps.length - 1
          
          return (
            <div key={step} className="flex items-start">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                    getStepStyles(status)
                  )}
                >
                  {getStepIcon(step, status)}
                </div>
                {!isLast && (
                  <div className={cn(
                    'w-0.5 h-8 mt-2',
                    status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                  )} />
                )}
              </div>
              
              {/* Step content */}
              {showLabels && (
                <div className="ml-4 pb-8">
                  <div className={cn(
                    'font-medium',
                    status === 'current' ? 'text-primary-600' :
                    status === 'completed' ? 'text-green-600' : 'text-gray-500'
                  )}>
                    ステップ {step}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {stepLabels[index] || `ステップ ${step}`}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Horizontal variant
  return (
    <div className={cn('w-full', className)}>
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step)
          const isLast = index === steps.length - 1
          
          return (
            <div key={step} className="flex items-center flex-1">
              {/* Step circle */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 relative z-10',
                  getStepStyles(status)
                )}
              >
                <span className="text-sm font-semibold">
                  {status === 'completed' ? <Check className="w-4 h-4" /> : step}
                </span>
              </div>
              
              {/* Connecting line */}
              {!isLast && (
                <div className={cn(
                  'flex-1 h-0.5 mx-2',
                  status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                )} />
              )}
            </div>
          )
        })}
      </div>
      
      {/* Step labels */}
      {showLabels && (
        <div className="flex justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(step)
            
            return (
              <div key={step} className="flex-1 text-center">
                <div className={cn(
                  'text-xs font-medium',
                  status === 'current' ? 'text-primary-600' :
                  status === 'completed' ? 'text-green-600' : 'text-gray-500'
                )}>
                  {stepLabels[index] || `ステップ ${step}`}
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* Progress percentage */}
      <div className="mt-4 text-center">
        <div className="text-sm text-gray-600">
          進捗: {Math.round((completedSteps.length / totalSteps) * 100)}% 完了
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {completedSteps.length} / {totalSteps} ステップ完了
        </div>
      </div>
    </div>
  )
} 