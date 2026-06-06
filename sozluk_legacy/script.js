// ============================================
// SÖZLÜK ŞABLON SİSTEMİ - ANA UYGULAMA
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    // Toast Notification System
    class ToastNotification {
        static show(message, type = 'info', duration = 3000) {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
    }
    
    // Progress Bar System
    function showProgress(percent, text = '') {
        const bar = document.getElementById('progressBar');
        const fill = document.getElementById('progressFill');
        const textEl = document.getElementById('progressText');
        
        bar.style.display = 'flex';
        if (fill) fill.style.width = percent + '%';
        if (textEl) textEl.textContent = text || percent + '%';
    }
    
    function hideProgress() {
        document.getElementById('progressBar').style.display = 'none';
    }
    
    // Debounce function
    function debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // ============================================
    // ELEMENT REFERENCES
    // ============================================
    
    const inputs = {
        fileInput: document.getElementById('fileInput'),
        pasteInput: document.getElementById('pasteInput'),
        processPasteBtn: document.getElementById('processPasteBtn'),
        markdownMode: document.getElementById('markdownMode'),
        coverTitle: document.getElementById('coverTitleInput'),
        coverSubtitle: document.getElementById('coverSubtitleInput'),
        coverYear: document.getElementById('coverYearInput'),
        coverBgColor: document.getElementById('coverBgColor'),
        coverTextColor: document.getElementById('coverTextColor'),
        generateAICoverBtn: document.getElementById('generateAICoverBtn'),
        columnCount: document.getElementById('columnCountSelect'),
        fontSize: document.getElementById('fontSizeSlider'),
        fontSizeValue: document.getElementById('fontSizeValue'),
        margin: document.getElementById('marginSlider'),
        marginValue: document.getElementById('marginValue'),
        headerText: document.getElementById('headerTextInput'),
        footerText: document.getElementById('footerTextInput'),
        pageNumbers: document.getElementById('pageNumbersCheck'),
        showBleedGuides: document.getElementById('showBleedGuides'),
        showPreface: document.getElementById('showPreface'),
        showAbbreviations: document.getElementById('showAbbreviations'),
        sortOrder: document.getElementById('sortOrderSelect'),
        exportPDFBtn: document.getElementById('exportPDFBtn'),
        exportHTMLBtn: document.getElementById('exportHTMLBtn'),
        printBtn: document.getElementById('printBtn')
    };
    
    const preview = {
        title: document.getElementById('previewTitle'),
        subtitle: document.getElementById('previewSubtitle'),
        year: document.getElementById('previewYear'),
        coverPage: document.getElementById('coverPage'),
        aiCoverImage: document.getElementById('aiCoverImage'),
        dictionaryContent: document.getElementById('dictionaryContent'),
        prefacePage: document.getElementById('prefacePage'),
        abbreviationsPage: document.getElementById('abbreviationsPage')
    };
    
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    
    let appState = {
        dictionaryEntries: [],
        currentPage: 1,
        zoom: 1.0
    };
    
    // ============================================
    // FILE PARSING ENGINE
    // ============================================
    
    class FileParser {
        static async parseFile(file) {
            const fileName = file.name;
            const extension = fileName.split('.').pop().toLowerCase();
            
            showProgress(10, 'Dosya okunuyor...');
            
            try {
                if (extension === 'txt') {
                    return await this.parseTXT(file);
                } else if (extension === 'docx') {
                    return await this.parseDOCX(file);
                } else if (['xlsx', 'xls'].includes(extension)) {
                    return await this.parseExcel(file);
                } else if (extension === 'pdf') {
                    return await this.parsePDF(file);
                } else {
                    throw new Error('Desteklenmeyen dosya formatı: ' + extension);
                }
            } catch (error) {
                console.error('Parse error:', error);
                throw error;
            }
        }
        
        static async parseTXT(file) {
            showProgress(30, 'TXT dosyası işleniyor...');
            const text = await file.text();
            return this.parseText(text);
        }
        
        static async parseDOCX(file) {
            showProgress(30, 'Word dosyası işleniyor...');
            
            try {
                if (typeof mammoth === 'undefined') {
                    throw new Error('Mammoth.js kütüphanesi yüklenemedi. Lütfen sayfayı yenileyin.');
                }
                
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                
                // Hata mesajlarını kontrol et
                if (result.messages && result.messages.length > 0) {
                    console.warn('Word parsing warnings:', result.messages);
                }
                
                // HTML'den düz metne çevir
                const text = this.htmlToText(result.value);
                
                if (!text || text.trim().length === 0) {
                    throw new Error('Word dosyasından içerik çıkarılamadı. Dosya boş olabilir veya korumalı olabilir.');
                }
                
                return this.parseText(text);
            } catch (error) {
                console.error('Word parsing error:', error);
                throw new Error('Word dosyası okunamadı: ' + error.message);
            }
        }
        
        static htmlToText(html) {
            if (!html || typeof html !== 'string') {
                return '';
            }
            
            // HTML'den düz metne çevir
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Önce özel etiketleri satır sonlarına çevir
            let text = html;
            
            // Paragrafları koru (satır sonları)
            text = text.replace(/<\/p>/gi, '\n');
            text = text.replace(/<p[^>]*>/gi, '\n');
            text = text.replace(/<br\s*\/?>/gi, '\n');
            text = text.replace(/<\/div>/gi, '\n');
            text = text.replace(/<div[^>]*>/gi, '');
            text = text.replace(/<\/li>/gi, '\n');
            text = text.replace(/<li[^>]*>/gi, '• ');
            
            // Tabloları satır sonlarına çevir
            text = text.replace(/<\/tr>/gi, '\n');
            text = text.replace(/<tr[^>]*>/gi, '');
            text = text.replace(/<\/td>/gi, ' | ');
            text = text.replace(/<td[^>]*>/gi, '');
            text = text.replace(/<\/th>/gi, ' | ');
            text = text.replace(/<th[^>]*>/gi, '');
            
            // HTML etiketlerini kaldır
            text = text.replace(/<[^>]+>/g, '');
            
            // HTML entity'leri decode et
            text = text.replace(/&nbsp;/g, ' ');
            text = text.replace(/&amp;/g, '&');
            text = text.replace(/&lt;/g, '<');
            text = text.replace(/&gt;/g, '>');
            text = text.replace(/&quot;/g, '"');
            text = text.replace(/&#39;/g, "'");
            
            // Çoklu boşlukları temizle (satır sonları hariç)
            text = text.replace(/[ \t]+/g, ' ');
            
            // Çoklu satır sonlarını temizle (max 2)
            text = text.replace(/\n{3,}/g, '\n\n');
            
            // Başlangıç ve son boşlukları temizle
            text = text.trim();
            
            // Eğer hala boşsa, textContent kullan
            if (!text || text.length === 0) {
                text = tempDiv.textContent || tempDiv.innerText || '';
            }
            
            return text;
        }
        
        static async parseExcel(file) {
            showProgress(30, 'Excel dosyası işleniyor...');
            
            try {
                if (typeof XLSX === 'undefined') {
                    throw new Error('XLSX.js kütüphanesi yüklenemedi. Lütfen sayfayı yenileyin.');
                }
                
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                
                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    throw new Error('Excel dosyası boş veya okunamıyor.');
                }
                
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                if (!worksheet) {
                    throw new Error('Excel sayfası okunamadı.');
                }
                
                // Excel'den düz metne çevir (HTML yerine)
                const csv = XLSX.utils.sheet_to_csv(worksheet);
                
                // CSV'yi satırlara böl ve parse et
                const lines = csv.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);
                
                if (lines.length === 0) {
                    throw new Error('Excel dosyasından içerik çıkarılamadı.');
                }
                
                // İlk satır başlık olabilir, atla
                const dataLines = lines.slice(1);
                
                // Her satırı madde olarak işle
                const entries = dataLines.map(line => {
                    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
                    return {
                        word: parts[0] || '',
                        pronunciation: '',
                        grammar: '',
                        definition: parts.slice(1).join(' ') || '',
                        examples: [],
                        etymology: ''
                    };
                }).filter(entry => entry.word.length > 0);
                
                if (entries.length === 0) {
                    // Alternatif: HTML formatını dene
                    const html = XLSX.utils.sheet_to_html(worksheet);
                    return this.parseText(this.htmlToText(html));
                }
                
                return entries;
            } catch (error) {
                console.error('Excel parsing error:', error);
                throw new Error('Excel dosyası okunamadı: ' + error.message);
            }
        }
        
        static async parsePDF(file) {
            showProgress(30, 'PDF dosyası işleniyor...');
            
            try {
                // PDF.js kontrolü
                if (typeof pdfjsLib === 'undefined') {
                    throw new Error('PDF.js kütüphanesi yüklenemedi. Lütfen sayfayı yenileyin ve internet bağlantınızı kontrol edin.');
                }
                
                // Worker yapılandırması
                if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                }
                
                const arrayBuffer = await file.arrayBuffer();
                
                // PDF yükleme
                const loadingTask = pdfjsLib.getDocument({ 
                    data: arrayBuffer,
                    verbosity: 0 // Hata mesajlarını azalt
                });
                
                const pdf = await loadingTask.promise;
                
                if (!pdf || pdf.numPages === 0) {
                    throw new Error('PDF dosyası boş veya okunamıyor.');
                }
                
                let fullText = '';
                let hasText = false;
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    showProgress(30 + Math.floor((i / pdf.numPages) * 40), `PDF sayfa ${i}/${pdf.numPages} işleniyor...`);
                    
                    try {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        
                        if (textContent && textContent.items && textContent.items.length > 0) {
                            // Metin öğelerini birleştir
                            const pageText = textContent.items
                                .map(item => {
                                    // Transform matrisi varsa pozisyon bilgisi kullan
                                    if (item.transform) {
                                        return item.str;
                                    }
                                    return item.str;
                                })
                                .join(' ');
                            
                            // Satır sonlarını korumak için transform bilgisi kullan
                            // Basit yaklaşım: Y pozisyonu değiştiğinde satır sonu ekle
                            let lastY = null;
                            const lines = [];
                            let currentLine = [];
                            
                            textContent.items.forEach(item => {
                                const y = item.transform ? item.transform[5] : null;
                                
                                if (lastY !== null && y !== null && Math.abs(y - lastY) > 5) {
                                    // Y pozisyonu değişti, yeni satır
                                    if (currentLine.length > 0) {
                                        lines.push(currentLine.join(' '));
                                        currentLine = [];
                                    }
                                }
                                
                                if (item.str && item.str.trim()) {
                                    currentLine.push(item.str);
                                }
                                
                                lastY = y;
                            });
                            
                            if (currentLine.length > 0) {
                                lines.push(currentLine.join(' '));
                            }
                            
                            const pageTextFormatted = lines.length > 0 ? lines.join('\n') : pageText;
                            fullText += pageTextFormatted + '\n\n';
                            hasText = true;
                        }
                    } catch (pageError) {
                        console.warn(`Sayfa ${i} okunamadı:`, pageError);
                        // Devam et, diğer sayfaları oku
                    }
                }
                
                if (!hasText || fullText.trim().length === 0) {
                    throw new Error('PDF dosyasından metin çıkarılamadı. Bu PDF görsel tabanlı (taranmış) olabilir. OCR özelliği henüz desteklenmiyor. Lütfen TXT veya Word formatında deneyin.');
                }
                
                return this.parseText(fullText);
            } catch (error) {
                console.error('PDF parsing error:', error);
                
                // Daha açıklayıcı hata mesajı
                let errorMessage = 'PDF dosyası okunamadı. ';
                
                if (error.message.includes('worker')) {
                    errorMessage += 'PDF.js worker yüklenemedi. ';
                } else if (error.message.includes('boş')) {
                    errorMessage += 'Dosya boş görünüyor. ';
                } else if (error.message.includes('metin çıkarılamadı')) {
                    errorMessage += error.message;
                } else {
                    errorMessage += error.message;
                }
                
                errorMessage += ' Lütfen TXT veya Word formatında deneyin.';
                
                throw new Error(errorMessage);
            }
        }
        
        static parseText(text) {
            showProgress(70, 'Metin ayrıştırılıyor...');
            
            if (!text || typeof text !== 'string') {
                throw new Error('Metin içeriği geçersiz veya boş.');
            }
            
            // OCR ve gereksiz metinleri temizle
            text = this.cleanOCRArtifacts(text);
            
            // Satırlara böl
            const lines = text.split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => line.length > 0);
            
            if (lines.length === 0) {
                throw new Error('Dosyadan içerik çıkarılamadı. Dosya boş olabilir veya format desteklenmiyor.');
            }
            
            // Heuristic analiz ile sözlük maddelerine dönüştür
            let entries = this.heuristicParse(lines);
            
            if (entries.length === 0) {
                // Eğer hiç madde bulunamadıysa, alternatif parse yöntemleri dene
                console.warn('Heuristic parse başarısız, alternatif yöntemler deneniyor...');
                
                // Yöntem 1: Her satırı madde olarak kabul et
                entries = lines.map((line, index) => {
                    const word = this.extractWord(line) || line.split(/\s+/)[0] || `Madde${index + 1}`;
                    const definition = line.replace(word, '').trim() || line;
                    
                    return {
                        word: word.substring(0, 50), // Max 50 karakter
                        pronunciation: this.extractPronunciation(line),
                        grammar: this.extractGrammar(line),
                        definition: definition || line,
                        examples: [],
                        etymology: ''
                    };
                }).filter(entry => entry.word && entry.word.length > 0);
                
                console.log(`Alternatif parse ile ${entries.length} madde bulundu`);
            }
            
            // Boş maddeleri temizle
            entries = entries.filter(entry => entry.word && entry.word.trim().length > 0);
            
            showProgress(90, `${entries.length} madde bulundu`);
            
            return entries;
        }
        
        static cleanOCRArtifacts(text) {
            // PDF sayfa numaraları, başlıkları vb. temizle
            text = text.replace(/==Start of OCR==/gi, '');
            text = text.replace(/==End of OCR==/gi, '');
            text = text.replace(/Page \d+/gi, '');
            text = text.replace(/^\d+$/gm, ''); // Sadece sayı olan satırlar
            text = text.replace(/^[A-Z\s]{1,3}$/gm, ''); // Tek harfli satırlar (sayfa başlıkları)
            
            // Satır sonlarını koru (PDF'ten gelen metinlerde önemli)
            // Ancak çoklu boşlukları temizle
            text = text.replace(/[ \t]+/g, ' '); // Yatay boşlukları temizle
            
            // Referans numaralarını koru [93], [12] vb. - bunlar temizlenmemeli
            // (Kullanıcı isteğine göre temizlenebilir, ama varsayılan olarak koruyoruz)
            
            return text;
        }
        
        static heuristicParse(lines) {
            const entries = [];
            let currentEntry = null;
            
            // Eğer çok az satır varsa, hepsini madde olarak kabul et
            if (lines.length < 3) {
                return lines.map(line => ({
                    word: this.extractWord(line),
                    pronunciation: this.extractPronunciation(line),
                    grammar: this.extractGrammar(line),
                    definition: line,
                    examples: [],
                    etymology: ''
                }));
            }
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmedLine = line.trim();
                
                if (!trimmedLine) continue;
                
                // Satır analizi: Başlık mı, tanım mı?
                if (this.isEntryHeader(trimmedLine, i, lines)) {
                    // Önceki maddeyi kaydet
                    if (currentEntry && currentEntry.word) {
                        entries.push(currentEntry);
                    }
                    
                    // Yeni madde başlat
                    currentEntry = this.parseEntryHeader(trimmedLine);
                } else if (currentEntry) {
                    // Mevcut maddenin tanımına ekle
                    if (!currentEntry.definition) {
                        currentEntry.definition = trimmedLine;
                    } else {
                        // Eğer satır büyük harfle başlıyorsa ve kısaysa, yeni madde olabilir
                        // Ama önce tanıma ekle
                        currentEntry.definition += ' ' + trimmedLine;
                    }
                } else {
                    // Eğer hiç madde yoksa, bu satırı madde olarak başlat
                    currentEntry = {
                        word: this.extractWord(trimmedLine),
                        pronunciation: this.extractPronunciation(trimmedLine),
                        grammar: this.extractGrammar(trimmedLine),
                        definition: trimmedLine,
                        examples: [],
                        etymology: ''
                    };
                }
            }
            
            // Son maddeyi ekle
            if (currentEntry && currentEntry.word) {
                entries.push(currentEntry);
            }
            
            return entries;
        }
        
        static isEntryHeader(line, index, allLines) {
            // Heuristic: Başlık olma kriterleri (daha esnek)
            
            // Çok uzun satırlar başlık olamaz
            if (line.length > 150) return false;
            
            // Sadece sayı olan satırlar başlık değil
            if (/^\d+[\.\)]?\s*$/.test(line)) return false;
            
            // İlk kelimeyi al
            const firstWord = line.split(/\s+/)[0];
            if (!firstWord || firstWord.length < 2) return false;
            
            // İlk harf büyük mü? (Türkçe karakterler dahil)
            const isCapitalized = /^[A-ZÇĞİÖŞÜ]/.test(firstWord);
            
            if (!isCapitalized) return false;
            
            // Kriterler (en az biri sağlanmalı):
            // 1. Satır kısa (max 80 karakter)
            // 2. Özel karakterler var (:, •, -, —)
            // 3. Sonraki satır küçük harfle başlıyor (tanım gibi)
            // 4. Sadece büyük harflerden oluşuyor (kısaltma)
            
            const isShort = line.length < 80;
            const hasMarker = /[:•\-—]/.test(line);
            const isAllCaps = /^[A-ZÇĞİÖŞÜ\s]+$/.test(firstWord);
            const nextLineIsDefinition = index < allLines.length - 1 && 
                /^[a-zçğıöşü]/.test(allLines[index + 1].trim());
            
            return isShort || hasMarker || isAllCaps || nextLineIsDefinition;
        }
        
        static extractWord(line) {
            // Satırdan kelimeyi çıkar
            const firstWord = line.split(/\s+/)[0];
            // Özel karakterleri temizle
            return firstWord.replace(/[:•\-—\(\)\[\]]/g, '').trim();
        }
        
        static extractPronunciation(line) {
            // Köşeli parantez içindeki telaffuzu bul
            const match = line.match(/\[([^\]]+)\]/);
            return match ? match[1] : '';
        }
        
        static extractGrammar(line) {
            // Parantez içindeki gramer bilgisini bul
            const match = line.match(/\(([^)]+)\)/);
            return match ? match[1] : '';
        }
        
        static parseEntryHeader(line) {
            // Madde başlığını parse et
            // Format: KELİME [telaffuz] (gramer) veya sadece KELİME
            
            const entry = {
                word: '',
                pronunciation: '',
                grammar: '',
                definition: '',
                examples: [],
                etymology: ''
            };
            
            // Telaffuz bul: [...]
            entry.pronunciation = this.extractPronunciation(line);
            if (entry.pronunciation) {
                line = line.replace(/\[([^\]]+)\]/, '').trim();
            }
            
            // Gramer bul: (isim), (fiil) vb.
            entry.grammar = this.extractGrammar(line);
            if (entry.grammar) {
                line = line.replace(/\(([^)]+)\)/, '').trim();
            }
            
            // Kelimeyi al (ilk kelime, özel karakterleri temizle)
            entry.word = this.extractWord(line);
            
            // Eğer kelime bulunamadıysa, tüm satırı al
            if (!entry.word || entry.word.length === 0) {
                entry.word = line.substring(0, 50).trim();
            }
            
            return entry;
        }
    }
    
    // ============================================
    // DICTIONARY FORMAT PARSER
    // ============================================
    
    class DictionaryParser {
        static parseMarkdownTable(text) {
            // Markdown tablo formatını parse et
            // | Kelime | Tanım ve Örnek |
            
            const entries = [];
            const lines = text.split(/\r?\n/);
            
            for (const line of lines) {
                if (!line.trim().startsWith('|')) continue;
                
                const cells = line.split('|').map(c => c.trim()).filter(c => c);
                if (cells.length >= 2) {
                    const word = cells[0];
                    const definition = cells.slice(1).join(' ');
                    
                    entries.push({
                        word: word.trim(),
                        definition: definition.trim(),
                        pronunciation: '',
                        grammar: '',
                        examples: [],
                        etymology: ''
                    });
                }
            }
            
            return entries;
        }
        
        static parseStructuredText(text) {
            // Yapılandırılmış metin formatını parse et
            // Format: KELİME [telaffuz] (gramer)
            // Tanım...
            // Örnek: ...
            // Köken: ...
            
            const entries = [];
            const blocks = text.split(/\n\s*\n/);
            
            for (const block of blocks) {
                const lines = block.split(/\r?\n/).map(l => l.trim()).filter(l => l);
                if (lines.length === 0) continue;
                
                const entry = FileParser.parseEntryHeader(lines[0]);
                
                // Tanım ve örnekleri bul
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.startsWith('Örnek:') || line.startsWith('örnek:')) {
                        entry.examples.push(line.replace(/^Örnek:\s*/i, ''));
                    } else if (line.startsWith('Köken:') || line.startsWith('köken:')) {
                        entry.etymology = line.replace(/^Köken:\s*/i, '');
                    } else if (!entry.definition) {
                        entry.definition = line;
                    } else {
                        entry.definition += ' ' + line;
                    }
                }
                
                entries.push(entry);
            }
            
            return entries;
        }
    }
    
    // ============================================
    // DICTIONARY RENDERER
    // ============================================
    
    class DictionaryRenderer {
        static render(entries) {
            showProgress(80, 'Sayfalar oluşturuluyor...');
            
            // Alfabetik sırala
            entries.sort((a, b) => {
                const wordA = a.word.toLowerCase().replace(/[çğıöşü]/g, (m) => {
                    const map = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' };
                    return map[m] || m;
                });
                const wordB = b.word.toLowerCase().replace(/[çğıöşü]/g, (m) => {
                    const map = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' };
                    return map[m] || m;
                });
                return wordA.localeCompare(wordB);
            });
            
            // Alfabetik bölümler oluştur
            const sections = this.groupByAlphabet(entries);
            
            // Sayfaları render et
            const container = preview.dictionaryContent;
            container.innerHTML = '';
            
            let pageNum = 1;
            for (const [letter, sectionEntries] of Object.entries(sections)) {
                // Dinamik sayfalama: İçerik sayfaya sığmazsa yeni sayfalar oluştur
                const pages = this.paginateSection(letter, sectionEntries, pageNum);
                pages.forEach(page => {
                    container.appendChild(page);
                });
                pageNum += pages.length;
            }
            
            // Sayfa numaralarını güncelle
            updatePageNumbers();
            
            showProgress(100, 'Tamamlandı!');
            setTimeout(hideProgress, 500);
        }
        
        static paginateSection(letter, entries, startPageNum) {
            const pages = [];
            
            // Basit sayfalama: Her sayfaya yaklaşık 15-20 madde (içerik uzunluğuna göre değişir)
            // Daha gelişmiş sayfalama için gerçek yükseklik ölçümü gerekir, ama bu basit yaklaşım çoğu durumda yeterli
            const estimatedEntriesPerPage = 15;
            
            for (let i = 0; i < entries.length; i += estimatedEntriesPerPage) {
                const pageEntries = entries.slice(i, i + estimatedEntriesPerPage);
                const pageNum = startPageNum + pages.length;
                const isContinued = pages.length > 0;
                
                const page = this.createPage(letter, pageEntries, pageNum, false);
                if (isContinued) {
                    const section = page.querySelector('.alpha-section');
                    if (section) {
                        section.classList.add('continued');
                    }
                }
                
                pages.push(page);
            }
            
            return pages;
        }
        
        static groupByAlphabet(entries) {
            const sections = {};
            
            for (const entry of entries) {
                const firstLetter = entry.word.charAt(0).toUpperCase();
                if (!sections[firstLetter]) {
                    sections[firstLetter] = [];
                }
                sections[firstLetter].push(entry);
            }
            
            return sections;
        }
        
        static createPage(letter, entries, pageNum, isTest = false) {
            const page = document.createElement('div');
            page.className = 'a4-page content-page dictionary-page';
            if (isTest) page.style.position = 'absolute';
            
            const headerText = inputs.headerText.value || 'Sözlük';
            const footerText = inputs.footerText.value || '';
            
            // Devam eden sayfa kontrolü
            const isContinued = pageNum > 1 && entries.length > 0;
            const sectionClass = isContinued ? 'alpha-section continued' : 'alpha-section';
            
            page.innerHTML = `
                <header class="page-header">${headerText}</header>
                <div class="page-body">
                    <div class="${sectionClass}">
                        <h2>${letter}${isContinued ? ' (Devam)' : ''}</h2>
                    </div>
                    <div class="dictionary-columns">
                        ${this.renderEntries(entries)}
                    </div>
                </div>
                <footer class="page-footer">
                    <span class="footer-text">${footerText}</span>
                    <span class="page-num">${pageNum}</span>
                </footer>
            `;
            
            return page;
        }
        
        static renderEntries(entries) {
            const columnCount = parseInt(inputs.columnCount.value) || 2;
            const entriesPerColumn = Math.ceil(entries.length / columnCount);
            
            let html = '';
            for (let col = 0; col < columnCount; col++) {
                html += '<div class="dictionary-column">';
                const start = col * entriesPerColumn;
                const end = Math.min(start + entriesPerColumn, entries.length);
                
                for (let i = start; i < end; i++) {
                    html += this.renderEntry(entries[i]);
                }
                
                html += '</div>';
            }
            
            return html;
        }
        
        static renderEntry(entry) {
            let html = '<div class="dict-entry">';
            
            // Kelime
            html += `<div class="dict-entry-word">${this.escapeHtml(entry.word)}</div>`;
            
            // Telaffuz
            if (entry.pronunciation) {
                html += `<span class="dict-entry-pronunciation">[${this.escapeHtml(entry.pronunciation)}]</span>`;
            }
            
            // Gramer
            if (entry.grammar) {
                html += `<span class="dict-entry-grammar">(${this.escapeHtml(entry.grammar)})</span>`;
            }
            
            // Tanım
            if (entry.definition) {
                html += `<div class="dict-entry-definition">${this.formatDefinition(entry.definition)}</div>`;
            }
            
            // Örnekler
            if (entry.examples && entry.examples.length > 0) {
                for (const example of entry.examples) {
                    html += `<div class="dict-entry-example">${this.escapeHtml(example)}</div>`;
                }
            }
            
            // Etimoloji
            if (entry.etymology) {
                html += `<div class="dict-entry-etymology">${this.escapeHtml(entry.etymology)}</div>`;
            }
            
            html += '</div>';
            return html;
        }
        
        static formatDefinition(text) {
            // Numaralı listeleri formatla (1., 2., vb.)
            text = text.replace(/(\d+)\.\s+/g, '<strong>$1.</strong> ');
            // Referans numaralarını koru [93], [12] vb.
            // (Zaten temizlenmemiş olmalı, ama emin olmak için)
            return text;
        }
        
        static escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }
    
    // ============================================
    // EVENT HANDLERS
    // ============================================
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(tabName + 'Tab').classList.add('active');
        });
    });
    
    // File input
    inputs.fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            showProgress(0, 'Dosya işleniyor...');
            
            // Dosya boyutu kontrolü
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                throw new Error(`Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(2)}MB). Maksimum boyut: 50MB`);
            }
            
            // Dosya tipi kontrolü
            const extension = file.name.split('.').pop().toLowerCase();
            const allowedExtensions = ['txt', 'docx', 'doc', 'pdf', 'xlsx', 'xls'];
            if (!allowedExtensions.includes(extension)) {
                throw new Error(`Desteklenmeyen dosya formatı: ${extension}. Desteklenen formatlar: ${allowedExtensions.join(', ')}`);
            }
            
            let entries;
            if (inputs.markdownMode.checked && extension === 'txt') {
                // Sadece TXT için markdown modu
                const text = await file.text();
                entries = DictionaryParser.parseMarkdownTable(text);
            } else {
                entries = await FileParser.parseFile(file);
            }
            
            if (!entries || entries.length === 0) {
                throw new Error('Dosyadan hiç madde çıkarılamadı. Dosya formatını kontrol edin.');
            }
            
            appState.dictionaryEntries = entries;
            DictionaryRenderer.render(entries);
            
            ToastNotification.show(`${entries.length} madde başarıyla yüklendi!`, 'success');
        } catch (error) {
            console.error('File processing error:', error);
            const errorMessage = error.message || 'Bilinmeyen bir hata oluştu';
            ToastNotification.show('Hata: ' + errorMessage, 'error');
            
            // Detaylı hata bilgisi konsola
            console.error('Error details:', {
                fileName: file?.name,
                fileSize: file?.size,
                fileType: file?.type,
                error: error
            });
        } finally {
            hideProgress();
            inputs.fileInput.value = '';
        }
    });
    
    // Paste input
    inputs.processPasteBtn.addEventListener('click', async () => {
        const text = inputs.pasteInput.value;
        if (!text.trim()) {
            ToastNotification.show('Lütfen metin yapıştırın', 'error');
            return;
        }
        
        try {
            showProgress(0, 'Metin işleniyor...');
            
            let entries;
            if (inputs.markdownMode.checked) {
                entries = DictionaryParser.parseMarkdownTable(text);
            } else {
                entries = DictionaryParser.parseStructuredText(text);
            }
            
            appState.dictionaryEntries = entries;
            DictionaryRenderer.render(entries);
            
            ToastNotification.show(`${entries.length} madde başarıyla işlendi!`, 'success');
        } catch (error) {
            console.error('Paste processing error:', error);
            ToastNotification.show('Hata: ' + error.message, 'error');
            hideProgress();
        }
    });
    
    // Cover settings
    inputs.coverTitle.addEventListener('input', (e) => {
        preview.title.textContent = e.target.value;
    });
    
    inputs.coverSubtitle.addEventListener('input', (e) => {
        preview.subtitle.textContent = e.target.value;
    });
    
    inputs.coverYear.addEventListener('input', (e) => {
        preview.year.textContent = e.target.value;
    });
    
    inputs.coverBgColor.addEventListener('input', (e) => {
        preview.coverPage.style.setProperty('--cover-bg-color', e.target.value);
        preview.coverPage.style.backgroundColor = e.target.value;
    });
    
    inputs.coverTextColor.addEventListener('input', (e) => {
        preview.coverPage.style.setProperty('--cover-text-color', e.target.value);
        preview.coverPage.style.color = e.target.value;
    });
    
    // Layout settings
    inputs.columnCount.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--column-count', e.target.value);
        if (appState.dictionaryEntries.length > 0) {
            DictionaryRenderer.render(appState.dictionaryEntries);
        }
    });
    
    inputs.fontSize.addEventListener('input', (e) => {
        const size = e.target.value;
        inputs.fontSizeValue.textContent = size + 'pt';
        document.documentElement.style.setProperty('--font-size', size + 'pt');
    });
    
    inputs.margin.addEventListener('input', (e) => {
        const margin = e.target.value;
        inputs.marginValue.textContent = margin + 'mm';
        document.documentElement.style.setProperty('--page-margin', margin + 'mm');
    });
    
    inputs.pageNumbers.addEventListener('change', (e) => {
        const display = e.target.checked ? 'block' : 'none';
        document.querySelectorAll('.page-num').forEach(el => {
            el.style.display = display;
        });
    });
    
    inputs.showBleedGuides.addEventListener('change', (e) => {
        document.querySelectorAll('.a4-page').forEach(page => {
            if (e.target.checked) {
                page.classList.add('show-bleed');
            } else {
                page.classList.remove('show-bleed');
            }
        });
    });
    
    inputs.showPreface.addEventListener('change', (e) => {
        preview.prefacePage.style.display = e.target.checked ? 'flex' : 'none';
    });
    
    inputs.showAbbreviations.addEventListener('change', (e) => {
        preview.abbreviationsPage.style.display = e.target.checked ? 'flex' : 'none';
    });
    
    // Export functions
    inputs.exportPDFBtn.addEventListener('click', async () => {
        ToastNotification.show('PDF oluşturuluyor...', 'info');
        
        const element = document.getElementById('printContainer');
        const opt = {
            margin: 0,
            filename: (inputs.coverTitle.value || 'sozluk') + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        try {
            await html2pdf().set(opt).from(element).save();
            ToastNotification.show('PDF başarıyla indirildi!', 'success');
        } catch (error) {
            console.error('PDF export error:', error);
            ToastNotification.show('PDF oluşturulurken hata oluştu', 'error');
        }
    });
    
    inputs.exportHTMLBtn.addEventListener('click', () => {
        const html = document.documentElement.outerHTML;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (inputs.coverTitle.value || 'sozluk') + '.html';
        a.click();
        URL.revokeObjectURL(url);
        ToastNotification.show('HTML dosyası indirildi!', 'success');
    });
    
    inputs.printBtn.addEventListener('click', () => {
        window.print();
    });
    
    // AI Cover Generation
    inputs.generateAICoverBtn.addEventListener('click', async () => {
        const title = inputs.coverTitle.value || 'Sözlük';
        const subtitle = inputs.coverSubtitle.value || '';
        
        ToastNotification.show('AI kapak oluşturuluyor...', 'info');
        
        try {
            // Google Gemini API entegrasyonu için placeholder
            // Kullanıcı kendi API key'ini ekleyebilir
            const apiKey = prompt('Google Gemini API Key\'inizi girin (isteğe bağlı):');
            
            if (!apiKey) {
                ToastNotification.show('AI kapak oluşturma için API key gerekli. Manuel kapak tasarımı kullanabilirsiniz.', 'info');
                return;
            }
            
            // Gemini API çağrısı (Imagen modeli)
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Create an abstract, artistic book cover image for a dictionary titled "${title}". The cover should be professional, modern, and suitable for printing. Use abstract shapes and typography elements.`
                        }]
                    }]
                })
            });
            
            if (!response.ok) {
                throw new Error('API hatası: ' + response.statusText);
            }
            
            const data = await response.json();
            
            // Görseli kapak sayfasına ekle
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const imageUrl = data.candidates[0].content.parts[0].text; // Base64 veya URL
                preview.aiCoverImage.style.backgroundImage = `url(${imageUrl})`;
                preview.aiCoverImage.style.display = 'block';
                ToastNotification.show('AI kapak başarıyla oluşturuldu!', 'success');
            } else {
                throw new Error('API yanıtı beklenen formatta değil');
            }
        } catch (error) {
            console.error('AI cover generation error:', error);
            ToastNotification.show('AI kapak oluşturulamadı: ' + error.message, 'error');
        }
    });
    
    // Page number update function
    function updatePageNumbers() {
        const pages = document.querySelectorAll('.a4-page');
        let pageNum = 1;
        pages.forEach(page => {
            if (page.style.display !== 'none') {
                const pageNumEl = page.querySelector('.page-num');
                if (pageNumEl) {
                    // Roman numerals for preface/abbreviations
                    if (page.id === 'prefacePage' || page.id === 'abbreviationsPage') {
                        pageNumEl.textContent = toRoman(pageNum);
                    } else {
                        pageNumEl.textContent = pageNum;
                    }
                    pageNum++;
                }
            }
        });
    }
    
    function toRoman(num) {
        const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
        let result = '';
        for (let i = 0; i < values.length; i++) {
            while (num >= values[i]) {
                result += symbols[i];
                num -= values[i];
            }
        }
        return result;
    }
    
    // Zoom controls
    window.zoomIn = function() {
        if (appState.zoom < 2.0) {
            appState.zoom += 0.25;
            updateZoom();
        }
    };
    
    window.zoomOut = function() {
        if (appState.zoom > 0.25) {
            appState.zoom -= 0.25;
            updateZoom();
        }
    };
    
    window.resetZoom = function() {
        appState.zoom = 1.0;
        updateZoom();
    };
    
    function updateZoom() {
        const container = document.getElementById('printContainer');
        container.style.transform = `scale(${appState.zoom})`;
        document.getElementById('zoomLevel').textContent = Math.round(appState.zoom * 100) + '%';
    }
    
    // Initialize
    updatePageNumbers();
    ToastNotification.show('Sözlük Şablon Sistemi hazır!', 'success');
});
