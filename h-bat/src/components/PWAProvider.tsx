'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface PWAContextType {
  isOnline: boolean
  isInstalled: boolean
  isInstallable: boolean
  canInstall: boolean
  installPWA: () => Promise<void>
  updateAvailable: boolean
  updatePWA: () => Promise<void>
}

const PWAContext = createContext<PWAContextType | null>(null)

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAProviderProps {
  children: ReactNode
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Service Worker の登録
    if ('serviceWorker' in navigator) {
      registerServiceWorker()
    }

    // オンライン/オフライン状態の監視
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // インストール可能性の検出
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      const installEvent = event as BeforeInstallPromptEvent
      setDeferredPrompt(installEvent)
      setIsInstallable(true)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // PWAインストール状態の検出
    const checkInstallStatus = () => {
      // standalone mode の検出
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isInHomescreen = (window.navigator as any).standalone
      
      setIsInstalled(isStandalone || (isIOS && isInHomescreen))
    }

    checkInstallStatus()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      })

      console.log('[PWA] Service Worker registered successfully:', registration)

      // Service Worker の更新検出
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true)
              console.log('[PWA] New Service Worker available')
            }
          })
        }
      })

      // Controller が変更された場合（更新後）
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Service Worker controller changed - reloading')
        window.location.reload()
      })

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error)
    }
  }

  const installPWA = async (): Promise<void> => {
    if (!deferredPrompt) {
      console.warn('[PWA] No install prompt available')
      return
    }

    try {
      // インストールプロンプトを表示
      await deferredPrompt.prompt()
      
      // ユーザーの選択を待つ
      const { outcome } = await deferredPrompt.userChoice
      
      console.log(`[PWA] Install prompt result: ${outcome}`)
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        console.log('[PWA] PWA was installed successfully')
      }
      
      // プロンプトを無効化
      setDeferredPrompt(null)
      setCanInstall(false)
      
    } catch (error) {
      console.error('[PWA] Error during PWA installation:', error)
    }
  }

  const updatePWA = async (): Promise<void> => {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration && registration.waiting) {
        // 新しいService Workerをアクティブ化
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        setUpdateAvailable(false)
        console.log('[PWA] Service Worker update triggered')
      }
    } catch (error) {
      console.error('[PWA] Error updating PWA:', error)
    }
  }

  const contextValue: PWAContextType = {
    isOnline,
    isInstalled,
    isInstallable,
    canInstall,
    installPWA,
    updateAvailable,
    updatePWA
  }

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      {/* オフライン通知 */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span className="text-sm font-medium">オフラインモード</span>
          </div>
        </div>
      )}
      
      {/* アプリインストール促進バナー */}
      {canInstall && !isInstalled && (
        <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white rounded-lg shadow-lg p-4 z-40">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold">H-BATをインストール</h3>
              <p className="text-xs opacity-90 mt-1">
                オフラインでも使用できるようになります
              </p>
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={() => setCanInstall(false)}
                className="px-3 py-1 text-xs bg-blue-500 rounded hover:bg-blue-400 transition-colors"
              >
                後で
              </button>
              <button
                onClick={installPWA}
                className="px-3 py-1 text-xs bg-white text-blue-600 rounded font-medium hover:bg-gray-100 transition-colors"
              >
                インストール
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* アプリ更新通知 */}
      {updateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 bg-green-600 text-white rounded-lg shadow-lg p-4 z-40">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold">アップデート利用可能</h3>
              <p className="text-xs opacity-90 mt-1">
                新しいバージョンが利用できます
              </p>
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={() => setUpdateAvailable(false)}
                className="px-3 py-1 text-xs bg-green-500 rounded hover:bg-green-400 transition-colors"
              >
                後で
              </button>
              <button
                onClick={updatePWA}
                className="px-3 py-1 text-xs bg-white text-green-600 rounded font-medium hover:bg-gray-100 transition-colors"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  )
}

export function usePWA(): PWAContextType {
  const context = useContext(PWAContext)
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider')
  }
  return context
}

// オフライン状態でのユーティリティフック
export function useOfflineStorage() {
  const { isOnline } = usePWA()
  
  const saveOfflineData = (key: string, data: any) => {
    if (!isOnline) {
      try {
        const existingData = localStorage.getItem('h-bat-offline-data')
        const offlineData = existingData ? JSON.parse(existingData) : {}
        offlineData[key] = {
          data,
          timestamp: Date.now(),
          synced: false
        }
        localStorage.setItem('h-bat-offline-data', JSON.stringify(offlineData))
        console.log('[PWA] Data saved offline:', key)
      } catch (error) {
        console.error('[PWA] Failed to save offline data:', error)
      }
    }
  }
  
  const getOfflineData = (key: string) => {
    try {
      const existingData = localStorage.getItem('h-bat-offline-data')
      const offlineData = existingData ? JSON.parse(existingData) : {}
      return offlineData[key]?.data || null
    } catch (error) {
      console.error('[PWA] Failed to get offline data:', error)
      return null
    }
  }
  
  const syncOfflineData = async () => {
    if (isOnline) {
      try {
        const existingData = localStorage.getItem('h-bat-offline-data')
        const offlineData = existingData ? JSON.parse(existingData) : {}
        
        for (const [key, item] of Object.entries(offlineData)) {
          const { data, synced } = item as any
          if (!synced) {
            // ここで実際のAPI同期を実行
            console.log('[PWA] Syncing offline data:', key, data)
            // 同期完了後にマーク
            offlineData[key].synced = true
          }
        }
        
        localStorage.setItem('h-bat-offline-data', JSON.stringify(offlineData))
        console.log('[PWA] Offline data sync completed')
      } catch (error) {
        console.error('[PWA] Failed to sync offline data:', error)
      }
    }
  }
  
  return {
    saveOfflineData,
    getOfflineData,
    syncOfflineData,
    isOnline
  }
} 