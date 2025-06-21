'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface AuthGuardProps {
  children: ReactNode
  requireAdmin?: boolean
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requireAdmin = false, 
  redirectTo 
}: AuthGuardProps) {
  const { user, isAdmin, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    // Not authenticated
    if (!user) {
      const loginPath = requireAdmin ? '/admin/login' : '/login'
      router.push(redirectTo || loginPath)
      return
    }

    // Requires admin but user is not admin
    if (requireAdmin && !isAdmin) {
      router.push(redirectTo || '/')
      return
    }
  }, [user, isAdmin, isLoading, requireAdmin, redirectTo, router])

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">認証確認中...</p>
        </div>
      </div>
    )
  }

  // Don't render children if not authenticated or not authorized
  if (!user || (requireAdmin && !isAdmin)) {
    return null
  }

  return <>{children}</>
}

// Admin-specific guard
export function AdminGuard({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireAdmin={true} redirectTo="/admin/login">
      {children}
    </AuthGuard>
  )
}

// User guard (for regular users)
export function UserGuard({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireAdmin={false} redirectTo="/login">
      {children}
    </AuthGuard>
  )
} 