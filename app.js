/**
 * StorySplitter - Core Application Logic
 * Standard: ES6+, 100% Client-side
 * Comments and variables are written in English according to project guidelines.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const rawTextEl = document.getElementById('raw-text');
    const inputStatsEl = document.getElementById('input-stats');
    const clearBtn = document.getElementById('clear-btn');
    const splitPatternEl = document.getElementById('split-pattern');
    const customRegexGroup = document.getElementById('custom-regex-group');
    const customRegexEl = document.getElementById('custom-regex');
    const splitBtn = document.getElementById('split-btn');
    const detectedStatsEl = document.getElementById('detected-stats');
    const warningBox = document.getElementById('warning-box');
    const warningMessage = document.getElementById('warning-message');
    const emptyState = document.getElementById('empty-state');
    const chaptersList = document.getElementById('chapters-list');
    const bulkActions = document.getElementById('bulk-actions');
    const copyAllBtn = document.getElementById('copy-all-btn');
    const downloadZipBtn = document.getElementById('download-zip-btn');

    // Tab DOM Elements
    const tabTitleBtn = document.getElementById('tab-title-btn');
    const tabParagraphBtn = document.getElementById('tab-paragraph-btn');
    const configTitleContent = document.getElementById('config-title-content');
    const configParagraphContent = document.getElementById('config-paragraph-content');

    // Paragraph Configuration DOM Elements
    const wordsPerChapterEl = document.getElementById('words-per-chapter');
    const chapterPrefixEl = document.getElementById('chapter-prefix');
    const chapterStartNumEl = document.getElementById('chapter-start-num');
    const videoGuideBtn = document.getElementById('video-guide-btn');

    // Single Chapter Preview Modal
    const previewModal = document.getElementById('preview-modal');
    const modalChapterTitle = document.getElementById('modal-chapter-title');
    const modalChapterContent = document.getElementById('modal-chapter-content');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalCopyBtn = document.getElementById('modal-copy-btn');
    const modalDownloadBtn = document.getElementById('modal-download-btn');

    // Video Guide Modal
    const videoModal = document.getElementById('video-modal');
    const closeVideoBtn = document.getElementById('close-video-btn');
    const closeVideoOkBtn = document.getElementById('close-video-ok-btn');

    // Bulk Edit Modal DOM Elements
    const bulkEditModal = document.getElementById('bulk-edit-modal');
    const closeBulkEditBtn = document.getElementById('close-bulk-edit-btn');
    const bulkEditStats = document.getElementById('bulk-edit-stats');
    const bulkEditList = document.getElementById('bulk-edit-list');
    const bulkEditCopyBtn = document.getElementById('bulk-edit-copy-btn');
    const bulkEditDownloadBtn = document.getElementById('bulk-edit-download-btn');
    const bulkEditSaveBtn = document.getElementById('bulk-edit-save-btn');

    // State Variables
    let activeTab = 'paragraph'; // 'title' or 'paragraph'
    let processedChapters = [];
    let currentPreviewIndex = null;

    // Helper: HTML escaper for textareas/inputs to prevent rendering issues
    const escapeHtml = (text) => {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // Toast configuration helper
    const showToast = (message, icon = 'fa-check') => {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <i class="fa-solid ${icon} toast-icon"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        
        // Trigger reflow to enable transition animation
        toast.offsetHeight;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 2500);
    };

    // Calculate word and character count for raw input
    const updateInputStats = () => {
        const text = rawTextEl.value;
        const charCount = text.length;
        const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        inputStatsEl.textContent = `${wordCount.toLocaleString('vi-VN')} từ | ${charCount.toLocaleString('vi-VN')} ký tự`;
    };

    rawTextEl.addEventListener('input', updateInputStats);

    // Clear input content
    clearBtn.addEventListener('click', () => {
        rawTextEl.value = '';
        updateInputStats();
        rawTextEl.focus();
        showToast('Đã xóa nội dung nhập liệu', 'fa-trash-can');
    });

    // Handle Split Pattern Change (Tab Title)
    splitPatternEl.addEventListener('change', () => {
        if (splitPatternEl.value === 'custom') {
            customRegexGroup.classList.remove('hidden');
        } else {
            customRegexGroup.classList.add('hidden');
        }
    });

    // Handle Tab switching logic
    const switchTab = (tab) => {
        activeTab = tab;
        if (tab === 'title') {
            tabTitleBtn.classList.add('active');
            tabParagraphBtn.classList.remove('active');
            configTitleContent.classList.remove('hidden');
            configParagraphContent.classList.add('hidden');
        } else {
            tabTitleBtn.classList.remove('active');
            tabParagraphBtn.classList.add('active');
            configTitleContent.classList.add('hidden');
            configParagraphContent.classList.remove('hidden');
        }
    };

    tabTitleBtn.addEventListener('click', () => switchTab('title'));
    tabParagraphBtn.addEventListener('click', () => switchTab('paragraph'));

    // Video Modal Open/Close listeners
    videoGuideBtn.addEventListener('click', () => videoModal.classList.remove('hidden'));
    closeVideoBtn.addEventListener('click', () => videoModal.classList.add('hidden'));
    closeVideoOkBtn.addEventListener('click', () => videoModal.classList.add('hidden'));
    videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) videoModal.classList.add('hidden');
    });

    // Helper: Determine if a line is a chapter title (Tab 1: Regex approach)
    const isChapterTitleLine = (line, patternType, customRegexStr) => {
        const trimmed = line.trim();
        if (!trimmed) return false;

        let regex;
        if (patternType === 'auto') {
            regex = /^\s*(Chương|CHƯƠNG|Quyển|QUYỂN)\s+\d+.*$/i;
        } else if (patternType === 'standard') {
            regex = /^\s*(Chương|CHƯƠNG|Quyển)\s+\d+.*$/;
        } else if (patternType === 'custom') {
            try {
                regex = new RegExp(customRegexStr, 'i');
            } catch (e) {
                console.error("Invalid custom regex:", e);
                regex = /^\s*(Chương|CHƯƠNG|Quyển)\s+\d+.*$/i;
            }
        }
        return regex.test(trimmed);
    };

    // Algorithm 1: Split chapters by Title detection
    const splitByTitle = (rawText) => {
        const lines = rawText.split(/\r?\n/);
        const patternType = splitPatternEl.value;
        const customRegexStr = customRegexEl.value.trim();
        
        let chapters = [];
        let currentChapter = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (isChapterTitleLine(line, patternType, customRegexStr)) {
                if (currentChapter) {
                    chapters.push(currentChapter);
                }
                currentChapter = {
                    title: line.trim(),
                    lines: []
                };
            } else {
                if (currentChapter) {
                    currentChapter.lines.push(line);
                }
            }
        }

        if (currentChapter) {
            chapters.push(currentChapter);
        }

        return chapters.map(ch => {
            let content = ch.lines.join('\n').trim();
            const words = content === '' ? 0 : content.split(/\s+/).length;
            return {
                title: ch.title,
                content: content,
                wordCount: words
            };
        });
    };

    // Helper: Generate chapter title dynamically based on prefix and start number
    const generateChapterTitle = (prefix, num) => {
        const trimmedPrefix = prefix.trim();
        
        // If prefix is empty, just return "Chương [num]"
        if (trimmedPrefix === '') {
            return `Chương ${num}`;
        }
        
        const hasChapterWord = /chương|chuong/i.test(trimmedPrefix);
        if (hasChapterWord) {
            return `${prefix}${num}`;
        } else {
            return `${prefix} - Chương ${num}`;
        }
    };

    // Helper: Limit text to a maximum number of words while preserving original structure (line endings)
    const limitWords = (text, maxWords) => {
        const words = text.trim().split(/\s+/);
        if (words.length <= maxWords) {
            return {
                text: text,
                isCut: false,
                totalWords: words.length
            };
        }
        
        let wordCount = 0;
        let cutIndex = 0;
        const regex = /\s+/g;
        let match;
        
        const startOffset = text.search(/\S/);
        let lastIndex = startOffset >= 0 ? startOffset : 0;
        
        while ((match = regex.exec(text)) !== null) {
            wordCount++;
            if (wordCount >= maxWords) {
                cutIndex = match.index;
                break;
            }
            lastIndex = regex.lastIndex;
        }
        
        if (wordCount < maxWords) {
            return {
                text: text,
                isCut: false,
                totalWords: words.length
            };
        }
        
        return {
            text: text.substring(0, cutIndex),
            isCut: true,
            totalWords: words.length
        };
    };

    // Algorithm 2: Split chapters by Word count boundary at paragraph endings
    const splitByParagraph = (rawText) => {
        const lines = rawText.split(/\r?\n/);
        const wordsPerChapter = parseInt(wordsPerChapterEl.value) || 2000;
        const chapterPrefix = chapterPrefixEl.value;
        const chapterStartNum = parseInt(chapterStartNumEl.value) || 1;

        let chapters = [];
        let currentChapterIndex = 0;
        
        let currentChapterLines = [];
        let currentWordCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineTrimmed = line.trim();
            
            currentChapterLines.push(line);
            
            if (lineTrimmed !== '') {
                const wordsInLine = lineTrimmed.split(/\s+/).length;
                currentWordCount += wordsInLine;
            }
            
            // Split whenever the word count target is reached (each line is considered a paragraph)
            if (currentWordCount >= wordsPerChapter) {
                // Consume the next empty line if there is one to keep current chapter clean and prevent starting the next chapter with empty lines
                if (i < lines.length - 1 && lines[i + 1].trim() === '') {
                    currentChapterLines.push(lines[i + 1]);
                    i++;
                }
                
                const title = generateChapterTitle(chapterPrefix, chapterStartNum + currentChapterIndex);
                const content = currentChapterLines.join('\n').trim();
                
                chapters.push({
                    title: title,
                    content: content,
                    wordCount: currentWordCount
                });
                
                // Reset for the next chapter
                currentChapterLines = [];
                currentWordCount = 0;
                currentChapterIndex++;
            }
        }
        
        // Save leftover lines as the last chapter
        if (currentChapterLines.length > 0) {
            const content = currentChapterLines.join('\n').trim();
            if (content !== '') {
                const title = generateChapterTitle(chapterPrefix, chapterStartNum + currentChapterIndex);
                const words = content.split(/\s+/).length;
                chapters.push({
                    title: title,
                    content: content,
                    wordCount: words
                });
            }
        }
        
        return chapters;
    };

    // Main Split Controller
    const handleSplit = () => {
        const rawText = rawTextEl.value.trim();
        if (!rawText) {
            showToast('Vui lòng nhập nội dung truyện để phân tách!', 'fa-triangle-exclamation');
            return;
        }

        // Apply 50,000 words limit
        const limitResult = limitWords(rawText, 50000);
        const processedText = limitResult.text;

        if (limitResult.isCut) {
            warningMessage.textContent = `Văn bản nhập vào quá dài (${limitResult.totalWords.toLocaleString('vi-VN')} từ). Hệ thống tự động cắt ngắn và chỉ xử lý 50.000 từ đầu tiên để bảo vệ hiệu năng.`;
            warningBox.classList.remove('hidden');
        } else {
            warningBox.classList.add('hidden');
        }

        let chapters = [];
        if (activeTab === 'title') {
            chapters = splitByTitle(processedText);
        } else {
            chapters = splitByParagraph(processedText);
        }

        processedChapters = chapters;

        // Verify chapter array length
        if (processedChapters.length === 0) {
            emptyState.classList.remove('hidden');
            chaptersList.classList.add('hidden');
            bulkActions.classList.add('hidden');
            warningBox.classList.add('hidden');
            detectedStatsEl.textContent = '0 chương được tìm thấy';
            showToast('Không tìm thấy chương nào khớp với cấu hình!', 'fa-circle-xclamation');
            return;
        }

        detectedStatsEl.textContent = `${processedChapters.length} chương đã sẵn sàng`;

        // Render external view cards
        renderChapterCards();

        // Reveal output layout
        emptyState.classList.add('hidden');
        chaptersList.classList.remove('hidden');
        bulkActions.classList.remove('hidden');

        showToast(`Đã chia thành công ${processedChapters.length} chương!`, 'fa-circle-check');
        incrementSplitChapters();

        // Automatically trigger bulk edit popup for edit & copy convenience
        openBulkEditModal();
    };

    // Render External Result Chapter Cards
    const renderChapterCards = () => {
        chaptersList.innerHTML = '';
        processedChapters.forEach((chapter, index) => {
            const card = document.createElement('div');
            card.className = 'chapter-card';
            card.style.animationDelay = `${index * 0.03}s`;

            card.innerHTML = `
                <div class="chapter-info">
                    <div class="chapter-title" title="${escapeHtml(chapter.title)}">${escapeHtml(chapter.title)}</div>
                    <div class="chapter-meta">
                        <span class="chapter-index">Chương ${index + 1}</span>
                        <span><i class="fa-solid fa-file-word"></i> ${chapter.wordCount.toLocaleString('vi-VN')} từ</span>
                    </div>
                </div>
                <div class="chapter-actions">
                    <button class="btn-action btn-preview-chap" data-index="${index}" title="Xem trước nội dung"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn-action btn-copy-chap" data-index="${index}" title="Copy chương này"><i class="fa-solid fa-copy"></i></button>
                    <button class="btn-action btn-download-chap" data-index="${index}" title="Tải file .txt"><i class="fa-solid fa-download"></i></button>
                </div>
            `;
            chaptersList.appendChild(card);
        });

        // Event bindings
        chaptersList.querySelectorAll('.btn-preview-chap').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                openPreviewModal(idx);
            });
        });

        chaptersList.querySelectorAll('.btn-copy-chap').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                copySingleChapter(idx);
            });
        });

        chaptersList.querySelectorAll('.btn-download-chap').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                downloadSingleChapter(idx);
            });
        });
    };

    // Copy single chapter logic (only chapter content)
    const copySingleChapter = (index) => {
        const chapter = processedChapters[index];
        const formattedText = chapter.content;
        
        navigator.clipboard.writeText(formattedText).then(() => {
            showToast(`Đã copy nội dung: ${chapter.title.substring(0, 15)}...`, 'fa-copy');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showToast('Không thể sao chép nội dung!', 'fa-xmark');
        });
    };

    // Download single chapter as txt file (only chapter content)
    const downloadSingleChapter = (index) => {
        const chapter = processedChapters[index];
        const formattedText = chapter.content;
        const blob = new Blob([formattedText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        const safeName = chapter.title.replace(/[\\/:*?"<>|]/g, '_');
        a.download = `${safeName}.txt`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        showToast(`Đang tải xuống: ${chapter.title.substring(0, 15)}...`, 'fa-download');
    };

    // Single Preview Modal Handlers
    const openPreviewModal = (index) => {
        currentPreviewIndex = index;
        const chapter = processedChapters[index];
        modalChapterTitle.textContent = chapter.title;
        modalChapterContent.textContent = chapter.content || '[Chương này không có nội dung]';
        previewModal.classList.remove('hidden');
    };

    const closePreviewModal = () => {
        previewModal.classList.add('hidden');
        currentPreviewIndex = null;
    };

    closeModalBtn.addEventListener('click', closePreviewModal);
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) closePreviewModal();
    });

    modalCopyBtn.addEventListener('click', () => {
        if (currentPreviewIndex !== null) copySingleChapter(currentPreviewIndex);
    });

    modalDownloadBtn.addEventListener('click', () => {
        if (currentPreviewIndex !== null) downloadSingleChapter(currentPreviewIndex);
    });

    // ----------------------------------------------------
    // Bulk Edit Modal Control & Dynamic Interaction Logic
    // ----------------------------------------------------
    const openBulkEditModal = () => {
        bulkEditStats.textContent = `${processedChapters.length} chương đã tách`;
        renderBulkEditList();
        bulkEditModal.classList.remove('hidden');
    };

    const closeBulkEditModal = () => {
        bulkEditModal.classList.add('hidden');
    };

    const renderBulkEditList = () => {
        bulkEditList.innerHTML = '';
        processedChapters.forEach((chapter, index) => {
            const item = document.createElement('div');
            item.className = 'bulk-edit-item';
            item.innerHTML = `
                <div class="bulk-edit-item-header">
                    <input type="text" class="bulk-edit-title-input" data-index="${index}" value="${escapeHtml(chapter.title)}" placeholder="Tiêu đề chương">
                    <div class="bulk-edit-meta">
                        <span class="char-badge word-badge-index-${index}">${chapter.wordCount.toLocaleString('vi-VN')} từ</span>
                    </div>
                </div>
                <textarea class="bulk-edit-textarea" data-index="${index}" placeholder="Nội dung chương">${escapeHtml(chapter.content)}</textarea>
                <div class="bulk-edit-actions">
                    <button class="btn-action bulk-copy-chap-btn" data-index="${index}" title="Copy chương này"><i class="fa-solid fa-copy"></i></button>
                    <button class="btn-action bulk-download-chap-btn" data-index="${index}" title="Tải file .txt"><i class="fa-solid fa-download"></i></button>
                </div>
            `;
            bulkEditList.appendChild(item);
        });

        // Event listener for live updates on titles
        bulkEditList.querySelectorAll('.bulk-edit-title-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                processedChapters[idx].title = e.target.value;
                // Reflect instantly in the background chapter list
                renderChapterCards();
            });
        });

        // Event listener for live updates on contents & auto-recalculation of word counts
        bulkEditList.querySelectorAll('.bulk-edit-textarea').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                const content = e.target.value;
                processedChapters[idx].content = content;
                
                const wordCount = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
                processedChapters[idx].wordCount = wordCount;
                
                // Update word count badge on the popup
                const wordBadge = bulkEditList.querySelector(`.word-badge-index-${idx}`);
                if (wordBadge) {
                    wordBadge.textContent = `${wordCount.toLocaleString('vi-VN')} từ`;
                }

                // Reflect instantly in the background chapter list
                renderChapterCards();
            });
        });

        // Bulk modal internal actions
        bulkEditList.querySelectorAll('.bulk-copy-chap-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                copySingleChapter(idx);
            });
        });

        bulkEditList.querySelectorAll('.bulk-download-chap-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                downloadSingleChapter(idx);
            });
        });
    };

    closeBulkEditBtn.addEventListener('click', closeBulkEditModal);
    bulkEditSaveBtn.addEventListener('click', () => {
        closeBulkEditModal();
        showToast('Đã lưu tất cả các chỉnh sửa chương!', 'fa-circle-check');
    });

    // Helper: Execute ZIP generation and download
    const generateAndDownloadZip = () => {
        if (processedChapters.length === 0) return;

        if (typeof JSZip === 'undefined') {
            showToast('Đang tải thư viện tạo file ZIP. Vui lòng thử lại sau vài giây!', 'fa-circle-exclamation');
            return;
        }

        const zip = new JSZip();
        processedChapters.forEach((chapter, index) => {
            const formattedText = chapter.content;
            const safeName = `${index + 1}_${chapter.title.replace(/[\\/:*?"<>|]/g, '_')}`;
            zip.file(`${safeName}.txt`, formattedText);
        });

        showToast('Đang tạo file nén ZIP...', 'fa-file-zipper');

        zip.generateAsync({ type: 'blob' }).then((content) => {
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'StorySplitter_Chapters.zip';
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            showToast('Đã tải xuống file ZIP các chương thành công!', 'fa-circle-check');
        }).catch(err => {
            console.error('ZIP generation error:', err);
            showToast('Lỗi khi tạo file nén ZIP!', 'fa-xmark');
        });
    };

    // Helper: Execute Copy all chapters combined text (only chapter content)
    const copyAllChaptersText = () => {
        if (processedChapters.length === 0) return;
        
        const bulkText = processedChapters.map(ch => ch.content).join('\n\n\n=== PHÂN CHƯƠNG ===\n\n\n');
        
        navigator.clipboard.writeText(bulkText).then(() => {
            showToast('Đã copy toàn bộ các chương đã chia!', 'fa-copy');
        }).catch(err => {
            console.error('Could not copy all: ', err);
            showToast('Không thể sao chép tất cả!', 'fa-xmark');
        });
    };

    // Trigger Split Button Event
    splitBtn.addEventListener('click', handleSplit);

    // Bind Copy all / ZIP download actions on main screen and popup modal
    copyAllBtn.addEventListener('click', copyAllChaptersText);
    bulkEditCopyBtn.addEventListener('click', copyAllChaptersText);
    
    downloadZipBtn.addEventListener('click', generateAndDownloadZip);
    bulkEditDownloadBtn.addEventListener('click', generateAndDownloadZip);

    // ----------------------------------------------------
    // Counter API & Online Users Logic
    // Namespace: chiachuong_thanhthanh
    // ----------------------------------------------------
    const API_NAMESPACE = 'chiachuong_thanhthanh';
    const VIEWS_KEY = 'views';
    const CHAPTERS_KEY = 'split_chapters';

    const onlineCountEl = document.getElementById('online-count');
    const viewsCountEl = document.getElementById('views-count');
    const processedCountEl = document.getElementById('processed-count');

    // Update element content with animation
    const animateCounterUpdate = (element, newValue) => {
        if (!element) return;
        element.classList.remove('counter-update-flash');
        element.offsetWidth; // Reflow to restart animation
        element.textContent = newValue;
        element.classList.add('counter-update-flash');
    };

    // Initialize and increment Page Views
    const initPageViews = async () => {
        try {
            const response = await fetch(`https://api.counterapi.dev/v1/${API_NAMESPACE}/${VIEWS_KEY}/up`);
            if (response.ok) {
                const data = await response.json();
                animateCounterUpdate(viewsCountEl, data.count.toLocaleString('vi-VN'));
            } else {
                // Fallback to local storage for view emulation
                let localViews = parseInt(localStorage.getItem('local_views') || '156');
                localViews++;
                localStorage.setItem('local_views', localViews);
                animateCounterUpdate(viewsCountEl, localViews.toLocaleString('vi-VN'));
            }
        } catch (error) {
            console.error('Error updating views count:', error);
            // Fallback
            let localViews = parseInt(localStorage.getItem('local_views') || '156');
            localViews++;
            localStorage.setItem('local_views', localViews);
            animateCounterUpdate(viewsCountEl, localViews.toLocaleString('vi-VN'));
        }
    };

    // Fetch Total Split Chapters
    const fetchTotalChapters = async () => {
        try {
            const response = await fetch(`https://api.counterapi.dev/v1/${API_NAMESPACE}/${CHAPTERS_KEY}`);
            if (response.ok) {
                const data = await response.json();
                animateCounterUpdate(processedCountEl, data.count.toLocaleString('vi-VN'));
            } else {
                // Initial check, try creating it with up
                const initRes = await fetch(`https://api.counterapi.dev/v1/${API_NAMESPACE}/${CHAPTERS_KEY}/up`);
                if (initRes.ok) {
                    const data = await initRes.json();
                    animateCounterUpdate(processedCountEl, data.count.toLocaleString('vi-VN'));
                } else {
                    let localChaps = parseInt(localStorage.getItem('local_chapters') || '64');
                    animateCounterUpdate(processedCountEl, localChaps.toLocaleString('vi-VN'));
                }
            }
        } catch (error) {
            console.error('Error fetching chapters count:', error);
            let localChaps = parseInt(localStorage.getItem('local_chapters') || '64');
            animateCounterUpdate(processedCountEl, localChaps.toLocaleString('vi-VN'));
        }
    };

    // Global Increment for Split Chapters
    window.incrementSplitChapters = async () => {
        try {
            const response = await fetch(`https://api.counterapi.dev/v1/${API_NAMESPACE}/${CHAPTERS_KEY}/up`);
            if (response.ok) {
                const data = await response.json();
                animateCounterUpdate(processedCountEl, data.count.toLocaleString('vi-VN'));
            } else {
                let localChaps = parseInt(localStorage.getItem('local_chapters') || '64');
                localChaps++;
                localStorage.setItem('local_chapters', localChaps);
                animateCounterUpdate(processedCountEl, localChaps.toLocaleString('vi-VN'));
            }
        } catch (error) {
            console.error('Error incrementing chapters count:', error);
            let localChaps = parseInt(localStorage.getItem('local_chapters') || '64');
            localChaps++;
            localStorage.setItem('local_chapters', localChaps);
            animateCounterUpdate(processedCountEl, localChaps.toLocaleString('vi-VN'));
        }
    };

    // Simulate Online Users
    let currentOnline = Math.floor(Math.random() * 8) + 12; // Start with 12 to 19 users
    const simulateOnlineUsers = () => {
        animateCounterUpdate(onlineCountEl, currentOnline);
        
        setInterval(() => {
            // Natural random walk: -2, -1, 0, 1, or 2 change
            const change = Math.floor(Math.random() * 5) - 2;
            currentOnline = Math.max(5, Math.min(38, currentOnline + change)); // range 5 to 38
            animateCounterUpdate(onlineCountEl, currentOnline);
        }, 15000); // update every 15 seconds
    };

    // Start services
    initPageViews();
    fetchTotalChapters();
    simulateOnlineUsers();
});
