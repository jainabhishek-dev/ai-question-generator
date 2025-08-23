import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="w-full text-center py-2 text-sm text-gray-500 border-t mt-1">
      © {new Date().getFullYear()} Instaku. All rights reserved.
      {' | '}
      <Link
        href="/contact"
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors"
      >
        Contact Us
      </Link>
    </footer>
  )
}