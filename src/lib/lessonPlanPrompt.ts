import { 
  LessonPlanFormData, 
  LESSON_PLAN_SECTIONS,
  OBJECTIVE_LIMITS,
  DURATION_OPTIONS,
  LEARNER_LEVEL_OPTIONS 
} from '@/types/lessonPlan';

/**
 * Create prompt for extracting learning objectives from PDF content
 */
export const createObjectiveExtractionPrompt = (
  subject: string,
  grade: string
): string => {
  return `You are an expert curriculum analyst. Analyze the PDF chapter provided with this request and extract the key learning objectives/learning outcomes covered.

PDF ANALYSIS INSTRUCTIONS:
Carefully examine the PDF chapter content, including text, diagrams, activities, and examples to identify specific learning objectives.

CONTEXT:
- Subject: ${subject}
- Grade Level: ${grade}
- Maximum objectives to return: ${OBJECTIVE_LIMITS.maxObjectives}

INSTRUCTIONS:
1. Analyze the chapter content thoroughly to identify SPECIFIC learning objectives related to concrete concepts, formulas, phenomena, or processes
2. Focus on measurable, actionable learning goals that reference actual content from the chapter
3. Extract objectives that mention specific scientific concepts, mathematical formulas, historical events, or detailed processes rather than generic learning goals
4. If more than ${OBJECTIVE_LIMITS.maxObjectives} objectives are found, return only the ${OBJECTIVE_LIMITS.maxObjectives} most important and content-specific ones for ${subject} at ${grade} level
5. Each objective should be 1-2 sentences maximum and include specific terminology from the chapter
6. AVOID generic statements like "understand main concepts" or "apply knowledge to solve problems"
7. IMPORTANT: Each objective MUST start with "To" followed by an action verb (e.g., "To understand", "To calculate", "To identify", "To explain")
8. INCLUDE specific details like formulas, phenomena, processes, or key terms from the actual chapter content

EXAMPLES of GOOD vs BAD objectives:
❌ BAD (Generic): "To understand the main concepts presented in this chapter"
✅ GOOD (Specific): "To understand that pressure is the force exerted per unit area and depends on both the magnitude of the force and the area over which it acts"

❌ BAD (Generic): "To apply acquired knowledge to solve relevant problems"
✅ GOOD (Specific): "To calculate the pressure exerted by liquids using the formula P = ρgh and solve problems involving liquid pressure at different depths"

❌ BAD (Generic): "To analyze relationships between different concepts"
✅ GOOD (Specific): "To explain how atmospheric pressure decreases with altitude and relates to weather patterns and breathing difficulties at high elevations"

REQUIRED OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:
{
  "objectives": [
    "Clear, specific learning objective 1",
    "Clear, specific learning objective 2",
    ...
  ],
  "totalFound": <total number of objectives identified before filtering>,
  "filtered": <true if more than ${OBJECTIVE_LIMITS.maxObjectives} objectives were found, false otherwise>
}

EXAMPLE OUTPUT:
{
  "objectives": [
    "To solve linear equations in one variable using algebraic methods",
    "To apply the distributive property to simplify algebraic expressions",
    "To graph linear equations on a coordinate plane",
    "To interpret the slope and y-intercept of linear equations in real-world contexts"
  ],
  "totalFound": 6,
  "filtered": true
}`;
};

/**
 * Create prompt for generating lesson plans based on selected objective
 */
