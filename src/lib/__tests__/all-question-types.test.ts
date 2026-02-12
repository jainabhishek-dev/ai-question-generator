/**
 * Comprehensive tests for ALL question types
 * Ensures type checking and processing works for MCQ, True/False, Fill-in-Blank, Short Answer, Long Answer
 */

import { parseQuestions, processQuestions } from '../questionParser';

describe('📚 All Question Types - Comprehensive Testing', () => {
  
  // ========== MULTIPLE CHOICE ==========
  describe('Multiple Choice Questions', () => {
    test('processes standard MCQ correctly', () => {
      const input = JSON.stringify([{
        type: 'multiple-choice',
        question: 'What is 2+2?',
        options: ['A) 3', 'B) 4', 'C) 5', 'D) 6'],
        correctAnswer: 'B',
        explanation: 'Basic arithmetic'
      }]);
      
      const parsed = parseQuestions(input);
      const processed = processQuestions(parsed);
      
      expect(processed).toHaveLength(1);
      expect(processed[0].type).toBe('multiple-choice');
      expect(processed[0].options).toHaveLength(4);
      expect(processed[0].correctAnswer).toBe('B');
      console.log('✅ Standard MCQ processed correctly');
    });
    
    test('processes MCQ with "multiple-choice questions" type', () => {
      const input = JSON.stringify([{
        type: 'multiple-choice questions',
        question: 'What is the capital of France?',
        options: ['A) London', 'B) Paris', 'C) Berlin', 'D) Rome'],
        correctAnswer: 'B',
        explanation: 'Paris is the capital'
      }]);
      
      const parsed = parseQuestions(input);
      const processed = processQuestions(parsed);
      
      expect(processed).toHaveLength(1);
      expect(processed[0].type).toBe('multiple-choice questions');
      expect(processed[0].options).toHaveLength(4);
      expect(processed[0].options?.[0]).toBe('A) London');
      console.log('✅ MCQ with extended type processed correctly');
    });
    
    test('handles MCQ with no options gracefully', () => {
      const input = JSON.stringify([{
        type: 'multiple-choice',
        question: 'Test question?',
        options: [],
        correctAnswer: 'A',
        explanation: 'Test'
      }]);
      
      const parsed = parseQuestions(input);
      const processed = processQuestions(parsed);
      
      expect(processed).toHaveLength(1);
      expect(processed[0].options).toHaveLength(0);
      console.log('⚠️ MCQ with empty options handled (edge case)');
    });
  });

  // ========== TRUE/FALSE ==========
  describe('True/False Questions', () => {
    test('processes standard True/False correctly', () => {
      const input = JSON.stringify([{
        type: 'true-false',
        question: 'The Earth is flat.',
        correctAnswer: 'False',
        explanation: 'The Earth is spherical'
      }]);
      
      const parsed = parseQuestions(input);
      const processed = processQuestions(parsed);
      
      expect(processed).toHaveLength(1);
      expect(processed[0].type).toBe('true-false');
      expect(processed[0].correctAnswer).toBe('False');
      expect(processed[0].options).toEqual([]);  // T/F doesn't need options array
      console.log('✅ True/False processed correctly');
    });
    
    test('handles True/False variations', () => {
      const testCases = [
        'true-false',
        'True-False',
        'true false',
        'TRUE/FALSE'
      ];
      
      testCases.forEach(type => {
        const input = JSON.stringify([{
          type,
          question: 'Test statement.',
          correctAnswer: 'True',
          explanation: 'Test'
        }]);
        
        const parsed = parseQuestions(input);
        const processed = processQuestions(parsed);
        
        expect(processed).toHaveLength(1);
        expect(processed[0].type).toBe(type);
        expect(processed[0].correctAnswer).toBe('True');
        console.log(`✅ True/False variant "${type}" processed correctly`);
      });
    });
  });

  // ========== FILL IN THE BLANK ==========
  describe('Fill-in-the-Blank Questions', () => {
    test('processes standard Fill-in-Blank correctly', () => {
      const input = JSON.stringify([{
        type: 'fill-in-the-blank',
        question: 'The capital of France is _______.',
        correctAnswer: 'Paris',
        explanation: 'Paris is the capital of France'
      }]);
      
      const parsed = parseQuestions(input);
      const processed = processQuestions(parsed);
      
      expect(processed).toHaveLength(1);
      expect(processed[0].type).toBe('fill-in-the-blank');
      expect(processed[0].correctAnswer).toBe('Paris');
      expect(processed[0].options).toEqual([]);  // FIB doesn't have options
      console.log('✅ Fill-in-Blank processed correctly');
    });
    
    test('handles Fill-in-Blank variations', () => {
      const testCases = [
        'fill-in-the-blank',
        'Fill-in-the-Blank',
        'fill in the blank',
        'FILL IN BLANK'
      ];
      
      testCases.forEach(type => {
        const input = JSON.stringify([{
          type,
          question: 'Water boils at _______ degrees Celsius.',
          correctAnswer: '100',
          explanation: 'Test'
        }]);
        
        const parsed = parseQuestions(input);
        const processed = processQuestions(parsed);
        
        expect(processed).toHaveLength(1);
        expect(processed[0].type).toBe(type);
        expect(processed[0].correctAnswer).toBe('100');
        console.log(`✅ Fill-in-Blank variant "${type}" processed correctly`);
      });
    });
  });

  // ========== SHORT ANSWER ==========
  describe('Short Answer Questions', () => {
    test('processes standard Short Answer correctly', () => {
      const input = JSON.stringify([{
        type: 'short-answer',
        question: 'Explain the water cycle in 2-3 sentences.',
        correctAnswer: 'Water evaporates from bodies of water, forms clouds, and falls back as precipitation.',
        explanation: 'This is the basic water cycle'
      }]);
      
      const parsed = parseQuestions(input);
      const processed = processQuestions(parsed);
      
      expect(processed).toHaveLength(1);
      expect(processed[0].type).toBe('short-answer');
      expect(processed[0].correctAnswer).toContain('evaporates');
      expect(processed[0].options).toEqual([]);  // Short answer doesn't have options
      console.log('✅ Short Answer processed correctly');
    });
    
    test('handles Short Answer variations', () => {
      const testCases = [
        'short-answer',
        'Short-Answer',
        'short answer',
        'SHORT ANSWER'
      ];
      
      testCases.forEach(type => {
        const input = JSON.stringify([{
          type,
          question: 'What is photosynthesis?',
          correctAnswer: 'The process by which plants make food using sunlight.',
          explanation: 'Test'
        }]);
        
        const parsed = parseQuestions(input);
        const processed = processQuestions(parsed);
        
        expect(processed).toHaveLength(1);
        expect(processed[0].type).toBe(type);
        expect(processed[0].correctAnswer).toContain('process');
        console.log(`✅ Short Answer variant "${type}" processed correctly`);
      });
    });
  });

  // ========== LONG ANSWER ==========
  describe('Long Answer Questions', () => {
    test('processes standard Long Answer correctly', () => {
      const input = JSON.stringify([{
        type: 'long-answer',
        question: 'Discuss the causes and effects of World War II.',
        correctAnswer: 'Key points: Treaty of Versailles, rise of fascism, economic depression, territorial expansion, Holocaust, millions of deaths, formation of UN, Cold War.',
        explanation: 'Comprehensive answer expected'
      }]);
      
      const parsed = parseQuestions(input);
      const processed = processQuestions(parsed);
      
      expect(processed).toHaveLength(1);
      expect(processed[0].type).toBe('long-answer');
      expect(processed[0].correctAnswer).toContain('Treaty');
      expect(processed[0].options).toEqual([]);  // Long answer doesn't have options
      console.log('✅ Long Answer processed correctly');
    });
    
    test('handles Long Answer variations', () => {
      const testCases = [
        'long-answer',
        'Long-Answer',
        'long answer',
        'LONG ANSWER',
        'essay'
      ];
      
      testCases.forEach(type => {
        const input = JSON.stringify([{
          type,
          question: 'Explain the theory of evolution.',
          correctAnswer: 'Evolution is the change in species over time through natural selection...',
          explanation: 'Test'
        }]);
        
        const parsed = parseQuestions(input);
        const processed = processQuestions(parsed);
        
        expect(processed).toHaveLength(1);
        expect(processed[0].type).toBe(type);
        expect(processed[0].correctAnswer).toContain('Evolution');
        console.log(`✅ Long Answer variant "${type}" processed correctly`);
      });
    });
  });

  // ========== MIXED QUESTION TYPES ==========
  describe('Mixed Question Types (Real-world scenario)', () => {
    test('processes multiple different question types together', () => {
      const input = JSON.stringify([
        {
          type: 'multiple-choice',
          question: 'What is 5 x 5?',
          options: ['A) 20', 'B) 25', 'C) 30', 'D) 35'],
          correctAnswer: 'B',
          explanation: '5 x 5 = 25'
        },
        {
          type: 'true-false',
          question: 'Python is a programming language.',
          correctAnswer: 'True',
          explanation: 'Python is indeed a programming language'
        },
        {
          type: 'fill-in-the-blank',
          question: 'The chemical symbol for water is _______.',
          correctAnswer: 'H2O',
          explanation: 'Water molecule'
        },
        {
          type: 'short-answer',
          question: 'What is the Internet?',
          correctAnswer: 'A global network of interconnected computers.',
          explanation: 'Basic definition'
        },
        {
          type: 'multiple-choice questions',  // Extended type
          question: 'Which planet is closest to the Sun?',
          options: ['A) Venus', 'B) Earth', 'C) Mercury', 'D) Mars'],
          correctAnswer: 'C',
          explanation: 'Mercury is closest'
        }
      ]);
      
      const parsed = parseQuestions(input);
      const processed = processQuestions(parsed);
      
      console.log('\n📊 Processing 5 different question types...\n');
      
      expect(processed).toHaveLength(5);
      
      // MCQ #1
      expect(processed[0].type).toBe('multiple-choice');
      expect(processed[0].options).toHaveLength(4);
      console.log('  ✅ Question 1 (MCQ): 4 options processed');
      
      // True/False
      expect(processed[1].type).toBe('true-false');
      expect(processed[1].correctAnswer).toBe('True');
      console.log('  ✅ Question 2 (T/F): Correct answer is True');
      
      // Fill-in-Blank
      expect(processed[2].type).toBe('fill-in-the-blank');
      expect(processed[2].correctAnswer).toContain('H2');  // Text cleaner may add space
      console.log('  ✅ Question 3 (FIB): Correct answer contains H2');
      
      // Short Answer
      expect(processed[3].type).toBe('short-answer');
      expect(processed[3].correctAnswer).toContain('network');
      console.log('  ✅ Question 4 (SA): Answer contains "network"');
      
      // MCQ #2 with extended type
      expect(processed[4].type).toBe('multiple-choice questions');
      expect(processed[4].options).toHaveLength(4);
      console.log('  ✅ Question 5 (MCQ extended): 4 options processed');
      
      console.log('\n✅ All 5 question types processed successfully!\n');
    });
  });

  // ========== EDGE CASES ==========
  describe('Edge Cases & Error Handling', () => {
    test('handles unknown question type gracefully', () => {
      const input = JSON.stringify([{
        type: 'custom-question-type',
        question: 'Custom question?',
        correctAnswer: 'Answer',
        explanation: 'Test'
      }]);
      
      const parsed = parseQuestions(input);
      const processed = processQuestions(parsed);
      
      expect(processed).toHaveLength(1);
      expect(processed[0].type).toBe('custom-question-type');
      expect(processed[0].options).toEqual([]);  // No options for unknown type
      console.log('✅ Unknown type handled gracefully');
    });
    
    test('handles missing type field', () => {
      const input = JSON.stringify([{
        question: 'Question without type?',
        correctAnswer: 'Answer',
        explanation: 'Test'
      }]);
      
      const parsed = parseQuestions(input);
      const processed = processQuestions(parsed);
      
      expect(processed).toHaveLength(1);
      expect(processed[0].type).toBe('unknown');
      console.log('✅ Missing type defaults to "unknown"');
    });
    
    test('handles MCQ with choices instead of options', () => {
      const input = JSON.stringify([{
        type: 'multiple-choice',
        question: 'Test with choices?',
        choices: ['A) Choice 1', 'B) Choice 2', 'C) Choice 3', 'D) Choice 4'],
        correctAnswer: 'A',
        explanation: 'Test'
      }]);
      
      const parsed = parseQuestions(input);
      const processed = processQuestions(parsed);
      
      expect(processed).toHaveLength(1);
      expect(processed[0].options).toHaveLength(4);
      console.log('✅ MCQ with "choices" field handled correctly');
    });
  });

  // ========== PERFORMANCE TEST ==========
  describe('Performance', () => {
    test('processes 100 mixed questions quickly', () => {
      const questions = [];
      const types = [
        'multiple-choice',
        'true-false',
        'fill-in-the-blank',
        'short-answer',
        'long-answer'
      ];
      
      for (let i = 0; i < 100; i++) {
        const type = types[i % types.length];
        const question: Record<string, unknown> = {
          type,
          question: `Test question ${i + 1}?`,
          correctAnswer: 'Test answer',
          explanation: 'Test explanation'
        };
        
        if (type === 'multiple-choice') {
          question.options = ['A) Opt 1', 'B) Opt 2', 'C) Opt 3', 'D) Opt 4'];
        }
        
        questions.push(question);
      }
      
      const input = JSON.stringify(questions);
      
      const start = performance.now();
      const parsed = parseQuestions(input);
      const processed = processQuestions(parsed);
      const duration = performance.now() - start;
      
      expect(processed).toHaveLength(100);
      expect(duration).toBeLessThan(500);  // Should process in under 500ms
      
      console.log(`⚡ Processed 100 mixed questions in ${duration.toFixed(2)}ms`);
    });
  });
});
