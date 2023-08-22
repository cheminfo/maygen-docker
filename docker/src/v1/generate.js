import { spawnSync } from 'child_process';
import { mkdirSync, readFileSync, unlinkSync } from 'fs';
import os from 'os';
import { join } from 'path';

import debugPkg from 'debug';
import { MF } from 'mf-parser'
import OCL from 'openchemlib/core.js'

import getJava from './utils/getJava.js';

const { Molecule } = OCL

const debug = debugPkg('generate');

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

async function doGenerate(request, response) {
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
    flags.push('-smi')

    const javaResult = spawnSync(JAVA, flags, {
      encoding: 'utf-8',
      timeout: 5000,
    });

    if (javaResult.error) {
      response.send({ result: {}, status: javaResult.error.toString() });
    }

    const resultFilename = join(tempDir, `${body.mf}.smi`)
    const smiles = readFileSync(resultFilename, 'utf8')
    //    unlinkSync(resultFilename)
    const result = enhancedSmiles(smiles, body)


    response.send({ result });
  } catch (e) {
    response.send({ result: {}, log: e.toString() });
  }
}

function enhancedSmiles(smiles, body = {}) {
  const { limit, idCode } = body
  const lines = smiles.split(/\r?\n/).filter(line => line)
  const results = {
    found: lines.length,
    status: 'OK',
    mf: body.mf,
    entries: [],
  }
  for (const line of lines.slice(0, limit)) {
    const entry = {}
    entry.smiles = line
    if (idCode) {
      const molecule = Molecule.fromSmiles(line);
      entry.idCode = molecule.getIDCode()
    }
    results.entries.push(entry)
  }
  return results


}