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
          idCode: {
            description: 'Append openchemlib idCode',
            type: 'boolean',
          },
        },
      },
    }
  }
  )
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
      timeout: 2000,
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
    response.send({ result: [], log: e.toString(), status: `error: ${e.toString()}` });
  }
}

function enhancedSmiles(smiles, params, info) {
  const { limit, idCode } = params;
  const results = {
    found: smiles.length,
    ...info,
    mf: params.mf,
    result: [],
  };
  for (const line of smiles.slice(0, limit)) {
    const entry = {};
    entry.smiles = line;
    if (idCode) {
      const molecule = Molecule.fromSmiles(line);
      entry.idCode = molecule.getIDCode();
    }
    results.result.push(entry);
  }
  return results;
}

