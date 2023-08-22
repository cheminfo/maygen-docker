import { existsSync } from 'fs';

const paths = ['/usr/bin/java'];

export default function getBabel() {
  if (process.env.JAVA) return process.env.JAVA;

  for (let path of paths) {
    if (existsSync(path)) return path;
  }
  throw new Error('JAVA not found');
}
