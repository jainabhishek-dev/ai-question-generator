'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AccountDetails from '@/components/AccountDetails'
import ChangePasswordForm from '@/components/ChangePasswordForm'

export default function MyAccountPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <main className="min-h-screen overflow-x-hidden flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
        <div className="text-base sm:text-lg text-gray-600 dark:text-gray-300">Loading...</div>
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-4 sm:py-8 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-full sm:max-w-3xl mx-auto px-2 sm:px-4 space-y-5 sm:space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-1 sm:space-y-2">
          <p className="text-sm sm:text-base text-gray-600 max-w-xs sm:max-w-2xl mx-auto dark:text-gray-300">
            Manage your profile and account settings
          </p>
        </div>

        {/* Account Sections */}
        <AccountDetails />
        <ChangePasswordForm />
      </div>
    </main>
  )
}