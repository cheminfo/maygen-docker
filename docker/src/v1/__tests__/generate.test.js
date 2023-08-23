import { test, expect } from 'vitest';

import { doGenerate } from '../generate.js';

test('test', async () => {
  let result;
  const response = {
    send: (data) => {
      result = data;
    },
  };
  await doGenerate({ body: { mf: 'C10H20' } }, response);
  expect(result.result.found).toBe(852);
  expect(result.result.mf).toBe('C10H20');
  expect(result.result.entries[0]).toStrictEqual({
    smiles: 'C=C(C(C)(C)C)C(C)(C)C',
  });
});
