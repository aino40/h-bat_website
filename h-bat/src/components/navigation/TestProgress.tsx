'use client'

import { motion } from 'framer-motion'
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Headphones, 
  BarChart3, 
  Play, 
  Settings,
  ArrowRight 
} from 'lucide-react'
import { Progress } from '@/components/ui/Progress'

export interface TestStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  status: 'pending' | 'current' | 'completed'
  estimatedTime: number // minutes
}

export interface TestProgressProps {
  currentStep: string
  steps: TestStep[]
  totalProgress: number // 0-100
  onStepClick?: (stepId: string) => void
  showTimeEstimate?: boolean
}

export function TestProgress({ 
  currentStep, 
  steps, 
  totalProgress, 
  onStepClick,
  showTimeEstimate = true 
}: TestProgressProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep)
  const completedSteps = steps.filter(step => step.status === 'completed').length
  const remainingTime = steps
    .filter((step, index) => index >= currentStepIndex)
    .reduce((total, step) => total + step.estimatedTime, 0)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">テスト進捗</h2>
          <p className="text-sm text-gray-600">
            {completedSteps} / {steps.length} 完了
          </p>
        </div>
        {showTimeEstimate && (
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-1" />
            残り約 {remainingTime} 分
          </div>
        )}
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>全体の進捗</span>
          <span>{Math.round(totalProgress)}%</span>
        </div>
        <Progress value={totalProgress} max={100} className="h-2" />
      </div>

      {/* Step List */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`
              flex items-center p-4 rounded-lg border transition-all duration-200
              ${step.status === 'current' 
                ? 'bg-blue-50 border-blue-200 shadow-sm' 
                : step.status === 'completed'
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
              }
              ${onStepClick && step.status !== 'pending' ? 'cursor-pointer hover:shadow-md' : ''}
            `}
            onClick={() => onStepClick && step.status !== 'pending' && onStepClick(step.id)}
          >
            {/* Step Icon */}
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-4
              ${step.status === 'current'
                ? 'bg-blue-100 text-blue-600'
                : step.status === 'completed'
                ? 'bg-green-100 text-green-600'
                : 'bg-gray-100 text-gray-400'
              }
            `}>
              {step.status === 'completed' ? (
                <CheckCircle className="h-5 w-5" />
              ) : step.status === 'current' ? (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {step.icon}
                </motion.div>
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className={`
                  font-medium
                  ${step.status === 'current'
                    ? 'text-blue-900'
                    : step.status === 'completed'
                    ? 'text-green-900'
                    : 'text-gray-500'
                  }
                `}>
                  {step.title}
                </h3>
                {showTimeEstimate && (
                  <span className="text-xs text-gray-500">
                    {step.estimatedTime}分
                  </span>
                )}
              </div>
              <p className={`
                text-sm mt-1
                ${step.status === 'current'
                  ? 'text-blue-700'
                  : step.status === 'completed'
                  ? 'text-green-700'
                  : 'text-gray-400'
                }
              `}>
                {step.description}
              </p>
            </div>

            {/* Status Indicator */}
            {step.status === 'current' && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex-shrink-0 ml-4"
              >
                <ArrowRight className="h-5 w-5 text-blue-600" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Default test steps configuration
export const DEFAULT_TEST_STEPS: TestStep[] = [
  {
    id: 'hearing',
    title: '聴力閾値測定',
    description: '1kHz, 2kHz, 4kHzの純音による聴力測定',
    icon: <Headphones className="h-5 w-5" />,
    status: 'pending',
    estimatedTime: 3
  },
  {
    id: 'bst',
    title: 'BST (拍子判定)',
    description: '2拍子 vs 3拍子の強拍認識テスト',
    icon: <BarChart3 className="h-5 w-5" />,
    status: 'pending',
    estimatedTime: 5
  },
  {
    id: 'bit',
    title: 'BIT (テンポ変化)',
    description: '加速・減速の方向判定テスト',
    icon: <Play className="h-5 w-5" />,
    status: 'pending',
    estimatedTime: 5
  },
  {
    id: 'bfit',
    title: 'BFIT (複雑リズム)',
    description: '不等間隔パターンでのビート発見・判定',
    icon: <Settings className="h-5 w-5" />,
    status: 'pending',
    estimatedTime: 7
  }
] 