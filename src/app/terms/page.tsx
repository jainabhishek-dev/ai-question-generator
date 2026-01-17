import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service - Instaku | AI Question Generator Terms & Conditions',
  description: 'Read Instaku\'s Terms of Service governing the use of our AI-powered educational content generator platform.',
  robots: 'index, follow',
  alternates: {
    canonical: '/terms'
  }
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-6 px-2 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <article className="max-w-4xl mx-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
        <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center py-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Terms of Service</h1>
          <p className="mt-2 text-blue-100">Last updated: January 17, 2026</p>
        </header>
        
        <div className="p-6 sm:p-8 space-y-8 text-gray-800 dark:text-gray-200">
          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-blue-200">1. Agreement to Terms</h2>
            <p className="mb-4">
              By accessing and using Instaku (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). 
              If you disagree with any part of these terms, you may not access the Service.
            </p>
            <p>
              Instaku is an AI-powered educational content generator that helps educators create curriculum-aligned 
              questions instantly. These Terms apply to all users of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-blue-200">2. Description of Service</h2>
            <p className="mb-4">
              Instaku provides an AI-powered platform for generating educational questions in various formats including:
            </p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Multiple-choice questions</li>
              <li>Fill-in-the-blank questions</li>
              <li>True/false questions</li>
              <li>Short answer questions</li>
              <li>Long answer questions</li>
            </ul>
            <p className="mt-4 mb-4">
              The Service allows users to customize difficulty levels, grade levels, and question types, 
              save questions to personal libraries, and export content as CSV files.
            </p>
            <p className="mb-4">
              Additionally, Instaku provides interactive quiz game features that allow users to:
            </p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Create interactive quiz games from saved questions</li>
              <li>Generate shareable quiz links that work on any device</li>
              <li>Track quiz plays, scores, and player performance</li>
              <li>Access detailed analytics dashboards with leaderboards and insights</li>
              <li>Monitor question-level performance and learning outcomes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-blue-200">3. User Accounts and Registration</h2>
            <p className="mb-4">
              While you can generate questions without an account, creating an account is required to save, 
              organize, export questions, and create quiz games. When you create an account, you must provide accurate information 
              and maintain account security.
            </p>
            
            <p className="mb-4">
              <strong>Free Users:</strong> Can save up to 40 questions in their library, create quiz games, and access all core features including analytics.
            </p>
            
            <p className="mb-4">
              <strong>Quiz Players:</strong> Anyone with a shareable quiz link can play the quiz without creating an account. 
              Player names and scores may be visible on leaderboards associated with that quiz.
            </p>
            
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and 
              for all activities under your account. You must notify us immediately of any unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-blue-200">4. Acceptable Use</h2>
            <p className="mb-4">You agree to use Instaku only for lawful educational purposes. You may not:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Generate content that is harmful, offensive, or inappropriate for educational settings</li>
              <li>Create quiz games with inappropriate, offensive, or malicious content</li>
              <li>Share quiz links for purposes other than legitimate educational activities</li>
              <li>Attempt to manipulate quiz scores, leaderboards, or analytics data</li>
              <li>Attempt to reverse engineer or copy the AI technology</li>
              <li>Use the Service to create content that violates intellectual property rights</li>
              <li>Overload the system with excessive requests or automated tools</li>
              <li>Share account credentials with unauthorized users</li>
              <li>Use the Service for commercial redistribution without permission</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-blue-200">5. Content and Intellectual Property</h2>
            <h3 className="text-lg font-semibold mb-2">Generated Content</h3>
            <p className="mb-4">
              Questions generated through Instaku are provided for your educational use. While you can use, 
              modify, and distribute the generated questions for educational purposes, you acknowledge that:
            </p>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li>AI-generated content may not always be perfectly accurate</li>
              <li>You should review all generated content before use</li>
              <li>Instaku does not guarantee the uniqueness of generated content</li>
              <li>You are responsible for ensuring content appropriateness for your specific use case</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">Quiz Games and Shared Content</h3>
            <p className="mb-4">
              When you create and share quiz games:
            </p>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li>You retain ownership of the questions used in your quiz games</li>
              <li>By generating a shareable link, you grant permission for others to access and play that quiz</li>
              <li>Player data (names, scores, attempt times) is collected and visible in your analytics dashboard</li>
              <li>You are responsible for the appropriateness and accuracy of quiz content shared via public links</li>
              <li>Instaku reserves the right to remove quiz games that violate these Terms</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">Analytics Data</h3>
            <p className="mb-4">
              Analytics data including play statistics, scores, and performance metrics are generated from quiz activity. 
              This data is provided to help you track learning outcomes and is subject to our Privacy Policy.
            </p>

            <h3 className="text-lg font-semibold mb-2">Platform Rights</h3>
            <p>
              Instaku retains all rights to the platform, AI technology, and Service infrastructure. 
              Our branding, design, and proprietary technology remain our intellectual property.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-blue-200">6. Service Limitations</h2>
            <h3 className="text-lg font-semibold mb-2">Usage Limits</h3>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li>Up to 10 questions can be generated in a single request</li>
              <li>Free users are limited to 40 saved questions in their library</li>
              <li>Export functionality requires account registration</li>
              <li>Quiz game creation requires account registration</li>
              <li>No limit on the number of quiz games you can create</li>
              <li>No limit on the number of players who can access shared quiz links</li>
              <li>Analytics data is retained for the lifetime of the quiz game</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">Shareable Quiz Links</h3>
            <p className="mb-4">
              Shareable quiz links remain active indefinitely unless you delete the associated quiz game. 
              You are responsible for managing access to your quiz links. Once shared, anyone with the link 
              can play the quiz without authentication.
            </p>

            <h3 className="text-lg font-semibold mb-2">Service Availability</h3>
            <p>
              We strive for high availability but cannot guarantee uninterrupted service. 
              Maintenance, updates, or technical issues may temporarily affect access. We will 
              make reasonable efforts to provide advance notice of planned maintenance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-blue-200">7. Privacy Policy</h2>
            <p>
              Your privacy is important to us. Our collection, use, and protection of your personal 
              information is governed by our <Link href="/privacy" className="text-blue-600 hover:text-blue-800 underline">Privacy Policy</Link>, 
              which is incorporated into these Terms by reference. Please review our Privacy Policy 
              to understand our data practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-blue-200">8. Disclaimer and Limitation of Liability</h2>
            <p className="mb-4">
              <strong>Instaku is provided &quot;as is&quot; without warranties of any kind.</strong> We do not guarantee:
            </p>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li>Accuracy of AI-generated content</li>
              <li>Curriculum alignment in all cases</li>
              <li>Uninterrupted service availability</li>
              <li>Complete data security (though we implement reasonable measures)</li>
              <li>Fitness for any particular educational purpose</li>
            </ul>
            <p className="mb-4">
              <strong>To the maximum extent permitted by law, Instaku shall not be liable for any indirect, 
              incidental, special, or consequential damages arising from your use of the Service.</strong>
            </p>
            <p>
              You use the Service at your own risk and are solely responsible for reviewing and validating 
              all generated content before use in educational settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-blue-200">9. Termination</h2>
            <p className="mb-4">
              Either party may terminate this agreement at any time. We may suspend or terminate 
              your access for violations of these Terms. Upon termination:
            </p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Your access to the Service will cease</li>
              <li>Saved questions may be deleted after a reasonable notice period</li>
              <li>You may download your saved content before account deletion</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-blue-200">10. Changes to Terms</h2>
            <p>
              We reserve the right to update these Terms at any time. Material changes will be 
              communicated through the platform or via email to registered users. Continued use 
              after changes constitutes acceptance of the updated Terms. We encourage you to 
              review these Terms periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-blue-200">11. Jurisdiction and Governing Law</h2>
            <p className="mb-4">
              These Terms of Service shall be governed by and construed in accordance with the laws 
              of India, without regard to its conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-blue-200">12. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us through our 
              <Link href="/contact" className="text-blue-600 hover:text-blue-800 underline"> Contact Us</Link> page. 
              We will respond to inquiries within a reasonable timeframe.
            </p>
          </section>

          <div className="border-t pt-6 mt-8">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              By using Instaku, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>

        <footer className="bg-gray-50 dark:bg-gray-800 px-6 py-4 text-center">
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
          >
            Back to Instaku
          </Link>
        </footer>
      </article>
    </main>
  );
}
