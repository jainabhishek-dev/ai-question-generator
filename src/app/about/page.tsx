import LogoHeader from "./components/LogoHeader";
import Mission from "./components/Mission";
import Trust from "./components/Trust";
import FounderNote from "./components/FounderNote";
import FAQ from "./components/FAQ";
import Link from "next/link"; 

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-6 px-2 flex items-center justify-center dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <section className="w-[90vw] max-w-5xl bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg p-4 sm:p-6 md:p-8 space-y-6 text-justify">
        <LogoHeader />
        <p className="text-base sm:text-lg text-center text-gray-700 dark:text-gray-200">
          <span className="font-semibold">Create quality questions in seconds, not hours.</span>
        </p>
        <Mission />
        <Trust />
        <hr className="border-t border-gray-300 dark:border-gray-700 my-2" />
        <FounderNote />
        <FAQ />
        <div className="text-center pt-2">
          <Link
            href="/"
            className="inline-block bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 px-5 rounded-full shadow transition text-sm sm:text-base"
          >
            Try Instaku Now
          </Link>
        </div>
      </section>
    </main>
  );
}