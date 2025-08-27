import React from 'react'

interface DeleteModalProps {
  show: boolean
  onClose: () => void
  onDelete: () => void
  deleting: boolean
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  show,
  onClose,
  onDelete,
  deleting
}) => {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md transform transition-all dark:bg-gray-900">
        <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-5 sm:mb-6 bg-red-100 rounded-full dark:bg-red-900/40">
          <svg className="w-7 h-7 sm:w-8 sm:h-8 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-center text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">Delete Question?</h3>
        <p className="text-gray-600 dark:text-gray-300 text-center mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
          Are you sure you want to delete this question? This action cannot be undone for your account,
          but the question will remain in the database.
        </p>

        <div className="flex space-x-3 sm:space-x-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-gray-100 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-200 transition-colors font-medium dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg sm:rounded-xl hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all font-medium flex items-center justify-center space-x-2"
          >
            {deleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteModal