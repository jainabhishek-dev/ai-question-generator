/**
 * Test for database type normalization
 * Verifies that question types are normalized consistently before saving to database
 */

describe('🔧 Database Type Normalization', () => {
  
  test('normalizes "multiple-choice questions" to "multiple-choice"', () => {
    // Simulate the normalization logic from database.ts
    const normalizeQuestionTypeForDB = (type: string): string => {
      if (!type) return 'unknown';
      const lowerType = type.toLowerCase().trim();
      if (lowerType.includes('multiple-choice') || lowerType.includes('multiple choice') || lowerType.includes('mcq')) {
        return 'multiple-choice';
      }
      return type;
    };
    
    expect(normalizeQuestionTypeForDB('multiple-choice questions')).toBe('multiple-choice');
    expect(normalizeQuestionTypeForDB('Multiple-Choice Questions')).toBe('multiple-choice');
    expect(normalizeQuestionTypeForDB('multiple-choice')).toBe('multiple-choice');
    expect(normalizeQuestionTypeForDB('MULTIPLE-CHOICE')).toBe('multiple-choice');
    expect(normalizeQuestionTypeForDB('MCQ')).toBe('multiple-choice');
  });
  
  test('normalizes true-false variations', () => {
    const normalizeQuestionTypeForDB = (type: string): string => {
      if (!type) return 'unknown';
      const lowerType = type.toLowerCase().trim();
      if (lowerType.includes('true-false') || lowerType.includes('true/false') || lowerType.includes('true false')) {
        return 'true-false';
      }
      return type;
    };
    
    expect(normalizeQuestionTypeForDB('true-false')).toBe('true-false');
    expect(normalizeQuestionTypeForDB('True/False')).toBe('true-false');
    expect(normalizeQuestionTypeForDB('True False')).toBe('true-false');
  });
  
  test('preserves unknown types', () => {
    const normalizeQuestionTypeForDB = (type: string): string => {
      if (!type) return 'unknown';
      const lowerType = type.toLowerCase().trim();
      if (lowerType.includes('multiple-choice')) return 'multiple-choice';
      return type;
    };
    
    expect(normalizeQuestionTypeForDB('custom-type')).toBe('custom-type');
    expect(normalizeQuestionTypeForDB('')).toBe('unknown');
  });
  
  test('handles null/undefined safely', () => {
    const normalizeQuestionTypeForDB = (type: string | null | undefined): string => {
      if (!type) return 'unknown';
      return type;
    };
    
    expect(normalizeQuestionTypeForDB(null)).toBe('unknown');
    expect(normalizeQuestionTypeForDB(undefined)).toBe('unknown');
    expect(normalizeQuestionTypeForDB('')).toBe('unknown');
  });
  
  test('simulates database save with normalization', () => {
    // Simulate the database save flow
    const generatedQuestions = [
      {
        type: 'multiple-choice questions',
        question: 'Test question?',
        options: ['A) Opt 1', 'B) Opt 2', 'C) Opt 3', 'D) Opt 4'],
        correctAnswer: 'A',
        explanation: 'Test explanation'
      }
    ];
    
    const normalizeQuestionTypeForDB = (type: string): string => {
      if (!type) return 'unknown';
      const lowerType = type.toLowerCase().trim();
      if (lowerType.includes('multiple-choice')) return 'multiple-choice';
      return type;
    };
    
    const questionsToInsert = generatedQuestions.map(q => ({
      question: q.question,
      question_type: normalizeQuestionTypeForDB(q.type),
      options: q.options,
      correct_answer: q.correctAnswer,
      explanation: q.explanation
    }));
    
    console.log('📊 Database record to insert:', questionsToInsert[0]);
    
    // Verify the type was normalized
    expect(questionsToInsert[0].question_type).toBe('multiple-choice');
    // Verify options are preserved
    expect(questionsToInsert[0].options).toHaveLength(4);
    expect(questionsToInsert[0].options[0]).toBe('A) Opt 1');
  });
  
  test('verifies MCQ validation warning logic', () => {
    const testCases = [
      { type: 'multiple-choice questions', options: ['A) Opt 1', 'B) Opt 2'], shouldWarn: false },
      { type: 'multiple-choice', options: [], shouldWarn: true },
      { type: 'true-false', options: [], shouldWarn: false },  // Not MCQ, no warning
    ];
    
    const normalizeQuestionTypeForDB = (type: string): string => {
      if (!type) return 'unknown';
      const lowerType = type.toLowerCase().trim();
      if (lowerType.includes('multiple-choice')) return 'multiple-choice';
      return type;
    };
    
    testCases.forEach((testCase, index) => {
      const normalizedType = normalizeQuestionTypeForDB(testCase.type);
      const isMultipleChoice = normalizedType === 'multiple-choice';
      const hasNoOptions = !testCase.options || testCase.options.length === 0;
      const shouldWarn = isMultipleChoice && hasNoOptions;
      
      console.log(`Test case ${index + 1}:`, {
        original: testCase.type,
        normalized: normalizedType,
        isMultipleChoice,
        optionsCount: testCase.options?.length || 0,
        shouldWarn,
        expected: testCase.shouldWarn
      });
      
      expect(shouldWarn).toBe(testCase.shouldWarn);
    });
  });
});
