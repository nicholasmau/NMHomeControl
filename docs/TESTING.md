# Testing Guide

## Overview

This project includes comprehensive unit tests for both backend and frontend:
- **Backend**: Jest + Supertest for API and service testing
- **Frontend**: Vitest + React Testing Library for component testing

Tests run automatically on every build to ensure code quality.

## Running Tests

### Run All Tests
```bash
npm run test
```

### Run Backend Tests Only
```bash
npm run test:backend
# or
cd backend && npm test
```

### Run Frontend Tests Only
```bash
npm run test:frontend
# or
cd frontend && npm test
```

### Watch Mode (Development)
```bash
# Watch all tests
npm run test:watch

# Watch backend only
cd backend && npm run test:watch

# Watch frontend only
cd frontend && npm run test:watch
```

### Coverage Reports
```bash
npm run test:coverage
```

Coverage reports are generated in:
- Backend: `backend/coverage/`
- Frontend: `frontend/coverage/`

## Test Structure

### Backend Tests (`backend/src/__tests__/`)

#### `user.service.test.ts`
Tests for user management:
- ✅ User creation with password hashing
- ✅ Authentication with correct/incorrect credentials
- ✅ Password changes
- ✅ User retrieval and deletion
- ✅ Duplicate username handling

#### `auth.routes.test.ts`
Tests for authentication endpoints:
- ✅ POST `/auth/login` - Login flow
  - **Demo Mode**: Tests `demo`/`demo1234` credentials
  - **Regular Mode**: Tests database user authentication
- ✅ POST `/auth/logout` - Logout flow
- ✅ POST `/auth/change-password` - Password changes
- ✅ GET `/auth/me` - Current user info
  - **Demo Mode**: Returns demo user profile
  - **Regular Mode**: Returns database user profile
- ✅ Request validation
- ✅ Session management
- ✅ WebSocket sessionId returned in login response

**Testing Strategy**: Demo and regular mode tests are in the same test suite using nested `describe` blocks, avoiding duplication while ensuring both paths are covered.

### Frontend Tests (`frontend/src/__tests__/`)

#### `auth.store.test.ts`
Tests for Zustand auth store:
- ✅ Initial state
- ✅ Login/logout state management
- ✅ User updates
- ✅ Role handling

#### `Button.test.tsx`
Tests for Button component:
- ✅ Rendering
- ✅ Click handlers
- ✅ Disabled state
- ✅ Variants and sizes

#### `LoginPage.test.tsx`
Tests for Login page:
- ✅ Form rendering
- ✅ Input validation
- ✅ User interactions

## Writing New Tests

### Backend Test Example
```typescript
import { UserService } from '../services/user.service';

describe('MyService', () => {
  beforeEach(() => {
    // Clean up database before each test
    const db = require('../database/db').db;
    db.prepare('DELETE FROM my_table').run();
  });

  it('should do something', async () => {
    const result = await MyService.doSomething();
    expect(result).toBeDefined();
  });
});
```

### Frontend Test Example
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from '../components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle clicks', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## Test Coverage Thresholds

Both projects enforce minimum coverage thresholds:

### Backend (Jest)
- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%

### Frontend (Vitest)
- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%

## Testing Philosophy

### Efficient Test Coverage

**Demo Mode vs Regular Mode:**
- Tests use nested `describe` blocks to organize demo vs regular mode tests
- Avoids duplication by testing shared behavior once
- Demo mode tests require minimal setup (no database seeding)
- Regular mode tests validate database interactions

**What to Test:**
- ✅ **Different Code Paths**: Demo vs regular authentication, session handling
- ✅ **Different Data Sources**: Simulated devices vs SmartThings API
- ✅ **Critical Functionality**: Authentication, authorization, device control
- ❌ **Not Tested Separately**: Identical UI behavior, shared utilities

**Example Test Organization:**
```typescript
describe('POST /auth/login', () => {
  describe('Demo Mode', () => {
    it('should login with demo credentials', async () => {
      // Test demo-specific logic
    });
  });

  describe('Regular Mode', () => {
    beforeEach(async () => {
      // Setup database users
    });

    it('should login with valid credentials', async () => {
      // Test database authentication
    });
  });
});
```

## Continuous Integration

Tests run automatically:
1. **On Build**: `npm run build` runs tests first
2. **In Docker**: Tests can be run in containers
3. **Pre-commit**: Consider adding to git hooks

## Docker Testing

To run tests in Docker containers:

```bash
# Backend tests
docker-compose exec backend npm test

# Frontend tests
docker-compose exec frontend npm test

# Run tests during build
docker-compose up --build
```

## Debugging Tests

### Backend (Jest)
```bash
# Run specific test file
cd backend
npm test -- user.service.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create user"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Frontend (Vitest)
```bash
# Run specific test file
cd frontend
npm test -- auth.store.test.ts

# Run tests matching pattern
npm test -- -t "should render"

# UI mode
npm run test:ui
```

## Common Issues

### Backend: Database locked
- Tests use the same database instance
- Solution: Clean up tables in `beforeEach`

### Frontend: Module not found
- Ensure path aliases are configured in `vitest.config.ts`
- Check imports use `@/` prefix

### Timeout errors
- Increase timeout in test: `it('test', async () => {}, 15000)`
- Or globally in config files

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use `beforeEach`/`afterEach` for setup/teardown
3. **Descriptive**: Use clear test descriptions
4. **Coverage**: Aim for high coverage, but focus on critical paths
5. **Mock**: Mock external dependencies (APIs, databases)
6. **Fast**: Keep tests fast (<5 seconds per suite)

## Future Enhancements

- [ ] Add E2E tests with Playwright
- [ ] Add visual regression testing
- [ ] Add performance benchmarks
- [ ] Add mutation testing
- [ ] Add contract testing for API
