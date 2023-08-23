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
  fastify.post(
    '/v1/generate',
    {
      schema: {
        summary: 'Generate structural isomers from a molecular formula',
        description:
          'Using MayGen we generate structural isomers from a molecular formula',
        consumes: ['multipart/form-data'],
        body: {
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
      },
    },
    doGenerate,
  );
}

export async function doGenerate(request, response) {
  try {
    const tempDir = join(os.tmpdir(), 'maygen');
    mkdirSync(tempDir, { recursive: true });
    const body = request.body;
    // because it is also the filename we want to avoid any bad tricks
    body.mf = new MF(body.mf).getInfo().mf.replace(/[^A-Za-z0-9]/g, '');
    let flags = [];
    flags.push('-jar', 'MAYGEN-1.8.jar');
    flags.push('-f', body.mf);
    flags.push('-o', tempDir);
    flags.push('-smi');

    const info = {};
    const start = Date.now();
    const javaResult = spawnSync(JAVA, flags, {
      encoding: 'utf-8',
      timeout: 2000,
    });
    info.time = Date.now() - start;

    const resultFilename = join(tempDir, `${body.mf}.smi`);
    const smiles = readFileSync(resultFilename, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line);

    if (javaResult.error) {
      if (smiles.length <= body.limit) {
        response.send({
          result: {},
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
    const result = enhancedSmiles(smiles, body, info);

    response.send({ result });
  } catch (e) {
    response.send({ result: {}, log: e.toString() });
  }
}

function enhancedSmiles(smiles, body, info) {
  const { limit, idCode } = body;
  const results = {
    found: smiles.length,
    ...info,
    mf: body.mf,
    entries: [],
  };
  for (const line of smiles.slice(0, limit)) {
    const entry = {};
    entry.smiles = line;
    if (idCode) {
      const molecule = Molecule.fromSmiles(line);
      entry.idCode = molecule.getIDCode();
    }
    results.entries.push(entry);
  }
  return results;
}
