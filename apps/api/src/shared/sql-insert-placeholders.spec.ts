import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Guards against `INSERT INTO t (a, b, c) VALUES ($1, $2)` — Postgres rejects it at runtime
 * ("INSERT has more target columns than expressions"), which broke creating printers,
 * profiles and materials before this check existed.
 */
const SRC = join(__dirname, '..');
const INSERT = /INSERT INTO\s+(\w+)\s*\(([^)]*)\)\s*VALUES\s*\(/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : [];
  });
}

const count = (list: string) => list.split(',').filter((item) => item.trim()).length;

/** Number of top-level items in the VALUES list starting at `start` (just after its "("). */
function countValues(sql: string, start: number): { count: number; hasParams: boolean } {
  let depth = 0;
  let items = 1;
  let i = start;
  for (; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      if (depth === 0) {
        break;
      }
      depth--;
    } else if (ch === ',' && depth === 0) {
      items++;
    }
  }
  return { count: items, hasParams: sql.slice(start, i).includes('$') };
}

describe('SQL INSERT statements', () => {
  it('have one value per column', () => {
    const mismatches: string[] = [];
    for (const file of sourceFiles(SRC)) {
      for (const match of readFileSync(file, 'utf8').matchAll(INSERT)) {
        const [whole, table, columns = ''] = match;
        const values = countValues(match.input ?? '', (match.index ?? 0) + whole.length);
        if (!values.hasParams) {
          continue;
        }
        if (count(columns) !== values.count) {
          mismatches.push(
            `${relative(SRC, file)}: ${table} has ${count(columns)} columns but ${values.count} values`,
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});
