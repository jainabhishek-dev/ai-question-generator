import { NextRequest, NextResponse } from 'next/server';
import { extractLearningObjectives } from '@/lib/gemini';
import { validateObjectivesResponse } from '@/lib/lessonPlanPrompt';
import { ObjectiveExtractionResponse } from '@/types/lessonPlan';

export async function POST(req: NextRequest): Promise<NextResponse<ObjectiveExtractionResponse>> {
  try {
    const formData = await req.formData();
    
    const pdfFile = formData.get('pdfFile') as File;
    const subject = formData.get('subject') as string;
    const grade = formData.get('grade') as string;

    // Validate request data
    if (!pdfFile || !subject || !grade) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: pdfFile, subject, and grade are required'
      }, { status: 400 });
    }

    // Validate PDF file
    if (pdfFile.type !== 'application/pdf') {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Please upload a PDF file.'
      }, { status: 400 });
    }

    // Validate PDF file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (pdfFile.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'PDF file is too large. Please upload a file smaller than 10MB.'
      }, { status: 400 });
    }

    console.log(`📚 Extracting objectives from PDF: ${pdfFile.name} for ${subject} - ${grade}`);

    // Call Gemini AI to extract objectives with direct PDF processing
    const aiResponse = await extractLearningObjectives(
      pdfFile,
      subject,
      grade
    );

    // Validate AI response
    const validation = validateObjectivesResponse(aiResponse);
    if (!validation.valid || !validation.data) {
      console.error('Invalid AI response for objective extraction:', validation.error);
      return NextResponse.json({
        success: false,
        error: validation.error || 'Failed to extract valid learning objectives from the content'
      }, { status: 500 });
    }

    const { objectives, totalFound, filtered } = validation.data;

    // Convert to LearningObjective format
    const learningObjectives = objectives.map(text => ({ text }));

    console.log(`✅ Successfully extracted ${objectives.length} objectives (${totalFound} total found, filtered: ${filtered})`);

    return NextResponse.json({
      success: true,
      data: {
        objectives: learningObjectives,
        totalFound,
        filtered
      }
    });

  } catch (error) {
    console.error('Objective extraction error:', error);
    
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
        error: 'Request timed out. The PDF content might be too large. Please try with a smaller file.'
      }, { status: 408 });
    }

    return NextResponse.json({
      success: false,
      error: `Failed to extract learning objectives: ${errorMessage}`
    }, { status: 500 });
  }
}