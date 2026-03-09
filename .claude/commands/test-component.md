---
description: Generate comprehensive unit tests for a React component covering happy path, edge cases, error handling, accessibility, and user interactions
---

# Task: Generate Comprehensive Unit Tests

Generate complete unit tests for the React component at: **{{file_path}}**

## Testing Requirements

Create tests using Vitest and @testing-library/react that comprehensively cover:

### 1. Happy Path Tests
- Component renders successfully with default/required props
- Component displays correct content and elements
- Component behaves as expected with valid user interactions
- State updates work correctly in normal scenarios
- Data flows properly through the component

### 2. Edge Cases
- Component with empty/null/undefined props
- Component with minimum/maximum values
- Component with very long strings or large datasets
- Component with special characters or unusual inputs
- Component behavior at boundaries (e.g., empty lists, single items)
- Different screen sizes or viewport conditions (if applicable)

### 3. Error Handling
- Invalid prop types or values
- Missing required props
- API/async operation failures
- Network errors and loading states
- Error boundaries and fallback UI
- User input validation errors

### 4. Accessibility
- Proper ARIA labels and roles
- Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- Screen reader compatibility
- Focus management
- Color contrast and visual indicators
- Semantic HTML structure

### 5. User Interactions
- Click events on all interactive elements
- Form submissions and validations
- Input changes and updates
- Hover and focus states
- Drag and drop (if applicable)
- Touch interactions (if applicable)

### 6. Conditional Rendering
- Different UI states (loading, error, success, empty)
- Visibility toggles and conditional content
- Feature flags or permission-based rendering
- Responsive behavior

### 7. Props and State Management
- All prop combinations
- Default props behavior
- Prop changes and re-renders
- State updates and side effects
- Context or global state interactions

## Implementation Guidelines

1. **Read the component file first** to understand:
   - Component structure and logic
   - Props interface and types
   - Dependencies and hooks used
   - External services or API calls
   - Child components and composition

2. **Create test file** at one of these locations (check project convention):
   - Same directory: `[component-name].test.tsx`
   - Tests directory: `__tests__/[component-name].test.tsx`

3. **Use proper testing utilities:**
   - `render` from @testing-library/react
   - `screen` for queries (prefer accessible queries: getByRole, getByLabelText)
   - `userEvent` from @testing-library/user-event for interactions
   - `waitFor` and `waitForElementToBeRemoved` for async operations
   - `vi.mock` for mocking dependencies
   - `vi.fn()` for mock functions

4. **Mock external dependencies:**
   - API calls and data fetching
   - Next.js router (already mocked in setup.ts)
   - Third-party libraries
   - File uploads or external services
   - Date/time functions if needed

5. **Test structure:**
   - Use descriptive `describe` blocks to group related tests
   - Use clear test names that explain what is being tested
   - Follow AAA pattern: Arrange, Act, Assert
   - Keep tests isolated and independent

6. **Best practices:**
   - Prefer user-centric queries (getByRole, getByLabelText) over test IDs
   - Test behavior, not implementation details
   - Avoid testing library internals
   - Use `userEvent` instead of `fireEvent` for realistic interactions
   - Clean up side effects in afterEach (already in setup.ts)
   - Add comments for complex test scenarios

7. **Coverage goals:**
   - Aim for 100% branch coverage
   - Test all conditional logic paths
   - Verify all user-visible behaviors
   - Include positive and negative test cases

## Example Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentName } from './ComponentName'

describe('ComponentName', () => {
  describe('Happy Path', () => {
    it('renders with required props', () => {
      // Test implementation
    })

    it('handles user interaction correctly', async () => {
      const user = userEvent.setup()
      // Test implementation
    })
  })

  describe('Edge Cases', () => {
    it('handles empty data gracefully', () => {
      // Test implementation
    })
  })

  describe('Error Handling', () => {
    it('displays error message when API fails', async () => {
      // Test implementation
    })
  })

  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      // Test implementation
    })
  })
})
```

## Output

After creating the tests:
1. Show the file path of the created test file
2. Summarize the test coverage (number of tests per category)
3. Suggest running: `pnpm test [test-file-path]` to execute the tests
4. Note any mocks or setup that might need adjustment

---

**Note:** If the component is complex or has many dependencies, ask clarifying questions about specific scenarios or edge cases to prioritize.
