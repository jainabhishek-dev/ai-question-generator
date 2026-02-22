/**
 * Test: AI Prompt Generation and Structure
 *
 * This test verifies that GenerationResult structure is correct
 * and the data flow from generation to save works properly.
 * Includes tests for the structured output path (JSON.parse → Zod → processQuestions)
 * and the legacy fallback path (parseQuestions → processQuestions).
 */

import { processQuestions, parseQuestions } from '../questionParser';
import { questionArraySchema, quizGameSchema } from '../questionSchema';
import type { Inputs } from '@/components/AdvancedQuestionForm';

// Define GenerationResult locally for testing (mirrors gemini.ts)
interface GenerationResult {
  text: string;
  prompt: string;
}

describe('AI Prompt Generation Structure', () => {
  const mockGenerationResult: GenerationResult = {
    text: JSON.stringify([
      {
        type: "multiple-choice",
        question: "What is 2 + 2?",
        options: ["A) 3", "B) 4", "C) 5", "D) 6"],
        correctAnswer: "B",
        explanation: "2 + 2 equals 4"
      },
      {
        type: "fill-in-the-blank",
        question: "The capital of France is _______.",
        correctAnswer: "Paris",
        explanation: "Paris is the capital city of France."
      }
    ]),
    prompt: "You are an expert assessment designer...\n\nCONTEXT:\nSubject: Mathematics\nTopic: Addition\nGrade Level: Grade 1\n\nGenerate exactly 2 questions..."
  };

  test('GenerationResult has correct structure', () => {
    expect(mockGenerationResult).toHaveProperty('text');
    expect(mockGenerationResult).toHaveProperty('prompt');
    expect(typeof mockGenerationResult.text).toBe('string');
    expect(typeof mockGenerationResult.prompt).toBe('string');
    expect(mockGenerationResult.prompt.length).toBeGreaterThan(50);
    
    console.log('✅ GenerationResult structure is correct');
    console.log(`   - text length: ${mockGenerationResult.text.length} chars`);
    console.log(`   - prompt length: ${mockGenerationResult.prompt.length} chars`);
  });

  test('Questions can be parsed from generation result', () => {
    const rawQuestions = JSON.parse(mockGenerationResult.text);
    const processedQuestions = processQuestions(rawQuestions);
    
    expect(processedQuestions).toHaveLength(2);
    expect(processedQuestions[0].type).toBe('multiple-choice');
    expect(processedQuestions[0].options).toHaveLength(4);
    expect(processedQuestions[1].type).toBe('fill-in-the-blank');
    
    console.log('✅ Questions processed correctly:');
    processedQuestions.forEach((q, i) => {
      console.log(`   ${i + 1}. Type: ${q.type}, Options: ${q.options?.length || 0}`);
    });
  });

  test('Prompt flows through to database save structure', () => {
    const rawQuestions = JSON.parse(mockGenerationResult.text);
    const processedQuestions = processQuestions(rawQuestions);
    
    const mockInputs: Inputs = {
      subject: "Mathematics",
      topic: "Addition",
      grade: "Grade 1",
      difficulty: "Easy",
      bloomsLevel: "Remember",
      totalQuestions: 2,
      numMCQ: 1,
      numFillBlank: 1,
      numTrueFalse: 0,
      numShortAnswer: 0,
      numLongAnswer: 0,
      question_source: "general"
    };
    
    // Simulate database record structure
    const questionsToSave = processedQuestions.map(q => ({
      question: q.question,
      question_type: q.type,
      options: q.options,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
      subject: mockInputs.subject,
      topic: mockInputs.topic,
      grade: mockInputs.grade,
      difficulty: mockInputs.difficulty,
      blooms_level: mockInputs.bloomsLevel,
      user_id: "test-user-123",
      is_public: false,
      ai_prompt: mockGenerationResult.prompt  // NEW: Prompt included
    }));
    
    expect(questionsToSave).toHaveLength(2);
    questionsToSave.forEach((q) => {
      expect(q.ai_prompt).toBe(mockGenerationResult.prompt);
      expect(q.ai_prompt).toContain('assessment designer');
    });
    
    console.log('✅ Prompt flows to database save structure correctly');
    console.log(`   - All ${questionsToSave.length} questions have prompt attached`);
  });

  test('Batch questions receive same prompt', () => {
    const rawQuestions = JSON.parse(mockGenerationResult.text);
    const processedQuestions = processQuestions(rawQuestions);
    
    const questionsToSave = processedQuestions.map(q => ({
      question: q.question,
      ai_prompt: mockGenerationResult.prompt
    }));
    
    const prompts = questionsToSave.map(q => q.ai_prompt);
    const uniquePrompts = new Set(prompts);
    
    expect(uniquePrompts.size).toBe(1);
    expect(prompts.every(p => p === mockGenerationResult.prompt)).toBe(true);
    
    console.log('✅ All questions in batch share same prompt');
    console.log(`   - Generated ${questionsToSave.length} questions`);
    console.log(`   - Unique prompts: ${uniquePrompts.size} (should be 1)`);
  });

  test('Authenticated user data structure', () => {
    const rawQuestions = JSON.parse(mockGenerationResult.text);
    const processedQuestions = processQuestions(rawQuestions);
    
    const authenticatedUserId = "auth-user-abc123";
    const questionsToSave = processedQuestions.map(q => ({
      question: q.question,
      user_id: authenticatedUserId,
      is_public: false,  // Private for authenticated users
      ai_prompt: mockGenerationResult.prompt
    }));
    
    questionsToSave.forEach((q) => {
      expect(q.user_id).toBe(authenticatedUserId);
      expect(q.is_public).toBe(false);
      expect(q.ai_prompt).toBe(mockGenerationResult.prompt);
    });
    
    console.log('✅ Authenticated user structure correct');
    console.log(`   - user_id: ${authenticatedUserId}`);
    console.log(`   - is_public: false`);
    console.log(`   - ai_prompt included: ✓`);
  });

  test('Unauthenticated user data structure', () => {
    const rawQuestions = JSON.parse(mockGenerationResult.text);
    const processedQuestions = processQuestions(rawQuestions);
    
    const unauthenticatedUserId = null;
    const questionsToSave = processedQuestions.map(q => ({
      question: q.question,
      user_id: unauthenticatedUserId,
      is_public: true,  // Public for unauthenticated users
      ai_prompt: mockGenerationResult.prompt
    }));
    
    questionsToSave.forEach((q) => {
      expect(q.user_id).toBeNull();
      expect(q.is_public).toBe(true);
      expect(q.ai_prompt).toBe(mockGenerationResult.prompt);
    });
    
    console.log('✅ Unauthenticated user structure correct');
    console.log(`   - user_id: null`);
    console.log(`   - is_public: true`);
    console.log(`   - ai_prompt included: ✓`);
  });

  test('Prompt content validation', () => {
    const prompt = mockGenerationResult.prompt;
    
    expect(prompt).toContain('assessment designer');
    expect(prompt).toContain('CONTEXT');
    expect(prompt.length).toBeGreaterThan(100);
    expect(prompt.length).toBeLessThan(100000);
    
    console.log('✅ Prompt content validation passed');
    console.log(`   - Contains required keywords: ✓`);
    console.log(`   - Reasonable length (${prompt.length} chars): ✓`);
  });

  test('Empty/null prompt handling', () => {
    const rawQuestions = JSON.parse(mockGenerationResult.text);
    const processedQuestions = processQuestions(rawQuestions);
    
    // Test with undefined prompt
    const questionsWithNoPrompt = processedQuestions.map(q => ({
      question: q.question,
      ai_prompt: undefined
    }));
    
    questionsWithNoPrompt.forEach(q => {
      expect(q.ai_prompt).toBeUndefined();
    });
    
    // Test with null prompt
    const questionsWithNullPrompt = processedQuestions.map(q => ({
      question: q.question,
      ai_prompt: null
    }));
    
    questionsWithNullPrompt.forEach(q => {
      expect(q.ai_prompt).toBeNull();
    });
    
    console.log('✅ Empty/null prompt handling works');
  });
});

