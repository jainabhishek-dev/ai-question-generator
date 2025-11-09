import React from "react";
import { LessonPlan, LESSON_PLAN_SECTIONS } from "../../types/lessonPlan";

interface Props {
  lessonPlan: LessonPlan;
}

const SECTION_ORDER = ['teacherPreparation', 'iDo', 'weDo', 'youDo', 'conclusion', 'homework'] as const;

export const LessonPlanPdfDocument: React.FC<Props> = ({ lessonPlan }) => {
  
  // Convert sections object to ordered array
  const sectionsArray = SECTION_ORDER
    .map(key => {
      const sectionData = lessonPlan.sections[key as keyof typeof lessonPlan.sections];
      if (sectionData) {
        return {
          key,
          title: LESSON_PLAN_SECTIONS[key as keyof typeof LESSON_PLAN_SECTIONS],
          content: sectionData.content,
          timeAllocation: sectionData.timeAllocation
        };
      }
      return null;
    })
    .filter((section): section is NonNullable<typeof section> => section !== null);

  const formatContent = (content: string) => {
    // Simple markdown-like formatting for PDF
    return content
      .split('\n')
      .map((line, index) => {
        line = line.trim();
        if (!line) return <br key={index} />;
        
        // Headers
        if (line.startsWith('### ')) {
          return <h4 key={index}>{line.slice(4)}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={index}>{line.slice(3)}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={index}>{line.slice(2)}</h2>;
        }
        
        // Lists
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <ul key={index}>
              <li>{line.slice(2)}</li>
            </ul>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          return (
            <ol key={index}>
              <li>{line.replace(/^\d+\.\s/, '')}</li>
            </ol>
          );
        }
        
        // Bold text **text**
        if (line.includes('**')) {
          const parts = line.split('**');
          return (
            <p key={index}>
              {parts.map((part, i) => 
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
              )}
            </p>
          );
        }
        
        // Regular paragraph
        return <p key={index}>{line}</p>;
      });
  };

  return (
    <div className="container">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2em', borderBottom: '2px solid #2563eb', paddingBottom: '1em' }}>
        <h1 style={{ fontSize: '2em', margin: '0', color: '#1e40af' }}>{lessonPlan.learningObjective}</h1>
        <div style={{ marginTop: '1em', color: '#64748b' }}>
          <strong>AI-Generated Lesson Plan</strong>
        </div>
      </div>

      {/* Metadata */}
      <div className="metadata">
        <div className="metadata-item">
          <span className="metadata-label">Subject:</span> {lessonPlan.subject}
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Grade:</span> {lessonPlan.grade}
        </div>
        {lessonPlan.chapterName && (
          <div className="metadata-item">
            <span className="metadata-label">Chapter:</span> {lessonPlan.chapterName}
          </div>
        )}
        <div className="metadata-item">
          <span className="metadata-label">Duration:</span> {lessonPlan.durationMinutes} minutes
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Level:</span> {lessonPlan.learnerLevel}
        </div>
        <div style={{ marginTop: '1em' }}>
          <div className="metadata-label">Learning Objective:</div>
          <div>{lessonPlan.learningObjective}</div>
        </div>
      </div>

      {/* Sections */}
      {sectionsArray.map((section) => (
        <div key={section.key} className="section">
          <div className="section-title">
            {section.title}
            {section.timeAllocation && (
              <span style={{ fontSize: '0.9em', fontWeight: 'normal', color: '#64748b' }}>
                {' '}({section.timeAllocation} min)
              </span>
            )}
          </div>
          <div>
            {formatContent(section.content)}
          </div>
        </div>
      ))}

      {/* Additional Notes */}
      {lessonPlan.additionalNotes && (
        <div className="section" style={{ backgroundColor: '#fef3c7' }}>
          <div className="section-title" style={{ color: '#d97706' }}>
            📝 Additional Notes
          </div>
          <div>
            {formatContent(lessonPlan.additionalNotes)}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ 
        marginTop: '3em', 
        padding: '1em', 
        textAlign: 'center', 
        borderTop: '1px solid #e2e8f0',
        color: '#64748b',
        fontSize: '0.9em'
      }}>
        <p>Generated with AI Question Generator • {new Date().toLocaleDateString()}</p>
        <p>This lesson plan is AI-generated and should be reviewed by an educator before use.</p>
      </div>
    </div>
  );
};