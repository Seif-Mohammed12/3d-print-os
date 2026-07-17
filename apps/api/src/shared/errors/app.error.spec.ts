import { describe, expect, it } from 'vitest';

import { AppError, ValidationAppError } from './app.error';

describe('AppError', () => {
  it('defaults to 500', () => {
    const error = new AppError({ code: 'internal.test', message: 'boom' });
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('internal.test');
  });

  it('validation error uses 400', () => {
    const error = new ValidationAppError('Validation failed', [
      { field: 'email', code: 'validation.failed', message: 'invalid' },
    ]);
    expect(error.statusCode).toBe(400);
    expect(error.details).toHaveLength(1);
  });
});
