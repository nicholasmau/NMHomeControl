#!/bin/sh

echo "================================"
echo "Running Frontend Tests..."
echo "================================"

cd /app

# Run tests without coverage (coverage requires additional setup)
npm test

# Capture exit code
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Frontend tests passed!"
else
    echo "❌ Frontend tests failed!"
    exit $TEST_EXIT_CODE
fi

# If tests pass, continue with normal startup
echo ""
echo "Starting frontend dev server..."
exec npm run dev -- --host 0.0.0.0
