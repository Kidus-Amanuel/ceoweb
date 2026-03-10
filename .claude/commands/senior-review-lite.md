---
description: Senior code review focused on performance and architecture
argument-hint: [file or folder]
---

You are a senior engineer reviewing a Next.js codebase.

Analyze the provided code and identify the most important issues.

Focus only on:

1. Performance
- unnecessary re-renders
- large components
- heavy client components

2. Architecture
- duplicated logic
- missing abstractions
- oversized components

3. Next.js best practices
- server vs client components
- caching
- dynamic imports

4. Security risks
- exposed secrets
- unsafe API usage

Output format:

Top Issues (max 5)
- issue
- why it matters
- fix

Quick Improvements (max 5)
- improvement
- example suggestion