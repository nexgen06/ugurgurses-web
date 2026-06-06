# Hızlı Uygulama Rehberi - Kritik İyileştirmeler

Bu rehber, en hızlı şekilde uygulanabilecek ve en büyük etkiyi yaratacak iyileştirmeleri içerir.

## 🚀 Hızlı Kazanımlar (1-2 Saat)

### 1. Toast Bildirim Sistemi

**Dosya**: `js/notifications.js` (yeni)

```javascript
class ToastNotification {
    static show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        const style = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.style.cssText = style;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

// CSS ekle (style.css'e)
// @keyframes slideIn { from { transform: translateX(100%); } }
// @keyframes slideOut { to { transform: translateX(100%); } }
```

**Kullanım**:
```javascript
ToastNotification.show('Dosya başarıyla yüklendi!', 'success');
ToastNotification.show('Bir hata oluştu', 'error');
```

### 2. Dosya Yükleme İlerleme Çubuğu

**script.js'e ekle**:
```javascript
function showProgressBar() {
    const progressBar = document.createElement('div');
    progressBar.id = 'progressBar';
    progressBar.innerHTML = `
        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            <span id="progressText">0%</span>
        </div>
    `;
    document.body.appendChild(progressBar);
    return progressBar;
}

function updateProgress(percent) {
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    if (fill) fill.style.width = percent + '%';
    if (text) text.textContent = percent + '%';
}

function hideProgressBar() {
    const bar = document.getElementById('progressBar');
    if (bar) bar.remove();
}

// Dosya yükleme event'inde kullan:
inputs.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    showProgressBar();
    updateProgress(10);
    
    try {
        // Dosya işleme...
        updateProgress(50);
        // İçerik parse...
        updateProgress(80);
        // Sayfalama...
        updateProgress(100);
        
        setTimeout(() => {
            hideProgressBar();
            ToastNotification.show('Dosya başarıyla yüklendi!', 'success');
        }, 500);
    } catch (err) {
        hideProgressBar();
        ToastNotification.show('Hata: ' + err.message, 'error');
    }
});
```

### 3. Otomatik Kaydetme (localStorage)

**js/storage.js** (yeni):
```javascript
class AutoSave {
    constructor() {
        this.saveKey = 'matbaa_autosave';
        this.interval = 30000; // 30 saniye
        this.timer = null;
    }
    
    start(state) {
        // İlk kayıt
        this.save(state);
        
        // Periyodik kayıt
        this.timer = setInterval(() => {
            this.save(state);
        }, this.interval);
    }
    
    save(state) {
        try {
            const data = {
                cover: {
                    title: state.coverTitle || '',
                    subtitle: state.coverSubtitle || '',
                    year: state.coverYear || 2024,
                    themeColor: state.themeColor || '#2c3e50'
                },
                typography: {
                    font: state.fontFamily || 'Inter',
                    headerScale: state.headerScale || 1.0
                },
                layout: {
                    headerText: state.headerText || '',
                    footerText: state.footerText || '',
                    showPageNumbers: state.showPageNumbers || true,
                    margin: state.margin || 20
                },
                timestamp: Date.now()
            };
            localStorage.setItem(this.saveKey, JSON.stringify(data));
        } catch (err) {
            console.error('Kayıt hatası:', err);
        }
    }
    
    load() {
        try {
            const data = localStorage.getItem(this.saveKey);
            if (data) {
                return JSON.parse(data);
            }
        } catch (err) {
            console.error('Yükleme hatası:', err);
        }
        return null;
    }
    
    clear() {
        localStorage.removeItem(this.saveKey);
    }
    
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}

// Kullanım (script.js'de):
const autoSave = new AutoSave();

// Sayfa yüklendiğinde
window.addEventListener('DOMContentLoaded', () => {
    const saved = autoSave.load();
    if (saved) {
        // Kaydedilmiş ayarları yükle
        if (confirm('Kaydedilmiş bir çalışma bulundu. Yüklemek ister misiniz?')) {
            restoreState(saved);
        }
    }
    
    // Otomatik kayıt başlat
    autoSave.start(getCurrentState());
});

// Sayfa kapanmadan önce uyar
window.addEventListener('beforeunload', (e) => {
    autoSave.save(getCurrentState());
});
```

### 4. Input Debouncing

**js/utils.js** (yeni):
```javascript
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

// Kullanım:
const debouncedTitleUpdate = debounce((value) => {
    preview.title.textContent = value;
    autoSave.save(getCurrentState());
}, 300);

inputs.title.addEventListener('input', (e) => {
    debouncedTitleUpdate(e.target.value);
});
```

### 5. Hata Yönetimi İyileştirmesi

