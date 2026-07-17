import { describe, expect, it } from 'vitest';

import { asTenantId, ok } from './index';

describe('shared-kernel', () => {
  it('brands tenant ids', () => {
    const id = asTenantId('11111111-1111-1111-1111-111111111111');
    expect(id).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('creates ok results', () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });
  });
});
