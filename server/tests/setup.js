// Must be imported BEFORE app/config so env.js sees these values.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ENABLE_LOCAL_AUTH = 'true';
process.env.CLERK_SECRET_KEY = ''; // Clerk path is not exercised with real keys in tests
process.env.CLERK_WEBHOOK_SECRET = `whsec_${Buffer.from('unit-test-webhook-secret-123').toString('base64')}`;
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/lms_test';
if (!/test/i.test(process.env.MONGODB_URI)) {
  throw new Error('Refusing to run tests: the database name must contain "test" because tests drop the database.');
}