**script.js'deki dosya yükleme kısmını güncelle**:
```javascript
inputs.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validasyon
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        ToastNotification.show('Dosya boyutu 10MB\'dan büyük olamaz', 'error');
        inputs.fileInput.value = '';
        return;
    }
    
    const allowedTypes = ['.txt', '.docx', '.xlsx', '.xls'];
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(extension)) {
        ToastNotification.show('Desteklenmeyen dosya formatı', 'error');
        inputs.fileInput.value = '';
        return;
    }
    
    showProgressBar();
    updateProgress(10);
    
    try {
        let contentHTML = '';
        const fileName = file.name;
        
        updateProgress(30);
        
        if (extension === 'txt') {
            const text = await file.text();
            contentHTML = text.split('\n')
                .map(line => line.trim() ? `<p>${line}</p>` : '<br>')
                .join('');
        } else if (extension === 'docx') {
            updateProgress(50);
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            contentHTML = result.value;
        } else if (['xlsx', 'xls'].includes(extension)) {
            updateProgress(50);
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            contentHTML = XLSX.utils.sheet_to_html(worksheet);
        }
        
        updateProgress(70);
        
        // Citation temizleme
        contentHTML = contentHTML.replace(/\s*\[\s*\d*\s*\]/g, '');
        
        updateProgress(80);
        
        await paginateContent(`<h3>${fileName}</h3>` + contentHTML);
        
        updateProgress(100);
        
        setTimeout(() => {
            hideProgressBar();
            ToastNotification.show('Dosya başarıyla yüklendi!', 'success');
        }, 500);
        
    } catch (err) {
        console.error('Dosya yükleme hatası:', err);
        hideProgressBar();
        ToastNotification.show(
            `Dosya yüklenirken hata oluştu: ${err.message || 'Bilinmeyen hata'}`,
            'error'
        );
    } finally {
        inputs.fileInput.value = '';
    }
});
```

## ⚡ Orta Vadeli İyileştirmeler (1 Gün)

### 6. PDF Export (jsPDF)

**Kurulum**:
```bash
npm install jspdf
# veya CDN: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
```

**js/pdf-export.js** (yeni):
```javascript
async function exportToPDF() {
    ToastNotification.show('PDF oluşturuluyor...', 'info');
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    const pages = document.querySelectorAll('.a4-page');
    
    for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        
        const page = pages[i];
        
        // HTML2Canvas ile sayfayı görsele çevir
        const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    }
    
    const fileName = document.getElementById('coverTitleInput').value || 'document';
    pdf.save(`${fileName}.pdf`);
    
    ToastNotification.show('PDF başarıyla indirildi!', 'success');
}

// Print butonuna ekle:
inputs.printBtn.addEventListener('click', () => {
    // Mevcut: window.print();
    // Yeni: exportToPDF(); (veya her ikisi de seçenek olarak)
});
```

**Not**: html2canvas kütüphanesi de gerekli:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
```

### 7. Zoom Kontrolleri

**HTML'e ekle** (preview-toolbar içine):
```html
<div class="preview-toolbar">
    <span><i class="fa-solid fa-eye"></i> Canlı Önizleme (A4)</span>
    <div class="zoom-controls">
        <button onclick="zoomOut()"><i class="fa-solid fa-minus"></i></button>
        <span id="zoomLevel">100%</span>
        <button onclick="zoomIn()"><i class="fa-solid fa-plus"></i></button>
        <button onclick="resetZoom()"><i class="fa-solid fa-arrows-rotate"></i></button>
    </div>
</div>
```

**script.js'e ekle**:
```javascript
let currentZoom = 1.0;

function setZoom(level) {
    currentZoom = level;
    const container = document.getElementById('printContainer');
    container.style.transform = `scale(${level})`;
    container.style.transformOrigin = 'top center';
    document.getElementById('zoomLevel').textContent = Math.round(level * 100) + '%';
}

function zoomIn() {
    if (currentZoom < 2.0) {
        setZoom(currentZoom + 0.25);
    }
}

function zoomOut() {
    if (currentZoom > 0.25) {
        setZoom(currentZoom - 0.25);
    }
}

function resetZoom() {
    setZoom(1.0);
}

// Klavye kısayolları
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault();
        zoomIn();
    } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        zoomOut();
    } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        resetZoom();
    }
});
```

## 📋 Uygulama Checklist

- [ ] Toast bildirim sistemi eklendi
- [ ] Dosya yükleme ilerleme çubuğu eklendi
- [ ] Otomatik kaydetme (localStorage) eklendi
- [ ] Input debouncing uygulandı
- [ ] Hata yönetimi iyileştirildi
- [ ] PDF export özelliği eklendi
- [ ] Zoom kontrolleri eklendi
- [ ] CSS animasyonları eklendi
- [ ] Test edildi (Chrome, Firefox, Safari)

## 🎨 CSS Eklentileri

**style.css'e ekle**:
```css
/* Toast Animations */
@keyframes slideIn {
    from {
        transform: translateX(400px);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOut {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(400px);
        opacity: 0;
    }
}

/* Progress Bar */
.progress-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 30px 40px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    z-index: 10000;
    min-width: 300px;
}

.progress-bar {
    width: 100%;
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 10px;
}

.progress-fill {
    height: 100%;
    background: var(--theme-color);
    transition: width 0.3s ease;
    width: 0%;
}

#progressText {
    display: block;
    text-align: center;
    font-size: 0.9rem;
    color: #666;
}

/* Zoom Controls */
.zoom-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
}

.zoom-controls button {
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: 0.2s;
}

.zoom-controls button:hover {
    background: rgba(255,255,255,0.3);
}

.preview-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 1200px;
}
```

Bu iyileştirmeler uygulandığında, kullanıcı deneyimi önemli ölçüde artacaktır!