export const createLessonPlanPrompt = (
  formData: LessonPlanFormData,
  selectedObjective: string,
  learnerLevel: 'beginner' | 'intermediate' | 'advanced',
  duration: 30 | 45 | 60
): string => {
  const selectedSections = formData.sections;
  const durationInfo = DURATION_OPTIONS.find(d => d.value === duration);
  const learnerInfo = LEARNER_LEVEL_OPTIONS.find(l => l.value === learnerLevel);

  // Map selected sections for inclusion
  const sectionsToInclude = selectedSections.map(section => {
    const key = Object.keys(LESSON_PLAN_SECTIONS).find(k => 
      LESSON_PLAN_SECTIONS[k as keyof typeof LESSON_PLAN_SECTIONS] === section
    );
    return key ? { key, name: section } : null;
  }).filter(Boolean);

  const contextSection = `
PDF CONTENT REFERENCE:
If a PDF chapter is provided with this request, use it as the primary source for factual information, examples, and context. Extract specific page numbers, figure references, and chapter content to make the lesson plan accurate and aligned with the textbook material.`;

  return `You are an expert lesson plan designer with deep knowledge of pedagogy and curriculum development. Create a comprehensive ${duration}-minute lesson plan focused on the specific learning objective below.

LESSON PARAMETERS:
- Learning Objective: "${selectedObjective}"
- Subject: ${formData.subject}
- Grade Level: ${formData.grade}
- Learner Level: ${learnerInfo?.label} (${learnerInfo?.description})
- Duration: ${durationInfo?.label} (${durationInfo?.description})
- Target Students: ${learnerInfo?.description}

${contextSection}

LESSON PLAN STRUCTURE:
Create detailed content for these sections: ${sectionsToInclude.map(s => s?.name).join(', ')}

DYNAMIC TIME ALLOCATION REQUIREMENTS:
- Allocate time across all selected sections to total exactly ${duration} minutes
- Teacher Preparation should ALWAYS have timeAllocation: 0 (this is pre-class preparation)
- For all other sections, distribute time based on content complexity and learning needs
- Each section must include a realistic timeAllocation field in minutes
- Total of all non-preparation sections must equal ${duration} minutes exactly

LEARNER LEVEL ADAPTATIONS:
${learnerLevel === 'beginner' ? `
- Use simple, clear language and step-by-step instructions
- Include more scaffolding and support
- Provide concrete examples before abstract concepts
- Break down complex tasks into smaller steps
- Include frequent check-ins for understanding` : ''}
${learnerLevel === 'intermediate' ? `
- Build on existing knowledge with moderate challenges
- Balance guided and independent practice
- Include connecting activities to prior learning  
- Provide opportunities for peer collaboration
- Introduce some problem-solving strategies` : ''}
${learnerLevel === 'advanced' ? `
- Present challenging, thought-provoking activities
- Encourage critical thinking and analysis
- Include extension activities and enrichment
- Promote independent exploration and discovery
- Connect to real-world applications and higher-order thinking` : ''}

ADDITIONAL NOTES:
${formData.additionalNotes || 'No additional notes provided.'}

REQUIRED OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:
{
  "title": "Engaging lesson title based on the objective",
  "sections": {
    ${sectionsToInclude.map(s => {
      const key = s?.key;
      return key ? `"${key}": {
      "content": "Detailed, actionable content for this section with specific activities, materials, and instructions",
      "timeAllocation": ${key === 'teacherPreparation' ? 0 : Math.floor(duration * 0.15)} 
    }` : '';
    }).filter(Boolean).join(',\n    ')}
  }
}

CONTENT QUALITY REQUIREMENTS:
1. Each section must contain specific, actionable instructions using "Say/Ask/Show" teaching methodology
2. Include materials needed, step-by-step activities, and assessment strategies
3. Ensure content aligns with the ${duration}-minute timeframe
4. Use grade-appropriate language and examples
5. Include differentiation strategies for diverse learners
6. Provide clear learning checkpoints and formative assessments
7. Ensure all content directly supports the learning objective: "${selectedObjective}"
8. When referencing PDF content, use actual page numbers and figure references (e.g., "Page 15, Figure 2.1" instead of placeholders like "[SB-5]")

TEACHING METHODOLOGY - Use "Say/Ask/Show" approach:
- SAY: What you will tell students directly
- ASK: Questions you will pose to students
- SHOW: Visual aids, demonstrations, or examples you will present

SECTION-SPECIFIC GUIDELINES (Use Say/Ask/Show format):
${sectionsToInclude.some(s => s?.key === 'teacherPreparation') ? `
- Teacher Preparation: List materials, setup instructions, key concepts to review, potential student misconceptions, and preparation checklist. Include specific page references when citing PDF content.` : ''}
${sectionsToInclude.some(s => s?.key === 'iDo') ? `
- I Do (Teacher Demonstration): 
  • SAY: Clear explanations and instructions you'll give
  • ASK: Guiding questions to check understanding  
  • SHOW: Worked examples, demonstrations, and visual aids with specific PDF references (e.g., "Page 12, Example 3.2")` : ''}
${sectionsToInclude.some(s => s?.key === 'weDo') ? `
- We Do (Guided Practice):
  • SAY: Instructions for collaborative work
  • ASK: Questions to facilitate peer discussion and problem-solving
  • SHOW: Scaffolded activities and supports, referencing specific PDF exercises when available` : ''}
${sectionsToInclude.some(s => s?.key === 'youDo') ? `
- You Do (Independent Practice):
  • SAY: Clear directions for independent work
  • ASK: Self-reflection questions for students
  • SHOW: Practice problems, tasks, or assignments with page references to PDF materials` : ''}
${sectionsToInclude.some(s => s?.key === 'conclusion') ? `
- Conclusion:
  • SAY: Summary statements and key takeaways
  • ASK: Exit ticket questions or comprehension checks
  • SHOW: Visual summary or preview of next lesson concepts` : ''}
${sectionsToInclude.some(s => s?.key === 'homework') ? `
- Homework:
  • SAY: Assignment instructions and expectations
  • ASK: Questions students should consider while completing work
  • SHOW: Specific problems, readings, or exercises with exact page references` : ''}

EXAMPLE JSON STRUCTURE (DO NOT COPY CONTENT, ONLY STRUCTURE):
{
  "title": "Mastering Linear Equation Solutions",
  "sections": {
    "teacherPreparation": {
      "content": "Materials: Whiteboard, markers, student worksheets\\n\\nKey Concepts to Review:\\n- Variable representation\\n- Inverse operations\\n\\nSetup: Write practice equations on board before class",
      "timeAllocation": 0
    },
    "iDo": {
      "content": "**SAY:** 'Today we'll learn to solve linear equations step by step.'\\n\\n**SHOW:** Present equation: 2x + 3 = 11\\n\\n**ASK:** 'What operation should we do first?'\\n\\n**SHOW:** Demonstrate solving steps", 
      "timeAllocation": 12
    },
    "weDo": {
      "content": "**SAY:** 'Now let's solve together.'\\n\\n**ASK:** Guide students through collaborative problem solving\\n\\n**SHOW:** Work through examples as a class",
      "timeAllocation": 15
    },
    "youDo": {
      "content": "**SAY:** 'Practice independently.'\\n\\n**SHOW:** Provide worksheet with varied problems\\n\\n**ASK:** Check understanding through individual work",
      "timeAllocation": 8
    }
  }
}

REMEMBER: 
- Teacher Preparation MUST have timeAllocation: 0
- All other sections should have realistic time allocations that sum to exactly ${duration} minutes
- Distribute time based on content needs, not fixed formulas`;
};

