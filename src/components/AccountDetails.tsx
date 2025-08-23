import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

export default function AccountDetails() {
  const { user, updateEmail } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [newEmail, setNewEmail] = useState(user?.email || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const result = await updateEmail(newEmail)
    
    if (result.success) {
      setSuccess('Email updated! Please check your inbox for a confirmation link.')
      setIsEditing(false)
    } else {
      setError(result.error || 'Failed to update email')
    }
    
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6 dark:bg-gray-900 dark:border-gray-700">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Account Details</h2>
      
      {/* Email Section */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">Email Address</label>
          {isEditing ? (
            <form onSubmit={handleUpdateEmail} className="space-y-3">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-blue-400"
                required
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    setNewEmail(user?.email || '')
                    setError('')
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-gray-900 dark:text-gray-100">{user?.email}</span>
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium dark:text-blue-400 dark:hover:text-blue-300"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Account Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Member Since</label>
            <span className="text-gray-900 dark:text-gray-100">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }) : 'Unknown'}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Last Sign In</label>
            <span className="text-gray-900 dark:text-gray-100">
              {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }) : 'Unknown'}
            </span>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && <div className="text-green-600 text-sm dark:text-green-400">{success}</div>}
        {error && <div className="text-red-600 text-sm dark:text-red-400">{error}</div>}
      </div>
    </div>
  )
}