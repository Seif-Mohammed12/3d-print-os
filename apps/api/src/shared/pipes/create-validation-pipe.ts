import { type ValidationError, ValidationPipe } from '@nestjs/common';

import { ValidationAppError } from '../errors/app.error';

/**
 * Global validation pipe for class-validator DTOs used by future modules.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors: ValidationError[]) => {
      const details = flattenValidationErrors(errors);
      return new ValidationAppError('Validation failed', details);
    },
  });
}

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Array<{ field?: string; code: string; message: string }> {
  const details: Array<{ field?: string; code: string; message: string }> = [];

  for (const error of errors) {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        details.push({
          field,
          code: 'validation.failed',
          message,
        });
      }
    }

    if (error.children && error.children.length > 0) {
      details.push(...flattenValidationErrors(error.children, field));
    }
  }

  return details;
}
