#!/bin/sh

echo "================================"
echo "Running Backend Tests..."
echo "================================"

cd /app

# Run tests with coverage
npm test

# Capture exit code
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Backend tests passed!"
else
    echo "❌ Backend tests failed!"
    exit $TEST_EXIT_CODE
fi

# If tests pass, continue with normal startup
echo ""
echo "Starting backend server..."
exec npm run dev
