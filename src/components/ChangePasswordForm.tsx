import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

export default function ChangePasswordForm() {
  const { user, signIn, updatePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      // Step 1: Re-authenticate with current password
      const reAuthResult = await signIn(user!.email!, currentPassword)
      if (!reAuthResult.success) {
        setError('Current password is incorrect')
        setLoading(false)
        return
      }

      // Step 2: Update password (only if re-auth successful)
      const updateResult = await updatePassword(newPassword)
      if (updateResult.success) {
        setSuccess('Password updated successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setError(updateResult.error || 'Failed to update password')
      }
    } catch {
      setError('An unexpected error occurred')
    }

    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 dark:bg-gray-900 dark:border-gray-700">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 dark:text-gray-100">Change Password</h2>
      
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-900/20 dark:border-yellow-700">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Security Notice:</strong> You&apos;ll need to re-enter your current password to verify your identity before changing it.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
            Current Password *
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-blue-400"
            placeholder="Enter your current password to verify"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-blue-400"
            placeholder="At least 6 characters"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-blue-400"
            placeholder="Re-enter your new password"
            required
          />
        </div>

        {error && <div className="text-red-600 text-sm dark:text-red-400">{error}</div>}
        {success && <div className="text-green-600 text-sm dark:text-green-400">{success}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          {loading ? 'Verifying & Updating Password...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}