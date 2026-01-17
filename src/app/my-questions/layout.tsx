import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Questions - Instaku | Saved Questions Library',
  description: 'View, manage, and organize your saved questions. Filter by type, grade level, difficulty, and Bloom taxonomy. Export questions as CSV files.',
  keywords: 'saved questions, question library, export questions CSV, organize educational content, question management',
  openGraph: {
    title: 'My Questions - Instaku',
    description: 'Manage your saved questions library with filtering and CSV export capabilities.',
    type: 'website',
  },
  alternates: {
    canonical: '/my-questions'
  }
};

export default function MyQuestionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
