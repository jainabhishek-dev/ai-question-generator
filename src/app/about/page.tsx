import { Metadata } from 'next';
import LogoHeader from "./components/LogoHeader";
import Mission from "./components/Mission";
import Trust from "./components/Trust";
import FounderNote from "./components/FounderNote";
import FAQ from "./components/FAQ";
import UserJourney from "./components/UserJourney";
import TechStack from "./components/TechStack";
import Statistics from "./components/Statistics";
import Link from "next/link";

export const metadata: Metadata = {
  title: 'About Instaku - AI-Powered Educational Question Generator | Create Quality Questions Instantly',
  description: 'Discover Instaku\'s mission to revolutionize education through AI-generated questions. Create curriculum-aligned, high-quality educational content in seconds, trusted by educators worldwide.',
  keywords: 'AI education tool, question generator, educational technology, curriculum alignment, instant question creation, learning assessment',
  openGraph: {
    title: 'About Instaku - Revolutionizing Education with AI',
    description: 'Create quality educational questions in seconds, not hours. Trusted by educators for instant, curriculum-aligned content.',
    type: 'website',
  },
  alternates: {
    canonical: '/about'
  }
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Instaku",
  "description": "AI-powered educational question generator for instant curriculum-aligned content creation",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "Web Browser",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "creator": {
    "@type": "Person",
    "name": "Abhishek"
  }
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-6 px-2 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
        <article className="max-w-3xl mx-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
          <header className="bg-transparent text-center pt-8 pb-2">
            <LogoHeader />
            <p className="text-sm sm:text-base mt-2 text-gray-700 dark:text-gray-200">
              <span className="font-semibold">Create quality questions in seconds, not hours.</span>
            </p>
            <div className="mt-3 inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-xs">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-gray-700 dark:text-gray-100">Actively serving educators worldwide</span>
            </div>
          </header>
          <div className="p-4 sm:p-6 space-y-8">
            <Mission />
            <Statistics />
            <UserJourney />
            <Trust />
            <FounderNote />
            <TechStack />
            <FAQ />
            <footer className="text-center pt-6 pb-2">
              <div className="space-y-2">
                <Link
                  href="/"
                  className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl text-sm"
                  aria-label="Start using Instaku question generator"
                >
                  Start Creating Questions Now →
                </Link>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Free to use for a limited time. Enjoy creating!
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  Contact us: <a href="mailto:hello@instaku.com" className="underline">hello@instaku.com</a>
                </p>
              </div>
            </footer>
          </div>
        </article>
      </main>
    </>
  );
}