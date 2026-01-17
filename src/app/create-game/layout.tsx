import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Quiz Game - Instaku | Interactive Quiz Builder',
  description: 'Create engaging quiz games from your questions with shareable links. Build interactive quizzes with customizable time limits and track player performance with detailed analytics.',
  keywords: 'quiz game creator, interactive quiz builder, shareable quiz links, educational games, quiz analytics',
  openGraph: {
    title: 'Create Quiz Games - Instaku',
    description: 'Turn your questions into interactive quiz games with shareable links and analytics.',
    type: 'website',
  },
  alternates: {
    canonical: '/create-game'
  }
};

export default function CreateGameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
