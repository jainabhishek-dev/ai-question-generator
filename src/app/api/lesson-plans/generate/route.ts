import { NextRequest, NextResponse } from 'next/server';
import { generateLessonPlan } from '@/lib/gemini';
import { validateLessonPlanResponse } from '@/lib/lessonPlanPrompt';
import { saveLessonPlan } from '@/lib/lessonPlanDatabase';
import { LessonPlanGenerationRequest, LessonPlanGenerationResponse, LessonPlan } from '@/types/lessonPlan';

export async function POST(req: NextRequest): Promise<NextResponse<LessonPlanGenerationResponse>> {
  try {
    const body: LessonPlanGenerationRequest = await req.json();

    // Validate request body
    if (!body.formData || !body.selectedObjective || !body.learnerLevel || !body.duration) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: formData, selectedObjective, learnerLevel, and duration are required'
      }, { status: 400 });
    }

    // Validate formData
    if (!body.formData.subject || !body.formData.grade || !body.formData.sections || body.formData.sections.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid form data: subject, grade, and sections are required'
      }, { status: 400 });
    }

    // Validate learner level
    if (!['beginner', 'intermediate', 'advanced'].includes(body.learnerLevel)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid learner level. Must be beginner, intermediate, or advanced'
      }, { status: 400 });
    }

    // Validate duration
    if (![30, 45, 60].includes(body.duration)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid duration. Must be 30, 45, or 60 minutes'
      }, { status: 400 });
    }

    console.log(`📝 Generating lesson plan for ${body.formData.subject} - ${body.formData.grade}`);
    console.log(`🎯 Objective: ${body.selectedObjective.substring(0, 100)}...`);
    console.log(`👥 Level: ${body.learnerLevel}, ⏱️ Duration: ${body.duration} minutes`);

    // Call Gemini AI to generate lesson plan
    const aiResponse = await generateLessonPlan(
      body.formData,
      body.selectedObjective,
      body.learnerLevel,
      body.duration
    );

    // Validate AI response
    const validation = validateLessonPlanResponse(aiResponse, body.duration);
    if (!validation.valid || !validation.data) {
      console.error('Invalid AI response for lesson plan generation:', validation.error);
      return NextResponse.json({
        success: false,
        error: validation.error || 'Failed to generate a valid lesson plan'
      }, { status: 500 });
    }

    // Log duration warning if present
    if (validation.warning) {
      console.warn('Lesson plan duration validation:', validation.warning);
    }

    const { sections } = validation.data;

    // Create lesson plan object
    const lessonPlan: LessonPlan = {
      subject: body.formData.subject,
      grade: body.formData.grade,
      learningObjective: body.selectedObjective,
      learnerLevel: body.learnerLevel,
      durationMinutes: body.duration,
      sections,
      additionalNotes: body.formData.additionalNotes,
    };

    console.log(`✅ Lesson plan generated successfully: "${lessonPlan.learningObjective}"`);

    // Save to database if userId is provided
    if (body.userId) {
      try {
        const saveResult = await saveLessonPlan(lessonPlan, body.userId);
        if (saveResult.success && saveResult.data) {
          lessonPlan.id = saveResult.data.id;
          lessonPlan.createdAt = saveResult.data.created_at;
          console.log(`💾 Lesson plan saved to database with ID: ${saveResult.data.id}`);
        } else {
          console.warn('Failed to save lesson plan to database:', saveResult.error);
          // Don't fail the entire request if saving fails
        }
      } catch (saveError) {
        console.warn('Database save error (non-critical):', saveError);
        // Continue without failing the request
      }
    }

    return NextResponse.json({
      success: true,
      data: lessonPlan
    });

  } catch (error) {
    console.error('Lesson plan generation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Handle specific API errors
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return NextResponse.json({
        success: false,
        error: 'API rate limit exceeded. Please try again in a few minutes.'
      }, { status: 429 });
    }

    if (errorMessage.includes('timeout')) {
      return NextResponse.json({
        success: false,
        error: 'Request timed out. Please try again with simpler requirements.'
      }, { status: 408 });
    }

    if (errorMessage.includes('content policy') || errorMessage.includes('safety')) {
      return NextResponse.json({
        success: false,
        error: 'Content violates safety policies. Please adjust your requirements and try again.'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: `Failed to generate lesson plan: ${errorMessage}`
    }, { status: 500 });
  }
}