/**
 * jsPDF varsayilan fontu Turkce karakterleri desteklemedigi icin
 * PDF'e giden metinleri ASCII karsiliklarina cevirir.
 * Boylece ?, kare veya bos karakter sorunlari ortadan kalkar.
 */
const TR_MAP: Record<string, string> = {
  'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
  'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
};

export function pdfTurkce(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str.split('').map(c => TR_MAP[c] ?? c).join('');
}
