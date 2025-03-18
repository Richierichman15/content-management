const mongoose = require('mongoose');

// Handling deprecated methods warnings
mongoose.set('strictQuery', false);

// Define a timeout for database operations
jest.setTimeout(30000);

// Suppress console output during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up database connections after tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}); 