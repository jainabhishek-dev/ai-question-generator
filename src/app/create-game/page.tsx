"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import QuizGameForm from '@/components/QuizGameForm';
import { QuestionRecord, getUserQuestions } from '@/lib/database';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function CreateGamePage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!user) {
        console.log('No user logged in, skipping question fetch');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching questions for user...');
        const result = await getUserQuestions(user.id, { limit: 100 });
        if (result.success && result.data) {
          console.log(`Fetched ${result.data.length} questions`);
          setQuestions(result.data);
        } else {
          console.error('Failed to fetch questions:', result.error);
        }
      } catch (error) {
        console.error('Failed to fetch questions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <QuizGameForm existingQuestions={questions} user={user} />
      </div>
    </div>
  );
}
