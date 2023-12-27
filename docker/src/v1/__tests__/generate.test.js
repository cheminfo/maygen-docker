import { Molecule } from 'openchemlib'
import { expect, describe, it } from 'vitest';

import { doGenerate } from '../generate.js';

describe('generate', () => {
  it('Basic test', async () => {
    let result;
    const response = {
      send: (data) => {
        result = data;
      },
    };
    await doGenerate({ body: { mf: 'C5H10' } }, response);
    expect(result.found).toBe(10);
    expect(result.mf).toBe('C5H10');
    expect(result.result[0]).toStrictEqual({
      smiles: 'C=C(C)CC',
    });
  });

  it('Test with limit', async () => {
    let result;
    const response = {
      send: (data) => {
        result = data;
      },
    };
    await doGenerate({ body: { mf: 'C5H10', limit: 2 } }, response);
    expect(result.found).toBe(10);
    expect(result.result.length).toBe(2);
    expect(result.mf).toBe('C5H10');
  })

  it('Test with structure search', async () => {
    let result;
    const response = {
      send: (data) => {
        result = data;
      },
    };
    const fragment = Molecule.fromSmiles('C1CC1');
    fragment.setFragment(true)
    await doGenerate({ body: { mf: 'C5H10', fragmentCode: fragment.getIDCode() } }, response);
    expect(result.found).toBe(10);
    expect(result.result.length).toBe(3);
    expect(result.mf).toBe('C5H10');
    expect(result.result[0]).toStrictEqual({
      smiles: 'CC1(C)CC1', idCode: 'gKP@H~Jj`@'
    });
  })
});
