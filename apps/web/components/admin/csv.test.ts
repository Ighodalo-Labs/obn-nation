import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from './csv';

describe('csv', () => {
  it('quotes commas, quotes and new lines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
  });
  it('neutralises formulas', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('+234')).toBe("'+234");
    expect(csvCell('@x')).toBe("'@x");
  });
  it('writes empty cells and a header row', () => {
    expect(toCsv(['a', 'b'], [[1, null]])).toBe('a,b\r\n1,');
  });
});
