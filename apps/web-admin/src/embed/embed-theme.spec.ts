import { describe, expect, it } from 'vitest';
import { hexToHslTriplet, radiusTokens, surfaceTokens } from './embed-theme';

describe('surfaceTokens', () => {
  it('steps lighter on a dark background, keeping its hue', () => {
    const tokens = surfaceTokens('240 3% 6%');
    expect(tokens['--card']).toBe('240 3% 9%');
    expect(tokens['--muted']).toBe('240 3% 12%');
    expect(tokens['--border']).toBe('240 3% 17%');
    expect(tokens['--input']).toBe('240 3% 22%');
  });

  it('raises cards and steps fields darker on a light background', () => {
    const tokens = surfaceTokens('40 18% 91%');
    expect(tokens['--card']).toBe('40 18% 94%');
    expect(tokens['--muted']).toBe('40 18% 85%');
    expect(tokens['--border']).toBe('40 18% 80%');
  });

  it('never leaves the valid lightness range', () => {
    expect(surfaceTokens('0 0% 100%')['--card']).toBe('0 0% 100%');
    expect(surfaceTokens('0 0% 0%')['--card']).toBe('0 0% 3%');
  });

  it('places muted text between the foreground and the background', () => {
    const background = hexToHslTriplet('#0E0E0F') as string;
    const foreground = hexToHslTriplet('#EDEAE4') as string;
    const muted = surfaceTokens(background, foreground)['--muted-foreground'] ?? '';
    const lightness = parseInt(muted.split(' ')[2] ?? '', 10);
    expect(lightness).toBeGreaterThan(50);
    expect(lightness).toBeLessThan(91);
  });

  it('leaves muted text to the app when there is no foreground', () => {
    expect(surfaceTokens('240 3% 6%')['--muted-foreground']).toBeUndefined();
  });
});

describe('radiusTokens', () => {
  it('reproduces the app scale at its default radius', () => {
    expect(radiusTokens(10)).toEqual({
      '--radius': '10px',
      '--radius-sm': '6px',
      '--radius-md': '8px',
      '--radius-xl': '14px',
      '--radius-2xl': '18px',
      '--radius-chip': '9999px',
    });
  });

  it('squares everything off at zero and stays tight at 2px', () => {
    expect(Object.values(radiusTokens(0))).toEqual(['0px', '0px', '0px', '0px', '0px', '0px']);
    expect(radiusTokens(2)['--radius-xl']).toBe('3px');
    expect(radiusTokens(2)['--radius-md']).toBe('2px');
    expect(radiusTokens(2)['--radius-chip']).toBe('2px');
  });
});
