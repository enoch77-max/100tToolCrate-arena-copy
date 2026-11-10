import crypto from 'node:crypto';

export class ToolInputError extends Error {}

const text = (description, maxLength = 12000) => ({ type: 'string', description, maxLength });
const number = (description, extra = {}) => ({ type: 'number', description, ...extra });
const bool = description => ({ type: 'boolean', description });
const objectSchema = (properties, required = []) => ({ type: 'object', additionalProperties: false, properties, required });
const resultSchema = properties => ({ type: 'object', properties, required: Object.keys(properties) });
const wordsOf = value => String(value).match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || [];
const paragraphsOf = value => String(value).trim() ? String(value).trim().split(/\n\s*\n/).filter(part => part.trim()) : [];
const sentencesOf = value => String(value).trim() ? String(value).trim().split(/[.!?]+(?:\s|$)/).filter(part => part.trim()) : [];
const wordsSchema = { type: 'integer', minimum: 0 };
const numberResult = { type: 'number' };
const stringResult = { type: 'string' };

function csvCell(value, protectFormulas) {
  let string = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (protectFormulas && /^[=+\-@\t\r]/.test(string)) string = `'${string}`;
  return /[",\r\n]/.test(string) ? `"${string.replace(/"/g, '""')}"` : string;
}

function validate(schema, value, path = 'input') {
  if (!schema || typeof schema !== 'object') return;
  if (Array.isArray(schema.type)) {
    const actualType = typeof value;
    if (!schema.type.includes(actualType)) throw new ToolInputError(`${path} must be ${schema.type.join(' or ')}`);
    return validate({ ...schema, type: actualType }, value, path);
  }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ToolInputError(`${path} must be an object`);
    const allowed = new Set(Object.keys(schema.properties || {}));
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) if (!allowed.has(key)) throw new ToolInputError(`${path}.${key} is not supported`);
    }
    for (const key of schema.required || []) if (value[key] === undefined) throw new ToolInputError(`${path}.${key} is required`);
    for (const [key, child] of Object.entries(schema.properties || {})) if (value[key] !== undefined) validate(child, value[key], `${path}.${key}`);
    return;
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value)) throw new ToolInputError(`${path} must be an array`);
    if (schema.minItems !== undefined && value.length < schema.minItems) throw new ToolInputError(`${path} needs at least ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) throw new ToolInputError(`${path} allows at most ${schema.maxItems} items`);
    value.forEach((item, index) => validate(schema.items, item, `${path}[${index}]`));
    return;
  }
  if (schema.type === 'string') {
    if (typeof value !== 'string') throw new ToolInputError(`${path} must be a string`);
    if (schema.minLength !== undefined && value.length < schema.minLength) throw new ToolInputError(`${path} is too short`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) throw new ToolInputError(`${path} exceeds ${schema.maxLength} characters`);
    if (schema.enum && !schema.enum.includes(value)) throw new ToolInputError(`${path} must be one of: ${schema.enum.join(', ')}`);
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) throw new ToolInputError(`${path} has an invalid format`);
    return;
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    if (typeof value !== 'number' || !Number.isFinite(value) || (schema.type === 'integer' && !Number.isInteger(value))) throw new ToolInputError(`${path} must be ${schema.type === 'integer' ? 'an integer' : 'a finite number'}`);
    if (schema.minimum !== undefined && value < schema.minimum) throw new ToolInputError(`${path} must be at least ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) throw new ToolInputError(`${path} must be at most ${schema.maximum}`);
    return;
  }
  if (schema.type === 'boolean' && typeof value !== 'boolean') throw new ToolInputError(`${path} must be a boolean`);
}

const definitions = [
  {
    id: 'word-counter', title: 'Word Counter', category: 'Text',
    description: 'Count Unicode-aware words, characters, paragraphs and estimated sentences in supplied text. Useful when an agent needs exact document metrics without uploading a file.',
    inputSchema: objectSchema({ text: text('Text to analyze'), wordsPerMinute: number('Reading speed used for the estimate', { minimum: 50, maximum: 1000 }) }, ['text']),
    outputSchema: resultSchema({ words: wordsSchema, characters: wordsSchema, charactersNoSpaces: wordsSchema, bytes: wordsSchema, paragraphs: wordsSchema, estimatedSentences: wordsSchema, readingMinutes: numberResult }),
    execute({ text: input, wordsPerMinute = 250 }) {
      const words = wordsOf(input).length;
      return { words, characters: [...input].length, charactersNoSpaces: [...input.replace(/\s/g, '')].length, bytes: Buffer.byteLength(input), paragraphs: paragraphsOf(input).length, estimatedSentences: sentencesOf(input).length, readingMinutes: Math.round(words / wordsPerMinute * 100) / 100 };
    }
  },
  {
    id: 'character-counter', title: 'Character Counter', category: 'Text',
    description: 'Measure Unicode code points, UTF-16 code units, UTF-8 bytes and user-perceived grapheme clusters. Code-point and grapheme counts can differ for emoji and combined characters.',
    inputSchema: objectSchema({ text: text('Text to measure') }, ['text']),
    outputSchema: resultSchema({ codePoints: wordsSchema, utf16CodeUnits: wordsSchema, utf8Bytes: wordsSchema, graphemes: wordsSchema }),
    execute({ text: input }) {
      let graphemes = [...input].length;
      if (Intl.Segmenter) graphemes = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(input)].length;
      return { codePoints: [...input].length, utf16CodeUnits: input.length, utf8Bytes: Buffer.byteLength(input), graphemes };
    }
  },
  {
    id: 'case-converter', title: 'Case Converter', category: 'Text',
    description: 'Convert supplied text to uppercase, lowercase, title, sentence, camel, snake or kebab case. Formatting conversion does not translate or rewrite the content.',
    inputSchema: objectSchema({ text: text('Text to convert'), mode: { type: 'string', enum: ['uppercase', 'lowercase', 'title', 'sentence', 'camel', 'snake', 'kebab'], description: 'Target case' } }, ['text', 'mode']),
    outputSchema: resultSchema({ text: stringResult }),
    execute({ text: input, mode }) {
      const tokens = wordsOf(input.toLowerCase());
      const conversions = {
        uppercase: () => input.toUpperCase(), lowercase: () => input.toLowerCase(),
        title: () => input.toLowerCase().replace(/[\p{L}\p{N}]+/gu, word => word.charAt(0).toUpperCase() + word.slice(1)),
        sentence: () => input.toLowerCase().replace(/(^\s*\p{L}|[.!?]\s+\p{L})/gu, letter => letter.toUpperCase()),
        camel: () => tokens.map((word, index) => index ? word.charAt(0).toUpperCase() + word.slice(1) : word).join(''),
        snake: () => tokens.join('_'), kebab: () => tokens.join('-')
      };
      return { text: conversions[mode]() };
    }
  },
  {
    id: 'slug-generator', title: 'Slug Generator', category: 'Text',
    description: 'Create a lowercase URL slug from a title, removing diacritics and unsupported characters. Review the result for meaning before publishing.',
    inputSchema: objectSchema({ text: text('Title or phrase to convert', 300), separator: { type: 'string', enum: ['-', '_'], description: 'Word separator' } }, ['text']),
    outputSchema: resultSchema({ slug: stringResult }),
    execute({ text: input, separator = '-' }) {
      const slug = input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, separator).replace(new RegExp(`\\${separator}{2,}`, 'g'), separator).replace(new RegExp(`^\\${separator}|\\${separator}$`, 'g'), '');
      return { slug };
    }
  },
  {
    id: 'url-encoder', title: 'URL Encoder / Decoder', category: 'Text',
    description: 'Percent-encode or decode a URL component using UTF-8. This does not fetch, validate reachability, or shorten a URL.',
    inputSchema: objectSchema({ text: text('Component to encode or decode'), operation: { type: 'string', enum: ['encode', 'decode'] } }, ['text', 'operation']),
    outputSchema: resultSchema({ text: stringResult }),
    execute({ text: input, operation }) {
      try { return { text: operation === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input) }; }
      catch { throw new ToolInputError('text is not valid percent-encoded UTF-8'); }
    }
  },
  {
    id: 'base64-encoder', title: 'Base64 Encoder / Decoder', category: 'Text',
    description: 'Encode UTF-8 text as Base64 or decode canonical Base64 into UTF-8 text. Base64 is encoding, not encryption.',
    inputSchema: objectSchema({ text: text('Text or Base64 value'), operation: { type: 'string', enum: ['encode', 'decode'] } }, ['text', 'operation']),
    outputSchema: resultSchema({ text: stringResult }),
    execute({ text: input, operation }) {
      if (operation === 'encode') return { text: Buffer.from(input, 'utf8').toString('base64') };
      const compact = input.replace(/\s/g, '');
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 !== 0) throw new ToolInputError('text must be canonical padded Base64');
      const decoded = Buffer.from(compact, 'base64');
      if (decoded.toString('base64') !== compact) throw new ToolInputError('text is not valid Base64');
      try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(decoded) }; }
      catch { throw new ToolInputError('decoded Base64 is not valid UTF-8 text'); }
    }
  },
  {
    id: 'json-formatter', title: 'JSON Formatter', category: 'Dev',
    description: 'Parse and pretty-print JSON with configurable indentation. Returns an error instead of repairing invalid JSON.',
    inputSchema: objectSchema({ json: text('Valid JSON text'), indent: { type: 'integer', minimum: 0, maximum: 8, description: 'Spaces per indentation level; zero produces compact JSON' } }, ['json']),
    outputSchema: resultSchema({ json: stringResult }),
    execute({ json, indent = 2 }) {
      try { return { json: JSON.stringify(JSON.parse(json), null, indent) }; }
      catch (error) { throw new ToolInputError(`Invalid JSON: ${error.message}`); }
    }
  },
  {
    id: 'json-validator', title: 'JSON Validator', category: 'Dev',
    description: 'Validate JSON syntax and report whether it is an object, array, string, number, boolean or null. Schema validation is not performed.',
    inputSchema: objectSchema({ json: text('JSON text to validate') }, ['json']),
    outputSchema: resultSchema({ valid: { type: 'boolean' }, valueType: stringResult, error: stringResult }),
    execute({ json }) {
      try {
        const value = JSON.parse(json);
        return { valid: true, valueType: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value, error: '' };
      } catch (error) { return { valid: false, valueType: '', error: error.message }; }
    }
  },
  {
    id: 'json-minifier', title: 'JSON Minifier', category: 'Dev',
    description: 'Remove insignificant whitespace by parsing and serializing JSON. Key order is preserved by the JavaScript runtime; semantic values are unchanged.',
    inputSchema: objectSchema({ json: text('Valid JSON text') }, ['json']),
    outputSchema: resultSchema({ json: stringResult, originalBytes: wordsSchema, minifiedBytes: wordsSchema }),
    execute({ json }) {
      try {
        const minified = JSON.stringify(JSON.parse(json));
        return { json: minified, originalBytes: Buffer.byteLength(json), minifiedBytes: Buffer.byteLength(minified) };
      } catch (error) { throw new ToolInputError(`Invalid JSON: ${error.message}`); }
    }
  },
  {
    id: 'json-to-csv', title: 'JSON to CSV', category: 'Dev',
    description: 'Convert an array of flat objects to CSV using the union of keys. Nested values are JSON-encoded. Spreadsheet formula escaping is enabled by default.',
    inputSchema: objectSchema({ json: text('JSON array of objects'), protectFormulas: bool('Prefix cells beginning with spreadsheet formula characters') }, ['json']),
    outputSchema: resultSchema({ csv: stringResult, rows: wordsSchema, columns: { type: 'array', items: stringResult } }),
    execute({ json, protectFormulas = true }) {
      let rows;
      try { rows = JSON.parse(json); } catch (error) { throw new ToolInputError(`Invalid JSON: ${error.message}`); }
      if (!Array.isArray(rows) || rows.length === 0 || rows.length > 500 || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new ToolInputError('json must contain 1–500 flat objects');
      const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
      if (!columns.length || columns.length > 100) throw new ToolInputError('records must expose between 1 and 100 columns');
      const csv = [columns.map(column => csvCell(column, protectFormulas)).join(','), ...rows.map(row => columns.map(column => csvCell(row[column], protectFormulas)).join(','))].join('\r\n');
      return { csv, rows: rows.length, columns };
    }
  },
  {
    id: 'hash-generator', title: 'Text Hash Generator', category: 'Dev',
    description: 'Hash UTF-8 text with SHA-256, SHA-512, SHA-1 or MD5. MD5 and SHA-1 are provided for compatibility, not password storage or collision-resistant security.',
    inputSchema: objectSchema({ text: text('Text to hash'), algorithm: { type: 'string', enum: ['sha256', 'sha512', 'sha1', 'md5'] } }, ['text']),
    outputSchema: resultSchema({ algorithm: stringResult, hex: stringResult }),
    execute({ text: input, algorithm = 'sha256' }) { return { algorithm, hex: crypto.createHash(algorithm).update(input, 'utf8').digest('hex') }; }
  },
  {
    id: 'uuid-generator', title: 'UUID Generator', category: 'Dev',
    description: 'Generate cryptographically random RFC 4122 version-4 UUIDs on the server. Each request produces new identifiers.',
    inputSchema: objectSchema({ count: { type: 'integer', minimum: 1, maximum: 25, description: 'Number of UUIDs to generate' } }),
    outputSchema: resultSchema({ version: { type: 'integer' }, uuids: { type: 'array', items: stringResult } }),
    execute({ count = 1 }) { return { version: 4, uuids: Array.from({ length: count }, () => crypto.randomUUID()) }; }
  },
  {
    id: 'unix-timestamp-converter', title: 'Unix Timestamp Converter', category: 'Dev',
    description: 'Convert Unix seconds or milliseconds to ISO UTC, or an ISO-8601 date string to Unix time. Ambiguous local date-times are rejected.',
    inputSchema: objectSchema({ value: { type: ['string', 'number'], description: 'Unix seconds/milliseconds or an ISO-8601 date with timezone' } }, ['value']),
    outputSchema: resultSchema({ iso: stringResult, unixSeconds: { type: 'integer' }, unixMilliseconds: { type: 'integer' } }),
    execute({ value }) {
      let milliseconds;
      if (typeof value === 'number') milliseconds = Math.abs(value) < 1e11 ? value * 1000 : value;
      else {
        if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) throw new ToolInputError('value must be Unix time or an unambiguous ISO-8601 date/time');
        milliseconds = Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value);
      }
      const date = new Date(milliseconds);
      if (!Number.isFinite(milliseconds) || Number.isNaN(date.getTime())) throw new ToolInputError('value is outside the supported date range');
      return { iso: date.toISOString(), unixSeconds: Math.floor(milliseconds / 1000), unixMilliseconds: milliseconds };
    }
  },
  {
    id: 'date-diff', title: 'Date Difference Calculator', category: 'Calc',
    description: 'Calculate the elapsed milliseconds and calendar-day difference between two ISO dates. Daylight-saving effects are represented by the exact millisecond value.',
    inputSchema: objectSchema({ start: text('Start ISO date/time', 40), end: text('End ISO date/time', 40) }, ['start', 'end']),
    outputSchema: resultSchema({ milliseconds: numberResult, seconds: numberResult, days: numberResult, direction: stringResult }),
    execute({ start, end }) {
      const a = Date.parse(start), b = Date.parse(end);
      if (!Number.isFinite(a) || !Number.isFinite(b)) throw new ToolInputError('start and end must be valid ISO dates');
      const milliseconds = b - a;
      return { milliseconds, seconds: milliseconds / 1000, days: milliseconds / 86400000, direction: milliseconds >= 0 ? 'end_after_start' : 'end_before_start' };
    }
  },
  {
    id: 'percentage-calculator', title: 'Percentage Calculator', category: 'Calc',
    description: 'Calculate a percentage of a value, what percentage one number is of another, or percentage change. Division by zero is rejected.',
    inputSchema: objectSchema({ operation: { type: 'string', enum: ['percentOf', 'whatPercent', 'change'] }, a: number('Percentage for percentOf, part for whatPercent, original value for change'), b: number('Whole for percentOf/whatPercent, new value for change') }, ['operation', 'a', 'b']),
    outputSchema: resultSchema({ result: numberResult, unit: stringResult }),
    execute({ operation, a, b }) {
      if (operation === 'percentOf') return { result: a / 100 * b, unit: 'value' };
      if (b === 0 || (operation === 'change' && a === 0)) throw new ToolInputError('the denominator cannot be zero');
      return operation === 'whatPercent' ? { result: a / b * 100, unit: 'percent' } : { result: (b - a) / Math.abs(a) * 100, unit: 'percent' };
    }
  },
  {
    id: 'discount-calculator', title: 'Discount Calculator', category: 'Calc',
    description: 'Calculate discounted price, savings and optional tax. This is arithmetic only and does not determine legal tax rates or rounding obligations.',
    inputSchema: objectSchema({ price: number('Original price', { minimum: 0, maximum: 1e12 }), discountPercent: number('Discount percentage', { minimum: 0, maximum: 100 }), taxPercent: number('Optional tax on the discounted amount', { minimum: 0, maximum: 100 }) }, ['price', 'discountPercent']),
    outputSchema: resultSchema({ subtotal: numberResult, savings: numberResult, tax: numberResult, total: numberResult }),
    execute({ price, discountPercent, taxPercent = 0 }) {
      const subtotal = price * (1 - discountPercent / 100), tax = subtotal * taxPercent / 100;
      return { subtotal, savings: price - subtotal, tax, total: subtotal + tax };
    }
  },
  {
    id: 'profit-margin', title: 'Profit Margin Calculator', category: 'Calc',
    description: 'Calculate gross profit, margin on revenue and markup on cost. Revenue must be positive and cost non-negative.',
    inputSchema: objectSchema({ revenue: number('Revenue', { minimum: 0.000001, maximum: 1e15 }), cost: number('Direct cost', { minimum: 0, maximum: 1e15 }) }, ['revenue', 'cost']),
    outputSchema: resultSchema({ profit: numberResult, marginPercent: numberResult, markupPercent: numberResult }),
    execute({ revenue, cost }) {
      const profit = revenue - cost;
      return { profit, marginPercent: profit / revenue * 100, markupPercent: cost === 0 ? 0 : profit / cost * 100 };
    }
  },
  {
    id: 'read-time-calculator', title: 'Read Time Calculator', category: 'Text',
    description: 'Estimate reading time from Unicode-aware word count and a configurable words-per-minute rate. The estimate excludes images and comprehension time.',
    inputSchema: objectSchema({ text: text('Text to estimate'), wordsPerMinute: number('Reading speed', { minimum: 50, maximum: 1000 }) }, ['text']),
    outputSchema: resultSchema({ words: wordsSchema, seconds: wordsSchema, minutes: numberResult }),
    execute({ text: input, wordsPerMinute = 225 }) {
      const words = wordsOf(input).length;
      return { words, seconds: Math.ceil(words / wordsPerMinute * 60), minutes: Math.round(words / wordsPerMinute * 100) / 100 };
    }
  }
];

const registry = new Map(definitions.map(definition => [definition.id, definition]));

export function listExecutableTools(origin = '') {
  return definitions.map(({ execute, ...definition }) => ({
    ...definition,
    execution: { method: 'POST', url: `${origin}/api/v1/tools/${definition.id}/execute`, authentication: 'none', dataHandling: 'Input is processed transiently and is not persisted by this endpoint.' }
  }));
}

export function getExecutableTool(id) {
  const definition = registry.get(id);
  if (!definition) return null;
  const { execute, ...metadata } = definition;
  return metadata;
}

export function executeTool(id, args) {
  const definition = registry.get(id);
  if (!definition) throw new ToolInputError(`Tool '${id}' is not available for server execution`);
  const input = args === undefined ? {} : args;
  validate(definition.inputSchema, input);
  const result = definition.execute(input);
  if (Buffer.byteLength(JSON.stringify(result)) > 256 * 1024) throw new ToolInputError('Result exceeds the 256 KB response limit');
  return result;
}

export function mcpTools() {
  return definitions.map(definition => ({
    name: definition.id,
    title: definition.title,
    description: definition.description,
    inputSchema: definition.inputSchema,
    outputSchema: definition.outputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: definition.id !== 'uuid-generator', openWorldHint: false }
  }));
}
