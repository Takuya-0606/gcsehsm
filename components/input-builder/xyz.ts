export const parseGeometryLines = (text: string) => {
  const rawLines = text.split(/\r?\n/);
  let startIndex = 0;
  if (rawLines[0]?.trim().match(/^\d+$/)) {
    startIndex = 2;
  }
  const geometryLines = rawLines
    .slice(startIndex)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const elements = geometryLines
    .map(line => line.split(/\s+/)[0])
    .filter(token => token && !token.startsWith('#'));

  return { geometryLines, elements };
};
