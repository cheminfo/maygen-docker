import { spawnSync } from 'child_process';
import { mkdirSync, readFileSync, unlinkSync } from 'fs';
import os from 'os';
import { join } from 'path';

import { MF } from 'mf-parser';
import OCL from 'openchemlib/core.js';

import getJava from './utils/getJava.js';

const { Molecule } = OCL;

const JAVA = getJava();

export default function generate(fastify) {
  fastify.route({
    url: '/v1/generate',
    method: ['GET', 'POST'],
    handler: doGenerate,
    schema: {
      summary: 'Generate structural isomers from a molecular formula',
      description:
        'Using MayGen we generate structural isomers from a molecular formula',
      consumes: ['multipart/form-data'],
      querystring: {
        type: 'object',
        properties: {
          mf: {
            description: 'Molecular formula',
            type: 'string',
          },
          limit: {
            description: 'Max number of entries',
            type: 'number',
            default: 1000,
          },
          timeout: {
            description: 'Max number of seconds (must be under 30)',
            type: 'number',
            default: 2,
          },
          fragmentCode: {
            description: 'Substructure search to filter results',
            type: 'string',
          },
          idCode: {
            description: 'Append openchemlib idCode',
            type: 'boolean',
          },
        },
      },
    },
  });
}

export async function doGenerate(request, response) {
  const params = request.body || request.query;
  try {
    const tempDir = join(os.tmpdir(), 'maygen');
    mkdirSync(tempDir, { recursive: true });
    // because it is also the filename we want to avoid any bad tricks
    params.mf = new MF(params.mf).getInfo().mf.replace(/[^A-Za-z0-9]/g, '');
    let flags = [];
    flags.push('-jar', 'MAYGEN-1.8.jar');
    flags.push('-f', params.mf);
    flags.push('-o', tempDir);
    flags.push('-smi');

    const info = {};
    const start = Date.now();
    const javaResult = spawnSync(JAVA, flags, {
      encoding: 'utf-8',
      timeout: Math.max(Math.min((params.timeout || 2) * 1000, 30000), 2000),
    });
    info.time = Date.now() - start;

    const resultFilename = join(tempDir, `${params.mf}.smi`);
    const smiles = readFileSync(resultFilename, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line);

    if (javaResult.error) {
      if (smiles.length <= params.limit) {
        response.send({
          result: [],
          ...info,
          status: javaResult.error.toString(),
        });
      } else {
        info.status = 'Partial result';
      }
    } else {
      info.status = 'OK';
    }

    unlinkSync(resultFilename);
    const result = enhancedSmiles(smiles, params, info);

    response.send(result);
  } catch (e) {
    response.send({
      result: [],
      log: e.toString(),
      status: `error: ${e.toString()}`,
    });
  }
}

function enhancedSmiles(smiles, params, info) {
  const { limit, idCode, fragmentCode } = params;
  let searcher = null;
  let fragment = null;
  if (fragmentCode) {
    fragment = Molecule.fromIDCode(fragmentCode);
    searcher = new OCL.SSSearcher();
    searcher.setFragment(fragment);
  }
  const results = {
    found: smiles.length,
    ...info,
    mf: params.mf,
    result: [],
  };
  if (smiles.length > limit) {
    smiles.sort(() => Math.random() - 0.5);
  }
  // apparently this library can return twice the same molecule we check ourself
  const uniqueSmiles = {};
  const uniqueIDCodes = {}
  for (const line of smiles.slice(0, limit)) {
    if (uniqueSmiles[line]) continue;
    uniqueSmiles[line] = true;
    const entry = {};
    entry.smiles = line;
    if (idCode || fragment) {
      const molecule = Molecule.fromSmiles(line);
      if (searcher) {
        searcher.setMolecule(molecule);
        if (!searcher.isFragmentInMolecule()) continue;
      }
      molecule.stripStereoInformation();
      entry.idCode = molecule.getIDCode();
      if (uniqueIDCodes[entry.idCode]) continue;
      uniqueIDCodes[entry.idCode] = true;
    }
    results.result.push(entry);
  }
  return results;
}
