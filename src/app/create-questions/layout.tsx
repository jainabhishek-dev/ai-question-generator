import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Questions - Instaku | AI-Powered Question Generator',
  description: 'Generate high-quality educational questions instantly using AI. Upload PDFs, paste content, or enter topics to create curriculum-aligned questions for any subject and grade level.',
  keywords: 'AI question generator, create educational questions, PDF to questions, NCERT questions, curriculum-aligned content',
  openGraph: {
    title: 'Create Questions with AI - Instaku',
    description: 'Generate curriculum-aligned educational questions in seconds using AI technology.',
    type: 'website',
  },
  alternates: {
    canonical: '/create-questions'
  }
};

export default function CreateQuestionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
