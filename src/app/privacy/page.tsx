import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - Instaku | Data Protection & User Privacy',
  description: 'Learn how Instaku protects your privacy and handles your data in our AI-powered educational question generator platform.',
  robots: 'index, follow',
  alternates: {
    canonical: '/privacy'
  }
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-6 px-2 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <article className="max-w-4xl mx-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
        <header className="bg-gradient-to-r from-green-600 to-teal-600 text-white text-center py-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Privacy Policy</h1>
          <p className="mt-2 text-green-100">Last updated: September 6, 2025</p>
        </header>
        
        <div className="p-6 sm:p-8 space-y-8 text-gray-800 dark:text-gray-200">
          <section>
            <h2 className="text-xl font-bold mb-4 text-green-900 dark:text-green-200">1. Introduction</h2>
            <p className="mb-4">
              At Instaku, we respect your privacy and are committed to protecting your personal information. 
              This Privacy Policy explains how we collect, use, and safeguard your data when you use our 
              AI-powered educational question generator platform.
            </p>
            <p>
              This policy applies to all users of Instaku, including those who use the service without 
              creating an account and registered users with personal libraries.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-green-900 dark:text-green-200">2. Information We Collect</h2>
            
            <h3 className="text-lg font-semibold mb-2">Information You Provide</h3>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li><strong>Account Information:</strong> Email address, username, and password when you register</li>
              <li><strong>Generated Content:</strong> Questions you create and save to your library</li>
              <li><strong>User Preferences:</strong> Grade levels, difficulty settings, question types, and filters</li>
              <li><strong>Communication:</strong> Messages sent through our contact/support system</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">Information Automatically Collected</h3>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li><strong>Usage Data:</strong> How you interact with the platform, features used, and session duration</li>
              <li><strong>Technical Information:</strong> IP address, browser type, device information, and operating system</li>
              <li><strong>Analytics Data:</strong> Page views, click patterns, and performance metrics</li>
              <li><strong>Cookies:</strong> Essential cookies for functionality and optional analytics cookies</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">AI Processing Data</h3>
            <p>
              When you generate questions, we process your input prompts and settings to create educational content. 
              This data is used solely for generating your requested questions and improving our AI models.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-green-900 dark:text-green-200">3. How We Use Your Information</h2>
            
            <h3 className="text-lg font-semibold mb-2">Service Operation</h3>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li>Generate and deliver AI-powered educational questions</li>
              <li>Save and organize questions in your personal library</li>
              <li>Export questions as PDF worksheets or answer keys</li>
              <li>Manage your user account and preferences</li>
              <li>Provide customer support and respond to inquiries</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">Platform Improvement</h3>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li>Analyze usage patterns to improve user experience</li>
              <li>Enhance AI model accuracy and question quality</li>
              <li>Develop new features and educational content types</li>
              <li>Monitor platform performance and fix technical issues</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">Communication</h3>
            <ul className="list-disc ml-6 space-y-2">
              <li>Send important service updates and security notices</li>
              <li>Respond to support requests and feedback</li>
              <li>Notify you of significant platform changes or new features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-green-900 dark:text-green-200">4. Information Sharing and Disclosure</h2>
            
            <h3 className="text-lg font-semibold mb-2">We Do Not Sell Your Data</h3>
            <p className="mb-4">
              We do not sell, rent, or trade your personal information to third parties for marketing purposes.
            </p>

            <h3 className="text-lg font-semibold mb-2">Limited Sharing</h3>
            <p className="mb-4">We may share your information only in these specific circumstances:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li><strong>Service Providers:</strong> Third-party services that help operate our platform (hosting, analytics, authentication)</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or to protect our legal rights</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets (with user notification)</li>
              <li><strong>Safety:</strong> To protect the safety of users or prevent fraud and abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-green-900 dark:text-green-200">5. Data Security</h2>
            <p className="mb-4">We implement reasonable security measures to protect your information:</p>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li><strong>Encryption:</strong> Data transmission is encrypted using industry-standard protocols</li>
              <li><strong>Access Controls:</strong> Limited access to personal data on a need-to-know basis</li>
              <li><strong>Secure Storage:</strong> Data is stored on secure servers with appropriate safeguards</li>
              <li><strong>Regular Updates:</strong> We maintain and update our security practices</li>
              <li><strong>Account Protection:</strong> Secure authentication and password requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-green-900 dark:text-green-200">6. Your Rights and Choices</h2>
            
            <h3 className="text-lg font-semibold mb-2">Account Management</h3>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li><strong>Access:</strong> View and download your saved questions and account information</li>
              <li><strong>Edit:</strong> Update your account details and preferences at any time</li>
              <li><strong>Delete:</strong> Remove individual questions or delete your entire account</li>
              <li><strong>Export:</strong> Download your questions as PDF files</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">Privacy Controls</h3>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li><strong>Cookie Preferences:</strong> Manage optional cookies through your browser settings</li>
              <li><strong>Data Deletion:</strong> Request complete removal of your personal data</li>
              <li><strong>Communication:</strong> Contact us to opt out of non-essential communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-green-900 dark:text-green-200">7. Cookies and Tracking</h2>
            
            <h3 className="text-lg font-semibold mb-2">Types of Cookies</h3>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li><strong>Essential Cookies:</strong> Required for basic functionality (login, preferences, security)</li>
              <li><strong>Analytics Cookies:</strong> Help us understand usage patterns and improve the service</li>
              <li><strong>Functional Cookies:</strong> Remember your settings and preferences</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">Managing Cookies</h3>
            <p>
              You can control cookies through your browser settings. Disabling essential cookies may 
              affect platform functionality, particularly for account features and question saving.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-green-900 dark:text-green-200">8. Third-Party Services</h2>
            <p className="mb-4">Instaku integrates with third-party services that have their own privacy policies:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li><strong>Authentication Providers:</strong> For secure account creation and login</li>
              <li><strong>Analytics Services:</strong> For understanding platform usage and performance</li>
              <li><strong>Cloud Infrastructure:</strong> For hosting and data storage</li>
              <li><strong>AI Services:</strong> For question generation and content processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-green-900 dark:text-green-200">9. Data Retention</h2>
            <p className="mb-4">We retain your information for different periods depending on the type:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li><strong>Account Data:</strong> Retained while your account is active and for a reasonable period after deletion</li>
              <li><strong>Generated Questions:</strong> Stored in your library until you delete them or close your account</li>
              <li><strong>Usage Analytics:</strong> Aggregated data may be retained indefinitely for service improvement</li>
              <li><strong>Support Communications:</strong> Retained for customer service and legal compliance purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-green-900 dark:text-green-200">10. Children&apos;s Privacy</h2>
            <p className="mb-4">
              Instaku is designed for educational use and may be used by minors under adult supervision. 
              We do not knowingly collect personal information from children under 13 without parental consent.
            </p>
            <p>
              If you believe a child has provided personal information without appropriate consent, 
              please contact us immediately so we can remove the information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-green-900 dark:text-green-200">11. International Users and Data Transfers</h2>
            <p className="mb-4">
              Instaku is operated from India, and your information may be transferred to and processed in 
              countries other than your own. We implement appropriate safeguards to protect your information 
              during international transfers, in accordance with applicable privacy laws.
            </p>
            <p>
              By using our Service, you consent to the transfer of your information to India and other 
              countries where our service providers operate.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-green-900 dark:text-green-200">12. Changes to This Policy</h2>
            <p className="mb-4">
              We may update this Privacy Policy to reflect changes in our practices or legal requirements. 
              Material changes will be communicated through:
            </p>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li>Prominent notice on our platform</li>
              <li>Email notification to registered users</li>
              <li>Updated &quot;Last modified&quot; date at the top of this policy</li>
            </ul>
            <p>
              We encourage you to review this Privacy Policy periodically to stay informed about how 
              we protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 text-green-900 dark:text-green-200">13. Contact Us</h2>
            <p className="mb-4">
              If you have questions about this Privacy Policy or how we handle your information, please contact us:
            </p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Through our <Link href="/contact" className="text-green-600 hover:text-green-800 underline">Contact Us</Link> page</li>
              <li>For data protection inquiries, mark your message as &quot;Privacy Request&quot;</li>
              <li>We will respond to privacy-related inquiries within 30 days</li>
            </ul>
          </section>

          <div className="border-t pt-6 mt-8">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Your privacy is important to us. This policy explains our commitment to protecting your personal information while providing excellent educational tools.
            </p>
          </div>
        </div>

        <footer className="bg-gray-50 dark:bg-gray-800 px-6 py-4 text-center">
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
          >
            Back to Instaku
          </Link>
        </footer>
      </article>
    </main>
  );
}
