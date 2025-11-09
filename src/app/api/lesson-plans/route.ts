import { NextRequest, NextResponse } from 'next/server';
import { getUserLessonPlans } from '@/lib/lessonPlanDatabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const subject = searchParams.get('subject') || undefined;
    const grade = searchParams.get('grade') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId parameter is required'
      }, { status: 400 });
    }

    const result = await getUserLessonPlans(userId, {
      subject,
      grade,
      limit,
      includeDeleted: false
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data || []
    });

  } catch (error) {
    console.error('Get lesson plans error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch lesson plans'
    }, { status: 500 });
  }
}