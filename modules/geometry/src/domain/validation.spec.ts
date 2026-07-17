import { describe, expect, it } from 'vitest';

import { assertStlUpload, buildStorageKey, GeometryDomainError } from './validation';

describe('assertStlUpload', () => {
  it('accepts a valid stl filename', () => {
    const result = assertStlUpload({
      originalFilename: 'bracket.STL',
      byteSize: 1024,
      maxBytes: 50_000_000,
    });
    expect(result.safeFilename).toBe('bracket.STL');
    expect(result.contentType).toBe('model/stl');
  });

  it('rejects non-stl extensions', () => {
    expect(() =>
      assertStlUpload({
        originalFilename: 'part.obj',
        byteSize: 10,
        maxBytes: 50_000_000,
      }),
    ).toThrow(GeometryDomainError);
  });

  it('rejects oversized files', () => {
    expect(() =>
      assertStlUpload({
        originalFilename: 'big.stl',
        byteSize: 100,
        maxBytes: 50,
      }),
    ).toThrow(/maximum size/);
  });
});

describe('buildStorageKey', () => {
  it('scopes keys by tenant and model id', () => {
    expect(buildStorageKey('tenant-1', 'model-1')).toBe('tenants/tenant-1/models/model-1.stl');
  });
});
