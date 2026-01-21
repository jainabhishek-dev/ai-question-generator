/**
 * Comprehensive test question fixture covering all edge cases:
 * - Nested math patterns ($45 + $23 = 68$)
 * - Ambiguous decimals ($3.14$ vs currency)
 * - LaTeX symbols (\circ, \frac, \pi, etc.)
 * - Markdown tables with math/currency content
 * - Code blocks with $ symbols
 * - Image placeholders [IMG: description]
 * - Sentence boundary errors (2,400.They)
 * - Valid compound words (unsustainable)
 * - Multi-paragraph formatting
 * - Nested lists
 * - Currency in prose (\$45.99)
 * - Complex equations
 */

import type { Question } from '@/types/questions';

export const COMPREHENSIVE_TEST_QUESTION: Question = {
  type: 'multiple-choice',
  question: `# Complex Mathematical & Formatting Test

A company has ₹2,400.They initially allocate ₹360 for equipment.

## Mathematical Concepts

1. The angle measure is $70^\\circ$ (degrees symbol test)
2. The value of π (pi) is approximately $3.14$ (ambiguous decimal - should remain math)
3. Calculate the fraction: $\\frac{3}{4} = 0.75$ (LaTeX fraction)
4. Temperature: $25^\\circ C$ with special characters like $\\{ x \\}$ for sets

## Business Scenario

The initial budget was ₹2,400. They allocate ₹360 for equipment which is considered too high and unsustainable development practices. The team proposes a reallocation.

### Data Table

| Item | Formula | Cost |
|------|---------|------|
| Equipment | $x^2 + 2x$ | ₹360 |
| Materials | $\\frac{a}{b}$ | ₹150 |
| Total | $\\pi r^2$ | ₹510 |

## Code Example

\`\`\`python
# Calculate budget
budget = 2400
equipment = 360
remaining = budget - equipment
\`\`\`

## Visual Aid

[IMG: graph showing budget allocation with pie chart]

The relationship between variables can be shown as: $a^2 + b^2 = c^2$ (Pythagorean theorem).

[IMG: diagram of right triangle showing sides a, b, c]

### Key Points

- Valid compound: unsustainable operational costs
- Mathematical constant: $\\pi \\approx 3.14159$
- Set notation: $\\{1, 2, 3\\}$
- Another image: [IMG: bar chart comparing costs]

**Final calculation**: If equipment costs ₹360, materials cost ₹150, total is ₹510.`,

  options: [
    'A) $70^\\circ$ and $\\frac{3}{4}$',
    'B) ₹360 and $3.14$',
    'C) $\\pi r^2$ equals ₹510',
    'D) All values are correct'
  ],
  
  correctAnswer: 'D',
  
  explanation: `All the mathematical expressions and currency values are correct:

1. **Angle**: $70^\\circ$ represents 70 degrees using LaTeX \\circ command
2. **Pi approximation**: $3.14$ is a mathematical value (not currency)
3. **Fraction**: $\\frac{3}{4} = 0.75$ uses proper LaTeX fraction notation
4. **Currency**: ₹360, ₹150, and ₹510 are properly formatted with rupee symbols
5. **Special symbols**: Sets like $\\{1, 2, 3\\}$ use escaped braces in LaTeX

The table combines math formulas ($x^2 + 2x$, $\\frac{a}{b}$, $\\pi r^2$) with currency values (₹360, ₹150, ₹510), demonstrating proper separation of mathematical and financial notation.

Image placeholders like [IMG: graph showing budget allocation] are preserved unchanged throughout processing.`
};

/**
 * Raw JSON string with single-backslash LaTeX (simulating direct AI response)
 * This tests the production bug where \circ causes JSON parsing failure
 */
export const RAW_LATEX_TEST_QUESTION = `[
  {
    "type": "multiple-choice",
    "question": "A straight road intersects two parallel railway tracks. If the angle formed between the road and the first railway track is $70^\\circ$, what is the measure of the corresponding angle formed between the road and the second railway track?",
    "options": [
      "A) $70^\\circ$",
      "B) $110^\\circ$",
      "C) $90^\\circ$",
      "D) $180^\\circ$"
    ],
    "correctAnswer": "A",
    "explanation": "When two parallel lines are intersected by a transversal, the corresponding angles are equal. Since the angle formed between the road and the first track is given as $70^\\circ$, the corresponding angle formed with the second track will also be $70^\\circ$."
  }
]`;
