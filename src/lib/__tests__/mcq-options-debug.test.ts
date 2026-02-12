/**
 * DEBUG TEST for MCQ Options Bug
 * Testing why options are not saved when type is "multiple-choice questions"
 */

import { parseQuestions, processQuestions } from '../questionParser';
import type { Question } from '../questionParser';

describe('🐛 DEBUG: MCQ Options Bug - Type Checking', () => {
  
  // Test Case 1: Type is exactly "multiple-choice" (WORKING)
  test('✅ WORKING: type="multiple-choice" should process options', () => {
    console.log('\n========================================');
    console.log('TEST 1: type="multiple-choice" (WORKING CASE)');
    console.log('========================================\n');
    
    const input = JSON.stringify([
      {
        type: 'multiple-choice',
        question: 'Test question with correct type?',
        options: ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'],
        correctAnswer: 'A',
        explanation: 'Test explanation'
      }
    ]);
    
    console.log('📥 INPUT JSON:', input);
    
    const parsed = parseQuestions(input);
    console.log('\n📋 PARSED (after parseQuestions):', JSON.stringify(parsed, null, 2));
    
    const processed = processQuestions(parsed);
    console.log('\n✨ PROCESSED (after processQuestions):', JSON.stringify(processed, null, 2));
    
    console.log('\n🔍 CHECKING OPTIONS ARRAY:');
    console.log('  - Type:', processed[0].type);
    console.log('  - Options length:', processed[0].options?.length);
    console.log('  - Options array:', processed[0].options);
    
    expect(processed).toHaveLength(1);
    expect(processed[0].type).toBe('multiple-choice');
    expect(processed[0].options).toBeDefined();
    expect(processed[0].options).toHaveLength(4);
    expect(processed[0].options?.[0]).toBe('A) Option 1');
    
    console.log('\n✅ TEST PASSED: Options are correctly processed!\n');
  });

  // Test Case 2: Type is "multiple-choice questions" (BUG)
  test('❌ BUG: type="multiple-choice questions" should also process options', () => {
    console.log('\n========================================');
    console.log('TEST 2: type="multiple-choice questions" (BUG CASE)');
    console.log('========================================\n');
    
    const input = JSON.stringify([
      {
        type: 'multiple-choice questions',
        question: 'Test question with extended type?',
        options: ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'],
        correctAnswer: 'A',
        explanation: 'Test explanation'
      }
    ]);
    
    console.log('📥 INPUT JSON:', input);
    
    const parsed = parseQuestions(input);
    console.log('\n📋 PARSED (after parseQuestions):', JSON.stringify(parsed, null, 2));
    
    const processed = processQuestions(parsed);
    console.log('\n✨ PROCESSED (after processQuestions):', JSON.stringify(processed, null, 2));
    
    console.log('\n🔍 CHECKING OPTIONS ARRAY:');
    console.log('  - Type:', processed[0].type);
    console.log('  - Type includes "multiple-choice":', processed[0].type.toLowerCase().includes('multiple-choice'));
    console.log('  - Options length:', processed[0].options?.length);
    console.log('  - Options array:', processed[0].options);
    
    expect(processed).toHaveLength(1);
    expect(processed[0].type).toBe('multiple-choice questions');
    
    // THIS IS WHERE THE BUG OCCURS - options should have length 4, not 0
    console.log('\n🐛 BUG CHECK:');
    if (processed[0].options?.length === 0) {
      console.log('  ❌ BUG CONFIRMED: Options array is EMPTY!');
      console.log('  Expected: 4 options');
      console.log('  Actual: 0 options');
    } else {
      console.log('  ✅ BUG FIXED: Options array has', processed[0].options?.length, 'items');
    }
    
    expect(processed[0].options).toBeDefined();
    expect(processed[0].options).toHaveLength(4);
    expect(processed[0].options?.[0]).toBe('A) Option 1');
    
    console.log('\n✅ TEST PASSED: Options are correctly processed!\n');
  });

  // Test Case 3: Mixed case variations
  test('🔍 Type checking with case variations', () => {
    console.log('\n========================================');
    console.log('TEST 3: Case Variation Tests');
    console.log('========================================\n');
    
    const testCases = [
      { type: 'Multiple-Choice', label: 'Title Case' },
      { type: 'MULTIPLE-CHOICE', label: 'Upper Case' },
      { type: 'Multiple-Choice Questions', label: 'Title Case with Questions' },
      { type: 'multiple-choice questions', label: 'Lower Case with Questions' }
    ];
    
    testCases.forEach(({ type, label }) => {
      console.log(`\n📝 Testing: ${label} (type="${type}")`);
      
      const input = JSON.stringify([{
        type,
        question: `Test with ${label}?`,
        options: ['A) Opt 1', 'B) Opt 2', 'C) Opt 3', 'D) Opt 4'],
        correctAnswer: 'A',
        explanation: 'Test'
      }]);
      
      const parsed = parseQuestions(input);
      const processed = processQuestions(parsed);
      
      console.log(`  - Type: "${processed[0].type}"`);
      console.log(`  - Type check passes: ${processed[0].type && processed[0].type.toLowerCase().includes('multiple-choice')}`);
      console.log(`  - Options count: ${processed[0].options?.length || 0}`);
      
      if (processed[0].options?.length === 4) {
        console.log(`  ✅ PASS: Options processed correctly`);
      } else {
        console.log(`  ❌ FAIL: Options NOT processed (expected 4, got ${processed[0].options?.length || 0})`);
      }
    });
  });

  // Test Case 4: Direct processQuestions test with raw data
  test('🧪 Direct processQuestions call (bypassing parseQuestions)', () => {
    console.log('\n========================================');
    console.log('TEST 4: Direct processQuestions Call');
    console.log('========================================\n');
    
    const rawQuestions = [
      {
        type: 'multiple-choice questions',
        question: 'Direct test question?',
        options: ['A) Opt 1', 'B) Opt 2', 'C) Opt 3', 'D) Opt 4'],
        correctAnswer: 'A',
        explanation: 'Test'
      }
    ];
    
    console.log('📥 RAW INPUT:', JSON.stringify(rawQuestions, null, 2));
    
    // Add debug logging inside the type check
    const q = rawQuestions[0];
    console.log('\n🔍 TYPE CHECKING LOGIC:');
    console.log('  - q.type:', q.type);
    console.log('  - typeof q.type:', typeof q.type);
    console.log('  - q.type exists:', !!q.type);
    console.log('  - q.type.toLowerCase():', q.type ? q.type.toLowerCase() : 'N/A');
    console.log('  - includes("multiple-choice"):', q.type ? q.type.toLowerCase().includes('multiple-choice') : false);
    console.log('  - Full condition:', q.type && q.type.toLowerCase().includes('multiple-choice'));
    
    const processed = processQuestions(rawQuestions);
    
    console.log('\n✨ PROCESSED OUTPUT:', JSON.stringify(processed, null, 2));
    console.log('\n📊 OPTIONS RESULT:');
    console.log('  - Options array:', processed[0].options);
    console.log('  - Length:', processed[0].options?.length);
    
    expect(processed[0].options).toHaveLength(4);
  });

  // Test Case 5: Simulating the actual database save format
  test('💾 Database Save Simulation', () => {
    console.log('\n========================================');
    console.log('TEST 5: Database Save Simulation');
    console.log('========================================\n');
    
    const aiResponse = `[
      {
        "type": "multiple-choice questions",
        "question": "Database simulation test?",
        "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
        "correctAnswer": "A",
        "explanation": "Test explanation"
      }
    ]`;
    
    console.log('📥 AI RESPONSE (as string):\n', aiResponse);
    
    // Step 1: Parse
    const parsed = parseQuestions(aiResponse);
    console.log('\n📋 STEP 1 - PARSED:', JSON.stringify(parsed, null, 2));
    
    // Step 2: Process
    const processed = processQuestions(parsed);
    console.log('\n✨ STEP 2 - PROCESSED:', JSON.stringify(processed, null, 2));
    
    // Step 3: Map to database format (simulating database.ts saveQuestions)
    const dbFormat = processed.map(q => ({
      question: q.question,
      question_type: q.type,
      options: q.options || null,
      correct_answer: q.correctAnswer,
      explanation: q.explanation || null
    }));
    
    console.log('\n💾 STEP 3 - DATABASE FORMAT:', JSON.stringify(dbFormat, null, 2));
    
    console.log('\n🔍 FINAL CHECK:');
    console.log('  - question_type:', dbFormat[0].question_type);
    console.log('  - options:', dbFormat[0].options);
    console.log('  - options length:', dbFormat[0].options?.length);
    
    // The bug: options should NOT be null or empty
    if (!dbFormat[0].options || dbFormat[0].options.length === 0) {
      console.log('\n❌ BUG REPRODUCED: Options are empty in database format!');
    } else {
      console.log('\n✅ BUG FIXED: Options are present in database format!');
    }
    
    expect(dbFormat[0].options).toBeTruthy();
    expect(dbFormat[0].options).toHaveLength(4);
  });
});

