import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config({ path: '.env.test' });

// Set default test environment variables if not provided
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/notaria_test';
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Suppress console warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  // Suppress specific warnings that are common during testing
  const message = args[0];
  if (typeof message === 'string' && (
    message.includes('Warning: A worker process has failed to exit gracefully') ||
    message.includes('Jest did not exit one second after the test run has completed')
  )) {
    return;
  }
  originalWarn.apply(console, args);
};

// Global test timeout
jest.setTimeout(30000);