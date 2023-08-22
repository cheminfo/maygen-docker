import getInputFormats from '../getInputFormats.js';

describe('getInputFormats', () => {
  it('should return an array of output formats', () => {
    const result = getInputFormats();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(20);
  });
});
