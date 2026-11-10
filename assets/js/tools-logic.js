
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('tool-app-container');
    if (!container) return;

    const toolId = container.getAttribute('data-tool-id');

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, function(ch) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[ch];
        });
    }

    function loadExternalScript(src) {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            return existing.dataset.loaded === '1'
                ? Promise.resolve()
                : new Promise((resolve, reject) => {
                    existing.addEventListener('load', resolve, { once: true });
                    existing.addEventListener('error', reject, { once: true });
                });
        }
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                script.dataset.loaded = '1';
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // -------------------------------------------------------------
    // Unified Inline Toast Notification System (Zero Native Modals)
    // -------------------------------------------------------------
    let toastContainer = null;
    function showToast(message, type = 'error', duration = 4000) {
        if (!toastContainer) {
            toastContainer = document.querySelector('.toast-container');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.className = 'toast-container';
                document.body.appendChild(toastContainer);
            }
        }

        const toast = document.createElement('div');
        toast.className = 'toast-banner toast-' + type;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');

        let iconSvg = '';
        if (type === 'success') {
            iconSvg = '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
        } else if (type === 'warning') {
            iconSvg = '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
        } else if (type === 'info') {
            iconSvg = '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
        } else {
            // error
            iconSvg = '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
        }

        toast.innerHTML = iconSvg + '<div class="toast-message">' + escapeHtml(message) + '</div><button class="toast-close" type="button" aria-label="Close notification">&times;</button>';

        const closeBtn = toast.querySelector('.toast-close');
        let timer = null;

        function dismiss() {
            if (timer) clearTimeout(timer);
            toast.classList.remove('toast-show');
            toast.classList.add('toast-hiding');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 260);
        }

        closeBtn.addEventListener('click', dismiss);
        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('toast-show');
        });

        if (duration > 0) {
            timer = setTimeout(dismiss, duration);
        }
    }

    // Bulletproof override of window.alert to guarantee 0 popup modals
    window.alert = function(msg) {
        showToast(msg, 'warning');
    };

    // -------------------------------------------------------------
    // Unified Resilient External Library Loader & Fallback CDN Map
    // -------------------------------------------------------------
    const LIB_REGISTRY = {
        pdfLib: {
            check: () => typeof window.PDFLib !== 'undefined',
            urls: [
                'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
                'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'
            ]
        },
        pdfjs: {
            check: () => typeof window.pdfjsLib !== 'undefined',
            urls: [
                'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
                'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            ],
            init: (loadedUrl) => {
                if (!window.pdfjsLib || window.pdfjsLib.GlobalWorkerOptions.workerSrc) return;
                const workers = [
                    ['cdn.jsdelivr.net', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'],
                    ['unpkg.com', 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'],
                    ['cdnjs.cloudflare.com', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js']
                ];
                const match = loadedUrl ? workers.find(([host]) => loadedUrl.includes(host)) : null;
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = (match || workers[0])[1];
            }
        },
        qrcode: {
            check: () => typeof window.QRCode !== 'undefined',
            urls: [
                'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
            ]
        },
        jszip: {
            check: () => typeof window.JSZip !== 'undefined',
            urls: [
                'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
                'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'
            ]
        },
        pdfEncrypt: {
            check: () => typeof window.PDFEncrypt !== 'undefined',
            urls: [
                'https://cdn.jsdelivr.net/npm/@pdfsmaller/pdf-encrypt@1/dist/pdf-encrypt.umd.js',
                'https://unpkg.com/@pdfsmaller/pdf-encrypt@1/dist/pdf-encrypt.umd.js'
            ]
        },
        jsQR: {
            check: () => typeof window.jsQR !== 'undefined',
            urls: [
                'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
                'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js'
            ]
        },
        acorn: {
            check: () => typeof window.acorn !== 'undefined' && typeof window.acorn.parse === 'function',
            urls: [
                'https://cdn.jsdelivr.net/npm/acorn@8.11.3/dist/acorn.js',
                'https://cdnjs.cloudflare.com/ajax/libs/acorn/8.11.3/acorn.min.js',
                'https://unpkg.com/acorn@8.11.3/dist/acorn.js'
            ]
        }
    };

    const TOOL_LIBRARIES = {
        'text-to-pdf': ['pdfLib'],
        'pdf-counter': ['pdfLib'],
        'pdf-merger': ['pdfLib'],
        'pdf-splitter': ['pdfLib'],
        'pdf-compressor': ['pdfLib'],
        'images-to-pdf': ['pdfLib'],
        'jpg-to-pdf': ['pdfLib'],
        'pdf-to-images': ['pdfjs'],
        'pdf-rotator': ['pdfLib'],
        'pdf-reorder': ['pdfLib'],
        'pdf-extractor': ['pdfLib'],
        'pdf-metadata-viewer': ['pdfLib'],
        'pdf-metadata-remover': ['pdfLib'],
        'add-page-numbers': ['pdfLib'],
        'pdf-lock': ['pdfLib', 'pdfEncrypt'],
        'pdf-text-extractor': ['pdfjs'],
        'pdf-form-filler': ['pdfLib'],
        'pdf-signature': ['pdfLib'],
        'pdf-watermark': ['pdfLib'],
        'pdf-to-zip': ['pdfjs', 'jszip'],
        'qr-generator': ['qrcode'],
        'wifi-qr': ['qrcode'],
        'vcard-qr': ['qrcode'],
        'qr-scanner': ['jsQR'],
        'qr-label-maker': ['qrcode']
    };

    async function ensureLibrary(key) {
        const entry = LIB_REGISTRY[key];
        if (!entry) return;
        if (entry.check()) {
            if (entry.init) entry.init();
            return;
        }
        for (const url of entry.urls) {
            try {
                await loadExternalScript(url);
                if (entry.check()) {
                    if (entry.init) entry.init(url);
                    return;
                }
            } catch (e) {
                console.warn('Fallback: Error loading ' + key + ' from ' + url, e);
            }
        }
        throw new Error('Failed to load library: ' + key);
    }

    async function ensureLibraries(keys) {
        if (!keys || !keys.length) return;
        for (const key of keys) {
            await ensureLibrary(key);
        }
    }


    // Central tool logic dispatcher
    const ToolHandlers = {
        'image-compressor': renderImageCompressor,
        'image-resizer': renderImageResizer,
        'jpg-to-png': renderJpgToPng,
        'word-counter': renderWordCounter,
        'color-picker-image': renderColorPicker,
        'qr-generator': renderQrGenerator,
        'wifi-qr': renderWifiQr,
        'json-formatter': renderJsonFormatter,
        'percentage-calculator': renderPercentageCalculator,
        'case-converter': renderCaseConverter,
        'password-generator': renderPasswordGenerator,
        'text-to-pdf': renderTextToPdf,
        'character-counter': renderCharacterCounter,
        'sentence-counter': renderSentenceCounter,
        'paragraph-counter': renderParagraphCounter,
        'remove-extra-spaces': renderRemoveExtraSpaces,
        'remove-duplicate-lines': renderRemoveDuplicateLines,
        'sort-lines': renderSortLines,
        'reverse-text': renderReverseText,
        'json-validator': renderJsonValidator,
        'json-minifier': renderJsonMinifier,
        'base64-encoder': renderBase64Encoder,
        'url-encoder': renderUrlEncoder,
        'html-entity-encoder': renderHtmlEntityEncoder,
        'hash-generator': renderHashGenerator,
        'uuid-generator': renderUuidGenerator,
        'discount-calculator': renderDiscountCalculator,
        'vat-tax': renderVatTax,
        'date-diff': renderDateDiff,
        'age-calculator': renderAgeCalculator,
        'time-duration': renderTimeDuration,
        'find-replace-text': renderFindReplaceText,
        'markdown-previewer': renderMarkdownPreviewer,
        'profit-margin': renderProfitMargin,
        'loan-emi': renderLoanEmi,
        'unit-converter': renderUnitConverter,
        'meta-title-checker': renderMetaTitleChecker,
        'meta-desc-checker': renderMetaDescChecker,
        'keyword-density': renderKeywordDensity,
        'read-time-calculator': renderReadTimeCalculator,
        'whatsapp-link': renderWhatsappLink,
        'mailto-link': renderMailtoLink,
        'tel-link': renderTelLink,
        'pdf-counter': renderPdfCounter,
        'vcard-qr': renderVcardQr,
        'css-beautifier': renderCssBeautifier,
        'js-beautifier': renderJsBeautifier,
        'html-beautifier': renderHtmlBeautifier,
        'png-to-jpg': renderPngToJpg,
        'image-to-webp': renderImageToWebp,
        'webp-to-jpg': renderWebpToJpg,
        'image-cropper': renderImageCropper,
        'profile-picture-maker': renderProfilePictureMaker,
        'passport-photo-maker': renderPassportPhotoMaker,
        'gradient-generator-img': renderGradientGeneratorImg,
        'image-flip': renderImageFlip,
        'image-watermark': renderImageWatermark,
        'remove-image-metadata': renderRemoveImageMetadata,
        'image-metadata-viewer': renderImageMetadataViewer,
        'blur-face': renderBlurFace,
        'pixelate-image': renderPixelateImage,
        'image-palette': renderImagePalette,
        'grayscale-image': renderGrayscaleImage,
        'bg-color-changer': renderBgColorChanger,
        'text-diff': renderTextDiff,
        'slug-generator': renderSlugGenerator,
        'css-minifier': renderCssMinifier,
        'js-minifier': renderJsMinifier,
        'html-minifier': renderHtmlMinifier,
        'regex-tester': renderRegexTester,
        'color-converter': renderColorConverter,
        'css-gradient': renderCssGradient,
        'box-shadow': renderBoxShadow,
        'border-radius': renderBorderRadius,
        'css-clamp': renderCssClamp,
        'flexbox-play': renderFlexboxPlay,
        'css-grid': renderCssGrid,
        'qr-scanner': renderQrScanner,
        'short-link': renderShortLink,
        'qr-label-maker': renderQrLabelMaker,
        'utm-builder': renderUtmBuilder,
        'invoice-generator': renderInvoiceGenerator,
        'pdf-merger': renderPdfMerger,
        'pdf-splitter': renderPdfSplitter,
        'pdf-compressor': renderPdfCompressor,
        'images-to-pdf': renderImagesToPdf,
        'jpg-to-pdf': renderJpgToPdf,
        'pdf-to-images': renderPdfToImages,
        'pdf-rotator': renderPdfRotator,
        'pdf-reorder': renderPdfReorder,
        'pdf-extractor': renderPdfExtractor,
        'pdf-metadata-viewer': renderPdfMetadataViewer,
        'pdf-metadata-remover': renderPdfMetadataRemover,
        'add-page-numbers': renderAddPageNumbers,
        'pdf-lock': renderPdfLock,
        'pdf-text-extractor': renderPdfTextExtractor,
        'pdf-form-filler': renderPdfFormFiller,
        'pdf-signature': renderPdfSignature,
        'pdf-watermark': renderPdfWatermark,
        'pdf-to-zip': renderPdfToZip,
        'sql-formatter': renderSqlFormatter,
        'lorem-ipsum': renderLoremIpsum,
        'og-previewer': renderOgPreviewer,
        'json-to-csv': renderJsonToCsv,
        'image-to-base64': renderImageToBase64,
        'image-to-url': renderImageToUrl,
        'big-five-personality-test': renderBigFivePersonalityTest,
        'enneagram-personality-test': renderEnneagramPersonalityTest,
        'llm-token-counter': renderLlmTokenCounter,
        'llms-txt-generator': renderLlmsTxtGenerator,
        'ai-crawler-robots-generator': renderAiCrawlerRobotsGenerator,
        'bmi-calculator': renderBmiCalculator,
        'calorie-macro-calculator': renderCalorieMacroCalculator,
        'tip-calculator': renderTipCalculator,
        'jwt-decoder': renderJwtDecoder,
        'unix-timestamp-converter': renderUnixTimestampConverter,
        'readability-checker': renderReadabilityChecker,
        'text-to-speech': renderTextToSpeech,
        'color-palette-generator': renderColorPaletteGenerator,
        'pomodoro-timer': renderPomodoroTimer,
        'typing-speed-test': renderTypingSpeedTest,
        'online-notepad': renderOnlineNotepad
    };

    // Drag-and-drop enhancer for file inputs
    function enableDragDrop(root) {
        root.querySelectorAll('input[type="file"]').forEach(function(input) {
            if (input.dataset.dropEnabled) return;
            input.dataset.dropEnabled = '1';
            var accept = input.getAttribute('accept') || '';
            var isImage = accept.includes('image');
            var acceptRules = accept.split(',').map(function(rule) {
                return rule.trim().toLowerCase();
            }).filter(Boolean);
            var zone = input.closest('.file-upload-area');
            var selectedLabel;
            var titleLabel;

            if (!zone) {
                zone = document.createElement('div');
                zone.className = 'drag-drop-zone';
                selectedLabel = document.createElement('span');
                selectedLabel.className = 'drag-drop-selected';
                let formatText = '';
                if (acceptRules.includes('image/*')) formatText = 'Supports JPG, PNG, WebP up to 10MB';
                else if (acceptRules.includes('application/pdf') || acceptRules.includes('.pdf')) formatText = 'Supports PDF up to 20MB';
                else if (acceptRules.length) formatText = 'Supports ' + acceptRules.join(', ').toUpperCase() + ' up to 20MB';
                else formatText = 'Supports all files up to 20MB';

                zone.innerHTML = `
                    <div class="drag-drop-icon-wrapper">
                        <span class="drag-drop-icon" aria-hidden="true">
                            <svg fill="currentColor" viewBox="0 0 24 24" stroke="none">
                                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.36 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                            </svg>
                        </span>
                    </div>
                    <div class="drag-drop-info">
                        <span class="drag-drop-title">Drag & Drop ${isImage ? 'Images' : 'Files'}</span>
                        <span class="drag-drop-hint">or click to browse from your device</span>
                        <span class="drag-drop-support-text">${formatText}</span>
                    </div>
                `;
                const infoBox = zone.querySelector('.drag-drop-info');
                if (infoBox) infoBox.appendChild(selectedLabel);
                else zone.appendChild(selectedLabel);
                input.parentNode.insertBefore(zone, input);
                zone.appendChild(input);
            } else {
                selectedLabel = zone.querySelector('.drag-drop-selected');
                const existingUploadLabel = zone.querySelector('#uploadLabel');
                if (!selectedLabel && existingUploadLabel) {
                    selectedLabel = existingUploadLabel;
                } else if (!selectedLabel) {
                    selectedLabel = document.createElement('span');
                    selectedLabel.className = 'drag-drop-selected';
                    zone.querySelector('.upload-placeholder')?.appendChild(selectedLabel);
                }
            }
            titleLabel = zone.querySelector('.drag-drop-title');
            input.classList.add('tool-file-input');

            function acceptedLabel() {
                if (!acceptRules.length) return 'supported files';
                if (acceptRules.includes('application/pdf') || acceptRules.includes('.pdf')) return 'PDF files';
                if (acceptRules.includes('image/*')) return 'image files';
                return acceptRules.map(function(rule) {
                    if (rule.startsWith('.')) return rule.toUpperCase();
                    if (rule.includes('/')) return rule.split('/').pop().toUpperCase();
                    return rule.toUpperCase();
                }).join(', ');
            }

            function fileMatchesAccept(file) {
                if (!acceptRules.length) return true;
                const name = (file.name || '').toLowerCase();
                const type = (file.type || '').toLowerCase();
                for (const rawRule of acceptRules) {
                    const rule = rawRule.trim().toLowerCase();
                    if (!rule || rule === '*/*' || rule === '*') return true;
                    if (rule.startsWith('.')) { if (name.endsWith(rule)) return true; continue; }
                    if (rule.endsWith('/*')) {
                        const mediaType = rule.split('/')[0];
                        if (type.startsWith(mediaType + '/')) return true;
                        if (mediaType === 'image') { if (/\.(jpg|jpeg|png|webp|gif|bmp|svg|ico|avif|heic|tiff)$/i.test(name)) return true; continue; }
                        if (mediaType === 'video') { if (/\.(mp4|webm|mkv|avi|mov|wmv|flv|m4v|3gp)$/i.test(name)) return true; continue; }
                        if (mediaType === 'audio') { if (/\.(mp3|wav|ogg|aac|flac|m4a|wma)$/i.test(name)) return true; continue; }
                        if (mediaType === 'text')  { if (/\.(txt|csv|json|md|html|xml|css|js)$/i.test(name)) return true; continue; }
                        continue;
                    }
                    if (type === rule) return true;
                    const subtype = rule.split('/')[1] || '';
                    if (subtype && (name.endsWith('.' + subtype) || type.includes(subtype))) return true;
                }
                return false;
            }

            var autoQueueList = null;
            if (input.multiple) {
                zone.classList.add('is-multiple');
                const hasCustomQueue = zone.parentNode && zone.parentNode.querySelector('.pdf-merge-list');
                if (!hasCustomQueue && zone.parentNode) {
                    autoQueueList = zone.parentNode.querySelector('.multi-file-queue-list');
                    if (!autoQueueList) {
                        autoQueueList = document.createElement('div');
                        autoQueueList.className = 'multi-file-queue-list';
                        autoQueueList.style.display = 'none';
                        zone.parentNode.insertBefore(autoQueueList, zone.nextSibling);
                    }
                }
            }

            function formatBytes(bytes) {
                if (!bytes) return '0 B';
                var k = 1024;
                var sizes = ['B', 'KB', 'MB', 'GB'];
                var i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
            }

            function renderAutoQueue(files) {
                if (!autoQueueList) return;
                var fileArr = Array.from(files || []);
                if (!fileArr.length) {
                    autoQueueList.style.display = 'none';
                    autoQueueList.replaceChildren();
                    return;
                }
                autoQueueList.style.display = 'flex';
                autoQueueList.replaceChildren();
                fileArr.forEach(function(file, index) {
                    var row = document.createElement('div');
                    row.className = 'multi-file-list-row';

                    var info = document.createElement('div');
                    info.className = 'file-info';

                    var num = document.createElement('span');
                    num.className = 'file-index-badge';
                    num.textContent = index + 1;

                    var name = document.createElement('span');
                    name.className = 'file-name';
                    name.textContent = file.name;
                    name.title = file.name;

                    var size = document.createElement('span');
                    size.className = 'file-size';
                    size.textContent = formatBytes(file.size);

                    info.append(num, name, size);

                    var removeBtn = document.createElement('button');
                    removeBtn.type = 'button';
                    removeBtn.className = 'multi-file-remove-btn';
                    removeBtn.title = 'Remove file';
                    removeBtn.innerHTML = '&times;';
                    removeBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        var current = Array.from(input.files || []);
                        current.splice(index, 1);
                        try { input.files = buildFileList(current); } catch(err) {}
                        updateSelected(input.files);
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    });

                    row.append(info, removeBtn);
                    autoQueueList.appendChild(row);
                });
            }

            function buildFileList(files) {
                const dt = new DataTransfer();
                files.forEach(function(file) { dt.items.add(file); });
                return dt.files;
            }

            function selectedText(files) {
                if (!files || !files.length) return '';
                return files.length === 1 ? files[0].name : files.length + ' files selected';
            }

            function updateSelected(files) {
                const fls = files || input.files;
                const name = selectedText(fls);
                const hasFile = Boolean(name);
                zone.classList.toggle('has-file', hasFile);
                if (input.multiple) {
                    zone.classList.add('is-multiple');
                    renderAutoQueue(fls);
                }
                let replaceBadge = zone.querySelector('.drag-drop-replace-badge');
                if (!input.multiple && hasFile) {
                    if (!replaceBadge) {
                        replaceBadge = document.createElement('span');
                        replaceBadge.className = 'drag-drop-replace-badge';
                        replaceBadge.textContent = 'Replace File';
                        zone.appendChild(replaceBadge);
                    }
                } else if (replaceBadge) {
                    replaceBadge.remove();
                }
                if (titleLabel) {
                    if (input.multiple) {
                        titleLabel.textContent = hasFile ? 'Add More Files' : (isImage ? 'Choose images' : 'Choose files');
                    } else {
                        titleLabel.textContent = hasFile ? (isImage ? 'Selected Image' : 'Selected File') : (isImage ? 'Choose an image' : 'Choose a file');
                    }
                }
                if (selectedLabel) {
                    selectedLabel.textContent = name;
                    selectedLabel.title = name;
                }
            }

            function applyDroppedFiles(files) {
                if (!files || !files.length) return;
                
                // If single file and file already loaded: replace silently and notify (no native dialogs)
                if (!input.multiple && input.files && input.files.length > 0) {
                    showToast('Previous file replaced.', 'info');
                }

                const valid = Array.from(files).filter(fileMatchesAccept);
                if (!valid.length) {
                    showToast('Please select a supported file.', "warning");
                    return;
                }

                if (input.multiple) {
                    const currentFiles = input.files ? Array.from(input.files) : [];
                    const newFiles = valid.filter(function(nf) {
                        return !currentFiles.some(function(cf) {
                            return cf.name === nf.name && cf.size === nf.size && cf.lastModified === nf.lastModified;
                        });
                    });
                    const combined = currentFiles.concat(newFiles);
                    try { input.files = buildFileList(combined); } catch(e) {}
                } else {
                    try { input.files = buildFileList(valid.slice(0, 1)); } catch(e) {}
                }

                updateSelected(input.files);
                input.dispatchEvent(new Event('change', {bubbles:true}));
            }

            function bindDropTarget(target) {
                if (!target || target.dataset.dropProxyEnabled) return;
                target.dataset.dropProxyEnabled = '1';
                target.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    target.classList.add('is-dragging');
                });
                target.addEventListener('dragleave', function() {
                    target.classList.remove('is-dragging');
                });
                target.addEventListener('drop', function(e) {
                    e.preventDefault();
                    target.classList.remove('is-dragging');
                    applyDroppedFiles(e.dataTransfer.files);
                });
            }

            const toolUi = input.closest('.tool-ui');
            const extraDropSelector = input.dataset.dropTarget || '.upload-drop-target, #cropArea, #preview, #qrPreview';
            if (toolUi) {
                toolUi.querySelectorAll(extraDropSelector).forEach(bindDropTarget);
            }

            zone.addEventListener('dragover', function(e) {
                e.preventDefault();
                zone.classList.add('is-dragging');
            });
            zone.addEventListener('dragleave', function() {
                zone.classList.remove('is-dragging');
            });
            zone.addEventListener('drop', function(e) {
                e.preventDefault();
                zone.classList.remove('is-dragging');
                applyDroppedFiles(e.dataTransfer.files);
            });
            
            input.addEventListener('change', function() {
                updateSelected(input.files);
            });
        });
    }

    function setupPdfPageCounters(root) {
        root.querySelectorAll('input[type="file"]').forEach(function(input) {
            const accept = (input.getAttribute('accept') || '').toLowerCase();
            if (!accept.includes('pdf') || input.dataset.pdfPageCountEnabled) return;
            input.dataset.pdfPageCountEnabled = '1';

            const panel = document.createElement('div');
            panel.className = 'pdf-page-count';
            panel.setAttribute('aria-live', 'polite');
            panel.style.display = 'none';

            const toolUi = input.closest('.tool-ui') || root;
            const actionButton = toolUi.querySelector('#actionBtn, #countBtn, #generatePdfBtn, #convertBtn') || toolUi.querySelector('.primary-btn');
            if (actionButton) {
                let actionRow = actionButton.closest('.pdf-action-row');
                if (!actionRow) {
                    actionRow = document.createElement('div');
                    actionRow.className = 'pdf-action-row';
                    actionButton.insertAdjacentElement('beforebegin', actionRow);
                    actionRow.appendChild(actionButton);
                }
                actionRow.insertBefore(panel, actionButton);
            } else {
                const anchor = input.closest('.drag-drop-zone, .file-upload-area') || input;
                anchor.insertAdjacentElement('afterend', panel);
            }

            let readToken = 0;

            function setStatus(message, state) {
                panel.style.display = 'block';
                panel.classList.toggle('is-loading', state === 'loading');
                panel.classList.toggle('is-error', state === 'error');
                panel.textContent = message;
            }

            function renderCounts(results) {
                panel.style.display = 'block';
                panel.classList.remove('is-loading', 'is-error');
                panel.replaceChildren();

                const readable = results.filter(item => Number.isFinite(item.pages));
                const totalPages = readable.reduce((sum, item) => sum + item.pages, 0);
                const total = document.createElement('div');
                total.className = 'pdf-page-count-total';
                total.textContent = results.length > 1 ? `Pages: ${totalPages} total` : `Pages: ${totalPages}`;
                panel.appendChild(total);

                if (results.length > 1) {
                    panel.title = results.map(item => {
                        const pages = Number.isFinite(item.pages) ? `${item.pages} pages` : 'Unable to read';
                        return `${item.name}: ${pages}`;
                    }).join('\n');
                } else {
                    panel.removeAttribute('title');
                }

                if (!readable.length) {
                    panel.classList.add('is-error');
                    total.textContent = 'Page count unavailable for the selected PDF.';
                }
            }

            input.addEventListener('change', async function() {
                const token = ++readToken;
                const sourceFiles = typeof input.getPdfPageCountFiles === 'function' ? input.getPdfPageCountFiles() : input.files;
                const files = Array.from(sourceFiles || []).filter(file => {
                    return file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
                });

                if (!files.length) {
                    panel.style.display = 'none';
                    panel.replaceChildren();
                    return;
                }

                if (typeof PDFLib === 'undefined' || !PDFLib.PDFDocument) {
                    if (!window._loadingPdfLib) {
                        window._loadingPdfLib = true;
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
                        script.onload = () => { input.dispatchEvent(new Event('change', { bubbles: true })); };
                        script.onerror = () => { window._loadingPdfLib = false; }; // allow retry on failure
                        document.head.appendChild(script);
                    }
                    panel.style.display = 'none';
                    return;
                }

                setStatus(files.length > 1 ? 'Reading page counts...' : 'Reading page count...', 'loading');

                const results = await Promise.all(files.map(async file => {
                    try {
                        const buf = await file.arrayBuffer();
                        const pdf = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
                        return { name: file.name, pages: pdf.getPageCount() };
                    } catch (err) {
                        console.error('PDF page count error:', err);
                        return { name: file.name, pages: null };
                    }
                }));

                if (token !== readToken) return;
                renderCounts(results);
            });
        });
    }

    const statusEl = document.getElementById('tool-status');
    const resetBtn = document.getElementById('tool-reset-btn');
    const copyBtn = document.getElementById('tool-copy-link');
    let hasTracked = false;

    function setToolStatus(message, state) {
        if (!statusEl) return;
        statusEl.textContent = message;
        if (state) {
            statusEl.setAttribute('data-state', state);
        } else {
            statusEl.removeAttribute('data-state');
        }
    }

    // Give unlabelled controls an accessible name. Many tool handlers use a
    // visual <label> without a `for` attribute, or rely on placeholders.
    function enhanceToolA11y(root) {
        const controls = root.querySelectorAll('input, select, textarea');
        const labels = Array.from(root.querySelectorAll('label[for]'));

        controls.forEach((el) => {
            if (el.type === 'hidden') return;
            if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return;
            if (el.closest('label')) return;

            let label = el.id ? labels.find((item) => item.getAttribute('for') === el.id) : null;
            if (!label) {
                const prev = el.previousElementSibling;
                if (prev && prev.tagName === 'LABEL') label = prev;
            }

            if (label) {
                if (!el.id) {
                    el.id = 'tool-field-' + Math.random().toString(36).slice(2, 10);
                }
                label.setAttribute('for', el.id);
                return;
            }

            let name = el.getAttribute('placeholder') || '';
            if (!name && el.type === 'file') {
                const accept = (el.getAttribute('accept') || '').toLowerCase();
                name = accept.includes('pdf') ? 'Choose PDF file' : accept.includes('image') ? 'Choose image file' : 'Choose file';
            }
            if (!name && el.type === 'range') name = 'Adjust value';
            if (!name && el.type === 'color') name = 'Choose colour';
            if (!name) name = el.tagName === 'SELECT' ? 'Select an option' : 'Input value';
            el.setAttribute('aria-label', name);
        });
    }

    async function mountTool(options = {}) {
        const isReset = options.reset === true;
        if (resetBtn) resetBtn.disabled = true;
        container.classList.remove('tool-ready');

        const requiredLibs = TOOL_LIBRARIES[toolId] || [];
        if (requiredLibs.length > 0) {
            setToolStatus('Loading engine\u2026', 'loading');
            try {
                await ensureLibraries(requiredLibs);
            } catch (libErr) {
                console.error('Failed to load libraries for tool:', toolId, libErr);
                showToast('Unable to load required engine components. Please check your connection and refresh.', 'error');
            }
        }

        if (!ToolHandlers[toolId]) {
            console.error('No handler registered for tool id "' + toolId + '"');
            container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);"><p style="font-size:1.125rem;margin-bottom:0.5rem;">This tool is temporarily unavailable.</p><p><a href="/tools" style="color:var(--primary);font-weight:600;">Browse all tools</a></p></div>';
            setToolStatus('Unavailable', 'error');
            if (resetBtn) resetBtn.disabled = false;
            return;
        }

        container.innerHTML = '';
        setToolStatus(isReset ? 'Restarting\u2026' : 'Starting\u2026', 'loading');

        try {
            ToolHandlers[toolId](container);
            enableDragDrop(container);
            setupPdfPageCounters(container);
            enhanceToolA11y(container);
            container.classList.add('tool-ready');
            setToolStatus('Ready', 'ready');
            if (!hasTracked) {
                hasTracked = true;
                fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: toolId }) }).catch(() => {});
            }
            if (isReset) {
                showToast('Workspace reset. Ready for a fresh run.', 'success', 2400);
            }
        } catch (err) {
            console.error('Tool error:', err);
            container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);"><p style="font-size:1.125rem;margin-bottom:0.5rem;">Something went wrong loading this tool.</p><p>Please try refreshing the page.</p></div>';
            setToolStatus('Error', 'error');
        } finally {
            if (resetBtn) resetBtn.disabled = false;
        }
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            mountTool({ reset: true });
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const label = copyBtn.querySelector('.tool-copy-label');
            const originalLabel = label ? label.textContent : '';
            const url = window.location.href;
            let copied = false;

            try {
                await navigator.clipboard.writeText(url);
                copied = true;
            } catch (clipboardErr) {
                const helper = document.createElement('textarea');
                helper.value = url;
                helper.setAttribute('readonly', '');
                helper.style.position = 'fixed';
                helper.style.top = '-1000px';
                helper.style.opacity = '0';
                document.body.appendChild(helper);
                helper.select();
                try {
                    copied = document.execCommand('copy');
                } catch (fallbackErr) {
                    copied = false;
                }
                helper.remove();
            }

            if (!copied) {
                showToast('Could not copy automatically. Copy the URL from your address bar.', 'warning');
                return;
            }

            copyBtn.classList.add('is-copied');
            if (label) label.textContent = 'Link copied';
            setTimeout(() => {
                copyBtn.classList.remove('is-copied');
                if (label) label.textContent = originalLabel;
            }, 2000);
        });
    }

    mountTool();

    // --- TOOL IMPLEMENTATIONS (Core 10 Tools) ---

    function renderImageCompressor(el) {
        el.innerHTML = `
            <div class="tool-ui img-compressor">
                <div class="file-upload-area" id="imgDropArea">
                    <div class="drag-drop-icon-wrapper" aria-hidden="true">
                        <span class="drag-drop-icon">
                            <svg fill="currentColor" viewBox="0 0 24 24" stroke="none">
                                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.36 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                            </svg>
                        </span>
                    </div>
                    <div class="drag-drop-info">
                        <span class="drag-drop-title">Choose an image</span>
                        <span class="drag-drop-hint">or drop it here &middot; JPG, PNG, WebP</span>
                        <span class="drag-drop-selected"></span>
                    </div>
                    <input type="file" id="imgIpt" accept="image/*" class="search-bar" aria-label="Choose an image to compress">
                </div>
                <div id="fileStats" class="img-meta" style="display:none;">
                    <span id="originalSize">Original: -</span>
                    <span id="estimatedSize">Compressed: -</span>
                </div>
                <div id="qualityRow" class="img-controls" style="display:none;">
                    <label class="img-quality-label" for="quality">Quality <output id="qualityVal" for="quality">75%</output></label>
                    <input type="range" id="quality" min="0.1" max="1" step="0.05" value="0.75" aria-label="Compression quality">
                    <button class="btn primary-btn" id="compressBtn">Compress image</button>
                </div>
                <div id="output" class="img-output" aria-live="polite"></div>
                <div id="preview" class="img-preview">
                    <img alt="Image preview">
                </div>
            </div>
        `;
        let compressorFile = null;
        let compressorImage = null;
        let compressedImageDataUrl = null;
        let outputExt = 'jpg';

        function formatBytes(bytes) {
            if (!Number.isFinite(bytes) || bytes < 0) return '-';
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(bytes < 100 * 1024 ? 1 : 0) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        }

        function renderCompressedPreview(showResult) {
            const stats = document.getElementById('fileStats');
            const originalSize = document.getElementById('originalSize');
            const estimatedSize = document.getElementById('estimatedSize');
            const preview = document.getElementById('preview');
            const output = document.getElementById('output');
            if (!compressorFile) {
                stats.style.display = 'none';
                compressedImageDataUrl = null;
                return;
            }
            stats.style.display = 'flex';
            originalSize.textContent = 'Original: ' + formatBytes(compressorFile.size);
            if (!compressorImage) {
                estimatedSize.textContent = 'Compressed: calculating...';
                return;
            }

            const quality = parseFloat(document.getElementById('quality').value);
            const canvas = document.createElement('canvas');
            canvas.width = compressorImage.naturalWidth || compressorImage.width;
            canvas.height = compressorImage.naturalHeight || compressorImage.height;
            const ctx = canvas.getContext('2d');

            const fileType = (compressorFile.type || '').toLowerCase();
            const isPng = fileType === 'image/png';
            const isWebp = fileType === 'image/webp';

            let outMime = 'image/jpeg';
            outputExt = 'jpg';

            if (isPng) {
                // If compressing PNG with high quality, or preserving alpha transparency via WebP
                if (quality >= 0.95) {
                    outMime = 'image/png';
                    outputExt = 'png';
                } else {
                    // Modern browsers lossily compress with alpha channel preservation using WebP!
                    outMime = 'image/webp';
                    outputExt = 'webp';
                }
            } else if (isWebp) {
                outMime = 'image/webp';
                outputExt = 'webp';
            } else {
                // JPEG: fill white background first to avoid any black edges
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.drawImage(compressorImage, 0, 0);
            compressedImageDataUrl = canvas.toDataURL(outMime, quality);

            const compressedBytes = Math.round(compressedImageDataUrl.length * 0.75);
            const origBytes = compressorFile.size;
            const pct = Math.max(0, Math.round((1 - compressedBytes / origBytes) * 100));

            preview.style.display = 'block';
            preview.querySelector('img').src = compressedImageDataUrl;
            estimatedSize.textContent = 'Compressed (' + outputExt.toUpperCase() + '): ' + formatBytes(compressedBytes);

            if (showResult) {
                output.innerHTML = `
                    <div class="img-result">
                        <p class="img-result-meta">
                            ${formatBytes(origBytes)} &rarr; ${formatBytes(compressedBytes)} (${pct}% smaller)
                        </p>
                        <div class="img-result-actions">
                            <a href="${compressedImageDataUrl}" download="compressed.${outputExt}" class="btn primary-btn">
                                Download ${outputExt.toUpperCase()}
                            </a>
                            <button class="btn secondary" id="chooseAnother">
                                Choose another
                            </button>
                        </div>
                    </div>
                `;
                document.getElementById('chooseAnother').addEventListener('click', resetImageCompressor);
            }
        }

        function resetImageCompressor() {
            document.getElementById('preview').style.display = 'none';
            document.getElementById('preview').querySelector('img').removeAttribute('src');
            document.getElementById('output').innerHTML = '';
            document.getElementById('qualityRow').style.display = 'none';
            document.getElementById('compressBtn').style.display = 'none';
            const inputEl = document.getElementById('imgIpt');
            inputEl.value = '';
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
            compressorFile = null;
            compressorImage = null;
            compressedImageDataUrl = null;
            renderCompressedPreview(false);
        }

        document.getElementById('imgIpt').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            compressorFile = file;
            compressorImage = null;
            compressedImageDataUrl = null;
            renderCompressedPreview(false);
            const reader = new FileReader();
            reader.onload = (ev) => {
                const p = document.getElementById('preview');
                p.style.display = 'block';
                p.querySelector('img').src = ev.target.result;
                document.getElementById('qualityRow').style.display = 'flex';
                document.getElementById('compressBtn').style.display = 'inline-flex';
                const img = new Image();
                img.onload = () => {
                    compressorImage = img;
                    renderCompressedPreview(false);
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });

        document.getElementById('quality').addEventListener('input', (e) => {
            document.getElementById('qualityVal').textContent = Math.round(e.target.value * 100) + '%';
            document.getElementById('output').innerHTML = '';
            renderCompressedPreview(false);
        });

        document.getElementById('compressBtn').addEventListener('click', () => {
            if (!compressorFile) return showToast('Please upload an image first.', 'warning');
            renderCompressedPreview(true);
        });
    }

    function renderImageResizer(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <input type="file" id="imgIpt" accept="image/*" class="search-bar">
                <div id="preview" class="mt-4" style="display:none;text-align:center;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                <div style="display:flex; justify-content:center; gap:10px; margin-bottom:1rem; align-items:center;">
                    <input type="number" id="width" placeholder="Width (px)">
                    <span style="font-size:1.5rem; color:var(--text-muted);">&times;</span>
                    <input type="number" id="height" placeholder="Height (px)">
                </div>
                <label style="display:flex; align-items:center; gap:0.5rem; justify-content:center; margin-bottom:1rem; cursor:pointer;">
                    <input type="checkbox" id="lockRatio" checked> Lock aspect ratio
                </label>
                <button class="btn primary-btn" id="resizeBtn">Resize Image</button>
                <div id="output" class="mt-4"></div>
            </div>
        `;
        let naturalW = 0, naturalH = 0;
        let sourceImage = null;
        let resizedUrl = '';
        const widthInput = document.getElementById('width');
        const heightInput = document.getElementById('height');
        const lockRatio = document.getElementById('lockRatio');
        const renderResizedPreview = (showDownload) => {
            const output = document.getElementById('output');
            if (!sourceImage) return;
            const w = parseInt(widthInput.value);
            const h = parseInt(heightInput.value);
            if (!w || !h) return;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(sourceImage, 0, 0, w, h);
            resizedUrl = canvas.toDataURL(sourceImage.dataset.type || 'image/png');
            const preview = document.getElementById('preview');
            preview.style.display = 'block';
            preview.querySelector('img').src = resizedUrl;
            output.innerHTML = showDownload ? `<a href="${resizedUrl}" download="resized.png" class="btn primary-btn mt-4">Download Resized Image</a>` : '';
        };

        document.getElementById('imgIpt').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            document.getElementById('output').innerHTML = '';
            const reader = new FileReader();
            reader.onload = (ev) => {
                const p = document.getElementById('preview');
                p.style.display = 'block';
                p.querySelector('img').src = ev.target.result;
                sourceImage = new Image();
                sourceImage.dataset.type = file.type || 'image/png';
                sourceImage.onload = () => {
                    naturalW = sourceImage.width;
                    naturalH = sourceImage.height;
                    widthInput.value = naturalW;
                    heightInput.value = naturalH;
                    renderResizedPreview(false);
                };
                sourceImage.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });

        widthInput.addEventListener('input', () => {
            if (lockRatio.checked && naturalW && naturalH) {
                heightInput.value = Math.round(parseInt(widthInput.value) * naturalH / naturalW) || '';
            }
            renderResizedPreview(false);
        });
        heightInput.addEventListener('input', () => {
            if (lockRatio.checked && naturalW && naturalH) {
                widthInput.value = Math.round(parseInt(heightInput.value) * naturalW / naturalH) || '';
            }
            renderResizedPreview(false);
        });

        document.getElementById('resizeBtn').addEventListener('click', () => {
            if (!sourceImage) return showToast('Please upload an image', "warning");
            const w = parseInt(widthInput.value);
            const h = parseInt(heightInput.value);
            if (!w || !h) return showToast('Enter valid width and height', "warning");
            renderResizedPreview(true);
        });
    }

    // 3. JPG to PNG
    function renderJpgToPng(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <input type="file" id="imgIpt" accept="image/jpeg" class="search-bar">
                <div id="preview" class="mt-4" style="display:none;text-align:center;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                <button class="btn primary-btn mt-4" id="convertBtn">Convert to PNG</button>
                <div id="output" class="mt-4"></div>
            </div>
        `;
        document.getElementById('imgIpt').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const p = document.getElementById('preview');
                p.style.display = 'block';
                p.querySelector('img').src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('convertBtn').addEventListener('click', () => {
             const file = document.getElementById('imgIpt').files[0];
            if (!file) return showToast('Please upload a JPG', "warning");
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width; canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const url = canvas.toDataURL('image/png');
                    document.getElementById('output').innerHTML = `<a href="${url}" download="converted.png" class="btn primary-btn mt-4">Download PNG</a>`;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // 4. Word Counter
    function renderWordCounter(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                    <button class="btn" id="loadSampleText" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                        Load Sample Article
                    </button>
                    <button class="btn" id="clearText" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                        Clear
                    </button>
                </div>
                <textarea id="txt" rows="8" class="search-bar" placeholder="Type or paste your text here..." style="width:100%; border-radius:0.5rem; resize:vertical; font-size:0.95rem; line-height:1.5;"></textarea>
                
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-top:1.25rem;">
                    <div class="stat-box" style="background:var(--card-bg); padding:1rem; border-radius:10px; border:1px solid var(--border-light);">
                        <div style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">WORDS</div>
                        <div id="wCount" style="font-size:1.75rem; font-weight:800; color:var(--primary); margin-top:4px;">0</div>
                    </div>
                    <div class="stat-box" style="background:var(--card-bg); padding:1rem; border-radius:10px; border:1px solid var(--border-light);">
                        <div style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">CHARACTERS</div>
                        <div id="cCount" style="font-size:1.75rem; font-weight:800; color:var(--text-color); margin-top:4px;">0</div>
                    </div>
                    <div class="stat-box" style="background:var(--card-bg); padding:1rem; border-radius:10px; border:1px solid var(--border-light);">
                        <div style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">NO SPACES</div>
                        <div id="cNoSpaces" style="font-size:1.75rem; font-weight:800; color:var(--text-color); margin-top:4px;">0</div>
                    </div>
                    <div class="stat-box" style="background:var(--card-bg); padding:1rem; border-radius:10px; border:1px solid var(--border-light);">
                        <div style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">SENTENCES</div>
                        <div id="sCount" style="font-size:1.75rem; font-weight:800; color:var(--text-color); margin-top:4px;">0</div>
                    </div>
                    <div class="stat-box" style="background:var(--card-bg); padding:1rem; border-radius:10px; border:1px solid var(--border-light);">
                        <div style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">PARAGRAPHS</div>
                        <div id="pCount" style="font-size:1.75rem; font-weight:800; color:var(--text-color); margin-top:4px;">0</div>
                    </div>
                </div>

                <div style="display:flex; justify-content:center; gap:20px; margin-top:1.25rem; flex-wrap:wrap; font-size:0.9rem; color:var(--text-muted);">
                    <span>📖 Reading Time: <strong id="readTime" style="color:var(--text-color);">0 sec</strong></span>
                    <span>🎙️ Speaking Time: <strong id="speakTime" style="color:var(--text-color);">0 sec</strong></span>
                </div>
            </div>
        `;

        const sample = "The digital era demands high-performance tools that respect user privacy. When developers and designers build modern applications, every millisecond counts. In-browser processing eliminates round-trips to remote servers, preventing sensitive document leaks and minimizing latency.\n\nWith 100ToolCrate, users enjoy instant local file operations without installation, telemetry, or recurring subscriptions. Privacy and speed go hand-in-hand.";

        function updateStats() {
            const text = document.getElementById('txt').value;
            const words = (text.trim().match(/\S+/g) || []).length;
            const chars = text.length;
            const charsNoSpace = text.replace(/\s/g, '').length;
            const sentences = (text.match(/[^.!?]+[.!?]+(\s|$)/g) || (text.trim() ? [text] : [])).length;
            const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0).length;

            document.getElementById('wCount').textContent = words;
            document.getElementById('cCount').textContent = chars;
            document.getElementById('cNoSpaces').textContent = charsNoSpace;
            document.getElementById('sCount').textContent = text.trim() ? sentences : 0;
            document.getElementById('pCount').textContent = paragraphs;

            const readMin = words / 200;
            const speakMin = words / 130;

            document.getElementById('readTime').textContent = readMin < 1 ? Math.round(readMin * 60) + ' sec' : Math.ceil(readMin) + ' min';
            document.getElementById('speakTime').textContent = speakMin < 1 ? Math.round(speakMin * 60) + ' sec' : Math.ceil(speakMin) + ' min';
        }

        document.getElementById('txt').addEventListener('input', updateStats);

        document.getElementById('loadSampleText').addEventListener('click', () => {
            document.getElementById('txt').value = sample;
            updateStats();
        });

        document.getElementById('clearText').addEventListener('click', () => {
            document.getElementById('txt').value = '';
            updateStats();
        });
    }

    // 5. QR Code Generator
    function renderQrGenerator(el) {
        el.innerHTML = `
            <div class="tool-ui text-center" style="max-width:440px; margin:0 auto;">
                <input type="text" id="qrText" placeholder="Enter text or URL here..." class="search-bar mb-3" style="width:100%;">
                
                <div style="display:flex;gap:12px;justify-content:center;margin-bottom:1rem;flex-wrap:wrap;">
                    <div>
                        <label style="font-size:0.8rem;color:var(--text-muted);font-weight:600;">Size:</label><br>
                        <select id="qrSize" class="search-bar mt-1" style="width:auto;">
                            <option value="180">Small (180px)</option>
                            <option value="256" selected>Medium (256px)</option>
                            <option value="360">Large (360px)</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size:0.8rem;color:var(--text-muted);font-weight:600;">QR Color:</label><br>
                        <input type="color" id="qrColorDark" value="#000000" style="height:38px;width:54px;border:none;border-radius:6px;cursor:pointer;margin-top:4px;">
                    </div>
                    <div>
                        <label style="font-size:0.8rem;color:var(--text-muted);font-weight:600;">Background:</label><br>
                        <input type="color" id="qrColorLight" value="#ffffff" style="height:38px;width:54px;border:none;border-radius:6px;cursor:pointer;margin-top:4px;">
                    </div>
                </div>

                <button class="btn primary-btn" id="generateQrBtn" style="width:100%;">Generate QR Code</button>
                
                <div id="qrcodeWrap" style="margin-top:1.5rem;display:none;flex-direction:column;align-items:center;">
                    <div id="qrcode" style="padding:1rem;background:#ffffff;border-radius:12px;box-shadow:var(--shadow-sm);display:inline-block;"></div>
                    <button class="btn mt-3" id="downloadQrBtn" style="background:var(--bg-subtle);color:var(--text-color);border:1px solid var(--border-light);font-size:0.85rem;">
                        Download PNG
                    </button>
                </div>
            </div>
        `;
        document.getElementById('generateQrBtn').addEventListener('click', async () => {
            const text = document.getElementById('qrText').value.trim();
            if (!text) return showToast('Please enter text or a URL to generate a QR code.', 'warning');

            try {
                await ensureLibraries(['qrcode']);
                const qrContainer = document.getElementById('qrcode');
                qrContainer.innerHTML = '';
                const size = parseInt(document.getElementById('qrSize').value, 10);
                const colorDark = document.getElementById('qrColorDark').value;
                const colorLight = document.getElementById('qrColorLight').value;

                new window.QRCode(qrContainer, {
                    text: text,
                    width: size,
                    height: size,
                    colorDark: colorDark,
                    colorLight: colorLight,
                    correctLevel: window.QRCode.CorrectLevel.H
                });

                document.getElementById('qrcodeWrap').style.display = 'flex';
                showToast('QR code generated successfully!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Failed to generate QR code: ' + err.message, 'error');
            }
        });

        document.getElementById('downloadQrBtn').addEventListener('click', () => {
            const qrCanvas = document.querySelector('#qrcode canvas');
            const qrImg = document.querySelector('#qrcode img');
            let dataUrl = '';
            if (qrCanvas) {
                dataUrl = qrCanvas.toDataURL('image/png');
            } else if (qrImg) {
                dataUrl = qrImg.src;
            }
            if (!dataUrl) return showToast('No QR code generated yet.', 'warning');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'qrcode.png';
            a.click();
        });
    }

    function renderWifiQr(el) {
        el.innerHTML = `
            <div class="tool-ui text-center" style="max-width: 400px; margin: 0 auto;">
                <input type="text" id="wifiSsid" placeholder="Network Name (SSID)" class="search-bar mb-2" style="width:100%;">
                <input type="password" id="wifiPass" placeholder="Wi-Fi Password" class="search-bar mb-2" style="width:100%;">
                <select id="wifiEnc" class="search-bar mb-3" style="width:100%;">
                    <option value="WPA">WPA / WPA2 / WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">None (Open Network)</option>
                </select>
                <button class="btn primary-btn" id="generateWifiQrBtn" style="width:100%">Generate Wi-Fi QR</button>
                <div id="qrcodeWrap" style="margin-top:1.5rem; display:none; flex-direction:column; align-items:center;">
                    <div id="qrcode-wifi" style="padding:1rem;background:#ffffff;border-radius:12px;box-shadow:var(--shadow-sm);display:inline-block;"></div>
                    <button class="btn mt-3" id="downloadWifiQrBtn" style="background:var(--bg-subtle);color:var(--text-color);border:1px solid var(--border-light);font-size:0.85rem;">
                        Download PNG
                    </button>
                </div>
            </div>
        `;
        document.getElementById('generateWifiQrBtn').addEventListener('click', async () => {
            const ssid = document.getElementById('wifiSsid').value.trim();
            const pass = document.getElementById('wifiPass').value;
            const enc = document.getElementById('wifiEnc').value;
            if (!ssid) return showToast('Network name (SSID) is required.', 'warning');

            try {
                await ensureLibraries(['qrcode']);
                const esc = s => (s || '').replace(/([\\;,:"'])/g, '\\$1');
                const format = `WIFI:T:${enc};S:${esc(ssid)};P:${esc(pass)};;`;
                const qrContainer = document.getElementById('qrcode-wifi');
                qrContainer.innerHTML = '';

                new window.QRCode(qrContainer, {
                    text: format,
                    width: 256,
                    height: 256,
                    correctLevel: window.QRCode.CorrectLevel.H
                });

                document.getElementById('qrcodeWrap').style.display = 'flex';
                showToast('Wi-Fi QR code ready! Scan with your smartphone camera to connect.', 'success');
            } catch (err) {
                console.error(err);
                showToast('Failed to generate Wi-Fi QR: ' + err.message, 'error');
            }
        });

        document.getElementById('downloadWifiQrBtn').addEventListener('click', () => {
            const cvs = document.querySelector('#qrcode-wifi canvas');
            const img = document.querySelector('#qrcode-wifi img');
            const dataUrl = cvs ? cvs.toDataURL('image/png') : (img ? img.src : '');
            if (!dataUrl) return;
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'wifi_qrcode.png';
            a.click();
        });
    }

    function renderJsonFormatter(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:10px;">
                    <div style="display:flex; gap:8px;">
                        <button class="btn" id="loadSampleJson" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Load Sample
                        </button>
                        <button class="btn" id="clearJson" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Clear
                        </button>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <label style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Indent:</label>
                        <select id="jsonIndent" class="search-bar" style="width:auto; padding:0.3rem 0.6rem; font-size:0.85rem;">
                            <option value="2" selected>2 Spaces</option>
                            <option value="4">4 Spaces</option>
                            <option value="tab">Tab</option>
                        </select>
                    </div>
                </div>
                <textarea id="jsonInput" class="search-bar" rows="8" placeholder="Paste unformatted JSON here..." style="width:100%; font-family:monospace; font-size:0.875rem;"></textarea>
                <div class="mt-4 text-center" style="display:flex; justify-content:center; gap:10px;">
                    <button class="btn primary-btn" id="formatJsonBtn">Beautify JSON</button>
                    <button class="btn" id="minifyJsonBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light);">Minify</button>
                </div>
                <div id="jsonOutputWrap" style="display:none; margin-top:1.5rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <span id="jsonStats" style="font-size:0.85rem; color:var(--text-muted);"></span>
                        <button class="btn" id="copyJsonBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Copy JSON
                        </button>
                    </div>
                    <textarea id="jsonOutput" class="search-bar" rows="12" readonly style="width:100%; font-family:monospace; font-size:0.875rem; background:var(--card-bg);"></textarea>
                </div>
            </div>
        `;

        const sample = JSON.stringify({
            app: "100ToolCrate",
            version: "2.4.0",
            features: ["Offline First", "Zero Data Leaks", "Instant Processing"],
            stats: { totalTools: 107, activeUsers: 45000, rating: 4.9 },
            settings: { theme: "dark", autoSave: true, telemetry: false }
        });

        function getIndent() {
            const val = document.getElementById('jsonIndent').value;
            return val === 'tab' ? '\t' : parseInt(val, 10);
        }

        document.getElementById('formatJsonBtn').addEventListener('click', () => {
            const raw = document.getElementById('jsonInput').value.trim();
            if (!raw) return showToast('Please enter JSON text.', 'warning');
            try {
                const parsed = JSON.parse(raw);
                const indent = getIndent();
                const formatted = JSON.stringify(parsed, null, indent);
                document.getElementById('jsonOutput').value = formatted;
                document.getElementById('jsonOutputWrap').style.display = 'block';
                const keys = typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 1;
                document.getElementById('jsonStats').textContent = `Valid JSON • ${keys} root key(s) • ${formatted.length} bytes`;
                showToast('JSON beautified successfully!', 'success');
            } catch (err) {
                showToast('Invalid JSON: ' + err.message, 'error');
            }
        });

        document.getElementById('minifyJsonBtn').addEventListener('click', () => {
            const raw = document.getElementById('jsonInput').value.trim();
            if (!raw) return showToast('Please enter JSON text.', 'warning');
            try {
                const parsed = JSON.parse(raw);
                const min = JSON.stringify(parsed);
                document.getElementById('jsonOutput').value = min;
                document.getElementById('jsonOutputWrap').style.display = 'block';
                document.getElementById('jsonStats').textContent = `Minified • ${min.length} bytes`;
                showToast('JSON minified!', 'success');
            } catch (err) {
                showToast('Invalid JSON: ' + err.message, 'error');
            }
        });

        document.getElementById('loadSampleJson').addEventListener('click', () => {
            document.getElementById('jsonInput').value = sample;
            document.getElementById('formatJsonBtn').click();
        });

        document.getElementById('clearJson').addEventListener('click', () => {
            document.getElementById('jsonInput').value = '';
            document.getElementById('jsonOutput').value = '';
            document.getElementById('jsonOutputWrap').style.display = 'none';
        });

        document.getElementById('copyJsonBtn').addEventListener('click', () => {
            const out = document.getElementById('jsonOutput').value;
            if (!out) return;
            navigator.clipboard.writeText(out).then(() => {
                showToast('JSON copied to clipboard!', 'success');
            });
        });
    }

    // 7. Percentage Calculator
    function renderPercentageCalculator(el) {
        el.innerHTML = `
            <div class="tool-ui text-center" style="max-width:560px; margin:0 auto;">
                <div style="display:flex; flex-direction:column; gap:1.25rem; text-align:left;">
                    <!-- Card 1 -->
                    <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem;">
                        <p style="font-weight:700; font-size:0.95rem; margin-bottom:0.75rem; color:var(--text-color);">What is X% of Y?</p>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <input type="number" id="p1_pct" class="search-bar" style="width:100px;" placeholder="e.g. 15" value="15">
                            <span style="font-weight:700; color:var(--text-muted);">% of</span>
                            <input type="number" id="p1_val" class="search-bar" style="width:140px;" placeholder="e.g. 250" value="250">
                            <span style="font-weight:700; color:var(--text-muted);">=</span>
                            <strong id="p1_res" style="font-size:1.25rem; color:var(--primary); min-width:60px;">37.5</strong>
                        </div>
                    </div>

                    <!-- Card 2 -->
                    <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem;">
                        <p style="font-weight:700; font-size:0.95rem; margin-bottom:0.75rem; color:var(--text-color);">X is what % of Y?</p>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <input type="number" id="p2_part" class="search-bar" style="width:120px;" placeholder="e.g. 45" value="45">
                            <span style="font-weight:700; color:var(--text-muted);">is what % of</span>
                            <input type="number" id="p2_total" class="search-bar" style="width:120px;" placeholder="e.g. 180" value="180">
                            <span style="font-weight:700; color:var(--text-muted);">=</span>
                            <strong id="p2_res" style="font-size:1.25rem; color:var(--primary); min-width:60px;">25%</strong>
                        </div>
                    </div>

                    <!-- Card 3 -->
                    <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem;">
                        <p style="font-weight:700; font-size:0.95rem; margin-bottom:0.75rem; color:var(--text-color);">Percentage Increase / Decrease</p>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <span style="font-size:0.85rem; color:var(--text-muted);">From:</span>
                            <input type="number" id="p3_v1" class="search-bar" style="width:110px;" placeholder="e.g. 100" value="100">
                            <span style="font-size:0.85rem; color:var(--text-muted);">To:</span>
                            <input type="number" id="p3_v2" class="search-bar" style="width:110px;" placeholder="e.g. 135" value="135">
                            <span style="font-weight:700; color:var(--text-muted);">=</span>
                            <strong id="p3_res" style="font-size:1.25rem; color:#10b981; min-width:80px;">+35%</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;

        function calcP1() {
            const pct = parseFloat(document.getElementById('p1_pct').value);
            const val = parseFloat(document.getElementById('p1_val').value);
            const res = document.getElementById('p1_res');
            if (isNaN(pct) || isNaN(val)) { res.textContent = '-'; return; }
            res.textContent = parseFloat(((pct / 100) * val).toFixed(4));
        }

        function calcP2() {
            const part = parseFloat(document.getElementById('p2_part').value);
            const total = parseFloat(document.getElementById('p2_total').value);
            const res = document.getElementById('p2_res');
            if (isNaN(part) || isNaN(total) || total === 0) { res.textContent = '-'; return; }
            res.textContent = parseFloat(((part / total) * 100).toFixed(2)) + '%';
        }

        function calcP3() {
            const v1 = parseFloat(document.getElementById('p3_v1').value);
            const v2 = parseFloat(document.getElementById('p3_v2').value);
            const res = document.getElementById('p3_res');
            if (isNaN(v1) || isNaN(v2) || v1 === 0) { res.textContent = '-'; return; }
            const diff = v2 - v1;
            const pct = (diff / v1) * 100;
            const sign = pct > 0 ? '+' : '';
            res.textContent = sign + parseFloat(pct.toFixed(2)) + '%';
            res.style.color = pct >= 0 ? '#10b981' : '#ef4444';
        }

        document.getElementById('p1_pct').addEventListener('input', calcP1);
        document.getElementById('p1_val').addEventListener('input', calcP1);
        document.getElementById('p2_part').addEventListener('input', calcP2);
        document.getElementById('p2_total').addEventListener('input', calcP2);
        document.getElementById('p3_v1').addEventListener('input', calcP3);
        document.getElementById('p3_v2').addEventListener('input', calcP3);

        calcP1(); calcP2(); calcP3();
    }

    // 8. Color Picker
    function renderColorPicker(el) {
        el.innerHTML = `
           <div class="tool-ui">
               <input type="file" id="imgIpt" accept="image/*" class="search-bar">
               <canvas id="c" style="max-width:100%; border:1px solid var(--border); cursor:crosshair;"></canvas>
               <div id="resultColor" style="margin-top:1rem; padding:1rem; font-weight:bold;">Hex: Click on image</div>
           </div>
        `;
        const canvas = document.getElementById('c');
        const ctx = canvas.getContext('2d');
        let loaded = false;
        document.getElementById('imgIpt').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.width; canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    loaded = true;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
        canvas.addEventListener('click', (e) => {
            if(!loaded) return;
            const rect = canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
            const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const hex = "#" + (1 << 24 | pixel[0] << 16 | pixel[1] << 8 | pixel[2]).toString(16).slice(1);
            const resEl = document.getElementById('resultColor');
            resEl.innerText = `Hex: ${hex} | RGB(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
            resEl.style.backgroundColor = hex;
            resEl.style.color = (pixel[0]*0.299 + pixel[1]*0.587 + pixel[2]*0.114) > 186 ? '#000' : '#fff';
        });
    }

    // 9. Case Converter
    function renderCaseConverter(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <textarea id="txtIn" rows="4" class="search-bar" placeholder="Type or paste your text here to transform cases instantly..." style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                
                <div id="statsRow" style="display:flex; justify-content:center; gap:16px; margin:0.75rem 0 1.25rem 0; font-size:0.85rem; color:var(--text-muted); flex-wrap:wrap;">
                    <span>Characters: <strong id="charCount" style="color:var(--text-color);">0</strong></span>
                    <span>No Spaces: <strong id="charNoSpaceCount" style="color:var(--text-color);">0</strong></span>
                    <span>Words: <strong id="wordCount" style="color:var(--text-color);">0</strong></span>
                </div>

                <div id="casesGrid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1rem; text-align:left;">
                    <div class="case-card" style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:10px; padding:0.875rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                            <span style="font-weight:700; font-size:0.85rem; color:var(--text-muted);">UPPERCASE</span>
                            <button class="btn copy-case-btn" data-target="upperCase" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.75rem; padding:0.25rem 0.6rem;">Copy</button>
                        </div>
                        <div id="upperCase" style="font-family:monospace; font-size:0.9rem; word-break:break-all; min-height:24px;"></div>
                    </div>

                    <div class="case-card" style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:10px; padding:0.875rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                            <span style="font-weight:700; font-size:0.85rem; color:var(--text-muted);">lowercase</span>
                            <button class="btn copy-case-btn" data-target="lowerCase" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.75rem; padding:0.25rem 0.6rem;">Copy</button>
                        </div>
                        <div id="lowerCase" style="font-family:monospace; font-size:0.9rem; word-break:break-all; min-height:24px;"></div>
                    </div>

                    <div class="case-card" style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:10px; padding:0.875rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                            <span style="font-weight:700; font-size:0.85rem; color:var(--text-muted);">Title Case</span>
                            <button class="btn copy-case-btn" data-target="titleCase" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.75rem; padding:0.25rem 0.6rem;">Copy</button>
                        </div>
                        <div id="titleCase" style="font-family:monospace; font-size:0.9rem; word-break:break-all; min-height:24px;"></div>
                    </div>

                    <div class="case-card" style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:10px; padding:0.875rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                            <span style="font-weight:700; font-size:0.85rem; color:var(--text-muted);">Sentence case</span>
                            <button class="btn copy-case-btn" data-target="sentenceCase" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.75rem; padding:0.25rem 0.6rem;">Copy</button>
                        </div>
                        <div id="sentenceCase" style="font-family:monospace; font-size:0.9rem; word-break:break-all; min-height:24px;"></div>
                    </div>

                    <div class="case-card" style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:10px; padding:0.875rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                            <span style="font-weight:700; font-size:0.85rem; color:var(--text-muted);">camelCase</span>
                            <button class="btn copy-case-btn" data-target="camelCase" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.75rem; padding:0.25rem 0.6rem;">Copy</button>
                        </div>
                        <div id="camelCase" style="font-family:monospace; font-size:0.9rem; word-break:break-all; min-height:24px;"></div>
                    </div>

                    <div class="case-card" style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:10px; padding:0.875rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                            <span style="font-weight:700; font-size:0.85rem; color:var(--text-muted);">snake_case</span>
                            <button class="btn copy-case-btn" data-target="snakeCase" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.75rem; padding:0.25rem 0.6rem;">Copy</button>
                        </div>
                        <div id="snakeCase" style="font-family:monospace; font-size:0.9rem; word-break:break-all; min-height:24px;"></div>
                    </div>

                    <div class="case-card" style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:10px; padding:0.875rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                            <span style="font-weight:700; font-size:0.85rem; color:var(--text-muted);">kebab-case</span>
                            <button class="btn copy-case-btn" data-target="kebabCase" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.75rem; padding:0.25rem 0.6rem;">Copy</button>
                        </div>
                        <div id="kebabCase" style="font-family:monospace; font-size:0.9rem; word-break:break-all; min-height:24px;"></div>
                    </div>

                    <div class="case-card" style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:10px; padding:0.875rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                            <span style="font-weight:700; font-size:0.85rem; color:var(--text-muted);">CONSTANT_CASE</span>
                            <button class="btn copy-case-btn" data-target="constantCase" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.75rem; padding:0.25rem 0.6rem;">Copy</button>
                        </div>
                        <div id="constantCase" style="font-family:monospace; font-size:0.9rem; word-break:break-all; min-height:24px;"></div>
                    </div>

                    <div class="case-card" style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:10px; padding:0.875rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                            <span style="font-weight:700; font-size:0.85rem; color:var(--text-muted);">PascalCase</span>
                            <button class="btn copy-case-btn" data-target="pascalCase" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.75rem; padding:0.25rem 0.6rem;">Copy</button>
                        </div>
                        <div id="pascalCase" style="font-family:monospace; font-size:0.9rem; word-break:break-all; min-height:24px;"></div>
                    </div>

                    <div class="case-card" style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:10px; padding:0.875rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                            <span style="font-weight:700; font-size:0.85rem; color:var(--text-muted);">dot.case</span>
                            <button class="btn copy-case-btn" data-target="dotCase" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.75rem; padding:0.25rem 0.6rem;">Copy</button>
                        </div>
                        <div id="dotCase" style="font-family:monospace; font-size:0.9rem; word-break:break-all; min-height:24px;"></div>
                    </div>
                </div>
            </div>
        `;

        function words(str) {
            return (str.match(/[A-Za-z0-9]+|[\u00C0-\u024F]+/g) || []);
        }

        function updateCases() {
            const raw = document.getElementById('txtIn').value;
            document.getElementById('charCount').textContent = raw.length;
            document.getElementById('charNoSpaceCount').textContent = raw.replace(/\s/g, '').length;
            const wList = words(raw);
            document.getElementById('wordCount').textContent = wList.length;

            if (!raw.trim()) {
                ['upperCase','lowerCase','titleCase','sentenceCase','camelCase','snakeCase','kebabCase','constantCase','pascalCase','dotCase'].forEach(id => {
                    document.getElementById(id).textContent = '';
                });
                return;
            }

            document.getElementById('upperCase').textContent = raw.toUpperCase();
            document.getElementById('lowerCase').textContent = raw.toLowerCase();

            // Title Case
            document.getElementById('titleCase').textContent = raw.toLowerCase().replace(/(^|\s)\w/g, m => m.toUpperCase());

            // Sentence case
            document.getElementById('sentenceCase').textContent = raw.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());

            // camelCase
            document.getElementById('camelCase').textContent = wList.map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');

            // snake_case
            document.getElementById('snakeCase').textContent = wList.map(w => w.toLowerCase()).join('_');

            // kebab-case
            document.getElementById('kebabCase').textContent = wList.map(w => w.toLowerCase()).join('-');

            // CONSTANT_CASE
            document.getElementById('constantCase').textContent = wList.map(w => w.toUpperCase()).join('_');

            // PascalCase
            document.getElementById('pascalCase').textContent = wList.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');

            // dot.case
            document.getElementById('dotCase').textContent = wList.map(w => w.toLowerCase()).join('.');
        }

        document.getElementById('txtIn').addEventListener('input', updateCases);

        document.querySelectorAll('.copy-case-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target).textContent;
                if (!target) return showToast('Please enter text first.', 'warning');
                navigator.clipboard.writeText(target).then(() => showToast('Copied to clipboard!', 'success'));
            });
        });
    }

    // 10. Password Generator
    function renderPasswordGenerator(el) {
        el.innerHTML = `
            <div class="tool-ui" style="max-width:640px; margin:0 auto;">
                <!-- Password Output Box -->
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.5rem; text-align:center;">
                    <div id="pwdOut" style="font-size:1.6rem; font-family:monospace; font-weight:700; color:var(--primary-color); word-break:break-all; padding:0.75rem 1rem; background:var(--bg-color); border:1px solid var(--border-light); border-radius:8px; margin-bottom:1rem; min-height:3.5rem; display:flex; align-items:center; justify-content:center;">
                        ...
                    </div>
                    
                    <!-- Strength Meter -->
                    <div style="margin-bottom:1.25rem; text-align:left;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem; font-size:0.85rem;">
                            <span style="font-weight:600; color:var(--text-muted);">Password Strength:</span>
                            <span id="pwdStrengthLabel" style="font-weight:700; font-size:0.85rem;">Evaluating...</span>
                        </div>
                        <div style="height:8px; width:100%; background:var(--bg-subtle); border-radius:4px; overflow:hidden;">
                            <div id="pwdStrengthBar" style="height:100%; width:0%; transition:width 0.3s ease, background-color 0.3s ease; border-radius:4px;"></div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                        <button class="btn primary-btn" id="genPwdBtn" style="padding:0.5rem 1.25rem;">
                            Generate Password
                        </button>
                        <button class="btn" id="copyPwdBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.9rem; padding:0.5rem 1.25rem;">
                            Copy Password
                        </button>
                    </div>
                </div>

                <!-- Controls & Options Card -->
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm);">
                    <!-- Length Slider -->
                    <div style="margin-bottom:1.25rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                            <label for="pwdLengthRange" style="font-weight:600; font-size:0.9rem;">Password Length:</label>
                            <span id="pwdLengthVal" style="font-weight:700; font-size:1.1rem; color:var(--primary-color); font-family:monospace; background:var(--bg-subtle); padding:0.2rem 0.6rem; border-radius:6px;">16</span>
                        </div>
                        <input type="range" id="pwdLengthRange" min="6" max="64" value="16" style="width:100%; cursor:pointer; accent-color:var(--primary-color);">
                    </div>

                    <!-- Character Set Toggles -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <label style="display:inline-flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                            <input type="checkbox" id="pwdUpper" checked style="cursor:pointer; accent-color:var(--primary-color);">
                            <span>Uppercase (A-Z)</span>
                        </label>
                        <label style="display:inline-flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                            <input type="checkbox" id="pwdLower" checked style="cursor:pointer; accent-color:var(--primary-color);">
                            <span>Lowercase (a-z)</span>
                        </label>
                        <label style="display:inline-flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                            <input type="checkbox" id="pwdNum" checked style="cursor:pointer; accent-color:var(--primary-color);">
                            <span>Numbers (0-9)</span>
                        </label>
                        <label style="display:inline-flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                            <input type="checkbox" id="pwdSym" checked style="cursor:pointer; accent-color:var(--primary-color);">
                            <span>Symbols (!@#$%)</span>
                        </label>
                    </div>
                </div>
            </div>
        `;

        const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const LOWER = 'abcdefghijklmnopqrstuvwxyz';
        const NUM = '0123456789';
        const SYM = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        function evaluateStrength(pwd, poolSize) {
            const len = pwd.length;
            const entropy = poolSize > 0 ? Math.round(len * Math.log2(poolSize)) : 0;
            const bar = document.getElementById('pwdStrengthBar');
            const label = document.getElementById('pwdStrengthLabel');

            if (entropy < 40) {
                bar.style.width = '25%';
                bar.style.backgroundColor = '#ef4444';
                label.textContent = `Weak (${entropy} bits)`;
                label.style.color = '#ef4444';
            } else if (entropy < 65) {
                bar.style.width = '50%';
                bar.style.backgroundColor = '#f59e0b';
                label.textContent = `Fair (${entropy} bits)`;
                label.style.color = '#f59e0b';
            } else if (entropy < 85) {
                bar.style.width = '75%';
                bar.style.backgroundColor = '#10b981';
                label.textContent = `Strong (${entropy} bits)`;
                label.style.color = '#10b981';
            } else {
                bar.style.width = '100%';
                bar.style.backgroundColor = '#059669';
                label.textContent = `Very Strong (${entropy} bits)`;
                label.style.color = '#059669';
            }
        }

        function generatePassword() {
            const len = parseInt(document.getElementById('pwdLengthRange').value, 10) || 16;
            const hasUpper = document.getElementById('pwdUpper').checked;
            const hasLower = document.getElementById('pwdLower').checked;
            const hasNum = document.getElementById('pwdNum').checked;
            const hasSym = document.getElementById('pwdSym').checked;

            let charPool = '';
            const requiredChars = [];
            let poolSize = 0;

            if (hasUpper) { charPool += UPPER; poolSize += UPPER.length; requiredChars.push(UPPER[cryptoGetRandomInt(UPPER.length)]); }
            if (hasLower) { charPool += LOWER; poolSize += LOWER.length; requiredChars.push(LOWER[cryptoGetRandomInt(LOWER.length)]); }
            if (hasNum) { charPool += NUM; poolSize += NUM.length; requiredChars.push(NUM[cryptoGetRandomInt(NUM.length)]); }
            if (hasSym) { charPool += SYM; poolSize += SYM.length; requiredChars.push(SYM[cryptoGetRandomInt(SYM.length)]); }

            if (!charPool) {
                document.getElementById('pwdUpper').checked = true;
                return generatePassword();
            }

            const pwdArr = [...requiredChars];
            while (pwdArr.length < len) {
                pwdArr.push(charPool[cryptoGetRandomInt(charPool.length)]);
            }

            // Fisher-Yates cryptographically secure shuffle
            for (let i = pwdArr.length - 1; i > 0; i--) {
                const j = cryptoGetRandomInt(i + 1);
                const temp = pwdArr[i];
                pwdArr[i] = pwdArr[j];
                pwdArr[j] = temp;
            }

            const finalPwd = pwdArr.join('');
            document.getElementById('pwdOut').textContent = finalPwd;
            evaluateStrength(finalPwd, poolSize);
        }

        function cryptoGetRandomInt(max) {
            if (!Number.isInteger(max) || max <= 0) return 0;
            const arr = new Uint32Array(1);
            // Rejection sampling to avoid modulo bias
            const limit = Math.floor(0x100000000 / max) * max;
            do {
                crypto.getRandomValues(arr);
            } while (arr[0] >= limit);
            return arr[0] % max;
        }

        document.getElementById('pwdLengthRange').addEventListener('input', (e) => {
            document.getElementById('pwdLengthVal').textContent = e.target.value;
            generatePassword();
        });

        ['pwdUpper', 'pwdLower', 'pwdNum', 'pwdSym'].forEach(id => {
            document.getElementById(id).addEventListener('change', generatePassword);
        });

        document.getElementById('genPwdBtn').addEventListener('click', generatePassword);

        document.getElementById('copyPwdBtn').addEventListener('click', () => {
            const pwd = document.getElementById('pwdOut').textContent.trim();
            if (!pwd || pwd === '...') return;
            navigator.clipboard.writeText(pwd).then(() => {
                showToast('Password copied to clipboard!', 'success');
            });
        });

        generatePassword();
    }

    // 11. Text to PDF
    function renderTextToPdf(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <textarea id="pdfTextInput" class="search-bar" rows="10" placeholder="Enter or paste text to convert to PDF..." style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                <div class="mt-4" style="display:flex; justify-content:center; gap: 10px;">
                     <button class="btn primary-btn" id="generatePdfBtn">Convert to PDF</button>
                </div>
                <div id="pdfDownloadLink" class="mt-4"></div>
            </div>
        `;
        document.getElementById('generatePdfBtn').addEventListener('click', async () => {
            const text = document.getElementById('pdfTextInput').value;
            if (!text.trim()) return showToast('Please enter some text to convert to PDF.', 'warning');

            const btn = document.getElementById('generatePdfBtn');
            btn.disabled = true;
            btn.textContent = 'Generating PDF...';

            try {
                await ensureLibraries(['pdfLib']);
                const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
                const pdfDoc = await PDFDocument.create();
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const fontSize = 11;
                const margin = 50;
                const lineHeight = 16;

                let page = pdfDoc.addPage();
                const { width, height } = page.getSize();
                let cursorY = height - margin;

                const textLines = text.split('\n');
                for (const paragraph of textLines) {
                     const words = paragraph.split(' ');
                     let line = '';
                     for (const word of words) {
                          const testLine = line ? (line + ' ' + word) : word;
                          const w = font.widthOfTextAtSize(testLine, fontSize);
                          if (w > width - margin * 2) {
                               page.drawText(line, { x: margin, y: cursorY, size: fontSize, font: font, color: rgb(0.1, 0.1, 0.1) });
                               cursorY -= lineHeight;
                               line = word;
                               if (cursorY < margin) {
                                    page = pdfDoc.addPage();
                                    cursorY = height - margin;
                               }
                          } else {
                               line = testLine;
                          }
                     }
                     if (line.length > 0 || paragraph === '') {
                         if (line.length > 0) {
                             page.drawText(line, { x: margin, y: cursorY, size: fontSize, font: font, color: rgb(0.1, 0.1, 0.1) });
                         }
                         cursorY -= lineHeight;
                         if (cursorY < margin) {
                              page = pdfDoc.addPage();
                              cursorY = height - margin;
                         }
                     }
                }

                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);

                document.getElementById('pdfDownloadLink').innerHTML = `
                    <div class="pdf-page-count" style="display:block;margin-bottom:0.75rem;"><div class="pdf-page-count-total">Total Pages: ${pdfDoc.getPageCount()}</div></div>
                    <a href="${url}" download="document.pdf" class="btn primary-btn" style="background:#10b981; border-color:#10b981;">Download PDF</a>
                `;
                showToast('PDF generated successfully!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Error generating PDF: ' + (err.message || 'Unknown error'), 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Convert to PDF';
            }
        });
    }

    function renderCharacterCounter(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <textarea id="txt" rows="6" class="search-bar" placeholder="Paste your text here..." style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                <div style="display:flex; justify-content:space-around; margin-top:1rem; font-weight:bold; background:var(--card-bg); padding:1rem; border-radius:0.5rem;">
                    <div>Characters (with spaces): <span id="cCount1">0</span></div>
                    <div>Characters (without spaces): <span id="cCount2">0</span></div>
                </div>
            </div>
        `;
        document.getElementById('txt').addEventListener('input', (e) => {
            const val = e.target.value;
            document.getElementById('cCount1').textContent = val.length;
            document.getElementById('cCount2').textContent = val.replace(/\s+/g, '').length;
        });
    }

    function renderSentenceCounter(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <textarea id="txt" rows="6" class="search-bar" placeholder="Paste your text here..." style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                <div style="text-align:center; margin-top:1rem; font-weight:bold; background:var(--card-bg); padding:1rem; border-radius:0.5rem;">
                    Sentences: <span id="sCount">0</span>
                </div>
            </div>
        `;
        document.getElementById('txt').addEventListener('input', (e) => {
            const val = e.target.value.trim();
            const sentences = val ? val.split(/[.!?]+/).filter(Boolean).length : 0;
            document.getElementById('sCount').textContent = sentences;
        });
    }

    function renderParagraphCounter(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <textarea id="txt" rows="6" class="search-bar" placeholder="Paste your text here..." style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                <div style="text-align:center; margin-top:1rem; font-weight:bold; background:var(--card-bg); padding:1rem; border-radius:0.5rem;">
                    Paragraphs: <span id="pCount">0</span>
                </div>
            </div>
        `;
        document.getElementById('txt').addEventListener('input', (e) => {
            const val = e.target.value.trim();
            const paragraphs = val ? val.split(/\n+/).filter(Boolean).length : 0;
            document.getElementById('pCount').textContent = paragraphs;
        });
    }

    function renderRemoveExtraSpaces(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <textarea id="txtIn" rows="5" class="search-bar" placeholder="Paste text with extra spaces..." style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                <div class="mt-4 text-center">
                    <button class="btn primary-btn" id="actionBtn">Remove Extra Spaces</button>
                </div>
                <textarea id="txtOut" rows="5" class="search-bar mt-4" placeholder="Result..." readonly style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', () => {
             const val = document.getElementById('txtIn').value;
             document.getElementById('txtOut').value = val.replace(/\s+/g, ' ').trim();
        });
    }

    function renderRemoveDuplicateLines(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <textarea id="txtIn" rows="5" class="search-bar" placeholder="Paste text here..." style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                <div class="mt-4 text-center">
                    <button class="btn primary-btn" id="actionBtn">Remove Duplicates</button>
                </div>
                <textarea id="txtOut" rows="5" class="search-bar mt-4" placeholder="Result..." readonly style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', () => {
             const val = document.getElementById('txtIn').value;
             const lines = val.split('\n');
             const unique = [...new Set(lines)];
             document.getElementById('txtOut').value = unique.join('\n');
        });
    }

    function renderSortLines(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <textarea id="txtIn" rows="5" class="search-bar" placeholder="Paste text lines here..." style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                <div class="mt-4" style="display:flex; justify-content:center; gap: 10px;">
                    <button class="btn primary-btn" id="sortAzBtn">A-Z</button>
                    <button class="btn primary-btn" id="sortZaBtn">Z-A</button>
                </div>
                <textarea id="txtOut" rows="5" class="search-bar mt-4" placeholder="Result..." readonly style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
            </div>
        `;
        document.getElementById('sortAzBtn').addEventListener('click', () => {
             const lines = document.getElementById('txtIn').value.split('\n');
             document.getElementById('txtOut').value = lines.sort().join('\n');
        });
        document.getElementById('sortZaBtn').addEventListener('click', () => {
             const lines = document.getElementById('txtIn').value.split('\n');
             document.getElementById('txtOut').value = lines.sort().reverse().join('\n');
        });
    }

    function renderReverseText(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <textarea id="txtIn" rows="5" class="search-bar" placeholder="Paste text here..." style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                <div class="mt-4" style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
                    <button class="btn primary-btn" id="actionBtn">Reverse String</button>
                    <button class="btn" id="revWordsBtn" style="background:var(--card-bg); border:1px solid var(--border); color:var(--text-color);">Reverse Words</button>
                    <button class="btn" id="revLinesBtn" style="background:var(--card-bg); border:1px solid var(--border); color:var(--text-color);">Reverse Lines</button>
                </div>
                <textarea id="txtOut" rows="5" class="search-bar mt-4" placeholder="Result..." readonly style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                <div class="mt-3 text-center">
                    <button class="btn" id="copyRevBtn" style="background:var(--card-bg); border:1px solid var(--border); color:var(--text-color);">Copy Result</button>
                </div>
            </div>
        `;

        function reverseGraphemes(str) {
            if (typeof Intl !== 'undefined' && Intl.Segmenter) {
                const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
                return Array.from(segmenter.segment(str), s => s.segment).reverse().join('');
            }
            return Array.from(str).reverse().join('');
        }

        const txtIn = document.getElementById('txtIn');
        const txtOut = document.getElementById('txtOut');

        document.getElementById('actionBtn').addEventListener('click', () => {
            txtOut.value = reverseGraphemes(txtIn.value);
        });

        document.getElementById('revWordsBtn').addEventListener('click', () => {
            const val = txtIn.value;
            const lines = val.split('\n');
            const reversedLines = lines.map(line => {
                const parts = line.split(/(\s+)/);
                return parts.filter(Boolean).reverse().join('');
            });
            txtOut.value = reversedLines.join('\n');
        });

        document.getElementById('revLinesBtn').addEventListener('click', () => {
            txtOut.value = txtIn.value.split('\n').reverse().join('\n');
        });

        document.getElementById('copyRevBtn').addEventListener('click', () => {
            const val = txtOut.value;
            if (!val) {
                showToast("No text to copy", "info");
                return;
            }
            navigator.clipboard.writeText(val).then(() => {
                const b = document.getElementById('copyRevBtn');
                b.textContent = 'Copied!';
                showToast("Copied to clipboard!", "success");
                setTimeout(() => b.textContent = 'Copy Result', 1500);
            });
        });
    }

    function renderJsonValidator(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:10px;">
                    <div style="display:flex; gap:8px;">
                        <button class="btn" id="loadValid" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Load Valid Sample
                        </button>
                        <button class="btn" id="loadInvalid" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Load Invalid Sample
                        </button>
                    </div>
                    <button class="btn" id="clearVal" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                        Clear
                    </button>
                </div>
                <textarea id="tIn" class="search-bar" style="width:100%; font-family:monospace; font-size:0.875rem;" rows="8" placeholder="Paste JSON here to validate syntax..."></textarea>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Validate JSON Syntax</button>
                </div>
                <div id="res" class="mt-4" style="display:none; text-align:left;"></div>
            </div>
        `;

        function locateError(jsonStr, errMessage) {
            // Check for position in error message: "at position 42"
            const posMatch = errMessage.match(/position\s+(\d+)/i);
            if (posMatch) {
                const pos = parseInt(posMatch[1], 10);
                const lines = jsonStr.slice(0, pos).split('\n');
                const line = lines.length;
                const col = lines[lines.length - 1].length + 1;
                return { line, col, pos };
            }
            // Check for line / col in error message: "line 4 column 5"
            const lineColMatch = errMessage.match(/line\s+(\d+)\s+column\s+(\d+)/i);
            if (lineColMatch) {
                return { line: parseInt(lineColMatch[1], 10), col: parseInt(lineColMatch[2], 10) };
            }
            return null;
        }

        document.getElementById('actionBtn').addEventListener('click', () => {
            const val = document.getElementById('tIn').value.trim();
            const res = document.getElementById('res');
            res.style.display = 'block';

            if (!val) {
                res.innerHTML = '<div style="padding:1rem;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);border-radius:10px;color:var(--text-color);"><strong style="color:#f59e0b;">Warning:</strong> Input is empty. Please paste JSON content.</div>';
                return;
            }

            try {
                const parsed = JSON.parse(val);
                const keys = typeof parsed === 'object' && parsed !== null ? (Array.isArray(parsed) ? parsed.length + ' array items' : Object.keys(parsed).length + ' root keys') : 'Primitive value';
                res.innerHTML = `
                    <div style="padding:1rem 1.25rem; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:12px; color:var(--text-color);">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <svg style="width:20px;height:20px;color:#10b981;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                            <strong style="color:#10b981;font-size:1.05rem;">Valid JSON Document</strong>
                        </div>
                        <p style="margin-top:0.5rem;font-size:0.875rem;color:var(--text-muted);">Structure: ${keys} • Size: ${val.length} bytes</p>
                    </div>
                `;
                showToast('JSON is valid!', 'success');
            } catch (e) {
                const loc = locateError(val, e.message);
                let locText = loc ? `Line ${loc.line}, Column ${loc.col}` : 'Position undetermined';
                res.innerHTML = `
                    <div style="padding:1.25rem; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.35); border-radius:12px; color:var(--text-color);">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <svg style="width:20px;height:20px;color:#ef4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <strong style="color:#ef4444;font-size:1.05rem;">Syntax Error: ${escapeHtml(locText)}</strong>
                        </div>
                        <p style="margin-top:0.5rem;font-size:0.9rem;font-family:monospace;background:var(--bg-color);padding:0.5rem 0.75rem;border-radius:6px;border:1px solid var(--border-light);">
                            ${escapeHtml(e.message)}
                        </p>
                    </div>
                `;
                showToast('JSON Syntax Error at ' + locText, 'error');
            }
        });

        document.getElementById('loadValid').addEventListener('click', () => {
            document.getElementById('tIn').value = '{\n  "status": "success",\n  "code": 200,\n  "data": {\n    "id": 101,\n    "name": "Production Server",\n    "tags": ["web", "edge"]\n  }\n}';
            document.getElementById('actionBtn').click();
        });

        document.getElementById('loadInvalid').addEventListener('click', () => {
            document.getElementById('tIn').value = '{\n  "status": "error",\n  "code": 500,\n  "data": {\n    "id": 101,\n    "trailingComma": true,\n  }\n}';
            document.getElementById('actionBtn').click();
        });

        document.getElementById('clearVal').addEventListener('click', () => {
            document.getElementById('tIn').value = '';
            document.getElementById('res').style.display = 'none';
        });
    }

    function renderJsonMinifier(el) {
         el.innerHTML = `
            <div class="tool-ui">
                <textarea id="jsonInput" class="search-bar" rows="6" placeholder="Paste JSON here..." style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                <div class="mt-4 text-center">
                    <button class="btn primary-btn" id="actionBtn">Minify JSON</button>
                </div>
                <textarea id="jsonOutput" class="search-bar mt-4" rows="6" placeholder="Result..." readonly style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', () => {
            try {
                const parsed = JSON.parse(document.getElementById('jsonInput').value);
                document.getElementById('jsonOutput').value = JSON.stringify(parsed);
            } catch (err) {
                showToast('Invalid JSON', "warning");
            }
        });
    }

    function renderBase64Encoder(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <textarea id="txtIn" rows="5" class="search-bar" placeholder="Paste text here..." style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                <div class="mt-4" style="display:flex; justify-content:center; gap: 10px;">
                    <button class="btn primary-btn" id="encBtn">Encode</button>
                    <button class="btn primary-btn" id="decBtn">Decode</button>
                </div>
                <textarea id="txtOut" rows="5" class="search-bar mt-4" placeholder="Result..." readonly style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
            </div>
        `;
        document.getElementById('encBtn').addEventListener('click', () => {
            try {
                const bytes = new TextEncoder().encode(document.getElementById('txtIn').value);
                const binary = Array.from(bytes, b => String.fromCharCode(b)).join('');
                document.getElementById('txtOut').value = btoa(binary);
            } catch(e) { document.getElementById('txtOut').value = 'Encoding error'; }
        });
        document.getElementById('decBtn').addEventListener('click', () => {
            try {
                const decoded = atob(document.getElementById('txtIn').value);
                document.getElementById('txtOut').value = new TextDecoder().decode(Uint8Array.from(decoded, c => c.charCodeAt(0)));
            } catch(e) { document.getElementById('txtOut').value = 'Decoding error: the input is not valid Base64 (or is not UTF-8 after decoding).'; }
        });
    }

    function renderUrlEncoder(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <textarea id="txtIn" rows="5" class="search-bar" placeholder="Paste URL or text here..." style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                <div class="mt-4" style="display:flex; justify-content:center; gap: 10px;">
                    <button class="btn primary-btn" id="encBtn">Encode</button>
                    <button class="btn primary-btn" id="decBtn">Decode</button>
                </div>
                <textarea id="txtOut" rows="5" class="search-bar mt-4" placeholder="Result..." readonly style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                <div class="mt-3 text-center">
                    <button class="btn" id="copyUrlBtn" style="background:var(--card-bg);border:1px solid var(--border);color:var(--text-color);">Copy Result</button>
                </div>
            </div>
        `;
        document.getElementById('encBtn').addEventListener('click', () => {
             document.getElementById('txtOut').value = encodeURIComponent(document.getElementById('txtIn').value);
        });
        document.getElementById('decBtn').addEventListener('click', () => {
             try {
                document.getElementById('txtOut').value = decodeURIComponent(document.getElementById('txtIn').value);
             } catch(e) {
                console.error('URI malformed decode error:', e);
                showToast("URI malformed: check for standalone '%' or invalid escape sequences.", "warning");
             }
        });
        document.getElementById('copyUrlBtn').addEventListener('click', () => {
             const v = document.getElementById('txtOut').value;
             if (!v) return showToast("No text to copy", "info");
             navigator.clipboard.writeText(v).then(() => {
                 const b = document.getElementById('copyUrlBtn');
                 b.textContent = 'Copied!';
                 showToast("Copied to clipboard!", "success");
                 setTimeout(() => b.textContent = 'Copy Result', 1500);
             });
        });
    }

    function renderHtmlEntityEncoder(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <textarea id="txtIn" rows="5" class="search-bar" placeholder="Paste HTML or text here..." style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                <div class="mt-4" style="display:flex; justify-content:center; gap: 10px;">
                    <button class="btn primary-btn" id="encBtn">Encode Entities</button>
                    <button class="btn primary-btn" id="decBtn">Decode Entities</button>
                </div>
                <textarea id="txtOut" rows="5" class="search-bar mt-4" placeholder="Result..." readonly style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
            </div>
        `;
        document.getElementById('encBtn').addEventListener('click', () => {
             const val = document.getElementById('txtIn').value;
             document.getElementById('txtOut').value = val.replace(/[\u00A0-\u9999<>\&]/g, function(i) {
                 return '&#'+i.charCodeAt(0)+';';
             });
        });
        document.getElementById('decBtn').addEventListener('click', () => {
             const val = document.getElementById('txtIn').value;
             // DOMParser documents are inert: scripts don't run, events don't fire.
             const doc = new DOMParser().parseFromString(val, 'text/html');
             document.getElementById('txtOut').value = doc.documentElement.textContent;
        });
    }

    function md5(str) {
        function safeAdd(x, y) {
            const lsw = (x & 0xffff) + (y & 0xffff);
            const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xffff);
        }
        function bitRol(num, cnt) {
            return (num << cnt) | (num >>> (32 - cnt));
        }
        function md5cmn(q, a, b, x, s, t) {
            return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
        }
        function md5ff(a, b, c, d, x, s, t) {
            return md5cmn((b & c) | (~b & d), a, b, x, s, t);
        }
        function md5gg(a, b, c, d, x, s, t) {
            return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
        }
        function md5hh(a, b, c, d, x, s, t) {
            return md5cmn(b ^ c ^ d, a, b, x, s, t);
        }
        function md5ii(a, b, c, d, x, s, t) {
            return md5cmn(c ^ (b | ~d), a, b, x, s, t);
        }

        const utf8Bytes = new TextEncoder().encode(str);
        const nWords = (((utf8Bytes.length + 8) >>> 6) + 1) * 16;
        const words = new Int32Array(nWords);
        for (let i = 0; i < utf8Bytes.length; i++) {
            words[i >>> 2] |= utf8Bytes[i] << ((i % 4) * 8);
        }
        words[utf8Bytes.length >>> 2] |= 0x80 << ((utf8Bytes.length % 4) * 8);
        const bitLen = utf8Bytes.length * 8;
        words[nWords - 2] = bitLen & 0xffffffff;
        words[nWords - 1] = Math.floor(bitLen / 0x100000000);

        let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;

        for (let i = 0; i < nWords; i += 16) {
            const olda = a, oldb = b, oldc = c, oldd = d;
            a = md5ff(a, b, c, d, words[i], 7, -680876936);
            d = md5ff(d, a, b, c, words[i + 1], 12, -389564586);
            c = md5ff(c, d, a, b, words[i + 2], 17, 606105819);
            b = md5ff(b, c, d, a, words[i + 3], 22, -1044525330);
            a = md5ff(a, b, c, d, words[i + 4], 7, -176418897);
            d = md5ff(d, a, b, c, words[i + 5], 12, 1200080426);
            c = md5ff(c, d, a, b, words[i + 6], 17, -1473231341);
            b = md5ff(b, c, d, a, words[i + 7], 22, -45705983);
            a = md5ff(a, b, c, d, words[i + 8], 7, 1770035416);
            d = md5ff(d, a, b, c, words[i + 9], 12, -1958414417);
            c = md5ff(c, d, a, b, words[i + 10], 17, -42063);
            b = md5ff(b, c, d, a, words[i + 11], 22, -1990404162);
            a = md5ff(a, b, c, d, words[i + 12], 7, 1804603682);
            d = md5ff(d, a, b, c, words[i + 13], 12, -40341101);
            c = md5ff(c, d, a, b, words[i + 14], 17, -1502002290);
            b = md5ff(b, c, d, a, words[i + 15], 22, 1236535329);

            a = md5gg(a, b, c, d, words[i + 1], 5, -165796510);
            d = md5gg(d, a, b, c, words[i + 6], 9, -1069501632);
            c = md5gg(c, d, a, b, words[i + 11], 14, 643717713);
            b = md5gg(b, c, d, a, words[i], 20, -373897302);
            a = md5gg(a, b, c, d, words[i + 5], 5, -701558691);
            d = md5gg(d, a, b, c, words[i + 10], 9, 38016083);
            c = md5gg(c, d, a, b, words[i + 15], 14, -660478335);
            b = md5gg(b, c, d, a, words[i + 4], 20, -405537848);
            a = md5gg(a, b, c, d, words[i + 9], 5, 568446438);
            d = md5gg(d, a, b, c, words[i + 14], 9, -1019803690);
            c = md5gg(c, d, a, b, words[i + 3], 14, -187363961);
            b = md5gg(b, c, d, a, words[i + 8], 20, 1163531501);
            a = md5gg(a, b, c, d, words[i + 13], 5, -1444681467);
            d = md5gg(d, a, b, c, words[i + 2], 9, -51403784);
            c = md5gg(c, d, a, b, words[i + 7], 14, 1735328473);
            b = md5gg(b, c, d, a, words[i + 12], 20, -1926607734);

            a = md5hh(a, b, c, d, words[i + 5], 4, -378558);
            d = md5hh(d, a, b, c, words[i + 8], 11, -2022574463);
            c = md5hh(c, d, a, b, words[i + 11], 16, 1839030562);
            b = md5hh(b, c, d, a, words[i + 14], 23, -35309556);
            a = md5hh(a, b, c, d, words[i + 1], 4, -1530992060);
            d = md5hh(d, a, b, c, words[i + 4], 11, 1272893353);
            c = md5hh(c, d, a, b, words[i + 7], 16, -155497632);
            b = md5hh(b, c, d, a, words[i + 10], 23, -1094730640);
            a = md5hh(a, b, c, d, words[i + 13], 4, 681279174);
            d = md5hh(d, a, b, c, words[i], 11, -358537222);
            c = md5hh(c, d, a, b, words[i + 3], 16, -722521979);
            b = md5hh(b, c, d, a, words[i + 6], 23, 76029189);
            a = md5hh(a, b, c, d, words[i + 9], 4, -640364487);
            d = md5hh(d, a, b, c, words[i + 12], 11, -421815835);
            c = md5hh(c, d, a, b, words[i + 15], 16, 530742520);
            b = md5hh(b, c, d, a, words[i + 2], 23, -995338651);

            a = md5ii(a, b, c, d, words[i], 6, -198630844);
            d = md5ii(d, a, b, c, words[i + 7], 10, 1126891415);
            c = md5ii(c, d, a, b, words[i + 14], 15, -1416354905);
            b = md5ii(b, c, d, a, words[i + 5], 21, -57434055);
            a = md5ii(a, b, c, d, words[i + 12], 6, 1700485571);
            d = md5ii(d, a, b, c, words[i + 3], 10, -1894986606);
            c = md5ii(c, d, a, b, words[i + 10], 15, -1051523);
            b = md5ii(b, c, d, a, words[i + 1], 21, -2054922799);
            a = md5ii(a, b, c, d, words[i + 8], 6, 1873313359);
            d = md5ii(d, a, b, c, words[i + 15], 10, -30611744);
            c = md5ii(c, d, a, b, words[i + 6], 15, -1560198380);
            b = md5ii(b, c, d, a, words[i + 13], 21, 1309151649);
            a = md5ii(a, b, c, d, words[i + 4], 6, -145523070);
            d = md5ii(d, a, b, c, words[i + 11], 10, -1120210379);
            c = md5ii(c, d, a, b, words[i + 2], 15, 718787259);
            b = md5ii(b, c, d, a, words[i + 9], 21, -343485551);

            a = safeAdd(a, olda);
            b = safeAdd(b, oldb);
            c = safeAdd(c, oldc);
            d = safeAdd(d, oldd);
        }

        return [a, b, c, d].map(val => {
            let h = '';
            for (let i = 0; i < 4; i++) {
                h += ((val >> (i * 8)) & 0xff).toString(16).padStart(2, '0');
            }
            return h;
        }).join('');
    }

    async function sha512(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-512', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async function sha1(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    function renderHashGenerator(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                    <label style="font-weight:600; font-size:0.95rem;">Input Text / Data:</label>
                    <div style="display:flex; gap:8px;">
                        <button class="btn" id="loadSampleHashBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.35rem 0.75rem;">Sample</button>
                        <button class="btn" id="clearHashBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.35rem 0.75rem;">Clear</button>
                    </div>
                </div>
                <textarea id="hashInput" rows="4" class="search-bar" placeholder="Type or paste any text to calculate MD5, SHA-1, SHA-256, and SHA-512 hashes in parallel..." style="width:100%; border-radius:0.5rem; resize:vertical; font-family:monospace;"></textarea>
                
                <div style="margin-top:1.5rem; display:flex; flex-direction:column; gap:1rem;">
                    <!-- MD5 -->
                    <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:8px; padding:1rem; box-shadow:var(--shadow-sm);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                            <span style="font-weight:700; font-size:0.85rem; color:var(--primary-color); letter-spacing:0.5px;">MD5 (RFC 1321 &bull; 128-bit)</span>
                            <button class="btn copy-hash-btn" data-target="outMd5" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.3rem 0.7rem; border-radius:6px; cursor:pointer;">
                                Copy MD5
                            </button>
                        </div>
                        <input type="text" id="outMd5" class="search-bar" readonly placeholder="Waiting for input..." style="width:100%; font-family:monospace; font-size:0.85rem; background:var(--bg-color);">
                    </div>

                    <!-- SHA-1 -->
                    <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:8px; padding:1rem; box-shadow:var(--shadow-sm);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                            <span style="font-weight:700; font-size:0.85rem; color:var(--primary-color); letter-spacing:0.5px;">SHA-1 (160-bit)</span>
                            <button class="btn copy-hash-btn" data-target="outSha1" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.3rem 0.7rem; border-radius:6px; cursor:pointer;">
                                Copy SHA-1
                            </button>
                        </div>
                        <input type="text" id="outSha1" class="search-bar" readonly placeholder="Waiting for input..." style="width:100%; font-family:monospace; font-size:0.85rem; background:var(--bg-color);">
                    </div>

                    <!-- SHA-256 -->
                    <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:8px; padding:1rem; box-shadow:var(--shadow-sm);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                            <span style="font-weight:700; font-size:0.85rem; color:var(--primary-color); letter-spacing:0.5px;">SHA-256 (256-bit)</span>
                            <button class="btn copy-hash-btn" data-target="outSha256" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.3rem 0.7rem; border-radius:6px; cursor:pointer;">
                                Copy SHA-256
                            </button>
                        </div>
                        <input type="text" id="outSha256" class="search-bar" readonly placeholder="Waiting for input..." style="width:100%; font-family:monospace; font-size:0.85rem; background:var(--bg-color);">
                    </div>

                    <!-- SHA-512 -->
                    <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:8px; padding:1rem; box-shadow:var(--shadow-sm);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                            <span style="font-weight:700; font-size:0.85rem; color:var(--primary-color); letter-spacing:0.5px;">SHA-512 (512-bit)</span>
                            <button class="btn copy-hash-btn" data-target="outSha512" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.3rem 0.7rem; border-radius:6px; cursor:pointer;">
                                Copy SHA-512
                            </button>
                        </div>
                        <input type="text" id="outSha512" class="search-bar" readonly placeholder="Waiting for input..." style="width:100%; font-family:monospace; font-size:0.85rem; background:var(--bg-color);">
                    </div>
                </div>
            </div>
        `;

        let computeNonce = 0;
        async function computeAllHashes() {
            const currentNonce = ++computeNonce;
            const text = document.getElementById('hashInput').value;
            if (!text) {
                document.getElementById('outMd5').value = '';
                document.getElementById('outSha1').value = '';
                document.getElementById('outSha256').value = '';
                document.getElementById('outSha512').value = '';
                return;
            }

            try {
                const [hMd5, hSha1, hSha256, hSha512] = await Promise.all([
                    Promise.resolve(md5(text)),
                    sha1(text),
                    sha256(text),
                    sha512(text)
                ]);
                if (currentNonce !== computeNonce) return; // Prevent race conditions
                document.getElementById('outMd5').value = hMd5;
                document.getElementById('outSha1').value = hSha1;
                document.getElementById('outSha256').value = hSha256;
                document.getElementById('outSha512').value = hSha512;
            } catch (err) {
                console.error('Hash calculation error:', err);
            }
        }

        document.getElementById('hashInput').addEventListener('input', computeAllHashes);
        
        document.querySelectorAll('.copy-hash-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const val = document.getElementById(targetId).value;
                if (!val) {
                    showToast('Nothing to copy yet. Enter text above!', 'warning');
                    return;
                }
                navigator.clipboard.writeText(val).then(() => {
                    const algoName = btn.textContent.replace('Copy ', '').trim();
                    showToast(`${algoName} copied to clipboard!`, 'success');
                });
            });
        });

        document.getElementById('loadSampleHashBtn').addEventListener('click', () => {
            document.getElementById('hashInput').value = '100ToolCrate - High performance browser tools';
            computeAllHashes();
        });

        document.getElementById('clearHashBtn').addEventListener('click', () => {
            document.getElementById('hashInput').value = '';
            computeAllHashes();
            document.getElementById('hashInput').focus();
        });

        // Initialize with default sample
        document.getElementById('hashInput').value = 'The quick brown fox jumps over the lazy dog';
        computeAllHashes();
    }

    function renderUuidGenerator(el) {
        el.innerHTML = `
            <div class="tool-ui" style="max-width:680px; margin:0 auto;">
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.5rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:1rem;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <label for="uuidCount" style="font-size:0.85rem; font-weight:600; color:var(--text-color);">Bulk Count:</label>
                            <select id="uuidCount" class="search-bar" style="width:auto; padding:0.35rem 0.75rem; font-size:0.85rem;">
                                <option value="1" selected>1 UUID</option>
                                <option value="5">5 UUIDs</option>
                                <option value="10">10 UUIDs</option>
                                <option value="25">25 UUIDs</option>
                                <option value="50">50 UUIDs</option>
                            </select>
                        </div>
                        <label style="display:inline-flex; align-items:center; gap:6px; font-size:0.85rem; cursor:pointer; color:var(--text-color);">
                            <input type="checkbox" id="uuidUpper" style="cursor:pointer; accent-color:var(--primary-color);">
                            <span>Uppercase (A-F)</span>
                        </label>
                    </div>

                    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                        <button class="btn primary-btn" id="genUuidBtn" style="padding:0.5rem 1.25rem;">
                            Generate UUIDs
                        </button>
                        <button class="btn" id="copyUuidBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.9rem; padding:0.5rem 1.25rem;">
                            Copy to Clipboard
                        </button>
                    </div>
                </div>

                <div style="position:relative;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <span style="font-size:0.8rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;" id="uuidCountBadge">Generated (1):</span>
                        <span style="font-size:0.75rem; color:var(--text-muted);">RFC 4122 v4 (CSPRNG)</span>
                    </div>
                    <textarea id="uuidOut" class="search-bar" rows="5" readonly style="width:100%; font-family:monospace; font-size:0.95rem; line-height:1.6; resize:vertical; background:var(--bg-color); border-radius:8px; padding:0.85rem;"></textarea>
                </div>
            </div>
        `;

        function generateUUID(upper) {
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
            bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
            const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
            const uuid = hex.slice(0,8) + '-' + hex.slice(8,12) + '-' + hex.slice(12,16) + '-' + hex.slice(16,20) + '-' + hex.slice(20);
            return upper ? uuid.toUpperCase() : uuid.toLowerCase();
        }

        function runGeneration() {
            const count = parseInt(document.getElementById('uuidCount').value, 10) || 1;
            const upper = document.getElementById('uuidUpper').checked;
            const list = [];
            for (let i = 0; i < count; i++) {
                list.push(generateUUID(upper));
            }
            const outEl = document.getElementById('uuidOut');
            outEl.value = list.join('\n');
            outEl.rows = Math.min(Math.max(count, 3), 12);
            document.getElementById('uuidCountBadge').textContent = `Generated (${count}):`;
        }

        document.getElementById('genUuidBtn').addEventListener('click', runGeneration);
        document.getElementById('uuidCount').addEventListener('change', runGeneration);
        document.getElementById('uuidUpper').addEventListener('change', runGeneration);

        document.getElementById('copyUuidBtn').addEventListener('click', () => {
            const val = document.getElementById('uuidOut').value;
            if (!val) return;
            navigator.clipboard.writeText(val).then(() => {
                const count = parseInt(document.getElementById('uuidCount').value, 10) || 1;
                showToast(count === 1 ? 'UUID copied to clipboard!' : `${count} UUIDs copied to clipboard!`, 'success');
            });
        });

        runGeneration();
    }

    function renderDiscountCalculator(el) {
        el.innerHTML = `
            <div class="tool-ui text-center" style="max-width:420px; margin:0 auto;">
                <div style="display:flex; flex-direction:column; gap:1rem; text-align:left;">
                    <div>
                        <label style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">Original Price ($)</label>
                        <input type="number" id="origPrice" class="search-bar w-full" placeholder="e.g. 120" value="120" min="0" step="any">
                    </div>
                    <div>
                        <div style="display:flex; justify-content:space-between;">
                            <label style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">Discount Rate</label>
                            <span id="discLabel" style="font-weight:700; color:var(--primary); font-size:0.85rem;">25%</span>
                        </div>
                        <input type="range" id="discRange" min="0" max="100" value="25" style="width:100%; margin:4px 0;">
                        <input type="number" id="discInput" class="search-bar w-full mt-1" placeholder="Discount %" value="25" min="0" max="100" step="any">
                    </div>
                    <div>
                        <label style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">Additional Sales Tax (%)</label>
                        <input type="number" id="taxRate" class="search-bar w-full" placeholder="Optional e.g. 8" value="0" min="0" step="any">
                    </div>

                    <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; margin-top:0.5rem;">
                        <div style="font-size:0.9rem; color:var(--text-muted);">Final Payable Price</div>
                        <div id="finalPrice" style="font-size:2rem; font-weight:800; color:var(--primary); margin:4px 0 0.75rem 0;">$90.00</div>
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem; border-top:1px solid var(--border-light); padding-top:0.75rem;">
                            <span>Total Savings:</span>
                            <strong id="totalSavings" style="color:#10b981;">$30.00 (25%)</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;

        function calc() {
            const p = Math.max(0, parseFloat(document.getElementById('origPrice').value) || 0);
            const d = parseFloat(document.getElementById('discInput').value) || 0;
            const t = parseFloat(document.getElementById('taxRate').value) || 0;

            const discounted = Math.max(0, p * (1 - d / 100));
            const tax = discounted * (t / 100);
            const finalP = Math.max(0, discounted + tax);
            const savings = Math.max(0, p - finalP);

            document.getElementById('finalPrice').textContent = '$' + finalP.toFixed(2);
            document.getElementById('totalSavings').textContent = '$' + savings.toFixed(2) + ' (' + d + '%)';
            document.getElementById('discLabel').textContent = d + '%';
        }

        document.getElementById('discRange').addEventListener('input', (e) => {
            document.getElementById('discInput').value = e.target.value;
            calc();
        });

        document.getElementById('discInput').addEventListener('input', (e) => {
            document.getElementById('discRange').value = e.target.value;
            calc();
        });

        document.getElementById('origPrice').addEventListener('input', calc);
        document.getElementById('taxRate').addEventListener('input', calc);

        calc();
    }

    function renderVatTax(el) {
        el.innerHTML = `
            <div class="tool-ui text-center" style="max-width:440px; margin:0 auto;">
                <div style="display:flex; flex-direction:column; gap:1rem; text-align:left;">
                    <div style="display:flex; gap:10px; justify-content:center;">
                        <button class="btn vat-mode-btn" data-mode="add" style="flex:1; background:var(--primary); color:#fff; border:none; padding:0.5rem; font-size:0.85rem; font-weight:600;">Add Tax</button>
                        <button class="btn vat-mode-btn" data-mode="extract" style="flex:1; background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); padding:0.5rem; font-size:0.85rem;">Extract Tax</button>
                    </div>

                    <div>
                        <label id="amountLabel" style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">Net Amount ($)</label>
                        <input type="number" id="amt" class="search-bar w-full" placeholder="e.g. 500" value="500" min="0" step="any">
                    </div>

                    <div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                            <label style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">VAT / Tax Rate (%)</label>
                            <div style="display:flex; gap:6px;">
                                <button class="btn vat-preset" data-rate="5" style="padding:1px 6px; font-size:0.75rem; background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light);">5%</button>
                                <button class="btn vat-preset" data-rate="10" style="padding:1px 6px; font-size:0.75rem; background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light);">10%</button>
                                <button class="btn vat-preset" data-rate="20" style="padding:1px 6px; font-size:0.75rem; background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light);">20%</button>
                            </div>
                        </div>
                        <input type="number" id="taxRate" class="search-bar w-full" placeholder="e.g. 20" value="20" min="0" step="any">
                    </div>

                    <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.6rem; font-size:0.9rem;">
                            <span style="color:var(--text-muted);">Net Amount:</span>
                            <strong id="outNet">$500.00</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.6rem; font-size:0.9rem;">
                            <span style="color:var(--text-muted);">Tax Amount:</span>
                            <strong id="outTax" style="color:var(--primary);">$100.00</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border-light); padding-top:0.75rem; font-size:1.15rem;">
                            <span>Gross (Total):</span>
                            <strong id="outGross" style="color:#10b981;">$600.00</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;

        let mode = 'add';

        function calc() {
            const amt = parseFloat(document.getElementById('amt').value) || 0;
            const r = parseFloat(document.getElementById('taxRate').value) || 0;

            let net = 0, tax = 0, gross = 0;
            if (mode === 'add') {
                net = amt;
                tax = net * (r / 100);
                gross = net + tax;
            } else {
                gross = amt;
                net = gross / (1 + r / 100);
                tax = gross - net;
            }

            document.getElementById('outNet').textContent = '$' + net.toFixed(2);
            document.getElementById('outTax').textContent = '$' + tax.toFixed(2);
            document.getElementById('outGross').textContent = '$' + gross.toFixed(2);
        }

        document.getElementById('amt').addEventListener('input', calc);
        document.getElementById('taxRate').addEventListener('input', calc);

        document.querySelectorAll('.vat-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                mode = btn.dataset.mode;
                document.querySelectorAll('.vat-mode-btn').forEach(b => {
                    b.style.background = 'var(--bg-subtle)';
                    b.style.color = 'var(--text-color)';
                    b.style.border = '1px solid var(--border-light)';
                });
                btn.style.background = 'var(--primary)';
                btn.style.color = '#fff';
                btn.style.border = 'none';
                document.getElementById('amountLabel').textContent = mode === 'add' ? 'Net Amount ($)' : 'Gross Amount ($)';
                calc();
            });
        });

        document.querySelectorAll('.vat-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('taxRate').value = btn.dataset.rate;
                calc();
            });
        });

        calc();
    }

    function renderDateDiff(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:1rem;">
                    <div style="text-align:left;">
                        <label style="font-size:0.875rem;color:var(--text-muted);font-weight:600;">Start Date</label><br>
                        <input type="date" id="d1" class="search-bar">
                    </div>
                    <div style="text-align:left;">
                        <label style="font-size:0.875rem;color:var(--text-muted);font-weight:600;">End Date</label><br>
                        <input type="date" id="d2" class="search-bar">
                    </div>
                </div>
                <button class="btn primary-btn mt-4" id="calcBtn">Calculate Difference</button>
                <div id="res" class="mt-4 p-4 font-bold" style="background:var(--card-bg); border-radius:0.75rem; border:1px solid var(--border-light); font-size:1.2rem; display:none;"></div>
            </div>
        `;
        document.getElementById('calcBtn').addEventListener('click', () => {
            const v1 = document.getElementById('d1').value;
            const v2 = document.getElementById('d2').value;
            if (!v1 || !v2) return showToast('Please select both start and end dates.', 'warning');

            const [y1, m1, day1] = v1.split('-').map(Number);
            const [y2, m2, day2] = v2.split('-').map(Number);

            const utc1 = Date.UTC(y1, m1 - 1, day1);
            const utc2 = Date.UTC(y2, m2 - 1, day2);

            const msPerDay = 1000 * 60 * 60 * 24;
            const diffDays = Math.round(Math.abs(utc2 - utc1) / msPerDay);

            const res = document.getElementById('res');
            res.style.display = 'block';
            res.innerText = diffDays + (diffDays === 1 ? ' Day' : ' Days');
        });
    }

    function renderAgeCalculator(el) {
        const todayStr = new Date().toISOString().split('T')[0];
        el.innerHTML = `
            <div class="tool-ui text-center" style="max-width:440px; margin:0 auto;">
                <div style="text-align:left; margin-bottom:1.25rem;">
                    <label style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">Date of Birth</label>
                    <input type="date" id="dob" class="search-bar w-full mt-1" max="${todayStr}">
                </div>

                <div id="resCard" style="display:none; background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; text-align:left;">
                    <div style="font-size:0.85rem; color:var(--text-muted);">Exact Age</div>
                    <div id="mainAge" style="font-size:1.6rem; font-weight:800; color:var(--primary); margin:4px 0 1rem 0;"></div>
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; border-top:1px solid var(--border-light); padding-top:0.75rem; font-size:0.85rem;">
                        <div>Total Days Lived: <strong id="totalDays" style="color:var(--text-color);"></strong></div>
                        <div>Next Birthday in: <strong id="nextBday" style="color:#10b981;"></strong></div>
                    </div>
                </div>
            </div>
        `;

        const dob = document.getElementById('dob');
        dob.max = todayStr;

        function calc() {
            if (dob.value > todayStr) {
                dob.value = todayStr;
                showToast('Birthdate cannot be in the future. Clamped to today.', 'warning');
            }
            const val = dob.value;
            const resCard = document.getElementById('resCard');
            if (!val) { resCard.style.display = 'none'; return; }

            const [y, m, d] = val.split('-').map(Number);
            const birthDate = new Date(y, m - 1, d);
            const today = new Date();

            if (birthDate > today) {
                resCard.style.display = 'block';
                document.getElementById('mainAge').textContent = 'Date is in the future!';
                document.getElementById('totalDays').textContent = 'N/A';
                document.getElementById('nextBday').textContent = 'N/A';
                showToast('Birthdate cannot be in the future. Please select a valid past date.', 'warning');
                return;
            }

            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            let days = today.getDate() - birthDate.getDate();

            if (days < 0) {
                months--;
                const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                days += prevMonth.getDate();
            }
            if (months < 0) {
                years--;
                months += 12;
            }

            const diffTime = Math.abs(today - birthDate);
            const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            // Next birthday countdown
            let nextBday = new Date(today.getFullYear(), m - 1, d);
            if (nextBday < today) nextBday = new Date(today.getFullYear() + 1, m - 1, d);
            const daysToBday = Math.ceil((nextBday - today) / (1000 * 60 * 60 * 24));

            resCard.style.display = 'block';
            document.getElementById('mainAge').textContent = `${years} Years, ${months} Months, ${days} Days`;
            document.getElementById('totalDays').textContent = totalDays.toLocaleString() + ' days';
            document.getElementById('nextBday').textContent = daysToBday + (daysToBday === 1 ? ' day' : ' days');
        }

        // Default to 25 years ago today
        const def = new Date();
        def.setFullYear(def.getFullYear() - 25);
        dob.value = def.toISOString().split('T')[0];

        dob.addEventListener('input', calc);
        dob.addEventListener('change', calc);
        calc();
    }

    function renderTimeDuration(el) {
        el.innerHTML = `
            <div class="tool-ui text-center" style="max-width:440px; margin:0 auto;">
                <div style="display:flex; gap:12px; justify-content:center; margin-bottom:1.25rem;">
                    <div style="flex:1; text-align:left;">
                        <label style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">Start Time</label>
                        <input type="time" id="t1" class="search-bar w-full mt-1" value="09:00">
                    </div>
                    <div style="flex:1; text-align:left;">
                        <label style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">End Time</label>
                        <input type="time" id="t2" class="search-bar w-full mt-1" value="17:30">
                    </div>
                </div>

                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; text-align:center;">
                    <div style="font-size:0.85rem; color:var(--text-muted);">Total Duration</div>
                    <div id="durationRes" style="font-size:1.75rem; font-weight:800; color:var(--primary); margin:4px 0 0.5rem 0;">8 Hours, 30 Minutes</div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">Total: <strong id="totalMins" style="color:var(--text-color);">510 minutes</strong> (<span id="totalSecs">30,600 seconds</span>)</div>
                </div>
            </div>
        `;

        function calc() {
            const t1 = document.getElementById('t1').value;
            const t2 = document.getElementById('t2').value;
            if (!t1 || !t2) return;

            const [h1, m1] = t1.split(':').map(Number);
            const [h2, m2] = t2.split(':').map(Number);

            let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diffMinutes < 0) diffMinutes += 24 * 60; // overnight wrap

            const hrs = Math.floor(diffMinutes / 60);
            const mins = diffMinutes % 60;

            document.getElementById('durationRes').textContent = `${hrs} Hour${hrs === 1 ? '' : 's'}, ${mins} Minute${mins === 1 ? '' : 's'}`;
            document.getElementById('totalMins').textContent = `${diffMinutes.toLocaleString()} minutes`;
            const secsEl = document.getElementById('totalSecs');
            if (secsEl) secsEl.textContent = `${(diffMinutes * 60).toLocaleString()} seconds`;
        }

        document.getElementById('t1').addEventListener('input', calc);
        document.getElementById('t2').addEventListener('input', calc);
        calc();
    }

    function renderFindReplaceText(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <textarea id="txtIn" rows="6" class="search-bar" placeholder="Paste your text here..." style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
                <div class="mt-4" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                    <input type="text" id="findTxt" class="search-bar" placeholder="Find text..." style="flex:1;min-width:140px;">
                    <input type="text" id="replTxt" class="search-bar" placeholder="Replace with..." style="flex:1;min-width:140px;">
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer; user-select:none;">
                        <input type="checkbox" id="matchCase"> Match Case
                    </label>
                </div>
                <div class="mt-4 text-center">
                    <button class="btn primary-btn" id="actionBtn">Replace All</button>
                </div>
                <textarea id="txtOut" rows="6" class="search-bar mt-4" placeholder="Modified text will appear here..." readonly style="width:100%; border-radius:0.5rem; resize:vertical;"></textarea>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', () => {
            const text = document.getElementById('txtIn').value;
            const find = document.getElementById('findTxt').value;
            const repl = document.getElementById('replTxt').value;
            if (!find) return showToast('Please enter text to find.', 'warning');

            try {
                const flags = document.getElementById('matchCase').checked ? 'g' : 'gi';
                // Escape special regex characters properly with a literal backslash before the match
                const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedFind, flags);
                document.getElementById('txtOut').value = text.replace(regex, repl);
            } catch (err) {
                console.error(err);
                showToast('Error executing find & replace: ' + err.message, 'error');
            }
        });
    }

    function renderMarkdownPreviewer(el) {
         const markedReady = typeof marked === 'undefined'
              ? loadExternalScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js')
              : Promise.resolve();
         const domPurifyReady = typeof DOMPurify === 'undefined'
              ? loadExternalScript('https://cdn.jsdelivr.net/npm/dompurify@3.1.7/dist/purify.min.js')
              : Promise.resolve();
         el.innerHTML = `
            <div class="tool-ui">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                    <textarea id="mdIn" class="search-bar" rows="15" placeholder="# Markdown Input\n\nStart typing..." style="width:100%; border-radius:0.5rem; resize:vertical; font-family:monospace;"></textarea>
                    <div id="mdOut" style="background:var(--card-bg); border:1px solid var(--border); border-radius:0.5rem; padding:1rem; overflow-y:auto;"></div>
                </div>
            </div>
        `;
        const input = document.getElementById('mdIn');
        const output = document.getElementById('mdOut');
        const renderMarkdown = () => {
             if (typeof marked === 'undefined') {
                  output.textContent = input.value;
                  return;
             }
             const html = marked.parse(input.value);
             output.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html) : escapeHtml(html);
        };
        Promise.allSettled([markedReady, domPurifyReady]).then(renderMarkdown);
        input.addEventListener('input', renderMarkdown);
    }

    function renderProfitMargin(el) {
        el.innerHTML = `
            <div class="tool-ui text-center" style="max-width:440px; margin:0 auto;">
                <div style="display:flex; flex-direction:column; gap:1rem; text-align:left;">
                    <div>
                        <label style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">Cost of Goods Sold (COGS) ($)</label>
                        <input type="number" id="cost" class="search-bar w-full" placeholder="e.g. 60" value="60" min="0" step="any">
                    </div>
                    <div>
                        <label style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">Selling Price ($)</label>
                        <input type="number" id="revenue" class="search-bar w-full" placeholder="e.g. 100" value="100" min="0" step="any">
                    </div>

                    <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; margin-top:0.5rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                            <span style="font-size:0.9rem; color:var(--text-muted);">Gross Profit:</span>
                            <strong id="grossProfit" style="font-size:1.5rem; color:#10b981;">$40.00</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:0.9rem; border-top:1px solid var(--border-light); padding:0.6rem 0;">
                            <span>Profit Margin:</span>
                            <strong id="profitMargin" style="color:var(--primary);">40.00%</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:0.9rem; border-top:1px solid var(--border-light); padding-top:0.6rem;">
                            <span>Markup:</span>
                            <strong id="markup" style="color:var(--text-color);">66.67%</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;

        function calc() {
            const cost = parseFloat(document.getElementById('cost').value);
            const rev = parseFloat(document.getElementById('revenue').value);
            const gp = document.getElementById('grossProfit');
            const pm = document.getElementById('profitMargin');
            const mu = document.getElementById('markup');

            if (isNaN(cost) || isNaN(rev)) {
                gp.textContent = '$0.00'; pm.textContent = '0.00%'; mu.textContent = '0.00%';
                return;
            }

            const profit = rev - cost;
            const margin = rev > 0 ? (profit / rev) * 100 : 0;
            // Guard against Cost <= 0 to prevent Markup = Infinity% or division by zero
            const markup = cost > 0 ? (profit / cost) * 100 : 0;

            gp.textContent = '$' + profit.toFixed(2);
            gp.style.color = profit >= 0 ? '#10b981' : '#ef4444';
            pm.textContent = margin.toFixed(2) + '%';
            if (cost <= 0) {
                mu.textContent = '0.00%';
            } else {
                mu.textContent = markup.toFixed(2) + '%';
            }
        }

        document.getElementById('cost').addEventListener('input', calc);
        document.getElementById('revenue').addEventListener('input', calc);
        calc();
    }

    function renderLoanEmi(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <div style="display:flex; flex-direction:column; gap:1rem; max-width:320px; margin:0 auto;">
                    <div style="text-align:left;">
                        <label style="font-size:0.875rem;color:var(--text-muted);font-weight:600;">Loan Amount ($)</label>
                        <input type="number" id="amount" class="search-bar w-full" placeholder="e.g. 25000" min="1" step="any">
                    </div>
                    <div style="text-align:left;">
                        <label style="font-size:0.875rem;color:var(--text-muted);font-weight:600;">Annual Interest Rate (%)</label>
                        <input type="number" id="rate" class="search-bar w-full" placeholder="e.g. 5.5 (0 for interest-free)" min="0" step="any">
                    </div>
                    <div style="text-align:left;">
                        <label style="font-size:0.875rem;color:var(--text-muted);font-weight:600;">Tenure (Months)</label>
                        <input type="number" id="months" class="search-bar w-full" placeholder="e.g. 36" min="1" step="1">
                    </div>
                    <button class="btn primary-btn" id="calcBtn">Calculate EMI</button>
                    <div id="res" class="mt-4 p-4" style="background:var(--card-bg); border-radius:0.75rem; border:1px solid var(--border-light);">
                        <div style="font-size:1.25rem;">Monthly EMI: <strong id="emi" style="color:var(--primary);">$0.00</strong></div>
                        <div class="mt-2 text-sm text-muted">Total Interest: <span id="intM" style="color:var(--text-color);">$0.00</span></div>
                        <div class="text-sm text-muted">Total Payment: <span id="totM" style="color:var(--text-color);">$0.00</span></div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('calcBtn').addEventListener('click', () => {
            const P = parseFloat(document.getElementById('amount').value);
            const r = parseFloat(document.getElementById('rate').value);
            const n = parseFloat(document.getElementById('months').value);

            if (isNaN(P) || P <= 0) return showToast('Please enter a valid loan amount greater than 0.', 'warning');
            if (isNaN(r) || r < 0) return showToast('Please enter a valid non-negative interest rate (0% or higher).', 'warning');
            if (isNaN(n) || n <= 0) return showToast('Please enter a valid tenure in months (at least 1 month).', 'warning');

            let E, Total, Int;
            if (r === 0) {
                // 0% promotional or interest-free loan
                E = P / n;
                Total = P;
                Int = 0;
            } else {
                const R = r / 12 / 100;
                const factor = Math.pow(1 + R, n);
                E = (P * R * factor) / (factor - 1);
                Total = E * n;
                Int = Total - P;
            }

            document.getElementById('emi').innerText = '$' + E.toFixed(2);
            document.getElementById('intM').innerText = '$' + Int.toFixed(2);
            document.getElementById('totM').innerText = '$' + Total.toFixed(2);
        });
    }

    function renderUnitConverter(el) {
        el.innerHTML = `
            <div class="tool-ui text-center" style="max-width:540px; margin:0 auto;">
                <!-- Category Tabs -->
                <div id="unitTabs" style="display:flex; gap:6px; overflow-x:auto; padding-bottom:8px; margin-bottom:1.25rem; scrollbar-width:none;">
                    <button class="btn unit-tab active" data-cat="length" style="padding:0.4rem 0.8rem; font-size:0.85rem; border-radius:9999px;">Length</button>
                    <button class="btn unit-tab" data-cat="weight" style="padding:0.4rem 0.8rem; font-size:0.85rem; border-radius:9999px;">Weight</button>
                    <button class="btn unit-tab" data-cat="temp" style="padding:0.4rem 0.8rem; font-size:0.85rem; border-radius:9999px;">Temperature</button>
                    <button class="btn unit-tab" data-cat="area" style="padding:0.4rem 0.8rem; font-size:0.85rem; border-radius:9999px;">Area</button>
                    <button class="btn unit-tab" data-cat="volume" style="padding:0.4rem 0.8rem; font-size:0.85rem; border-radius:9999px;">Volume</button>
                    <button class="btn unit-tab" data-cat="speed" style="padding:0.4rem 0.8rem; font-size:0.85rem; border-radius:9999px;">Speed</button>
                    <button class="btn unit-tab" data-cat="storage" style="padding:0.4rem 0.8rem; font-size:0.85rem; border-radius:9999px;">Digital Storage</button>
                </div>

                <div style="display:grid; grid-template-columns:1fr auto 1fr; gap:10px; align-items:center;">
                    <div>
                        <input type="number" id="valA" class="search-bar w-full" value="1" step="any">
                        <select id="unitA" class="search-bar w-full mt-2"></select>
                    </div>
                    <span style="font-size:1.5rem; color:var(--text-muted); font-weight:700;">=</span>
                    <div>
                        <input type="number" id="valB" class="search-bar w-full" step="any">
                        <select id="unitB" class="search-bar w-full mt-2"></select>
                    </div>
                </div>

                <div id="formulaNote" style="margin-top:1.25rem; font-size:0.85rem; color:var(--text-muted);"></div>
            </div>
        `;

        const UNIT_DATA = {
            length: {
                units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
                labels: { m: 'Meters (m)', km: 'Kilometers (km)', cm: 'Centimeters (cm)', mm: 'Millimeters (mm)', mi: 'Miles (mi)', yd: 'Yards (yd)', ft: 'Feet (ft)', in: 'Inches (in)' }
            },
            weight: {
                units: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.45359237, oz: 0.028349523, t: 1000 },
                labels: { kg: 'Kilograms (kg)', g: 'Grams (g)', mg: 'Milligrams (mg)', lb: 'Pounds (lb)', oz: 'Ounces (oz)', t: 'Metric Tons (t)' }
            },
            temp: {
                custom: true,
                labels: { c: 'Celsius (°C)', f: 'Fahrenheit (°F)', k: 'Kelvin (K)' }
            },
            area: {
                units: { sqm: 1, sqkm: 1000000, sqft: 0.092903, sqin: 0.00064516, ac: 4046.856, ha: 10000 },
                labels: { sqm: 'Square Meters (m²)', sqkm: 'Square Kilometers (km²)', sqft: 'Square Feet (ft²)', sqin: 'Square Inches (in²)', ac: 'Acres (ac)', ha: 'Hectares (ha)' }
            },
            volume: {
                units: { l: 1, ml: 0.001, m3: 1000, gal: 3.78541, pt: 0.473176, fl_oz: 0.0295735 },
                labels: { l: 'Liters (L)', ml: 'Milliliters (mL)', m3: 'Cubic Meters (m³)', gal: 'US Gallons (gal)', pt: 'US Pints (pt)', fl_oz: 'Fluid Ounces (fl oz)' }
            },
            speed: {
                units: { mps: 1, kmh: 0.277778, mph: 0.44704, knot: 0.514444 },
                labels: { mps: 'Meters/sec (m/s)', kmh: 'Km/hour (km/h)', mph: 'Miles/hour (mph)', knot: 'Knots' }
            },
            storage: {
                units: { b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776 },
                labels: { b: 'Bytes (B)', kb: 'Kilobytes (KB)', mb: 'Megabytes (MB)', gb: 'Gigabytes (GB)', tb: 'Terabytes (TB)' }
            }
        };

        let currentCat = 'length';

        function loadCategory(cat) {
            currentCat = cat;
            const data = UNIT_DATA[cat];
            const selA = document.getElementById('unitA');
            const selB = document.getElementById('unitB');
            selA.innerHTML = '';
            selB.innerHTML = '';

            const keys = Object.keys(data.labels);
            keys.forEach((k, idx) => {
                const optA = document.createElement('option');
                optA.value = k; optA.textContent = data.labels[k];
                const optB = document.createElement('option');
                optB.value = k; optB.textContent = data.labels[k];
                selA.appendChild(optA);
                selB.appendChild(optB);
            });

            if (keys.length > 1) selB.selectedIndex = 1;
            convertAtoB();
        }

        function convertTemp(val, from, to) {
            let c = val;
            if (from === 'f') c = (val - 32) * (5/9);
            else if (from === 'k') c = val - 273.15;

            if (to === 'c') return c;
            if (to === 'f') return (c * (9/5)) + 32;
            if (to === 'k') return c + 273.15;
            return c;
        }

        function convertAtoB() {
            const vA = parseFloat(document.getElementById('valA').value);
            const uA = document.getElementById('unitA').value;
            const uB = document.getElementById('unitB').value;
            if (isNaN(vA)) { document.getElementById('valB').value = ''; return; }

            let vB = 0;
            let note = '';
            if (currentCat === 'temp') {
                vB = convertTemp(vA, uA, uB);
                note = `1 ${UNIT_DATA[currentCat].labels[uA]} = ${parseFloat(convertTemp(1, uA, uB).toFixed(6))} ${UNIT_DATA[currentCat].labels[uB]}`;
            } else {
                const factorA = UNIT_DATA[currentCat].units[uA];
                const factorB = UNIT_DATA[currentCat].units[uB];
                vB = (vA * factorA) / factorB;
                note = `1 ${UNIT_DATA[currentCat].labels[uA]} = ${parseFloat((factorA / factorB).toFixed(6))} ${UNIT_DATA[currentCat].labels[uB]}`;
            }

            document.getElementById('valB').value = parseFloat(vB.toFixed(6));
            const noteEl = document.getElementById('formulaNote');
            if (noteEl) noteEl.textContent = note;
        }

        function convertBtoA() {
            const vB = parseFloat(document.getElementById('valB').value);
            const uA = document.getElementById('unitA').value;
            const uB = document.getElementById('unitB').value;
            if (isNaN(vB)) { document.getElementById('valA').value = ''; return; }

            let vA = 0;
            if (currentCat === 'temp') {
                vA = convertTemp(vB, uB, uA);
            } else {
                const factorA = UNIT_DATA[currentCat].units[uA];
                const factorB = UNIT_DATA[currentCat].units[uB];
                vA = (vB * factorB) / factorA;
            }

            document.getElementById('valA').value = parseFloat(vA.toFixed(6));
        }

        document.getElementById('valA').addEventListener('input', convertAtoB);
        document.getElementById('valB').addEventListener('input', convertBtoA);
        document.getElementById('unitA').addEventListener('change', convertAtoB);
        document.getElementById('unitB').addEventListener('change', convertAtoB);

        document.querySelectorAll('.unit-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.unit-tab').forEach(t => {
                    t.style.background = 'var(--bg-subtle)';
                    t.style.color = 'var(--text-color)';
                    t.style.border = '1px solid var(--border-light)';
                });
                tab.style.background = 'var(--primary)';
                tab.style.color = '#fff';
                tab.style.border = 'none';
                loadCategory(tab.dataset.cat);
            });
        });

        // Initialize active tab styling
        const firstTab = document.querySelector('.unit-tab');
        if (firstTab) {
            firstTab.style.background = 'var(--primary)';
            firstTab.style.color = '#fff';
            firstTab.style.border = 'none';
        }
        loadCategory('length');
    }

    function renderMetaTitleChecker(el) {
        el.innerHTML = `
            <div class="tool-ui text-center" style="max-width:680px; margin:0 auto;">
                <input type="text" id="tIn" class="search-bar" style="width:100%" placeholder="Type your webpage title here..." value="Free Online PDF & Developer Tools | 100ToolCrate">
                <input type="text" id="urlIn" class="search-bar mt-2" style="width:100%" placeholder="Target URL (e.g. https://100toolcrate.com/)" value="https://100toolcrate.com/">

                <div style="display:flex; justify-content:space-between; align-items:center; margin:1rem 0 0.5rem 0; flex-wrap:wrap; gap:8px;">
                    <div style="display:flex; gap:12px; font-size:0.875rem;">
                        <span>Characters: <strong id="tCount">0</strong> / 60</span>
                        <span>Pixel Width: <strong id="pxWidth">0</strong> / 600 px</span>
                    </div>
                    <span id="titleStatus" style="font-size:0.8rem; font-weight:700; padding:0.2rem 0.6rem; border-radius:9999px;"></span>
                </div>

                <div style="width:100%; height:8px; background:var(--bg-subtle); border-radius:4px; overflow:hidden; margin-bottom:1.5rem;">
                    <div id="pixelBar" style="height:100%; width:0%; background:#10b981; transition:width 0.2s ease, background 0.2s ease;"></div>
                </div>

                <div style="display:flex; justify-content:center; gap:8px; margin-bottom:1rem;">
                    <button class="btn view-toggle-btn" id="viewDesktop" style="background:var(--primary); color:#fff; border:none; font-size:0.85rem; padding:0.35rem 0.8rem;">Desktop SERP View</button>
                    <button class="btn view-toggle-btn" id="viewMobile" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.35rem 0.8rem;">Mobile SERP View</button>
                </div>

                <!-- Google SERP Visual Preview Card -->
                <div id="serpContainer" style="background:#ffffff; border-radius:12px; padding:1.25rem; text-align:left; box-shadow:var(--shadow-sm); border:1px solid #e2e8f0; color:#202124; font-family:Arial, sans-serif;">
                    <div id="serpUrlRow" style="font-size:12px; color:#202124; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                        <span style="width:16px;height:16px;border-radius:50%;background:#e8eaed;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;">🌐</span>
                        <span id="serpUrl" style="color:#202124;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">https://100toolcrate.com</span>
                    </div>
                    <div id="serpTitle" style="color:#1a0dab; font-size:20px; line-height:1.3; cursor:pointer; text-decoration:none; word-break:break-word; max-width:600px;">
                        Free Online PDF & Developer Tools | 100ToolCrate
                    </div>
                    <div style="color:#4d5156; font-size:14px; line-height:1.4; margin-top:4px;">
                        Fast, private, and 100% free client-side developer utilities and document processors running offline in your browser.
                    </div>
                </div>
            </div>
        `;

        // Canvas for measuring pixel width accurately with Arial 20px (Google Desktop title font)
        const measureCanvas = document.createElement('canvas');
        const measureCtx = measureCanvas.getContext('2d');
        measureCtx.font = '20px Arial';

        function updateTitle() {
            const val = document.getElementById('tIn').value || 'Untitled Document';
            const url = document.getElementById('urlIn').value || 'https://example.com';
            const len = val.length;
            const px = Math.round(measureCtx.measureText(val).width);

            document.getElementById('tCount').textContent = len;
            document.getElementById('pxWidth').textContent = px;
            document.getElementById('serpUrl').textContent = url;
            document.getElementById('serpTitle').textContent = val;

            const bar = document.getElementById('pixelBar');
            const status = document.getElementById('titleStatus');
            const pct = Math.min(100, Math.round((px / 600) * 100));
            bar.style.width = pct + '%';

            if (px > 600 || len > 60) {
                bar.style.background = '#ef4444';
                status.textContent = 'Too Long (Truncated)';
                status.style.background = 'rgba(239, 68, 68, 0.12)';
                status.style.color = '#ef4444';
                document.getElementById('serpTitle').style.textOverflow = 'ellipsis';
            } else if (px < 280 || len < 30) {
                bar.style.background = '#f59e0b';
                status.textContent = 'Too Short';
                status.style.background = 'rgba(245, 158, 11, 0.12)';
                status.style.color = '#f59e0b';
            } else {
                bar.style.background = '#10b981';
                status.textContent = 'Optimal Length';
                status.style.background = 'rgba(16, 185, 129, 0.12)';
                status.style.color = '#10b981';
            }
        }

        document.getElementById('tIn').addEventListener('input', updateTitle);
        document.getElementById('urlIn').addEventListener('input', updateTitle);

        document.getElementById('viewDesktop').addEventListener('click', () => {
            document.getElementById('serpContainer').style.maxWidth = '100%';
            document.getElementById('serpTitle').style.maxWidth = '600px';
            document.getElementById('viewDesktop').style.background = 'var(--primary)';
            document.getElementById('viewDesktop').style.color = '#fff';
            document.getElementById('viewMobile').style.background = 'var(--bg-subtle)';
            document.getElementById('viewMobile').style.color = 'var(--text-color)';
        });

        document.getElementById('viewMobile').addEventListener('click', () => {
            document.getElementById('serpContainer').style.maxWidth = '375px';
            document.getElementById('serpContainer').style.margin = '0 auto';
            document.getElementById('serpTitle').style.maxWidth = '340px';
            document.getElementById('viewMobile').style.background = 'var(--primary)';
            document.getElementById('viewMobile').style.color = '#fff';
            document.getElementById('viewDesktop').style.background = 'var(--bg-subtle)';
            document.getElementById('viewDesktop').style.color = 'var(--text-color)';
        });

        updateTitle();
    }

    function renderMetaDescChecker(el) {
        el.innerHTML = `
            <div class="tool-ui text-center" style="max-width:680px; margin:0 auto;">
                <textarea id="tIn" class="search-bar" rows="4" style="width:100%" placeholder="Type your meta description here...">Compress images, convert documents, format code, and calculate finances with 100% free client-side web tools. Private, fast, and no installation required.</textarea>
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin:1rem 0 0.5rem 0; flex-wrap:wrap; gap:8px;">
                    <div style="display:flex; gap:12px; font-size:0.875rem;">
                        <span>Characters: <strong id="tCount">0</strong> / 160</span>
                        <span>Pixel Width: <strong id="pxWidth">0</strong> / 960 px</span>
                    </div>
                    <span id="descStatus" style="font-size:0.8rem; font-weight:700; padding:0.2rem 0.6rem; border-radius:9999px;"></span>
                </div>

                <div style="width:100%; height:8px; background:var(--bg-subtle); border-radius:4px; overflow:hidden; margin-bottom:1.5rem;">
                    <div id="descBar" style="height:100%; width:0%; background:#10b981; transition:width 0.2s ease;"></div>
                </div>

                <!-- Google SERP Card -->
                <div id="serpContainer" style="background:#ffffff; border-radius:12px; padding:1.25rem; text-align:left; box-shadow:var(--shadow-sm); border:1px solid #e2e8f0; color:#202124; font-family:Arial, sans-serif;">
                    <div style="font-size:12px; color:#202124; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                        <span style="width:16px;height:16px;border-radius:50%;background:#e8eaed;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;">🌐</span>
                        <span>https://100toolcrate.com</span>
                    </div>
                    <div style="color:#1a0dab; font-size:20px; line-height:1.3; cursor:pointer;">
                        100ToolCrate: Free Developer & Document Utilities
                    </div>
                    <div id="serpDesc" style="color:#4d5156; font-size:14px; line-height:1.4; margin-top:4px; word-break:break-word;"></div>
                </div>
            </div>
        `;

        const measureCanvas = document.createElement('canvas');
        const measureCtx = measureCanvas.getContext('2d');
        measureCtx.font = '14px Arial';

        function updateDesc() {
            const val = document.getElementById('tIn').value || '';
            const len = val.length;
            const px = Math.round(measureCtx.measureText(val).width);

            document.getElementById('tCount').textContent = len;
            document.getElementById('pxWidth').textContent = px;
            document.getElementById('serpDesc').textContent = val;

            const bar = document.getElementById('descBar');
            const status = document.getElementById('descStatus');
            const pct = Math.min(100, Math.round((px / 960) * 100));
            bar.style.width = pct + '%';

            if (px > 960 || len > 160) {
                bar.style.background = '#ef4444';
                status.textContent = 'Too Long (Will Truncate)';
                status.style.background = 'rgba(239, 68, 68, 0.12)';
                status.style.color = '#ef4444';
            } else if (len < 80) {
                bar.style.background = '#f59e0b';
                status.textContent = 'Too Short';
                status.style.background = 'rgba(245, 158, 11, 0.12)';
                status.style.color = '#f59e0b';
            } else {
                bar.style.background = '#10b981';
                status.textContent = 'Optimal Length (120-160 chars)';
                status.style.background = 'rgba(16, 185, 129, 0.12)';
                status.style.color = '#10b981';
            }
        }

        document.getElementById('tIn').addEventListener('input', updateDesc);
        updateDesc();
    }

    function renderKeywordDensity(el) {
         el.innerHTML = `
            <div class="tool-ui">
                <textarea id="txt" rows="6" class="search-bar" placeholder="Paste article text..." style="width:100%; resize:vertical;"></textarea>
                <button class="btn primary-btn mt-4" id="calcBtn">Calculate Density</button>
                <div id="out" class="mt-4" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:1rem;"></div>
            </div>
        `;
        document.getElementById('calcBtn').addEventListener('click', () => {
             const txt = document.getElementById('txt').value.toLowerCase().replace(/[^a-z0-9\s]/g, '');
             const words = txt.split(/\s+/).filter(w => w.length > 2); // filter small words
             const total = words.length;
             const counts = {};
             words.forEach(w => counts[w] = (counts[w] || 0) + 1);
             const sorted = Object.keys(counts).map(k => ({word: k, count: counts[k]})).sort((a,b) => b.count - a.count).slice(0, 20);
             let html = '';
             sorted.forEach(item => {
                 const pct = ((item.count / total) * 100).toFixed(2);
                 html += `<div style="background:var(--card-bg); padding:1rem; border-radius:0.5rem; text-transform:capitalize;">
                     <strong>${item.word}</strong>: ${item.count} (${pct}%)
                 </div>`;
             });
             document.getElementById('out').innerHTML = html || 'No words found.';
        });
    }

    function renderReadTimeCalculator(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <textarea id="txt" class="search-bar" rows="8" placeholder="Paste article text here..." style="width:100%; resize:vertical;"></textarea>
                <div id="res" class="mt-4 p-4 font-bold" style="background:var(--card-bg); border-radius:0.5rem; font-size:1.5rem;">0 min read</div>
                <div class="text-sm mt-2 text-muted">Based on average reading speed of 250 words per minute.</div>
            </div>
        `;
        document.getElementById('txt').addEventListener('input', (e) => {
             const words = e.target.value.trim().split(/\s+/).filter(Boolean).length;
             const mins = Math.ceil(words / 250);
             document.getElementById('res').innerText = mins + " min read";
        });
    }

    function renderWhatsappLink(el) {
        el.innerHTML = `
            <div class="tool-ui" style="max-width:560px; margin:0 auto;">
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.5rem; box-shadow:var(--shadow-sm); margin-bottom:1.5rem;">
                    <div style="margin-bottom:1rem;">
                        <label for="phone" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.35rem;">
                            Phone Number (with Country Code):
                        </label>
                        <input type="tel" id="phone" class="search-bar" placeholder="+1 (555) 019-2834 or +44 7911 123456" style="width:100%; border-radius:6px;">
                        <div id="phoneSanitizedHint" style="font-size:0.8rem; color:var(--text-muted); margin-top:0.35rem; font-family:monospace;">
                            Sanitized for WhatsApp: <span id="sanitizedDisplay" style="color:var(--primary-color); font-weight:600;">None</span>
                        </div>
                    </div>

                    <div style="margin-bottom:1.25rem;">
                        <label for="msg" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.35rem;">
                            Pre-filled Message (Optional):
                        </label>
                        <textarea id="msg" class="search-bar" rows="3" placeholder="Hello! I am reaching out from your website..." style="width:100%; border-radius:6px; resize:vertical;"></textarea>
                    </div>

                    <div style="margin-bottom:1.25rem;">
                        <label for="out" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.35rem;">
                            Generated WhatsApp Link:
                        </label>
                        <input type="text" id="out" class="search-bar" readonly placeholder="https://wa.me/..." style="width:100%; font-family:monospace; font-size:0.85rem; border-radius:6px; background:var(--bg-color);">
                    </div>

                    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                        <button class="btn" id="copyWaLinkBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.9rem; padding:0.5rem 1.25rem; border-radius:6px; cursor:pointer;">
                            Copy Link
                        </button>
                        <a id="testLink" href="#" target="_blank" rel="noopener noreferrer" class="btn primary-btn" style="background:#25D366; border-color:#25D366; color:#ffffff; font-size:0.9rem; padding:0.5rem 1.25rem; border-radius:6px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                            <span>Open in WhatsApp</span>
                        </a>
                    </div>
                </div>

                <!-- Live QR Code Preview Card -->
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.5rem; box-shadow:var(--shadow-sm); text-align:center;">
                    <div style="font-size:0.85rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:1rem;">
                        Live WhatsApp QR Code
                    </div>
                    <div id="waQrCodeContainer" style="display:inline-block; padding:1rem; background:#ffffff; border-radius:12px; box-shadow:var(--shadow-sm); min-width:180px; min-height:180px;">
                        <div id="waQrCode"></div>
                    </div>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.75rem;">
                        Scan with your phone camera to start a direct WhatsApp chat instantly.
                    </p>
                </div>
            </div>
        `;

        function sanitizePhone(raw) {
            if (!raw) return '';
            let cleaned = raw.trim().replace(/[\s\(\)\-\.]+/g, '');
            if (cleaned.startsWith('00')) cleaned = cleaned.slice(2);
            cleaned = cleaned.replace(/[^0-9]/g, '');
            cleaned = cleaned.replace(/^0+/, '');
            return cleaned;
        }

        let qrTimer = null;
        async function updateWhatsapp() {
            const rawPhone = document.getElementById('phone').value;
            const clean = sanitizePhone(rawPhone);
            const msg = document.getElementById('msg').value.trim();

            const display = document.getElementById('sanitizedDisplay');
            if (clean) {
                display.textContent = `+${clean}`;
            } else {
                display.textContent = 'None (please enter number)';
            }

            const url = clean ? `https://wa.me/${clean}${msg ? `?text=${encodeURIComponent(msg)}` : ''}` : '';
            document.getElementById('out').value = url;
            const testBtn = document.getElementById('testLink');
            if (url) {
                testBtn.href = url;
                testBtn.style.pointerEvents = 'auto';
                testBtn.style.opacity = '1';
            } else {
                testBtn.href = '#';
                testBtn.style.pointerEvents = 'none';
                testBtn.style.opacity = '0.5';
            }

            if (qrTimer) clearTimeout(qrTimer);
            qrTimer = setTimeout(async () => {
                const qrTarget = url || 'https://wa.me/';
                try {
                    await ensureLibraries(['qrcode']);
                    const qrEl = document.getElementById('waQrCode');
                    if (!qrEl) return;
                    qrEl.innerHTML = '';
                    new window.QRCode(qrEl, {
                        text: qrTarget,
                        width: 180,
                        height: 180,
                        colorDark: '#0B0E14',
                        colorLight: '#ffffff',
                        correctLevel: window.QRCode.CorrectLevel.M
                    });
                } catch (e) {
                    console.error('Failed to generate WhatsApp QR code:', e);
                }
            }, 150);
        }

        document.getElementById('phone').addEventListener('input', updateWhatsapp);
        document.getElementById('msg').addEventListener('input', updateWhatsapp);

        document.getElementById('copyWaLinkBtn').addEventListener('click', () => {
            const link = document.getElementById('out').value;
            if (!link) {
                showToast('Please enter a phone number first.', 'warning');
                return;
            }
            navigator.clipboard.writeText(link).then(() => {
                showToast('WhatsApp link copied to clipboard!', 'success');
            });
        });

        document.getElementById('phone').value = '15550192834';
        document.getElementById('msg').value = 'Hi! Reaching out regarding your services.';
        updateWhatsapp();
    }

    function renderMailtoLink(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <div style="max-width:400px; margin:0 auto; display:flex; flex-direction:column; gap:1rem;">
                    <input type="email" id="email" class="search-bar" placeholder="To: email@example.com">
                    <input type="text" id="sub" class="search-bar" placeholder="Subject">
                    <textarea id="msg" class="search-bar" rows="3" placeholder="Body Message"></textarea>
                    <button class="btn primary-btn" id="genBtn">Create Link</button>
                    <input type="text" id="out" class="search-bar" readonly placeholder="Result URL...">
                    <a id="testLink" href="#" target="_blank" rel="noopener noreferrer" class="btn primary-btn mt-2">Test Link</a>
                </div>
            </div>
        `;
        document.getElementById('genBtn').addEventListener('click', () => {
             const e = document.getElementById('email').value;
             const sub = encodeURIComponent(document.getElementById('sub').value);
             const msg = encodeURIComponent(document.getElementById('msg').value);
             const url = `mailto:${e}?subject=${sub}&body=${msg}`;
             document.getElementById('out').value = url;
             document.getElementById('testLink').href = url;
        });
    }

    function renderTelLink(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <div style="max-width:400px; margin:0 auto; display:flex; flex-direction:column; gap:1rem;">
                    <input type="text" id="phone" class="search-bar" placeholder="Phone Number (e.g. +1234567890)">
                    <button class="btn primary-btn" id="genBtn">Create Tel Link</button>
                    <div style="background:var(--card-bg); padding:1.5rem; border-radius:0.5rem;" id="resHtml">...</div>
                    <textarea id="out" class="search-bar" readonly placeholder="HTML Code..."></textarea>
                </div>
            </div>
        `;
        document.getElementById('genBtn').addEventListener('click', () => {
             const p = document.getElementById('phone').value;
             const clean = p.replace(/[^0-9+]/g, '');
             const code = `<a href="tel:${clean}">${escapeHtml(p)}</a>`;
             document.getElementById('out').value = code;
             const resHtml = document.getElementById('resHtml');
             resHtml.textContent = '';
             const link = document.createElement('a');
             link.href = 'tel:' + clean;
             link.textContent = p;
             resHtml.appendChild(link);
        });
    }

    function renderPdfCounter(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="pdfFileInput" accept="application/pdf" class="search-bar" multiple>
                <div id="counterResults" class="mt-4" style="display:none; max-width:500px; margin:1rem auto 0 auto;"></div>
            </div>
        `;
        document.getElementById('pdfFileInput').addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;
            const resEl = document.getElementById('counterResults');
            resEl.style.display = 'block';
            resEl.innerHTML = '<p style="color:var(--text-muted);">Counting pages...</p>';

            try {
                await ensureLibraries(['pdfLib']);
                let totalPages = 0;
                let html = '<div style="background:var(--card-bg);border:1px solid var(--border-light);border-radius:12px;padding:1rem;text-align:left;">';
                for (const file of files) {
                    try {
                        const buf = await file.arrayBuffer();
                        const doc = await window.PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
                        const count = doc.getPageCount();
                        totalPages += count;
                        html += `<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border-light);font-size:0.9rem;">
                            <span style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:320px;">${escapeHtml(file.name)}</span>
                            <strong style="color:var(--primary);margin-left:1rem;">${count} pages</strong>
                        </div>`;
                    } catch (err) {
                        html += `<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border-light);color:#ef4444;font-size:0.9rem;">
                            <span>${escapeHtml(file.name)}</span>
                            <span>Error reading PDF</span>
                        </div>`;
                    }
                }
                html += `<div style="display:flex;justify-content:space-between;padding-top:0.75rem;font-size:1.1rem;font-weight:700;">
                    <span>Total Pages:</span>
                    <span style="color:var(--primary);">${totalPages}</span>
                </div></div>`;
                resEl.innerHTML = html;
            } catch (err) {
                console.error(err);
                showToast('Failed to count PDF pages: ' + err.message, 'error');
            }
        });
    }

    function renderVcardQr(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <div style="max-width:400px; margin:0 auto; display:flex; flex-direction:column; gap:0.75rem;">
                    <input type="text" id="fn" class="search-bar" placeholder="Full Name *">
                    <input type="text" id="org" class="search-bar" placeholder="Company / Organization">
                    <input type="text" id="tel" class="search-bar" placeholder="Phone Number">
                    <input type="email" id="em" class="search-bar" placeholder="Email Address">
                    <input type="text" id="url" class="search-bar" placeholder="Website URL">
                    <button class="btn primary-btn mt-2" id="genBtn">Generate vCard QR</button>
                    <div id="qrWrap" style="margin-top:1.5rem; display:none; flex-direction:column; align-items:center;">
                        <div id="qr" style="padding:1rem;background:#ffffff;border-radius:12px;box-shadow:var(--shadow-sm);display:inline-block;"></div>
                        <button class="btn mt-3" id="downloadVcardBtn" style="background:var(--bg-subtle);color:var(--text-color);border:1px solid var(--border-light);font-size:0.85rem;">
                            Download PNG
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('genBtn').addEventListener('click', async () => {
            const fn = document.getElementById('fn').value.trim();
            const org = document.getElementById('org').value.trim();
            const tel = document.getElementById('tel').value.trim();
            const em = document.getElementById('em').value.trim();
            const url = document.getElementById('url').value.trim();
            if (!fn) return showToast('Full Name is required for vCard.', 'warning');

            try {
                await ensureLibraries(['qrcode']);
                const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${fn}\nORG:${org}\nTEL:${tel}\nEMAIL:${em}\nURL:${url}\nEND:VCARD`;
                const qrContainer = document.getElementById('qr');
                qrContainer.innerHTML = '';

                new window.QRCode(qrContainer, {
                    text: vcard,
                    width: 250,
                    height: 250,
                    correctLevel: window.QRCode.CorrectLevel.M
                });

                document.getElementById('qrWrap').style.display = 'flex';
                showToast('Contact vCard QR code generated!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Failed to generate vCard QR: ' + err.message, 'error');
            }
        });

        document.getElementById('downloadVcardBtn').addEventListener('click', () => {
            const cvs = document.querySelector('#qr canvas');
            const img = document.querySelector('#qr img');
            const dataUrl = cvs ? cvs.toDataURL('image/png') : (img ? img.src : '');
            if (!dataUrl) return;
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'contact_vcard_qr.png';
            a.click();
        });
    }

    function renderCssBeautifier(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:10px;">
                    <div style="display:flex; gap:8px;">
                        <button class="btn" id="loadSampleCss" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Load Sample CSS
                        </button>
                        <button class="btn" id="clearCss" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Clear
                        </button>
                    </div>
                    <select id="cssIndent" class="search-bar" style="width:auto; padding:0.3rem 0.6rem; font-size:0.85rem;">
                        <option value="2" selected>2 Spaces</option>
                        <option value="4">4 Spaces</option>
                    </select>
                </div>
                <textarea id="tIn" class="search-bar" style="width:100%; font-family:monospace; font-size:0.875rem;" rows="8" placeholder="Paste unformatted or minified CSS here..."></textarea>
                <div class="mt-4 text-center">
                    <button class="btn primary-btn" id="actionBtn">Beautify CSS</button>
                </div>
                <div id="cssOutWrap" style="display:none; margin-top:1.5rem;">
                    <div style="display:flex; justify-content:flex-end; margin-bottom:0.5rem;">
                        <button class="btn" id="copyCssBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Copy CSS
                        </button>
                    </div>
                    <textarea id="tOut" class="search-bar" style="width:100%; font-family:monospace; font-size:0.875rem; background:var(--card-bg);" rows="12" readonly></textarea>
                </div>
            </div>
        `;

        const sample = '.btn{display:inline-flex;align-items:center;padding:0.75rem 1.5rem;background:#06b6d4;color:#fff;border-radius:8px;font-weight:600;transition:all .2s ease}.btn:hover{background:#0891b2;transform:translateY(-1px)}.card{background:rgba(30,41,59,.45);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(16px)}';

        function beautifyCss(css, indentSize) {
            const indent = ' '.repeat(indentSize);
            let s = css.replace(/\s+/g, ' ')
                       .replace(/\s*{\s*/g, ' {\n')
                       .replace(/;\s*/g, ';\n')
                       .replace(/\s*}\s*/g, '\n}\n\n')
                       .trim();
            const lines = s.split('\n');
            let depth = 0;
            return lines.map(line => {
                line = line.trim();
                if (!line) return '';
                if (line.endsWith('}')) depth = Math.max(0, depth - 1);
                const res = indent.repeat(depth) + line;
                if (line.endsWith('{')) depth++;
                return res;
            }).filter(Boolean).join('\n');
        }

        document.getElementById('actionBtn').addEventListener('click', () => {
            const raw = document.getElementById('tIn').value;
            if (!raw.trim()) return showToast('Please enter CSS to beautify.', 'warning');
            const indent = parseInt(document.getElementById('cssIndent').value, 10);
            const res = beautifyCss(raw, indent);
            document.getElementById('tOut').value = res;
            document.getElementById('cssOutWrap').style.display = 'block';
            showToast('CSS beautified successfully!', 'success');
        });

        document.getElementById('loadSampleCss').addEventListener('click', () => {
            document.getElementById('tIn').value = sample;
            document.getElementById('actionBtn').click();
        });

        document.getElementById('clearCss').addEventListener('click', () => {
            document.getElementById('tIn').value = '';
            document.getElementById('tOut').value = '';
            document.getElementById('cssOutWrap').style.display = 'none';
        });

        document.getElementById('copyCssBtn').addEventListener('click', () => {
            const out = document.getElementById('tOut').value;
            if (!out) return;
            navigator.clipboard.writeText(out).then(() => showToast('CSS copied to clipboard!', 'success'));
        });
    }

    function renderJsBeautifier(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:10px;">
                    <div style="display:flex; gap:8px;">
                        <button class="btn" id="loadSampleJs" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Load Sample JS
                        </button>
                        <button class="btn" id="clearJs" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Clear
                        </button>
                    </div>
                    <select id="jsIndent" class="search-bar" style="width:auto; padding:0.3rem 0.6rem; font-size:0.85rem;">
                        <option value="2">2 Spaces</option>
                        <option value="4" selected>4 Spaces</option>
                    </select>
                </div>
                <textarea id="tIn" class="search-bar" style="width:100%; font-family:monospace; font-size:0.875rem;" rows="8" placeholder="Paste unformatted or minified JavaScript here..."></textarea>
                <div class="mt-4 text-center">
                    <button class="btn primary-btn" id="actionBtn">Beautify JavaScript</button>
                </div>
                <div id="jsOutWrap" style="display:none; margin-top:1.5rem;">
                    <div style="display:flex; justify-content:flex-end; margin-bottom:0.5rem;">
                        <button class="btn" id="copyJsBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Copy JavaScript
                        </button>
                    </div>
                    <textarea id="tOut" class="search-bar" style="width:100%; font-family:monospace; font-size:0.875rem; background:var(--card-bg);" rows="12" readonly></textarea>
                </div>
            </div>
        `;

        const sample = 'function calculateMetric(items,taxRate){let total=0;for(let i=0;i<items.length;i++){total+=items[i].price*items[i].qty;}const tax=total*(taxRate/100);return{subtotal:total,tax:tax,grandTotal:total+tax};}';

        function beautifyJs(code, indentSize) {
            const indent = ' '.repeat(indentSize);
            let s = code.replace(/\s*{\s*/g, ' {\n')
                        .replace(/;\s*/g, ';\n')
                        .replace(/\s*}\s*/g, '\n}\n')
                        .replace(/\n\s*\n/g, '\n');
            const lines = s.split('\n');
            let depth = 0;
            return lines.map(line => {
                line = line.trim();
                if (!line) return '';
                if (line.startsWith('}')) depth = Math.max(0, depth - 1);
                const res = indent.repeat(depth) + line;
                if (line.endsWith('{')) depth++;
                return res;
            }).filter(Boolean).join('\n');
        }

        document.getElementById('actionBtn').addEventListener('click', () => {
            const raw = document.getElementById('tIn').value;
            if (!raw.trim()) return showToast('Please enter JavaScript code.', 'warning');
            const indent = parseInt(document.getElementById('jsIndent').value, 10);
            const res = beautifyJs(raw, indent);
            document.getElementById('tOut').value = res;
            document.getElementById('jsOutWrap').style.display = 'block';
            showToast('JavaScript beautified successfully!', 'success');
        });

        document.getElementById('loadSampleJs').addEventListener('click', () => {
            document.getElementById('tIn').value = sample;
            document.getElementById('actionBtn').click();
        });

        document.getElementById('clearJs').addEventListener('click', () => {
            document.getElementById('tIn').value = '';
            document.getElementById('tOut').value = '';
            document.getElementById('jsOutWrap').style.display = 'none';
        });

        document.getElementById('copyJsBtn').addEventListener('click', () => {
            const out = document.getElementById('tOut').value;
            if (!out) return;
            navigator.clipboard.writeText(out).then(() => showToast('JavaScript copied to clipboard!', 'success'));
        });
    }

    function renderHtmlBeautifier(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:10px;">
                    <div style="display:flex; gap:8px;">
                        <button class="btn" id="loadSampleHtml" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Load Sample HTML
                        </button>
                        <button class="btn" id="clearHtml" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Clear
                        </button>
                    </div>
                    <select id="htmlIndent" class="search-bar" style="width:auto; padding:0.3rem 0.6rem; font-size:0.85rem;">
                        <option value="2" selected>2 Spaces</option>
                        <option value="4">4 Spaces</option>
                    </select>
                </div>
                <textarea id="tIn" class="search-bar" style="width:100%; font-family:monospace; font-size:0.875rem;" rows="8" placeholder="Paste unformatted or minified HTML here..."></textarea>
                <div class="mt-4 text-center">
                    <button class="btn primary-btn" id="actionBtn">Beautify HTML</button>
                </div>
                <div id="htmlOutWrap" style="display:none; margin-top:1.5rem;">
                    <div style="display:flex; justify-content:flex-end; margin-bottom:0.5rem;">
                        <button class="btn" id="copyHtmlBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Copy HTML
                        </button>
                    </div>
                    <textarea id="tOut" class="search-bar" style="width:100%; font-family:monospace; font-size:0.875rem; background:var(--card-bg);" rows="12" readonly></textarea>
                </div>
            </div>
        `;

        const sample = '<div class="hero"><header><h1>Welcome to 100ToolCrate</h1><p class="subtitle">Free, private, local developer tools</p></header><main><section class="features"><ul><li>Offline First</li><li>Instant Speed</li><li>Zero Trackers</li></ul></section></main></div>';

        function beautifyHtml(html, indentSize) {
            const indent = ' '.repeat(indentSize);
            const voidTags = ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr','!doctype'];
            let s = html.replace(/>\s*</g, '>\n<').trim();
            const lines = s.split('\n');
            let depth = 0;

            return lines.map(line => {
                line = line.trim();
                if (!line) return '';
                const isClosing = /^<\/[a-z0-9]+/i.test(line);
                const isOpening = /^<[a-z0-9]+/i.test(line);
                const isSelfClosing = /\/>$/.test(line);
                const tagNameMatch = line.match(/^<\/?([a-z0-9!]+)/i);
                const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';
                const isVoid = voidTags.includes(tagName);

                if (isClosing) depth = Math.max(0, depth - 1);
                const res = indent.repeat(depth) + line;
                if (isOpening && !isClosing && !isSelfClosing && !isVoid) {
                    depth++;
                }
                return res;
            }).join('\n');
        }

        document.getElementById('actionBtn').addEventListener('click', () => {
            const raw = document.getElementById('tIn').value;
            if (!raw.trim()) return showToast('Please enter HTML markup.', 'warning');
            const indent = parseInt(document.getElementById('htmlIndent').value, 10);
            const res = beautifyHtml(raw, indent);
            document.getElementById('tOut').value = res;
            document.getElementById('htmlOutWrap').style.display = 'block';
            showToast('HTML beautified successfully!', 'success');
        });

        document.getElementById('loadSampleHtml').addEventListener('click', () => {
            document.getElementById('tIn').value = sample;
            document.getElementById('actionBtn').click();
        });

        document.getElementById('clearHtml').addEventListener('click', () => {
            document.getElementById('tIn').value = '';
            document.getElementById('tOut').value = '';
            document.getElementById('htmlOutWrap').style.display = 'none';
        });

        document.getElementById('copyHtmlBtn').addEventListener('click', () => {
            const out = document.getElementById('tOut').value;
            if (!out) return;
            navigator.clipboard.writeText(out).then(() => showToast('HTML copied to clipboard!', 'success'));
        });
    }

    function renderPngToJpg(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="image/png" class="search-bar">
                <div id="preview" class="mt-4" style="display:none;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="convertBtn">Convert to JPG</button>
                </div>
                <div id="res" class="mt-4" style="display:flex; justify-content:center; flex-direction:column; align-items:center; gap:20px;"></div>
            </div>
        `;
        document.getElementById('inFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const p = document.getElementById('preview');
                p.style.display = 'block';
                p.querySelector('img').src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('convertBtn').addEventListener('click', () => {
            const file = document.getElementById('inFile').files[0];
            if (!file) return showToast('Select a PNG file', "warning");
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    const url = canvas.toDataURL('image/jpeg', 0.9);
                    document.getElementById('res').innerHTML = `<img src="${url}" style="max-width:100%;max-height:200px; border-radius:0.5rem;"><a href="${url}" download="converted.jpg" class="btn primary-btn">Download JPG</a>`;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function renderImageToWebp(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="image/png, image/jpeg" class="search-bar">
                <div id="preview" class="mt-4" style="display:none;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="convertBtn">Convert to WebP</button>
                </div>
                <div id="res" class="mt-4" style="display:flex; justify-content:center; flex-direction:column; align-items:center; gap:20px;"></div>
            </div>
        `;
        document.getElementById('inFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const p = document.getElementById('preview');
                p.style.display = 'block';
                p.querySelector('img').src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('convertBtn').addEventListener('click', () => {
            const file = document.getElementById('inFile').files[0];
            if (!file) return showToast('Select an image', "warning");
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const url = canvas.toDataURL('image/webp', 0.8);
                    document.getElementById('res').innerHTML = `<img src="${url}" style="max-width:100%;max-height:200px; border-radius:0.5rem;"><a href="${url}" download="converted.webp" class="btn primary-btn">Download WebP</a>`;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function renderWebpToJpg(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="image/webp" class="search-bar">
                <div id="preview" class="mt-4" style="display:none;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="convertBtn">Convert to JPG</button>
                </div>
                <div id="res" class="mt-4" style="display:flex; justify-content:center; flex-direction:column; align-items:center; gap:20px;"></div>
            </div>
        `;
        document.getElementById('inFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const p = document.getElementById('preview');
                p.style.display = 'block';
                p.querySelector('img').src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('convertBtn').addEventListener('click', () => {
            const file = document.getElementById('inFile').files[0];
            if (!file) return showToast('Select a WebP file', "warning");
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    const url = canvas.toDataURL('image/jpeg', 0.9);
                    document.getElementById('res').innerHTML = `<img src="${url}" style="max-width:100%;max-height:200px; border-radius:0.5rem;"><a href="${url}" download="converted.jpg" class="btn primary-btn">Download JPG</a>`;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Live crop interface helper
    // Tracks the currently-active crop session so its window-level pointer
    // listeners can be detached instead of accumulating across uses.
    let activeCropCleanup = null;

    function createLiveCrop(container, imgSrc, options = {}) {
        const opts = { ...options };
        // Tolerate a bare number (e.g. outputSize: 800) by normalizing to {width, height}
        if (typeof opts.outputSize === 'number' && Number.isFinite(opts.outputSize)) {
            opts.outputSize = { width: opts.outputSize, height: opts.outputSize };
        }
        const { circular = false, aspectRatio = null, outputSize = null } = opts;
        container.innerHTML = `
            <div class="live-crop-wrap" style="position:relative;display:inline-block;max-width:100%;max-height:500px;overflow:hidden;border-radius:0.5rem;user-select:none;touch-action:none;">
                <img class="crop-img" src="${imgSrc}" style="display:block;max-width:100%;max-height:500px;pointer-events:none;">
                <div class="crop-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"></div>
                <div class="crop-box" style="position:absolute;border:2px dashed #fff;cursor:move;z-index:2;touch-action:none;${circular ? 'border-radius:50%;' : ''}">
                    <div class="crop-handle nw" style="position:absolute;width:24px;height:24px;background:#fff;border:3px solid #4f46e5;border-radius:50%;top:-12px;left:-12px;cursor:nw-resize;z-index:3;touch-action:none;"></div>
                    <div class="crop-handle ne" style="position:absolute;width:24px;height:24px;background:#fff;border:3px solid #4f46e5;border-radius:50%;top:-12px;right:-12px;cursor:ne-resize;z-index:3;touch-action:none;"></div>
                    <div class="crop-handle sw" style="position:absolute;width:24px;height:24px;background:#fff;border:3px solid #4f46e5;border-radius:50%;bottom:-12px;left:-12px;cursor:sw-resize;z-index:3;touch-action:none;"></div>
                    <div class="crop-handle se" style="position:absolute;width:24px;height:24px;background:#fff;border:3px solid #4f46e5;border-radius:50%;bottom:-12px;right:-12px;cursor:se-resize;z-index:3;touch-action:none;"></div>
                </div>
            </div>
            <div style="margin-top:1rem;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                <span class="crop-dims" style="color:var(--text-muted);font-size:0.875rem;align-self:center;"></span>
                <button class="btn primary-btn crop-confirm">Crop Image</button>
            </div>
        `;
        const wrap = container.querySelector('.live-crop-wrap');
        const img = container.querySelector('.crop-img');
        const box = container.querySelector('.crop-box');
        const overlay = container.querySelector('.crop-overlay');
        const dimsLabel = container.querySelector('.crop-dims');
        const confirmBtn = container.querySelector('.crop-confirm');

        function initCrop() {
            const iw = img.clientWidth || img.naturalWidth || 300;
            const ih = img.clientHeight || img.naturalHeight || 300;
            img.style.width = iw + 'px';
            img.style.height = ih + 'px';
            wrap.style.width = iw + 'px';
            wrap.style.height = ih + 'px';

            let cw, ch;
            if (aspectRatio) {
                if (iw / ih > aspectRatio) { ch = ih * 0.8; cw = ch * aspectRatio; }
                else { cw = iw * 0.8; ch = cw / aspectRatio; }
            } else {
                cw = iw * 0.6; ch = ih * 0.6;
            }
            let cx = (iw - cw) / 2, cy = (ih - ch) / 2;

            function updateBox() {
                box.style.left = cx + 'px';
                box.style.top = cy + 'px';
                box.style.width = cw + 'px';
                box.style.height = ch + 'px';
                const scaleX = (img.naturalWidth || iw) / iw;
                const scaleY = (img.naturalHeight || ih) / ih;
                dimsLabel.textContent = Math.round(cw * scaleX) + ' × ' + Math.round(ch * scaleY) + ' px';

                const cvs = document.createElement('canvas');
                cvs.width = iw; cvs.height = ih;
                const c = cvs.getContext('2d');
                c.fillStyle = 'rgba(0,0,0,0.55)';
                c.fillRect(0, 0, iw, ih);
                c.globalCompositeOperation = 'destination-out';
                if (circular) {
                    c.beginPath();
                    c.ellipse(cx + cw/2, cy + ch/2, cw/2, ch/2, 0, 0, Math.PI * 2);
                    c.fill();
                } else {
                    c.fillRect(cx, cy, cw, ch);
                }
                overlay.style.background = 'url(' + cvs.toDataURL() + ') no-repeat center/cover';
            }
            updateBox();

            let dragging = false, resizing = null, startX = 0, startY = 0, startCX = 0, startCY = 0, startCW = 0, startCH = 0;
            const minSize = 30;

            function onPointerDown(e, handle) {
                e.preventDefault();
                e.stopPropagation();
                const rect = wrap.getBoundingClientRect();
                startX = e.clientX - rect.left;
                startY = e.clientY - rect.top;
                startCX = cx; startCY = cy; startCW = cw; startCH = ch;
                resizing = handle || null;
                dragging = !handle;
                try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
            }

            box.addEventListener('pointerdown', (e) => {
                if (!e.target.classList.contains('crop-handle')) {
                    onPointerDown(e);
                }
            });

            container.querySelectorAll('.crop-handle').forEach((h) => {
                const dir = h.classList.contains('nw') ? 'nw' : h.classList.contains('ne') ? 'ne' : h.classList.contains('sw') ? 'sw' : 'se';
                h.addEventListener('pointerdown', (e) => onPointerDown(e, dir));
            });

            function onPointerMove(e) {
                if (!dragging && !resizing) return;
                e.preventDefault();
                const rect = wrap.getBoundingClientRect();
                const mx = e.clientX - rect.left;
                const my = e.clientY - rect.top;
                const dx = mx - startX;
                const dy = my - startY;

                if (dragging) {
                    cx = Math.max(0, Math.min(iw - cw, startCX + dx));
                    cy = Math.max(0, Math.min(ih - ch, startCY + dy));
                } else if (resizing) {
                    let ncx = startCX, ncy = startCY, ncw = startCW, nch = startCH;
                    if (resizing.includes('e')) ncw = Math.max(minSize, Math.min(iw - startCX, startCW + dx));
                    if (resizing.includes('w')) {
                        const maxW = startCX + startCW;
                        ncw = Math.max(minSize, Math.min(maxW, startCW - dx));
                        ncx = startCX + (startCW - ncw);
                    }
                    if (resizing.includes('s')) nch = Math.max(minSize, Math.min(ih - startCY, startCH + dy));
                    if (resizing.includes('n')) {
                        const maxH = startCY + startCH;
                        nch = Math.max(minSize, Math.min(maxH, startCH - dy));
                        ncy = startCY + (startCH - nch);
                    }
                    if (aspectRatio) {
                        if (resizing.includes('e') || resizing.includes('w')) nch = ncw / aspectRatio;
                        else ncw = nch * aspectRatio;
                    }
                    cx = ncx; cy = ncy; cw = ncw; ch = nch;
                }
                updateBox();
            }

            function onPointerUp(e) {
                dragging = false;
                resizing = null;
                try { if (e && e.target && e.target.releasePointerCapture) e.target.releasePointerCapture(e.pointerId); } catch (_) {}
            }

            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);

            const detachWindowListeners = () => {
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                window.removeEventListener('pointercancel', onPointerUp);
            };
            // Detach the previous session (if any) before wiring a new one
            if (typeof activeCropCleanup === 'function') {
                try { activeCropCleanup(); } catch (_) {}
            }
            activeCropCleanup = detachWindowListeners;

            confirmBtn.onclick = () => {
                const scaleX = (img.naturalWidth || iw) / iw;
                const scaleY = (img.naturalHeight || ih) / ih;
                const sx = Math.round(cx * scaleX);
                const sy = Math.round(cy * scaleY);
                const sw = Math.round(cw * scaleX);
                const sh = Math.round(ch * scaleY);

                const outCanvas = document.createElement('canvas');
                const finalW = outputSize ? outputSize.width : sw;
                const finalH = outputSize ? outputSize.height : sh;
                outCanvas.width = finalW;
                outCanvas.height = finalH;
                const outCtx = outCanvas.getContext('2d');

                if (circular) {
                    outCtx.beginPath();
                    outCtx.ellipse(finalW / 2, finalH / 2, finalW / 2, finalH / 2, 0, 0, Math.PI * 2);
                    outCtx.clip();
                }

                outCtx.drawImage(img, sx, sy, sw, sh, 0, 0, finalW, finalH);
                const croppedDataUrl = outCanvas.toDataURL('image/png');

                if (typeof options.onCrop === 'function') {
                    options.onCrop(croppedDataUrl, outCanvas);
                } else {
                    const resultDiv = container.querySelector('.crop-result') || document.createElement('div');
                    resultDiv.className = 'crop-result mt-4 text-center';
                    resultDiv.innerHTML = `
                        <p style="font-weight:600;margin-bottom:0.5rem;color:var(--text-color);">Cropped Preview (${finalW} × ${finalH}):</p>
                        <img src="${croppedDataUrl}" style="max-width:100%;max-height:260px;border-radius:${circular ? '50%' : '0.5rem'};box-shadow:var(--shadow-sm);"><br>
                        <a href="${croppedDataUrl}" download="cropped.png" class="btn primary-btn mt-3">Download Cropped Image</a>
                    `;
                    if (!container.querySelector('.crop-result')) {
                        container.appendChild(resultDiv);
                    }
                }
            };
        }

        if (img.complete) initCrop();
        else img.onload = initCrop;
    }

    function renderImageCropper(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="image/*" class="search-bar">
                <div id="cropArea" class="mt-4"></div>
            </div>
        `;
        document.getElementById('inFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                createLiveCrop(document.getElementById('cropArea'), ev.target.result);
            };
            reader.readAsDataURL(file);
        });
    }

    function renderProfilePictureMaker(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="image/*" class="search-bar">
                <div id="cropArea" class="mt-4"></div>
            </div>
        `;
        document.getElementById('inFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                createLiveCrop(document.getElementById('cropArea'), ev.target.result, {
                    circular: true,
                    aspectRatio: 1,
                    outputSize: { width: 800, height: 800 }
                });
            };
            reader.readAsDataURL(file);
        });
    }

    function renderPassportPhotoMaker(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="image/*" class="search-bar">
                <div id="preview" class="mt-4" style="display:none;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="convertBtn">Make Passport Size (2x2 inch)</button>
                </div>
                <div id="res" class="mt-4" style="display:flex; justify-content:center; flex-direction:column; align-items:center; gap:20px;"></div>
            </div>
        `;
        document.getElementById('inFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const p = document.getElementById('preview');
                p.style.display = 'block';
                p.querySelector('img').src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('convertBtn').addEventListener('click', () => {
            const file = document.getElementById('inFile').files[0];
            if (!file) return showToast('Select an image', "warning");
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 600; // 2 inches at 300 DPI
                    canvas.height = 600;
                    const ctx = canvas.getContext('2d');
                    const size = Math.min(img.width, img.height);
                    const sx = (img.width - size) / 2;
                    const sy = (img.height - size) / 2;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, 600, 600);
                    ctx.drawImage(img, sx, sy, size, size, 0, 0, 600, 600);
                    const url = canvas.toDataURL('image/jpeg', 1.0);
                    document.getElementById('res').innerHTML = `<img src="${url}" style="max-width:100%;max-height:200px; border-radius:0.5rem;"><a href="${url}" download="passport.jpg" class="btn primary-btn">Download</a>`;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function renderGradientGeneratorImg(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <div style="display:flex; gap:10px; justify-content:center; align-items:center;" class="mt-4">
                    <input type="color" id="c1" value="#ff0000" class="search-bar" style="height:50px;">
                    <input type="color" id="c2" value="#0000ff" class="search-bar" style="height:50px;">
                </div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="convertBtn">Generate Gradient Image</button>
                </div>
                <div id="res" class="mt-4" style="display:flex; justify-content:center; flex-direction:column; align-items:center; gap:20px;"></div>
            </div>
        `;
        document.getElementById('convertBtn').addEventListener('click', () => {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');
            const grd = ctx.createLinearGradient(0, 0, 800, 600);
            grd.addColorStop(0, document.getElementById('c1').value);
            grd.addColorStop(1, document.getElementById('c2').value);
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, 800, 600);
            const url = canvas.toDataURL('image/jpeg', 0.9);
            document.getElementById('res').innerHTML = `<img src="${url}" style="max-width:100%;max-height:200px; border-radius:0.5rem;"><a href="${url}" download="gradient.jpg" class="btn primary-btn">Download Image</a>`;
        });
    }

    function renderImageFlip(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="image/*" class="search-bar">
                <div id="preview" class="mt-4" style="display:none;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                <div class="mt-4" style="display:flex; gap:10px; justify-content:center;">
                    <button class="btn primary-btn" id="flipHBtn">Flip Horizontal</button>
                    <button class="btn primary-btn" id="flipVBtn">Flip Vertical</button>
                </div>
                <div id="res" class="mt-4" style="display:flex; justify-content:center; flex-direction:column; align-items:center; gap:20px;"></div>
            </div>
        `;
        document.getElementById('inFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const p = document.getElementById('preview');
                p.style.display = 'block';
                p.querySelector('img').src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        const flip = (horiz) => {
            const file = document.getElementById('inFile').files[0];
            if (!file) return showToast('Select an image', "warning");
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.save();
                    if (horiz) {
                        ctx.translate(canvas.width, 0);
                        ctx.scale(-1, 1);
                    } else {
                        ctx.translate(0, canvas.height);
                        ctx.scale(1, -1);
                    }
                    ctx.drawImage(img, 0, 0);
                    ctx.restore();
                    const url = canvas.toDataURL('image/png');
                    document.getElementById('res').innerHTML = `<img src="${url}" style="max-width:100%;max-height:200px; border-radius:0.5rem;"><a href="${url}" download="flipped.png" class="btn primary-btn">Download</a>`;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        };
        document.getElementById('flipHBtn').addEventListener('click', () => flip(true));
        document.getElementById('flipVBtn').addEventListener('click', () => flip(false));
    }

    function renderImageWatermark(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <div style="display:flex; flex-direction:column; gap:1rem; max-width:400px; margin:0 auto;">
                    <input type="file" id="inFile" accept="image/*" class="search-bar">
                    <div id="preview" style="display:none;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                    <input type="text" id="wTxt" placeholder="Watermark Text" class="search-bar">
                    <div style="display:flex; align-items:center; gap:0.75rem; justify-content:center; flex-wrap:wrap; padding:0.75rem; background:var(--bg-color); border-radius:0.5rem; border:1px solid var(--border);">
                        <span style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Color</span>
                        <div id="colorOptions" style="display:flex; gap:0.4rem; align-items:center;">
                            <button type="button" class="wm-color-btn active" data-color="rgba(255,255,255,0.5)" style="width:30px;height:30px;border-radius:50%;border:3px solid var(--primary);background:#ffffff;cursor:pointer;box-shadow:0 0 0 1px var(--border);" title="White"></button>
                            <button type="button" class="wm-color-btn" data-color="rgba(0,0,0,0.5)" style="width:30px;height:30px;border-radius:50%;border:3px solid transparent;background:#000000;cursor:pointer;box-shadow:0 0 0 1px var(--border);" title="Black"></button>
                            <button type="button" class="wm-color-btn" data-color="rgba(239,68,68,0.5)" style="width:30px;height:30px;border-radius:50%;border:3px solid transparent;background:#ef4444;cursor:pointer;" title="Red"></button>
                            <button type="button" class="wm-color-btn" data-color="rgba(59,130,246,0.5)" style="width:30px;height:30px;border-radius:50%;border:3px solid transparent;background:#3b82f6;cursor:pointer;" title="Blue"></button>
                            <button type="button" class="wm-color-btn" data-color="rgba(16,185,129,0.5)" style="width:30px;height:30px;border-radius:50%;border:3px solid transparent;background:#10b981;cursor:pointer;" title="Green"></button>
                            <button type="button" class="wm-color-btn" data-color="rgba(245,158,11,0.5)" style="width:30px;height:30px;border-radius:50%;border:3px solid transparent;background:#f59e0b;cursor:pointer;" title="Yellow"></button>
                        </div>
                        <input type="color" id="wCustomColor" value="#ffffff" style="width:30px;height:30px;border:2px solid var(--border);border-radius:50%;cursor:pointer;padding:0;overflow:hidden;" title="Custom color">
                    </div>
                    <div style="display:flex; align-items:center; gap:0.75rem; justify-content:center; padding:0.5rem 0.75rem; background:var(--bg-color); border-radius:0.5rem; border:1px solid var(--border);">
                        <span style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Opacity</span>
                        <input type="range" id="wOpacity" min="0.1" max="1" step="0.1" value="0.5" style="flex:1;max-width:180px;">
                        <span id="wOpacityVal" style="font-size:0.85rem;color:var(--text-color);font-weight:600;min-width:2.5rem;">50%</span>
                    </div>
                    <button class="btn primary-btn" id="convertBtn">Add Watermark</button>
                </div>
                <div id="res" class="mt-4" style="display:flex; justify-content:center; flex-direction:column; align-items:center; gap:20px;"></div>
            </div>
        `;
        let sourceImage = null;
        let sourceUrl = '';
        let watermarkedUrl = '';
        let selectedColor = 'rgba(255,255,255,0.5)';

        function getWatermarkColor() {
            const opacity = parseFloat(document.getElementById('wOpacity').value);
            const match = selectedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (match) return `rgba(${match[1]},${match[2]},${match[3]},${opacity})`;
            return `rgba(255,255,255,${opacity})`;
        }

        const colorBtns = el.querySelectorAll('.wm-color-btn');
        colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                colorBtns.forEach(b => b.style.borderColor = 'transparent');
                btn.style.borderColor = 'var(--primary)';
                btn.classList.add('active');
                selectedColor = btn.getAttribute('data-color');
                renderWatermark(false);
            });
        });

        document.getElementById('wCustomColor').addEventListener('input', (e) => {
            const hex = e.target.value;
            const r = parseInt(hex.slice(1,3), 16);
            const g = parseInt(hex.slice(3,5), 16);
            const b = parseInt(hex.slice(5,7), 16);
            selectedColor = `rgba(${r},${g},${b},0.5)`;
            colorBtns.forEach(btn => btn.style.borderColor = 'transparent');
            e.target.style.borderColor = 'var(--primary)';
            renderWatermark(false);
        });

        document.getElementById('wOpacity').addEventListener('input', (e) => {
            document.getElementById('wOpacityVal').textContent = Math.round(e.target.value * 100) + '%';
            renderWatermark(false);
        });

        const renderWatermark = (showDownload) => {
            const preview = document.getElementById('preview');
            const result = document.getElementById('res');
            const text = document.getElementById('wTxt').value.trim();
            if (!sourceImage) return;
            if (!text) {
                watermarkedUrl = sourceUrl;
                preview.style.display = 'block';
                preview.querySelector('img').src = sourceUrl;
                if (showDownload) result.innerHTML = '<span style="color:var(--text-muted);">Enter watermark text to preview and download.</span>';
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = sourceImage.width;
            canvas.height = sourceImage.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(sourceImage, 0, 0);
            ctx.font = `${Math.max(20, sourceImage.width / 15)}px sans-serif`;
            ctx.fillStyle = getWatermarkColor();
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(text, sourceImage.width - 20, sourceImage.height - 20);
            watermarkedUrl = canvas.toDataURL('image/jpeg', 0.9);
            preview.style.display = 'block';
            preview.querySelector('img').src = watermarkedUrl;
            result.innerHTML = showDownload ? `<a href="${watermarkedUrl}" download="watermarked.jpg" class="btn primary-btn">Download</a>` : '';
        };
        document.getElementById('inFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            document.getElementById('res').innerHTML = '';
            const reader = new FileReader();
            reader.onload = (ev) => {
                sourceUrl = ev.target.result;
                sourceImage = new Image();
                sourceImage.onload = () => renderWatermark(false);
                sourceImage.src = sourceUrl;
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('wTxt').addEventListener('input', () => renderWatermark(false));
        document.getElementById('convertBtn').addEventListener('click', () => {
            if (!sourceImage) return showToast('Select an image', "warning");
            renderWatermark(true);
        });
    }

    function renderRemoveImageMetadata(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="image/*" class="search-bar">
                <div id="preview" class="mt-4" style="display:none;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="convertBtn">Remove EXIF / Metadata</button>
                </div>
                <div id="res" class="mt-4" style="display:flex; justify-content:center; flex-direction:column; align-items:center; gap:20px;"></div>
            </div>
        `;
        document.getElementById('inFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const p = document.getElementById('preview');
                p.style.display = 'block';
                p.querySelector('img').src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('convertBtn').addEventListener('click', () => {
            const file = document.getElementById('inFile').files[0];
            if (!file) return showToast('Select an image', "warning");
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const url = canvas.toDataURL('image/jpeg', 0.9);
                    document.getElementById('res').innerHTML = `<img src="${url}" style="max-width:100%;max-height:200px; border-radius:0.5rem;"><a href="${url}" download="cleaned.jpg" class="btn primary-btn">Download Clean Image</a>`;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function renderImageMetadataViewer(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="image/*" class="search-bar">
                <div id="preview" class="mt-4" style="display:none;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                <div id="res" class="mt-4 text-left" style="background:var(--card-bg); padding:1rem; border-radius:0.5rem; overflow-wrap:break-word;"></div>
            </div>
        `;
        document.getElementById('inFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const p = document.getElementById('preview');
            const reader = new FileReader();
            reader.onload = (re) => {
                p.style.display = 'block';
                p.querySelector('img').src = re.target.result;
                const img = new Image();
                img.onload = () => {
                    const res = document.getElementById('res');
                    res.innerHTML = `
                        <p><strong>Name:</strong> ${escapeHtml(file.name)}</p>
                        <p><strong>Type:</strong> ${escapeHtml(file.type)}</p>
                        <p><strong>Size:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
                        <p><strong>Last Modified:</strong> ${new Date(file.lastModified).toLocaleString()}</p>
                        <p><strong>Dimensions:</strong> ${img.width} x ${img.height} px</p>
                    `;
                };
                img.src = re.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function renderBlurFace(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="image/*" class="search-bar">
                <div id="preview" class="mt-4" style="display:none;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                <div class="mt-4" style="display:flex; justify-content:center; align-items:center; gap:1rem;">
                    <label>Blur Amount: <input type="range" id="blurAmt" min="1" max="20" value="5"></label>
                </div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Blur Entire Image</button>
                </div>
                <div id="res" class="mt-4" style="display:flex; justify-content:center; flex-direction:column; align-items:center; gap:20px;"></div>
                <p class="text-sm text-muted mt-2">Note: Performs a full image blur for privacy.</p>
            </div>
        `;
        let sourceImage = null;
        let blurredUrl = '';
        const renderBlurredImage = (showDownload) => {
            const result = document.getElementById('res');
            if (!sourceImage) return;
            const blur = document.getElementById('blurAmt').value;
            const canvas = document.createElement('canvas');
            canvas.width = sourceImage.width;
            canvas.height = sourceImage.height;
            const ctx = canvas.getContext('2d');
            ctx.filter = `blur(${blur}px)`;
            ctx.drawImage(sourceImage, 0, 0);
            blurredUrl = canvas.toDataURL();
            const preview = document.getElementById('preview');
            preview.style.display = 'block';
            preview.querySelector('img').src = blurredUrl;
            result.innerHTML = showDownload ? `<a href="${blurredUrl}" download="blurred.png" class="btn primary-btn">Download</a>` : '';
        };
        document.getElementById('inFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            document.getElementById('res').innerHTML = '';
            const reader = new FileReader();
            reader.onload = (ev) => {
                sourceImage = new Image();
                sourceImage.onload = () => renderBlurredImage(false);
                sourceImage.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('blurAmt').addEventListener('input', () => renderBlurredImage(false));
        document.getElementById('actionBtn').addEventListener('click', () => {
            if(!sourceImage) return showToast('Select image', "warning");
            renderBlurredImage(true);
        });
    }

    function renderPixelateImage(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="image/*" class="search-bar">
                <div id="preview" class="mt-4" style="display:none;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                <div class="mt-4" style="display:flex; justify-content:center; align-items:center; gap:1rem;">
                    <label>Pixel Size: <input type="range" id="pixSize" min="5" max="50" value="10"></label>
                </div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Pixelate Image</button>
                </div>
                <div id="res" class="mt-4" style="display:flex; justify-content:center; flex-direction:column; align-items:center; gap:20px;"></div>
            </div>
        `;
        let sourceImage = null;
        let pixelatedUrl = '';
        const renderPixelatedImage = (showDownload) => {
            const result = document.getElementById('res');
            if (!sourceImage) return;
            const pSize = parseInt(document.getElementById('pixSize').value);
            const canvas = document.createElement('canvas');
            canvas.width = sourceImage.width;
            canvas.height = sourceImage.height;
            const ctx = canvas.getContext('2d');
            const sw = Math.ceil(sourceImage.width / pSize);
            const sh = Math.ceil(sourceImage.height / pSize);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sourceImage, 0, 0, sw, sh);
            ctx.drawImage(canvas, 0, 0, sw, sh, 0, 0, canvas.width, canvas.height);
            pixelatedUrl = canvas.toDataURL();
            const preview = document.getElementById('preview');
            preview.style.display = 'block';
            preview.querySelector('img').src = pixelatedUrl;
            result.innerHTML = showDownload ? `<a href="${pixelatedUrl}" download="pixelated.png" class="btn primary-btn">Download</a>` : '';
        };
        document.getElementById('inFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            document.getElementById('res').innerHTML = '';
            const reader = new FileReader();
            reader.onload = (ev) => {
                sourceImage = new Image();
                sourceImage.onload = () => renderPixelatedImage(false);
                sourceImage.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('pixSize').addEventListener('input', () => renderPixelatedImage(false));
        document.getElementById('actionBtn').addEventListener('click', () => {
            if(!sourceImage) return showToast('Select image', "warning");
            renderPixelatedImage(true);
        });
    }

    function renderImagePalette(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="image/*" class="search-bar">
                <div id="preview" class="mt-4" style="display:none;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Extract Colors</button>
                </div>
                <div id="res" class="mt-4" style="display:flex; justify-content:center; flex-wrap:wrap; gap:10px;"></div>
            </div>
        `;
        document.getElementById('inFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const p = document.getElementById('preview');
                p.style.display = 'block';
                p.querySelector('img').src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('actionBtn').addEventListener('click', () => {
            const file = document.getElementById('inFile').files[0];
            if(!file) return showToast('Select image', "warning");
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width; canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
                    const colors = new Set();
                    // Sample ~50 pixels but never stall on small images (st must stay >= 4)
                    const totalPixels = data.length / 4;
                    const st = Math.max(4, Math.floor(totalPixels / 50) * 4);
                    for(let i=0; i<data.length && colors.size < 8; i+=st) {
                        if(colors.size >= 8) break;
                        const hex = "#" + ((1 << 24) + (data[i] << 16) + (data[i+1] << 8) + data[i+2]).toString(16).slice(1);
                        colors.add(hex);
                    }
                    let html = '';
                    colors.forEach(c => {
                        html += `<div style="width:60px; height:60px; background:${c}; border-radius:0.5rem; display:flex; align-items:flex-end; justify-content:center; color:#fff; text-shadow:0 0 2px #000; font-size:0.75rem; padding-bottom:5px;">${c}</div>`;
                    });
                    document.getElementById('res').innerHTML = html;
                };
                img.src = e.target.result;
            }
            reader.readAsDataURL(file);
        });
    }

    function renderGrayscaleImage(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="image/*" class="search-bar">
                <div id="preview" class="mt-4" style="display:none;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Convert to Grayscale</button>
                </div>
                <div id="res" class="mt-4" style="display:flex; justify-content:center; flex-direction:column; align-items:center; gap:20px;"></div>
            </div>
        `;
        let sourceImage = null;
        let grayscaleUrl = '';
        const renderGrayscalePreview = (showDownload) => {
            const result = document.getElementById('res');
            if (!sourceImage) return;
            const canvas = document.createElement('canvas');
            canvas.width = sourceImage.width;
            canvas.height = sourceImage.height;
            const ctx = canvas.getContext('2d');
            ctx.filter = 'grayscale(100%)';
            ctx.drawImage(sourceImage, 0, 0);
            grayscaleUrl = canvas.toDataURL();
            const preview = document.getElementById('preview');
            preview.style.display = 'block';
            preview.querySelector('img').src = grayscaleUrl;
            result.innerHTML = showDownload ? `<a href="${grayscaleUrl}" download="grayscale.png" class="btn primary-btn">Download</a>` : '';
        };
        document.getElementById('inFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            document.getElementById('res').innerHTML = '';
            const reader = new FileReader();
            reader.onload = (ev) => {
                sourceImage = new Image();
                sourceImage.onload = () => renderGrayscalePreview(false);
                sourceImage.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('actionBtn').addEventListener('click', () => {
            if(!sourceImage) return showToast('Select image', "warning");
            renderGrayscalePreview(true);
        });
    }

    function renderBgColorChanger(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="image/png" class="search-bar" placeholder="Select Transparent PNG">
                <p class="text-xs text-muted mb-4">(Recommended for transparent PNGs)</p>
                <div id="preview" class="mt-4" style="display:none;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                <div style="display:flex; justify-content:center; gap:10px; align-items:center;">
                    <label>BG Color: <input type="color" id="bgColor" value="#ff0000" class="search-bar" style="height:40px;"></label>
                </div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Apply Background Color</button>
                </div>
                <div id="res" class="mt-4" style="display:flex; justify-content:center; flex-direction:column; align-items:center; gap:20px;"></div>
            </div>
        `;
        let sourceImage = null;
        let bgChangedUrl = '';
        const renderBackgroundPreview = (showDownload) => {
            const result = document.getElementById('res');
            if (!sourceImage) return;
            const color = document.getElementById('bgColor').value;
            const canvas = document.createElement('canvas');
            canvas.width = sourceImage.width;
            canvas.height = sourceImage.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(sourceImage, 0, 0);
            bgChangedUrl = canvas.toDataURL('image/jpeg', 0.9);
            const preview = document.getElementById('preview');
            preview.style.display = 'block';
            preview.querySelector('img').src = bgChangedUrl;
            result.innerHTML = showDownload ? `<a href="${bgChangedUrl}" download="bg-changed.jpg" class="btn primary-btn">Download JPG</a>` : '';
        };
        document.getElementById('inFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            document.getElementById('res').innerHTML = '';
            const reader = new FileReader();
            reader.onload = (ev) => {
                sourceImage = new Image();
                sourceImage.onload = () => renderBackgroundPreview(false);
                sourceImage.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('bgColor').addEventListener('input', () => renderBackgroundPreview(false));
        document.getElementById('actionBtn').addEventListener('click', () => {
            if(!sourceImage) return showToast('Select image', "warning");
            renderBackgroundPreview(true);
        });
    }

    function renderTextDiff(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <textarea id="t1" class="search-bar" rows="6" style="flex:1;min-width:260px;" placeholder="Original text"></textarea>
                    <textarea id="t2" class="search-bar" rows="6" style="flex:1;min-width:260px;" placeholder="Changed text"></textarea>
                </div>
                <div class="mt-4 text-center">
                    <button class="btn primary-btn" id="actionBtn">Compare Lines</button>
                </div>
                <div id="res" class="mt-4 p-4 text-left" style="background:var(--card-bg); border-radius:0.5rem; border:1px solid var(--border-light); font-family:monospace; line-height:1.5; word-break:break-word; overflow-wrap:break-word; max-width:100%; overflow-x:auto;"></div>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', () => {
            const lines1 = document.getElementById('t1').value.split('\n');
            const lines2 = document.getElementById('t2').value.split('\n');
            let html = '';
            const max = Math.max(lines1.length, lines2.length);
            for (let i = 0; i < max; i++) {
                const l1 = lines1[i] !== undefined ? lines1[i] : null;
                const l2 = lines2[i] !== undefined ? lines2[i] : null;
                if (l1 === l2) {
                    html += `<div style="padding:1px 4px;">${escapeHtml(l1 ?? '')}</div>`;
                } else {
                    if (l1 !== null) {
                        html += `<div style="color:#ef4444; background:rgba(239, 68, 68, 0.12); padding:2px 4px; border-radius:4px; margin:1px 0;">- ${escapeHtml(l1)}</div>`;
                    }
                    if (l2 !== null) {
                        html += `<div style="color:#10b981; background:rgba(16, 185, 129, 0.12); padding:2px 4px; border-radius:4px; margin:1px 0;">+ ${escapeHtml(l2)}</div>`;
                    }
                }
            }
            document.getElementById('res').innerHTML = html || '<span class="text-muted">No text provided to compare.</span>';
        });
    }

    function renderSlugGenerator(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="text" id="tIn" class="search-bar" style="width:100%" placeholder="Type a title string here...">
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Generate Slug</button>
                </div>
                <textarea id="tOut" class="search-bar mt-4" style="width:100%" rows="2" readonly placeholder="your-url-friendly-slug"></textarea>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', () => {
            const t = document.getElementById('tIn').value;
            const slug = t.toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
            document.getElementById('tOut').value = slug;
        });
    }

    function renderCssMinifier(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <textarea id="tIn" class="search-bar" style="width:100%" rows="6" placeholder="Paste CSS here..."></textarea>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Minify CSS</button>
                </div>
                <textarea id="tOut" class="search-bar mt-4" style="width:100%" rows="6" readonly placeholder="Minified CSS..."></textarea>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', () => {
            let css = document.getElementById('tIn').value;
            css = css.replace(/\/\*[\s\S]*?\*\//g, ''); // remove comments
            css = css.replace(/\s+/g, ' '); // collapse space
            css = css.replace(/\s*([{}|;:,])\s*/g, '$1'); // remove space around tokens
            css = css.replace(/;\}/g, '}'); // remove trailing semicolon
            document.getElementById('tOut').value = css.trim();
        });
    }

    function renderJsMinifier(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <textarea id="tIn" class="search-bar" style="width:100%" rows="6" placeholder="Paste JavaScript here... (comments and whitespace are stripped safely; strings are never altered)"></textarea>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Minify JavaScript</button>
                </div>
                <textarea id="tOut" class="search-bar mt-4" style="width:100%" rows="6" readonly placeholder="Minified JS..."></textarea>
            </div>
        `;
        // Safe JS minifier: strips comments and collapses whitespace WITHOUT ever
        // touching string/template/regex literal contents and without fusing tokens.
        // Returns output that is semantically identical to the input.
        function minifyJsSafe(src) {
            const HUG = new Set(['{', '}', '(', ')', '[', ']', ';', ',', '.']);
            const REGEX_KW = new Set(['return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void', 'instanceof', 'throw', 'else', 'do', 'yield', 'await']);
            let out = '';
            let i = 0;
            const n = src.length;
            let prevTok = 'op'; // 'op' | 'value' — good enough to disambiguate regex vs division

            const pushCode = (code) => {
                // Collapse whitespace but PRESERVE newlines (ASI depends on them)
                let collapsed = code.replace(/\s+/g, (m) => (m.includes('\n') ? '\n' : ' '));
                // Remove spaces around safe punctuation (never affects token boundaries)
                collapsed = collapsed.replace(/ *([{}()\[\];,.]) */g, '$1');
                collapsed = collapsed.replace(/\n *([{}()\[\];,.]) */g, '\n$1');
                // If the chunk starts with a hug char, drop trailing spaces from the output
                if (collapsed && HUG.has(collapsed[0])) out = out.replace(/ +$/, '');
                out += collapsed;
            };

            while (i < n) {
                const ch = src[i];
                const next = src[i + 1];

                // Line comment: always a comment in JS, regardless of token state
                if (ch === '/' && next === '/') {
                    i += 2;
                    while (i < n && src[i] !== '\n') i++;
                    out += '\n';
                    continue;
                }
                // Block comment
                if (ch === '/' && next === '*') {
                    i += 2;
                    while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
                    i = Math.min(i + 2, n);
                    out += ' ';
                    continue;
                }
                // Strings and template literals: copy contents verbatim (respect escapes and ${} nesting)
                if (ch === "'" || ch === '"' || ch === '`') {
                    const quote = ch;
                    out += quote;
                    i++;
                    let depth = 0; // brace depth inside ${...} for templates
                    while (i < n) {
                        const c = src[i];
                        if (c === '\\') { out += c + (src[i + 1] || ''); i += 2; continue; }
                        if (quote === '`' && c === '$' && src[i + 1] === '{') { depth++; out += '${'; i += 2; continue; }
                        if (c === '}' && depth > 0) { depth--; out += c; i++; continue; }
                        if (c === quote && depth === 0) { out += c; i++; break; }
                        out += c; i++;
                    }
                    prevTok = 'value';
                    continue;
                }
                // Regex literal vs division. Only reachable where a value is not expected;
                // contents are copied verbatim either way and tokens are never fused, so
                // a detection miss cannot corrupt semantics.
                if (ch === '/' && prevTok !== 'value' && next !== '/' && next !== '*') {
                    out += ch; i++;
                    let inClass = false;
                    while (i < n) {
                        const c = src[i];
                        if (c === '\\') { out += c + (src[i + 1] || ''); i += 2; continue; }
                        if (c === '[') inClass = true;
                        else if (c === ']') inClass = false;
                        else if (c === '/' && !inClass) { out += '/'; i++; break; }
                        else if (c === '\n') { out += '\n'; break; } // unterminated regex: stop scan safely
                        out += c; i++;
                    }
                    while (i < n && /[a-z]/i.test(src[i])) { out += src[i]; i++; } // flags
                    prevTok = 'value';
                    continue;
                }
                // Numbers and identifiers/keywords form one word-token
                if (/[A-Za-z0-9_$]/.test(ch)) {
                    let word = '';
                    while (i < n && /[A-Za-z0-9_$]/.test(src[i])) { word += src[i]; i++; }
                    out += word;
                    prevTok = REGEX_KW.has(word) ? 'op' : 'value';
                    continue;
                }
                // Whitespace runs become a single space or newline
                if (/\s/.test(ch)) {
                    let ws = '';
                    while (i < n && /\s/.test(src[i])) { ws += src[i]; i++; }
                    pushCode(ws);
                    continue;
                }
                // Any other (operator/punctuation) chars are copied via pushCode
                pushCode(ch);
                prevTok = (ch === ')' || ch === ']' || ch === '}') ? 'value' : 'op';
                i++;
            }
            return out.replace(/ +\n/g, '\n').trim();
        }

        document.getElementById('actionBtn').addEventListener('click', async () => {
            const input = document.getElementById('tIn').value;
            if (!input.trim()) { showToast('Paste some JavaScript first.', 'warning'); return; }

            // Parse with Acorn instead of eval so validation works under a strict CSP.
            // If the parser cannot be loaded, minification still runs best-effort.
            try {
                await ensureLibraries(['acorn']);
                window.acorn.parse(input, {
                    ecmaVersion: 'latest',
                    sourceType: 'script',
                    allowReturnOutsideFunction: true
                });
            } catch (err) {
                if (err && typeof err.message === 'string' && err.message.startsWith('Failed to load library')) {
                    console.warn('Syntax validation skipped:', err.message);
                } else {
                    showToast('Syntax error: ' + err.message, 'error');
                    return;
                }
            }

            document.getElementById('tOut').value = minifyJsSafe(input);
        });
    }

    function renderHtmlMinifier(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <textarea id="tIn" class="search-bar" style="width:100%" rows="6" placeholder="Paste HTML here..."></textarea>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Minify HTML</button>
                </div>
                <textarea id="tOut" class="search-bar mt-4" style="width:100%" rows="6" readonly placeholder="Minified HTML..."></textarea>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', () => {
            const input = document.getElementById('tIn').value;
            if (!input.trim()) { showToast('Paste some HTML first.', 'warning'); return; }
            const PROTECTED = /(<pre\b[^>]*>[\s\S]*?<\/pre>|<textarea\b[^>]*>[\s\S]*?<\/textarea>|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>)/gi;
            const parts = input.split(PROTECTED);
            const out = parts.map((part, idx) => {
                if (idx % 2 === 1) return part; // protected block: verbatim
                let h = part.replace(/<!--(?!\[if)[\s\S]*?-->/g, ''); // strip comments, keep conditionals
                h = h.replace(/\s+/g, ' ');
                h = h.replace(/>\s+</g, '><');
                h = h.replace(/\s+>/g, '>');
                return h;
            }).join('');
            document.getElementById('tOut').value = out.trim();
        });
    }

    function renderRegexTester(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <div style="display:flex; gap:10px; align-items:center;">
                    <span style="font-size:1.5rem;font-weight:700;color:var(--text-muted);">/</span>
                    <input type="text" id="reg" class="search-bar" style="flex:1" placeholder="pattern (e.g. [a-z0-9]+)">
                    <span style="font-size:1.5rem;font-weight:700;color:var(--text-muted);">/</span>
                    <input type="text" id="flags" class="search-bar" style="width:70px" placeholder="gi" value="gi">
                </div>
                <textarea id="txt" class="search-bar mt-4" style="width:100%" rows="4" placeholder="Test string here..."></textarea>
                <div class="mt-4 text-center">
                    <button class="btn primary-btn" id="testBtn">Test Regex</button>
                </div>
                <div id="res" class="mt-4 p-4 text-left" style="background:var(--card-bg); border-radius:0.5rem; border:1px solid var(--border-light); word-break:break-all; min-height:50px;"></div>
            </div>
        `;
        document.getElementById('testBtn').addEventListener('click', () => {
            const pattern = document.getElementById('reg').value;
            let flags = document.getElementById('flags').value || '';
            const txt = document.getElementById('txt').value;

            if (!pattern) return showToast('Please enter a regular expression pattern.', 'warning');

            // Enforce 'g' flag so matchAll does not throw TypeError
            if (!flags.includes('g')) flags += 'g';

            try {
                const r = new RegExp(pattern, flags);
                const matches = [...txt.matchAll(r)];
                const resEl = document.getElementById('res');
                if (!matches.length) {
                    resEl.innerHTML = '<span class="text-muted">No matches found.</span>';
                } else {
                    let html = `<strong style="color:var(--primary);">Found ${matches.length} match(es):</strong><ul style="margin-top:0.5rem;padding-left:1.25rem;">`;
                    matches.forEach((m, i) => {
                        html += `<li style="margin-bottom:0.25rem;">#${i+1}: <code>${escapeHtml(m[0])}</code> <span class="text-muted" style="font-size:0.8rem;">(at index ${m.index})</span></li>`;
                    });
                    html += '</ul>';
                    resEl.innerHTML = html;
                }
            } catch (e) {
                document.getElementById('res').innerHTML = `<span style="color:var(--tertiary, #ef4444);">Invalid Regex: ${escapeHtml(e.message)}</span>`;
            }
        });
    }

    function renderColorConverter(el) {
        el.innerHTML = `
            <div class="tool-ui text-center" style="max-width:540px; margin:0 auto;">
                <div style="display:flex; justify-content:center; align-items:center; gap:1.25rem; margin-bottom:1.5rem; flex-wrap:wrap;">
                    <input type="color" id="nativePicker" value="#06b6d4" style="width:72px; height:72px; border:none; border-radius:12px; cursor:pointer; background:none;">
                    <div id="swatchPreview" style="flex:1; min-width:180px; height:72px; border-radius:12px; background:#06b6d4; display:flex; align-items:center; justify-content:center; box-shadow:var(--shadow-sm); border:1px solid var(--border-light);">
                        <span id="contrastText" style="font-weight:700; font-size:1rem; color:#0b0e14;">#06b6d4</span>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:0.75rem; text-align:left;">
                    <div class="color-row" style="display:flex; align-items:center; gap:8px;">
                        <span style="width:70px; font-weight:700; font-size:0.85rem; color:var(--text-muted);">HEX</span>
                        <input type="text" id="hexVal" class="search-bar" style="flex:1;" value="#06b6d4">
                        <button class="btn copy-color-btn" data-target="hexVal" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.4rem 0.75rem;">Copy</button>
                    </div>
                    <div class="color-row" style="display:flex; align-items:center; gap:8px;">
                        <span style="width:70px; font-weight:700; font-size:0.85rem; color:var(--text-muted);">RGB</span>
                        <input type="text" id="rgbVal" class="search-bar" style="flex:1;" value="rgb(6, 182, 212)">
                        <button class="btn copy-color-btn" data-target="rgbVal" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.4rem 0.75rem;">Copy</button>
                    </div>
                    <div class="color-row" style="display:flex; align-items:center; gap:8px;">
                        <span style="width:70px; font-weight:700; font-size:0.85rem; color:var(--text-muted);">HSL</span>
                        <input type="text" id="hslVal" class="search-bar" style="flex:1;" value="hsl(189, 95%, 43%)">
                        <button class="btn copy-color-btn" data-target="hslVal" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.4rem 0.75rem;">Copy</button>
                    </div>
                    <div class="color-row" style="display:flex; align-items:center; gap:8px;">
                        <span style="width:70px; font-weight:700; font-size:0.85rem; color:var(--text-muted);">HSV</span>
                        <input type="text" id="hsvVal" class="search-bar" style="flex:1;" value="hsv(189, 97%, 83%)">
                        <button class="btn copy-color-btn" data-target="hsvVal" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.4rem 0.75rem;">Copy</button>
                    </div>
                    <div class="color-row" style="display:flex; align-items:center; gap:8px;">
                        <span style="width:70px; font-weight:700; font-size:0.85rem; color:var(--text-muted);">CMYK</span>
                        <input type="text" id="cmykVal" class="search-bar" style="flex:1;" value="cmyk(97%, 14%, 0%, 17%)">
                        <button class="btn copy-color-btn" data-target="cmykVal" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.4rem 0.75rem;">Copy</button>
                    </div>
                    <div class="color-row" style="display:flex; align-items:center; gap:8px;">
                        <span style="width:70px; font-weight:700; font-size:0.85rem; color:var(--text-muted);">OKLCH</span>
                        <input type="text" id="oklchVal" class="search-bar" style="flex:1;" value="oklch(0.72 0.14 215)">
                        <button class="btn copy-color-btn" data-target="oklchVal" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.4rem 0.75rem;">Copy</button>
                    </div>
                </div>
            </div>
        `;

        function hexToRgb(h) {
            h = h.replace('#', '');
            if (h.length === 3) h = h.split('').map(c => c + c).join('');
            const num = parseInt(h, 16);
            if (isNaN(num)) return null;
            return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
        }

        function rgbToHex(r, g, b) {
            return '#' + [r, g, b].map(x => {
                const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        }

        function rgbToHsl(r, g, b) {
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            if (max === min) {
                h = s = 0;
            } else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch(max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
        }

        function rgbToHsv(r, g, b) {
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, s, v = max;
            const d = max - min;
            s = max === 0 ? 0 : d / max;
            if (max === min) {
                h = 0;
            } else {
                switch(max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
        }

        function rgbToCmyk(r, g, b) {
            let c = 1 - (r / 255);
            let m = 1 - (g / 255);
            let y = 1 - (b / 255);
            let k = Math.min(c, Math.min(m, y));
            if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
            c = Math.round(((c - k) / (1 - k)) * 100);
            m = Math.round(((m - k) / (1 - k)) * 100);
            y = Math.round(((y - k) / (1 - k)) * 100);
            k = Math.round(k * 100);
            return { c, m, y, k };
        }

        function rgbToOklch(r, g, b) {
            // Linearize sRGB
            const lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            const lr = lin(r / 255);
            const lg = lin(g / 255);
            const lb = lin(b / 255);

            const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
            const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
            const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

            const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
            const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
            const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

            const C = Math.sqrt(a * a + b_ * b_);
            let h = Math.atan2(b_, a) * (180 / Math.PI);
            if (h < 0) h += 360;

            return { l: L.toFixed(2), c: C.toFixed(2), h: Math.round(h) };
        }

        function updateAllFromRgb(r, g, b, source) {
            const hex = rgbToHex(r, g, b);
            const hsl = rgbToHsl(r, g, b);
            const hsv = rgbToHsv(r, g, b);
            const cmyk = rgbToCmyk(r, g, b);
            const oklch = rgbToOklch(r, g, b);

            if (source !== 'nativePicker') document.getElementById('nativePicker').value = hex;
            if (source !== 'hexVal') document.getElementById('hexVal').value = hex;
            if (source !== 'rgbVal') document.getElementById('rgbVal').value = `rgb(${r}, ${g}, ${b})`;
            if (source !== 'hslVal') document.getElementById('hslVal').value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
            if (source !== 'hsvVal') document.getElementById('hsvVal').value = `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`;
            if (source !== 'cmykVal') document.getElementById('cmykVal').value = `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;
            if (source !== 'oklchVal') document.getElementById('oklchVal').value = `oklch(${oklch.l} ${oklch.c} ${oklch.h})`;

            const swatch = document.getElementById('swatchPreview');
            swatch.style.background = hex;
            const text = document.getElementById('contrastText');
            text.textContent = hex;
            // Contrast text calculation
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            text.style.color = lum > 140 ? '#0b0e14' : '#ffffff';
        }

        document.getElementById('nativePicker').addEventListener('input', (e) => {
            const rgb = hexToRgb(e.target.value);
            if (rgb) updateAllFromRgb(rgb.r, rgb.g, rgb.b, 'nativePicker');
        });

        document.getElementById('hexVal').addEventListener('input', (e) => {
            const rgb = hexToRgb(e.target.value);
            if (rgb) updateAllFromRgb(rgb.r, rgb.g, rgb.b, 'hexVal');
        });

        document.querySelectorAll('.copy-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.target;
                const val = document.getElementById(id).value;
                navigator.clipboard.writeText(val).then(() => {
                    showToast(`Copied: ${val}`, 'success');
                });
            });
        });
    }

    function renderCssGradient(el) {
        el.innerHTML = `
            <div class="tool-ui text-center" style="max-width:580px; margin:0 auto;">
                <div style="margin-bottom:1.5rem;">
                    <p style="font-weight:700; margin-bottom:0.5rem; color:var(--text-color); font-size:0.9rem;">Modern Presets</p>
                    <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                        <button class="btn grad-preset" data-colors="#06b6d4,#8b5cf6" data-angle="135" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.35rem 0.75rem;">Obsidian Cyber</button>
                        <button class="btn grad-preset" data-colors="#8b5cf6,#ec4899" data-angle="90" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.35rem 0.75rem;">Hyper Violet</button>
                        <button class="btn grad-preset" data-colors="#f97316,#fb7185" data-angle="45" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.35rem 0.75rem;">Sunset Ember</button>
                        <button class="btn grad-preset" data-colors="#10b981,#06b6d4" data-angle="135" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.35rem 0.75rem;">Emerald Flux</button>
                    </div>
                </div>

                <div id="gradPreview" style="height:160px; border-radius:12px; margin-bottom:1.5rem; box-shadow:var(--shadow-sm); border:1px solid var(--border-light);"></div>

                <div style="display:flex; gap:12px; justify-content:center; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap;">
                    <div>
                        <label style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">Type:</label>
                        <select id="gradType" class="search-bar" style="width:auto; margin-left:6px;">
                            <option value="linear" selected>Linear</option>
                            <option value="radial">Radial</option>
                        </select>
                    </div>
                    <div id="angleRow" style="display:flex; align-items:center; gap:8px;">
                        <label style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">Angle: <span id="degVal">135°</span></label>
                        <input type="range" id="gradAngle" min="0" max="360" value="135" style="width:120px;">
                    </div>
                </div>

                <div style="display:flex; gap:16px; justify-content:center; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <label style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">Color 1:</label>
                        <input type="color" id="c1" value="#06b6d4" style="height:36px; width:48px; border:none; cursor:pointer;">
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <label style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">Color 2:</label>
                        <input type="color" id="c2" value="#8b5cf6" style="height:36px; width:48px; border:none; cursor:pointer;">
                    </div>
                </div>

                <div style="display:flex; gap:10px;">
                    <input type="text" id="cssOut" class="search-bar" style="flex:1; font-family:monospace; font-size:0.85rem;" readonly>
                    <button class="btn primary-btn" id="copyBtn">Copy CSS</button>
                </div>
            </div>
        `;

        function updateGrad() {
            const type = document.getElementById('gradType').value;
            const angle = document.getElementById('gradAngle').value;
            const c1 = document.getElementById('c1').value;
            const c2 = document.getElementById('c2').value;
            document.getElementById('degVal').textContent = angle + '°';

            let grad = '';
            if (type === 'linear') {
                grad = `linear-gradient(${angle}deg, ${c1}, ${c2})`;
            } else {
                grad = `radial-gradient(circle, ${c1}, ${c2})`;
            }

            document.getElementById('gradPreview').style.background = grad;
            document.getElementById('cssOut').value = `background: ${grad};`;
        }

        ['gradType', 'gradAngle', 'c1', 'c2'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                document.getElementById('angleRow').style.display = document.getElementById('gradType').value === 'linear' ? 'flex' : 'none';
                updateGrad();
            });
        });

        document.querySelectorAll('.grad-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const [c1, c2] = btn.dataset.colors.split(',');
                document.getElementById('c1').value = c1;
                document.getElementById('c2').value = c2;
                document.getElementById('gradAngle').value = btn.dataset.angle;
                document.getElementById('gradType').value = 'linear';
                document.getElementById('angleRow').style.display = 'flex';
                updateGrad();
                showToast(`Applied ${btn.textContent}`, 'info');
            });
        });

        document.getElementById('copyBtn').addEventListener('click', () => {
            const css = document.getElementById('cssOut').value;
            navigator.clipboard.writeText(css).then(() => showToast('CSS gradient copied!', 'success'));
        });

        updateGrad();
    }

    function renderBoxShadow(el) {
        el.innerHTML = `
            <div class="tool-ui text-center" style="max-width:580px; margin:0 auto;">
                <div style="margin-bottom:1.5rem;">
                    <p style="font-weight:700; margin-bottom:0.5rem; color:var(--text-color); font-size:0.9rem;">Modern Presets</p>
                    <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                        <button class="btn shadow-preset-btn" data-preset="subtle" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.35rem 0.75rem;">Subtle</button>
                        <button class="btn shadow-preset-btn" data-preset="dual" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.35rem 0.75rem;">Dual Light</button>
                        <button class="btn shadow-preset-btn" data-preset="elevated" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.35rem 0.75rem;">Elevated Float</button>
                        <button class="btn shadow-preset-btn" data-preset="glow" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.35rem 0.75rem;">Cyber Glow</button>
                        <button class="btn shadow-preset-btn" data-preset="inset" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; padding:0.35rem 0.75rem;">Inset Pill</button>
                    </div>
                </div>

                <div id="previewArea" style="height:180px; display:flex; align-items:center; justify-content:center; background:var(--bg-subtle); border-radius:12px; margin-bottom:1.5rem; border:1px solid var(--border-light);">
                    <div id="boxTarget" style="width:140px; height:90px; background:var(--card-bg); border-radius:12px; transition:box-shadow 0.15s ease; border:1px solid var(--border-light);"></div>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; text-align:left; margin-bottom:1.5rem;">
                    <div>
                        <label style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Horizontal (X): <span id="xVal">0px</span></label>
                        <input type="range" id="xOff" min="-50" max="50" value="0" class="w-full">
                    </div>
                    <div>
                        <label style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Vertical (Y): <span id="yVal">10px</span></label>
                        <input type="range" id="yOff" min="-50" max="50" value="10" class="w-full">
                    </div>
                    <div>
                        <label style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Blur Radius: <span id="blurVal">25px</span></label>
                        <input type="range" id="bRad" min="0" max="100" value="25" class="w-full">
                    </div>
                    <div>
                        <label style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Spread: <span id="spreadVal">0px</span></label>
                        <input type="range" id="sRad" min="-30" max="50" value="0" class="w-full">
                    </div>
                    <div>
                        <label style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Opacity: <span id="opVal">25%</span></label>
                        <input type="range" id="sOp" min="0" max="100" value="25" class="w-full">
                    </div>
                    <div style="display:flex; align-items:center; gap:12px; margin-top:1.2rem;">
                        <input type="color" id="sCol" value="#000000" style="height:36px; width:48px; border:none; cursor:pointer;">
                        <label style="font-size:0.85rem; cursor:pointer; display:flex; align-items:center; gap:6px;">
                            <input type="checkbox" id="isInset"> Inset Shadow
                        </label>
                    </div>
                </div>

                <div style="display:flex; gap:10px;">
                    <input type="text" id="cssOut" class="search-bar" style="flex:1; font-family:monospace; font-size:0.85rem;" readonly>
                    <button class="btn primary-btn" id="copyBtn">Copy CSS</button>
                </div>
            </div>
        `;

        function hexToRgba(hex, alpha) {
            let c = hex.replace('#', '');
            if (c.length === 3) c = c.split('').map(x => x + x).join('');
            const num = parseInt(c, 16);
            const r = (num >> 16) & 255;
            const g = (num >> 8) & 255;
            const b = num & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        let customShadow = '';

        function updateShadow() {
            if (customShadow) {
                document.getElementById('boxTarget').style.boxShadow = customShadow;
                document.getElementById('cssOut').value = `box-shadow: ${customShadow};`;
                return;
            }
            const x = document.getElementById('xOff').value;
            const y = document.getElementById('yOff').value;
            const b = document.getElementById('bRad').value;
            const s = document.getElementById('sRad').value;
            const op = document.getElementById('sOp').value / 100;
            const col = document.getElementById('sCol').value;
            const inset = document.getElementById('isInset').checked ? 'inset ' : '';

            document.getElementById('xVal').textContent = x + 'px';
            document.getElementById('yVal').textContent = y + 'px';
            document.getElementById('blurVal').textContent = b + 'px';
            document.getElementById('spreadVal').textContent = s + 'px';
            document.getElementById('opVal').textContent = Math.round(op * 100) + '%';

            const rgba = hexToRgba(col, op);
            const shadow = `${inset}${x}px ${y}px ${b}px ${s}px ${rgba}`;
            document.getElementById('boxTarget').style.boxShadow = shadow;
            document.getElementById('cssOut').value = `box-shadow: ${shadow};`;
        }

        ['xOff','yOff','bRad','sRad','sOp','sCol','isInset'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                customShadow = '';
                updateShadow();
            });
        });

        const presets = {
            subtle: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
            dual: '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            elevated: '0 20px 40px -15px rgba(0, 0, 0, 0.35)',
            glow: '0 0 25px rgba(6, 182, 212, 0.5), 0 0 10px rgba(139, 92, 246, 0.3)',
            inset: 'inset 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 0 8px rgba(255, 255, 255, 0.05)'
        };

        document.querySelectorAll('.shadow-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.preset;
                customShadow = presets[key];
                updateShadow();
                showToast(`Applied ${btn.textContent} preset`, 'info');
            });
        });

        document.getElementById('copyBtn').addEventListener('click', () => {
            const css = document.getElementById('cssOut').value;
            navigator.clipboard.writeText(css).then(() => showToast('CSS copied to clipboard!', 'success'));
        });

        updateShadow();
    }

    function renderBorderRadius(el) {
        el.innerHTML = `
            <div class="tool-ui" style="max-width:640px; margin:0 auto;">
                <!-- Live Morphing Preview -->
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:2rem; box-shadow:var(--shadow-sm); margin-bottom:1.5rem; display:flex; justify-content:center; align-items:center; min-height:260px;">
                    <div id="radiusPreview" style="width:180px; height:180px; background:linear-gradient(135deg, var(--primary-color), var(--secondary-color, #8B5CF6)); box-shadow:0 12px 24px rgba(0,0,0,0.15); transition:border-radius 0.1s ease; border:2px solid rgba(255,255,255,0.2);"></div>
                </div>

                <!-- Sliders Controls -->
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.5rem;">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                        <div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                                <label for="tl" style="font-size:0.85rem; font-weight:600;">Top-Left:</label>
                                <span id="tlVal" style="font-size:0.85rem; font-weight:700; font-family:monospace; color:var(--primary-color);">20px</span>
                            </div>
                            <input type="range" id="tl" min="0" max="100" value="20" style="width:100%; accent-color:var(--primary-color); cursor:pointer;">
                        </div>
                        <div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                                <label for="tr" style="font-size:0.85rem; font-weight:600;">Top-Right:</label>
                                <span id="trVal" style="font-size:0.85rem; font-weight:700; font-family:monospace; color:var(--primary-color);">20px</span>
                            </div>
                            <input type="range" id="tr" min="0" max="100" value="20" style="width:100%; accent-color:var(--primary-color); cursor:pointer;">
                        </div>
                        <div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                                <label for="bl" style="font-size:0.85rem; font-weight:600;">Bottom-Left:</label>
                                <span id="blVal" style="font-size:0.85rem; font-weight:700; font-family:monospace; color:var(--primary-color);">20px</span>
                            </div>
                            <input type="range" id="bl" min="0" max="100" value="20" style="width:100%; accent-color:var(--primary-color); cursor:pointer;">
                        </div>
                        <div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                                <label for="br" style="font-size:0.85rem; font-weight:600;">Bottom-Right:</label>
                                <span id="brVal" style="font-size:0.85rem; font-weight:700; font-family:monospace; color:var(--primary-color);">20px</span>
                            </div>
                            <input type="range" id="br" min="0" max="100" value="20" style="width:100%; accent-color:var(--primary-color); cursor:pointer;">
                        </div>
                    </div>
                </div>

                <!-- Generated CSS & Copy Button -->
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <span style="font-size:0.85rem; font-weight:600; color:var(--text-color);">CSS Output:</span>
                        <button class="btn" id="copyRadiusCssBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.35rem 0.8rem; border-radius:6px; cursor:pointer;">
                            Copy CSS
                        </button>
                    </div>
                    <input type="text" id="radiusOut" class="search-bar" readonly style="width:100%; font-family:monospace; font-size:0.95rem; background:var(--bg-color); border-radius:6px;">
                </div>
            </div>
        `;

        function updateRadius() {
            const tl = document.getElementById('tl').value || 0;
            const tr = document.getElementById('tr').value || 0;
            const br = document.getElementById('br').value || 0;
            const bl = document.getElementById('bl').value || 0;

            document.getElementById('tlVal').textContent = `${tl}px`;
            document.getElementById('trVal').textContent = `${tr}px`;
            document.getElementById('brVal').textContent = `${br}px`;
            document.getElementById('blVal').textContent = `${bl}px`;

            const val = `${tl}px ${tr}px ${br}px ${bl}px`;
            document.getElementById('radiusPreview').style.borderRadius = val;
            const css = `border-radius: ${val};`;
            document.getElementById('radiusOut').value = css;
        }

        ['tl', 'tr', 'br', 'bl'].forEach(id => {
            document.getElementById(id).addEventListener('input', updateRadius);
        });

        document.getElementById('copyRadiusCssBtn').addEventListener('click', () => {
            const css = document.getElementById('radiusOut').value;
            if (!css) return;
            navigator.clipboard.writeText(css).then(() => {
                showToast('Border-radius CSS copied to clipboard!', 'success');
            });
        });

        updateRadius();
    }

    function renderCssClamp(el) {
        el.innerHTML = `
            <div class="tool-ui" style="max-width:640px; margin:0 auto;">
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.5rem;">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                        <div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                                <label for="minW" style="font-size:0.85rem; font-weight:600;">Min Viewport (px):</label>
                                <span id="minWVal" style="font-size:0.85rem; font-weight:700; font-family:monospace; color:var(--primary-color);">320px</span>
                            </div>
                            <input type="range" id="minW" min="320" max="1920" step="10" value="320" style="width:100%; accent-color:var(--primary-color); cursor:pointer;">
                        </div>
                        <div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                                <label for="maxW" style="font-size:0.85rem; font-weight:600;">Max Viewport (px):</label>
                                <span id="maxWVal" style="font-size:0.85rem; font-weight:700; font-family:monospace; color:var(--primary-color);">1200px</span>
                            </div>
                            <input type="range" id="maxW" min="320" max="2560" step="10" value="1200" style="width:100%; accent-color:var(--primary-color); cursor:pointer;">
                        </div>
                        <div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                                <label for="minF" style="font-size:0.85rem; font-weight:600;">Min Size (rem):</label>
                                <span id="minFVal" style="font-size:0.85rem; font-weight:700; font-family:monospace; color:var(--primary-color);">1.0rem</span>
                            </div>
                            <input type="range" id="minF" min="0.5" max="4.0" step="0.1" value="1.0" style="width:100%; accent-color:var(--primary-color); cursor:pointer;">
                        </div>
                        <div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                                <label for="maxF" style="font-size:0.85rem; font-weight:600;">Max Size (rem):</label>
                                <span id="maxFVal" style="font-size:0.85rem; font-weight:700; font-family:monospace; color:var(--primary-color);">2.5rem</span>
                            </div>
                            <input type="range" id="maxF" min="0.5" max="5.0" step="0.1" value="2.5" style="width:100%; accent-color:var(--primary-color); cursor:pointer;">
                        </div>
                    </div>
                </div>

                <!-- Live Preview of Typography Scaling -->
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.5rem; box-shadow:var(--shadow-sm); margin-bottom:1.5rem; text-align:center;">
                    <div style="font-size:0.8rem; font-weight:600; color:var(--text-muted); margin-bottom:0.75rem; text-transform:uppercase; letter-spacing:0.5px;">Live Scaling Typography Preview</div>
                    <div id="clampPreviewText" style="font-weight:700; line-height:1.2; color:var(--text-color); transition:font-size 0.1s ease;">
                        Fluid Typography in Motion
                    </div>
                </div>

                <!-- Generated CSS & Copy Button -->
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <span style="font-size:0.85rem; font-weight:600; color:var(--text-color);">Generated CSS Clamp:</span>
                        <button class="btn" id="copyClampCssBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.35rem 0.8rem; border-radius:6px; cursor:pointer;">
                            Copy CSS
                        </button>
                    </div>
                    <input type="text" id="clampOut" class="search-bar" readonly style="width:100%; font-family:monospace; font-size:0.95rem; background:var(--bg-color); border-radius:6px;">
                </div>
            </div>
        `;

        function updateClamp() {
            const minW = parseFloat(document.getElementById('minW').value);
            let maxW = parseFloat(document.getElementById('maxW').value);
            const minF = parseFloat(document.getElementById('minF').value);
            let maxF = parseFloat(document.getElementById('maxF').value);

            // clamp() is only meaningful when max >= min. Slide the upper
            // bound along with the lower one instead of emitting invalid CSS.
            if (maxW <= minW) {
                maxW = Math.min(2560, minW + 10);
                document.getElementById('maxW').value = maxW;
            }
            if (maxF <= minF) {
                maxF = Math.min(5, Math.round((minF + 0.1) * 10) / 10);
                document.getElementById('maxF').value = maxF;
            }

            document.getElementById('minWVal').textContent = `${minW}px`;
            document.getElementById('maxWVal').textContent = `${maxW}px`;
            document.getElementById('minFVal').textContent = `${minF.toFixed(1)}rem`;
            document.getElementById('maxFVal').textContent = `${maxF.toFixed(1)}rem`;

            const diffW = maxW - minW || 1;
            const slope = (maxF - minF) / diffW;
            const yAxisIntersection = -minW * slope + minF;
            const vw = slope * 100;

            const clampRule = `font-size: clamp(${minF}rem, ${yAxisIntersection.toFixed(4)}rem + ${vw.toFixed(4)}vw, ${maxF}rem);`;
            document.getElementById('clampOut').value = clampRule;

            document.getElementById('clampPreviewText').style.fontSize = `clamp(${minF}rem, ${yAxisIntersection.toFixed(4)}rem + ${vw.toFixed(4)}vw, ${maxF}rem)`;
        }

        ['minW', 'maxW', 'minF', 'maxF'].forEach(id => {
            document.getElementById(id).addEventListener('input', updateClamp);
        });

        document.getElementById('copyClampCssBtn').addEventListener('click', () => {
            const css = document.getElementById('clampOut').value;
            if (!css) return;
            navigator.clipboard.writeText(css).then(() => {
                showToast('CSS Clamp copied to clipboard!', 'success');
            });
        });

        updateClamp();
    }

    function renderFlexboxPlay(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.5rem;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:12px; margin-bottom:1rem;">
                        <label style="font-size:0.85rem; font-weight:600;">Direction:
                            <select id="dir" class="search-bar mt-1" style="width:100%; padding:0.35rem 0.5rem; font-size:0.85rem;">
                                <option value="row">row</option>
                                <option value="row-reverse">row-reverse</option>
                                <option value="column">column</option>
                                <option value="column-reverse">column-reverse</option>
                            </select>
                        </label>
                        <label style="font-size:0.85rem; font-weight:600;">Justify Content:
                            <select id="jc" class="search-bar mt-1" style="width:100%; padding:0.35rem 0.5rem; font-size:0.85rem;">
                                <option value="flex-start">flex-start</option>
                                <option value="center">center</option>
                                <option value="flex-end">flex-end</option>
                                <option value="space-between">space-between</option>
                                <option value="space-around">space-around</option>
                                <option value="space-evenly">space-evenly</option>
                            </select>
                        </label>
                        <label style="font-size:0.85rem; font-weight:600;">Align Items:
                            <select id="ai" class="search-bar mt-1" style="width:100%; padding:0.35rem 0.5rem; font-size:0.85rem;">
                                <option value="stretch">stretch</option>
                                <option value="center">center</option>
                                <option value="flex-start">flex-start</option>
                                <option value="flex-end">flex-end</option>
                                <option value="baseline">baseline</option>
                            </select>
                        </label>
                        <label style="font-size:0.85rem; font-weight:600;">Flex Wrap:
                            <select id="wrap" class="search-bar mt-1" style="width:100%; padding:0.35rem 0.5rem; font-size:0.85rem;">
                                <option value="nowrap">nowrap</option>
                                <option value="wrap">wrap</option>
                                <option value="wrap-reverse">wrap-reverse</option>
                            </select>
                        </label>
                        <label style="font-size:0.85rem; font-weight:600;">Gap (px): <span id="gapVal">12</span>
                            <input type="range" id="gap" min="0" max="40" value="12" class="mt-1" style="width:100%; accent-color:var(--primary-color);">
                        </label>
                    </div>
                </div>

                <div style="margin-bottom:1.5rem;">
                    <div style="font-size:0.85rem; font-weight:600; color:var(--text-muted); margin-bottom:0.5rem;">LIVE FLEXBOX PREVIEW:</div>
                    <div id="preview" style="display:flex; flex-direction:row; justify-content:flex-start; align-items:stretch; flex-wrap:nowrap; gap:12px; background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; min-height:200px; padding:1.25rem;">
                        <div style="background:var(--primary-color); color:#fff; padding:1.25rem; border-radius:8px; font-weight:700; min-width:60px; text-align:center; box-shadow:var(--shadow-sm);">1</div>
                        <div style="background:var(--primary-color); color:#fff; padding:1.25rem; border-radius:8px; font-weight:700; min-width:60px; text-align:center; box-shadow:var(--shadow-sm);">2</div>
                        <div style="background:var(--primary-color); color:#fff; padding:1.25rem; border-radius:8px; font-weight:700; min-width:60px; text-align:center; box-shadow:var(--shadow-sm);">3</div>
                        <div style="background:var(--primary-color); color:#fff; padding:1.25rem; border-radius:8px; font-weight:700; min-width:60px; text-align:center; box-shadow:var(--shadow-sm);">4</div>
                    </div>
                </div>

                <!-- Generated CSS Container -->
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <span style="font-size:0.85rem; font-weight:600; color:var(--text-color);">Generated CSS:</span>
                        <button class="btn" id="copyFlexCssBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.35rem 0.8rem; border-radius:6px; cursor:pointer;">
                            Copy CSS
                        </button>
                    </div>
                    <textarea id="flexCssOut" class="search-bar" rows="6" readonly style="width:100%; font-family:monospace; font-size:0.88rem; background:var(--bg-color); border-radius:6px;"></textarea>
                </div>
            </div>
        `;

        function updateFlex() {
            const dir = document.getElementById('dir').value;
            const jc = document.getElementById('jc').value;
            const ai = document.getElementById('ai').value;
            const wrap = document.getElementById('wrap').value;
            const gap = document.getElementById('gap').value;

            document.getElementById('gapVal').textContent = gap;

            const preview = document.getElementById('preview');
            preview.style.flexDirection = dir;
            preview.style.justifyContent = jc;
            preview.style.alignItems = ai;
            preview.style.flexWrap = wrap;
            preview.style.gap = `${gap}px`;

            const css = `display: flex;\nflex-direction: ${dir};\njustify-content: ${jc};\nalign-items: ${ai};\nflex-wrap: ${wrap};\ngap: ${gap}px;`;
            document.getElementById('flexCssOut').value = css;
        }

        ['dir', 'jc', 'ai', 'wrap'].forEach(id => {
            document.getElementById(id).addEventListener('change', updateFlex);
        });
        document.getElementById('gap').addEventListener('input', updateFlex);

        document.getElementById('copyFlexCssBtn').addEventListener('click', () => {
            const css = document.getElementById('flexCssOut').value;
            if (!css) return;
            navigator.clipboard.writeText(css).then(() => {
                showToast('Flexbox CSS copied to clipboard!', 'success');
            });
        });

        updateFlex();
    }

    function renderCssGrid(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.5rem;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:12px; margin-bottom:1rem;">
                        <label style="font-size:0.85rem; font-weight:600;">Columns: <span id="colsVal">3</span>
                            <input type="range" id="cols" min="1" max="6" value="3" class="mt-1" style="width:100%; accent-color:var(--primary-color);">
                        </label>
                        <label style="font-size:0.85rem; font-weight:600;">Rows: <span id="rowsVal">2</span>
                            <input type="range" id="rows" min="1" max="4" value="2" class="mt-1" style="width:100%; accent-color:var(--primary-color);">
                        </label>
                        <label style="font-size:0.85rem; font-weight:600;">Gap (px): <span id="gapVal">16</span>
                            <input type="range" id="gap" min="0" max="40" value="16" class="mt-1" style="width:100%; accent-color:var(--primary-color);">
                        </label>
                        <label style="font-size:0.85rem; font-weight:600;">Justify Items:
                            <select id="ji" class="search-bar mt-1" style="width:100%; padding:0.35rem 0.5rem; font-size:0.85rem;">
                                <option value="stretch">stretch</option>
                                <option value="start">start</option>
                                <option value="center">center</option>
                                <option value="end">end</option>
                            </select>
                        </label>
                        <label style="font-size:0.85rem; font-weight:600;">Align Items:
                            <select id="ai" class="search-bar mt-1" style="width:100%; padding:0.35rem 0.5rem; font-size:0.85rem;">
                                <option value="stretch">stretch</option>
                                <option value="start">start</option>
                                <option value="center">center</option>
                                <option value="end">end</option>
                            </select>
                        </label>
                    </div>
                </div>

                <div style="margin-bottom:1.5rem;">
                    <div style="font-size:0.85rem; font-weight:600; color:var(--text-muted); margin-bottom:0.5rem;">LIVE GRID PREVIEW:</div>
                    <div id="preview" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; min-height:180px;">
                    </div>
                </div>

                <!-- Generated CSS Container -->
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <span style="font-size:0.85rem; font-weight:600; color:var(--text-color);">Generated CSS:</span>
                        <button class="btn" id="copyGridCssBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.35rem 0.8rem; border-radius:6px; cursor:pointer;">
                            Copy CSS
                        </button>
                    </div>
                    <textarea id="gridCssOut" class="search-bar" rows="5" readonly style="width:100%; font-family:monospace; font-size:0.88rem; background:var(--bg-color); border-radius:6px;"></textarea>
                </div>
            </div>
        `;

        function updateGrid() {
            const cols = document.getElementById('cols').value;
            const rows = document.getElementById('rows').value;
            const gap = document.getElementById('gap').value;
            const ji = document.getElementById('ji').value;
            const ai = document.getElementById('ai').value;

            document.getElementById('colsVal').textContent = cols;
            document.getElementById('rowsVal').textContent = rows;
            document.getElementById('gapVal').textContent = gap;

            const preview = document.getElementById('preview');
            preview.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
            preview.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
            preview.style.gap = `${gap}px`;
            preview.style.justifyItems = ji;
            preview.style.alignItems = ai;

            // Generate preview items matching cols * rows
            const totalItems = cols * rows;
            preview.innerHTML = '';
            for (let i = 1; i <= totalItems; i++) {
                const item = document.createElement('div');
                item.style.cssText = 'background:var(--primary-color); color:#fff; border-radius:8px; padding:1rem; font-weight:600; text-align:center; min-height:48px; display:flex; align-items:center; justify-content:center; box-shadow:var(--shadow-sm);';
                item.textContent = `Item ${i}`;
                preview.appendChild(item);
            }

            const css = `display: grid;\ngrid-template-columns: repeat(${cols}, 1fr);\ngrid-template-rows: repeat(${rows}, 1fr);\ngap: ${gap}px;\njustify-items: ${ji};\nalign-items: ${ai};`;
            document.getElementById('gridCssOut').value = css;
        }

        ['cols', 'rows', 'gap'].forEach(id => {
            document.getElementById(id).addEventListener('input', updateGrid);
        });
        ['ji', 'ai'].forEach(id => {
            document.getElementById(id).addEventListener('change', updateGrid);
        });

        document.getElementById('copyGridCssBtn').addEventListener('click', () => {
            const css = document.getElementById('gridCssOut').value;
            if (!css) return;
            navigator.clipboard.writeText(css).then(() => {
                showToast('Grid CSS copied to clipboard!', 'success');
            });
        });

        updateGrid();
    }

    function renderQrScanner(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <p style="color:var(--text-muted);font-size:0.9rem;">Upload or drag-and-drop a QR code image to decode it locally in your browser.</p>
                <input type="file" id="inFile" accept="image/*" class="search-bar mt-4">
                <div id="qrPreview" class="mt-4" style="display:none;text-align:center;">
                    <img alt="Selected QR code preview" style="max-width:100%;max-height:220px;border-radius:8px;box-shadow:var(--shadow-sm);">
                </div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Decode QR Code</button>
                </div>
                <div id="resWrap" style="display:none;margin-top:1.5rem;max-width:500px;margin-left:auto;margin-right:auto;">
                    <div style="display:flex;justify-content:flex-end;margin-bottom:0.5rem;">
                        <button class="btn" id="copyDecodedBtn" style="background:var(--bg-subtle);color:var(--text-color);border:1px solid var(--border-light);font-size:0.85rem;padding:0.4rem 0.8rem;">
                            Copy Decoded Text
                        </button>
                    </div>
                    <textarea id="res" class="search-bar" style="width:100%;font-family:monospace;font-size:0.9rem;" rows="4" readonly></textarea>
                </div>
            </div>
        `;

        const fileInput = document.getElementById('inFile');
        const preview = document.getElementById('qrPreview');
        const previewImg = preview.querySelector('img');
        const resWrap = document.getElementById('resWrap');
        const resArea = document.getElementById('res');

        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            resWrap.style.display = 'none';
            resArea.value = '';
            if (!file) {
                preview.style.display = 'none';
                previewImg.removeAttribute('src');
                return;
            }
            previewImg.src = URL.createObjectURL(file);
            preview.style.display = 'block';
        });

        document.getElementById('actionBtn').addEventListener('click', async () => {
            const file = fileInput.files[0];
            if (!file) return showToast('Please select a QR code image first.', 'warning');

            const btn = document.getElementById('actionBtn');
            btn.disabled = true;
            btn.textContent = 'Decoding...';

            try {
                await ensureLibraries(['jsQR']);
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        const idata = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const code = window.jsQR(idata.data, idata.width, idata.height);
                        if (code && code.data) {
                            resArea.value = code.data;
                            resWrap.style.display = 'block';
                            showToast('QR code successfully decoded!', 'success');
                        } else {
                            showToast('No QR code detected in the image. Try a clearer image.', 'warning');
                        }
                        btn.disabled = false;
                        btn.textContent = 'Decode QR Code';
                    };
                    img.onerror = () => {
                        showToast('Error loading image.', 'error');
                        btn.disabled = false;
                        btn.textContent = 'Decode QR Code';
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } catch (err) {
                console.error(err);
                showToast('Failed to decode QR code: ' + err.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Decode QR Code';
            }
        });

        document.getElementById('copyDecodedBtn').addEventListener('click', () => {
            if (!resArea.value) return;
            navigator.clipboard.writeText(resArea.value).then(() => {
                showToast('Decoded text copied to clipboard!', 'success');
            }).catch(() => {
                resArea.select();
                document.execCommand('copy');
                showToast('Decoded text copied to clipboard!', 'success');
            });
        });
    }

    function renderShortLink(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="text" id="tIn" class="search-bar" style="width:100%" placeholder="Enter long URL...">
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Display Clean Link</button>
                </div>
                <div id="res" class="mt-4 p-4" style="background:var(--card-bg); border-radius:0.5rem; word-break:break-all;"></div>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', () => {
            const v = document.getElementById('tIn').value;
            if(!v) return;
            try {
                const u = new URL(v.startsWith('http') ? v : 'https://' + v);
                if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('unsupported protocol');
                const display = (u.hostname + u.pathname).replace(/\/$/, '');
                const href = escapeHtml(u.href);
                document.getElementById('res').innerHTML = `
                    <h3 style="margin-bottom:10px; color:var(--primary-color);">Clean View:</h3>
                    <a href="${href}" target="_blank" rel="noopener noreferrer" style="font-size:1.5rem; font-weight:bold; text-decoration:none; color:inherit;">${escapeHtml(display)}</a>
                    <p class="mt-2 text-muted">A cleaner way to share or display your link text.</p>
                `;
            } catch(e) {
                document.getElementById('res').innerHTML = '<span style="color:red;">Please enter a valid URL (http:// or https://)</span>';
            }
        });
    }

    function renderQrLabelMaker(el) {
        el.innerHTML = `
            <div class="tool-ui text-center" style="max-width:440px;margin:0 auto;">
                <input type="text" id="tIn" class="search-bar" style="width:100%" placeholder="Target URL or text for QR code *">
                <input type="text" id="tTitle" class="search-bar mt-3" style="width:100%" placeholder="Label Title (e.g. SCAN ME!)" value="SCAN ME!">
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn" style="width:100%;">Generate Label</button>
                </div>
                
                <div id="labelPreviewArea" style="display:none;margin-top:1.5rem;">
                    <div id="res" class="p-4 mx-auto" style="width:240px;background:#ffffff;border:2px dashed #94a3b8;border-radius:12px;color:#0f172a;box-shadow:var(--shadow-sm);">
                        <h3 id="lTitle" style="margin-bottom:12px;font-weight:700;font-size:1.2rem;letter-spacing:0.02em;">SCAN ME!</h3>
                        <div id="qrArea" style="display:flex;justify-content:center;"></div>
                        <p style="margin-top:10px;font-size:0.75rem;color:#64748b;font-weight:600;">100ToolCrate</p>
                    </div>
                    <div class="mt-4" style="display:flex;gap:10px;justify-content:center;">
                        <button class="btn" id="printLabelBtn" style="background:var(--bg-subtle);color:var(--text-color);border:1px solid var(--border-light);">Print Label</button>
                        <button class="btn primary-btn" id="downloadLabelBtn">Download PNG</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', async () => {
            const val = document.getElementById('tIn').value.trim();
            const title = document.getElementById('tTitle').value.trim() || 'SCAN ME!';
            if (!val) return showToast('Please enter a URL or text for the QR code.', 'warning');

            try {
                await ensureLibraries(['qrcode']);
                document.getElementById('lTitle').innerText = title;
                const qra = document.getElementById('qrArea');
                qra.innerHTML = '';
                new window.QRCode(qra, { text: val, width: 160, height: 160, correctLevel: window.QRCode.CorrectLevel.H });
                document.getElementById('labelPreviewArea').style.display = 'block';
                showToast('Label badge generated!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Failed to generate label: ' + err.message, 'error');
            }
        });

        document.getElementById('printLabelBtn').addEventListener('click', () => window.print());

        document.getElementById('downloadLabelBtn').addEventListener('click', () => {
            const qrCanvas = document.querySelector('#qrArea canvas');
            const qrImg = document.querySelector('#qrArea img');
            const title = document.getElementById('lTitle').innerText;

            const c = document.createElement('canvas');
            c.width = 400;
            c.height = 480;
            const ctx = c.getContext('2d');

            ctx.fillStyle = '#ffffff';
            ctx.roundRect ? ctx.roundRect(0, 0, c.width, c.height, 20) : ctx.rect(0, 0, c.width, c.height);
            ctx.fill();

            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 30px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(title, c.width / 2, 70);

            const qrSrc = qrCanvas || qrImg;
            if (qrSrc) {
                ctx.drawImage(qrSrc, (c.width - 260) / 2, 110, 260, 260);
            }

            ctx.fillStyle = '#64748b';
            ctx.font = '600 16px sans-serif';
            ctx.fillText('100ToolCrate', c.width / 2, 420);

            const a = document.createElement('a');
            a.href = c.toDataURL('image/png');
            a.download = 'qr_label.png';
            a.click();
        });
    }

    function renderUtmBuilder(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <div style="display:grid; grid-template-columns:1fr; gap:10px; text-align:left;">
                    <input type="text" id="u" class="search-bar" placeholder="Website URL (e.g. https://example.com)">
                    <input type="text" id="s" class="search-bar" placeholder="Campaign Source (e.g. google)">
                    <input type="text" id="m" class="search-bar" placeholder="Campaign Medium (e.g. cpc)">
                    <input type="text" id="c" class="search-bar" placeholder="Campaign Name (e.g. spring_sale)">
                </div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Generate UTM</button>
                </div>
                <textarea id="res" class="search-bar mt-4" style="width:100%" rows="3" readonly></textarea>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', () => {
            const u = document.getElementById('u').value;
            const s = document.getElementById('s').value;
            const m = document.getElementById('m').value;
            const c = document.getElementById('c').value;
            if(!u) return;
            try {
                const url = new URL(u.startsWith('http') ? u : 'http://'+u);
                if(s) url.searchParams.set('utm_source', s);
                if(m) url.searchParams.set('utm_medium', m);
                if(c) url.searchParams.set('utm_campaign', c);
                document.getElementById('res').value = url.href;
            } catch(e) {
                document.getElementById('res').value = "Invalid URL.";
            }
        });
    }

    function renderInvoiceGenerator(el) {
        el.innerHTML = `
            <div class="tool-ui" style="max-width:800px; margin:0 auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:10px;">
                    <div style="display:flex; gap:8px;">
                        <button class="btn" id="loadSampleInvoice" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Load Sample Invoice
                        </button>
                        <button class="btn" id="clearInvoice" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Reset
                        </button>
                    </div>
                    <button class="btn primary-btn" id="printInvoiceBtn">
                        🖨️ Print / Save as PDF
                    </button>
                </div>

                <!-- Printable Invoice Sheet -->
                <div id="invoiceSheet" style="background:#ffffff; color:#0f172a; border-radius:12px; padding:2rem; box-shadow:var(--shadow-sm); border:1px solid #e2e8f0; font-family:'Inter', sans-serif;">
                    <!-- Invoice Header -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:2rem; flex-wrap:wrap; gap:1.5rem;">
                        <div>
                            <h2 style="font-size:1.75rem; font-weight:800; color:#0f172a; margin-bottom:0.25rem;">INVOICE</h2>
                            <div style="display:flex; align-items:center; gap:6px; font-size:0.9rem; color:#64748b;">
                                <span>Invoice #:</span>
                                <input type="text" id="invNumber" value="INV-2026-001" style="border:1px dashed #cbd5e1; padding:2px 6px; font-size:0.85rem; border-radius:4px; font-weight:600; width:130px;">
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.85rem; color:#64748b;">Date: <input type="date" id="invDate" style="border:1px solid #cbd5e1; border-radius:4px; padding:2px 6px; font-size:0.85rem;"></div>
                            <div style="font-size:0.85rem; color:#64748b; margin-top:4px;">Due Date: <input type="date" id="invDueDate" style="border:1px solid #cbd5e1; border-radius:4px; padding:2px 6px; font-size:0.85rem;"></div>
                        </div>
                    </div>

                    <!-- From & Bill To -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:2rem; margin-bottom:2rem;">
                        <div>
                            <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Billed From</div>
                            <input type="text" id="fromName" value="Acme Digital Studio" style="width:100%; border:none; font-weight:700; font-size:0.95rem; margin-bottom:2px;"><br>
                            <input type="text" id="fromEmail" value="billing@acmestudio.com" style="width:100%; border:none; font-size:0.85rem; color:#64748b;"><br>
                            <input type="text" id="fromAddress" value="742 Evergreen Terrace, San Francisco, CA" style="width:100%; border:none; font-size:0.85rem; color:#64748b;">
                        </div>
                        <div>
                            <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Bill To Client</div>
                            <input type="text" id="toName" value="Global Horizons Inc." style="width:100%; border:none; font-weight:700; font-size:0.95rem; margin-bottom:2px;"><br>
                            <input type="text" id="toEmail" value="accounts@globalhorizons.com" style="width:100%; border:none; font-size:0.85rem; color:#64748b;"><br>
                            <input type="text" id="toAddress" value="100 Enterprise Way, Suite 400, New York, NY" style="width:100%; border:none; font-size:0.85rem; color:#64748b;">
                        </div>
                    </div>

                    <!-- Items Table -->
                    <table style="width:100%; border-collapse:collapse; margin-bottom:1.5rem;">
                        <thead>
                            <tr style="border-bottom:2px solid #e2e8f0; font-size:0.8rem; text-transform:uppercase; color:#64748b; text-align:left;">
                                <th style="padding:0.6rem 0.5rem; width:45%;">Description</th>
                                <th style="padding:0.6rem 0.5rem; width:15%; text-align:right;">Qty</th>
                                <th style="padding:0.6rem 0.5rem; width:20%; text-align:right;">Price ($)</th>
                                <th style="padding:0.6rem 0.5rem; width:15%; text-align:right;">Total ($)</th>
                                <th style="width:5%;" class="no-print"></th>
                            </tr>
                        </thead>
                        <tbody id="lineItemsBody"></tbody>
                    </table>

                    <button class="btn no-print" id="addLineItemBtn" style="background:#f1f5f9; color:#0f172a; border:1px dashed #cbd5e1; font-size:0.85rem; padding:0.4rem 0.8rem; margin-bottom:1.5rem;">
                        + Add Line Item
                    </button>

                    <!-- Summary & Totals -->
                    <div style="display:flex; justify-content:flex-end;">
                        <div style="width:280px; font-size:0.9rem;">
                            <div style="display:flex; justify-content:space-between; padding:0.4rem 0; color:#64748b;">
                                <span>Subtotal:</span>
                                <strong id="invSubtotal" style="color:#0f172a;">$0.00</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0; color:#64748b;">
                                <span>Tax (%):</span>
                                <input type="number" id="invTaxRate" value="10" min="0" max="100" style="width:60px; text-align:right; border:1px solid #cbd5e1; border-radius:4px; padding:2px 4px; font-size:0.85rem;">
                            </div>
                            <div style="display:flex; justify-content:space-between; padding:0.4rem 0; color:#64748b;">
                                <span>Tax Amount:</span>
                                <strong id="invTaxAmount" style="color:#0f172a;">$0.00</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0; color:#64748b;">
                                <span>Discount ($):</span>
                                <input type="number" id="invDiscount" value="0" min="0" style="width:70px; text-align:right; border:1px solid #cbd5e1; border-radius:4px; padding:2px 4px; font-size:0.85rem;">
                            </div>
                            <div style="display:flex; justify-content:space-between; border-top:2px solid #0f172a; padding:0.75rem 0; font-size:1.2rem; font-weight:800; color:#0f172a; margin-top:0.5rem;">
                                <span>Grand Total:</span>
                                <span id="invGrandTotal">$0.00</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Set today's date
        const now = new Date();
        document.getElementById('invDate').value = now.toISOString().split('T')[0];
        const due = new Date(); due.setDate(due.getDate() + 14);
        document.getElementById('invDueDate').value = due.toISOString().split('T')[0];

        let lineItems = [
            { desc: 'Web Application Design & Architecture', qty: 1, price: 2500 },
            { desc: 'Full-Stack Performance Optimization & Remediation', qty: 25, price: 80 }
        ];

        function renderRows() {
            const body = document.getElementById('lineItemsBody');
            body.innerHTML = '';
            lineItems.forEach((item, index) => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid #f1f5f9';
                const total = (item.qty * item.price);
                row.innerHTML = `
                    <td style="padding:0.6rem 0.5rem;">
                        <input type="text" class="item-desc" data-index="${index}" value="${escapeHtml(item.desc)}" style="width:100%; border:none; font-size:0.9rem; font-weight:500;">
                    </td>
                    <td style="padding:0.6rem 0.5rem; text-align:right;">
                        <input type="number" class="item-qty" data-index="${index}" value="${item.qty}" min="1" style="width:60px; text-align:right; border:1px solid #cbd5e1; border-radius:4px; padding:2px 4px; font-size:0.85rem;">
                    </td>
                    <td style="padding:0.6rem 0.5rem; text-align:right;">
                        <input type="number" class="item-price" data-index="${index}" value="${item.price}" min="0" step="any" style="width:80px; text-align:right; border:1px solid #cbd5e1; border-radius:4px; padding:2px 4px; font-size:0.85rem;">
                    </td>
                    <td style="padding:0.6rem 0.5rem; text-align:right; font-weight:700;">
                        $${total.toFixed(2)}
                    </td>
                    <td style="padding:0.6rem 0.5rem; text-align:center;" class="no-print">
                        <button class="btn-del-item" data-index="${index}" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.1rem; line-height:1;">&times;</button>
                    </td>
                `;
                body.appendChild(row);
            });
            calcTotals();
        }

        function calcTotals() {
            let subtotal = 0;
            lineItems.forEach(item => {
                subtotal += (item.qty * item.price);
            });
            const taxRate = parseFloat(document.getElementById('invTaxRate').value) || 0;
            const discount = parseFloat(document.getElementById('invDiscount').value) || 0;

            const taxAmt = subtotal * (taxRate / 100);
            const grandTotal = Math.max(0, subtotal + taxAmt - discount);

            document.getElementById('invSubtotal').textContent = '$' + subtotal.toFixed(2);
            document.getElementById('invTaxAmount').textContent = '$' + taxAmt.toFixed(2);
            document.getElementById('invGrandTotal').textContent = '$' + grandTotal.toFixed(2);
        }

        document.getElementById('lineItemsBody').addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.index, 10);
            if (isNaN(idx)) return;
            if (e.target.classList.contains('item-desc')) lineItems[idx].desc = e.target.value;
            if (e.target.classList.contains('item-qty')) lineItems[idx].qty = parseFloat(e.target.value) || 0;
            if (e.target.classList.contains('item-price')) lineItems[idx].price = parseFloat(e.target.value) || 0;
            calcTotals();
        });

        document.getElementById('lineItemsBody').addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-del-item');
            if (!btn) return;
            const idx = parseInt(btn.dataset.index, 10);
            lineItems.splice(idx, 1);
            renderRows();
        });

        document.getElementById('addLineItemBtn').addEventListener('click', () => {
            lineItems.push({ desc: 'New Service Item', qty: 1, price: 100 });
            renderRows();
        });

        document.getElementById('invTaxRate').addEventListener('input', calcTotals);
        document.getElementById('invDiscount').addEventListener('input', calcTotals);

        document.getElementById('printInvoiceBtn').addEventListener('click', () => {
            window.print();
        });

        document.getElementById('loadSampleInvoice').addEventListener('click', () => {
            lineItems = [
                { desc: 'Cloud Infrastructure Setup & Security Audit', qty: 1, price: 3200 },
                { desc: 'Frontend UI/UX Polish & Mobile Optimization', qty: 15, price: 120 },
                { desc: 'Continuous Integration & Automated QA Suite', qty: 1, price: 950 }
            ];
            document.getElementById('invTaxRate').value = 8.5;
            document.getElementById('invDiscount').value = 250;
            renderRows();
            showToast('Sample invoice loaded!', 'info');
        });

        document.getElementById('clearInvoice').addEventListener('click', () => {
            lineItems = [{ desc: '', qty: 1, price: 0 }];
            document.getElementById('invTaxRate').value = 0;
            document.getElementById('invDiscount').value = 0;
            renderRows();
        });

        renderRows();
    }

    function renderPdfMerger(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar" multiple>
                <div id="mergeQueue" class="pdf-merge-list mt-4" style="max-width:500px;margin:1rem auto 0 auto;"></div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Merge PDFs</button>
                </div>
            </div>
        `;

        const input = document.getElementById('inFile');
        const queueEl = document.getElementById('mergeQueue');
        let selectedFiles = [];

        function renderQueue() {
            queueEl.innerHTML = '';
            if (!selectedFiles.length) {
                queueEl.style.display = 'none';
                return;
            }
            queueEl.style.display = 'block';
            selectedFiles.forEach((file, index) => {
                const row = document.createElement('div');
                row.className = 'multi-file-list-row';
                row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0.75rem;margin-bottom:0.5rem;background:var(--card-bg);border:1px solid var(--border-light);border-radius:8px;';
                row.innerHTML = `
                    <div style="display:flex;align-items:center;gap:0.5rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        <span style="width:20px;height:20px;border-radius:50%;background:var(--primary);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">${index + 1}</span>
                        <span style="font-size:0.875rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(file.name)}</span>
                    </div>
                    <button type="button" class="btn-remove" data-index="${index}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.25rem;line-height:1;">&times;</button>
                `;
                queueEl.appendChild(row);
            });
        }

        input.addEventListener('change', () => {
            const rawFiles = Array.from(input.files || []);
            const zeroByte = rawFiles.find(f => f && f.size === 0);
            if (zeroByte) {
                showToast('Cannot process empty (0-byte) PDF file: "' + (zeroByte.name || 'document.pdf') + '".', 'warning');
            }
            const additions = rawFiles.filter(f => f && f.size > 0 && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)));
            selectedFiles.push(...additions);
            renderQueue();
            input.value = '';
        });

        queueEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-remove');
            if (!btn) return;
            const idx = parseInt(btn.dataset.index, 10);
            selectedFiles.splice(idx, 1);
            renderQueue();
        });

        document.getElementById('actionBtn').addEventListener('click', async () => {
            if (selectedFiles.length < 2) return showToast('Please select at least 2 PDF files to merge.', 'warning');
            if (selectedFiles.some(f => f.size === 0)) return showToast('Cannot process empty (0-byte) PDF files.', 'warning');
            const btn = document.getElementById('actionBtn');
            btn.disabled = true;
            btn.textContent = 'Merging PDFs...';

            try {
                await ensureLibraries(['pdfLib']);
                const mergedPdf = await window.PDFLib.PDFDocument.create();
                for (const file of selectedFiles) {
                    const buf = await file.arrayBuffer();
                    const pdf = await window.PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
                    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                    pages.forEach(p => mergedPdf.addPage(p));
                }
                const pdfBytes = await mergedPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'merged.pdf';
                a.click();
                showToast('PDFs merged successfully!', 'success');
            } catch (e) {
                console.error(e);
                showToast('Error merging PDFs: ' + (e.message || 'File may be corrupt.'), 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Merge PDFs';
            }
        });
    }

    function renderPdfSplitter(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar">
                <div class="mt-2 text-sm text-muted">Enter page numbers or ranges separated by commas (e.g. <strong>1-3, 5</strong>):</div>
                <input type="text" id="tRange" class="search-bar mt-2" placeholder="Example: 1-3, 5" style="max-width:320px;">
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Split & Download</button>
                </div>
                <div id="splitRes" class="mt-4" style="display:none;"></div>
            </div>
        `;

        function parseRange(str, max) {
            const indices = new Set();
            const parts = str.split(',').map(s => s.trim()).filter(Boolean);
            if (!parts.length) throw new Error('Please enter page numbers or a range (e.g. 1-3, 5).');
            for (const part of parts) {
                const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
                if (!match) throw new Error('Invalid format: "' + part + '". Use format like 1-3, 5.');
                const s = parseInt(match[1], 10);
                const e = match[2] ? parseInt(match[2], 10) : s;
                if (s < 1 || e < 1 || s > max || e > max || s > e) {
                    throw new Error(`Page numbers must be between 1 and ${max}.`);
                }
                for (let i = s; i <= e; i++) indices.add(i - 1);
            }
            return Array.from(indices).sort((a,b) => a - b);
        }

        document.getElementById('actionBtn').addEventListener('click', async () => {
            const file = document.getElementById('inFile').files[0];
            const rangeStr = document.getElementById('tRange').value.trim();
            if (!file) return showToast('Please select a PDF file first.', 'warning');
            if (file.size === 0) return showToast('Cannot process empty (0-byte) PDF file.', 'warning');
            if (!rangeStr) return showToast('Please specify which pages to split (e.g. 1-3, 5).', 'warning');

            const btn = document.getElementById('actionBtn');
            btn.disabled = true;
            btn.textContent = 'Splitting...';

            try {
                await ensureLibraries(['pdfLib']);
                const buf = await file.arrayBuffer();
                const pdf = await window.PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
                const toCopy = parseRange(rangeStr, pdf.getPageCount());

                const newPdf = await window.PDFLib.PDFDocument.create();
                const pages = await newPdf.copyPages(pdf, toCopy);
                pages.forEach(p => newPdf.addPage(p));

                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'split_' + rangeStr.replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf';
                a.click();
                showToast(`Successfully extracted ${toCopy.length} page(s)!`, 'success');
            } catch (err) {
                console.error(err);
                showToast(err.message || 'Error splitting PDF.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Split & Download';
            }
        });
    }

    function renderPdfCompressor(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar">
                
                <div style="max-width:500px;margin:1.5rem auto;text-align:left;">
                    <p style="font-weight:700;margin-bottom:0.75rem;color:var(--text-color);text-align:center;">Compression Level</p>
                    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                        <label style="flex:1;min-width:140px;cursor:pointer;">
                            <input type="radio" name="compressLevel" value="balanced" checked style="margin-right:6px;">
                            <span style="font-weight:600;">Standard</span>
                            <div style="font-size:0.75rem;color:var(--text-muted);">Object stream compression</div>
                        </label>
                        <label style="flex:1;min-width:140px;cursor:pointer;">
                            <input type="radio" name="compressLevel" value="extreme" style="margin-right:6px;">
                            <span style="font-weight:600;">Maximum</span>
                            <div style="font-size:0.75rem;color:var(--text-muted);">Strips metadata & streamlines</div>
                        </label>
                    </div>
                </div>

                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Compress PDF</button>
                </div>
                <div id="compResult" class="mt-4" style="display:none;"></div>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', async () => {
            const file = document.getElementById('inFile').files[0];
            if (!file) return showToast('Please select a PDF file first.', 'warning');
            if (file.size === 0) return showToast('Cannot process empty (0-byte) PDF file.', 'warning');

            const btn = document.getElementById('actionBtn');
            btn.disabled = true;
            btn.textContent = 'Compressing...';

            try {
                await ensureLibraries(['pdfLib']);
                const level = document.querySelector('input[name="compressLevel"]:checked').value;
                const buf = await file.arrayBuffer();
                const pdf = await window.PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });

                if (level === 'extreme') {
                    pdf.setTitle('');
                    pdf.setAuthor('');
                    pdf.setSubject('');
                    pdf.setKeywords([]);
                    pdf.setProducer('');
                    pdf.setCreator('');
                }

                const pdfBytes = await pdf.save({ useObjectStreams: true });
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const origSize = file.size;
                const newSize = blob.size;
                const saved = origSize > newSize ? Math.round((1 - newSize / origSize) * 100) : 0;

                const url = URL.createObjectURL(blob);
                const resEl = document.getElementById('compResult');
                resEl.style.display = 'block';
                resEl.innerHTML = `
                    <div style="padding:1rem;background:var(--card-bg);border:1px solid var(--border-light);border-radius:12px;max-width:400px;margin:0 auto;">
                        <p style="font-size:0.9rem;color:var(--text-muted);margin-bottom:0.75rem;">
                            Original: ${(origSize / 1024).toFixed(1)} KB &rarr; Compressed: ${(newSize / 1024).toFixed(1)} KB
                            ${saved > 0 ? `<span style="color:#10b981;font-weight:700;">(${saved}% saved)</span>` : ''}
                        </p>
                        <a href="${url}" download="${escapeHtml('compressed_' + file.name)}" class="btn primary-btn">Download Compressed PDF</a>
                    </div>
                `;
                showToast('PDF compressed successfully!', 'success');
            } catch (e) {
                console.error(e);
                showToast('Error compressing PDF: ' + (e.message || 'File may be corrupt.'), 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Compress PDF';
            }
        });
    }

    function renderImagesToPdf(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="image/jpeg,image/png,image/webp" class="search-bar" multiple>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Convert Images to PDF</button>
                </div>
                <div id="pdfOutputPageCount" class="mt-4" style="display:none;"></div>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', async () => {
            const files = Array.from(document.getElementById('inFile').files || []);
            if (!files.length) return showToast('Please select at least one image (JPG, PNG, WebP).', 'warning');

            const btn = document.getElementById('actionBtn');
            btn.disabled = true;
            btn.textContent = 'Converting...';

            try {
                await ensureLibraries(['pdfLib']);
                const doc = await window.PDFLib.PDFDocument.create();

                for (const fl of files) {
                    const buf = await fl.arrayBuffer();
                    let imgPdf;
                    const type = fl.type.toLowerCase();
                    if (type === 'image/jpeg' || type === 'image/jpg') {
                        imgPdf = await doc.embedJpg(buf);
                    } else if (type === 'image/png') {
                        imgPdf = await doc.embedPng(buf);
                    } else {
                        // Convert WebP/other formats to PNG via canvas first
                        const img = await new Promise((res, rej) => {
                            const i = new Image();
                            i.onload = () => res(i);
                            i.onerror = rej;
                            i.src = URL.createObjectURL(fl);
                        });
                        const cvs = document.createElement('canvas');
                        cvs.width = img.width; cvs.height = img.height;
                        const ctx = cvs.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        const pngBlob = await new Promise(r => cvs.toBlob(r, 'image/png'));
                        const pngBuf = await pngBlob.arrayBuffer();
                        imgPdf = await doc.embedPng(pngBuf);
                    }

                    const page = doc.addPage([imgPdf.width, imgPdf.height]);
                    page.drawImage(imgPdf, { x: 0, y: 0, width: imgPdf.width, height: imgPdf.height });
                }

                const pdfBytes = await doc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const pageCount = doc.getPageCount();

                const outEl = document.getElementById('pdfOutputPageCount');
                outEl.style.display = 'block';
                outEl.innerHTML = `
                    <div style="padding:1rem;background:var(--card-bg);border:1px solid var(--border-light);border-radius:12px;max-width:400px;margin:0 auto;">
                        <p style="font-weight:600;margin-bottom:0.75rem;color:var(--text-color);">Created PDF with ${pageCount} page${pageCount === 1 ? '' : 's'}</p>
                        <a href="${url}" download="converted_images.pdf" class="btn primary-btn">Download PDF</a>
                    </div>
                `;
                showToast('Images converted to PDF successfully!', 'success');
            } catch (e) {
                console.error(e);
                showToast('Error converting images: ' + (e.message || 'Corrupt image file.'), 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Convert Images to PDF';
            }
        });
    }

    function renderJpgToPdf(el) {
        renderImagesToPdf(el);
    }

    function renderPdfToImages(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar">
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Extract Pages to Images</button>
                </div>
                <div id="pagesList" class="mt-4" style="display:none; max-width:800px; margin:1.5rem auto 0 auto;"></div>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', async () => {
            const file = document.getElementById('inFile').files[0];
            if (!file) return showToast('Please select a PDF file first.', 'warning');

            const btn = document.getElementById('actionBtn');
            btn.disabled = true;
            btn.textContent = 'Loading engine...';

            const listEl = document.getElementById('pagesList');
            listEl.style.display = 'block';
            listEl.innerHTML = '<p style="color:var(--text-muted);">Rendering pages to images...</p>';

            try {
                await ensureLibraries(['pdfjs']);
                const buf = await file.arrayBuffer();
                const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
                const numPages = pdf.numPages;

                listEl.innerHTML = `
                    <p style="font-weight:600;margin-bottom:1rem;color:var(--text-color);">
                        Extracted ${numPages} Page${numPages === 1 ? '' : 's'}:
                    </p>
                    <div id="gridWrap" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:1.25rem;"></div>
                `;

                const gridWrap = document.getElementById('gridWrap');
                for (let i = 1; i <= Math.min(numPages, 30); i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                    const url = canvas.toDataURL('image/jpeg', 0.9);
                    const card = document.createElement('div');
                    card.style.cssText = 'background:var(--card-bg);border:1px solid var(--border-light);border-radius:10px;padding:0.75rem;display:flex;flex-direction:column;align-items:center;';
                    card.innerHTML = `
                        <span style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:600;">Page ${i}</span>
                        <img src="${url}" style="max-width:100%;max-height:220px;border-radius:6px;box-shadow:var(--shadow-sm);margin-bottom:0.75rem;">
                        <a href="${url}" download="page_${i}.jpg" class="btn" style="background:var(--bg-subtle);color:var(--text-color);border:1px solid var(--border-light);font-size:0.85rem;padding:0.4rem 0.8rem;">
                            Download JPG
                        </a>
                    `;
                    gridWrap.appendChild(card);
                }

                if (numPages > 30) {
                    listEl.insertAdjacentHTML('beforeend', '<p class="text-xs text-muted mt-4">Showing first 30 pages to optimize device memory.</p>');
                }
                showToast(`Extracted ${numPages} page image(s) successfully!`, 'success');
            } catch (e) {
                console.error(e);
                listEl.innerHTML = '';
                showToast('Error extracting PDF images: ' + (e.message || 'File may be corrupt.'), 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Extract Pages to Images';
            }
        });
    }

    function renderPdfRotator(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar">
                <div class="mt-4">
                    <label style="font-weight:600;margin-right:0.5rem;">Rotation Angle:</label>
                    <select id="deg" class="search-bar" style="width:auto;min-width:140px;">
                        <option value="90">90° Clockwise</option>
                        <option value="180">180° Flip</option>
                        <option value="270">270° Counter-Clockwise</option>
                    </select>
                </div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Rotate PDF</button>
                </div>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', async () => {
            const file = document.getElementById('inFile').files[0];
            if (!file) return showToast('Please select a PDF file first.', 'warning');

            const btn = document.getElementById('actionBtn');
            btn.disabled = true;
            btn.textContent = 'Rotating...';

            try {
                await ensureLibraries(['pdfLib']);
                const buf = await file.arrayBuffer();
                const pdf = await window.PDFLib.PDFDocument.load(buf);
                const d = parseInt(document.getElementById('deg').value, 10);
                const pages = pdf.getPages();
                pages.forEach(p => p.setRotation(window.PDFLib.degrees(p.getRotation().angle + d)));

                const pdfBytes = await pdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'rotated.pdf';
                a.click();
                showToast('PDF rotated successfully!', 'success');
            } catch (e) {
                console.error(e);
                showToast('Error rotating PDF: ' + (e.message || 'File may be corrupt.'), 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Rotate PDF';
            }
        });
    }

    function renderPdfReorder(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar">
                <div class="mt-2 text-sm text-muted">Enter desired page order separated by commas (e.g. <strong>3, 1, 2</strong>):</div>
                <input type="text" id="tOrd" class="search-bar mt-2" style="max-width:320px;" placeholder="e.g. 3, 1, 2">
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Reorder & Save</button>
                </div>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', async () => {
            const file = document.getElementById('inFile').files[0];
            const ordStr = document.getElementById('tOrd').value.trim();
            if (!file) return showToast('Please select a PDF file first.', 'warning');
            if (!ordStr) return showToast('Please specify the page order (e.g. 3, 1, 2).', 'warning');

            const btn = document.getElementById('actionBtn');
            btn.disabled = true;
            btn.textContent = 'Reordering...';

            try {
                await ensureLibraries(['pdfLib']);
                const buf = await file.arrayBuffer();
                const pdf = await window.PDFLib.PDFDocument.load(buf);
                const maxPages = pdf.getPageCount();

                const ord = ordStr.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
                if (!ord.length) throw new Error('Please enter valid numeric page numbers.');

                const invalid = ord.filter(p => p < 1 || p > maxPages);
                if (invalid.length) throw new Error(`Page number ${invalid[0]} is out of range (PDF has ${maxPages} pages).`);

                const newPdf = await window.PDFLib.PDFDocument.create();
                const zeroIndices = ord.map(p => p - 1);
                const pages = await newPdf.copyPages(pdf, zeroIndices);
                pages.forEach(p => newPdf.addPage(p));

                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'reordered.pdf';
                a.click();
                showToast('PDF reordered successfully!', 'success');
            } catch (e) {
                console.error(e);
                showToast(e.message || 'Error processing PDF.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Reorder & Save';
            }
        });
    }

    function renderPdfExtractor(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar">
                <div class="mt-2 text-sm text-muted">Enter page numbers or ranges to extract (e.g. <strong>1, 3-5, 8</strong>):</div>
                <input type="text" id="tExtract" class="search-bar mt-2" placeholder="Example: 1, 3-5, 8" style="max-width:320px;">
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Extract Pages to New PDF</button>
                </div>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', async () => {
            const file = document.getElementById('inFile').files[0];
            const str = document.getElementById('tExtract').value.trim();
            if (!file) return showToast('Please select a PDF file first.', 'warning');
            if (!str) return showToast('Please enter page numbers to extract (e.g. 1, 3-5).', 'warning');

            const btn = document.getElementById('actionBtn');
            btn.disabled = true;
            btn.textContent = 'Extracting...';

            try {
                await ensureLibraries(['pdfLib']);
                const buf = await file.arrayBuffer();
                const pdf = await window.PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
                const max = pdf.getPageCount();

                const indices = new Set();
                const parts = str.split(',').map(s => s.trim()).filter(Boolean);
                for (const part of parts) {
                    const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
                    if (!match) throw new Error('Invalid format in "' + part + '". Use format like 1, 3-5.');
                    const s = parseInt(match[1], 10);
                    const e = match[2] ? parseInt(match[2], 10) : s;
                    if (s < 1 || e < 1 || s > max || e > max || s > e) {
                        throw new Error(`Pages must be between 1 and ${max}.`);
                    }
                    for (let i = s; i <= e; i++) indices.add(i - 1);
                }

                const toCopy = Array.from(indices).sort((a,b) => a - b);
                if (!toCopy.length) throw new Error('No valid pages selected.');

                const newPdf = await window.PDFLib.PDFDocument.create();
                const pages = await newPdf.copyPages(pdf, toCopy);
                pages.forEach(p => newPdf.addPage(p));

                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'extracted_pages.pdf';
                a.click();
                showToast(`Extracted ${toCopy.length} page(s) successfully!`, 'success');
            } catch (err) {
                console.error(err);
                showToast(err.message || 'Error extracting pages.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Extract Pages to New PDF';
            }
        });
    }

    function renderPdfMetadataViewer(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar">
                <div id="res" class="mt-4 text-left p-4" style="background:var(--card-bg); border-radius:12px; border:1px solid var(--border-light); word-break:break-word; display:none; max-width:500px; margin:1rem auto 0 auto;"></div>
            </div>
        `;
        document.getElementById('inFile').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const resEl = document.getElementById('res');
            resEl.style.display = 'block';
            resEl.innerHTML = '<p style="color:var(--text-muted);">Reading metadata...</p>';

            try {
                await ensureLibraries(['pdfLib']);
                const buf = await file.arrayBuffer();
                const pdf = await window.PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
                resEl.innerHTML = `
                    <p style="margin-bottom:0.4rem;"><strong>Title:</strong> ${escapeHtml(pdf.getTitle() || 'None')}</p>
                    <p style="margin-bottom:0.4rem;"><strong>Author:</strong> ${escapeHtml(pdf.getAuthor() || 'None')}</p>
                    <p style="margin-bottom:0.4rem;"><strong>Subject:</strong> ${escapeHtml(pdf.getSubject() || 'None')}</p>
                    <p style="margin-bottom:0.4rem;"><strong>Creator:</strong> ${escapeHtml(pdf.getCreator() || 'None')}</p>
                    <p style="margin-bottom:0.4rem;"><strong>Producer:</strong> ${escapeHtml(pdf.getProducer() || 'None')}</p>
                    <p style="margin-bottom:0.4rem;"><strong>Total Pages:</strong> ${pdf.getPageCount()}</p>
                    <p style="margin-bottom:0.4rem;"><strong>Creation Date:</strong> ${pdf.getCreationDate() ? pdf.getCreationDate().toLocaleString() : 'None'}</p>
                    <p><strong>Modification Date:</strong> ${pdf.getModificationDate() ? pdf.getModificationDate().toLocaleString() : 'None'}</p>
                `;
            } catch (err) {
                console.error(err);
                resEl.innerHTML = '<span style="color:#ef4444;">Failed to read PDF metadata. The file may be corrupt or encrypted.</span>';
            }
        });
    }

    function renderPdfMetadataRemover(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar">
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Strip All Metadata</button>
                </div>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', async () => {
            const file = document.getElementById('inFile').files[0];
            if (!file) return showToast('Please select a PDF file first.', 'warning');

            const btn = document.getElementById('actionBtn');
            btn.disabled = true;
            btn.textContent = 'Stripping metadata...';

            try {
                await ensureLibraries(['pdfLib']);
                const buf = await file.arrayBuffer();
                const pdf = await window.PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
                pdf.setTitle('');
                pdf.setAuthor('');
                pdf.setSubject('');
                pdf.setCreator('');
                pdf.setProducer('');
                pdf.setKeywords([]);

                const pdfBytes = await pdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'cleaned_' + file.name;
                a.click();
                showToast('Metadata successfully removed!', 'success');
            } catch (e) {
                console.error(e);
                showToast('Error removing metadata: ' + (e.message || 'File may be corrupt.'), 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Strip All Metadata';
            }
        });
    }

    function renderAddPageNumbers(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar">
                <div class="mt-4" style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;align-items:center;">
                    <label style="font-weight:600;">Position:</label>
                    <select id="posSelect" class="search-bar" style="width:auto;">
                        <option value="bottom-center">Bottom Center</option>
                        <option value="bottom-right">Bottom Right</option>
                        <option value="top-right">Top Right</option>
                    </select>
                </div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Add Page Numbers</button>
                </div>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', async () => {
            const file = document.getElementById('inFile').files[0];
            if (!file) return showToast('Please select a PDF file first.', 'warning');

            const btn = document.getElementById('actionBtn');
            btn.disabled = true;
            btn.textContent = 'Adding page numbers...';

            try {
                await ensureLibraries(['pdfLib']);
                const buf = await file.arrayBuffer();
                const pdf = await window.PDFLib.PDFDocument.load(buf);
                const font = await pdf.embedFont(window.PDFLib.StandardFonts.Helvetica);
                const pages = pdf.getPages();
                const total = pages.length;
                const pos = document.getElementById('posSelect').value;

                for (let i = 0; i < total; i++) {
                    const p = pages[i];
                    const numText = `${i + 1} / ${total}`;
                    const textWidth = font.widthOfTextAtSize(numText, 10);
                    let x = p.getWidth() / 2 - textWidth / 2;
                    let y = 24;

                    if (pos === 'bottom-right') {
                        x = p.getWidth() - textWidth - 36;
                        y = 24;
                    } else if (pos === 'top-right') {
                        x = p.getWidth() - textWidth - 36;
                        y = p.getHeight() - 30;
                    }

                    p.drawText(numText, {
                        x: x,
                        y: y,
                        size: 10,
                        font: font,
                        color: window.PDFLib.rgb(0.3, 0.3, 0.3)
                    });
                }

                const pdfBytes = await pdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'numbered_' + file.name;
                a.click();
                showToast('Page numbers added successfully!', 'success');
            } catch (e) {
                console.error(e);
                showToast('Error adding page numbers: ' + (e.message || 'File may be corrupt.'), 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Add Page Numbers';
            }
        });
    }

    function renderPdfLock(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar">
                <div style="max-width:320px;margin:1rem auto 0 auto;display:flex;flex-direction:column;gap:0.75rem;">
                    <input type="password" id="pw" class="search-bar" placeholder="Set Password">
                    <input type="password" id="pwConfirm" class="search-bar" placeholder="Confirm Password">
                </div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Encrypt & Lock PDF</button>
                </div>
                <p class="text-xs text-muted mt-3">Encrypts 100% locally in your browser using AES-256 encryption.</p>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', async () => {
            const file = document.getElementById('inFile').files[0];
            const pw = document.getElementById('pw').value;
            const confirm = document.getElementById('pwConfirm').value;

            if (!file) return showToast('Please select a PDF file first.', 'warning');
            if (!pw) return showToast('Please enter a password to protect the PDF.', 'warning');
            if (pw !== confirm) return showToast('Passwords do not match. Please re-enter.', 'warning');

            const btn = document.getElementById('actionBtn');
            btn.disabled = true;
            btn.textContent = 'Encrypting PDF...';

            try {
                await ensureLibraries(['pdfLib', 'pdfEncrypt']);
                const buf = await file.arrayBuffer();
                const pdfDoc = await window.PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
                const rawBytes = await pdfDoc.save();

                const encryptedBytes = await window.PDFEncrypt.encryptPDF(rawBytes, pw, {
                    algorithm: 'AES-256'
                });

                const blob = new Blob([encryptedBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'locked_' + file.name;
                a.click();
                showToast('PDF encrypted with password successfully!', 'success');
            } catch (e) {
                console.error(e);
                showToast('Error encrypting PDF: ' + (e.message || 'Encryption failed.'), 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Encrypt & Lock PDF';
            }
        });
    }

    function renderPdfTextExtractor(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar">
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Extract Text</button>
                </div>
                <div id="outputArea" style="display:none;margin-top:1.5rem;">
                    <div style="display:flex;justify-content:flex-end;gap:10px;margin-bottom:0.5rem;">
                        <button class="btn" id="copyTextBtn" style="background:var(--bg-subtle);color:var(--text-color);border:1px solid var(--border-light);font-size:0.85rem;padding:0.4rem 0.8rem;">
                            Copy All Text
                        </button>
                        <button class="btn" id="downloadTxtBtn" style="background:var(--bg-subtle);color:var(--text-color);border:1px solid var(--border-light);font-size:0.85rem;padding:0.4rem 0.8rem;">
                            Download .txt
                        </button>
                    </div>
                    <textarea id="res" class="search-bar" style="width:100%;font-family:monospace;font-size:0.875rem;" rows="12" readonly placeholder="Extracted text will appear here..."></textarea>
                </div>
            </div>
        `;

        const btn = document.getElementById('actionBtn');
        const outputArea = document.getElementById('outputArea');
        const txtArea = document.getElementById('res');

        btn.addEventListener('click', async () => {
            const file = document.getElementById('inFile').files[0];
            if (!file) return showToast('Please select a PDF file first.', 'warning');

            btn.disabled = true;
            btn.textContent = 'Extracting text...';

            try {
                await ensureLibraries(['pdfjs']);
                const buf = await file.arrayBuffer();
                const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
                let fullText = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const tContent = await page.getTextContent();
                    const pText = tContent.items.map(item => item.str).join(' ');
                    fullText += `--- Page ${i} ---\n` + pText + '\n\n';
                }

                txtArea.value = fullText.trim();
                outputArea.style.display = 'block';
                showToast(`Extracted text from ${pdf.numPages} page(s) successfully!`, 'success');
            } catch (e) {
                console.error(e);
                showToast('Error extracting text: ' + (e.message || 'File may be corrupt.'), 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Extract Text';
            }
        });

        document.getElementById('copyTextBtn').addEventListener('click', () => {
            if (!txtArea.value) return;
            navigator.clipboard.writeText(txtArea.value).then(() => {
                showToast('Text copied to clipboard!', 'success');
            }).catch(() => {
                txtArea.select();
                document.execCommand('copy');
                showToast('Text copied to clipboard!', 'success');
            });
        });

        document.getElementById('downloadTxtBtn').addEventListener('click', () => {
            if (!txtArea.value) return;
            const blob = new Blob([txtArea.value], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'extracted_text.txt';
            a.click();
        });
    }

    function renderPdfFormFiller(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar">
                <p class="mt-2 text-sm text-muted">This tool renders interactive form fields to complete or permanently flattens them into document text.</p>
                <div id="formFieldsContainer" class="mt-4" style="display:none;max-width:500px;margin:1rem auto;text-align:left;"></div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Flatten & Save Form</button>
                </div>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', async () => {
            const file = document.getElementById('inFile').files[0];
            if (!file) return showToast('Please select a PDF file first.', 'warning');

            const btn = document.getElementById('actionBtn');
            btn.disabled = true;
            btn.textContent = 'Processing form...';

            try {
                await ensureLibraries(['pdfLib']);
                const buf = await file.arrayBuffer();
                const pdf = await window.PDFLib.PDFDocument.load(buf);
                const form = pdf.getForm();
                form.flatten();

                const pdfBytes = await pdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'flattened_' + file.name;
                a.click();
                showToast('PDF form flattened and saved successfully!', 'success');
            } catch (e) {
                console.error(e);
                showToast('Error processing form: ' + (e.message || 'File may be corrupt.'), 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Flatten & Save Form';
            }
        });
    }

    function renderPdfSignature(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar">
                
                <div class="mt-4" style="max-width:440px;margin:1rem auto;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;align-items:center;">
                    <div>
                        <label style="font-size:0.85rem;color:var(--text-muted);font-weight:600;">Sign on Page:</label><br>
                        <select id="targetPage" class="search-bar mt-1" style="width:auto;min-width:140px;">
                            <option value="last">Last Page</option>
                            <option value="first">First Page</option>
                            <option value="all">All Pages</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size:0.85rem;color:var(--text-muted);font-weight:600;">Placement:</label><br>
                        <select id="sigPos" class="search-bar mt-1" style="width:auto;min-width:140px;">
                            <option value="bottom-right">Bottom Right</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="bottom-center">Bottom Center</option>
                            <option value="center">Center</option>
                        </select>
                    </div>
                </div>

                <p class="mt-4" style="font-weight:600;color:var(--text-color);">Draw your signature below:</p>
                <div style="display:inline-block;border:2px dashed var(--border-light);border-radius:12px;background:#ffffff;padding:4px;box-shadow:var(--shadow-sm);">
                    <canvas id="sigCanvas" style="display:block;cursor:crosshair;width:320px;height:160px;touch-action:none;"></canvas>
                </div>
                
                <div class="mt-4" style="display:flex;justify-content:center;gap:10px;">
                    <button class="btn" id="clearBtn" style="background:var(--bg-subtle);color:var(--text-color);border:1px solid var(--border-light);">Clear</button>
                    <button class="btn primary-btn" id="actionBtn">Stamp Signature & Save PDF</button>
                </div>
            </div>
        `;

        const c = document.getElementById('sigCanvas');
        c.width = 320;
        c.height = 160;
        const ctx = c.getContext('2d');
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1e293b';

        let drawing = false;
        let hasDrawn = false;

        function getPos(e) {
            const r = c.getBoundingClientRect();
            return {
                x: (e.clientX - r.left) * (c.width / r.width),
                y: (e.clientY - r.top) * (c.height / r.height)
            };
        }

        c.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            drawing = true;
            hasDrawn = true;
            const p = getPos(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
        });

        c.addEventListener('pointermove', (e) => {
            if (!drawing) return;
            e.preventDefault();
            const p = getPos(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        });

        const stopDraw = (e) => {
            drawing = false;
            try { if (e && e.target && e.target.releasePointerCapture) e.target.releasePointerCapture(e.pointerId); } catch (_) {}
        };
        c.addEventListener('pointerup', stopDraw);
        c.addEventListener('pointercancel', stopDraw);

        document.getElementById('clearBtn').addEventListener('click', () => {
            ctx.clearRect(0, 0, c.width, c.height);
            hasDrawn = false;
        });

        document.getElementById('actionBtn').addEventListener('click', async () => {
            const file = document.getElementById('inFile').files[0];
            if (!file) return showToast('Please select a PDF file first.', 'warning');
            if (!hasDrawn) return showToast('Please draw your signature before saving.', 'warning');

            const btn = document.getElementById('actionBtn');
            btn.disabled = true;
            btn.textContent = 'Signing PDF...';

            try {
                await ensureLibraries(['pdfLib']);
                const buf = await file.arrayBuffer();
                const pdf = await window.PDFLib.PDFDocument.load(buf);
                const sigDataURL = c.toDataURL('image/png');
                const sigImage = await pdf.embedPng(sigDataURL);

                const pages = pdf.getPages();
                const targetPage = document.getElementById('targetPage').value;
                const pos = document.getElementById('sigPos').value;

                let targets = [];
                if (targetPage === 'first') targets = [pages[0]];
                else if (targetPage === 'all') targets = pages;
                else targets = [pages[pages.length - 1]]; // last

                const sigW = 160;
                const sigH = 80;

                targets.forEach(page => {
                    const pw = page.getWidth();
                    const ph = page.getHeight();
                    let x = pw - sigW - 40;
                    let y = 40;

                    if (pos === 'bottom-left') {
                        x = 40; y = 40;
                    } else if (pos === 'bottom-center') {
                        x = (pw - sigW) / 2; y = 40;
                    } else if (pos === 'center') {
                        x = (pw - sigW) / 2; y = (ph - sigH) / 2;
                    }

                    page.drawImage(sigImage, {
                        x: x,
                        y: y,
                        width: sigW,
                        height: sigH
                    });
                });

                const pdfBytes = await pdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'signed_' + file.name;
                a.click();
                showToast('Signature added to PDF successfully!', 'success');
            } catch (e) {
                console.error(e);
                showToast('Error signing PDF: ' + (e.message || 'File may be corrupt.'), 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Stamp Signature & Save PDF';
            }
        });
    }

    function renderPdfWatermark(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar">
                <input type="text" id="wTxt" class="search-bar mt-4" style="width:100%;max-width:360px;" placeholder="Watermark text (e.g. CONFIDENTIAL)" value="CONFIDENTIAL">
                <div class="mt-4" style="display:flex;gap:12px;justify-content:center;align-items:center;flex-wrap:wrap;">
                    <label style="font-weight:600;">Opacity:</label>
                    <input type="range" id="wOpacity" min="0.05" max="0.5" step="0.05" value="0.15" style="width:120px;">
                    <span id="opVal" style="font-size:0.85rem;color:var(--text-muted);">15%</span>
                </div>
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Add Watermark</button>
                </div>
            </div>
        `;
        document.getElementById('wOpacity').addEventListener('input', (e) => {
            document.getElementById('opVal').textContent = Math.round(e.target.value * 100) + '%';
        });

        document.getElementById('actionBtn').addEventListener('click', async () => {
            const file = document.getElementById('inFile').files[0];
            const text = document.getElementById('wTxt').value.trim() || 'CONFIDENTIAL';
            if (!file) return showToast('Please select a PDF file first.', 'warning');

            const btn = document.getElementById('actionBtn');
            btn.disabled = true;
            btn.textContent = 'Adding watermark...';

            try {
                await ensureLibraries(['pdfLib']);
                const buf = await file.arrayBuffer();
                const pdf = await window.PDFLib.PDFDocument.load(buf);
                const font = await pdf.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
                const opacity = parseFloat(document.getElementById('wOpacity').value);

                pdf.getPages().forEach(p => {
                    const pw = p.getWidth();
                    const ph = p.getHeight();
                    const fontSize = Math.min(pw, ph) / 8;
                    p.drawText(text, {
                        x: pw / 4,
                        y: ph / 3,
                        size: fontSize,
                        font: font,
                        opacity: opacity,
                        rotate: window.PDFLib.degrees(45),
                        color: window.PDFLib.rgb(0.8, 0.1, 0.1)
                    });
                });

                const pdfBytes = await pdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'watermarked_' + file.name;
                a.click();
                showToast('Watermark added successfully!', 'success');
            } catch (e) {
                console.error(e);
                showToast('Error watermarking PDF: ' + (e.message || 'File may be corrupt.'), 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Add Watermark';
            }
        });
    }

    function renderPdfToZip(el) {
        el.innerHTML = `
            <div class="tool-ui text-center">
                <input type="file" id="inFile" accept="application/pdf" class="search-bar">
                <div class="mt-4">
                    <button class="btn primary-btn" id="actionBtn">Extract Pages & Download ZIP</button>
                </div>
                <div id="zipProgress" class="mt-4 text-sm" style="display:none;color:var(--text-muted);"></div>
            </div>
        `;
        document.getElementById('actionBtn').addEventListener('click', async () => {
            const file = document.getElementById('inFile').files[0];
            if (!file) return showToast('Please select a PDF file first.', 'warning');

            const btn = document.getElementById('actionBtn');
            const progress = document.getElementById('zipProgress');
            btn.disabled = true;
            btn.textContent = 'Loading engines...';
            progress.style.display = 'block';
            progress.textContent = 'Initializing extraction engines...';

            try {
                await ensureLibraries(['pdfjs', 'jszip']);
                const buf = await file.arrayBuffer();
                const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
                const total = pdf.numPages;
                const zip = new window.JSZip();
                const folderName = file.name.replace(/\.pdf$/i, '') + '_pages';
                const folder = zip.folder(folderName);

                for (let i = 1; i <= total; i++) {
                    progress.textContent = `Rendering page ${i} of ${total}...`;
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
                    const pad = String(i).padStart(3, '0');
                    folder.file(`page_${pad}.jpg`, blob);
                }

                progress.textContent = 'Packaging ZIP archive...';
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${folderName}.zip`;
                a.click();

                progress.textContent = `Done! ${total} pages packaged into ZIP archive.`;
                showToast(`Successfully created ZIP with ${total} pages!`, 'success');
            } catch (e) {
                console.error(e);
                progress.textContent = '';
                showToast('Error converting PDF to ZIP: ' + (e.message || 'File may be corrupt.'), 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Extract Pages & Download ZIP';
            }
        });
    }

    function renderSqlFormatter(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:10px;">
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button class="btn" id="loadSampleSql" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Load Sample SQL
                        </button>
                        <button class="btn" id="clearSql" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Clear
                        </button>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <label style="font-size:0.85rem; color:var(--text-muted); display:flex; align-items:center; gap:5px; cursor:pointer;">
                            <input type="checkbox" id="upperKw" checked> Uppercase Keywords
                        </label>
                        <select id="sqlIndent" class="search-bar" style="width:auto; padding:0.3rem 0.6rem; font-size:0.85rem;">
                            <option value="2">2 Spaces</option>
                            <option value="4" selected>4 Spaces</option>
                        </select>
                    </div>
                </div>
                <textarea id="sqlInput" rows="7" class="search-bar" style="width:100%; font-family:monospace; font-size:0.875rem;" placeholder="Paste raw SQL query here..."></textarea>
                <div class="mt-4 text-center">
                    <button class="btn primary-btn" id="formatBtn">Format SQL</button>
                </div>
                <div id="sqlOutputWrap" style="display:none; margin-top:1.5rem;">
                    <div style="display:flex; justify-content:flex-end; margin-bottom:0.5rem;">
                        <button class="btn" id="copySqlBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.85rem; padding:0.4rem 0.8rem;">
                            Copy Formatted SQL
                        </button>
                    </div>
                    <textarea id="sqlOutput" rows="12" readonly class="search-bar" style="width:100%; font-family:monospace; font-size:0.875rem; background:var(--card-bg);"></textarea>
                </div>
            </div>
        `;

        const sample = `SELECT u.id, u.username, u.email, count(o.id) as order_count, sum(o.total_amount) as lifetime_value FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.status = 'active' AND u.created_at >= '2025-01-01' GROUP BY u.id, u.username, u.email HAVING count(o.id) > 2 ORDER BY lifetime_value DESC LIMIT 50;`;

        function formatSqlString(rawSql, indentSize, uppercase) {
            if (!rawSql.trim()) return '';
            let sql = rawSql.replace(/\s+/g, ' ').trim();
            const indent = ' '.repeat(indentSize);

            // Major clause keywords that break onto a new line
            const majorClauses = [
                'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY',
                'LIMIT', 'OFFSET', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
                'CROSS JOIN', 'JOIN', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET',
                'DELETE FROM', 'UNION ALL', 'UNION', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE'
            ];

            // Sub-clauses
            const subClauses = ['AND', 'OR', 'ON'];

            // Replace strings temporarily to avoid formatting inside string literals
            const stringLiterals = [];
            sql = sql.replace(/'(?:''|[^'])*'/g, (match) => {
                stringLiterals.push(match);
                return '___STR_' + (stringLiterals.length - 1) + '___';
            });

            // Normalize keywords case
            majorClauses.concat(subClauses).concat(['AS', 'DISTINCT', 'BETWEEN', 'IN', 'IS NULL', 'IS NOT NULL', 'LIKE', 'NOT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ASC', 'DESC', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX']).forEach(kw => {
                const re = new RegExp('\\b' + kw.replace(/\s+/g, '\\s+') + '\\b', 'gi');
                sql = sql.replace(re, uppercase ? kw.toUpperCase() : kw.toLowerCase());
            });

            // Split by commas in SELECT / GROUP BY / ORDER BY with newline and indent
            let formatted = '';
            const tokens = sql.split(' ');
            let currentClause = '';

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                const upperToken = token.toUpperCase();
                const nextToken = tokens[i + 1] ? tokens[i + 1].toUpperCase() : '';
                const twoWord = upperToken + ' ' + nextToken;

                if (majorClauses.includes(twoWord)) {
                    formatted += '\n' + (uppercase ? twoWord : twoWord.toLowerCase()) + '\n' + indent;
                    i++; // skip next
                    currentClause = twoWord;
                    continue;
                }

                if (majorClauses.includes(upperToken)) {
                    formatted += '\n' + (uppercase ? upperToken : upperToken.toLowerCase()) + '\n' + indent;
                    currentClause = upperToken;
                    continue;
                }

                if (subClauses.includes(upperToken)) {
                    formatted += '\n' + indent + (uppercase ? upperToken : upperToken.toLowerCase()) + ' ';
                    continue;
                }

                if (token.endsWith(',')) {
                    formatted += token + '\n' + indent;
                    continue;
                }

                formatted += token + ' ';
            }

            // Restore string literals
            stringLiterals.forEach((str, idx) => {
                formatted = formatted.replace('___STR_' + idx + '___', str);
            });

            // Clean up extra blank lines
            return formatted.trim().replace(/\n\s*\n/g, '\n');
        }

        document.getElementById('formatBtn').addEventListener('click', () => {
            const raw = document.getElementById('sqlInput').value;
            if (!raw.trim()) return showToast('Please enter a SQL query to format.', 'warning');
            const indent = parseInt(document.getElementById('sqlIndent').value, 10);
            const upper = document.getElementById('upperKw').checked;
            const res = formatSqlString(raw, indent, upper);
            document.getElementById('sqlOutput').value = res;
            document.getElementById('sqlOutputWrap').style.display = 'block';
            showToast('SQL formatted successfully!', 'success');
        });

        document.getElementById('loadSampleSql').addEventListener('click', () => {
            document.getElementById('sqlInput').value = sample;
            document.getElementById('formatBtn').click();
        });

        document.getElementById('clearSql').addEventListener('click', () => {
            document.getElementById('sqlInput').value = '';
            document.getElementById('sqlOutput').value = '';
            document.getElementById('sqlOutputWrap').style.display = 'none';
        });

        document.getElementById('copySqlBtn').addEventListener('click', () => {
            const out = document.getElementById('sqlOutput').value;
            if (!out) return;
            navigator.clipboard.writeText(out).then(() => {
                showToast('SQL copied to clipboard!', 'success');
            }).catch(() => {
                document.getElementById('sqlOutput').select();
                document.execCommand('copy');
                showToast('SQL copied to clipboard!', 'success');
            });
        });
    }

    function renderLoremIpsum(el) {
        const ipsum = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum'.split(' ');
        const paras = [
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
            'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
            'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
            'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.',
            'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.'
        ];
        let state = { type: 'paragraphs', count: 3 };
        el.innerHTML = `
            <div class="tool-ui">
                <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-bottom:1rem;">
                    <select id="loremType" class="search-bar" style="width:auto;flex:1;min-width:120px;">
                        <option value="paragraphs">Paragraphs</option>
                        <option value="sentences">Sentences</option>
                        <option value="words">Words</option>
                    </select>
                    <input type="number" id="loremCount" class="search-bar" value="3" min="1" max="100" style="width:auto;flex:1;min-width:80px;">
                </div>
                <button class="btn primary-btn" id="genBtn">Generate</button>
                <div style="display:flex; gap:10px; margin-top:1rem; justify-content:center;">
                    <button class="btn" id="copyBtn" style="background:var(--card-bg);color:var(--text-muted);border:1px solid var(--border);">Copy</button>
                </div>
                <div id="loremOutput" class="mt-4 p-4" style="background:var(--card-bg); border-radius:0.5rem; text-align:left; line-height:1.8; white-space:pre-wrap;"></div>
            </div>
        `;
        function generate() { const type = document.getElementById('loremType').value; const count = parseInt(document.getElementById('loremCount').value) || 3; let out = ''; if (type === 'paragraphs') { for (let i = 0; i < count; i++) out += paras[i % paras.length] + '\n\n'; } else if (type === 'sentences') { for (let i = 0; i < count; i++) { const start = (i * 12) % ipsum.length; const len = 8 + (i % 6); out += ipsum.slice(start, start + len).join(' ') + '. '; } } else { for (let i = 0; i < count; i++) out += ipsum[i % ipsum.length] + (i < count - 1 ? ' ' : '.'); } document.getElementById('loremOutput').textContent = out.trim(); }
        generate();
        document.getElementById('genBtn').addEventListener('click', generate);
        document.getElementById('copyBtn').addEventListener('click', () => { navigator.clipboard.writeText(document.getElementById('loremOutput').textContent).then(() => { const btn = document.getElementById('copyBtn'); btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 1500); }).catch(() => {}); });
    }

    function renderOgPreviewer(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <input type="text" id="ogUrl" class="search-bar" placeholder="Enter a URL to preview (e.g., https://example.com)">
                <button class="btn primary-btn" id="previewBtn">Preview</button>
                <div id="ogLoading" class="mt-4" style="display:none;color:var(--text-muted);">Fetching Open Graph data...</div>
                <div id="ogResults" class="mt-4"></div>
            </div>
        `;
        function isBlockedOgHost(hostname) {
            const host = hostname.toLowerCase();
            if (host === 'localhost' || host.endsWith('.localhost')) return true;
            if (host === '0.0.0.0') return true;
            if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
            if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
            if (/^169\.254\./.test(host)) return true;
            if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true;
            return false;
        }
        function parsePublicOgUrl(rawUrl) {
            let parsed;
            try {
                parsed = new URL(rawUrl);
            } catch (err) {
                throw new Error('Enter a valid absolute URL.');
            }
            if (!['https:', 'http:'].includes(parsed.protocol)) {
                throw new Error('Only HTTP and HTTPS URLs are supported.');
            }
            if (isBlockedOgHost(parsed.hostname)) {
                throw new Error('Local and private network URLs are blocked.');
            }
            return parsed;
        }
        function buildCard(title, desc, img, url, platform) {
            const colors = { facebook: '#1877F2', twitter: '#1DA1F2', linkedin: '#0A66C2', discord: '#5865F2' };
            const c = colors[platform] || '#666';
            const safeImage = img && /^https?:\/\//i.test(img) ? img : '';
            return `<div style="margin-bottom:1.5rem; border:1px solid var(--border); border-radius:0.75rem; overflow:hidden;">
                <div style="background:${c}; color:white; padding:0.5rem 1rem; font-weight:600; font-size:0.85rem; text-transform:uppercase;letter-spacing:0.05em;">${platform}</div>
                <div style="padding:1rem;">
                    ${safeImage ? `<div style="margin-bottom:0.75rem; border-radius:0.5rem; overflow:hidden; background:var(--bg-color);"><img src="${escapeHtml(safeImage)}" style="max-width:100%;max-height:200px;display:block;margin:0 auto;"></div>` : ''}
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.25rem;">${escapeHtml(url)}</div>
                    <div style="font-weight:700;font-size:1rem;margin-bottom:0.25rem;color:var(--text-color);">${escapeHtml(title || 'No title found')}</div>
                    <div style="font-size:0.875rem;color:var(--text-muted);line-height:1.4;">${escapeHtml(desc || 'No description found')}</div>
                </div>
            </div>`;
        }
        document.getElementById('previewBtn').addEventListener('click', async () => {
            const url = document.getElementById('ogUrl').value.trim();
            if (!url) return;
            document.getElementById('ogLoading').style.display = 'block';
            document.getElementById('ogResults').innerHTML = '';
            try {
                const parsedUrl = parsePublicOgUrl(url);
                const resp = await fetch('/api/og-preview?url=' + encodeURIComponent(parsedUrl.href), { headers: { 'Accept': 'application/json' } });
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.error || 'The metadata service could not fetch this URL.');
                const ogTitle = data.title || '';
                const ogDesc = data.description || '';
                const ogImage = data.image || '';
                const host = parsedUrl.hostname.replace(/^www\./, '');
                document.getElementById('ogResults').innerHTML = buildCard(ogTitle, ogDesc, ogImage, host, 'facebook') + buildCard(ogTitle, ogDesc, ogImage, host, 'twitter') + buildCard(ogTitle, ogDesc, ogImage, host, 'linkedin') + buildCard(ogTitle || ogDesc, ogDesc, ogImage, host, 'discord');
            } catch(e) { document.getElementById('ogResults').innerHTML = `<div style="color:#ef4444;padding:1rem;text-align:center;">${escapeHtml(e.message || 'Could not fetch URL. The site may block cross-origin requests.')}</div>`; }
            document.getElementById('ogLoading').style.display = 'none';
        });
    }

    function renderJsonToCsv(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <textarea id="jsonInput" rows="8" placeholder='[{"name":"John","age":30},{"name":"Jane","age":25}]'></textarea>
                <button class="btn primary-btn mt-4" id="convertBtn">Convert to CSV</button>
                <textarea id="csvOutput" rows="8" readonly class="mt-4" style="font-family:monospace;"></textarea>
                <div style="display:flex; gap:10px; margin-top:1rem; justify-content:center;">
                    <button class="btn" id="copyCsvBtn" style="background:var(--card-bg);color:var(--text-muted);border:1px solid var(--border);">Copy CSV</button>
                    <button class="btn primary-btn" id="downloadCsvBtn">Download .csv</button>
                </div>
            </div>
        `;

        function escapeCsvField(val) {
            if (val === undefined || val === null) return '';
            const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
            if (/[",\r\n]/.test(str)) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        }

        document.getElementById('convertBtn').addEventListener('click', () => {
            const raw = document.getElementById('jsonInput').value.trim();
            if (!raw) {
                return showToast('Please enter JSON data to convert', 'warning');
            }
            try {
                const data = JSON.parse(raw);
                if (!Array.isArray(data)) {
                    return showToast('Enter a JSON array of objects', 'warning');
                }
                if (data.length === 0) {
                    document.getElementById('csvOutput').value = '';
                    showToast('JSON array is empty. No tabular data to convert.', 'info');
                    return;
                }
                const allKeys = Array.from(new Set(data.flatMap(row => (typeof row === 'object' && row !== null) ? Object.keys(row) : [])));
                if (allKeys.length === 0) {
                    document.getElementById('csvOutput').value = '';
                    showToast('No object properties found in JSON array.', 'warning');
                    return;
                }
                let csv = allKeys.map(escapeCsvField).join(',') + '\r\n';
                data.forEach(row => {
                    if (typeof row === 'object' && row !== null) {
                        csv += allKeys.map(k => escapeCsvField(row[k])).join(',') + '\r\n';
                    }
                });
                document.getElementById('csvOutput').value = csv;
                showToast('Converted JSON to RFC 4180 CSV successfully!', 'success');
            } catch(e) {
                console.error(e);
                showToast('Invalid JSON syntax', 'warning');
            }
        });
        document.getElementById('copyCsvBtn').addEventListener('click', () => {
            const v = document.getElementById('csvOutput').value;
            if (v) {
                navigator.clipboard.writeText(v).then(() => {
                    const b = document.getElementById('copyCsvBtn');
                    b.textContent = 'Copied!';
                    showToast('Copied CSV to clipboard!', 'success');
                    setTimeout(() => b.textContent = 'Copy CSV', 1500);
                });
            } else {
                showToast('No CSV content to copy', 'info');
            }
        });
        document.getElementById('downloadCsvBtn').addEventListener('click', () => {
            const v = document.getElementById('csvOutput').value;
            if (v) {
                const blob = new Blob([v], {type:'text/csv;charset=utf-8;'});
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'data.csv';
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            } else {
                showToast('No CSV content to download', 'info');
            }
        });
    }

    function renderImageToBase64(el) {
        el.innerHTML = `
            <div class="tool-ui">
                <input type="file" id="imgIpt" accept="image/*" class="search-bar">
                <div id="preview" class="mt-4" style="display:none;text-align:center;"><img style="max-width:100%;max-height:200px;border-radius:0.5rem;"></div>
                <div id="output" class="mt-4"></div>
            </div>
        `;
        document.getElementById('imgIpt').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('preview').style.display = 'block';
                document.getElementById('preview').querySelector('img').src = ev.target.result;
                // uploadLabel removed
                const base64 = ev.target.result;
                const sizeKB = Math.round(base64.length * 0.75 / 1024);
                const format = base64.split(';')[0].split('/')[1] || 'png';
                const htmlTag = `<img src="${base64}" alt="Embedded Image">`;
                const cssBg = `background-image: url("${base64}");`;
                document.getElementById('output').innerHTML = `
                    <div style="text-align:left; background:var(--card-bg); border-radius:0.5rem; padding:1rem; margin-top:1rem;">
                        <div style="display:flex; gap:10px; margin-bottom:0.75rem; justify-content:center; flex-wrap:wrap;">
                            <strong style="color:var(--text-muted);">${format.toUpperCase()} — ${sizeKB} KB</strong>
                        </div>
                        <div style="margin-bottom:0.75rem;">
                            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.25rem;">HTML img tag</div>
                            <div style="display:flex; gap:0.5rem;">
                                <input type="text" readonly value="${htmlTag.replace(/"/g, '&quot;')}" class="base64-copy-input" style="flex:1;font-family:monospace;font-size:0.75rem;padding:0.5rem;">
                                <button class="btn base64-copy-btn" style="background:var(--bg-color);border:1px solid var(--border);color:var(--text-muted);white-space:nowrap;">Copy</button>
                            </div>
                        </div>
                        <div>
                            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.25rem;">CSS background</div>
                            <div style="display:flex; gap:0.5rem;">
                                <input type="text" readonly value="${cssBg.replace(/"/g, '&quot;')}" class="base64-copy-input" style="flex:1;font-family:monospace;font-size:0.75rem;padding:0.5rem;">
                                <button class="btn base64-copy-btn" style="background:var(--bg-color);border:1px solid var(--border);color:var(--text-muted);white-space:nowrap;">Copy</button>
                            </div>
                        </div>
                    </div>
                `;
                document.querySelectorAll('.base64-copy-input').forEach((input) => {
                    input.addEventListener('click', () => input.select());
                });
                document.querySelectorAll('.base64-copy-btn').forEach((button) => {
                    button.addEventListener('click', () => {
                        const input = button.previousElementSibling;
                        navigator.clipboard.writeText(input.value).catch(() => {});
                        button.textContent = 'Copied!';
                        setTimeout(() => button.textContent = 'Copy', 1500);
                    });
                });
            };
            reader.readAsDataURL(file);
        });
    }

    function renderImageToUrl(el) {
        let blobUrl = '';
        const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

        el.innerHTML = `
            <div class="tool-ui">
                <input type="file" id="imgUrlInput" accept="image/*" class="search-bar">
                <div id="urlPreview" class="mt-4" style="display:none;text-align:center;">
                    <img style="max-width:100%;max-height:240px;border-radius:0.5rem;border:1px solid var(--border);">
                </div>
                <div id="urlOutput" class="mt-4"></div>
            </div>
        `;

        const input = document.getElementById('imgUrlInput');
        // label removed
        const preview = document.getElementById('urlPreview');
        const previewImg = preview.querySelector('img');
        const output = document.getElementById('urlOutput');

        function copyValue(button) {
            const field = button.previousElementSibling;
            if (!field || !field.value) return;
            navigator.clipboard.writeText(field.value).catch(() => {});
            button.textContent = 'Copied!';
            setTimeout(() => button.textContent = 'Copy', 1500);
        }

        function renderUrlField(title, value, className) {
            return `
                <div style="margin-bottom:0.85rem;">
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.25rem;">${escapeHtml(title)}</div>
                    <div style="display:flex; gap:0.5rem;">
                        <input type="text" readonly value="${escapeHtml(value)}" class="${className}" style="flex:1;font-family:monospace;font-size:0.75rem;padding:0.5rem;min-width:0;">
                        <button class="btn image-url-copy-btn" style="background:var(--bg-color);border:1px solid var(--border);color:var(--text-muted);white-space:nowrap;">Copy</button>
                    </div>
                </div>
            `;
        }

        function formatBytes(bytes) {
            return bytes >= 1024 * 1024
                ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
                : `${(bytes / 1024).toFixed(1)} KB`;
        }

        function blobToDataUrl(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (ev) => resolve(ev.target.result);
                reader.onerror = () => reject(reader.error || new Error('Could not read image.'));
                reader.readAsDataURL(blob);
            });
        }

        function canvasToBlob(canvas, type, quality) {
            return new Promise((resolve) => {
                canvas.toBlob(resolve, type, quality);
            });
        }

        function loadImage(file) {
            return new Promise((resolve, reject) => {
                const image = new Image();
                const sourceUrl = URL.createObjectURL(file);
                image.onload = () => {
                    URL.revokeObjectURL(sourceUrl);
                    resolve(image);
                };
                image.onerror = () => {
                    URL.revokeObjectURL(sourceUrl);
                    reject(new Error('This image type cannot be compressed in the browser.'));
                };
                image.src = sourceUrl;
            });
        }

        async function compressImageToLimit(file) {
            if (file.size <= MAX_OUTPUT_BYTES) {
                return {
                    blob: file,
                    name: file.name,
                    type: file.type || 'image',
                    compressed: false,
                    originalSize: file.size
                };
            }

            const image = await loadImage(file);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let width = image.naturalWidth || image.width;
            let height = image.naturalHeight || image.height;
            let quality = 0.88;
            let lastBlob = null;

            for (let attempt = 0; attempt < 18; attempt += 1) {
                canvas.width = Math.max(1, Math.round(width));
                canvas.height = Math.max(1, Math.round(height));
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

                lastBlob = await canvasToBlob(canvas, 'image/webp', quality);
                if (!lastBlob) {
                    throw new Error('Could not compress this image.');
                }

                if (lastBlob.size <= MAX_OUTPUT_BYTES) {
                    return {
                        blob: lastBlob,
                        name: file.name.replace(/\.[^.]+$/, '') + '-compressed.webp',
                        type: 'image/webp',
                        compressed: true,
                        originalSize: file.size
                    };
                }

                if (quality > 0.46) {
                    quality = Math.max(0.46, quality - 0.08);
                } else {
                    const ratio = Math.sqrt(MAX_OUTPUT_BYTES / lastBlob.size) * 0.9;
                    width = Math.max(1, width * ratio);
                    height = Math.max(1, height * ratio);
                    quality = 0.82;
                }
            }

            throw new Error(`Could not compress the image below ${formatBytes(MAX_OUTPUT_BYTES)}.`);
        }

        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!validateFiles(e.target.files, input)) return;
            const looksLikeImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|svg|avif|heic|heif)$/i.test(file.name);
            if (!looksLikeImage) {
                showToast('Choose an image file.', "warning");
                input.value = '';
                return;
            }

            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }

            // label text content removed
            output.innerHTML = `
                <div style="text-align:center;color:var(--text-muted);background:var(--card-bg);border-radius:0.5rem;padding:1rem;">
                    ${file.size > MAX_OUTPUT_BYTES ? 'Compressing image to the 2 MB limit...' : 'Generating image URLs...'}
                </div>
            `;

            try {
                const result = await compressImageToLimit(file);
                blobUrl = URL.createObjectURL(result.blob);
                preview.style.display = 'block';
                previewImg.src = blobUrl;

                const dataUrl = await blobToDataUrl(result.blob);
                const htmlTag = `<img src="${dataUrl}" alt="${result.name}">`;
                const statusText = result.compressed
                    ? `Compressed from ${formatBytes(result.originalSize)} to ${formatBytes(result.blob.size)}`
                    : `${formatBytes(result.blob.size)} - already under 2 MB`;

                output.innerHTML = `
                    <div style="text-align:left; background:var(--card-bg); border-radius:0.5rem; padding:1rem; margin-top:1rem;">
                        <div style="display:flex; gap:10px; margin-bottom:0.85rem; justify-content:center; flex-wrap:wrap;">
                            <strong style="color:var(--text-muted);">${escapeHtml(result.type || 'image')} - ${escapeHtml(statusText)}</strong>
                        </div>
                        <p style="margin:0 0 0.85rem;color:var(--text-muted);font-size:0.9rem;line-height:1.5;text-align:center;">
                            Images larger than 2 MB are automatically compressed before the URL is generated. The local URL works in this browser session.
                        </p>
                        ${renderUrlField('Local browser URL', blobUrl, 'image-url-input')}
                        <div style="margin-top:-0.35rem;margin-bottom:0.85rem;text-align:center;">
                            <a class="btn" href="${escapeHtml(blobUrl)}" target="_blank" rel="noopener" style="display:inline-flex;background:var(--bg-color);border:1px solid var(--border);color:var(--text-muted);">Open local URL</a>
                        </div>
                        ${renderUrlField('Data URL', dataUrl, 'image-url-input')}
                        ${renderUrlField('HTML img tag', htmlTag, 'image-url-input')}
                    </div>
                `;

                output.querySelectorAll('.image-url-input').forEach((field) => {
                    field.addEventListener('click', () => field.select());
                });
                output.querySelectorAll('.image-url-copy-btn').forEach((button) => {
                    button.addEventListener('click', () => copyValue(button));
                });
            } catch (err) {
                output.innerHTML = `
                    <div class="error-alert-banner" style="position:static;margin-top:1rem;">
                        <div class="error-alert-content">
                            <span class="error-alert-text">${escapeHtml(err.message || 'Could not prepare this image.')}</span>
                        </div>
                    </div>
                `;
            }
        });
    }

    // --- Personality tests ---

    function renderBigFivePersonalityTest(el) {
        const traits = [
            {
                key: 'openness',
                name: 'Openness',
                color: '#8b5cf6',
                high: 'You are imaginative, curious and drawn to new ideas, art and unfamiliar experiences. You enjoy connecting concepts and asking "what if".',
                mid: 'You balance curiosity with practicality - open to novelty without needing constant change.',
                low: 'You prefer the practical, familiar and proven over abstraction and novelty. You value what works.'
            },
            {
                key: 'conscientiousness',
                name: 'Conscientiousness',
                color: '#06b6d4',
                high: 'You are organized, dependable and goal-directed. You finish what you start and sweat the details.',
                mid: 'You are reasonably organized and reliable, with room for spontaneity when it matters.',
                low: 'You are spontaneous and flexible, and you prefer keeping options open over rigid plans. Structure may take extra effort.'
            },
            {
                key: 'extraversion',
                name: 'Extraversion',
                color: '#f59e0b',
                high: 'You are sociable, energetic and recharged by people. You think out loud and bring momentum to a room.',
                mid: 'You enjoy company and solitude in roughly equal measure - an ambivert by temperament.',
                low: 'You are reserved and recharged by solitude. You prefer depth, preparation and smaller circles.'
            },
            {
                key: 'agreeableness',
                name: 'Agreeableness',
                color: '#10b981',
                high: 'You are warm, cooperative and quick to trust. You value harmony and go out of your way to help.',
                mid: 'You balance empathy with honesty - cooperative, but willing to disagree when it matters.',
                low: 'You are direct, skeptical and competitive. You value truth and independence over social harmony.'
            },
            {
                key: 'neuroticism',
                name: 'Neuroticism',
                color: '#ef4444',
                high: 'You feel emotions strongly and are sensitive to stress and uncertainty. That sensitivity also makes you perceptive and careful.',
                mid: 'You experience a typical mix of calm and stress reactivity. You notice pressure without being ruled by it.',
                low: 'You are emotionally steady and resilient under pressure. You recover quickly from setbacks.'
            }
        ];

        const traitItems = {
            openness: [
                ['I have a vivid imagination.', false],
                ['I enjoy exploring unfamiliar ideas and perspectives.', false],
                ['I am curious about many different things.', false],
                ['I enjoy art, poetry or music that challenges me.', false],
                ['I prefer routine and familiar experiences to novelty.', true],
                ['I often think about abstract or philosophical questions.', false],
                ['I am not interested in discussing theoretical ideas.', true],
                ['I enjoy trying new foods, places and activities.', false],
                ['I dislike change and prefer things to stay the same.', true],
                ['I can find beauty in ordinary everyday things.', false]
            ],
            conscientiousness: [
                ['I complete tasks thoroughly and on time.', false],
                ['I keep my belongings and workspace organized.', false],
                ['I often leave things until the last minute.', true],
                ['I follow through on the commitments I make.', false],
                ['My plans and schedules tend to be disorganized.', true],
                ['I pay attention to details.', false],
                ['I struggle to stay focused on long tasks.', true],
                ['I set goals and work steadily toward them.', false],
                ['I rarely double-check my work.', true],
                ['I am dependable and can be counted on.', false]
            ],
            extraversion: [
                ['I enjoy being the center of attention.', false],
                ['I feel energized after spending time with a group.', false],
                ['I prefer to spend my free time alone.', true],
                ['I start conversations easily with strangers.', false],
                ['Large social gatherings drain my energy.', true],
                ['I am talkative and expressive in groups.', false],
                ['I avoid social events when I can.', true],
                ['I make friends quickly.', false],
                ['I prefer quiet, solitary activities to parties.', true],
                ['I feel comfortable speaking in front of a group.', false]
            ],
            agreeableness: [
                ['I go out of my way to help other people.', false],
                ['I trust people until they give me a reason not to.', false],
                ['I can be blunt or harsh when I disagree.', true],
                ['I care about how other people feel.', false],
                ['I tend to hold grudges.', true],
                ['I compromise to keep the peace.', false],
                ['I am quick to criticize others.', true],
                ['I enjoy making people feel welcome.', false],
                ['I put my own interests above other people most of the time.', true],
                ['I find it easy to forgive people.', false]
            ],
            neuroticism: [
                ['I worry about things more than most people do.', false],
                ['I stay calm when I am under pressure.', true],
                ['My mood can shift quickly.', false],
                ['I often feel anxious without a clear reason.', false],
                ['I recover quickly from setbacks.', true],
                ['I get irritated easily.', false],
                ['I rarely feel overwhelmed.', true],
                ['I tend to dwell on my mistakes.', false],
                ['I feel secure about myself most of the time.', true],
                ['Small problems can feel overwhelming to me.', false]
            ]
        };

        const order = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
        const scale = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];
        const items = [];
        for (let i = 0; i < 10; i++) {
            order.forEach(function(key) {
                const pair = traitItems[key][i];
                items.push({ trait: key, text: pair[0], reverse: pair[1] });
            });
        }

        el.innerHTML = `
            <div class="tool-ui" style="max-width:840px; margin:0 auto;">
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.25rem;">
                    <h2 style="font-size:1.2rem; margin:0 0 0.35rem;">Big Five (OCEAN) Personality Test</h2>
                    <p style="margin:0; color:var(--text-muted); font-size:0.9rem; line-height:1.5;">50 statements · about 5 minutes · scored privately in your browser. Answer honestly rather than aspirationally.</p>
                </div>

                <div style="position:sticky; top:4rem; z-index:5; background:var(--bg-color); padding:0.6rem 0; margin-bottom:0.75rem;">
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; margin-bottom:0.35rem;">
                        <span>Progress</span>
                        <span id="bfProgressText">0 / 50 answered</span>
                    </div>
                    <div id="bfProgressBar" role="progressbar" aria-valuemin="0" aria-valuemax="50" aria-valuenow="0" aria-label="Test progress" style="height:8px; background:var(--bg-subtle); border-radius:999px; overflow:hidden;">
                        <div id="bfProgressFill" style="height:100%; width:0%; background:var(--primary-color); transition:width 0.15s ease;"></div>
                    </div>
                </div>

                <form id="bfForm" novalidate>
                    <div style="display:flex; justify-content:space-between; gap:1rem; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">
                        <span>1 = Strongly disagree</span>
                        <span>5 = Strongly agree</span>
                    </div>
                    <div style="display:grid; gap:8px;">
                        ${items.map(function(item, idx) {
                            return `
                            <div class="bf-q" data-index="${idx}" style="display:flex; gap:14px; align-items:center; justify-content:space-between; flex-wrap:wrap; background:var(--card-bg); border:1px solid var(--border-light); border-radius:10px; padding:0.7rem 0.9rem;">
                                <div style="flex:1 1 320px; font-size:0.9rem; line-height:1.4;">
                                    <span style="color:var(--text-muted); font-variant-numeric:tabular-nums;">${idx + 1}.</span>
                                    ${escapeHtml(item.text)}
                                </div>
                                <div role="radiogroup" aria-label="Question ${idx + 1}: ${escapeHtml(item.text)}" style="display:flex; gap:8px;">
                                    ${[1, 2, 3, 4, 5].map(function(value) {
                                        return `
                                        <label style="display:flex; flex-direction:column; align-items:center; gap:2px; font-size:0.7rem; color:var(--text-muted); cursor:pointer; min-width:26px;">
                                            <input type="radio" name="bfq${idx}" value="${value}" aria-label="${scale[value - 1]}" style="width:18px; height:18px; accent-color:var(--primary-color); cursor:pointer;">
                                            <span aria-hidden="true">${value}</span>
                                        </label>`;
                                    }).join('')}
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:1.5rem;">
                        <button type="submit" class="btn primary-btn" id="bfScoreBtn">See my results</button>
                        <button type="button" class="btn" id="bfClearBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light);">Clear answers</button>
                    </div>
                </form>

                <div id="bfResults" style="display:none;"></div>
            </div>
        `;

        const form = document.getElementById('bfForm');

        function updateProgress() {
            let answered = 0;
            items.forEach(function(item, idx) {
                if (form.querySelector('input[name="bfq' + idx + '"]:checked')) answered++;
            });
            document.getElementById('bfProgressText').textContent = answered + ' / ' + items.length + ' answered';
            document.getElementById('bfProgressFill').style.width = (answered / items.length * 100) + '%';
            document.getElementById('bfProgressBar').setAttribute('aria-valuenow', String(answered));
        }

        form.addEventListener('change', updateProgress);

        document.getElementById('bfClearBtn').addEventListener('click', function() {
            form.reset();
            form.querySelectorAll('.bf-q').forEach(function(row) { row.style.borderColor = ''; });
            updateProgress();
        });

        form.addEventListener('submit', function(event) {
            event.preventDefault();
            const answers = [];
            let firstMissing = -1;

            items.forEach(function(item, idx) {
                const checked = form.querySelector('input[name="bfq' + idx + '"]:checked');
                if (!checked) {
                    if (firstMissing === -1) firstMissing = idx;
                    answers.push(null);
                } else {
                    answers.push(Number(checked.value));
                }
            });

            if (firstMissing !== -1) {
                showToast('Please answer all 50 statements. Question ' + (firstMissing + 1) + ' is still unanswered.', 'warning');
                const row = form.querySelector('.bf-q[data-index="' + firstMissing + '"]');
                if (row) {
                    row.style.borderColor = 'var(--primary-color)';
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            const totals = {};
            order.forEach(function(key) { totals[key] = { sum: 0, count: 0 }; });
            items.forEach(function(item, idx) {
                const raw = answers[idx];
                totals[item.trait].sum += item.reverse ? (6 - raw) : raw;
                totals[item.trait].count += 1;
            });

            const results = traits.map(function(trait) {
                const total = totals[trait.key];
                const pct = Math.round(((total.sum - total.count) / (total.count * 4)) * 100);
                const band = pct >= 70 ? 'High' : (pct >= 40 ? 'Moderate' : 'Low');
                const desc = pct >= 70 ? trait.high : (pct >= 40 ? trait.mid : trait.low);
                return { key: trait.key, name: trait.name, color: trait.color, pct: pct, band: band, desc: desc };
            }).sort(function(a, b) { return b.pct - a.pct; });

            form.style.display = 'none';
            const output = document.getElementById('bfResults');
            output.innerHTML = `
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.5rem; box-shadow:var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap; margin-bottom:1.25rem;">
                        <div>
                            <h2 style="font-size:1.35rem; margin:0 0 0.3rem;">Your Big Five profile</h2>
                            <p style="margin:0; color:var(--text-muted); font-size:0.9rem; line-height:1.5;">
                                Strongest dimension: <strong style="color:var(--text-color);">${results[0].name} (${results[0].pct}%)</strong> ·
                                Quietest dimension: <strong style="color:var(--text-color);">${results[results.length - 1].name} (${results[results.length - 1].pct}%)</strong>
                            </p>
                        </div>
                        <button type="button" class="btn" id="bfRetakeTop" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); white-space:nowrap;">Retake test</button>
                    </div>

                    <div style="display:grid; gap:1rem;">
                        ${results.map(function(result) {
                            return `
                            <div>
                                <div style="display:flex; justify-content:space-between; gap:10px; align-items:baseline; margin-bottom:0.35rem;">
                                    <strong style="font-size:0.95rem;">${result.name}</strong>
                                    <span style="font-size:0.85rem; color:var(--text-muted);"><strong style="color:var(--text-color);">${result.pct}%</strong> · ${result.band}</span>
                                </div>
                                <div aria-hidden="true" style="height:10px; background:var(--bg-subtle); border-radius:999px; overflow:hidden;">
                                    <div style="height:100%; width:${result.pct}%; background:${result.color}; border-radius:999px;"></div>
                                </div>
                                <p style="margin:0.4rem 0 0; color:var(--text-muted); font-size:0.85rem; line-height:1.5;">${result.desc}</p>
                            </div>`;
                        }).join('')}
                    </div>

                    <div style="margin-top:1.5rem; padding:0.85rem 1rem; background:var(--bg-subtle); border-radius:8px; font-size:0.8rem; color:var(--text-muted); line-height:1.55;">
                        Percentages are relative to the possible range of this 50-item questionnaire, not population percentiles. This is a self-reflection tool, not a clinical or diagnostic assessment. Your answers never left this browser tab.
                    </div>

                    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:1.25rem;">
                        <button type="button" class="btn primary-btn" id="bfCopyBtn">Copy results</button>
                        <button type="button" class="btn" id="bfRetakeBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light);">Retake test</button>
                    </div>
                </div>
            `;
            output.style.display = 'block';

            function retake() {
                renderBigFivePersonalityTest(el);
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            document.getElementById('bfRetakeTop').addEventListener('click', retake);
            document.getElementById('bfRetakeBtn').addEventListener('click', retake);

            document.getElementById('bfCopyBtn').addEventListener('click', function() {
                const lines = ['Big Five (OCEAN) Personality Profile', ''];
                results.forEach(function(result) {
                    lines.push(result.name + ': ' + result.pct + '% (' + result.band + ')');
                });
                lines.push('', 'Take the test: https://100toolcrate.com/tools/big-five-personality-test');
                navigator.clipboard.writeText(lines.join('\n')).then(function() {
                    showToast('Results copied to clipboard!', 'success');
                }).catch(function() {
                    showToast('Could not copy results. Please select the text manually.', 'error');
                });
            });

            output.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        updateProgress();
    }

    function renderEnneagramPersonalityTest(el) {
        const types = [
            { n: 1, name: 'Reformer', tagline: 'Principled, purposeful, self-controlled', color: '#ef4444', desc: 'You are guided by a strong inner sense of right and wrong, and you work hard to improve yourself and the world around you. Growth comes from accepting imperfection - including your own.' },
            { n: 2, name: 'Helper', tagline: 'Generous, warm, people-pleasing', color: '#f97316', desc: 'You are warm, generous and quick to notice what others need. Growth comes from giving without losing yourself, and accepting help in return.' },
            { n: 3, name: 'Achiever', tagline: 'Ambitious, adaptive, image-conscious', color: '#eab308', desc: 'You are ambitious, adaptable and driven to excel. Growth comes from separating your worth from your achievements and showing up authentically.' },
            { n: 4, name: 'Individualist', tagline: 'Sensitive, expressive, introspective', color: '#8b5cf6', desc: 'You are sensitive, expressive and drawn to depth and meaning. Growth comes from appreciating the ordinary and recognizing that you are already whole.' },
            { n: 5, name: 'Investigator', tagline: 'Perceptive, private, analytical', color: '#06b6d4', desc: 'You are perceptive, private and endlessly curious. Growth comes from engaging with the world before you feel fully ready, and sharing your inner world.' },
            { n: 6, name: 'Loyalist', tagline: 'Committed, vigilant, security-seeking', color: '#3b82f6', desc: 'You are loyal, responsible and alert to risk. Growth comes from trusting yourself and acting despite uncertainty rather than waiting for certainty.' },
            { n: 7, name: 'Enthusiast', tagline: 'Spontaneous, optimistic, variety-seeking', color: '#22c55e', desc: 'You are spontaneous, optimistic and hungry for possibility. Growth comes from staying present with discomfort rather than reframing or escaping it.' },
            { n: 8, name: 'Challenger', tagline: 'Direct, decisive, protective', color: '#f43f5e', desc: 'You are direct, decisive and protective of the people you love. Growth comes from leading with vulnerability and letting others in.' },
            { n: 9, name: 'Peacemaker', tagline: 'Calm, agreeable, conflict-avoiding', color: '#10b981', desc: 'You are calm, accepting and able to see every side. Growth comes from voicing your own needs and refusing to disappear into the background.' }
        ];

        const statements = {
            1: [
                'I have a strong inner critic that tells me how things should be done.',
                'I notice mistakes and imperfections that other people overlook.',
                'I believe there is a right way to do most things.',
                'I feel responsible for making things better.',
                'I get frustrated when people are careless or irresponsible.'
            ],
            2: [
                'I instinctively notice what other people need.',
                'I feel valued when others depend on me.',
                'I find it hard to say no when someone asks for help.',
                'I sometimes give more than I should in order to be liked.',
                'I feel hurt when my help goes unappreciated.'
            ],
            3: [
                'I am driven to succeed and be seen as competent.',
                'I adapt my image to what a situation rewards.',
                'I measure myself by my achievements.',
                'I dislike appearing unsuccessful or average.',
                'I keep busy because it makes me feel worthwhile.'
            ],
            4: [
                'I feel things more intensely than most people.',
                'I long to be understood for who I really am.',
                'I am drawn to what is unique, deep or melancholic.',
                'I sometimes feel fundamentally different from others.',
                'I compare my life to an ideal I have not lived yet.'
            ],
            5: [
                'I need plenty of solitude to recharge.',
                'I prefer to observe and understand before participating.',
                'I guard my time and energy carefully.',
                'I feel drained by prolonged social demands.',
                'I would rather master a subject than rely on other people.'
            ],
            6: [
                'I scan for what could go wrong before I act.',
                'I need reassurance that decisions are safe.',
                'I am loyal to people and groups I trust.',
                'I question authority even while wanting its approval.',
                'I feel uneasy when things are unpredictable.'
            ],
            7: [
                'I chase new experiences to avoid feeling trapped.',
                'I reframe painful things into something positive.',
                'I have many interests and struggle to commit to one.',
                'I dislike boredom more than almost anything.',
                'I keep my options open as long as possible.'
            ],
            8: [
                'I take charge when a situation feels out of control.',
                'I say what I think even when it is unpopular.',
                'I protect the people I care about fiercely.',
                'I hate being told what to do.',
                'I respect strength and directness.'
            ],
            9: [
                'I avoid conflict whenever possible.',
                'I can see every side of an argument.',
                'I put off decisions that might upset someone.',
                'I feel most at peace in calm, familiar surroundings.',
                'I sometimes lose track of my own preferences.'
            ]
        };

        const items = [];
        for (let round = 0; round < 5; round++) {
            for (let n = 1; n <= 9; n++) {
                items.push({ type: n, text: statements[n][round] });
            }
        }

        const scale = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];

        el.innerHTML = `
            <div class="tool-ui" style="max-width:840px; margin:0 auto;">
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.25rem;">
                    <h2 style="font-size:1.2rem; margin:0 0 0.35rem;">Enneagram Personality Test</h2>
                    <p style="margin:0; color:var(--text-muted); font-size:0.9rem; line-height:1.5;">45 statements · about 5 minutes · reveals your dominant type, your wing and your runner-up types. Scored privately in your browser.</p>
                </div>

                <div style="position:sticky; top:4rem; z-index:5; background:var(--bg-color); padding:0.6rem 0; margin-bottom:0.75rem;">
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; margin-bottom:0.35rem;">
                        <span>Progress</span>
                        <span id="ennProgressText">0 / 45 answered</span>
                    </div>
                    <div id="ennProgressBar" role="progressbar" aria-valuemin="0" aria-valuemax="45" aria-valuenow="0" aria-label="Test progress" style="height:8px; background:var(--bg-subtle); border-radius:999px; overflow:hidden;">
                        <div id="ennProgressFill" style="height:100%; width:0%; background:var(--primary-color); transition:width 0.15s ease;"></div>
                    </div>
                </div>

                <form id="ennForm" novalidate>
                    <div style="display:flex; justify-content:space-between; gap:1rem; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">
                        <span>1 = Strongly disagree</span>
                        <span>5 = Strongly agree</span>
                    </div>
                    <div style="display:grid; gap:8px;">
                        ${items.map(function(item, idx) {
                            return `
                            <div class="enn-q" data-index="${idx}" style="display:flex; gap:14px; align-items:center; justify-content:space-between; flex-wrap:wrap; background:var(--card-bg); border:1px solid var(--border-light); border-radius:10px; padding:0.7rem 0.9rem;">
                                <div style="flex:1 1 320px; font-size:0.9rem; line-height:1.4;">
                                    <span style="color:var(--text-muted); font-variant-numeric:tabular-nums;">${idx + 1}.</span>
                                    ${escapeHtml(item.text)}
                                </div>
                                <div role="radiogroup" aria-label="Question ${idx + 1}: ${escapeHtml(item.text)}" style="display:flex; gap:8px;">
                                    ${[1, 2, 3, 4, 5].map(function(value) {
                                        return `
                                        <label style="display:flex; flex-direction:column; align-items:center; gap:2px; font-size:0.7rem; color:var(--text-muted); cursor:pointer; min-width:26px;">
                                            <input type="radio" name="ennq${idx}" value="${value}" aria-label="${scale[value - 1]}" style="width:18px; height:18px; accent-color:var(--primary-color); cursor:pointer;">
                                            <span aria-hidden="true">${value}</span>
                                        </label>`;
                                    }).join('')}
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:1.5rem;">
                        <button type="submit" class="btn primary-btn" id="ennScoreBtn">See my Enneagram type</button>
                        <button type="button" class="btn" id="ennClearBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light);">Clear answers</button>
                    </div>
                </form>

                <div id="ennResults" style="display:none;"></div>
            </div>
        `;

        const form = document.getElementById('ennForm');

        function updateProgress() {
            let answered = 0;
            items.forEach(function(item, idx) {
                if (form.querySelector('input[name="ennq' + idx + '"]:checked')) answered++;
            });
            document.getElementById('ennProgressText').textContent = answered + ' / ' + items.length + ' answered';
            document.getElementById('ennProgressFill').style.width = (answered / items.length * 100) + '%';
            document.getElementById('ennProgressBar').setAttribute('aria-valuenow', String(answered));
        }

        form.addEventListener('change', updateProgress);

        document.getElementById('ennClearBtn').addEventListener('click', function() {
            form.reset();
            form.querySelectorAll('.enn-q').forEach(function(row) { row.style.borderColor = ''; });
            updateProgress();
        });

        form.addEventListener('submit', function(event) {
            event.preventDefault();
            const answers = [];
            let firstMissing = -1;

            items.forEach(function(item, idx) {
                const checked = form.querySelector('input[name="ennq' + idx + '"]:checked');
                if (!checked) {
                    if (firstMissing === -1) firstMissing = idx;
                    answers.push(null);
                } else {
                    answers.push(Number(checked.value));
                }
            });

            if (firstMissing !== -1) {
                showToast('Please answer all 45 statements. Question ' + (firstMissing + 1) + ' is still unanswered.', 'warning');
                const row = form.querySelector('.enn-q[data-index="' + firstMissing + '"]');
                if (row) {
                    row.style.borderColor = 'var(--primary-color)';
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            const totals = {};
            for (let n = 1; n <= 9; n++) totals[n] = 0;
            items.forEach(function(item, idx) { totals[item.type] += answers[idx]; });

            const results = types.map(function(type) {
                const pct = Math.round(((totals[type.n] - 5) / 20) * 100);
                return { n: type.n, name: type.name, tagline: type.tagline, color: type.color, desc: type.desc, pct: pct, raw: totals[type.n] };
            }).sort(function(a, b) { return b.pct - a.pct || a.n - b.n; });

            const top = results[0];
            const neighbors = top.n === 1 ? [9, 2] : (top.n === 9 ? [8, 1] : [top.n - 1, top.n + 1]);

            function scoreOf(n) {
                return totals[n];
            }

            const wingA = neighbors[0];
            const wingB = neighbors[1];
            const winner = scoreOf(wingA) === scoreOf(wingB)
                ? top.n + 'w' + wingA + ' / ' + top.n + 'w' + wingB
                : top.n + 'w' + (scoreOf(wingA) > scoreOf(wingB) ? wingA : wingB);

            form.style.display = 'none';
            const output = document.getElementById('ennResults');
            output.innerHTML = `
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.5rem; box-shadow:var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap; margin-bottom:1.25rem;">
                        <div>
                            <h2 style="font-size:1.35rem; margin:0 0 0.3rem;">Your dominant type: Type ${top.n} - ${top.name}</h2>
                            <p style="margin:0; color:var(--text-muted); font-size:0.9rem; line-height:1.5;">Wing: <strong style="color:var(--text-color);">${winner}</strong> · Type balance: <strong style="color:var(--text-color);">${top.pct}%</strong></p>
                        </div>
                        <button type="button" class="btn" id="ennRetakeTop" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); white-space:nowrap;">Retake test</button>
                    </div>

                    <div style="padding:1rem 1.15rem; background:var(--bg-subtle); border-radius:10px; margin-bottom:1.25rem;">
                        <div style="font-weight:700; margin-bottom:0.25rem;">Type ${top.n}: ${top.name}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">${top.tagline}</div>
                        <p style="margin:0; font-size:0.9rem; line-height:1.6;">${top.desc}</p>
                    </div>

                    <h3 style="font-size:1rem; margin:0 0 0.75rem;">Your top three types</h3>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:1.5rem;">
                        ${results.slice(0, 3).map(function(result, index) {
                            return `
                            <div style="background:var(--bg-color); border:1px solid var(--border-light); border-radius:10px; padding:0.9rem;">
                                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px;">${index === 0 ? 'Dominant' : 'Runner-up ' + index}</div>
                                <div style="font-weight:700; margin:0.25rem 0 0.15rem;">Type ${result.n} - ${result.name}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted);">${result.pct}% · ${result.tagline}</div>
                            </div>`;
                        }).join('')}
                    </div>

                    <h3 style="font-size:1rem; margin:0 0 0.75rem;">All nine types</h3>
                    <div style="display:grid; gap:0.65rem;">
                        ${results.slice().sort(function(a, b) { return a.n - b.n; }).map(function(result) {
                            return `
                            <div>
                                <div style="display:flex; justify-content:space-between; gap:10px; font-size:0.85rem; margin-bottom:0.25rem;">
                                    <span><strong>${result.n}. ${result.name}</strong></span>
                                    <span style="color:var(--text-muted);">${result.pct}%</span>
                                </div>
                                <div aria-hidden="true" style="height:8px; background:var(--bg-subtle); border-radius:999px; overflow:hidden;">
                                    <div style="height:100%; width:${result.pct}%; background:${result.color}; border-radius:999px;"></div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>

                    <div style="margin-top:1.5rem; padding:0.85rem 1rem; background:var(--bg-subtle); border-radius:8px; font-size:0.8rem; color:var(--text-muted); line-height:1.55;">
                        Percentages show how strongly each type's five statements matched your answers - they are not population percentiles. The Enneagram is a self-reflection framework, not a clinical assessment. Read your top two or three types rather than only the winner. Your answers never left this browser tab.
                    </div>

                    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:1.25rem;">
                        <button type="button" class="btn primary-btn" id="ennCopyBtn">Copy results</button>
                        <button type="button" class="btn" id="ennRetakeBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light);">Retake test</button>
                    </div>
                </div>
            `;
            output.style.display = 'block';

            function retake() {
                renderEnneagramPersonalityTest(el);
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            document.getElementById('ennRetakeTop').addEventListener('click', retake);
            document.getElementById('ennRetakeBtn').addEventListener('click', retake);

            document.getElementById('ennCopyBtn').addEventListener('click', function() {
                const lines = ['Enneagram Profile', 'Dominant type: Type ' + top.n + ' - ' + top.name + ' (' + top.pct + '%)', 'Wing: ' + winner, '', 'Top three:'];
                results.slice(0, 3).forEach(function(result) {
                    lines.push('Type ' + result.n + ' - ' + result.name + ': ' + result.pct + '%');
                });
                lines.push('', 'Take the test: https://100toolcrate.com/tools/enneagram-personality-test');
                navigator.clipboard.writeText(lines.join('\n')).then(function() {
                    showToast('Results copied to clipboard!', 'success');
                }).catch(function() {
                    showToast('Could not copy results. Please select the text manually.', 'error');
                });
            });

            output.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        updateProgress();
    }

    function renderLlmTokenCounter(el) {
        const models = [
            { id: 'gpt-5', name: 'GPT-5', vendor: 'OpenAI', input: 1.25, output: 10, context: 400000, factor: 1.0 },
            { id: 'gpt-5-mini', name: 'GPT-5 mini', vendor: 'OpenAI', input: 0.25, output: 2, context: 400000, factor: 1.0 },
            { id: 'gpt-5-nano', name: 'GPT-5 nano', vendor: 'OpenAI', input: 0.05, output: 0.4, context: 400000, factor: 1.0 },
            { id: 'gpt-4.1', name: 'GPT-4.1', vendor: 'OpenAI', input: 2, output: 8, context: 1047576, factor: 1.0 },
            { id: 'claude-opus-4.1', name: 'Claude Opus 4.1', vendor: 'Anthropic', input: 15, output: 75, context: 200000, factor: 1.04 },
            { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', vendor: 'Anthropic', input: 3, output: 15, context: 200000, factor: 1.04 },
            { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', vendor: 'Anthropic', input: 1, output: 5, context: 200000, factor: 1.04 },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', vendor: 'Google', input: 1.25, output: 10, context: 1048576, factor: 0.98 },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', vendor: 'Google', input: 0.3, output: 2.5, context: 1048576, factor: 0.98 },
            { id: 'deepseek-v3', name: 'DeepSeek V3', vendor: 'DeepSeek', input: 0.27, output: 1.1, context: 128000, factor: 1.08 }
        ];

        function estimateTokens(text, factor) {
            if (!text || !text.trim()) return 0;
            const chars = Array.from(text).length;
            const cjk = (text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/g) || []).length;
            const punctuation = (text.match(/[^\p{L}\p{N}\s]/gu) || []).length;
            const raw = (chars / 4) + (cjk * 0.55) + (punctuation * 0.18);
            return Math.max(1, Math.round(raw * factor));
        }

        function formatNumber(value) {
            return Number(value || 0).toLocaleString('en-US');
        }

        function formatUsd(value) {
            if (!Number.isFinite(value) || value === 0) return '$0.00';
            const digits = value < 0.01 ? 6 : (value < 1 ? 4 : 2);
            return '$' + value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
        }

        function formatBytes(text) {
            if (!text) return 0;
            try {
                return new TextEncoder().encode(text).length;
            } catch (err) {
                return new Blob([text]).size;
            }
        }

        const samplePrompt = 'You are the lead product marketer for a B2B analytics platform that helps mid-market ecommerce teams reduce cart abandonment. Write a 600-word launch announcement for a new feature called Recovery Segments. It should explain the problem, describe how the feature works in plain language, include one customer proof point, and end with a clear call to action. Tone: confident, concrete, and free of hype. Avoid the words "revolutionary" and "game-changing".';

        el.innerHTML = `
            <div class="tool-ui" style="max-width:920px; margin:0 auto;">
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.25rem;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:0.75rem;">
                        <div>
                            <h2 style="font-size:1.2rem; margin:0 0 0.25rem;">LLM Token Counter &amp; Cost Estimator</h2>
                            <p style="margin:0; color:var(--text-muted); font-size:0.85rem;">Paste a prompt to estimate tokens and cost. Nothing is uploaded.</p>
                        </div>
                        <button type="button" class="btn" id="llmSampleBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; white-space:nowrap;">Load sample prompt</button>
                    </div>
                    <label for="llmText" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.35rem;">Prompt or document</label>
                    <textarea id="llmText" class="search-bar" rows="9" placeholder="Paste your prompt, article, code or document here..." style="width:100%; resize:vertical; font-family:inherit; font-size:0.9rem;"></textarea>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(105px, 1fr)); gap:8px; margin-top:0.85rem;">
                        <div style="background:var(--bg-subtle); border-radius:8px; padding:0.55rem 0.7rem;"><div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-muted);">Characters</div><strong id="llmChars" style="font-size:1.05rem;">0</strong></div>
                        <div style="background:var(--bg-subtle); border-radius:8px; padding:0.55rem 0.7rem;"><div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-muted);">Words</div><strong id="llmWords" style="font-size:1.05rem;">0</strong></div>
                        <div style="background:var(--bg-subtle); border-radius:8px; padding:0.55rem 0.7rem;"><div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-muted);">Lines</div><strong id="llmLines" style="font-size:1.05rem;">0</strong></div>
                        <div style="background:var(--bg-subtle); border-radius:8px; padding:0.55rem 0.7rem;"><div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-muted);">Bytes</div><strong id="llmBytes" style="font-size:1.05rem;">0</strong></div>
                        <div style="background:var(--bg-subtle); border-radius:8px; padding:0.55rem 0.7rem; border:1px solid var(--primary-color);"><div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-muted);">Est. tokens</div><strong id="llmTokens" style="font-size:1.05rem; color:var(--primary-color);">0</strong></div>
                    </div>
                </div>

                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.25rem;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
                        <div>
                            <label for="llmModel" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.35rem;">Model</label>
                            <select id="llmModel" class="search-bar" style="width:100%;">
                                ${models.map(function(model) {
                                    return '<option value="' + model.id + '"' + (model.id === 'gpt-5' ? ' selected' : '') + '>' + model.name + ' (' + model.vendor + ')</option>';
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="llmOutputTokens" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.35rem;">Expected output tokens</label>
                            <input type="number" id="llmOutputTokens" class="search-bar" min="0" step="50" value="500" style="width:100%;">
                        </div>
                        <div>
                            <label for="llmRequests" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.35rem;">Calls per month</label>
                            <input type="number" id="llmRequests" class="search-bar" min="1" step="1" value="100" style="width:100%;">
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin-top:1.15rem;">
                        <div style="background:var(--bg-subtle); border-radius:8px; padding:0.75rem;"><div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-muted);">Input cost</div><strong id="llmInputCost" style="font-size:1.15rem;">$0.00</strong></div>
                        <div style="background:var(--bg-subtle); border-radius:8px; padding:0.75rem;"><div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-muted);">Output cost</div><strong id="llmOutputCost" style="font-size:1.15rem;">$0.00</strong></div>
                        <div style="background:var(--bg-subtle); border-radius:8px; padding:0.75rem;"><div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-muted);">Per call</div><strong id="llmTotalCost" style="font-size:1.15rem; color:var(--primary-color);">$0.00</strong></div>
                        <div style="background:var(--bg-subtle); border-radius:8px; padding:0.75rem;"><div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-muted);">Monthly</div><strong id="llmMonthlyCost" style="font-size:1.15rem;">$0.00</strong></div>
                    </div>

                    <div style="margin-top:1.1rem;">
                        <div style="display:flex; justify-content:space-between; gap:10px; font-size:0.8rem; margin-bottom:0.3rem;">
                            <span id="llmContextLabel" style="color:var(--text-muted);">Context window usage</span>
                            <span id="llmContextValue" style="font-weight:600;">0%</span>
                        </div>
                        <div aria-hidden="true" style="height:8px; background:var(--bg-subtle); border-radius:999px; overflow:hidden;">
                            <div id="llmContextFill" style="height:100%; width:0%; background:var(--primary-color); border-radius:999px; transition:width 0.15s ease;"></div>
                        </div>
                        <p id="llmContextHint" style="margin:0.35rem 0 0; font-size:0.78rem; color:var(--text-muted);">Input plus expected output, compared with the model's context window.</p>
                    </div>
                </div>

                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.25rem;">
                    <div style="display:flex; justify-content:space-between; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:0.75rem;">
                        <h3 style="font-size:1rem; margin:0;">Compare all models</h3>
                        <span style="font-size:0.75rem; color:var(--text-muted);">Indicative list prices per 1M tokens</span>
                    </div>
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.82rem; min-width:520px;">
                            <thead>
                                <tr style="text-align:left; color:var(--text-muted); border-bottom:1px solid var(--border-light);">
                                    <th style="padding:0.45rem 0.4rem;">Model</th>
                                    <th style="padding:0.45rem 0.4rem; text-align:right;">Input</th>
                                    <th style="padding:0.45rem 0.4rem; text-align:right;">Output</th>
                                    <th style="padding:0.45rem 0.4rem; text-align:right;">Per call</th>
                                    <th style="padding:0.45rem 0.4rem; text-align:right;">Context</th>
                                </tr>
                            </thead>
                            <tbody id="llmCompareBody"></tbody>
                        </table>
                    </div>
                    <p style="margin:0.85rem 0 0; font-size:0.75rem; color:var(--text-muted); line-height:1.5;">Token counts use a calibrated heuristic (roughly 4 characters per English token, with extra weight for code and CJK text). Expect within about 10-15% of the provider's exact tokenizer. Prices change frequently - verify against official rate cards before committing a budget.</p>
                </div>

                <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                    <button type="button" class="btn primary-btn" id="llmCopyBtn">Copy cost summary</button>
                    <button type="button" class="btn" id="llmClearBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light);">Clear</button>
                </div>
            </div>
        `;

        const textInput = document.getElementById('llmText');
        const modelSelect = document.getElementById('llmModel');
        const outputInput = document.getElementById('llmOutputTokens');
        const requestsInput = document.getElementById('llmRequests');

        function currentModel() {
            return models.find(function(model) { return model.id === modelSelect.value; }) || models[0];
        }

        function currentOutputTokens() {
            const value = parseInt(outputInput.value, 10);
            return Number.isFinite(value) && value > 0 ? value : 0;
        }

        function currentRequests() {
            const value = parseInt(requestsInput.value, 10);
            return Number.isFinite(value) && value > 0 ? value : 1;
        }

        function update() {
            const text = textInput.value;
            const model = currentModel();
            const tokens = estimateTokens(text, model.factor);
            const outputTokens = currentOutputTokens();
            const requests = currentRequests();
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            const lines = text ? text.split(/\r\n|\r|\n/).length : 0;

            document.getElementById('llmChars').textContent = formatNumber(Array.from(text).length);
            document.getElementById('llmWords').textContent = formatNumber(words);
            document.getElementById('llmLines').textContent = formatNumber(lines);
            document.getElementById('llmBytes').textContent = formatNumber(formatBytes(text));
            document.getElementById('llmTokens').textContent = formatNumber(tokens);

            const inputCost = (tokens / 1000000) * model.input;
            const outputCost = (outputTokens / 1000000) * model.output;
            const totalCost = inputCost + outputCost;

            document.getElementById('llmInputCost').textContent = formatUsd(inputCost);
            document.getElementById('llmOutputCost').textContent = formatUsd(outputCost);
            document.getElementById('llmTotalCost').textContent = formatUsd(totalCost);
            document.getElementById('llmMonthlyCost').textContent = formatUsd(totalCost * requests);

            const used = tokens + outputTokens;
            const pct = model.context ? (used / model.context) * 100 : 0;
            const fill = document.getElementById('llmContextFill');
            const hint = document.getElementById('llmContextHint');
            document.getElementById('llmContextValue').textContent = pct >= 10 ? pct.toFixed(1) + '%' : pct.toFixed(2) + '%';
            document.getElementById('llmContextLabel').textContent = 'Context window usage · ' + formatNumber(used) + ' / ' + formatNumber(model.context) + ' tokens';
            fill.style.width = Math.min(100, pct) + '%';
            fill.style.background = pct > 100 ? '#ef4444' : (pct > 80 ? '#f59e0b' : 'var(--primary-color)');
            if (pct > 100) {
                hint.textContent = 'This prompt and output exceed the model context window. Trim the input or choose a model with a larger context.';
                hint.style.color = '#ef4444';
            } else if (pct > 80) {
                hint.textContent = 'You are close to the context limit. Leave room for the model response and any system prompt.';
                hint.style.color = '#f59e0b';
            } else {
                hint.textContent = "Input plus expected output, compared with the model's context window.";
                hint.style.color = 'var(--text-muted)';
            }

            document.getElementById('llmCompareBody').innerHTML = models.map(function(item) {
                const itemInput = (tokens / 1000000) * item.input;
                const itemOutput = (outputTokens / 1000000) * item.output;
                const itemTotal = itemInput + itemOutput;
                const selected = item.id === model.id;
                return `
                    <tr style="border-bottom:1px solid var(--border-light);${selected ? ' background:var(--bg-subtle);' : ''}">
                        <td style="padding:0.5rem 0.4rem;">
                            <strong>${item.name}</strong>
                            <div style="font-size:0.7rem; color:var(--text-muted);">${item.vendor}${selected ? ' · selected' : ''}</div>
                        </td>
                        <td style="padding:0.5rem 0.4rem; text-align:right; font-variant-numeric:tabular-nums;">${formatUsd(itemInput)}</td>
                        <td style="padding:0.5rem 0.4rem; text-align:right; font-variant-numeric:tabular-nums;">${formatUsd(itemOutput)}</td>
                        <td style="padding:0.5rem 0.4rem; text-align:right; font-variant-numeric:tabular-nums;"><strong>${formatUsd(itemTotal)}</strong></td>
                        <td style="padding:0.5rem 0.4rem; text-align:right; font-variant-numeric:tabular-nums;">${formatNumber(item.context)}</td>
                    </tr>`;
            }).join('');
        }

        textInput.addEventListener('input', update);
        modelSelect.addEventListener('change', update);
        outputInput.addEventListener('input', update);
        requestsInput.addEventListener('input', update);

        document.getElementById('llmSampleBtn').addEventListener('click', function() {
            textInput.value = samplePrompt;
            update();
            textInput.focus();
        });

        document.getElementById('llmClearBtn').addEventListener('click', function() {
            textInput.value = '';
            outputInput.value = '500';
            requestsInput.value = '100';
            update();
        });

        document.getElementById('llmCopyBtn').addEventListener('click', function() {
            const model = currentModel();
            const tokens = estimateTokens(textInput.value, model.factor);
            const outputTokens = currentOutputTokens();
            const requests = currentRequests();
            const inputCost = (tokens / 1000000) * model.input;
            const outputCost = (outputTokens / 1000000) * model.output;
            const totalCost = inputCost + outputCost;
            const lines = [
                'LLM Token & Cost Estimate',
                'Model: ' + model.name + ' (' + model.vendor + ')',
                'Input: ' + formatNumber(tokens) + ' tokens',
                'Expected output: ' + formatNumber(outputTokens) + ' tokens',
                'Input cost: ' + formatUsd(inputCost),
                'Output cost: ' + formatUsd(outputCost),
                'Cost per call: ' + formatUsd(totalCost),
                'Monthly (' + formatNumber(requests) + ' calls): ' + formatUsd(totalCost * requests),
                '',
                'Estimated with https://100toolcrate.com/tools/llm-token-counter - heuristic, verify with the provider tokenizer.'
            ];
            navigator.clipboard.writeText(lines.join('\n')).then(function() {
                showToast('Cost summary copied to clipboard!', 'success');
            }).catch(function() {
                showToast('Could not copy the summary. Please select the text manually.', 'error');
            });
        });

        update();
    }

    function saveTextFile(filename, text, mimeType) {
        const blob = new Blob([text], { type: mimeType || 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    }

    function normalizeHttpUrl(raw, baseUrl) {
        let value = String(raw || '').trim();
        if (!value) return '';
        if (value.charAt(0) === '/' && baseUrl) {
            value = String(baseUrl).replace(/\/+$/, '') + value;
        }
        if (!/^https?:\/\//i.test(value)) {
            if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return '';
            value = 'https://' + value;
        }
        try {
            const parsed = new URL(value);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
            return parsed.href;
        } catch (err) {
            return '';
        }
    }

    function renderLlmsTxtGenerator(el) {
        let entries = [
            { title: '', url: '', section: '', desc: '' },
            { title: '', url: '', section: '', desc: '' },
            { title: '', url: '', section: '', desc: '' }
        ];

        el.innerHTML = `
            <div class="tool-ui" style="max-width:900px; margin:0 auto;">
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.25rem;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:1rem;">
                        <div>
                            <h2 style="font-size:1.2rem; margin:0 0 0.25rem;">llms.txt Generator</h2>
                            <p style="margin:0; color:var(--text-muted); font-size:0.85rem;">Build a curated markdown map that AI search engines and agents can read. Publish it at <code>/llms.txt</code>.</p>
                        </div>
                        <button type="button" class="btn" id="llmsExampleBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.8rem; white-space:nowrap;">Load example</button>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px; margin-bottom:0.85rem;">
                        <div>
                            <label for="llmsName" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.3rem;">Site or project name</label>
                            <input type="text" id="llmsName" class="search-bar" placeholder="Acme Analytics" style="width:100%;">
                        </div>
                        <div>
                            <label for="llmsBase" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.3rem;">Site URL (optional)</label>
                            <input type="text" id="llmsBase" class="search-bar" placeholder="https://example.com" style="width:100%;">
                            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.25rem;">Used to expand links that start with a slash.</div>
                        </div>
                    </div>

                    <div style="margin-bottom:0.85rem;">
                        <label for="llmsSummary" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.3rem;">One-line summary</label>
                        <textarea id="llmsSummary" class="search-bar" rows="2" maxlength="320" placeholder="Acme Analytics helps mid-market ecommerce teams reduce cart abandonment with privacy-first behavioural analytics." style="width:100%; resize:vertical;"></textarea>
                        <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.25rem;">Becomes the blockquote under the H1. Keep it concrete: who you help, what you do, and why it is different.</div>
                    </div>

                    <div>
                        <label for="llmsDetails" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.3rem;">Optional details</label>
                        <textarea id="llmsDetails" class="search-bar" rows="3" placeholder="Important context, licensing notes, or guidance on which pages an LLM should prioritise. Markdown is allowed." style="width:100%; resize:vertical;"></textarea>
                    </div>
                </div>

                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.25rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:0.85rem;">
                        <div>
                            <h3 style="font-size:1rem; margin:0;">Links</h3>
                            <p style="margin:0.15rem 0 0; color:var(--text-muted); font-size:0.78rem;">Group links with a section name. Blank sections become "Resources".</p>
                        </div>
                        <button type="button" class="btn" id="llmsAddBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.82rem;">+ Add link</button>
                    </div>
                    <div id="llmsEntries" style="display:grid; gap:10px;"></div>
                </div>

                <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-bottom:1.25rem;">
                    <button type="button" class="btn primary-btn" id="llmsGenerateBtn">Generate llms.txt</button>
                    <button type="button" class="btn" id="llmsResetBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light);">Reset</button>
                </div>

                <div id="llmsOutputWrap" style="display:none; background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:0.5rem;">
                        <h3 style="font-size:1rem; margin:0;">Generated llms.txt</h3>
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            <button type="button" class="btn" id="llmsCopyBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.82rem;">Copy</button>
                            <button type="button" class="btn" id="llmsDownloadBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.82rem;">Download llms.txt</button>
                        </div>
                    </div>
                    <textarea id="llmsOutput" class="search-bar" rows="18" readonly style="width:100%; font-family:monospace; font-size:0.82rem; background:var(--bg-color);"></textarea>
                    <p style="margin:0.55rem 0 0; font-size:0.75rem; color:var(--text-muted); line-height:1.5;">Publish at <code>https://yourdomain.com/llms.txt</code>, served as text/plain or text/markdown with no redirects or authentication.</p>
                </div>
            </div>
        `;

        const entriesContainer = document.getElementById('llmsEntries');

        function renderEntries() {
            entriesContainer.innerHTML = entries.map(function(entry, index) {
                return `
                    <div class="llms-entry" data-index="${index}" style="border:1px solid var(--border-light); border-radius:10px; padding:0.75rem; background:var(--bg-color);">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:0.5rem;">
                            <span style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-muted);">Link ${index + 1}</span>
                            <button type="button" class="llms-remove" data-index="${index}" aria-label="Remove link ${index + 1}" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.8rem; padding:0.15rem 0.35rem;">Remove</button>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px; margin-bottom:8px;">
                            <input type="text" class="llms-title search-bar" value="${escapeHtml(entry.title)}" placeholder="Page title" aria-label="Link ${index + 1} title" style="width:100%;">
                            <input type="text" class="llms-url search-bar" value="${escapeHtml(entry.url)}" placeholder="https://example.com/docs" aria-label="Link ${index + 1} URL" style="width:100%;">
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px;">
                            <input type="text" class="llms-section search-bar" value="${escapeHtml(entry.section)}" placeholder="Section (e.g. Documentation)" aria-label="Link ${index + 1} section" style="width:100%;">
                            <input type="text" class="llms-desc search-bar" value="${escapeHtml(entry.desc)}" placeholder="One-line description (optional)" aria-label="Link ${index + 1} description" style="width:100%;">
                        </div>
                    </div>
                `;
            }).join('');

            entriesContainer.querySelectorAll('.llms-remove').forEach(function(button) {
                button.addEventListener('click', function() {
                    entries = readEntries();
                    entries.splice(Number(button.getAttribute('data-index')), 1);
                    if (!entries.length) entries.push({ title: '', url: '', section: '', desc: '' });
                    renderEntries();
                });
            });
        }

        function readEntries() {
            return Array.from(entriesContainer.querySelectorAll('.llms-entry')).map(function(row) {
                return {
                    title: row.querySelector('.llms-title').value,
                    url: row.querySelector('.llms-url').value,
                    section: row.querySelector('.llms-section').value,
                    desc: row.querySelector('.llms-desc').value
                };
            });
        }

        function addEntry() {
            entries = readEntries();
            entries.push({ title: '', url: '', section: '', desc: '' });
            renderEntries();
            const rows = entriesContainer.querySelectorAll('.llms-entry');
            const last = rows[rows.length - 1];
            if (last) last.querySelector('.llms-title').focus();
        }

        function markdownText(value) {
            return String(value || '')
                .replace(/[\r\n]+/g, ' ')
                .replace(/\[/g, '(')
                .replace(/\]/g, ')')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function markdownUrl(value) {
            return value.replace(/\(/g, '%28').replace(/\)/g, '%29');
        }

        function resetForm() {
            entries = [
                { title: '', url: '', section: '', desc: '' },
                { title: '', url: '', section: '', desc: '' },
                { title: '', url: '', section: '', desc: '' }
            ];
            document.getElementById('llmsName').value = '';
            document.getElementById('llmsBase').value = '';
            document.getElementById('llmsSummary').value = '';
            document.getElementById('llmsDetails').value = '';
            renderEntries();
            document.getElementById('llmsOutputWrap').style.display = 'none';
        }

        renderEntries();

        document.getElementById('llmsAddBtn').addEventListener('click', addEntry);
        document.getElementById('llmsResetBtn').addEventListener('click', resetForm);

        document.getElementById('llmsExampleBtn').addEventListener('click', function() {
            document.getElementById('llmsName').value = 'Acme Analytics';
            document.getElementById('llmsBase').value = 'https://acme.example';
            document.getElementById('llmsSummary').value = 'Privacy-first behavioural analytics that helps mid-market ecommerce teams find and fix cart abandonment.';
            document.getElementById('llmsDetails').value = 'Acme Analytics is a hosted product. Prefer the documentation and pricing pages when answering questions about capabilities. Do not infer enterprise features that are not listed.';
            entries = [
                { title: 'Documentation', url: 'https://acme.example/docs', section: 'Documentation', desc: 'Setup guides, integrations and implementation details.' },
                { title: 'API reference', url: 'https://acme.example/docs/api', section: 'Documentation', desc: 'REST endpoints, authentication and rate limits.' },
                { title: 'Pricing', url: 'https://acme.example/pricing', section: 'Product', desc: 'Plans, usage limits and billing details.' },
                { title: 'Feature overview', url: 'https://acme.example/features', section: 'Product', desc: 'What the platform does and who it is for.' },
                { title: 'About the company', url: 'https://acme.example/about', section: 'Company', desc: 'Team, mission and contact information.' },
                { title: 'Cart abandonment benchmark report', url: 'https://acme.example/blog/cart-abandonment-benchmarks', section: 'Blog', desc: 'Annual benchmark data across ecommerce verticals.' }
            ];
            renderEntries();
            document.getElementById('llmsOutputWrap').style.display = 'none';
        });

        document.getElementById('llmsGenerateBtn').addEventListener('click', function() {
            const name = document.getElementById('llmsName').value.trim() || 'Your Site';
            const summary = document.getElementById('llmsSummary').value.trim();
            const details = document.getElementById('llmsDetails').value.trim();
            const base = normalizeHttpUrl(document.getElementById('llmsBase').value);

            if (!summary) {
                showToast('Add a one-line summary so LLMs know what your site is about.', 'warning');
                document.getElementById('llmsSummary').focus();
                return;
            }

            const rows = readEntries();
            const invalid = [];
            const valid = [];
            rows.forEach(function(row) {
                const title = markdownText(row.title);
                const rawUrl = row.url.trim();
                if (!title && !rawUrl) return;
                const url = normalizeHttpUrl(rawUrl, base);
                if (!title || !url) {
                    invalid.push(title || rawUrl || 'untitled link');
                    return;
                }
                valid.push({
                    title: title,
                    url: url,
                    section: markdownText(row.section) || 'Resources',
                    desc: markdownText(row.desc)
                });
            });

            if (!valid.length) {
                showToast('Add at least one link with a title and a valid http(s) URL.', 'warning');
                return;
            }
            if (invalid.length) {
                showToast(invalid.length + ' link(s) skipped because the title or URL was invalid.', 'warning');
            }

            const sections = new Map();
            valid.forEach(function(entry) {
                if (!sections.has(entry.section)) sections.set(entry.section, []);
                sections.get(entry.section).push(entry);
            });

            const lines = ['# ' + markdownText(name), '', '> ' + markdownText(summary), ''];
            if (details) {
                lines.push(details);
                lines.push('');
            }
            sections.forEach(function(list, section) {
                lines.push('## ' + section);
                lines.push('');
                list.forEach(function(entry) {
                    let line = '- [' + entry.title + '](' + markdownUrl(entry.url) + ')';
                    if (entry.desc) line += ': ' + entry.desc;
                    lines.push(line);
                });
                lines.push('');
            });

            const output = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
            document.getElementById('llmsOutput').value = output;
            document.getElementById('llmsOutputWrap').style.display = 'block';
            document.getElementById('llmsOutputWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        document.getElementById('llmsCopyBtn').addEventListener('click', function() {
            const output = document.getElementById('llmsOutput').value;
            if (!output) return;
            navigator.clipboard.writeText(output).then(function() {
                showToast('llms.txt copied to clipboard!', 'success');
            }).catch(function() {
                showToast('Could not copy. Select the text and copy it manually.', 'error');
            });
        });

        document.getElementById('llmsDownloadBtn').addEventListener('click', function() {
            const output = document.getElementById('llmsOutput').value;
            if (!output) return;
            saveTextFile('llms.txt', output, 'text/plain;charset=utf-8');
            showToast('Downloading llms.txt', 'success');
        });
    }

    function renderAiCrawlerRobotsGenerator(el) {
        const bots = [
            { token: 'GPTBot', company: 'OpenAI', kind: 'training', docs: 'https://platform.openai.com/docs/gptbot' },
            { token: 'OAI-SearchBot', company: 'OpenAI', kind: 'search', docs: 'https://platform.openai.com/docs/searchbot' },
            { token: 'ChatGPT-User', company: 'OpenAI', kind: 'user', docs: 'https://platform.openai.com/docs/chatgpt-user' },
            { token: 'anthropic-ai', company: 'Anthropic', kind: 'training', docs: 'https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler' },
            { token: 'ClaudeBot', company: 'Anthropic', kind: 'training', docs: 'https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler' },
            { token: 'Claude-User', company: 'Anthropic', kind: 'user', docs: 'https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler' },
            { token: 'Claude-SearchBot', company: 'Anthropic', kind: 'search', docs: 'https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler' },
            { token: 'Google-Extended', company: 'Google', kind: 'training', docs: 'https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers' },
            { token: 'GoogleOther', company: 'Google', kind: 'other', docs: 'https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers' },
            { token: 'PerplexityBot', company: 'Perplexity', kind: 'search', docs: 'https://docs.perplexity.ai/guides/bots' },
            { token: 'Perplexity-User', company: 'Perplexity', kind: 'user', docs: 'https://docs.perplexity.ai/guides/bots' },
            { token: 'CCBot', company: 'Common Crawl', kind: 'training', docs: 'https://commoncrawl.org/ccbot' },
            { token: 'Bytespider', company: 'ByteDance', kind: 'training', docs: 'https://www.bytedance.com/' },
            { token: 'Amazonbot', company: 'Amazon', kind: 'training', docs: 'https://developer.amazon.com/amazonbot' },
            { token: 'Applebot-Extended', company: 'Apple', kind: 'training', docs: 'https://support.apple.com/en-us/119829' },
            { token: 'meta-externalagent', company: 'Meta', kind: 'training', docs: 'https://developers.facebook.com/docs/sharing/webmasters/web-crawlers' },
            { token: 'Diffbot', company: 'Diffbot', kind: 'training', docs: 'https://docs.diffbot.com/docs/diffbot-crawler' },
            { token: 'cohere-ai', company: 'Cohere', kind: 'training', docs: 'https://docs.cohere.com/docs/crawler' },
            { token: 'cohere-training-data-crawler', company: 'Cohere', kind: 'training', docs: 'https://docs.cohere.com/docs/crawler' },
            { token: 'ImagesiftBot', company: 'ImageSift', kind: 'training', docs: 'https://imagesift.com/' },
            { token: 'Omgili', company: 'Webz.io', kind: 'training', docs: 'https://omgili.com/' },
            { token: 'YouBot', company: 'You.com', kind: 'training', docs: 'https://about.you.com/youbot/' }
        ];

        const kindLabels = { training: 'training', search: 'live search', user: 'user-triggered', other: 'other' };
        const state = {};
        let preset = 'block-training';

        bots.forEach(function(bot) { state[bot.token] = bot.kind !== 'training'; });

        el.innerHTML = `
            <div class="tool-ui" style="max-width:900px; margin:0 auto;">
                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.25rem;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:0.85rem;">
                        <div>
                            <h2 style="font-size:1.2rem; margin:0 0 0.25rem;">AI Crawler robots.txt Generator</h2>
                            <p style="margin:0; color:var(--text-muted); font-size:0.85rem;">Allow or block GPTBot, ClaudeBot, PerplexityBot, CCBot and other AI crawlers. Merge the result into your existing robots.txt.</p>
                        </div>
                        <span id="robotsSummary" style="font-size:0.8rem; font-weight:600; color:var(--text-muted); white-space:nowrap;">0 of 22 blocked</span>
                    </div>

                    <div role="group" aria-label="Preset policies" style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button" class="robots-preset btn" data-preset="block-training" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.82rem;">Block training only</button>
                        <button type="button" class="robots-preset btn" data-preset="block-all" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.82rem;">Block all AI</button>
                        <button type="button" class="robots-preset btn" data-preset="allow-all" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.82rem;">Allow all AI</button>
                    </div>
                    <p style="margin:0.65rem 0 0; font-size:0.78rem; color:var(--text-muted); line-height:1.5;">Default blocks pure training crawlers while keeping search-oriented bots eligible. Toggle individual bots below for a custom policy.</p>
                </div>

                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.25rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:0.75rem;">
                        <input type="search" id="robotsFilter" class="search-bar" placeholder="Filter by bot or company..." aria-label="Filter crawlers" style="max-width:280px; width:100%;">
                        <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; color:var(--text-muted); cursor:pointer;">
                            <input type="checkbox" id="robotsGeneral" style="width:15px; height:15px; accent-color:var(--primary-color);">
                            Include generic crawler group
                        </label>
                    </div>
                    <div id="robotsBotList" style="border:1px solid var(--border-light); border-radius:10px; overflow:hidden;"></div>
                </div>

                <div style="background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm); margin-bottom:1.25rem;">
                    <label for="robotsSitemap" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.3rem;">Sitemap URL (optional)</label>
                    <input type="text" id="robotsSitemap" class="search-bar" placeholder="https://example.com/sitemap.xml" style="width:100%;">
                    <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.3rem;">Appended as a <code>Sitemap:</code> directive so compliant crawlers can still find your pages.</div>
                </div>

                <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-bottom:1.25rem;">
                    <button type="button" class="btn primary-btn" id="robotsGenerateBtn">Generate robots.txt</button>
                </div>

                <div id="robotsOutputWrap" style="display:none; background:var(--card-bg); border:1px solid var(--border-light); border-radius:12px; padding:1.25rem; box-shadow:var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:0.5rem;">
                        <h3 style="font-size:1rem; margin:0;">Generated robots.txt rules</h3>
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            <button type="button" class="btn" id="robotsCopyBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.82rem;">Copy</button>
                            <button type="button" class="btn" id="robotsDownloadBtn" style="background:var(--bg-subtle); color:var(--text-color); border:1px solid var(--border-light); font-size:0.82rem;">Download robots.txt</button>
                        </div>
                    </div>
                    <textarea id="robotsOutput" class="search-bar" rows="16" readonly style="width:100%; font-family:monospace; font-size:0.82rem; background:var(--bg-color);"></textarea>
                    <p style="margin:0.55rem 0 0; font-size:0.75rem; color:var(--text-muted); line-height:1.5;">robots.txt is voluntary and not access control. It stops compliant AI crawlers but cannot prevent scraping by bots that ignore the standard. Merge these groups into your existing robots.txt instead of replacing it.</p>
                </div>
            </div>
        `;

        const list = document.getElementById('robotsBotList');
        const filterInput = document.getElementById('robotsFilter');
        const sitemapInput = document.getElementById('robotsSitemap');
        const generalInput = document.getElementById('robotsGeneral');
        const outputWrap = document.getElementById('robotsOutputWrap');

        function updateSummary() {
            const blocked = bots.filter(function(bot) { return !state[bot.token]; }).length;
            document.getElementById('robotsSummary').textContent = blocked + ' of ' + bots.length + ' blocked';
        }

        function updatePresetButtons() {
            document.querySelectorAll('.robots-preset').forEach(function(button) {
                const active = button.getAttribute('data-preset') === preset;
                button.style.borderColor = active ? 'var(--primary-color)' : 'var(--border-light)';
                button.style.color = active ? 'var(--primary-color)' : 'var(--text-color)';
                button.style.fontWeight = active ? '700' : '500';
                button.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
        }

        function renderBots() {
            const filter = filterInput.value.trim().toLowerCase();
            list.innerHTML = bots.map(function(bot) {
                const allowed = state[bot.token];
                const matches = !filter || bot.token.toLowerCase().includes(filter) || bot.company.toLowerCase().includes(filter);
                return `
                    <div class="ai-bot-row" data-token="${bot.token}" style="display:${matches ? 'flex' : 'none'}; gap:12px; align-items:center; justify-content:space-between; padding:0.55rem 0.75rem; border-bottom:1px solid var(--border-light); flex-wrap:wrap;">
                        <div style="min-width:0;">
                            <div style="font-size:0.84rem;">
                                <code style="font-weight:700;">${bot.token}</code>
                                <span style="color:var(--text-muted); font-size:0.72rem;"> · ${bot.company} · ${kindLabels[bot.kind]}</span>
                            </div>
                            <a href="${bot.docs}" target="_blank" rel="noopener noreferrer" style="font-size:0.72rem; color:var(--primary-color);">operator docs</a>
                        </div>
                        <label style="display:flex; align-items:center; gap:6px; font-size:0.78rem; cursor:pointer; white-space:nowrap;">
                            <input type="checkbox" class="ai-bot-toggle" data-token="${bot.token}" ${allowed ? 'checked' : ''} style="width:16px; height:16px; accent-color:var(--primary-color);">
                            <span class="ai-bot-status" style="color:${allowed ? '#10b981' : '#ef4444'};">${allowed ? 'Allowed' : 'Blocked'}</span>
                        </label>
                    </div>
                `;
            }).join('');

            const visible = bots.some(function(bot) {
                return !filter || bot.token.toLowerCase().includes(filter) || bot.company.toLowerCase().includes(filter);
            });
            if (!visible) {
                list.innerHTML = '<div style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.85rem;">No crawlers match that filter.</div>';
            }
        }

        function generateRobots(show) {
            const sitemap = normalizeHttpUrl(sitemapInput.value);
            if (sitemapInput.value.trim() && !sitemap) {
                if (show) showToast('The sitemap URL is not valid. Use an absolute http(s) URL.', 'warning');
            }

            const lines = [
                '# AI crawler policy generated at https://100toolcrate.com/tools/ai-crawler-robots-generator',
                '# Merge these groups into your existing robots.txt.',
                ''
            ];

            bots.forEach(function(bot) {
                lines.push('User-agent: ' + bot.token);
                lines.push(state[bot.token] ? 'Allow: /' : 'Disallow: /');
                lines.push('');
            });

            if (generalInput.checked) {
                lines.push('User-agent: *');
                lines.push('Allow: /');
                lines.push('');
            }

            if (sitemap) {
                lines.push('Sitemap: ' + sitemap);
                lines.push('');
            }

            const output = lines.join('\n').trim() + '\n';
            document.getElementById('robotsOutput').value = output;
            if (show) {
                outputWrap.style.display = 'block';
                outputWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        function applyPreset(name) {
            preset = name;
            bots.forEach(function(bot) {
                if (name === 'allow-all') state[bot.token] = true;
                else if (name === 'block-all') state[bot.token] = false;
                else state[bot.token] = bot.kind !== 'training';
            });
            updatePresetButtons();
            updateSummary();
            renderBots();
            if (outputWrap.style.display !== 'none') generateRobots(false);
        }

        list.addEventListener('change', function(event) {
            const toggle = event.target.closest('.ai-bot-toggle');
            if (!toggle) return;
            state[toggle.getAttribute('data-token')] = toggle.checked;
            const status = toggle.closest('label').querySelector('.ai-bot-status');
            if (status) {
                status.textContent = toggle.checked ? 'Allowed' : 'Blocked';
                status.style.color = toggle.checked ? '#10b981' : '#ef4444';
            }
            preset = 'custom';
            updatePresetButtons();
            updateSummary();
            if (outputWrap.style.display !== 'none') generateRobots(false);
        });

        document.querySelectorAll('.robots-preset').forEach(function(button) {
            button.addEventListener('click', function() { applyPreset(button.getAttribute('data-preset')); });
        });

        filterInput.addEventListener('input', renderBots);
        sitemapInput.addEventListener('input', function() {
            if (outputWrap.style.display !== 'none') generateRobots(false);
        });
        generalInput.addEventListener('change', function() {
            if (outputWrap.style.display !== 'none') generateRobots(false);
        });

        document.getElementById('robotsGenerateBtn').addEventListener('click', function() {
            generateRobots(true);
        });

        document.getElementById('robotsCopyBtn').addEventListener('click', function() {
            const output = document.getElementById('robotsOutput').value;
            if (!output) return;
            navigator.clipboard.writeText(output).then(function() {
                showToast('robots.txt rules copied to clipboard!', 'success');
            }).catch(function() {
                showToast('Could not copy. Select the text and copy it manually.', 'error');
            });
        });

        document.getElementById('robotsDownloadBtn').addEventListener('click', function() {
            const output = document.getElementById('robotsOutput').value;
            if (!output) return;
            saveTextFile('robots.txt', output, 'text/plain;charset=utf-8');
            showToast('Downloading robots.txt', 'success');
        });

        updatePresetButtons();
        updateSummary();
        renderBots();
    }

    function validateFiles(files, inputElement) {
        // Clear any old error banners first
        const existingErr = document.getElementById('tool-size-error');
        if (existingErr) existingErr.remove();

        if (!files || files.length === 0) return true;

        const IMAGE_LIMIT = 10 * 1024 * 1024; // 10MB
        const PDF_LIMIT = 20 * 1024 * 1024;   // 20MB
        const DEFAULT_LIMIT = 20 * 1024 * 1024; // 20MB

        const acceptRules = inputElement ? (inputElement.getAttribute('accept') || '').split(',').map(rule => rule.trim().toLowerCase()).filter(Boolean) : [];

        function matchesAcceptRule(fileName, fileType, rule) {
            if (!rule) return true;
            if (rule.startsWith('.')) return fileName.endsWith(rule);
            if (rule === 'image/*') return fileType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|svg|avif|heic|heif)$/i.test(fileName);
            if (rule.endsWith('/*')) return fileType.startsWith(rule.slice(0, -1));
            if (rule === 'application/pdf') return fileType === rule || /\.pdf$/i.test(fileName);
            return fileType === rule || fileName.endsWith('.' + rule.split('/').pop());
        }

        let totalSize = 0;
        let isImageTool = false;
        let isPdfTool = false;

        if (acceptRules.some(r => r.includes('image'))) isImageTool = true;
        if (acceptRules.some(r => r.includes('pdf'))) isPdfTool = true;

        if (!isImageTool && !isPdfTool) {
            const firstFile = files[0];
            const type = firstFile.type.toLowerCase();
            const name = firstFile.name.toLowerCase();
            if (type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(name)) isImageTool = true;
            else if (type === 'application/pdf' || /\.pdf$/i.test(name)) isPdfTool = true;
        }

        const limit = isImageTool ? IMAGE_LIMIT : (isPdfTool ? PDF_LIMIT : DEFAULT_LIMIT);
        const limitMB = limit / (1024 * 1024);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = (file.name || '').toLowerCase();
            const fileType = (file.type || '').toLowerCase();

            if (file.size === 0) {
                const msg = (isPdfTool || /\.pdf$/i.test(fileName))
                    ? 'Cannot process empty (0-byte) PDF file: "' + (file.name || 'document.pdf') + '". Please select a valid document.'
                    : 'Cannot process empty (0-byte) file: "' + (file.name || 'file') + '". Please select a valid file.';
                showSizeError(msg);
                try { showToast(msg, "warning"); } catch (e) {}
                if (inputElement) inputElement.value = '';
                return false;
            }

            if (acceptRules.length && !acceptRules.some(rule => matchesAcceptRule(fileName, fileType, rule))) {
                const msg = `Only ${acceptRules.join(', ')} files are allowed here.`;
                showSizeError(msg);
                try { showToast(msg, "warning"); } catch (e) {}
                if (inputElement) inputElement.value = '';
                return false;
            }
            totalSize += file.size;
        }

        if (totalSize > limit) {
            const msg = files.length > 1 
                ? `Total size of all selected files must not exceed ${limitMB}MB.`
                : `File size must not exceed ${limitMB}MB.`;
            showSizeError(msg);
            try { showToast(msg, "warning"); } catch (e) { console.warn(e); }
            if (inputElement) inputElement.value = '';
            return false;
        }

        return true;
    }

    function showSizeError(message) {
        let errBox = document.getElementById('tool-size-error');
        if (!errBox) {
            errBox = document.createElement('div');
            errBox.id = 'tool-size-error';
            errBox.className = 'error-alert-banner';
        }

        errBox.innerHTML = `
            <div class="error-alert-content">
                <svg class="error-alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <span class="error-alert-text">${escapeHtml(message)}</span>
            </div>
            <button class="error-alert-close" aria-label="Close message">&times;</button>
        `;

        const container = document.querySelector('.tool-ui') || document.getElementById('tool-app-container');
        if (container) {
            container.insertBefore(errBox, container.firstChild);
            errBox.querySelector('.error-alert-close')?.addEventListener('click', () => errBox.remove());
            errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /* ---------------------------------------------------------------------
       2026 tool set: calculators
       --------------------------------------------------------------------- */

    function renderBmiCalculator(el) {
        el.innerHTML = `
            <div class="tool-ui tool-form" style="max-width:760px;margin:0 auto;">
                <div class="tool-tabs" id="bmiUnits" role="group" aria-label="Unit system">
                    <button type="button" class="tool-tab active" data-unit="metric">Metric (cm / kg)</button>
                    <button type="button" class="tool-tab" data-unit="imperial">Imperial (ft / lb)</button>
                </div>
                <div class="tool-form-grid" id="bmiFields"></div>
                <div class="tool-box" style="text-align:center;">
                    <div class="tool-label">Your body mass index</div>
                    <div id="bmiValue" class="tool-result-number" aria-live="polite">--</div>
                    <div id="bmiCategory" style="margin-top:0.45rem;font-size:1rem;font-weight:750;color:var(--text-muted);">Enter your height and weight</div>
                    <div class="tool-meter" style="margin-top:1.1rem;" aria-hidden="true"><span id="bmiBar" style="width:0%;"></span></div>
                    <div style="display:flex;justify-content:space-between;gap:0.35rem;margin-top:0.4rem;color:var(--text-muted);font-size:0.64rem;font-weight:650;">
                        <span>Under 18.5</span><span>18.5–24.9</span><span>25–29.9</span><span>30+</span>
                    </div>
                </div>
                <div class="tool-stat-grid">
                    <div class="tool-stat">
                        <div class="tool-stat-label">Healthy weight range</div>
                        <div class="tool-stat-value" id="bmiRange" style="font-size:0.98rem;">--</div>
                    </div>
                    <div class="tool-stat">
                        <div class="tool-stat-label">BMI prime</div>
                        <div class="tool-stat-value" id="bmiPrime">--</div>
                    </div>
                    <div class="tool-stat">
                        <div class="tool-stat-label">Height used</div>
                        <div class="tool-stat-value" id="bmiHeight" style="font-size:0.98rem;">--</div>
                    </div>
                </div>
                <p class="tool-hint">BMI is a screening estimate for adults. It does not measure body fat, muscle mass or health directly, and it is not designed for pregnancy or children. Speak to a clinician for personal advice.</p>
            </div>
        `;

        let unit = 'metric';

        function fieldsHtml() {
            if (unit === 'metric') {
                return `
                    <div class="tool-field">
                        <label for="bmiHeightCm">Height (cm)</label>
                        <input type="number" id="bmiHeightCm" min="50" max="260" step="0.1" value="175" inputmode="decimal">
                    </div>
                    <div class="tool-field">
                        <label for="bmiWeightKg">Weight (kg)</label>
                        <input type="number" id="bmiWeightKg" min="10" max="400" step="0.1" value="70" inputmode="decimal">
                    </div>
                `;
            }
            return `
                <div class="tool-field">
                    <label for="bmiHeightFt">Height (ft)</label>
                    <input type="number" id="bmiHeightFt" min="1" max="8" step="1" value="5" inputmode="numeric">
                </div>
                <div class="tool-field">
                    <label for="bmiHeightIn">Height (in)</label>
                    <input type="number" id="bmiHeightIn" min="0" max="11.9" step="0.1" value="9" inputmode="decimal">
                </div>
                <div class="tool-field">
                    <label for="bmiWeightLb">Weight (lb)</label>
                    <input type="number" id="bmiWeightLb" min="20" max="900" step="0.1" value="154" inputmode="decimal">
                </div>
            `;
        }

        function renderFields() {
            document.getElementById('bmiFields').innerHTML = fieldsHtml();
            document.querySelectorAll('#bmiUnits .tool-tab').forEach((btn) => {
                btn.classList.toggle('active', btn.getAttribute('data-unit') === unit);
            });
            document.querySelectorAll('#bmiFields input').forEach((input) => {
                input.addEventListener('input', calculate);
            });
            calculate();
        }

        function calculate() {
            let metres = 0;
            let kg = 0;
            let heightLabel = '--';
            let inRange = true;

            if (unit === 'metric') {
                const cm = parseFloat(document.getElementById('bmiHeightCm').value);
                kg = parseFloat(document.getElementById('bmiWeightKg').value);
                metres = cm / 100;
                inRange = isFinite(cm) && cm >= 50 && cm <= 260 && isFinite(kg) && kg >= 10 && kg <= 400;
                if (inRange) heightLabel = `${parseFloat(cm.toFixed(1))} cm`;
            } else {
                const ft = parseFloat(document.getElementById('bmiHeightFt').value) || 0;
                const inches = parseFloat(document.getElementById('bmiHeightIn').value) || 0;
                const lb = parseFloat(document.getElementById('bmiWeightLb').value);
                metres = ((ft * 12) + inches) * 0.0254;
                kg = lb * 0.45359237;
                inRange = ft >= 1 && ft <= 8 && inches >= 0 && inches <= 11.9 && isFinite(lb) && lb >= 20 && lb <= 900;
                if (inRange) heightLabel = `${ft} ft ${parseFloat(inches.toFixed(1))} in`;
            }

            const valueEl = document.getElementById('bmiValue');
            const categoryEl = document.getElementById('bmiCategory');
            const barEl = document.getElementById('bmiBar');
            const rangeEl = document.getElementById('bmiRange');
            const primeEl = document.getElementById('bmiPrime');
            const heightEl = document.getElementById('bmiHeight');

            if (!inRange || !isFinite(metres) || metres <= 0 || !isFinite(kg) || kg <= 0) {
                valueEl.textContent = '--';
                valueEl.style.color = 'var(--primary)';
                categoryEl.textContent = 'Enter height and weight within the supported ranges';
                categoryEl.style.color = 'var(--text-muted)';
                barEl.style.width = '0%';
                rangeEl.textContent = '--';
                primeEl.textContent = '--';
                heightEl.textContent = '--';
                return;
            }

            const bmi = kg / (metres * metres);
            let label = 'Normal weight';
            let color = 'var(--tool-success)';
            if (bmi < 18.5) { label = 'Underweight'; color = '#60A5FA'; }
            else if (bmi < 25) { label = 'Normal weight'; color = 'var(--tool-success)'; }
            else if (bmi < 30) { label = 'Overweight'; color = '#FBBF24'; }
            else { label = 'Obesity'; color = 'var(--tool-danger)'; }

            const minKg = 18.5 * metres * metres;
            const maxKg = 24.9 * metres * metres;
            const rangeText = unit === 'metric'
                ? `${minKg.toFixed(1)}–${maxKg.toFixed(1)} kg`
                : `${(minKg / 0.45359237).toFixed(1)}–${(maxKg / 0.45359237).toFixed(1)} lb`;

            valueEl.textContent = bmi.toFixed(1);
            valueEl.style.color = color;
            categoryEl.textContent = label;
            categoryEl.style.color = color;
            rangeEl.textContent = rangeText;
            primeEl.textContent = (bmi / 25).toFixed(2);
            heightEl.textContent = heightLabel;

            const pct = Math.max(0, Math.min(100, ((bmi - 15) / 25) * 100));
            barEl.style.width = pct.toFixed(1) + '%';
            barEl.style.background = color;
        }

        document.querySelectorAll('#bmiUnits .tool-tab').forEach((btn) => {
            btn.addEventListener('click', () => {
                unit = btn.getAttribute('data-unit');
                renderFields();
            });
        });

        renderFields();
    }

    function renderCalorieMacroCalculator(el) {
        el.innerHTML = `
            <div class="tool-ui tool-form" style="max-width:820px;margin:0 auto;">
                <div class="tool-tabs" id="calUnits" role="group" aria-label="Unit system">
                    <button type="button" class="tool-tab active" data-unit="metric">Metric</button>
                    <button type="button" class="tool-tab" data-unit="imperial">Imperial</button>
                </div>
                <div class="tool-form-grid" id="calFields"></div>
                <div class="tool-box" style="text-align:center;">
                    <div class="tool-label">Daily calorie target</div>
                    <div id="calTarget" class="tool-result-number">--</div>
                    <div class="tool-hint" id="calGoalNote" style="margin-top:0.45rem;">kcal per day</div>
                </div>
                <div class="tool-stat-grid">
                    <div class="tool-stat"><div class="tool-stat-label">BMR</div><div class="tool-stat-value" id="calBmr">--</div></div>
                    <div class="tool-stat"><div class="tool-stat-label">Maintenance (TDEE)</div><div class="tool-stat-value" id="calTdee">--</div></div>
                    <div class="tool-stat"><div class="tool-stat-label">Protein</div><div class="tool-stat-value" id="calProtein">--</div></div>
                    <div class="tool-stat"><div class="tool-stat-label">Carbs</div><div class="tool-stat-value" id="calCarbs">--</div></div>
                    <div class="tool-stat"><div class="tool-stat-label">Fat</div><div class="tool-stat-value" id="calFat">--</div></div>
                </div>
                <p class="tool-hint" id="calWarning" role="status"></p>
                <p class="tool-hint">Estimates use the Mifflin–St Jeor equation and an activity multiplier. They are a starting point, not medical or dietetic advice. Do not routinely eat below 1,200 kcal (women) or 1,500 kcal (men) per day without professional guidance.</p>
            </div>
        `;

        let unit = 'metric';

        function fieldsHtml() {
            const heightFields = unit === 'metric'
                ? `<div class="tool-field"><label for="calHeightCm">Height (cm)</label><input type="number" id="calHeightCm" min="120" max="230" step="0.1" value="175" inputmode="decimal"></div>`
                : `<div class="tool-field"><label for="calHeightFt">Height (ft)</label><input type="number" id="calHeightFt" min="3" max="8" step="1" value="5" inputmode="numeric"></div>
                   <div class="tool-field"><label for="calHeightIn">Height (in)</label><input type="number" id="calHeightIn" min="0" max="11.9" step="0.1" value="9" inputmode="decimal"></div>`;
            const weightField = unit === 'metric'
                ? `<div class="tool-field"><label for="calWeight">Weight (kg)</label><input type="number" id="calWeight" min="30" max="350" step="0.1" value="70" inputmode="decimal"></div>`
                : `<div class="tool-field"><label for="calWeight">Weight (lb)</label><input type="number" id="calWeight" min="60" max="800" step="0.1" value="154" inputmode="decimal"></div>`;

            return `
                <div class="tool-field"><label for="calSex">Sex at birth</label>
                    <select id="calSex"><option value="male">Male</option><option value="female">Female</option></select>
                </div>
                <div class="tool-field"><label for="calAge">Age (years)</label><input type="number" id="calAge" min="14" max="100" step="1" value="30" inputmode="numeric"></div>
                ${heightFields}
                ${weightField}
                <div class="tool-field"><label for="calActivity">Activity level</label>
                    <select id="calActivity">
                        <option value="1.2">Sedentary — little exercise</option>
                        <option value="1.375">Light — 1–3 days/week</option>
                        <option value="1.55" selected>Moderate — 3–5 days/week</option>
                        <option value="1.725">Very active — 6–7 days/week</option>
                        <option value="1.9">Athlete — hard daily training</option>
                    </select>
                </div>
                <div class="tool-field"><label for="calGoal">Goal</label>
                    <select id="calGoal">
                        <option value="-500">Lose 0.5 kg / week</option>
                        <option value="-250">Lose 0.25 kg / week</option>
                        <option value="0" selected>Maintain weight</option>
                        <option value="250">Gain 0.25 kg / week</option>
                        <option value="500">Gain 0.5 kg / week</option>
                    </select>
                </div>
                <div class="tool-field"><label for="calSplit">Macro split</label>
                    <select id="calSplit">
                        <option value="balanced" selected>Balanced (30P / 40C / 30F)</option>
                        <option value="high-protein">High protein (40P / 30C / 30F)</option>
                        <option value="low-carb">Lower carb (30P / 25C / 45F)</option>
                        <option value="lower-fat">Lower fat (25P / 55C / 20F)</option>
                    </select>
                </div>
            `;
        }

        function renderFields() {
            document.getElementById('calFields').innerHTML = fieldsHtml();
            document.querySelectorAll('#calUnits .tool-tab').forEach((btn) => {
                btn.classList.toggle('active', btn.getAttribute('data-unit') === unit);
            });
            document.querySelectorAll('#calFields input, #calFields select').forEach((input) => {
                input.addEventListener('input', calculate);
                input.addEventListener('change', calculate);
            });
            calculate();
        }

        function calculate() {
            const sex = document.getElementById('calSex').value;
            const age = parseFloat(document.getElementById('calAge').value);
            const activity = parseFloat(document.getElementById('calActivity').value);
            const goal = parseFloat(document.getElementById('calGoal').value);
            const split = document.getElementById('calSplit').value;

            let cm = 0;
            let kg = 0;
            if (unit === 'metric') {
                cm = parseFloat(document.getElementById('calHeightCm').value);
                kg = parseFloat(document.getElementById('calWeight').value);
            } else {
                const ft = parseFloat(document.getElementById('calHeightFt').value) || 0;
                const inches = parseFloat(document.getElementById('calHeightIn').value) || 0;
                cm = ((ft * 12) + inches) * 2.54;
                kg = parseFloat(document.getElementById('calWeight').value) * 0.45359237;
            }

            const targetEl = document.getElementById('calTarget');
            const warningEl = document.getElementById('calWarning');
            const outputs = ['calBmr', 'calTdee', 'calProtein', 'calCarbs', 'calFat'];
            if (!isFinite(age) || age < 14 || age > 100 || !isFinite(cm) || cm < 120 || cm > 230 || !isFinite(kg) || kg < 30 || kg > 350) {
                targetEl.textContent = '--';
                outputs.forEach((id) => { document.getElementById(id).textContent = '--'; });
                warningEl.textContent = 'Enter an age, height and weight within the supported ranges.';
                return;
            }

            const bmr = (10 * kg) + (6.25 * cm) - (5 * age) + (sex === 'male' ? 5 : -161);
            const tdee = bmr * activity;
            const target = Math.max(0, tdee + goal);
            const splits = {
                balanced: { p: 0.30, c: 0.40, f: 0.30 },
                'high-protein': { p: 0.40, c: 0.30, f: 0.30 },
                'low-carb': { p: 0.30, c: 0.25, f: 0.45 },
                'lower-fat': { p: 0.25, c: 0.55, f: 0.20 }
            };
            const macro = splits[split] || splits.balanced;

            targetEl.textContent = Math.round(target).toLocaleString();
            document.getElementById('calBmr').textContent = Math.round(bmr).toLocaleString() + ' kcal';
            document.getElementById('calTdee').textContent = Math.round(tdee).toLocaleString() + ' kcal';
            document.getElementById('calProtein').textContent = Math.round((target * macro.p) / 4) + ' g';
            document.getElementById('calCarbs').textContent = Math.round((target * macro.c) / 4) + ' g';
            document.getElementById('calFat').textContent = Math.round((target * macro.f) / 9) + ' g';

            const floor = sex === 'female' ? 1200 : 1500;
            warningEl.textContent = target < floor
                ? `This target is below the common ${floor.toLocaleString()} kcal safety floor. Consider a smaller deficit or professional guidance.`
                : '';
        }

        document.querySelectorAll('#calUnits .tool-tab').forEach((btn) => {
            btn.addEventListener('click', () => {
                unit = btn.getAttribute('data-unit');
                renderFields();
            });
        });

        renderFields();
    }

    function renderTipCalculator(el) {
        el.innerHTML = `
            <div class="tool-ui tool-form" style="max-width:680px;margin:0 auto;">
                <div class="tool-form-grid">
                    <div class="tool-field">
                        <label for="tipBill">Bill amount</label>
                        <input type="number" id="tipBill" min="0" step="0.01" value="100" inputmode="decimal">
                    </div>
                    <div class="tool-field">
                        <label for="tipCurrency">Currency</label>
                        <select id="tipCurrency">
                            <option value="USD" selected>USD — US dollar</option>
                            <option value="EUR">EUR — Euro</option>
                            <option value="GBP">GBP — British pound</option>
                            <option value="CAD">CAD — Canadian dollar</option>
                            <option value="AUD">AUD — Australian dollar</option>
                            <option value="INR">INR — Indian rupee</option>
                            <option value="JPY">JPY — Japanese yen</option>
                        </select>
                    </div>
                    <div class="tool-field">
                        <label for="tipPeople">Split between</label>
                        <input type="number" id="tipPeople" min="1" max="100" step="1" value="1" inputmode="numeric">
                    </div>
                </div>
                <div class="tool-field">
                    <span class="tool-label">Tip percentage</span>
                    <div class="tool-tabs" id="tipPresets" role="group" aria-label="Tip percentage presets">
                        <button type="button" class="tool-tab" data-tip="10">10%</button>
                        <button type="button" class="tool-tab" data-tip="15">15%</button>
                        <button type="button" class="tool-tab active" data-tip="18">18%</button>
                        <button type="button" class="tool-tab" data-tip="20">20%</button>
                        <button type="button" class="tool-tab" data-tip="25">25%</button>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.55rem;">
                        <input type="number" id="tipPct" min="0" max="100" step="0.5" value="18" style="max-width:7rem;" inputmode="decimal" aria-label="Custom tip percentage">
                        <span class="tool-hint">% custom tip</span>
                    </div>
                </div>
                <label class="tool-checkbox-row">
                    <input type="checkbox" id="tipRound">
                    Round the total up to the nearest whole unit
                </label>
                <div class="tool-box">
                    <div class="tool-stat-grid">
                        <div class="tool-stat"><div class="tool-stat-label">Tip</div><div class="tool-stat-value" id="tipAmount">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">Total</div><div class="tool-stat-value" id="tipTotal">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">Per person</div><div class="tool-stat-value" id="tipPerPerson">--</div></div>
                    </div>
                    <p class="tool-hint" id="tipDetail" style="margin-top:0.75rem;"></p>
                </div>
            </div>
        `;

        const billInput = document.getElementById('tipBill');
        const pctInput = document.getElementById('tipPct');
        const peopleInput = document.getElementById('tipPeople');
        const currencyInput = document.getElementById('tipCurrency');
        const roundInput = document.getElementById('tipRound');
        const presets = Array.from(document.querySelectorAll('#tipPresets .tool-tab'));

        function money(value) {
            try {
                return new Intl.NumberFormat(undefined, {
                    style: 'currency',
                    currency: currencyInput.value,
                    maximumFractionDigits: currencyInput.value === 'JPY' ? 0 : 2
                }).format(value);
            } catch (err) {
                return value.toFixed(2);
            }
        }

        function calculate() {
            const bill = Math.max(0, parseFloat(billInput.value) || 0);
            const pct = Math.max(0, Math.min(100, parseFloat(pctInput.value) || 0));
            const people = Math.max(1, Math.floor(parseFloat(peopleInput.value) || 1));

            let tip = bill * (pct / 100);
            let total = bill + tip;
            if (roundInput.checked) {
                total = Math.ceil(total);
                tip = Math.max(0, total - bill);
            }
            const perPerson = total / people;
            const tipPerPerson = tip / people;

            document.getElementById('tipAmount').textContent = money(tip);
            document.getElementById('tipTotal').textContent = money(total);
            document.getElementById('tipPerPerson').textContent = money(perPerson);
            document.getElementById('tipDetail').textContent = people > 1
                ? `${money(tipPerPerson)} tip per person · ${money(bill / people)} bill per person`
                : `${pct.toFixed(pct % 1 === 0 ? 0 : 1)}% tip applied`;

            presets.forEach((btn) => {
                btn.classList.toggle('active', parseFloat(btn.getAttribute('data-tip')) === pct);
            });
        }

        presets.forEach((btn) => {
            btn.addEventListener('click', () => {
                pctInput.value = btn.getAttribute('data-tip');
                calculate();
            });
        });

        [billInput, pctInput, peopleInput, currencyInput, roundInput].forEach((input) => {
            input.addEventListener('input', calculate);
            input.addEventListener('change', calculate);
        });

        calculate();
    }

    /* ---------------------------------------------------------------------
       2026 tool set: developer utilities
       --------------------------------------------------------------------- */

    function renderJwtDecoder(el) {
        el.innerHTML = `
            <div class="tool-ui tool-form" style="max-width:920px;margin:0 auto;">
                <div class="tool-field">
                    <label for="jwtInput">Paste a JSON Web Token</label>
                    <textarea id="jwtInput" rows="5" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature" spellcheck="false" autocapitalize="off" autocomplete="off" style="min-height:7rem;"></textarea>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                    <button type="button" class="btn" id="jwtDecode">Decode token</button>
                    <button type="button" class="btn tool-btn-secondary" id="jwtSample">Load sample</button>
                    <button type="button" class="btn tool-btn-secondary" id="jwtClear">Clear</button>
                </div>
                <div class="tool-hint" id="jwtStatus" role="status">Tokens are decoded locally. Decoding does not prove a token is valid or trustworthy.</div>
                <div id="jwtResults" style="display:none;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;">
                    <div class="tool-box">
                        <div class="tool-label">Header</div>
                        <pre class="tool-output" id="jwtHeader" style="margin-top:0.5rem;"></pre>
                    </div>
                    <div class="tool-box">
                        <div class="tool-label">Payload</div>
                        <pre class="tool-output" id="jwtPayload" style="margin-top:0.5rem;"></pre>
                    </div>
                </div>
                <div class="tool-box" id="jwtClaimsBox" style="display:none;">
                    <div class="tool-label">Registered claims</div>
                    <div style="overflow-x:auto;margin-top:0.5rem;">
                        <table class="tool-table" id="jwtClaims"></table>
                    </div>
                </div>
                <div class="tool-box">
                    <div class="tool-label">Verify an HMAC signature (optional)</div>
                    <div class="tool-form-grid" style="margin-top:0.6rem;">
                        <div class="tool-field">
                            <label for="jwtAlg">Algorithm</label>
                            <select id="jwtAlg">
                                <option value="HS256">HS256</option>
                                <option value="HS384">HS384</option>
                                <option value="HS512">HS512</option>
                            </select>
                        </div>
                        <div class="tool-field">
                            <label for="jwtSecret">Secret</label>
                            <input type="password" id="jwtSecret" placeholder="Shared HMAC secret" autocomplete="off">
                        </div>
                    </div>
                    <div style="margin-top:0.75rem;">
                        <button type="button" class="btn" id="jwtVerify">Verify signature</button>
                    </div>
                    <div class="tool-hint" id="jwtVerifyResult" role="status" style="margin-top:0.6rem;">Only HS256, HS384 and HS512 verification is supported here. RS256 and ES256 tokens can be decoded but not verified.</div>
                </div>
            </div>
        `;

        const input = document.getElementById('jwtInput');
        const statusEl = document.getElementById('jwtStatus');
        const resultsEl = document.getElementById('jwtResults');
        const claimsBox = document.getElementById('jwtClaimsBox');
        const claimsEl = document.getElementById('jwtClaims');
        const headerEl = document.getElementById('jwtHeader');
        const payloadEl = document.getElementById('jwtPayload');
        const verifyResult = document.getElementById('jwtVerifyResult');
        const algSelect = document.getElementById('jwtAlg');
        const secretInput = document.getElementById('jwtSecret');
        let decodedParts = null;

        function setStatus(message, state) {
            statusEl.textContent = message;
            statusEl.style.color = state === 'error' ? 'var(--tool-danger)' : state === 'success' ? 'var(--tool-success)' : 'var(--text-muted)';
        }

        function base64UrlToBytes(value) {
            const normalised = value.replace(/-/g, '+').replace(/_/g, '/');
            const padded = normalised + '='.repeat((4 - (normalised.length % 4)) % 4);
            const binary = atob(padded);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
            return bytes;
        }

        function base64UrlToText(value) {
            return new TextDecoder().decode(base64UrlToBytes(value));
        }

        function bytesToBase64Url(bytes) {
            let binary = '';
            bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
            return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
        }

        function relativeTime(seconds) {
            const diff = seconds - Math.floor(Date.now() / 1000);
            const abs = Math.abs(diff);
            if (abs < 1) return 'now';
            const units = [
                ['year', 31536000], ['month', 2592000], ['day', 86400],
                ['hour', 3600], ['minute', 60], ['second', 1]
            ];
            for (const [name, size] of units) {
                if (abs >= size || name === 'second') {
                    const value = Math.round(abs / size);
                    const text = `${value} ${name}${value === 1 ? '' : 's'}`;
                    return diff >= 0 ? `in ${text}` : `${text} ago`;
                }
            }
            return 'now';
        }

        function claimRow(label, value, state) {
            const color = state === 'bad' ? 'var(--tool-danger)' : state === 'good' ? 'var(--tool-success)' : 'var(--text-color)';
            return `<tr><th scope="row" style="width:28%;">${escapeHtml(label)}</th><td style="color:${color};">${escapeHtml(value)}</td></tr>`;
        }

        function decodeToken() {
            const token = input.value.trim().replace(/\s+/g, '');
            if (!token) {
                setStatus('Paste a JWT or load the sample token first.', 'error');
                return;
            }

            const parts = token.split('.');
            if (parts.length !== 3) {
                setStatus('A JWT must contain three dot-separated parts: header.payload.signature.', 'error');
                resultsEl.style.display = 'none';
                claimsBox.style.display = 'none';
                return;
            }

            let header;
            let payload;
            try {
                header = JSON.parse(base64UrlToText(parts[0]));
                payload = JSON.parse(base64UrlToText(parts[1]));
            } catch (err) {
                setStatus('Could not decode the token. Check that the header and payload are valid Base64URL JSON.', 'error');
                resultsEl.style.display = 'none';
                claimsBox.style.display = 'none';
                return;
            }

            decodedParts = { token, parts, header, payload };
            headerEl.textContent = JSON.stringify(header, null, 2);
            payloadEl.textContent = JSON.stringify(payload, null, 2);
            resultsEl.style.display = 'grid';

            const rows = [];
            const now = Math.floor(Date.now() / 1000);
            const dateLabel = (value) => new Date(value * 1000).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'medium' });

            if (typeof payload.exp === 'number') {
                rows.push(claimRow('exp', `${dateLabel(payload.exp)} (${relativeTime(payload.exp)})`, payload.exp <= now ? 'bad' : 'good'));
            }
            if (typeof payload.nbf === 'number') {
                rows.push(claimRow('nbf', `${dateLabel(payload.nbf)} (${relativeTime(payload.nbf)})`, payload.nbf > now ? 'bad' : 'good'));
            }
            if (typeof payload.iat === 'number') {
                rows.push(claimRow('iat', `${dateLabel(payload.iat)} (${relativeTime(payload.iat)})`));
            }
            ['iss', 'aud', 'sub', 'jti'].forEach((key) => {
                if (payload[key] !== undefined) {
                    const value = Array.isArray(payload[key]) ? payload[key].join(', ') : String(payload[key]);
                    rows.push(claimRow(key, value));
                }
            });

            claimsEl.innerHTML = rows.length
                ? rows.join('')
                : '<tr><td style="color:var(--text-muted);">No registered claims found. Custom claims are shown in the payload above.</td></tr>';
            claimsBox.style.display = 'block';

            const alg = String(header.alg || '').toUpperCase();
            if (['HS256', 'HS384', 'HS512'].includes(alg)) {
                algSelect.value = alg;
                setStatus(`Decoded ${alg} token locally. Signature not verified yet.`, 'success');
            } else {
                setStatus(`Decoded locally. Algorithm ${alg || 'unknown'} cannot be verified in this tool.`, 'success');
            }
        }

        async function loadSample() {
            try {
                if (!window.crypto || !window.crypto.subtle) throw new Error('Web Crypto is unavailable in this browser context.');
                const encoder = new TextEncoder();
                const now = Math.floor(Date.now() / 1000);
                const header = { alg: 'HS256', typ: 'JWT' };
                const payload = {
                    sub: '1234567890',
                    name: 'Ada Lovelace',
                    role: 'admin',
                    iat: now,
                    exp: now + 3600
                };
                const signingInput = `${bytesToBase64Url(encoder.encode(JSON.stringify(header)))}.${bytesToBase64Url(encoder.encode(JSON.stringify(payload)))}`;
                const key = await crypto.subtle.importKey('raw', encoder.encode('demo-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
                const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
                input.value = `${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}`;
                algSelect.value = 'HS256';
                secretInput.value = 'demo-secret';
                decodeToken();
                verifyResult.textContent = 'Sample token loaded. Click "Verify signature" to check it with the demo secret.';
                verifyResult.style.color = 'var(--text-muted)';
            } catch (err) {
                setStatus('Could not create the sample token: ' + err.message, 'error');
            }
        }

        async function verifySignature() {
            if (!decodedParts) {
                verifyResult.textContent = 'Decode a token before verifying its signature.';
                verifyResult.style.color = 'var(--tool-danger)';
                return;
            }
            if (!window.crypto || !window.crypto.subtle) {
                verifyResult.textContent = 'Web Crypto is unavailable. Use HTTPS or localhost to verify signatures.';
                verifyResult.style.color = 'var(--tool-danger)';
                return;
            }

            const alg = algSelect.value;
            const secret = secretInput.value;
            if (!secret) {
                verifyResult.textContent = 'Enter the shared secret used to sign the token.';
                verifyResult.style.color = 'var(--tool-danger)';
                return;
            }

            try {
                const hashes = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };
                const encoder = new TextEncoder();
                const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: hashes[alg] }, false, ['verify']);
                const signature = base64UrlToBytes(decodedParts.parts[2]);
                const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(`${decodedParts.parts[0]}.${decodedParts.parts[1]}`));
                if (valid) {
                    verifyResult.textContent = `Signature is valid for ${alg}. The token was signed with this secret.`;
                    verifyResult.style.color = 'var(--tool-success)';
                    setStatus(`Decoded and verified ${alg} token locally.`, 'success');
                } else {
                    verifyResult.textContent = `Signature does not match for ${alg}. The token may be altered, or the secret may be wrong.`;
                    verifyResult.style.color = 'var(--tool-danger)';
                }
            } catch (err) {
                verifyResult.textContent = 'Verification failed: ' + err.message;
                verifyResult.style.color = 'var(--tool-danger)';
            }
        }

        document.getElementById('jwtDecode').addEventListener('click', decodeToken);
        document.getElementById('jwtSample').addEventListener('click', loadSample);
        document.getElementById('jwtClear').addEventListener('click', () => {
            input.value = '';
            secretInput.value = '';
            decodedParts = null;
            resultsEl.style.display = 'none';
            claimsBox.style.display = 'none';
            setStatus('Cleared. Paste a token to decode it.', 'idle');
            verifyResult.textContent = 'Only HS256, HS384 and HS512 verification is supported here.';
            verifyResult.style.color = 'var(--text-muted)';
        });
        document.getElementById('jwtVerify').addEventListener('click', verifySignature);
        input.addEventListener('input', () => {
            if (decodedParts) {
                decodedParts = null;
                resultsEl.style.display = 'none';
                claimsBox.style.display = 'none';
                setStatus('Token changed. Decode again to inspect the new value.', 'idle');
            }
        });
    }

    function renderUnixTimestampConverter(el) {
        el.innerHTML = `
            <div class="tool-ui tool-form" style="max-width:820px;margin:0 auto;">
                <div class="tool-box" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
                    <div>
                        <div class="tool-label">Current Unix time</div>
                        <div id="tsNow" style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:1.35rem;font-weight:800;color:var(--primary);font-variant-numeric:tabular-nums;">--</div>
                    </div>
                    <button type="button" class="btn tool-btn-secondary" id="tsCopyNow">Copy timestamp</button>
                </div>

                <div class="tool-box">
                    <div class="tool-label">Timestamp → date</div>
                    <div class="tool-form-grid" style="margin-top:0.6rem;">
                        <div class="tool-field">
                            <label for="tsInput">Timestamp</label>
                            <input type="text" id="tsInput" inputmode="numeric" placeholder="e.g. 1767225600" autocomplete="off">
                        </div>
                        <div class="tool-field">
                            <label for="tsUnit">Unit</label>
                            <select id="tsUnit">
                                <option value="auto">Detect automatically</option>
                                <option value="s">Seconds</option>
                                <option value="ms">Milliseconds</option>
                            </select>
                        </div>
                    </div>
                    <div class="tool-stat-grid" style="margin-top:0.8rem;">
                        <div class="tool-stat"><div class="tool-stat-label">Local time</div><div class="tool-stat-value" id="tsLocal" style="font-size:0.92rem;">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">UTC</div><div class="tool-stat-value" id="tsUtc" style="font-size:0.92rem;">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">ISO 8601</div><div class="tool-stat-value" id="tsIso" style="font-size:0.92rem;">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">Relative</div><div class="tool-stat-value" id="tsRelative" style="font-size:0.92rem;">--</div></div>
                    </div>
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem;">
                        <button type="button" class="btn tool-btn-secondary" id="tsUseNow">Use current time</button>
                    </div>
                </div>

                <div class="tool-box">
                    <div class="tool-label">Date → timestamp</div>
                    <div class="tool-form-grid" style="margin-top:0.6rem;">
                        <div class="tool-field">
                            <label for="tsDate">Local date and time</label>
                            <input type="datetime-local" id="tsDate" step="1">
                        </div>
                        <div class="tool-field">
                            <label for="tsDateUnit">Output unit</label>
                            <select id="tsDateUnit">
                                <option value="s">Seconds</option>
                                <option value="ms">Milliseconds</option>
                            </select>
                        </div>
                    </div>
                    <div class="tool-stat-grid" style="margin-top:0.8rem;">
                        <div class="tool-stat"><div class="tool-stat-label">Seconds</div><div class="tool-stat-value" id="tsSeconds">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">Milliseconds</div><div class="tool-stat-value" id="tsMillis">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">ISO 8601</div><div class="tool-stat-value" id="tsDateIso" style="font-size:0.92rem;">--</div></div>
                    </div>
                </div>
                <p class="tool-hint">Unix time counts seconds since 1 January 1970 at 00:00:00 UTC. Values with 13 or more digits are treated as milliseconds when automatic detection is on.</p>
            </div>
        `;

        const nowEl = document.getElementById('tsNow');
        const tsInput = document.getElementById('tsInput');
        const unitSelect = document.getElementById('tsUnit');
        const dateInput = document.getElementById('tsDate');

        if (window.__tsClockInterval) clearInterval(window.__tsClockInterval);

        function toLocalInputValue(date) {
            const pad = (value) => String(value).padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        }

        function relativeFromNow(date) {
            const diff = Math.round((date.getTime() - Date.now()) / 1000);
            const abs = Math.abs(diff);
            if (abs < 1) return 'now';
            const units = [
                ['year', 31536000], ['month', 2592000], ['day', 86400],
                ['hour', 3600], ['minute', 60], ['second', 1]
            ];
            for (const [name, size] of units) {
                if (abs >= size || name === 'second') {
                    const value = Math.round(abs / size);
                    const text = `${value} ${name}${value === 1 ? '' : 's'}`;
                    return diff >= 0 ? `in ${text}` : `${text} ago`;
                }
            }
            return 'now';
        }

        function updateNow() {
            const seconds = Math.floor(Date.now() / 1000);
            nowEl.textContent = String(seconds);
        }

        function convertTimestamp() {
            const raw = tsInput.value.trim();
            const targets = {
                local: document.getElementById('tsLocal'),
                utc: document.getElementById('tsUtc'),
                iso: document.getElementById('tsIso'),
                relative: document.getElementById('tsRelative')
            };
            if (!raw) {
                Object.values(targets).forEach((node) => { node.textContent = '--'; });
                return;
            }
            if (!/^-?\d+(\.\d+)?$/.test(raw)) {
                Object.values(targets).forEach((node) => { node.textContent = 'Invalid timestamp'; });
                return;
            }
            let value = Number(raw);
            let unit = unitSelect.value;
            if (unit === 'auto') unit = Math.abs(value) >= 1e12 || String(raw).replace(/[^0-9]/g, '').length >= 13 ? 'ms' : 's';
            if (unit === 's') value *= 1000;
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                Object.values(targets).forEach((node) => { node.textContent = 'Invalid timestamp'; });
                return;
            }
            targets.local.textContent = date.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'medium' });
            targets.utc.textContent = date.toUTCString();
            targets.iso.textContent = date.toISOString();
            targets.relative.textContent = relativeFromNow(date);
        }

        function convertDate() {
            const secondsEl = document.getElementById('tsSeconds');
            const millisEl = document.getElementById('tsMillis');
            const isoEl = document.getElementById('tsDateIso');
            if (!dateInput.value) {
                secondsEl.textContent = '--';
                millisEl.textContent = '--';
                isoEl.textContent = '--';
                return;
            }
            const date = new Date(dateInput.value);
            if (Number.isNaN(date.getTime())) {
                secondsEl.textContent = 'Invalid date';
                millisEl.textContent = 'Invalid date';
                isoEl.textContent = 'Invalid date';
                return;
            }
            const ms = date.getTime();
            secondsEl.textContent = String(Math.floor(ms / 1000));
            millisEl.textContent = String(ms);
            isoEl.textContent = date.toISOString();
        }

        function fillNow() {
            const now = new Date();
            tsInput.value = String(Math.floor(now.getTime() / 1000));
            dateInput.value = toLocalInputValue(now);
            unitSelect.value = 'auto';
            convertTimestamp();
            convertDate();
        }

        tsInput.addEventListener('input', convertTimestamp);
        unitSelect.addEventListener('change', convertTimestamp);
        dateInput.addEventListener('input', convertDate);
        document.getElementById('tsUseNow').addEventListener('click', fillNow);
        document.getElementById('tsCopyNow').addEventListener('click', () => {
            const seconds = String(Math.floor(Date.now() / 1000));
            navigator.clipboard.writeText(seconds).then(() => {
                showToast('Current Unix timestamp copied.', 'success');
            }).catch(() => {
                showToast('Could not copy the timestamp.', 'warning');
            });
        });

        updateNow();
        fillNow();
        window.__tsClockInterval = setInterval(updateNow, 1000);
    }

    function renderReadabilityChecker(el) {
        el.innerHTML = `
            <div class="tool-ui tool-form" style="max-width:900px;margin:0 auto;">
                <div class="tool-field">
                    <label for="readText">English text to analyse</label>
                    <textarea id="readText" rows="10" placeholder="Paste an article, essay, email or any English text. Scores update as you type." style="min-height:11rem;"></textarea>
                </div>
                <div class="tool-hint" id="readEmpty">Paste at least a few sentences to calculate readability scores. Formulas are designed for English prose.</div>
                <div id="readResults" style="display:none;flex-direction:column;gap:1rem;">
                    <div class="tool-stat-grid">
                        <div class="tool-stat"><div class="tool-stat-label">Flesch Reading Ease</div><div class="tool-stat-value" id="readFlesch">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">Flesch–Kincaid Grade</div><div class="tool-stat-value" id="readFk">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">Gunning Fog</div><div class="tool-stat-value" id="readFog">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">SMOG Index</div><div class="tool-stat-value" id="readSmog">--</div></div>
                    </div>
                    <div class="tool-box">
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
                            <span class="tool-label" style="margin:0;">Readability level</span>
                            <strong id="readLabel" style="font-size:0.95rem;"></strong>
                        </div>
                        <div class="tool-meter" style="margin-top:0.6rem;"><span id="readBar" style="width:0%;"></span></div>
                        <p class="tool-hint" id="readAdvice" style="margin-top:0.65rem;"></p>
                    </div>
                    <div class="tool-stat-grid">
                        <div class="tool-stat"><div class="tool-stat-label">Words</div><div class="tool-stat-value" id="readWords">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">Sentences</div><div class="tool-stat-value" id="readSentences">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">Words / sentence</div><div class="tool-stat-value" id="readAvgSentence">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">Syllables / word</div><div class="tool-stat-value" id="readAvgSyllable">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">Reading time</div><div class="tool-stat-value" id="readTime">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">Coleman–Liau</div><div class="tool-stat-value" id="readColeman">--</div></div>
                    </div>
                    <p class="tool-hint">Scores are estimates based on syllable and sentence heuristics. Names, technical terms and abbreviations can skew results.</p>
                </div>
            </div>
        `;

        const textInput = document.getElementById('readText');
        const results = document.getElementById('readResults');
        const empty = document.getElementById('readEmpty');

        function countSyllables(word) {
            let cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
            if (!cleaned) return 0;
            if (cleaned.length <= 3) return 1;
            cleaned = cleaned.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
            cleaned = cleaned.replace(/^y/, '');
            const groups = cleaned.match(/[aeiouy]{1,2}/g);
            return groups ? groups.length : 1;
        }

        function analyse() {
            const text = textInput.value.trim();
            const words = text.match(/[A-Za-z]+(?:['’\-][A-Za-z]+)*/g) || [];
            if (words.length < 5) {
                results.style.display = 'none';
                empty.style.display = 'block';
                return;
            }

            const sentenceCandidates = text.split(/[.!?]+(?:["'”’)\]]*)(?:\s+|$)/).filter((sentence) => /[A-Za-z]/.test(sentence));
            const sentences = Math.max(1, sentenceCandidates.length);
            const syllables = words.reduce((total, word) => total + Math.max(1, countSyllables(word)), 0);
            const complexWords = words.filter((word) => countSyllables(word) >= 3).length;
            const letters = (text.match(/[A-Za-z]/g) || []).length;
            const averageSentence = words.length / sentences;
            const averageSyllable = syllables / words.length;
            const flesch = 206.835 - (1.015 * averageSentence) - (84.6 * averageSyllable);
            const fk = (0.39 * averageSentence) + (11.8 * averageSyllable) - 15.59;
            const fog = 0.4 * (averageSentence + (100 * (complexWords / words.length)));
            const smog = 1.043 * Math.sqrt((complexWords * 30) / sentences) + 3.1291;
            const coleman = (0.0588 * ((letters / words.length) * 100)) - (0.296 * ((sentences / words.length) * 100)) - 15.8;
            const readingMinutes = words.length / 200;

            document.getElementById('readFlesch').textContent = flesch.toFixed(1);
            document.getElementById('readFk').textContent = fk.toFixed(1);
            document.getElementById('readFog').textContent = fog.toFixed(1);
            document.getElementById('readSmog').textContent = smog.toFixed(1);
            document.getElementById('readColeman').textContent = coleman.toFixed(1);
            document.getElementById('readWords').textContent = words.length.toLocaleString();
            document.getElementById('readSentences').textContent = sentences.toLocaleString();
            document.getElementById('readAvgSentence').textContent = averageSentence.toFixed(1);
            document.getElementById('readAvgSyllable').textContent = averageSyllable.toFixed(2);
            document.getElementById('readTime').textContent = readingMinutes < 1
                ? `${Math.max(1, Math.round(readingMinutes * 60))} sec`
                : `${readingMinutes.toFixed(1)} min`;

            let label = 'Very difficult';
            let advice = 'Aim for shorter sentences and simpler words if this text is for a general audience.';
            let color = 'var(--tool-danger)';
            if (flesch >= 90) { label = 'Very easy'; advice = 'Very approachable for almost any reader. Check that the text is not too simplistic for its purpose.'; color = 'var(--tool-success)'; }
            else if (flesch >= 80) { label = 'Easy'; advice = 'Comfortable for most readers, including casual web audiences.'; color = 'var(--tool-success)'; }
            else if (flesch >= 70) { label = 'Fairly easy'; advice = 'A good target for consumer-facing writing and general articles.'; color = '#34D399'; }
            else if (flesch >= 60) { label = 'Plain English'; advice = 'Clear for most adults. This range is a safe default for web copy.'; color = '#FBBF24'; }
            else if (flesch >= 50) { label = 'Fairly difficult'; advice = 'Some sentences are long or dense. Consider splitting them and replacing jargon.'; color = '#FBBF24'; }
            else if (flesch >= 30) { label = 'Difficult'; advice = 'Assumes a well-educated audience. Simplify wording if the text is meant for a wide readership.'; color = '#FB923C'; }

            document.getElementById('readLabel').textContent = label;
            document.getElementById('readLabel').style.color = color;
            document.getElementById('readAdvice').textContent = advice;
            document.getElementById('readBar').style.width = Math.max(0, Math.min(100, flesch)).toFixed(1) + '%';
            document.getElementById('readBar').style.background = color;

            empty.style.display = 'none';
            results.style.display = 'flex';
        }

        if (window.__readDebounce) clearTimeout(window.__readDebounce);
        textInput.addEventListener('input', () => {
            if (window.__readDebounce) clearTimeout(window.__readDebounce);
            window.__readDebounce = setTimeout(analyse, 180);
        });
    }

    /* ---------------------------------------------------------------------
       2026 tool set: text, colour and productivity
       --------------------------------------------------------------------- */

    function renderTextToSpeech(el) {
        el.innerHTML = `
            <div class="tool-ui tool-form" style="max-width:780px;margin:0 auto;">
                <div class="tool-field">
                    <label for="ttsText">Text to read aloud</label>
                    <textarea id="ttsText" rows="8" placeholder="Type or paste the text you want to hear. Everything stays in this tab." style="min-height:10rem;"></textarea>
                </div>
                <div class="tool-form-grid">
                    <div class="tool-field">
                        <label for="ttsVoice">Voice</label>
                        <select id="ttsVoice"><option value="">System default</option></select>
                    </div>
                    <div class="tool-field">
                        <label for="ttsRate">Speed <span id="ttsRateVal" style="color:var(--primary);">1.0×</span></label>
                        <input type="range" id="ttsRate" min="0.5" max="2" step="0.05" value="1">
                    </div>
                    <div class="tool-field">
                        <label for="ttsPitch">Pitch <span id="ttsPitchVal" style="color:var(--primary);">1.0</span></label>
                        <input type="range" id="ttsPitch" min="0" max="2" step="0.05" value="1">
                    </div>
                    <div class="tool-field">
                        <label for="ttsVolume">Volume <span id="ttsVolumeVal" style="color:var(--primary);">100%</span></label>
                        <input type="range" id="ttsVolume" min="0" max="1" step="0.05" value="1">
                    </div>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                    <button type="button" class="btn" id="ttsSpeak">Speak</button>
                    <button type="button" class="btn tool-btn-secondary" id="ttsPause" disabled>Pause</button>
                    <button type="button" class="btn tool-btn-secondary" id="ttsStop" disabled>Stop</button>
                </div>
                <div class="tool-hint" id="ttsStatus" role="status">Choose a voice and press Speak. Browser voices vary by device.</div>
                <div class="tool-stat-grid">
                    <div class="tool-stat"><div class="tool-stat-label">Words</div><div class="tool-stat-value" id="ttsWords">0</div></div>
                    <div class="tool-stat"><div class="tool-stat-label">Characters</div><div class="tool-stat-value" id="ttsChars">0</div></div>
                    <div class="tool-stat"><div class="tool-stat-label">Estimated length</div><div class="tool-stat-value" id="ttsEstimate" style="font-size:1rem;">0 sec</div></div>
                </div>
                <p class="tool-hint">Uses the browser's built-in speech synthesis. No audio is generated on a server and no text leaves your device.</p>
            </div>
        `;

        const synth = window.speechSynthesis;
        const textInput = document.getElementById('ttsText');
        const voiceSelect = document.getElementById('ttsVoice');
        const rateInput = document.getElementById('ttsRate');
        const pitchInput = document.getElementById('ttsPitch');
        const volumeInput = document.getElementById('ttsVolume');
        const speakBtn = document.getElementById('ttsSpeak');
        const pauseBtn = document.getElementById('ttsPause');
        const stopBtn = document.getElementById('ttsStop');
        const statusEl = document.getElementById('ttsStatus');
        const rateVal = document.getElementById('ttsRateVal');
        const pitchVal = document.getElementById('ttsPitchVal');
        const volumeVal = document.getElementById('ttsVolumeVal');

        if (!synth || typeof window.SpeechSynthesisUtterance === 'undefined') {
            statusEl.textContent = 'Speech synthesis is not supported in this browser. Try a recent version of Chrome, Edge, Safari or Firefox.';
            statusEl.style.color = 'var(--tool-danger)';
            speakBtn.disabled = true;
            rateInput.disabled = true;
            pitchInput.disabled = true;
            volumeInput.disabled = true;
            return;
        }

        synth.cancel();
        let currentUtterance = null;

        function updateCounts() {
            const text = textInput.value.trim();
            const words = text ? (text.match(/\S+/g) || []).length : 0;
            const rate = parseFloat(rateInput.value) || 1;
            const seconds = words ? Math.round((words / (180 * rate)) * 60) : 0;
            document.getElementById('ttsWords').textContent = words.toLocaleString();
            document.getElementById('ttsChars').textContent = text.length.toLocaleString();
            document.getElementById('ttsEstimate').textContent = seconds < 60
                ? `${seconds} sec`
                : `${(seconds / 60).toFixed(1)} min`;
        }

        function populateVoices() {
            const previous = voiceSelect.value;
            const voices = synth.getVoices() || [];
            voiceSelect.innerHTML = '<option value="">System default</option>';
            voices.forEach((voice) => {
                const option = document.createElement('option');
                option.value = voice.voiceURI;
                option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' — default' : ''}`;
                voiceSelect.appendChild(option);
            });
            if (previous && voices.some((voice) => voice.voiceURI === previous)) {
                voiceSelect.value = previous;
            }
        }

        function setSpeakingState(active, paused) {
            pauseBtn.disabled = !active;
            stopBtn.disabled = !active;
            pauseBtn.textContent = paused ? 'Resume' : 'Pause';
            speakBtn.textContent = active ? 'Restart' : 'Speak';
        }

        function speak() {
            const text = textInput.value.trim();
            if (!text) {
                showToast('Enter some text to read aloud first.', 'warning');
                textInput.focus();
                return;
            }
            synth.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            const voice = (synth.getVoices() || []).find((item) => item.voiceURI === voiceSelect.value);
            if (voice) utterance.voice = voice;
            utterance.rate = parseFloat(rateInput.value) || 1;
            utterance.pitch = parseFloat(pitchInput.value) || 1;
            utterance.volume = parseFloat(volumeInput.value);
            if (!isFinite(utterance.volume)) utterance.volume = 1;
            currentUtterance = utterance;
            utterance.onstart = () => {
                statusEl.textContent = 'Speaking…';
                statusEl.style.color = 'var(--tool-success)';
                setSpeakingState(true, false);
            };
            utterance.onend = () => {
                currentUtterance = null;
                statusEl.textContent = 'Finished. Press Speak to replay the text.';
                statusEl.style.color = 'var(--text-muted)';
                setSpeakingState(false, false);
            };
            utterance.onerror = (event) => {
                currentUtterance = null;
                setSpeakingState(false, false);
                if (event.error === 'interrupted' || event.error === 'canceled') return;
                statusEl.textContent = 'Speech could not play: ' + (event.error || 'unknown error') + '.';
                statusEl.style.color = 'var(--tool-danger)';
            };
            statusEl.textContent = 'Starting speech…';
            statusEl.style.color = 'var(--text-muted)';
            synth.speak(utterance);
        }

        function togglePause() {
            if (!synth.speaking && !synth.paused) return;
            if (synth.paused) {
                synth.resume();
                statusEl.textContent = 'Speaking…';
                pauseBtn.textContent = 'Pause';
            } else {
                synth.pause();
                statusEl.textContent = 'Paused. Press Resume to continue.';
                pauseBtn.textContent = 'Resume';
            }
        }

        function stop() {
            synth.cancel();
            currentUtterance = null;
            setSpeakingState(false, false);
            statusEl.textContent = 'Stopped.';
            statusEl.style.color = 'var(--text-muted)';
        }

        rateInput.addEventListener('input', () => {
            rateVal.textContent = parseFloat(rateInput.value).toFixed(2).replace(/0$/, '') + '×';
            updateCounts();
        });
        pitchInput.addEventListener('input', () => {
            pitchVal.textContent = parseFloat(pitchInput.value).toFixed(2);
        });
        volumeInput.addEventListener('input', () => {
            volumeVal.textContent = Math.round(parseFloat(volumeInput.value) * 100) + '%';
        });
        textInput.addEventListener('input', updateCounts);
        speakBtn.addEventListener('click', speak);
        pauseBtn.addEventListener('click', togglePause);
        stopBtn.addEventListener('click', stop);
        synth.onvoiceschanged = populateVoices;

        populateVoices();
        updateCounts();
    }

    function renderColorPaletteGenerator(el) {
        el.innerHTML = `
            <div class="tool-ui tool-form" style="max-width:900px;margin:0 auto;">
                <div class="tool-form-grid">
                    <div class="tool-field">
                        <label for="paletteColor">Base colour</label>
                        <div style="display:flex;gap:0.5rem;align-items:center;">
                            <input type="color" id="paletteColor" value="#3B82F6" aria-label="Pick a base colour" style="width:3.2rem;height:2.75rem;padding:0.15rem;flex-shrink:0;">
                            <input type="text" id="paletteHex" value="#3B82F6" maxlength="7" spellcheck="false" autocomplete="off" style="flex:1;">
                        </div>
                    </div>
                    <div class="tool-field">
                        <label for="paletteHarmony">Colour harmony</label>
                        <select id="paletteHarmony">
                            <option value="analogous" selected>Analogous</option>
                            <option value="complementary">Complementary</option>
                            <option value="triadic">Triadic</option>
                            <option value="tetradic">Tetradic</option>
                            <option value="split">Split complementary</option>
                            <option value="mono">Monochromatic</option>
                            <option value="shades">Shades</option>
                        </select>
                    </div>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                    <button type="button" class="btn" id="paletteGenerate">Generate palette</button>
                    <button type="button" class="btn tool-btn-secondary" id="paletteRandom">Random base</button>
                </div>
                <div class="palette-grid" id="paletteGrid"></div>
                <div class="tool-box">
                    <div class="tool-label">CSS variables</div>
                    <pre class="tool-output" id="paletteCss" style="margin-top:0.5rem;"></pre>
                    <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.75rem;">
                        <button type="button" class="btn tool-btn-secondary" id="paletteCopyCss">Copy CSS</button>
                        <button type="button" class="btn tool-btn-secondary" id="paletteCopyJson">Copy JSON</button>
                    </div>
                </div>
                <p class="tool-hint">Click a swatch to copy its HEX value. Palettes are generated mathematically from the base colour, so they are a starting point rather than a final brand system.</p>
            </div>
        `;

        const colorInput = document.getElementById('paletteColor');
        const hexInput = document.getElementById('paletteHex');
        const harmonySelect = document.getElementById('paletteHarmony');
        const grid = document.getElementById('paletteGrid');
        const cssOutput = document.getElementById('paletteCss');
        let currentPalette = [];

        function clamp(value, min, max) {
            return Math.min(max, Math.max(min, value));
        }

        function normaliseHex(value) {
            let hex = String(value || '').trim().replace(/^#/, '');
            if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.split('').map((char) => char + char).join('');
            if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
            return '#' + hex.toUpperCase();
        }

        function hexToRgb(hex) {
            const clean = hex.replace('#', '');
            return {
                r: parseInt(clean.slice(0, 2), 16),
                g: parseInt(clean.slice(2, 4), 16),
                b: parseInt(clean.slice(4, 6), 16)
            };
        }

        function rgbToHsl(r, g, b) {
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;
            let h = 0;
            if (delta !== 0) {
                if (max === r) h = ((g - b) / delta) % 6;
                else if (max === g) h = ((b - r) / delta) + 2;
                else h = ((r - g) / delta) + 4;
            }
            h = Math.round(h * 60);
            if (h < 0) h += 360;
            const l = (max + min) / 2;
            const s = delta === 0 ? 0 : delta / (1 - Math.abs((2 * l) - 1));
            return { h, s: s * 100, l: l * 100 };
        }

        function hslToHex(h, s, l) {
            h = ((h % 360) + 360) % 360;
            s = clamp(s, 0, 100) / 100;
            l = clamp(l, 0, 100) / 100;
            const c = (1 - Math.abs((2 * l) - 1)) * s;
            const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
            const m = l - (c / 2);
            let r = 0, g = 0, b = 0;
            if (h < 60) { r = c; g = x; }
            else if (h < 120) { r = x; g = c; }
            else if (h < 180) { g = c; b = x; }
            else if (h < 240) { g = x; b = c; }
            else if (h < 300) { r = x; b = c; }
            else { r = c; b = x; }
            const toHex = (value) => Math.round((value + m) * 255).toString(16).padStart(2, '0');
            return '#' + toHex(r) + toHex(g) + toHex(b);
        }

        function contrastText(hex) {
            const { r, g, b } = hexToRgb(hex);
            const channel = (value) => {
                const normalised = value / 255;
                return normalised <= 0.03928 ? normalised / 12.92 : Math.pow((normalised + 0.055) / 1.055, 2.4);
            };
            const luminance = (0.2126 * channel(r)) + (0.7152 * channel(g)) + (0.0722 * channel(b));
            const contrastWhite = 1.05 / (luminance + 0.05);
            const contrastBlack = (luminance + 0.05) / 0.05;
            return contrastBlack >= contrastWhite ? '#000000' : '#FFFFFF';
        }

        function buildPalette(baseHex, harmony) {
            const base = rgbToHsl(hexToRgb(baseHex).r, hexToRgb(baseHex).g, hexToRgb(baseHex).b);
            const configs = {
                analogous: { hues: [-40, -20, 0, 20, 40], lights: [-12, -6, 0, 6, 12], sats: [0, 0, 0, 0, 0] },
                complementary: { hues: [0, 30, 180, 210, 330], lights: [-8, 6, 0, 10, -4], sats: [0, 0, 0, 0, 0] },
                triadic: { hues: [0, 120, 240, 60, 300], lights: [0, 8, -6, 12, 4], sats: [0, 0, 0, 0, 0] },
                tetradic: { hues: [0, 90, 180, 270, 45], lights: [0, 6, -6, 10, 4], sats: [0, 0, 0, 0, 0] },
                split: { hues: [0, 150, 210, 30, 330], lights: [0, 6, -4, 10, 4], sats: [0, 0, 0, 0, 0] },
                mono: { hues: [0, 0, 0, 0, 0], lights: [-24, -12, 0, 12, 24], sats: [5, 0, 0, -5, -10] },
                shades: { hues: [0, 0, 0, 0, 0], lights: [-30, -15, 0, 15, 30], sats: [-25, -10, 0, -10, -20] }
            };
            const config = configs[harmony] || configs.analogous;
            return config.hues.map((hueOffset, index) => hslToHex(
                base.h + hueOffset,
                clamp(base.s + config.sats[index], 0, 100),
                clamp(base.l + config.lights[index], 8, 94)
            ));
        }

        function renderPalette() {
            const baseHex = normaliseHex(hexInput.value);
            if (!baseHex) {
                showToast('Enter a valid HEX colour, for example #3B82F6.', 'warning');
                hexInput.focus();
                return;
            }
            colorInput.value = baseHex;
            hexInput.value = baseHex;
            currentPalette = buildPalette(baseHex, harmonySelect.value);

            grid.innerHTML = currentPalette.map((hex) => {
                const rgb = hexToRgb(hex);
                const textColor = contrastText(hex);
                const copyLabel = `${hex.replace('#', '')} ${hex} rgb(${rgb.r}, ${rgb.g}, ${rgb.b}) - copy colour`;
                return `
                    <button type="button" class="palette-swatch" data-hex="${hex}" aria-label="${copyLabel}">
                        <span class="palette-chip" style="background:${hex};color:${textColor};">${hex.replace('#', '')}</span>
                        <span class="palette-meta">
                            <span class="palette-hex">${hex}</span>
                            <span class="palette-rgb">rgb(${rgb.r}, ${rgb.g}, ${rgb.b})</span>
                        </span>
                    </button>
                `;
            }).join('');

            cssOutput.textContent = `:root {\n${currentPalette.map((hex, index) => `  --palette-${index + 1}: ${hex};`).join('\n')}\n}`;
        }

        function copyText(text, message) {
            navigator.clipboard.writeText(text).then(() => {
                showToast(message, 'success');
            }).catch(() => {
                showToast('Could not copy to the clipboard.', 'warning');
            });
        }

        grid.addEventListener('click', (event) => {
            const swatch = event.target.closest('.palette-swatch');
            if (!swatch) return;
            copyText(swatch.getAttribute('data-hex'), swatch.getAttribute('data-hex') + ' copied.');
        });

        colorInput.addEventListener('input', () => {
            hexInput.value = colorInput.value.toUpperCase();
            renderPalette();
        });
        hexInput.addEventListener('input', () => {
            const normalised = normaliseHex(hexInput.value);
            if (normalised) {
                colorInput.value = normalised;
                renderPalette();
            }
        });
        harmonySelect.addEventListener('change', renderPalette);
        document.getElementById('paletteGenerate').addEventListener('click', renderPalette);
        document.getElementById('paletteRandom').addEventListener('click', () => {
            const hue = Math.floor(Math.random() * 360);
            const sat = 55 + Math.floor(Math.random() * 31);
            const light = 40 + Math.floor(Math.random() * 26);
            hexInput.value = hslToHex(hue, sat, light).toUpperCase();
            renderPalette();
        });
        document.getElementById('paletteCopyCss').addEventListener('click', () => {
            copyText(cssOutput.textContent, 'CSS variables copied.');
        });
        document.getElementById('paletteCopyJson').addEventListener('click', () => {
            copyText(JSON.stringify({
                base: normaliseHex(hexInput.value),
                harmony: harmonySelect.value,
                colors: currentPalette
            }, null, 2), 'Palette JSON copied.');
        });

        renderPalette();
    }

    function renderPomodoroTimer(el) {
        el.innerHTML = `
            <div class="tool-ui tool-form" style="max-width:640px;margin:0 auto;">
                <div class="tool-tabs" id="pomoModes" role="group" aria-label="Timer mode" style="justify-content:center;">
                    <button type="button" class="tool-tab active" data-mode="focus">Focus</button>
                    <button type="button" class="tool-tab" data-mode="short">Short break</button>
                    <button type="button" class="tool-tab" data-mode="long">Long break</button>
                </div>
                <div class="tool-box" style="text-align:center;padding:1.6rem 1rem;">
                    <div class="tool-label" id="pomoLabel">Focus session</div>
                    <div id="pomoTime" style="margin-top:0.35rem;font-size:clamp(3.4rem,13vw,5.4rem);font-weight:800;line-height:1;color:var(--primary);font-variant-numeric:tabular-nums;" aria-live="off">25:00</div>
                    <div class="tool-meter" style="margin-top:1.2rem;" aria-hidden="true"><span id="pomoBar" style="width:0%;"></span></div>
                    <div class="tool-hint" id="pomoStatus" role="status" style="margin-top:0.65rem;">Press Start to begin a focus session.</div>
                    <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;margin-top:1rem;">
                        <button type="button" class="btn" id="pomoStart">Start</button>
                        <button type="button" class="btn tool-btn-secondary" id="pomoReset">Reset</button>
                        <button type="button" class="btn tool-btn-secondary" id="pomoSkip">Skip</button>
                    </div>
                </div>
                <div class="tool-box">
                    <div class="tool-label">Session settings</div>
                    <div class="tool-form-grid" style="margin-top:0.6rem;">
                        <div class="tool-field"><label for="pomoFocus">Focus (min)</label><input type="number" id="pomoFocus" min="1" max="120" step="1" value="25"></div>
                        <div class="tool-field"><label for="pomoShort">Short break (min)</label><input type="number" id="pomoShort" min="1" max="60" step="1" value="5"></div>
                        <div class="tool-field"><label for="pomoLong">Long break (min)</label><input type="number" id="pomoLong" min="1" max="90" step="1" value="15"></div>
                        <div class="tool-field"><label for="pomoEvery">Long break every</label><input type="number" id="pomoEvery" min="1" max="12" step="1" value="4"></div>
                    </div>
                    <label class="tool-checkbox-row" style="margin-top:0.75rem;">
                        <input type="checkbox" id="pomoAuto">
                        Start the next session automatically
                    </label>
                </div>
                <div class="tool-stat-grid">
                    <div class="tool-stat"><div class="tool-stat-label">Focus sessions completed</div><div class="tool-stat-value" id="pomoCount">0</div></div>
                    <div class="tool-stat"><div class="tool-stat-label">Next long break</div><div class="tool-stat-value" id="pomoCycle" style="font-size:1rem;">4 sessions</div></div>
                </div>
                <p class="tool-hint">The timer uses an end timestamp rather than counting interval ticks, so it stays accurate if the tab is briefly backgrounded. Keep this tab open while a session runs.</p>
            </div>
        `;

        const modeButtons = Array.from(document.querySelectorAll('#pomoModes .tool-tab'));
        const timeEl = document.getElementById('pomoTime');
        const labelEl = document.getElementById('pomoLabel');
        const barEl = document.getElementById('pomoBar');
        const statusEl = document.getElementById('pomoStatus');
        const startBtn = document.getElementById('pomoStart');
        const countEl = document.getElementById('pomoCount');
        const cycleEl = document.getElementById('pomoCycle');
        const autoInput = document.getElementById('pomoAuto');

        if (window.__pomodoroInterval) clearInterval(window.__pomodoroInterval);

        const settings = { focus: 25, short: 5, long: 15, every: 4 };
        let mode = 'focus';
        let remaining = settings.focus * 60;
        let running = false;
        let endAt = 0;
        let completed = 0;

        function durationFor(currentMode) {
            return settings[currentMode] * 60;
        }

        function modeLabel(currentMode) {
            return currentMode === 'focus' ? 'Focus session' : currentMode === 'short' ? 'Short break' : 'Long break';
        }

        function formatTime(totalSeconds) {
            const safe = Math.max(0, Math.ceil(totalSeconds));
            return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
        }

        function updateDisplay() {
            const total = Math.max(1, durationFor(mode));
            timeEl.textContent = formatTime(remaining);
            labelEl.textContent = modeLabel(mode);
            barEl.style.width = Math.max(0, Math.min(100, ((total - remaining) / total) * 100)).toFixed(1) + '%';
            modeButtons.forEach((btn) => {
                btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
            });
            countEl.textContent = String(completed);
            const untilLong = settings.every - (completed % settings.every);
            cycleEl.textContent = `${untilLong} session${untilLong === 1 ? '' : 's'}`;
            startBtn.textContent = running ? 'Pause' : (remaining < durationFor(mode) ? 'Resume' : 'Start');
        }

        function beep() {
            try {
                const AudioCtor = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtor) return;
                if (!window.__pomoAudio) window.__pomoAudio = new AudioCtor();
                const context = window.__pomoAudio;
                if (context.state === 'suspended') context.resume();
                const playTone = (start) => {
                    const oscillator = context.createOscillator();
                    const gain = context.createGain();
                    oscillator.type = 'sine';
                    oscillator.frequency.value = 880;
                    gain.gain.setValueAtTime(0.0001, start);
                    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
                    oscillator.connect(gain).connect(context.destination);
                    oscillator.start(start);
                    oscillator.stop(start + 0.24);
                };
                playTone(context.currentTime);
                playTone(context.currentTime + 0.32);
            } catch (err) {
                console.warn('Pomodoro chime unavailable:', err);
            }
        }

        function stopTicker() {
            if (window.__pomodoroInterval) {
                clearInterval(window.__pomodoroInterval);
                window.__pomodoroInterval = null;
            }
        }

        function setMode(nextMode, message) {
            stopTicker();
            running = false;
            mode = nextMode;
            remaining = durationFor(mode);
            if (message) {
                statusEl.textContent = message;
                statusEl.style.color = 'var(--text-muted)';
            }
            updateDisplay();
        }

        function start() {
            if (running) {
                pause();
                return;
            }
            if (remaining <= 0) remaining = durationFor(mode);
            endAt = Date.now() + (remaining * 1000);
            running = true;
            statusEl.textContent = mode === 'focus' ? 'Focus in progress. Stay with one task.' : 'Break in progress. Step away from the screen.';
            statusEl.style.color = 'var(--text-muted)';
            stopTicker();
            window.__pomodoroInterval = setInterval(tick, 250);
            updateDisplay();
        }

        function pause() {
            if (!running) return;
            remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
            running = false;
            stopTicker();
            statusEl.textContent = 'Paused. Press Resume when you are ready.';
            updateDisplay();
        }

        function advance(autoStart) {
            stopTicker();
            running = false;
            if (mode === 'focus') {
                completed += 1;
                const nextMode = completed % settings.every === 0 ? 'long' : 'short';
                mode = nextMode;
                remaining = durationFor(mode);
                statusEl.textContent = nextMode === 'long'
                    ? 'Focus block complete. Take a longer break.'
                    : 'Focus session complete. Take a short break.';
            } else {
                mode = 'focus';
                remaining = durationFor(mode);
                statusEl.textContent = 'Break complete. Ready for the next focus session.';
            }
            statusEl.style.color = 'var(--text-muted)';
            updateDisplay();
            if (autoStart) start();
        }

        function tick() {
            if (!running) return;
            remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
            if (remaining <= 0) {
                beep();
                advance(autoInput.checked);
                return;
            }
            updateDisplay();
        }

        function readSettings() {
            const read = (id, min, max, fallback) => {
                const value = Math.round(parseFloat(document.getElementById(id).value));
                return isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
            };
            settings.focus = read('pomoFocus', 1, 120, 25);
            settings.short = read('pomoShort', 1, 60, 5);
            settings.long = read('pomoLong', 1, 90, 15);
            settings.every = read('pomoEvery', 1, 12, 4);
            document.getElementById('pomoFocus').value = settings.focus;
            document.getElementById('pomoShort').value = settings.short;
            document.getElementById('pomoLong').value = settings.long;
            document.getElementById('pomoEvery').value = settings.every;
            if (!running) {
                remaining = durationFor(mode);
                updateDisplay();
            }
        }

        startBtn.addEventListener('click', start);
        document.getElementById('pomoReset').addEventListener('click', () => {
            running = false;
            stopTicker();
            remaining = durationFor(mode);
            statusEl.textContent = 'Timer reset.';
            updateDisplay();
        });
        document.getElementById('pomoSkip').addEventListener('click', () => {
            const wasFocus = mode === 'focus';
            stopTicker();
            running = false;
            if (wasFocus) {
                completed += 1;
                mode = completed % settings.every === 0 ? 'long' : 'short';
            } else {
                mode = 'focus';
            }
            remaining = durationFor(mode);
            statusEl.textContent = 'Skipped to ' + modeLabel(mode).toLowerCase() + '.';
            updateDisplay();
        });
        modeButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                setMode(btn.getAttribute('data-mode'), 'Mode changed. Press Start when ready.');
            });
        });
        ['pomoFocus', 'pomoShort', 'pomoLong', 'pomoEvery'].forEach((id) => {
            document.getElementById(id).addEventListener('change', readSettings);
        });

        updateDisplay();
    }

    function renderTypingSpeedTest(el) {
        el.innerHTML = `
            <div class="tool-ui tool-form" style="max-width:880px;margin:0 auto;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;">
                    <div class="tool-tabs" id="typeDurations" role="group" aria-label="Test duration">
                        <button type="button" class="tool-tab" data-sec="15">15s</button>
                        <button type="button" class="tool-tab" data-sec="30">30s</button>
                        <button type="button" class="tool-tab active" data-sec="60">60s</button>
                        <button type="button" class="tool-tab" data-sec="120">120s</button>
                    </div>
                    <button type="button" class="btn tool-btn-secondary" id="typeRestart">New test</button>
                </div>
                <div class="tool-stat-grid">
                    <div class="tool-stat"><div class="tool-stat-label">Time left</div><div class="tool-stat-value" id="typeTime">60s</div></div>
                    <div class="tool-stat"><div class="tool-stat-label">Net WPM</div><div class="tool-stat-value" id="typeWpm">0</div></div>
                    <div class="tool-stat"><div class="tool-stat-label">Accuracy</div><div class="tool-stat-value" id="typeAcc">100%</div></div>
                    <div class="tool-stat"><div class="tool-stat-label">Errors</div><div class="tool-stat-value" id="typeErrors">0</div></div>
                </div>
                <div class="type-stage" id="typeStage" aria-label="Typing passage"></div>
                <div class="tool-field">
                    <label for="typeInput">Type the passage here</label>
                    <textarea id="typeInput" rows="4" placeholder="Start typing - the timer begins with your first keystroke." spellcheck="false" autocomplete="off" autocapitalize="off" style="min-height:6.5rem;"></textarea>
                </div>
                <div class="tool-box" id="typeResult" style="display:none;">
                    <div class="tool-label">Your result</div>
                    <div class="tool-stat-grid" style="margin-top:0.6rem;">
                        <div class="tool-stat"><div class="tool-stat-label">Net WPM</div><div class="tool-stat-value" id="typeFinalWpm">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">Raw WPM</div><div class="tool-stat-value" id="typeRawWpm">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">Accuracy</div><div class="tool-stat-value" id="typeFinalAcc">--</div></div>
                        <div class="tool-stat"><div class="tool-stat-label">Characters</div><div class="tool-stat-value" id="typeChars">--</div></div>
                    </div>
                    <p class="tool-hint" id="typeVerdict" style="margin-top:0.65rem;"></p>
                </div>
                <p class="tool-hint">Net WPM = correct characters ÷ 5 ÷ elapsed minutes. Paste is disabled so the score reflects typing. Use a physical keyboard for the most realistic result.</p>
            </div>
        `;

        const WORDS = [
            'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but', 'his', 'from', 'they', 'say', 'her', 'she', 'will', 'one', 'all', 'would',
            'there', 'their', 'what', 'out', 'about', 'who', 'get', 'which', 'when', 'make', 'can', 'like', 'time', 'just', 'him', 'know', 'take', 'people', 'into', 'year',
            'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use',
            'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'great', 'between', 'need',
            'large', 'often', 'hand', 'high', 'place', 'hold', 'turn', 'help', 'small', 'number', 'point', 'home', 'water', 'room', 'mother', 'area', 'money', 'story', 'fact', 'month',
            'right', 'study', 'book', 'eye', 'job', 'word', 'business', 'issue', 'side', 'kind', 'head', 'house', 'service', 'friend', 'father', 'power', 'hour', 'game', 'line', 'end',
            'member', 'law', 'car', 'city', 'community', 'name', 'team', 'minute', 'idea', 'kid', 'body', 'information', 'parent', 'face', 'level', 'office', 'door', 'health', 'person', 'art',
            'war', 'history', 'party', 'result', 'change', 'morning', 'reason', 'research', 'girl', 'guy', 'moment', 'air', 'teacher', 'force', 'education', 'foot', 'boy', 'age', 'policy', 'process'
        ];

        const stage = document.getElementById('typeStage');
        const input = document.getElementById('typeInput');
        const timeEl = document.getElementById('typeTime');
        const wpmEl = document.getElementById('typeWpm');
        const accEl = document.getElementById('typeAcc');
        const errorsEl = document.getElementById('typeErrors');
        const resultBox = document.getElementById('typeResult');
        const durationButtons = Array.from(document.querySelectorAll('#typeDurations .tool-tab'));

        let duration = 60;
        let targetText = '';
        let charSpans = [];
        let started = false;
        let finished = false;
        let startAt = 0;

        if (window.__typingTimer) clearInterval(window.__typingTimer);

        function randomWords(count) {
            const output = [];
            let previous = '';
            for (let index = 0; index < count; index += 1) {
                let word = WORDS[Math.floor(Math.random() * WORDS.length)];
                if (word === previous) {
                    word = WORDS[(WORDS.indexOf(word) + 1) % WORDS.length];
                }
                output.push(word);
                previous = word;
            }
            return output;
        }

        function buildTest() {
            if (window.__typingTimer) {
                clearInterval(window.__typingTimer);
                window.__typingTimer = null;
            }
            started = false;
            finished = false;
            startAt = 0;
            input.value = '';
            input.disabled = false;
            resultBox.style.display = 'none';
            timeEl.textContent = duration + 's';
            wpmEl.textContent = '0';
            accEl.textContent = '100%';
            errorsEl.textContent = '0';
            stage.scrollTop = 0;

            const words = randomWords(Math.ceil(duration * 2.5) + 20);
            targetText = words.join(' ');
            charSpans = new Array(targetText.length).fill(null);
            stage.innerHTML = '';

            let flatIndex = 0;
            words.forEach((word) => {
                const wordEl = document.createElement('span');
                wordEl.className = 'type-word';
                Array.from(word).forEach((character) => {
                    const span = document.createElement('span');
                    span.className = 'type-char pending';
                    span.textContent = character;
                    span.setAttribute('data-index', String(flatIndex));
                    charSpans[flatIndex] = span;
                    wordEl.appendChild(span);
                    flatIndex += 1;
                });
                stage.appendChild(wordEl);
                flatIndex += 1;
            });

            durationButtons.forEach((btn) => {
                btn.classList.toggle('active', Number(btn.getAttribute('data-sec')) === duration);
            });
        }

        function counts() {
            const typed = input.value;
            let correct = 0;
            for (let index = 0; index < typed.length; index += 1) {
                if (typed[index] === targetText[index]) correct += 1;
            }
            return { typed, correct, errors: Math.max(0, typed.length - correct) };
        }

        function liveStats() {
            if (!started || finished) return;
            const elapsed = Math.max(0.25, (Date.now() - startAt) / 1000);
            const { typed, correct, errors } = counts();
            const minutes = elapsed / 60;
            wpmEl.textContent = String(Math.max(0, Math.round((correct / 5) / minutes)));
            accEl.textContent = typed.length ? Math.round((correct / typed.length) * 100) + '%' : '100%';
            errorsEl.textContent = String(errors);
        }

        function paint(typed) {
            for (let index = 0; index < charSpans.length; index += 1) {
                const span = charSpans[index];
                if (!span) continue;
                if (index < typed.length) {
                    span.className = 'type-char ' + (typed[index] === targetText[index] ? 'correct' : 'wrong');
                } else if (index === typed.length) {
                    span.className = 'type-char current';
                } else {
                    span.className = 'type-char pending';
                }
            }
        }

        function finish() {
            if (finished) return;
            finished = true;
            if (window.__typingTimer) {
                clearInterval(window.__typingTimer);
                window.__typingTimer = null;
            }
            input.disabled = true;
            const elapsed = Math.max(1, Math.min(duration, (Date.now() - startAt) / 1000));
            const { typed, correct, errors } = counts();
            const minutes = elapsed / 60;
            const netWpm = Math.max(0, Math.round((correct / 5) / minutes));
            const rawWpm = Math.max(0, Math.round((typed.length / 5) / minutes));
            const accuracy = typed.length ? Math.round((correct / typed.length) * 100) : 0;

            wpmEl.textContent = String(netWpm);
            accEl.textContent = accuracy + '%';
            errorsEl.textContent = String(errors);
            timeEl.textContent = '0s';
            document.getElementById('typeFinalWpm').textContent = String(netWpm);
            document.getElementById('typeRawWpm').textContent = String(rawWpm);
            document.getElementById('typeFinalAcc').textContent = accuracy + '%';
            document.getElementById('typeChars').textContent = typed.length.toLocaleString();

            let verdict = 'Keep practising - consistency matters more than short bursts of speed.';
            if (netWpm >= 80) verdict = 'Excellent speed. Focus on keeping accuracy above 97% at this pace.';
            else if (netWpm >= 60) verdict = 'Fast and comfortable - a strong result for everyday professional typing.';
            else if (netWpm >= 40) verdict = 'Solid working speed. Accuracy first, then small speed gains.';
            else if (netWpm >= 20) verdict = 'Developing speed. Keep your hands relaxed and avoid looking down.';
            document.getElementById('typeVerdict').textContent = verdict;
            resultBox.style.display = 'block';
        }

        function tick() {
            if (!started || finished) return;
            const elapsed = (Date.now() - startAt) / 1000;
            const remaining = Math.max(0, duration - elapsed);
            timeEl.textContent = Math.ceil(remaining) + 's';
            liveStats();
            if (remaining <= 0) finish();
        }

        function handleInput() {
            if (finished) return;
            const typed = input.value;
            if (!started && typed.length > 0) {
                started = true;
                startAt = Date.now();
                window.__typingTimer = setInterval(tick, 200);
            }
            paint(typed);
            if (typed.length >= targetText.length) {
                finish();
                return;
            }
            liveStats();
        }

        input.addEventListener('input', handleInput);
        input.addEventListener('paste', () => {
            showToast('Paste is disabled during the typing test. The test has restarted.', 'warning');
            setTimeout(buildTest, 0);
        });
        input.addEventListener('drop', (event) => {
            event.preventDefault();
            showToast('Drop is disabled during the typing test.', 'warning');
        });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') event.preventDefault();
        });
        document.getElementById('typeRestart').addEventListener('click', buildTest);
        durationButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                duration = Number(btn.getAttribute('data-sec')) || 60;
                buildTest();
            });
        });

        buildTest();
    }

    function renderOnlineNotepad(el) {
        el.innerHTML = `
            <div class="tool-ui tool-form" style="max-width:920px;margin:0 auto;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;">
                    <div class="tool-hint" id="noteStatus" role="status" style="display:inline-flex;align-items:center;gap:0.35rem;">
                        <span class="material-symbols-outlined" style="font-size:1rem;color:var(--tool-success);">cloud_done</span>
                        <span>Saved locally</span>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                        <button type="button" class="btn tool-btn-secondary" id="noteCopy">Copy</button>
                        <button type="button" class="btn tool-btn-secondary" id="noteDownload">Download .txt</button>
                        <button type="button" class="btn tool-btn-secondary" id="noteClear">Clear</button>
                    </div>
                </div>
                <div class="tool-field">
                    <label for="noteFilename">File name</label>
                    <input type="text" id="noteFilename" value="note.txt" maxlength="80" autocomplete="off">
                </div>
                <textarea id="noteText" class="notepad-area" placeholder="Start writing. Your note autosaves in this browser and stays on this device." spellcheck="true"></textarea>
                <div class="tool-stat-grid">
                    <div class="tool-stat"><div class="tool-stat-label">Words</div><div class="tool-stat-value" id="noteWords">0</div></div>
                    <div class="tool-stat"><div class="tool-stat-label">Characters</div><div class="tool-stat-value" id="noteChars">0</div></div>
                    <div class="tool-stat"><div class="tool-stat-label">Lines</div><div class="tool-stat-value" id="noteLines">1</div></div>
                    <div class="tool-stat"><div class="tool-stat-label">Last saved</div><div class="tool-stat-value" id="noteSavedAt" style="font-size:0.9rem;">--</div></div>
                </div>
                <p class="tool-hint">Autosave uses this browser's local storage. Clearing site data or switching devices will not carry the note across, and nothing is uploaded to a server.</p>
            </div>
        `;

        const STORAGE_KEY = '100toolcrate-notepad-v1';
        const textarea = document.getElementById('noteText');
        const filenameInput = document.getElementById('noteFilename');
        const statusEl = document.getElementById('noteStatus');
        const savedAtEl = document.getElementById('noteSavedAt');
        let saveTimer = null;

        function updateCounts() {
            const text = textarea.value;
            const words = text.trim() ? (text.trim().match(/\S+/g) || []).length : 0;
            document.getElementById('noteWords').textContent = words.toLocaleString();
            document.getElementById('noteChars').textContent = text.length.toLocaleString();
            document.getElementById('noteLines').textContent = (text ? text.split(/\r\n|\r|\n/).length : 1).toLocaleString();
        }

        function setStatus(message, saved) {
            statusEl.innerHTML = `<span class="material-symbols-outlined" style="font-size:1rem;color:${saved ? 'var(--tool-success)' : 'var(--text-muted)'};">${saved ? 'cloud_done' : 'edit_note'}</span><span>${escapeHtml(message)}</span>`;
        }

        function save() {
            saveTimer = null;
            const payload = JSON.stringify({ text: textarea.value, filename: filenameInput.value });
            try {
                localStorage.setItem(STORAGE_KEY, payload);
                const time = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                savedAtEl.textContent = time;
                setStatus('Saved locally at ' + time, true);
            } catch (err) {
                setStatus('Autosave is unavailable in this browser.', false);
            }
        }

        function scheduleSave() {
            updateCounts();
            setStatus('Saving…', false);
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(save, 350);
        }

        function loadSaved() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) return;
                const saved = JSON.parse(raw);
                if (saved && typeof saved.text === 'string') textarea.value = saved.text;
                if (saved && typeof saved.filename === 'string' && saved.filename.trim()) filenameInput.value = saved.filename;
                savedAtEl.textContent = 'Restored';
            } catch (err) {
                setStatus('Saved note could not be restored.', false);
            }
        }

        function safeFilename() {
            let name = filenameInput.value.trim().replace(/[\\/:*?"<>|]/g, '-');
            if (!name) name = 'note.txt';
            if (!/\.txt$/i.test(name)) name += '.txt';
            return name;
        }

        textarea.addEventListener('input', scheduleSave);
        filenameInput.addEventListener('input', scheduleSave);
        document.getElementById('noteCopy').addEventListener('click', () => {
            if (!textarea.value) {
                showToast('The notepad is empty.', 'warning');
                return;
            }
            navigator.clipboard.writeText(textarea.value).then(() => {
                showToast('Note copied to the clipboard.', 'success');
            }).catch(() => {
                showToast('Could not copy the note.', 'warning');
            });
        });
        document.getElementById('noteDownload').addEventListener('click', () => {
            if (!textarea.value) {
                showToast('The notepad is empty.', 'warning');
                return;
            }
            const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = safeFilename();
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            showToast('Text file downloaded.', 'success');
        });
        document.getElementById('noteClear').addEventListener('click', () => {
            if (textarea.value.trim() && !window.confirm('Clear this note? This cannot be undone.')) return;
            textarea.value = '';
            try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* storage may be blocked */ }
            savedAtEl.textContent = '--';
            updateCounts();
            setStatus('Note cleared.', false);
            textarea.focus();
        });
        window.addEventListener('beforeunload', () => {
            if (saveTimer) {
                clearTimeout(saveTimer);
                save();
            }
        });

        loadSaved();
        updateCounts();
        if (textarea.value) {
            setStatus('Saved note restored from this browser.', true);
        } else {
            setStatus('Saved locally', true);
        }
    }

    // Attach global safety guard to check any file uploads inside the wrapper container
    document.addEventListener('change', (e) => {
        if (e.target && e.target.type === 'file') {
            const files = e.target.files;
            if (files && files.length > 0) {
                if (!validateFiles(files, e.target)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                }
            }
        }
    }, true);
});
