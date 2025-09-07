import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="w-full border-t mt-1 py-3 px-4 bg-white dark:bg-gray-950">
      <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2">
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left w-full sm:w-auto">
          © {new Date().getFullYear()} instaku.com. All rights reserved.
        </div>
        <div className="flex flex-wrap justify-center sm:justify-end gap-x-4 gap-y-1 w-full sm:w-auto text-sm">
          <Link
            href="/about"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors"
          >
            About Us
          </Link>
          <Link
            href="/contact"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors"
          >
            Contact Us
          </Link>
          <Link
            href="/terms"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}