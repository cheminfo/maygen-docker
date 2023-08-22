import { myCommonJS } from '../index';

describe('test myCommonJS', () => {
  it('should return 42', () => {
    expect(myCommonJS()).toBe(42);
  });
});
