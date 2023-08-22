import getOutputFormats from '../getOutputFormats.js';

describe('getOutputFormats', () => {
  it('should return an array of output formats', () => {
    const result = getOutputFormats();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(20);
  });
});
