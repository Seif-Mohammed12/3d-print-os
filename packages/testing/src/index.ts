/**
 * Shared test utilities. Factories and fakes land with domain modules.
 */

export function createTestRequestId(): string {
  return `req_test_${Date.now()}`;
}
