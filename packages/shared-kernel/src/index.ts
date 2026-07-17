/** Branding helper for opaque IDs — no business rules. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type TenantId = Brand<string, 'TenantId'>;
export type UserId = Brand<string, 'UserId'>;

export function asTenantId(value: string): TenantId {
  return value as TenantId;
}

export function asUserId(value: string): UserId {
  return value as UserId;
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