/**
 * Validate extracted objectives response
 */
export const validateObjectivesResponse = (response: string): { 
  valid: boolean; 
  data?: { objectives: string[]; totalFound: number; filtered: boolean }; 
  error?: string; 
} => {
  try {
    console.log("🔍 Validating objectives response...");
    console.log("📄 Raw objectives response preview:", response.substring(0, 200) + "...");
    
    // Try to clean the response - remove any markdown code blocks
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    console.log("🧹 Cleaned objectives response preview:", cleanedResponse.substring(0, 200) + "...");
    
    const parsed = JSON.parse(cleanedResponse);
    console.log("✅ Objectives JSON parsed successfully");
    console.log("📋 Parsed keys:", Object.keys(parsed));
    
    if (!parsed.objectives || !Array.isArray(parsed.objectives)) {
      console.log("❌ Invalid objectives array:", parsed.objectives);
      return { valid: false, error: 'Invalid objectives array' };
    }
    
    if (parsed.objectives.length === 0) {
      console.log("❌ No objectives found");
      return { valid: false, error: 'No objectives found' };
    }
    
    // Validate that all objectives start with "To"
    const invalidObjectives = parsed.objectives.filter((obj: string) => !obj.trim().toLowerCase().startsWith('to '));
    if (invalidObjectives.length > 0) {
      console.log("❌ Found objectives not starting with 'To':", invalidObjectives);
      // Auto-fix by adding "To " prefix to objectives that don't have it
      parsed.objectives = parsed.objectives.map((obj: string) => {
        const trimmed = obj.trim();
        if (!trimmed.toLowerCase().startsWith('to ')) {
          return `To ${trimmed.toLowerCase()}`;
        }
        return trimmed;
      });
      console.log("✅ Auto-fixed objectives with 'To' prefix");
    }

    // Validate objectives are content-specific (not too generic)
    const genericPatterns = [
      'main concepts presented',
      'apply acquired knowledge',
      'solve relevant problems',
      'analyze relationships between concepts',
      'understand the chapter',
      'learn about topics',
      'comprehend the material'
    ];
    
    const genericObjectives = parsed.objectives.filter((obj: string) => 
      genericPatterns.some(pattern => obj.toLowerCase().includes(pattern.toLowerCase()))
    );
    
    if (genericObjectives.length > 0) {
      console.log("⚠️ Warning: Found generic objectives that may need improvement:", genericObjectives);
      // Don't fail validation but log warning for improvement
    }
    
    if (typeof parsed.totalFound !== 'number' || typeof parsed.filtered !== 'boolean') {
      console.log("❌ Invalid metadata:", { totalFound: parsed.totalFound, filtered: parsed.filtered });
      return { valid: false, error: 'Invalid metadata format' };
    }
    
    console.log("✅ Objectives validation successful");
    return { 
      valid: true, 
      data: {
        objectives: parsed.objectives,
        totalFound: parsed.totalFound,
        filtered: parsed.filtered
      }
    };
  } catch (error) {
    console.log("❌ Objectives JSON parsing failed:", error);
    console.log("🔍 Objectives response that failed to parse:", response.substring(0, 500));
    return { valid: false, error: `Invalid JSON response: ${error instanceof Error ? error.message : 'Parse error'}` };
  }
};

