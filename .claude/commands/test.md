# Run Tests

Run tests with context about testing philosophy.

## Testing Philosophy (from skills/TESTING.md)
- Test behavior, not implementation
- No mocks or spies - use real dependencies
- Keep tests DRY - share setup and utilities
- Focus on critical paths, not every edge case

## Run Tests

```bash
# Run all tests
pnpm test --run

# Run with coverage
pnpm test --run --coverage

# Run specific file
pnpm test --run <pattern>

# Run in watch mode (user must request explicitly)
# pnpm test
```

## If Tests Fail

1. Read the error message carefully
2. Identify if it's:
   - A real bug in the code
   - A test that needs updating
   - A flaky test (shouldn't exist per our philosophy)
3. Fix the root cause, not the symptom
4. Re-run tests to confirm fix

## Test Coverage

Current threshold: 70% (lines, functions, branches, statements)

If adding new code:
- Add tests for critical paths
- Don't test trivial getters/setters
- Don't test framework internals
- Use behavior-focused test names

## Example Good Test

```typescript
it('should allow parent to approve swap request', async () => {
  const request = createTestSwapRequest({ status: 'pending' });
  renderWithProviders(<SwapRequestCard request={request} />);

  await userEvent.click(screen.getByRole('button', { name: /approve/i }));

  await waitFor(() => {
    expect(screen.getByText(/Swap approved/)).toBeInTheDocument();
  });
});
```
