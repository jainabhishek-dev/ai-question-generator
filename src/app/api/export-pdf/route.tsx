
import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { ExportPdfRequest, QuestionRecord } from '../../../types/question';
import { ExportPdfDocument } from '../../../server/components/ExportPdfDocument';
import { pdf } from '@react-pdf/renderer';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body: ExportPdfRequest = await req.json();
    const { selectedIds, userId, exportType, preferences, accessToken } = body;

    // Debug log incoming request data
    console.log('=== EXPORT PDF DEBUG ===');
    console.log('Selected IDs:', selectedIds);
    console.log('User ID:', userId);
    console.log('Export Type:', exportType);
    console.log('Access Token:', accessToken?.slice(0, 12) + '...');

    // Validate required fields
    if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0 || !exportType || !userId || !accessToken) {
      return NextResponse.json({
        error: "Invalid request data",
        details: "Missing required fields: selectedIds, userId, exportType, or accessToken"
      }, { status: 400 });
    }

    // Validate export type
    if (!['worksheet', 'answer-key'].includes(exportType)) {
      return NextResponse.json({
        error: "Invalid export type",
        details: "Export type must be 'worksheet' or 'answer-key'"
      }, { status: 400 });
    }

    // Create Supabase client with user's JWT for auth
    const supabaseUrl = process.env.SUPABASE_URL ?? '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? '';
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return NextResponse.json({
        error: "Server configuration error",
        details: "Missing Supabase configuration"
      }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    console.log('Querying Supabase for questions...');
    const { data, error, status, statusText } = await supabase
      .from("questions")
      .select(`
        id,
        question,
        question_type,
        options,
        correct_answer,
        explanation,
        difficulty,
        grade,
        created_at,
        user_id
      `)
      .in("id", selectedIds)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error('Supabase query error:', {
        error,
        status,
        statusText,
        selectedIds,
        userId
      });
      return NextResponse.json({
        error: 'Failed to fetch questions from database',
        details: error.message || error,
        status,
        statusText
      }, { status: 403 });
    }

    if (!data || data.length === 0) {
      console.warn('No questions found for the given IDs and user. Data:', data);
      return NextResponse.json({
        error: 'No questions found',
        details: `No questions found for the given IDs and user. Requested ${selectedIds.length} questions.`
      }, { status: 404 });
    }

    console.log(`Successfully fetched ${data.length} questions from database`);

    // More robust grade handling
    const transformedQuestions: QuestionRecord[] = data.map(q => ({
      id: q.id,
      question: q.question || '',
      question_type: q.question_type || 'multiple-choice',
      options: q.options,
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'medium',
      grade: q.grade && q.grade.trim() ? q.grade : 'Grade 3',
      created_at: q.created_at,
      user_id: q.user_id,
    }));

    console.log('Generating PDF with React-PDF...');
    const pdfStream = await pdf(
      <ExportPdfDocument
        questions={transformedQuestions}
        exportType={exportType as "worksheet" | "answer-key"}
        preferences={preferences || {
          formatting: {
            fontSize: 14,
            showHeaders: true,
            showFooters: true,
            questionSpacing: 24,
          },
          branding: {
            title: exportType === 'worksheet' ? 'Question Worksheet' : 'Answer Key',
          }
        }}
      />
    ).toBuffer();
    // Convert ReadableStream to Buffer
    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);
    // Return PDF response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${exportType === 'worksheet' ? 'worksheet' : 'answer-key'}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    let errorMsg = 'Unknown error occurred';
    let errorDetails = '';
    if (err && typeof err === 'object') {
      if ('message' in err) {
        errorMsg = String((err as { message?: string }).message);
      }
      if ('stack' in err) {
        errorDetails = String((err as { stack?: string }).stack);
      }
    }
    console.error("PDF export error:", {
      message: errorMsg,
      error: err,
      stack: errorDetails
    });
    // Return appropriate error status
    const isTimeoutError = errorMsg.includes('timeout') || errorMsg.includes('Timeout');
    const isMemoryError = errorMsg.includes('memory') || errorMsg.includes('heap');
    let statusCode = 500;
    if (isTimeoutError) {
      statusCode = 504;
      errorMsg = 'PDF generation timed out. Please try with fewer questions.';
    } else if (isMemoryError) {
      statusCode = 507;
      errorMsg = 'PDF generation failed due to memory constraints. Please try with fewer questions.';
    }
    return NextResponse.json({
      error: "Failed to generate PDF",
      details: errorMsg,
      timestamp: new Date().toISOString(),
    }, { status: statusCode });
  }
}
