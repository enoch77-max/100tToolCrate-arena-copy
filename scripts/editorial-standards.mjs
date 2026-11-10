/* Editorial normalization for legacy source copy. Specific technical guidance
 * lives in content/editorial-overrides.json and content/tool-limitations.json. */
export function cleanEditorialText(value) {
  let text = String(value ?? '');
  const exact = new Map([
    ['Lossless & lossy compression for PNG, JPEG, and WebP. Drastically reduce file size without losing quality.', 'Adjustable image compression with a visible quality–size trade-off.'],
    ['Reduce file size without quality loss for faster websites & storage saving.', 'Adjust the quality–size trade-off for faster websites and smaller attachments.'],
    ['without compromising quality', 'while balancing file size and visual quality'],
    ['without compromising on the visual integrity', 'while reviewing the visible quality'],
    ['without sacrificing quality', 'with configurable quality settings'],
    ['Without Losing Quality', 'While Preserving Readable Output'],
    ['without losing quality', 'while checking visual quality'],
    ['without quality loss', 'with an adjustable quality–size trade-off'],
    ['100% accuracy every time', 'a page count when the document can be parsed'],
    ['100% Free Forever', 'Free core tools'],
    ['100% Free', 'Free Core Tools'],
    ['100% free', 'free'],
    ['No hidden fees ever.', 'No fee for core tool use.'],
    ['Always free, always private.', 'Free core tools. Local-first processing.'],
    ['Files deleted locally.', 'Files stay on your device.'],
    ['Ad-Free Experience', 'Focused Experience'],
    ['Clean and Ad-Free Experience', 'Clean, Focused Experience'],
    ['without intrusive advertisements', 'with a focused, efficient interface'],
    ['thousands of users', 'people who need local data URLs'],
    ['advanced compression algorithms', 'browser-side encoders'],
    ['advanced algorithms', 'browser-side processing'],
    ['GDPR & CCPA Compliance', 'GDPR & CCPA Privacy Rights'],
    ['COPPA Compliance', "Children's Privacy"],
    ['Absolutely No Limits', 'Practical Browser Limits'],
    ['100% Client-Side Processing', 'Local-First Browser Processing'],
    ['Best Free Alternative', 'Private Tooling Comparison'],
    ['The Best Choice', 'How It Works'],
    ['Best Choice', 'Practical Guide'],
    ['the best choice', 'a practical option'],
    ['Accuracy Guaranteed', 'Consistent URL Formatting'],
    ['guaranteeing your privacy', 'so supported inputs stay in your browser'],
    ['guaranteeing professional-looking results every time', 'while preserving supported page content'],
    ['guaranteeing that your CSS functionality remains perfectly intact after optimization', 'but you should test minified CSS because invalid or nonstandard input can behave differently'],
    ['Guarantees a precise reversal', 'Performs a character-order reversal'],
    ['We guarantee that your JSON structure and data content remain perfectly intact, only whitespace is removed', 'Valid JSON is parsed and serialized, preserving its data values while removing insignificant whitespace'],
    ['Rely on precise calculations for critical business decisions.', 'Verify inputs, assumptions and rounding before using calculations in business decisions.'],
    ['Eliminates syntax errors that can corrupt your analytics data.', 'Builds consistently encoded campaign parameters for review.'],
    ['Your files remain 100% locally stored on your computer or mobile device.', 'Supported browser-tool files remain on your device; API and form submissions follow different data paths described in our editorial policy.'],
    ['Every utility housed within 100ToolCrate leverages modern browser technologies including HTML5 APIs, WebAssembly (WASM), Canvas rendering engines, Web Crypto API, and client-side JavaScript execution.', 'Browser tools use the technologies each task needs, such as File APIs, Canvas, Web Crypto, JavaScript and client-side document libraries. A separate public execution API handles selected text, JSON and calculation inputs transiently on the server.'],
    ['100ToolCrate has absolutely zero paywalls, premium tiers, or arbitrary limits on how many files you can process.', 'Core browser tools do not require a subscription. Practical limits still depend on the tool, browser, device memory, file size and third-party library support; paid done-for-you services are separate.']
  ]);
  for (const [before, after] of exact) text = text.split(before).join(after);

  text = text
    .replace(/Why (?:Choose|Use) (?:Our|This) ([^<]{1,90}?)(?: is| as) the Best Choice/gi, 'How $1 Works')
    .replace(/\bno hidden (?:fees|costs|charges)\b/gi, 'no subscription required')
    .replace(/\b[Uu]nlimited\b/g, match => match[0] === 'U' ? 'Repeated' : 'repeated')
    .replace(/\bultimate online\b/gi, 'online')
    .replace(/\bultimate free\b/gi, 'free')
    .replace(/\b100% secure\b/gi, 'designed with privacy in mind')
    .replace(/\bguaranteeing\b/gi, 'supporting')
    .replace(/\bguarantees\b/gi, 'is designed to support');
  return text;
}
