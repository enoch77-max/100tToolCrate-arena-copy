document.addEventListener('DOMContentLoaded', () => {
    const ALL_TOOLS = [{"id":"image-compressor","title":"Image Compressor","desc":"Compress one image at a time in your browser with adjustable quality and a local before/after preview.","cat":"Image","icon":"compress"},{"id":"image-resizer","title":"Image Resizer","desc":"Resize dimensions of your images quickly online.","cat":"Image","icon":"aspect_ratio"},{"id":"jpg-to-png","title":"JPG to PNG Converter","desc":"Convert JPG to PNG locally for workflows that need PNG output; conversion does not create transparency or restore lost detail.","cat":"Image","icon":"transform"},{"id":"png-to-jpg","title":"PNG to JPG Converter","desc":"Convert PNG images to JPG for smaller file sizes.","cat":"Image","icon":"flip"},{"id":"image-to-webp","title":"JPG/PNG to WebP","desc":"Convert images to WebP format for fast web delivery.","cat":"Image","icon":"auto_fix_high"},{"id":"webp-to-jpg","title":"WebP to JPG","desc":"Convert WebP images back to compatible JPG format.","cat":"Image","icon":"swap_horiz"},{"id":"image-cropper","title":"Image Cropper","desc":"Crop your images easily in the browser.","cat":"Image","icon":"crop"},{"id":"profile-picture-maker","title":"Profile Picture Cropper","desc":"Create perfect circular profile pictures for social media.","cat":"Image","icon":"account_box"},{"id":"passport-photo-maker","title":"2×2 Passport Photo Cropper","desc":"Create a centered 600×600 square JPEG for applications that specifically request a 2×2-inch photo at 300 DPI.","cat":"Image","icon":"badge"},{"id":"gradient-generator-img","title":"Gradient Generator","desc":"Create beautiful gradient backgrounds and save them.","cat":"Image","icon":"gradient"},{"id":"image-flip","title":"Image Flip/Mirror","desc":"Flip or mirror your images horizontally and vertically.","cat":"Image","icon":"flip_camera_android"},{"id":"image-watermark","title":"Image Watermark Tool","desc":"Add text watermarks to your images locally.","cat":"Image","icon":"branding_watermark"},{"id":"remove-image-metadata","title":"Remove Image Metadata","desc":"Strip EXIF data from images for privacy.","cat":"Image","icon":"layers_clear"},{"id":"image-metadata-viewer","title":"Image Metadata Viewer","desc":"View EXIF and metadata information of an image.","cat":"Image","icon":"info"},{"id":"blur-face","title":"Blur Face / Blur Area","desc":"Blur parts of an image to hide sensitive information.","cat":"Image","icon":"blur_on"},{"id":"pixelate-image","title":"Pixelate Image","desc":"Apply a pixelation effect to any image.","cat":"Image","icon":"grid_on"},{"id":"color-picker-image","title":"Color Picker from Image","desc":"Extract exact colors from any part of an selected image.","cat":"Image","icon":"colorize"},{"id":"image-palette","title":"Image Palette Generator","desc":"Generate a color palette automatically from a photo.","cat":"Image","icon":"palette"},{"id":"grayscale-image","title":"Grayscale Image","desc":"Convert colored images into black and white.","cat":"Image","icon":"filter_b_and_w"},{"id":"bg-color-changer","title":"Image BG Color Changer","desc":"Change the background color of images.","cat":"Image","icon":"format_color_fill"},{"id":"pdf-merger","title":"PDF Merger","desc":"Combine selected PDF files into one document in your browser, with a visible merge queue and no account required.","cat":"PDF","icon":"merge_type"},{"id":"paragraph-counter","title":"Paragraph Counter","desc":"Count paragraphs and line breaks.","cat":"Text","icon":"segment"},{"id":"image-to-url","title":"Image to URL","desc":"Generate local blob and data URLs for development and embedding; no image hosting or public share link is created.","cat":"Image","icon":"add_to_photos"},{"id":"pdf-splitter","title":"PDF Splitter","desc":"Extract pages from a PDF to create a new one.","cat":"PDF","icon":"call_split"},{"id":"pdf-compressor","title":"PDF Compressor","desc":"Reduce PDF file size locally, then inspect text, signatures, images and page integrity before sharing the output.","cat":"PDF","icon":"picture_in_picture"},{"id":"images-to-pdf","title":"Images to PDF","desc":"Convert multiple images into a single PDF document.","cat":"PDF","icon":"collections"},{"id":"text-to-pdf","title":"Text to PDF Converter","desc":"Convert raw text into a downloadable PDF document.","cat":"PDF","icon":"article"},{"id":"jpg-to-pdf","title":"JPG to PDF","desc":"Convert a JPG image to a PDF file.","cat":"PDF","icon":"photo_library"},{"id":"pdf-to-images","title":"PDF to Images","desc":"Extract all pages of a PDF into separate images.","cat":"PDF","icon":"perm_media"},{"id":"pdf-rotator","title":"PDF Page Rotator","desc":"Rotate PDF pages permanently.","cat":"PDF","icon":"rotate_right"},{"id":"pdf-reorder","title":"PDF Page Reorder","desc":"Change the order of pages within a PDF.","cat":"PDF","icon":"reorder"},{"id":"pdf-extractor","title":"PDF Page Extractor","desc":"Extract specific pages from your PDF.","cat":"PDF","icon":"output"},{"id":"pdf-counter","title":"PDF Page Counter","desc":"Read the page count from a supported PDF in your browser and get a clear error when the document cannot be parsed.","cat":"PDF","icon":"format_list_numbered"},{"id":"pdf-metadata-viewer","title":"PDF Metadata Viewer","desc":"View author, title, and creation data of a PDF.","cat":"PDF","icon":"find_in_page"},{"id":"pdf-metadata-remover","title":"PDF Metadata Remover","desc":"Remove sensitive metadata from PDF files.","cat":"PDF","icon":"cleaning_services"},{"id":"add-page-numbers","title":"Add Page Numbers to PDF","desc":"Automatically insert page numbers into your PDF.","cat":"PDF","icon":"numbers"},{"id":"pdf-lock","title":"PDF Lock Tool","desc":"Add password-based PDF encryption locally, then verify viewer compatibility and store the password through a separate secure channel.","cat":"PDF","icon":"lock"},{"id":"pdf-text-extractor","title":"PDF Text Extractor","desc":"Extract plain text content from a PDF document.","cat":"PDF","icon":"description"},{"id":"pdf-form-filler","title":"PDF Form Filler","desc":"Fill out interactive PDF forms directly in the browser.","cat":"PDF","icon":"edit_note"},{"id":"pdf-signature","title":"PDF Signature Tool","desc":"Add your digital signature or drawing to a PDF.","cat":"PDF","icon":"draw"},{"id":"pdf-watermark","title":"PDF Watermark Tool","desc":"Add a text watermark across your PDF pages.","cat":"PDF","icon":"branding_watermark"},{"id":"pdf-to-zip","title":"PDF to ZIP Image Pack","desc":"Convert PDF to images and pack them in a ZIP archive.","cat":"PDF","icon":"folder_zip"},{"id":"word-counter","title":"Word Counter","desc":"Count words, characters, and spaces in your text.","cat":"Text","icon":"short_text"},{"id":"character-counter","title":"Character Counter","desc":"Count the exact number of characters in a string.","cat":"Text","icon":"spellcheck"},{"id":"sentence-counter","title":"Sentence Counter","desc":"Count the number of sentences in your text.","cat":"Text","icon":"notes"},{"id":"case-converter","title":"Case Converter","desc":"Convert text to UPPERCASE, lowercase, Title Case, etc.","cat":"Text","icon":"text_fields"},{"id":"remove-extra-spaces","title":"Remove Extra Spaces","desc":"Clear out multi-spaces and trailing whitespaces.","cat":"Text","icon":"space_bar"},{"id":"remove-duplicate-lines","title":"Remove Duplicate Lines","desc":"Filter out duplicate lines from your text lists.","cat":"Text","icon":"filter_list"},{"id":"sort-lines","title":"Sort Lines Alphabetically","desc":"Sort lines A-Z or Z-A easily.","cat":"Text","icon":"sort_by_alpha"},{"id":"reverse-text","title":"Reverse Text Tool","desc":"Reverse the exact character order of your text.","cat":"Text","icon":"swap_horizontal_circle"},{"id":"find-replace-text","title":"Find and Replace Text","desc":"Quickly find and replace strings in large texts.","cat":"Text","icon":"find_replace"},{"id":"text-diff","title":"Text Difference Checker","desc":"Compare two text blocks to see the differences.","cat":"Text","icon":"difference"},{"id":"markdown-previewer","title":"Markdown Previewer","desc":"Write and preview Markdown syntax in real-time.","cat":"Text","icon":"markdown"},{"id":"html-entity-encoder","title":"HTML Entity Encoder/Decoder","desc":"Encode and decode HTML safe entities.","cat":"Text","icon":"code_off"},{"id":"url-encoder","title":"URL Encoder/Decoder","desc":"Safely encode and decode URL strings.","cat":"Text","icon":"link_off"},{"id":"base64-encoder","title":"Base64 Encoder/Decoder","desc":"Convert text or data to and from Base64.","cat":"Text","icon":"password"},{"id":"slug-generator","title":"Slug Generator","desc":"Convert any title into a URL-friendly slug.","cat":"Text","icon":"link"},{"id":"meta-title-checker","title":"Meta Title Length Checker","desc":"Check if your SEO title is within optimal length limits.","cat":"SEO","icon":"title"},{"id":"meta-desc-checker","title":"Meta Description Length Checker","desc":"Ensure your meta descriptions are perfectly sized.","cat":"SEO","icon":"subtitles"},{"id":"keyword-density","title":"Keyword Density Checker","desc":"Analyze text for keyword usage and density.","cat":"SEO","icon":"analytics"},{"id":"read-time-calculator","title":"Read Time Calculator","desc":"Estimate how long it will take to read an article.","cat":"Text","icon":"timer"},{"id":"qr-generator","title":"QR Code Generator","desc":"Create a custom QR code from text or URL.","cat":"QR","icon":"qr_code_2"},{"id":"qr-scanner","title":"QR Code Scanner","desc":"Scan QR codes using your device camera or selected image.","cat":"QR","icon":"qr_code_scanner"},{"id":"wifi-qr","title":"Wi-Fi QR Code Generator","desc":"Generate a QR code to easily share your Wi-Fi.","cat":"QR","icon":"wifi_tethering"},{"id":"vcard-qr","title":"vCard QR Code Generator","desc":"Create a digital business card QR code.","cat":"QR","icon":"contact_page"},{"id":"whatsapp-link","title":"WhatsApp Chat Link Generator","desc":"Create direct click-to-chat WhatsApp links.","cat":"QR","icon":"chat"},{"id":"mailto-link","title":"Mailto Link Generator","desc":"Generate HTML mailto links with subject and body.","cat":"QR","icon":"mail"},{"id":"tel-link","title":"Tel Link Generator","desc":"Create clickable telephone links for websites.","cat":"QR","icon":"call"},{"id":"utm-builder","title":"UTM Link Builder","desc":"Build tracking URLs for Google Analytics campaigns.","cat":"SEO","icon":"add_link"},{"id":"short-link","title":"Clean Link Display","desc":"Format a readable link label from a valid URL without creating a redirect or sending it to a shortening service.","cat":"QR","icon":"link_sharp"},{"id":"qr-label-maker","title":"QR Code Label Maker","desc":"Design printable labels featuring QR codes.","cat":"QR","icon":"label"},{"id":"json-formatter","title":"JSON Formatter","desc":"Format and beautify ugly JSON strings.","cat":"Dev","icon":"data_object"},{"id":"json-validator","title":"JSON Validator","desc":"Validate your JSON syntax and highlight errors.","cat":"Dev","icon":"fact_check"},{"id":"json-minifier","title":"JSON Minifier","desc":"Compress JSON strings by removing spaces.","cat":"Dev","icon":"unfold_less"},{"id":"css-beautifier","title":"CSS Beautifier","desc":"Format and indent CSS code for readability.","cat":"Dev","icon":"css"},{"id":"css-minifier","title":"CSS Minifier","desc":"Minify CSS files to speed up page load times.","cat":"Dev","icon":"compress"},{"id":"js-beautifier","title":"JavaScript Beautifier","desc":"Format minified JavaScript code cleanly.","cat":"Dev","icon":"javascript"},{"id":"js-minifier","title":"JavaScript Minifier","desc":"Compress JavaScript code to save bandwidth.","cat":"Dev","icon":"terminal"},{"id":"html-beautifier","title":"HTML Beautifier","desc":"Format unstructured HTML code.","cat":"Dev","icon":"html"},{"id":"html-minifier","title":"HTML Minifier","desc":"Minify HTML to save space and load faster.","cat":"Dev","icon":"integration_instructions"},{"id":"regex-tester","title":"Regex Tester","desc":"Test regular expressions against text data.","cat":"Dev","icon":"rule"},{"id":"uuid-generator","title":"UUID Generator","desc":"Generate secure Version 4 UUIDs instantly.","cat":"Dev","icon":"fingerprint"},{"id":"hash-generator","title":"Hash Generator","desc":"Generate MD5, SHA-1, SHA-256, and SHA-512 hashes.","cat":"Dev","icon":"tag"},{"id":"password-generator","title":"Password Generator","desc":"Create secure, highly randomized passwords.","cat":"Dev","icon":"key"},{"id":"color-converter","title":"Color Converter","desc":"Convert colors between HEX, RGB, HSL, and CMYK.","cat":"Dev","icon":"tune"},{"id":"css-gradient","title":"CSS Gradient Generator","desc":"Build and export CSS gradient code visually.","cat":"Dev","icon":"gradient"},{"id":"box-shadow","title":"Box Shadow Generator","desc":"Create CSS drop shadows with visual controls.","cat":"Dev","icon":"shadow"},{"id":"border-radius","title":"Border Radius Generator","desc":"Generate complex CSS border-radius shapes.","cat":"Dev","icon":"rounded_corner"},{"id":"css-clamp","title":"CSS Clamp Generator","desc":"Calculate fluid typography clamp() functions.","cat":"Dev","icon":"straighten"},{"id":"flexbox-play","title":"Flexbox Playground","desc":"Learn and test CSS Flexbox layouts.","cat":"Dev","icon":"dashboard_customize"},{"id":"css-grid","title":"CSS Grid Generator","desc":"Design CSS grid layouts and export code.","cat":"Dev","icon":"grid_view"},{"id":"percentage-calculator","title":"Percentage Calculator","desc":"Calculate percentages easily and accurately.","cat":"Calc","icon":"percent"},{"id":"discount-calculator","title":"Discount Calculator","desc":"Find out the final price after discount.","cat":"Calc","icon":"sell"},{"id":"profit-margin","title":"Profit Margin Calculator","desc":"Calculate gross profit and margin percentages.","cat":"Calc","icon":"trending_up"},{"id":"vat-tax","title":"VAT/Tax Calculator","desc":"Add or remove VAT/Tax amounts from a price.","cat":"Calc","icon":"receipt_long"},{"id":"loan-emi","title":"Loan EMI Calculator","desc":"Calculate your monthly loan payments.","cat":"Calc","icon":"account_balance"},{"id":"date-diff","title":"Date Difference Calculator","desc":"Calculate the total days between two dates.","cat":"Calc","icon":"calendar_month"},{"id":"age-calculator","title":"Age Calculator","desc":"Calculate your exact age in years, months, and days.","cat":"Calc","icon":"cake"},{"id":"time-duration","title":"Time Duration Calculator","desc":"Find the duration between two times.","cat":"Calc","icon":"schedule"},{"id":"unit-converter","title":"Unit Converter","desc":"Convert length, weight, area, and temperature values.","cat":"Calc","icon":"square_foot"},{"id":"invoice-generator","title":"Invoice Generator","desc":"Create and generate fully functional invoice PDFs.","cat":"Calc","icon":"receipt"},{"id":"sql-formatter","title":"SQL Formatter","desc":"Format and beautify SQL queries.","cat":"Dev","icon":"database"},{"id":"lorem-ipsum","title":"Lorem Ipsum Generator","desc":"Generate dummy text for your projects.","cat":"Text","icon":"format_quote"},{"id":"og-previewer","title":"Open Graph Previewer","desc":"Inspect social metadata through a bounded server fetcher, with explicit network, privacy and platform-rendering limitations.","cat":"SEO","icon":"preview"},{"id":"json-to-csv","title":"JSON to CSV Converter","desc":"Convert JSON data to CSV format.","cat":"Dev","icon":"schema"},{"id":"image-to-base64","title":"Image to Base64","desc":"Convert image files into Base64 strings.","cat":"Image","icon":"raw_on"},{"id":"big-five-personality-test","title":"Big Five Personality Test","desc":"Take the free 50-item Big Five (OCEAN) assessment and get your openness, conscientiousness, extraversion, agreeableness and neuroticism profile.","cat":"Personality","icon":"psychology"},{"id":"enneagram-personality-test","title":"Enneagram Test","desc":"Discover your dominant Enneagram type (1-9) with this free 45-question test, including your wing and trait balance.","cat":"Personality","icon":"diversity_3"},{"id":"llm-token-counter","title":"LLM Token Counter & Cost Estimator","desc":"Estimate text token usage and cost for planning; verify exact billing with the target model tokenizer and current provider pricing.","cat":"Dev","icon":"token"},{"id":"llms-txt-generator","title":"llms.txt Generator","desc":"Generate a spec-compliant llms.txt so AI search engines and LLMs can understand, summarize and cite your website.","cat":"SEO","icon":"smart_toy"},{"id":"ai-crawler-robots-generator","title":"AI Crawler robots.txt Generator","desc":"Create a robots.txt that blocks or allows GPTBot, ClaudeBot, PerplexityBot and 20+ AI crawlers - with one-click presets.","cat":"SEO","icon":"robot_2"},{"id":"bmi-calculator","title":"BMI Calculator","desc":"Calculate BMI and your healthy weight range in metric or imperial units.","cat":"Calc","icon":"monitor_weight"},{"id":"calorie-macro-calculator","title":"Calorie & Macro Calculator","desc":"Estimate daily calories and protein, carb and fat targets from your goals.","cat":"Calc","icon":"local_fire_department"},{"id":"tip-calculator","title":"Tip Calculator","desc":"Split a bill, choose a tip percentage and see the total per person.","cat":"Calc","icon":"restaurant"},{"id":"jwt-decoder","title":"JWT Decoder","desc":"Decode JWT header and payload claims, check expiry and verify HS256 signatures.","cat":"Dev","icon":"key"},{"id":"unix-timestamp-converter","title":"Unix Timestamp Converter","desc":"Convert Unix timestamps to dates and dates to seconds or milliseconds.","cat":"Dev","icon":"schedule"},{"id":"readability-checker","title":"Readability Checker","desc":"Score your text with Flesch-Kincaid, Gunning Fog, SMOG and more.","cat":"Text","icon":"menu_book"},{"id":"text-to-speech","title":"Text to Speech","desc":"Read text aloud with adjustable voice, speed, pitch and volume.","cat":"Text","icon":"record_voice_over"},{"id":"color-palette-generator","title":"Color Palette Generator","desc":"Generate harmonious color palettes and copy HEX, CSS or JSON values.","cat":"Image","icon":"palette"},{"id":"pomodoro-timer","title":"Pomodoro Timer","desc":"Focus in custom sessions with short and long breaks built in.","cat":"Productivity","icon":"timer"},{"id":"typing-speed-test","title":"Typing Speed Test","desc":"Measure your WPM and accuracy in a timed typing test.","cat":"Productivity","icon":"keyboard"},{"id":"online-notepad","title":"Online Notepad","desc":"A distraction-free notepad that autosaves in your browser.","cat":"Productivity","icon":"edit_note"}];

    const searchInput = document.getElementById('global-search') || document.getElementById('global-search-input');
    const searchSubmitBtn = document.getElementById('search-submit-btn');
    const searchPreview = document.getElementById('search-preview');
    const toolsGrid = document.getElementById('featured-tools') || document.getElementById('all-tools-grid');
    const noResults = document.getElementById('search-no-results');
    const catBtns = document.querySelectorAll('.filter-btn');

    const catColorMap = {
        'image': { text: '#60A5FA', border: 'rgba(96, 165, 250, 0.3)', bg: 'rgba(96, 165, 250, 0.12)' },
        'dev': { text: '#06B6D4', border: 'rgba(6, 182, 212, 0.3)', bg: 'rgba(6, 182, 212, 0.12)' },
        'pdf': { text: '#FB7185', border: 'rgba(251, 113, 133, 0.3)', bg: 'rgba(251, 113, 133, 0.12)' },
        'text': { text: '#EAB308', border: 'rgba(234, 179, 8, 0.3)', bg: 'rgba(234, 179, 8, 0.12)' },
        'seo': { text: '#34D399', border: 'rgba(52, 211, 153, 0.3)', bg: 'rgba(52, 211, 153, 0.12)' },
        'qr': { text: '#818CF8', border: 'rgba(129, 140, 248, 0.3)', bg: 'rgba(129, 140, 248, 0.12)' },
        'calc': { text: '#FBBF24', border: 'rgba(251, 191, 36, 0.3)', bg: 'rgba(251, 191, 36, 0.12)' },
        'productivity': { text: '#FB923C', border: 'rgba(251, 146, 60, 0.3)', bg: 'rgba(251, 146, 60, 0.12)' },
        'personality': { text: '#F472B6', border: 'rgba(244, 114, 182, 0.35)', bg: 'rgba(244, 114, 182, 0.12)' }
    };

    let currentFilter = 'all';
    let currentQuery = '';
    let showAllTools = false;
    let debounceTimer;

    function cleanText(text) {
        return (text || '').toLowerCase().trim();
    }

    function editDistance(a, b, maxDist) {
        if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
        const m = a.length, n = b.length;
        let prev = Array.from({length: n + 1}, (_, i) => i);
        let curr = new Array(n + 1);
        for (let i = 1; i <= m; i++) {
            curr[0] = i;
            let rowMin = i;
            for (let j = 1; j <= n; j++) {
                const cost = a[i-1] === b[j-1] ? 0 : 1;
                curr[j] = Math.min(prev[j] + 1, curr[j-1] + 1, prev[j-1] + cost);
            }
            rowMin = Math.min(...curr);
            if (rowMin > maxDist) return maxDist + 1;
            [prev, curr] = [curr, prev];
        }
        return prev[n];
    }

    function matchToolQuery(q, title, desc, cat, toolId) {
        const cleanQ = cleanText(q);
        if (!cleanQ) return true;

        const qWords = cleanQ.split(/\s+/).filter(w => w.length > 0);
        if (qWords.length === 0) return true;

        const fullText = (title + ' ' + desc + ' ' + cat + ' ' + (toolId || '')).toLowerCase();
        const textWords = fullText.split(/[\s\-\/\,\.]+/).filter(w => w.length > 0);

        return qWords.every(qWord => {
            if (fullText.includes(qWord)) return true;
            for (let i = 0; i < textWords.length; i++) {
                const tw = textWords[i];
                if (tw.startsWith(qWord)) return true;
                if (qWord.length >= 4 && tw.length >= 4) {
                    const maxDist = qWord.length <= 5 ? 1 : 2;
                    if (editDistance(qWord, tw, maxDist) <= maxDist) return true;
                }
            }
            return false;
        });
    }

    function getMatchingTools(query) {
        const cleanQ = cleanText(query);
        if (!cleanQ) return [];

        return ALL_TOOLS.filter(tool => {
            return matchToolQuery(cleanQ, tool.title, tool.desc, tool.cat, tool.id);
        });
    }

    function hidePreview() {
        if (!searchPreview) return;
        searchPreview.classList.remove('active');
        searchPreview.replaceChildren();
        if (searchInput) searchInput.setAttribute('aria-expanded', 'false');
    }

    function renderPreview(query) {
        if (!searchPreview) return;
        const q = cleanText(query);
        if (!q) {
            hidePreview();
            return;
        }

        const matches = getMatchingTools(q).slice(0, 7);
        searchPreview.replaceChildren();

        if (!matches.length) {
            const empty = document.createElement('div');
            empty.className = 'search-preview-empty';
            empty.style.cssText = 'padding: 0.85rem; color: var(--text-muted); font-size: 0.9rem; text-align: center;';
            empty.textContent = 'No tools found matching your search';
            searchPreview.appendChild(empty);
        } else {
            matches.forEach(tool => {
                const item = document.createElement('a');
                item.className = 'search-preview-item';
                item.href = `/tools/${tool.id}`;
                item.setAttribute('role', 'option');

                const catKey = (tool.cat || '').toLowerCase();
                const c = catColorMap[catKey] || { text: '#06B6D4', border: 'rgba(6, 182, 212, 0.3)', bg: 'rgba(6, 182, 212, 0.12)' };

                const iconBox = document.createElement('div');
                iconBox.className = 'icon-box';
                iconBox.style.cssText = `margin-bottom:0; width:2.25rem; height:2.25rem; border-radius:0.5rem; color:${c.text}; background-color:${c.bg}; display:flex; align-items:center; justify-content:center; flex-shrink:0;`;

                const iconSpan = document.createElement('span');
                iconSpan.className = 'material-symbols-outlined';
                iconSpan.style.fontSize = '20px';
                iconSpan.textContent = tool.icon || 'build';
                iconBox.appendChild(iconSpan);

                const info = document.createElement('div');
                info.className = 'search-preview-info';

                const title = document.createElement('span');
                title.className = 'search-preview-title';
                title.textContent = tool.title;
                info.appendChild(title);

                const badge = document.createElement('span');
                badge.className = 'card-category-badge';
                badge.dataset.cat = catKey;
                badge.style.cssText = 'position:static; top:auto; right:auto; margin-left:auto; flex-shrink:0; font-size:0.65rem; font-weight:800; padding:0.2rem 0.55rem; border-radius:9999px; text-transform:uppercase;';
                badge.textContent = (tool.cat || '').toUpperCase();

                item.append(iconBox, info, badge);
                searchPreview.appendChild(item);
            });
        }

        searchPreview.classList.add('active');
        if (searchInput) searchInput.setAttribute('aria-expanded', 'true');
    }

    function updateGrid() {
        if (!toolsGrid) return;
        const cards = toolsGrid.querySelectorAll('.tool-card');
        let visibleCount = 0;
        const qClean = cleanText(currentQuery);
        const isSearching = qClean.length > 0;

        const mostUsedSection = document.querySelector('.most-used-section');
        if (mostUsedSection) {
            mostUsedSection.style.display = isSearching ? 'none' : 'block';
        }

        cards.forEach((card, index) => {
            const titleEl = card.querySelector('h4, h3');
            const title = titleEl ? titleEl.textContent : '';
            const descEl = card.querySelector('p');
            const desc = descEl ? descEl.textContent : '';
            const cat = card.getAttribute('data-category') || '';
            const toolId = card.getAttribute('data-tool-id') || '';

            const matchesSearch = isSearching ? matchToolQuery(qClean, title, desc, cat, toolId) : true;
            const matchesCat = currentFilter === 'all' || cat.toLowerCase() === currentFilter.toLowerCase();

            const shouldShow = matchesSearch && matchesCat;

            if (shouldShow) {
                if (!isSearching && currentFilter === 'all' && toolsGrid.id === 'featured-tools') {
                    card.style.display = showAllTools || index < 16 ? 'flex' : 'none';
                } else {
                    card.style.display = 'flex';
                }
                if (card.style.display === 'flex') visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (noResults) {
            noResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }
    }

    function performSearchExecution() {
        hidePreview();
        const q = searchInput ? searchInput.value.trim() : '';
        if (!q) return;

        if (toolsGrid && toolsGrid.id !== 'featured-tools') {
            currentQuery = q.toLowerCase();
            showAllTools = true;
            currentFilter = 'all';
            catBtns.forEach(b => {
                if (b.getAttribute('data-filter') === 'all') {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
            updateGrid();
            const gridSection = toolsGrid.closest('section') || toolsGrid;
            gridSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            window.location.href = `/tools?q=${encodeURIComponent(q)}`;
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const val = e.target.value;
            renderPreview(val);
            if (toolsGrid) {
                currentQuery = val.toLowerCase().trim();
                debounceTimer = setTimeout(updateGrid, 250);
            }
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim()) {
                renderPreview(searchInput.value);
            }
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearchExecution();
            } else if (e.key === 'Escape') {
                hidePreview();
            }
        });
    }

    if (searchSubmitBtn) {
        searchSubmitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            performSearchExecution();
        });
    }

    document.addEventListener('click', (e) => {
        if (!searchPreview || !searchPreview.classList.contains('active')) return;
        if (searchInput && (e.target === searchInput || searchInput.contains(e.target))) return;
        if (searchPreview.contains(e.target)) return;
        if (searchSubmitBtn && (e.target === searchSubmitBtn || searchSubmitBtn.contains(e.target))) return;
        hidePreview();
    });

    catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            hidePreview();
            catBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentFilter = btn.getAttribute('data-filter');
            showAllTools = currentFilter === 'all';
            updateGrid();
        });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const qParam = urlParams.get('q');
    if (qParam && searchInput) {
        searchInput.value = qParam;
        currentQuery = qParam.toLowerCase().trim();
        showAllTools = true;
        updateGrid();
    }

    // Deep-linking: /tools?cat=image (used by the Categories nav dropdown and sidebar)
    const validFilters = ['image', 'dev', 'pdf', 'text', 'seo', 'qr', 'calc', 'productivity', 'personality'];
    const catParam = (urlParams.get('cat') || '').toLowerCase().trim();
    if (toolsGrid && catParam) {
        if (catParam === 'all') {
            // default view; nothing to do
        } else if (validFilters.includes(catParam)) {
            currentFilter = catParam;
            showAllTools = false;
            catBtns.forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-filter') === catParam);
            });
            updateGrid();
            const gridSection = toolsGrid.closest('main') || toolsGrid;
            gridSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
});