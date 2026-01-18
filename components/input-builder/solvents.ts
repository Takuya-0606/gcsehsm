import solventList from './solvents.md?raw';

const parseSolventList = (markdown: string) =>
  markdown
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('- '))
    .map(line => line.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);

export const solventOptions = parseSolventList(solventList);
