"use client"

import { useAuth } from '@/contexts/AuthContext'
import FeatureCard from '@/components/FeatureCard'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'
import { 
  DocumentPlusIcon, 
  ClipboardDocumentListIcon,
  PuzzlePieceIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'

export default function HomePage() {
  const { user } = useAuth()

  const features = [
    {
      href: '/create-questions',
      title: 'Create Questions',
      description: 'Generate high-quality educational questions using AI. Upload PDFs or enter topics to create questions instantly.',
      icon: <DocumentPlusIcon className="w-7 h-7" />,
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      href: '/create-game',
      title: 'Create Quiz Games',
      description: 'Turn your questions into engaging quiz games with shareable links. Perfect for interactive learning.',
      icon: <PuzzlePieceIcon className="w-7 h-7" />,
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      href: '/my-questions',
      title: 'My Questions',
      description: 'View and manage all your created questions. Export to PDF or CSV, and convert to quizzes.',
      icon: <ClipboardDocumentListIcon className="w-7 h-7" />,
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      href: '/my-games',
      title: 'My Games',
      description: 'Track your quiz games and player performance. Monitor plays, scores, and engagement.',
      icon: <TrophyIcon className="w-7 h-7" />,
      gradient: 'from-orange-500 to-red-600'
    }
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 sm:py-12 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-4">
            Welcome to Instaku
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Your AI-powered platform for creating educational content, quiz games, and managing learning materials
          </p>
        </div>

        {/* Analytics Dashboard (for logged-in users) */}
        {user && <AnalyticsDashboard />}

        {/* Features Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            {user ? 'Quick Access' : 'Get Started'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                href={feature.href}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                gradient={feature.gradient}
              />
            ))}
          </div>
        </div>

        {/* Welcome message for new users */}
        {!user && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              Sign in to save your questions, track your progress, and access all features. Create unlimited educational content with AI assistance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/create-questions"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Try It Now
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          </div>
        )}

        {/* Features Highlight for Logged-in Users */}
        {user && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                AI-Powered Generation
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create questions from PDFs, topics, or NCERT content with advanced AI technology
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Export & Share
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Download questions as PDF or CSV, and create shareable quiz games with unique links
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Track Performance
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor quiz plays, scores, and engagement with detailed analytics
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