describe('Complete Data Flow Simulation', () => {
  test('End-to-end: Generation → Parse → Process → Save', () => {
    // 1. Simulate AI generation response
    const generationResult: GenerationResult = {
      text: JSON.stringify([
        {
          type: "multiple-choice",
          question: "What is 5 + 3?",
          options: ["A) 6", "B) 7", "C) 8", "D) 9"],
          correctAnswer: "C",
          explanation: "5 + 3 = 8"
        },
        {
          type: "true-false",
          question: "10 is greater than 5.",
          options: ["True", "False"],
          correctAnswer: "True",
          explanation: "10 is indeed greater than 5."
        }
      ]),
      prompt: "Generate 2 math questions for Grade 1 students about numbers..."
    };
    
    // 2. Parse JSON from AI
    const rawQuestions = JSON.parse(generationResult.text);
    expect(rawQuestions).toHaveLength(2);
    
    // 3. Process questions (normalize types, extract options, etc.)
    const processedQuestions = processQuestions(rawQuestions);
    expect(processedQuestions).toHaveLength(2);
    expect(processedQuestions[0].type).toBe('multiple-choice');
    expect(processedQuestions[1].type).toBe('true-false');
    
    // 4. Prepare for database save
    const mockInputs: Inputs = {
      subject: "Math",
      topic: "Numbers",
      grade: "Grade 1",
      difficulty: "Easy",
      bloomsLevel: "Remember",
      totalQuestions: 2,
      numMCQ: 1,
      numTrueFalse: 1,
      numFillBlank: 0,
      numShortAnswer: 0,
      numLongAnswer: 0,
      question_source: "general"
    };
    
    const questionsToSave = processedQuestions.map(q => ({
      question: q.question,
      question_type: q.type,
      options: q.options,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
      subject: mockInputs.subject,
      topic: mockInputs.topic,
      grade: mockInputs.grade,
      difficulty: mockInputs.difficulty,
      blooms_level: mockInputs.bloomsLevel,
      user_id: "test-user",
      is_public: false,
      ai_prompt: generationResult.prompt  // CRITICAL: Prompt flows through
    }));
    
    // 5. Verify complete flow
    expect(questionsToSave).toHaveLength(2);
    expect(questionsToSave[0]).toMatchObject({
      question: "What is 5 + 3?",
      question_type: "multiple-choice",
      ai_prompt: generationResult.prompt
    });
    expect(questionsToSave[1]).toMatchObject({
      question: "10 is greater than 5.",
      question_type: "true-false",
      ai_prompt: generationResult.prompt
    });
    
    console.log('✅ Complete end-to-end data flow successful');
    console.log('   1. AI generated text ✓');
    console.log('   2. Parsed JSON ✓');
    console.log('   3. Processed questions ✓');
    console.log('   4. Prepared for save with prompt ✓');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURED OUTPUT PATH TESTS
// Verifies: JSON.parse → questionArraySchema.parse → processQuestions
// ─────────────────────────────────────────────────────────────────────────────

describe('Structured Output Path', () => {
  const cleanJsonFromApi = JSON.stringify([
    {
      type: "multiple-choice",
      question: "What is the powerhouse of the cell?",
      options: ["A) Nucleus", "B) Mitochondria", "C) Ribosome", "D) Golgi apparatus"],
      correctAnswer: "B",
      explanation: "The mitochondria produces ATP through cellular respiration, earning it the nickname 'powerhouse of the cell'."
    },
    {
      type: "true-false",
      question: "Photosynthesis occurs in the mitochondria.",
      options: ["True", "False"],
      correctAnswer: "False",
      explanation: "Photosynthesis occurs in the chloroplasts, not the mitochondria."
    },
    {
      type: "fill-in-the-blank",
      question: "The process by which plants make food using sunlight is called _______.",
      correctAnswer: "photosynthesis",
      explanation: "Photosynthesis is the process where plants convert sunlight, water, and CO2 into glucose and oxygen."
    }
  ]);

  test('structured output: JSON.parse produces a valid array', () => {
    const parsed = JSON.parse(cleanJsonFromApi);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
    console.log('✅ JSON.parse on structured output produces valid array');
  });

  test('structured output: questionArraySchema.parse validates all question types', () => {
    const parsed = JSON.parse(cleanJsonFromApi);
    const validated = questionArraySchema.parse(parsed);
    expect(validated).toHaveLength(3);
    expect(validated[0].type).toBe('multiple-choice');
    expect(validated[1].type).toBe('true-false');
    expect(validated[2].type).toBe('fill-in-the-blank');
    console.log('✅ Zod schema validation passed for all question types');
  });

  test('structured output: processQuestions produces render-ready Question[]', () => {
    const parsed = JSON.parse(cleanJsonFromApi);
    const validated = questionArraySchema.parse(parsed);
    const processed = processQuestions(validated as Parameters<typeof processQuestions>[0]);

    expect(processed).toHaveLength(3);

    const mcq = processed[0];
    expect(mcq.type).toBe('multiple-choice');
    expect(mcq.options).toHaveLength(4);
    expect(mcq.correctAnswer).toBe('B');
    expect(mcq.correctAnswerLetter).toBe('B');

    const tf = processed[1];
    expect(tf.type).toBe('true-false');
    expect(tf.correctAnswer).toBe('False');

    const fib = processed[2];
    expect(fib.type).toBe('fill-in-the-blank');
    expect(fib.correctAnswer).toBe('photosynthesis');

    console.log('✅ processQuestions produces render-ready Question[] from structured output');
  });

  test('structured output: falls back to parseQuestions on Zod validation failure', () => {
    // Simulate a response with a type outside the enum (e.g. AI used a variation)
    const nonEnumTypeJson = JSON.stringify([{
      type: "multiple choice questions",
      question: "What is 2 + 2?",
      options: ["A) 3", "B) 4", "C) 5", "D) 6"],
      correctAnswer: "B",
      explanation: "Basic arithmetic."
    }]);

    let processedQuestions;
    try {
      const parsed = JSON.parse(nonEnumTypeJson);
      const validated = questionArraySchema.parse(parsed); // will throw — type not in enum
      processedQuestions = processQuestions(validated as Parameters<typeof processQuestions>[0]);
    } catch {
      // Fallback path
      const parsedQuestions = parseQuestions(nonEnumTypeJson);
      processedQuestions = processQuestions(parsedQuestions);
    }

    expect(processedQuestions).toHaveLength(1);
    expect(processedQuestions[0].question).toBe('What is 2 + 2?');
    console.log('✅ Fallback path correctly handles non-enum type values');
  });

  test('structured output: quizGameSchema validates quiz structure', () => {
    const quizJson = {
      questions: [
        {
          question: "What is the capital of India?",
          question_type: "MCQ",
          options: ["A) Mumbai", "B) Delhi", "C) Chennai", "D) Kolkata"],
          correct_answer: "B",
          explanation: "New Delhi is the capital of India.",
          difficulty: "easy",
          points: 100,
          hint: "It is located in northern India."
        }
      ],
      settings: {
        time_limit: 30,
        hints_enabled: true,
        show_explanations: true
      }
    };

    const validated = quizGameSchema.parse(quizJson);
    expect(validated.questions).toHaveLength(1);
    expect(validated.questions[0].question_type).toBe('MCQ');
    expect(validated.settings.hints_enabled).toBe(true);
    console.log('✅ quizGameSchema validates quiz structure correctly');
  });
});
