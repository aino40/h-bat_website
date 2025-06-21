import { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: {
    value: number
    type: 'increase' | 'decrease'
  }
  variant?: 'primary' | 'secondary' | 'success' | 'warning'
  className?: string
}

export function StatsCard({
  title,
  value,
  icon,
  trend,
  variant = 'primary',
  className
}: StatsCardProps) {
  const variants = {
    primary: {
      bg: 'bg-gradient-to-br from-primary-500 to-primary-600',
      text: 'text-white',
      iconBg: 'bg-white/20'
    },
    secondary: {
      bg: 'bg-gradient-to-br from-gray-500 to-gray-600',
      text: 'text-white',
      iconBg: 'bg-white/20'
    },
    success: {
      bg: 'bg-gradient-to-br from-green-500 to-green-600',
      text: 'text-white',
      iconBg: 'bg-white/20'
    },
    warning: {
      bg: 'bg-gradient-to-br from-orange-500 to-orange-600',
      text: 'text-white',
      iconBg: 'bg-white/20'
    }
  }
  
  const variantStyles = variants[variant]
  
  return (
    <Card 
      variant="elevated" 
      padding="lg"
      className={cn(
        'relative overflow-hidden transition-all duration-200 hover:scale-105',
        variantStyles.bg,
        variantStyles.text,
        className
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium opacity-90">
              {title}
            </p>
            <p className="text-3xl font-bold">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            
            {trend && (
              <div className="flex items-center space-x-1">
                {trend.type === 'increase' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </span>
                <span className="text-xs opacity-75">
                  前月比
                </span>
              </div>
            )}
          </div>
          
          <div className={cn(
            'p-3 rounded-full',
            variantStyles.iconBg
          )}>
            <div className="w-8 h-8 flex items-center justify-center">
              {icon}
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5" />
      </CardContent>
    </Card>
  )
} 