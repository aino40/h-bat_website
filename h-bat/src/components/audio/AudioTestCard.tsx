import { ReactNode } from 'react'
import { Play, Pause, Volume2, RotateCcw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { cn } from '@/lib/utils'

interface AudioTestCardProps {
  title: string
  description: string
  currentTrial: number
  totalTrials: number
  onAnswer: (answer: string) => void
  isPlaying: boolean
  onPlay?: () => void
  onPause?: () => void
  onReplay?: () => void
  answerOptions?: Array<{
    value: string
    label: string
    variant?: 'primary' | 'secondary'
    icon?: ReactNode
  }>
  className?: string
  isLoading?: boolean
}

export function AudioTestCard({
  title,
  description,
  currentTrial,
  totalTrials,
  onAnswer,
  isPlaying,
  onPlay,
  onPause,
  onReplay,
  answerOptions,
  className,
  isLoading = false
}: AudioTestCardProps) {
  return (
    <Card 
      variant="elevated" 
      className={cn(
        'w-full max-w-2xl mx-auto animate-fade-in',
        className
      )}
    >
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Volume2 className="w-6 h-6 text-primary-500" />
          {title}
        </CardTitle>
        <CardDescription className="text-lg">
          {description}
        </CardDescription>
        
        {/* Progress */}
        <div className="mt-4">
          <Progress 
            value={currentTrial} 
            max={totalTrials} 
            showLabel 
            variant="default"
            className="mb-2"
          />
          <p className="text-sm text-gray-500">
            試行 {currentTrial} / {totalTrials}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Audio Controls */}
        <div className="flex justify-center items-center gap-4">
          <Button
            variant="primary"
            size="lg"
            icon={isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            onClick={isPlaying ? onPause : onPlay}
            isLoading={isLoading}
            className="shadow-audio"
          >
            {isPlaying ? '一時停止' : '音を再生'}
          </Button>
          
          {onReplay && (
            <Button
              variant="outline"
              size="lg"
              icon={<RotateCcw className="w-5 h-5" />}
              onClick={onReplay}
              disabled={isLoading}
            >
              もう一度
            </Button>
          )}
        </div>

        {/* Answer Options */}
        {answerOptions && (
          <div className="space-y-4">
            <p className="text-center text-lg font-medium text-gray-700">
              どちらに聞こえますか？
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {answerOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={option.variant || 'outline'}
                  size="lg"
                  icon={option.icon}
                  onClick={() => onAnswer(option.value)}
                  disabled={isLoading}
                  className="h-16 text-lg font-semibold"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-gray-500 text-center">
          💡 ヒント: ヘッドフォンを着用し、静かな環境で実施してください
        </p>
      </CardFooter>
    </Card>
  )
} 