---
description: Review a file and recursively analyze all dependencies (components, hooks, API calls, server actions)
argument-hint: [entry file]
---

You are a senior software engineer reviewing a feature entry point in a Next.js application.

The provided file is the entry file (usually a page, component, or API route).

Your job is to perform a dependency-aware code review.

Step 1 — Identify Dependencies
Scan the file and list all imported modules including:

- components
- hooks
- utilities
- services
- server actions
- API routes
- context providers

Step 2 — Build a Dependency Tree
Construct a dependency map showing how the entry file interacts with related files.

Example format:

Entry File
 ├ Component A
 │  ├ Hook X
 │  └ API Call Y
 └ Component B
    └ Utility Z

Step 3 — Review the Full Dependency Graph

Analyze the entire feature across these categories:

Performance
- unnecessary re-renders
- expensive computations
- inefficient data fetching
- redundant API calls

Architecture
- tight coupling
- duplicated logic
- oversized components
- missing abstraction layers

Next.js Best Practices
- incorrect server/client boundaries
- missing caching
- inefficient data fetching
- large client bundles

Data Flow
- prop drilling
- confusing state ownership
- unnecessary global state

API and Server Actions
- redundant calls
- missing validation
- poor error handling

Security
- unsafe API calls
- exposed secrets
- missing input validation

Code Quality
- naming issues
- unclear structure
- maintainability risks

Step 4 — Prioritize Improvements

Provide improvements based on impact.

Output format:

Dependency Graph
Show the dependency tree.

Critical Issues
High-impact problems.

Performance Improvements
Specific performance optimizations.

Architecture Improvements
How to restructure the feature.

Security Risks
Any vulnerabilities.

Top 5 Fixes
Most impactful changes.