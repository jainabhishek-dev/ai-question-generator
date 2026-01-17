import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Quiz Games - Instaku | Game Analytics Dashboard',
  description: 'Manage your quiz games and view detailed analytics. Track plays, scores, leaderboards, and player performance to measure learning outcomes.',
  keywords: 'quiz game analytics, leaderboard tracking, player performance, educational insights, quiz dashboard',
  openGraph: {
    title: 'My Quiz Games - Instaku',
    description: 'View analytics and manage your interactive quiz games with detailed performance insights.',
    type: 'website',
  },
  alternates: {
    canonical: '/my-games'
  }
};

export default function MyGamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
