
import React, { useState, useRef, useEffect } from 'react';

import { fastLocalParser } from './services/parserService';
import { DictionaryEntry, CoverConfig, DictionarySettings, Alignment, PageNumberPosition } from './types';
import CoverPage from './components/CoverPage';
import DictionaryContent from './components/DictionaryContent';
import ForewordPage from './components/ForewordPage';
import AbbreviationsPage from './components/AbbreviationsPage';

const App: React.FC = () => {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [quickPasteText, setQuickPasteText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const [coverConfig, setCoverConfig] = useState<CoverConfig>({
    title: 'İSG TERİMLER\nSÖZLÜĞÜ',
    subtitle: 'İş Sağlığı ve Güvenliği Kapsamlı Rehber',
    author: '2025/2026 EDİSYONU',
    backgroundColor: '#1e293b',
    textColor: '#ffffff',
    editionYear: '2025/2026 EDİSYONU',
    professionalText: 'Profesyonel Baskı'
  });

  const [settings, setSettings] = useState<DictionarySettings>({
    columns: 2,
    fontSize: 14,
    showAlphabetHeaders: true,
    showPageNumbers: true,
    showGuidelines: true,
    forewordText: '',
    abbreviationsText: '',
    headerText: 'LexiPrint Dictionary Pro',
    headerAlignment: 'right',
    headerShowLogo: true,
    footerText: 'Gizli ve Özel Baskı',
    footerAlignment: 'left',
    pageNumberPosition: 'footer-right'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const printableRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    const calculatePages = () => {
      if (printableRef.current) {
        const blocks = printableRef.current.querySelectorAll('.page-block');
        setPageCount(blocks.length);
      }
    };
    const timer = setTimeout(calculatePages, 1000);
    return () => clearTimeout(timer);
  }, [entries, settings, activeTab, settings.forewordText, settings.abbreviationsText]);



  const handleQuickPaste = () => {
    if (!quickPasteText.trim()) return;
    const parsed = fastLocalParser(quickPasteText);
    if (parsed.length > 0) {
      setEntries(prev => {
        const newList = [...prev, ...parsed];
        // Alfabetik sırala (Türkçe karakter duyarlı)
        return newList.sort((a, b) => a.word.localeCompare(b.word, 'tr'));
      });
      setQuickPasteText("");
      alert(`${parsed.length} yeni terim başarıyla eklendi.`);
    } else {
      alert("Geçerli bir terim formatı bulunamadı.\nLütfen her satıra 'Terim: Tanım' şeklinde veya alt alta yazın.");
    }
  };

  const extractTextFromPDF = async (data: ArrayBuffer): Promise<string> => {
    const pdfjs = (window as any).pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjs.getDocument({ data }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Sayfa sonlarında karışıklığı önlemek için çift new line
      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join("\n") + "\n\n";
    }
    return fullText;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let rawText = "";
      let parsedEntries: DictionaryEntry[] = [];

      if (extension === 'xlsx' || extension === 'xls') {
        const data = await file.arrayBuffer();
        const workbook = (window as any).XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = (window as any).XLSX.utils.sheet_to_json(worksheet);
        parsedEntries = jsonData.map((item: any) => {
          const keys = Object.keys(item);
          // Olası kelime başlıkları
          const wordKey = keys.find(k => /word|kelime|term|terim|madde/i.test(k)) || keys[0];
          // Olası tanım başlıkları
          const defKey = keys.find(k => /definition|anlam|aciklama|tanim|desc/i.test(k)) || keys[1];

          return {
            word: (item[wordKey] || '').toString().trim(),
            definition: (item[defKey] || '').toString().trim()
          };
        }).filter((item: any) => item.word && item.definition);
      } else {
        if (extension === 'txt') {
          rawText = await file.text();
        } else if (extension === 'docx') {
          const data = await file.arrayBuffer();
          const result = await (window as any).mammoth.extractRawText({ arrayBuffer: data });
          rawText = result.value;
        } else if (extension === 'pdf') {
          const data = await file.arrayBuffer();
          rawText = await extractTextFromPDF(data);
        }

        parsedEntries = fastLocalParser(rawText);
      }

      if (parsedEntries.length > 0) {
        setEntries(prev => {
          const newList = [...prev, ...parsedEntries];
          return newList.sort((a, b) => a.word.localeCompare(b.word, 'tr'));
        });
        setActiveTab('preview');
        alert(`${parsedEntries.length} madde başarıyla aktarıldı.`);
      } else {
        alert("Geçerli bir sözlük maddesi bulunamadı veya dosya formatı desteklenmiyor.");
      }
    } catch (error) {
      console.error(error);
      alert("Dosya işleme hatası: Format uyumsuz veya bozuk.");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const exportPDF = async () => {
    const element = document.getElementById('printable-area');
    if (!element || entries.length === 0) return;
    setIsLoading(true);
    const opt = {
      margin: 0,
      filename: `sozluk_profesyonel_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };
    try {
      window.scrollTo(0, 0);
      await (window as any).html2pdf().from(element).set(opt).save();
    } finally {
      setIsLoading(false);
    }
  };

  const exportHTML = () => {
    const element = document.getElementById('printable-area');
    if (!element || entries.length === 0) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(s => s.outerHTML)
      .join('\n');

    const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>LexiPrint - Sözlük Export</title>
    ${styles}
    <style>
      body { background: #f1f5f9 !important; padding: 50px 0; }
      .page-block { margin-bottom: 50px !important; display: flex; justify-content: center; }
      .inner-page-container { box-shadow: 0 10px 40px rgba(0,0,0,0.1) !important; border: none !important; }
      @media print {
        body { background: white !important; padding: 0; }
        .page-block { margin-bottom: 0 !important; display: block; }
        .inner-page-container { box-shadow: none !important; page-break-after: always; }
      }
    </style>
</head>
<body>
    <div id="printable-area" class="${settings.showGuidelines ? 'show-guides' : ''}">
      ${element.innerHTML}
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sozluk_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans overflow-x-hidden">
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center text-white text-center px-10">
          <div className="w-20 h-20 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-bold mb-2">İşlem Gerçekleştiriliyor</h2>
          <p className="text-slate-400 animate-pulse">Veriler işleniyor, lütfen bekleyin...</p>
        </div>
      )}

      <header className="bg-slate-900 text-white p-4 sticky top-0 z-[1000] shadow-lg no-print">
        <div className="container mx-auto flex justify-between items-center px-4">
          <div className="flex items-center space-x-3">
            <div className="bg-rose-500 w-8 h-8 rounded-lg flex items-center justify-center font-black">L</div>
            <h1 className="text-lg font-bold tracking-tight">LexiPrint <span className="text-rose-500">Pro</span></h1>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => setActiveTab('editor')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'editor' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}>Tasarım & Veri</button>
            <button onClick={() => setActiveTab('preview')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'preview' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}>Önizleme</button>
            <div className="h-6 w-[1px] bg-slate-700 mx-2"></div>
            <button onClick={exportHTML} disabled={isLoading || entries.length === 0} className="px-4 py-2 rounded-xl text-sm bg-slate-700 hover:bg-slate-600 font-bold disabled:opacity-50 transition-all shadow-lg">HTML İndir</button>
            <button onClick={exportPDF} disabled={isLoading || entries.length === 0} className="px-4 py-2 rounded-xl text-sm bg-rose-600 hover:bg-rose-700 font-bold disabled:opacity-50 transition-all shadow-lg shadow-rose-900/20">PDF İndir</button>
            <button onClick={() => window.print()} disabled={entries.length === 0} className="px-4 py-2 rounded-xl text-sm bg-emerald-600 hover:bg-emerald-700 font-bold disabled:opacity-50 transition-all shadow-lg shadow-emerald-900/20">Yazdır</button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex h-[calc(100vh-64px)] overflow-hidden print:h-auto print:overflow-visible print:block">
        <aside className={`w-80 bg-white border-r p-6 overflow-y-auto no-print shadow-2xl transition-all ${activeTab === 'preview' ? 'hidden' : 'block'}`}>
          <div className="space-y-8">
            {/* Kapak Görseli Bölümü */}
            <section className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 block tracking-[0.2em] uppercase">01. Kapak Ayarları</label>
              <div className="space-y-3">
                <input
                  className="w-full p-3 border-none bg-slate-50 rounded-xl text-sm ring-1 ring-slate-200 font-bold"
                  placeholder="Sözlük Başlığı"
                  value={coverConfig.title}
                  onChange={e => setCoverConfig({ ...coverConfig, title: e.target.value })}
                />
                <input
                  className="w-full p-3 border-none bg-slate-50 rounded-xl text-sm ring-1 ring-slate-200 font-bold"
                  placeholder="Alt Başlık"
                  value={coverConfig.subtitle}
                  onChange={e => setCoverConfig({ ...coverConfig, subtitle: e.target.value })}
                />
                <input
                  className="w-full p-3 border-none bg-slate-50 rounded-xl text-sm ring-1 ring-slate-200 font-bold"
                  placeholder="Edisyon / Yıl (Örn: 2025/2026)"
                  value={coverConfig.editionYear || ''}
                  onChange={e => setCoverConfig({ ...coverConfig, editionYear: e.target.value })}
                />
                <input
                  className="w-full p-3 border-none bg-slate-50 rounded-xl text-sm ring-1 ring-slate-200 font-bold"
                  placeholder="Alt Metin (Örn: Profesyonel Baskı)"
                  value={coverConfig.professionalText || ''}
                  onChange={e => setCoverConfig({ ...coverConfig, professionalText: e.target.value })}
                />

              </div>
            </section>

            {/* Hızlı Terim Ekle Bölümü */}
            <section className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 block tracking-[0.2em] uppercase">02. Hızlı Terim Ekle</label>
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <textarea
                  className="w-full p-2 border-none bg-white rounded-lg text-xs ring-1 ring-slate-200 min-h-[120px]"
                  placeholder="Formatlar:&#10;Terim: Tanım&#10;Terim - Tanım&#10;Alt alta satırlar..."
                  value={quickPasteText}
                  onChange={e => setQuickPasteText(e.target.value)}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleQuickPaste}
                    disabled={!quickPasteText.trim()}
                    className="flex-grow py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider disabled:opacity-50 transition-all"
                  >
                    Hepsini Ekle
                  </button>
                  <button
                    onClick={() => setQuickPasteText("")}
                    className="px-3 py-2 border border-slate-200 text-slate-400 rounded-lg text-[10px] hover:bg-white transition-all"
                  >
                    ❌
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 italic">100'lerce satırı aynı anda yapıştırabilirsiniz.</p>
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">03. Kaynak Dosya</label>
              </div>
              <div className="group border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 hover:border-rose-300 hover:bg-rose-50/30 transition-all cursor-pointer relative overflow-hidden text-center">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.docx,.xlsx,.pdf" className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <div className="text-2xl mb-2">📂</div>
                <p className="text-xs font-bold text-slate-600">Dosya Ekle</p>
                <p className="text-[9px] text-slate-400 mt-1">PDF, Excel, Word, TXT</p>
              </div>
            </section>

            <section className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 block tracking-[0.2em] uppercase">04. Sayfa İçerikleri</label>
              <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[9px] font-black text-slate-500 mb-1 uppercase">Önsöz Metni</p>
                  <textarea
                    className="w-full p-2 border-none bg-white rounded-lg text-xs ring-1 ring-slate-200 min-h-[80px]"
                    placeholder="Kitap başındaki açıklama metni..."
                    value={settings.forewordText}
                    onChange={e => setSettings({ ...settings, forewordText: e.target.value })}
                  />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 mb-1 uppercase">Kısaltmalar</p>
                  <textarea
                    className="w-full p-2 border-none bg-white rounded-lg text-xs ring-1 ring-slate-200 min-h-[80px]"
                    placeholder="Kısaltma : Açıklama"
                    value={settings.abbreviationsText}
                    onChange={e => setSettings({ ...settings, abbreviationsText: e.target.value })}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 block tracking-[0.2em] uppercase">05. Üst ve Alt Bilgi Ayarları</label>
              <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[9px] font-black text-slate-500 mb-1 uppercase">Üst Bilgi Metni</p>
                  <input className="w-full p-2 border-none bg-white rounded-lg text-xs ring-1 ring-slate-200" type="text" value={settings.headerText} onChange={e => setSettings({ ...settings, headerText: e.target.value })} />
                </div>

                <div className="pt-2 border-t">
                  <p className="text-[9px] font-black text-slate-500 mb-1 uppercase">Alt Bilgi Metni</p>
                  <input className="w-full p-2 border-none bg-white rounded-lg text-xs ring-1 ring-slate-200" type="text" value={settings.footerText} onChange={e => setSettings({ ...settings, footerText: e.target.value })} />
                </div>

                <div>
                  <p className="text-[9px] font-black text-slate-500 mb-1 uppercase">Sayfa No Konumu</p>
                  <select className="w-full p-2 bg-white rounded-lg text-[10px] ring-1 ring-slate-200 font-bold" value={settings.pageNumberPosition} onChange={e => setSettings({ ...settings, pageNumberPosition: e.target.value as PageNumberPosition })}>
                    <option value="none">Yok</option>
                    <option value="header-right">Üst Sağ</option>
                    <option value="footer-right">Alt Sağ</option>
                    <option value="footer-center">Alt Orta</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="pt-6 border-t border-slate-100">
              <label className="text-[10px] font-black text-slate-400 block mb-4 tracking-[0.2em] uppercase">06. Matbaa & Tipografi</label>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-700 font-black uppercase">Punto: {settings.fontSize}px</span>
                  <input type="range" min="10" max="22" value={settings.fontSize} onChange={e => setSettings({ ...settings, fontSize: parseInt(e.target.value) })} className="w-24 accent-rose-500" />
                </div>
                <button onClick={() => setSettings({ ...settings, showGuidelines: !settings.showGuidelines })} className={`w-full flex items-center justify-between p-3 rounded-xl border text-[10px] font-black uppercase transition-all ${settings.showGuidelines ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                  Kesim Çizgileri <span>{settings.showGuidelines ? 'AÇIK' : 'KAPALI'}</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm('Tüm sözlük verileri silinecek. Emin misiniz?')) setEntries([]);
                  }}
                  className="w-full p-3 rounded-xl border border-rose-200 text-rose-600 text-[10px] font-black uppercase hover:bg-rose-50 transition-all"
                >
                  Tüm Veriyi Sil
                </button>
              </div>
            </section>
          </div>
        </aside>

        <section className="flex-grow bg-slate-200 p-10 overflow-y-auto print:bg-white print:p-0 print:overflow-visible relative scroll-smooth">
          <div
            ref={printableRef}
            className={`transition-all duration-300 ${activeTab === 'preview' ? 'paged-view' : ''} ${settings.showGuidelines ? 'show-guides' : ''}`}
            id="printable-area"
          >
            <CoverPage config={coverConfig} />
            <ForewordPage text={settings.forewordText} settings={settings} cover={coverConfig} />
            <AbbreviationsPage text={settings.abbreviationsText} settings={settings} cover={coverConfig} />

            {entries.length > 0 ? (
              <DictionaryContent entries={entries} settings={settings} cover={coverConfig} />
            ) : activeTab === 'preview' && (
              <div className="inner-page-container flex items-center justify-center text-slate-300 italic no-print">
                Veri bekleniyor...
              </div>
            )}
          </div>

          {activeTab === 'preview' && pageCount > 0 && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-slate-200 p-2 rounded-2xl shadow-2xl z-[2000] flex items-center space-x-1 no-print max-w-[90vw] overflow-x-auto scrollbar-hide">
              <div className="px-4 border-r border-slate-200 mr-2 py-2">
                <span className="text-[10px] font-black text-slate-400 block uppercase">Navigasyon</span>
                <span className="text-xs font-bold text-slate-700">{pageCount} Sayfa</span>
              </div>
              {Array.from({ length: pageCount }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const blocks = printableRef.current?.querySelectorAll('.page-block');
                    if (blocks && blocks[idx]) blocks[idx].scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-600 text-[10px] font-black transition-all flex-shrink-0 flex items-center justify-center"
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