describe('🔬 Code Path Analysis', () => {
  test('Trace the exact code path in processQuestions', () => {
    console.log('\n========================================');
    console.log('CODE PATH ANALYSIS');
    console.log('========================================\n');
    
    // Simulate the exact code from questionParser.ts lines 401-425
    const q = {
      type: 'multiple-choice questions',
      question: 'Code path test?',
      options: ['A) Opt 1', 'B) Opt 2', 'C) Opt 3', 'D) Opt 4'],
      correctAnswer: 'A',
      explanation: 'Test'
    };
    
    console.log('Input question:', JSON.stringify(q, null, 2));
    console.log('\nExecuting type check logic:');
    console.log('---------------------------');
    
    let options: string[] = [];
    
    console.log('1. Initialize options:', options);
    console.log('2. Check condition: q.type && q.type.toLowerCase().includes("multiple-choice")');
    console.log('   - q.type:', q.type);
    console.log('   - q.type (exists):', !!q.type);
    console.log('   - q.type.toLowerCase():', q.type.toLowerCase());
    console.log('   - includes("multiple-choice"):', q.type.toLowerCase().includes('multiple-choice'));
    console.log('   - RESULT:', q.type && q.type.toLowerCase().includes('multiple-choice'));
    
    if (q.type && q.type.toLowerCase().includes('multiple-choice')) {
      console.log('\n✅ Condition PASSED - Processing options...');
      const rawOptions = q.options || [];
      console.log('   - rawOptions:', rawOptions);
      
      if (Array.isArray(rawOptions)) {
        console.log('   - rawOptions is Array: YES');
        options = rawOptions.map(opt => String(opt));
        console.log('   - Mapped options:', options);
      }
    } else {
      console.log('\n❌ Condition FAILED - Skipping options processing');
    }
    
    console.log('\n3. Final options array:', options);
    console.log('   - Length:', options.length);
    
    expect(options).toHaveLength(4);
  });
});
