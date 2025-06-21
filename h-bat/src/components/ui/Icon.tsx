import { 
  Volume2,        // 音量・音響
  Headphones,     // ヘッドフォン
  Play,          // 再生
  Pause,         // 一時停止
  RotateCcw,     // リセット
  ChevronRight,  // 進む
  ChevronLeft,   // 戻る
  Check,         // 成功
  X,             // エラー
  Settings,      // 設定
  BarChart3,     // グラフ・結果
  User,          // ユーザー
  Clock,         // 時間・テンポ
  Zap,           // エネルギー・アクセント
  Waves,         // 音波
  Shield,        // セキュリティ・管理者
  TrendingUp,    // 上昇トレンド
  TrendingDown,  // 下降トレンド
  Download,      // ダウンロード
  Upload,        // アップロード
  Eye,           // 表示
  EyeOff,        // 非表示
  Home,          // ホーム
  Users,         // ユーザー一覧
  FileText,      // ドキュメント
  Calendar,      // カレンダー
  Search,        // 検索
  Filter,        // フィルター
  Menu,          // メニュー
  Bell,          // 通知
  Mail,          // メール
  Phone,         // 電話
  MapPin,        // 位置
  Star,          // お気に入り
  Heart,         // いいね
  Share,         // 共有
  Copy,          // コピー
  Edit,          // 編集
  Trash,         // 削除
  Plus,          // 追加
  Minus,         // 削除
  Loader2,       // ローディング
  AlertCircle,   // 警告
  CheckCircle,   // 成功
  XCircle,       // エラー
  Info,          // 情報
  HelpCircle,    // ヘルプ
  ExternalLink,  // 外部リンク
  LogOut,        // ログアウト
  LogIn,         // ログイン
  RefreshCw,     // 更新
  type LucideIcon
} from 'lucide-react'

import { cn } from '@/lib/utils'

// H-BAT専用アイコンマッピング
export const icons = {
  // 音響関連
  volume: Volume2,
  headphones: Headphones,
  play: Play,
  pause: Pause,
  replay: RotateCcw,
  waves: Waves,
  
  // ナビゲーション
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  home: Home,
  menu: Menu,
  
  // ステータス
  check: Check,
  close: X,
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  
  // データ・分析
  chart: BarChart3,
  trendUp: TrendingUp,
  trendDown: TrendingDown,
  
  // ユーザー・認証
  user: User,
  users: Users,
  shield: Shield,
  login: LogIn,
  logout: LogOut,
  
  // アクション
  settings: Settings,
  download: Download,
  upload: Upload,
  search: Search,
  filter: Filter,
  edit: Edit,
  trash: Trash,
  copy: Copy,
  share: Share,
  plus: Plus,
  minus: Minus,
  
  // 表示制御
  eye: Eye,
  eyeOff: EyeOff,
  
  // 時間・進捗
  clock: Clock,
  calendar: Calendar,
  
  // 通信・連絡
  bell: Bell,
  mail: Mail,
  phone: Phone,
  
  // その他
  star: Star,
  heart: Heart,
  mapPin: MapPin,
  help: HelpCircle,
  external: ExternalLink,
  refresh: RefreshCw,
  loading: Loader2,
  document: FileText,
  energy: Zap,
} as const

// アイコンサイズ定義
export const iconSizes = {
  xs: 14,    // 小アイコン
  sm: 16,    // 通常アイコン
  md: 20,    // 中アイコン
  lg: 24,    // 大アイコン
  xl: 32,    // 特大アイコン
  '2xl': 40, // 超大アイコン
} as const

export type IconName = keyof typeof icons
export type IconSize = keyof typeof iconSizes

interface IconProps {
  name: IconName
  size?: IconSize | number
  className?: string
  color?: string
}

export function Icon({ 
  name, 
  size = 'sm', 
  className, 
  color 
}: IconProps) {
  const IconComponent = icons[name] as LucideIcon
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`)
    return null
  }
  
  const iconSize = typeof size === 'number' ? size : iconSizes[size]
  
  return (
    <IconComponent
      size={iconSize}
      className={cn(className)}
      style={color ? { color } : undefined}
    />
  )
}

// 特定用途のアイコンコンポーネント
export function AudioIcon({ size = 'md', className, ...props }: Omit<IconProps, 'name'>) {
  return <Icon name="volume" size={size} className={cn('text-primary-500', className)} {...props} />
}

export function PlayIcon({ size = 'md', className, ...props }: Omit<IconProps, 'name'>) {
  return <Icon name="play" size={size} className={cn('text-green-500', className)} {...props} />
}

export function PauseIcon({ size = 'md', className, ...props }: Omit<IconProps, 'name'>) {
  return <Icon name="pause" size={size} className={cn('text-orange-500', className)} {...props} />
}

export function SuccessIcon({ size = 'md', className, ...props }: Omit<IconProps, 'name'>) {
  return <Icon name="success" size={size} className={cn('text-green-500', className)} {...props} />
}

export function ErrorIcon({ size = 'md', className, ...props }: Omit<IconProps, 'name'>) {
  return <Icon name="error" size={size} className={cn('text-red-500', className)} {...props} />
}

export function WarningIcon({ size = 'md', className, ...props }: Omit<IconProps, 'name'>) {
  return <Icon name="warning" size={size} className={cn('text-orange-500', className)} {...props} />
}

export function LoadingIcon({ size = 'md', className, ...props }: Omit<IconProps, 'name'>) {
  return <Icon name="loading" size={size} className={cn('animate-spin text-primary-500', className)} {...props} />
}

// アイコンユーティリティ
export function getIconComponent(name: IconName): LucideIcon | null {
  return icons[name] || null
}

export function getAllIconNames(): IconName[] {
  return Object.keys(icons) as IconName[]
} 