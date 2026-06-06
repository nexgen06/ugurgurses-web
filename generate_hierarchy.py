import pandas as pd
import json

def generate_hierarchy():
    # Önce Excel (.xlsx), yoksa CSV dosyasını oku
    try:
        df = pd.read_excel('hareket_tur_tip_dayanak_liste.xlsx', sheet_name=0)
    except FileNotFoundError:
        try:
            df = pd.read_csv('hareket_tur_tip_dayanak_liste.xlsx - Sheet0.csv')
        except FileNotFoundError:
            print("Hata: 'hareket_tur_tip_dayanak_liste.xlsx' veya CSV dosyası bulunamadı.")
            return
    except Exception as e:
        print(f"Hata: Dosya okunamadı. {e}")
        return

    # Sütun isimlerindeki boşlukları temizle
    df.columns = df.columns.str.strip()
    
    # Boş verileri temizle (opsiyonel, ihtiyaca göre fillna yapılabilir)
    df = df.fillna("")

    hierarchy = []

    # 1. Seviye: İŞLEM TÜRÜ
    # Benzersiz İşlem Türlerini al
    islem_turleri = df['İŞLEM TÜRÜ'].unique()

    for islem in islem_turleri:
        if not islem: continue # Boşsa geç
        
        islem_obj = {
            "label": str(islem).strip(),
            "value": str(islem).strip(),
            "children": [] # HAREKET TÜRLERİ buraya gelecek
        }

        # Bu İşlem Türü'ne ait verileri filtrele
        df_islem = df[df['İŞLEM TÜRÜ'] == islem]
        
        # 2. Seviye: HAREKET TÜRÜ
        hareket_turleri = df_islem['HAREKET TÜRÜ'].unique()
        
        for hareket_tur in hareket_turleri:
            if not hareket_tur: continue

            tur_obj = {
                "label": str(hareket_tur).strip(),
                "value": str(hareket_tur).strip(),
                "children": [] # HAREKET TİPLERİ buraya gelecek
            }

            # Bu Hareket Türü'ne ait verileri filtrele
            df_tur = df_islem[df_islem['HAREKET TÜRÜ'] == hareket_tur]

            # 3. Seviye: HAREKET TİPİ
            hareket_tipleri = df_tur['HAREKET TİPİ'].unique()

            for hareket_tip in hareket_tipleri:
                if not hareket_tip: continue

                tip_obj = {
                    "label": str(hareket_tip).strip(),
                    "value": str(hareket_tip).strip(),
                    "children": [] # DAYANAKLAR buraya gelecek
                }

                # Bu Hareket Tipi'ne ait verileri filtrele
                df_tip = df_tur[df_tur['HAREKET TİPİ'] == hareket_tip]

                # 4. Seviye: DAYANAK
                dayanaklar = df_tip['DAYANAK'].unique()

                for dayanak in dayanaklar:
                    if not dayanak: continue
                    
                    # Dayanak en son seviye olduğu için children dizisine gerek yok (veya boş bırakılabilir)
                    dayanak_obj = {
                        "label": str(dayanak).strip(),
                        "value": str(dayanak).strip()
                    }
                    tip_obj["children"].append(dayanak_obj)
                
                tur_obj["children"].append(tip_obj)
            
            islem_obj["children"].append(tur_obj)
        
        hierarchy.append(islem_obj)

    # JSON dosyasını kaydet
    output_filename = 'dropdown_data.json'
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(hierarchy, f, ensure_ascii=False, indent=2)

    print(f"JSON dosyası başarıyla oluşturuldu: {output_filename}")

if __name__ == "__main__":
    generate_hierarchy()