/**
 * Validate lesson plan response
 */
export const validateLessonPlanResponse = (response: string, expectedDuration?: number): {
  valid: boolean;
  data?: { sections: Record<string, { content: string; timeAllocation?: number }> };
  error?: string;
  warning?: string;
} => {
  try {
    console.log("🔍 Validating lesson plan response...");
    console.log("📄 Raw response preview:", response.substring(0, 200) + "...");
    
    // Try to clean the response - remove any markdown code blocks
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    console.log("🧹 Cleaned response preview:", cleanedResponse.substring(0, 200) + "...");
    
    const parsed = JSON.parse(cleanedResponse);
    console.log("✅ JSON parsed successfully");
    console.log("📋 Parsed keys:", Object.keys(parsed));
    
    if (!parsed.sections || typeof parsed.sections !== 'object') {
      console.log("❌ Missing or invalid sections:", parsed.sections);
      return { valid: false, error: 'Invalid or missing sections' };
    }
    
    // Validate each section has required fields
    for (const [key, section] of Object.entries(parsed.sections)) {
      if (typeof section !== 'object' || !section) {
        console.log(`❌ Invalid section ${key}:`, section);
        return { valid: false, error: `Invalid section: ${key}` };
      }
      
      const sectionObj = section as Record<string, unknown>;
      if (!sectionObj.content) {
        console.log(`❌ Missing content in section ${key}:`, sectionObj);
        return { valid: false, error: `Missing content in section: ${key}` };
      }
    }
    
    // Validate duration allocation if expected duration is provided
    let warning: string | undefined;
    if (expectedDuration) {
      // Calculate total time excluding Teacher Preparation (which should always be 0)
      const sectionTimes = Object.entries(parsed.sections)
        .filter(([key]) => key !== 'teacherPreparation') // Exclude teacher prep
        .map(([, section]) => (section as { timeAllocation?: number }).timeAllocation || 0);
      
      const totalAllocatedTime = sectionTimes.reduce((sum, time) => sum + time, 0);
      
      // Verify Teacher Preparation is set to 0
      const teacherPrepSection = parsed.sections.teacherPreparation;
      if (teacherPrepSection && teacherPrepSection.timeAllocation !== 0) {
        console.log("❌ Teacher Preparation should have timeAllocation: 0");
        return { valid: false, error: 'Teacher Preparation must have timeAllocation set to 0 (pre-class preparation)' };
      }
      
      if (totalAllocatedTime !== expectedDuration) {
        const errorMsg = `❌ Duration mismatch: Sections total ${totalAllocatedTime} minutes but expected ${expectedDuration} minutes exactly`;
        console.log(errorMsg);
        console.log("📊 Section breakdown:", Object.entries(parsed.sections).map(([key, section]) => 
          `${key}: ${(section as { timeAllocation?: number }).timeAllocation || 0}min`));
        return { valid: false, error: errorMsg };
      } else {
        console.log(`✅ Duration validation passed: ${totalAllocatedTime} minutes matches expected ${expectedDuration} minutes`);
      }
    }
    
    console.log("✅ Lesson plan validation successful");
    return { valid: true, data: parsed, warning };
  } catch (error) {
    console.log("❌ JSON parsing failed:", error);
    console.log("🔍 Response that failed to parse:", response.substring(0, 500));
    return { valid: false, error: `Invalid JSON response: ${error instanceof Error ? error.message : 'Parse error'}` };
  }
};