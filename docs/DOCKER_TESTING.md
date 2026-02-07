# Test Configuration for Docker

## Running Tests in Docker

### Option 1: Run tests manually in containers

```bash
# Backend tests
docker-compose exec backend npm test

# Frontend tests
docker-compose exec frontend npm test

# With coverage
docker-compose exec backend npm run test:coverage
docker-compose exec frontend npm run test:coverage
```

### Option 2: Run tests on container startup (Optional)

To run tests automatically when containers start, uncomment the test scripts in the Dockerfiles.

#### Backend Dockerfile
Change:
```dockerfile
CMD ["/app/start.sh"]
```

To:
```dockerfile
CMD ["/app/test-and-start.sh"]
```

#### Frontend Dockerfile
Change:
```dockerfile
CMD ["/app/start.sh"]
```

To:
```dockerfile
CMD ["/app/test-and-start.sh"]
```

**Note**: This will increase startup time but ensures tests pass before the app runs.

### Option 3: Run tests before build

The current configuration runs tests automatically during builds:
```bash
npm run build  # Runs tests first
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

### Docker Compose for CI

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  backend-test:
    build: ./backend
    command: npm test
    environment:
      - NODE_ENV=test
  
  frontend-test:
    build: ./frontend
    command: npm test
    environment:
      - NODE_ENV=test
```

Run with:
```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## Test Database

Tests use an in-memory SQLite database to avoid conflicts with production data.

Backend test setup (`backend/src/__tests__/setup.ts`) configures:
- `NODE_ENV=test`
- Mock environment variables
- Database cleanup between tests

## Coverage Reports

View coverage reports after running tests:

```bash
# Backend coverage (Jest)
open backend/coverage/index.html

# Frontend coverage (Vitest)
open frontend/coverage/index.html
```

## Debugging Tests in Docker

```bash
# Run tests with verbose output
docker-compose exec backend npm test -- --verbose

# Run specific test file
docker-compose exec backend npm test -- user.service.test.ts

# Run frontend tests with UI
docker-compose exec frontend npm run test:ui
```

## Performance

Running tests in Docker may be slower than on host machine due to:
- Volume mount overhead
- Container startup time
- Network virtualization

For faster development, run tests on host:
```bash
# On host machine
cd backend && npm test
cd frontend && npm test
```
