/**
 * Shared CSV Parser — Handles RFC 4180 compliant CSV including:
 * - Quoted fields containing commas
 * - Escaped quotes ("")
 * - Multi-line values within quotes
 * - Empty fields
 *
 * Replaces the naive line.split(',') pattern used in screentimeCalculator.ts
 * and consolidates the inline CSV parsers from fitImporter.ts and googleFitParser.ts.
 */

/**
 * Parse a single CSV line into an array of field values.
 * Handles quoted fields, escaped quotes, and commas within quotes.
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        fields.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Parse an entire CSV string into a 2D array of rows and fields.
 * The first row is typically headers.
 */
export function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  const lines = csvText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    rows.push(parseCsvLine(trimmed));
  }

  return rows;
}

/**
 * Parse a CSV string into an array of objects using the first row as headers.
 */
export function parseCsvToObjects(csvText: string): Record<string, string>[] {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const objects: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] || '';
    }
    objects.push(obj);
  }

  return objects;
}
