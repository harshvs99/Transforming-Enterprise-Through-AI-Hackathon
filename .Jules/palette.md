# Palette's Journal - Critical UX/Accessibility Learnings

## 2025-05-14 - [Accessibility in "Thinking Machines" B2B Platform]
**Learning:** In a data-heavy B2B application like "Thinking Machines", accessibility can often be overlooked in favor of complex visualizations. For conversational interfaces (the "Ask Anything" feature), ensuring that the input area is fully accessible to screen readers is critical. Visually hidden labels (`sr-only`) allow us to maintain the minimalist Neo-Brutalist design while providing the necessary context for users with visual impairments.
**Action:** Always include `<label>` elements with the `sr-only` class for any form inputs that don't have visible labels, and use dynamic `aria-label` attributes on buttons to reflect their current state (e.g., "Executing query" during loading).
