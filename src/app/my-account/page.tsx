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
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-lg text-gray-600">Loading...</div>
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
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