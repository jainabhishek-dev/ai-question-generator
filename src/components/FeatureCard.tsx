"use client"

import Link from 'next/link'
import { ReactNode } from 'react'

interface FeatureCardProps {
  href: string
  title: string
  description: string
  icon: ReactNode
  gradient?: string
}

export default function FeatureCard({
  href,
  title,
  description,
  icon,
  gradient = 'from-blue-500 to-indigo-600'
}: FeatureCardProps) {
  return (
    <Link href={href} className="block group">
      <div className="relative h-full p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1">
        {/* Icon */}
        <div className={`w-14 h-14 mb-4 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
          <div className="text-white">
            {icon}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
          {description}
        </p>

        {/* Arrow indicator */}
        <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium text-sm group-hover:translate-x-2 transition-transform duration-300">
          <span>Get Started</span>
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
