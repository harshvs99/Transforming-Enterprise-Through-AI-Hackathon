## 2025-05-15 - Sidebar Accessibility Implementation
**Learning:** In a dashboard application with a collapsible or icon-only sidebar, explicit `aria-label` on navigation links and `aria-current="page"` are critical for screen reader users to understand their location and destination. Additionally, using `role="status"` for dynamic system indicators (like LLM status) ensures that background state changes are communicated without requiring user focus.
**Action:** Always include `aria-label` on icon-heavy navigation and use `role="status"` for any live system health or connectivity indicators.
