// Custom Business Rules for Ekip Application

export function initCustomRules() {
    const hareketTipiSelect = document.getElementById('hareketTipi');
    const dayanakSelect = document.getElementById('dayanak');
    const aciklamaTextarea = document.getElementById('aciklama');

    if (!hareketTipiSelect || !dayanakSelect) {
        console.warn('Custom Rules: Required elements not found.');
        return;
    }

    hareketTipiSelect.addEventListener('change', (e) => {
        const selectedValue = e.target.value;

        // Rule 1: Hareket Tipi: 181 KHK Ek 9'ncu Maddesi -> Dayanak: Kızılay devir personeli
        if (selectedValue === "181 KHK Ek 9'ncu Maddesi") {
            addAndSelectOption(dayanakSelect, "Kızılay devir personeli");
        }

        // Rule 2: Hareket Tipi: 3713 Terörle Mücadele
        if (selectedValue === "3713 Terörle Mücadele") {
            const optionsToAdd = [
                "TERÖRLE MÜCADELE 657 S.K. 36/8",
                "A açıktan Atama", // Correcting typo in plan if any, but using user input roughly or standard? User said "Açıktan Atama".
                "Açıktan Atama",
                "3713 sayılı Terörle Mücadele Kanununa göre."
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));

            // Select the first one
            dayanakSelect.value = "TERÖRLE MÜCADELE 657 S.K. 36/8";

            // Description auto-fill removed by user request
        }
        // Rule 3: Hareket Tipi: TUS/SINAV
        if (selectedValue === "TUS/SINAV") {
            const optionsToAdd = [
                "(2577/28)657 S.K.36/9 ve 76.md. ile B.A.N.Y.13-B",
                "(2577/28)657 S.K.36/9,72.,76.md.",
                "(2577/28)657 S.K.36/A-9,72.,76.md.ve B.A.N.Y.7.",
                "(2577/28)657 S.K.36/A-9,72.ve74.md.A.N.Y.15.md",
                "(2577/28)657 S.K.72 ve 76.md.ile B.A.N.Y.9.",
                "(2577/28)657 S.K.72.ve 76. maddeleri",
                "(2577/28)657 S.K.72.ve76.ve B.A.N.Y.7.",
                "(2577/28)657 S.K.86.md.",
                "(2577/28)657 S.K.değişik 45,71,ve 76.maddeleri",
                "(2577/28)657/76",
                "(2577/28)açıktan yüksek okul (dms-5)kpss önlisans",
                "(2577/28)DİLEKÇE 657 S.K.72.ve 76.maddeleri",
                "(2577/28)DİLEKÇE 657 S.K.72.ve76.ve B.A.N.Y.7.",
                "(2577/28)EŞ 657 S.K.45,71,76.md.ve B.A.N.Y.15/a",
                "(2577/28)İht.Son.657 S.K.36/9,72,76.md.,A.N.Y.7.",
                "(2577/28)İht.Sonrası 657 S.K.36/9,72.,76.md.",
                "(2577/28)Naklen ve Terfien(68/B ve 76)",
                "(2577/28)Naklen, 657 S.K.68,76, ve 161.maddeleri",
                "(2577/28)naklen tayin (9/c)",
                "(2577/28)seçim için istifası sonrası atanması",
                "(2577/28)Yeni Mezun-Naklen Tayin (11/d)",
                "(2577/28)Yeni Mezun-Öğrenim Durumu",
                "2014 Sonbahar Dönemi Mahkeme Kararı DHY'li",
                "2017/3 4B Sözleşmeli Personel Açıktan Alım",
                "2017/5 4/B Sözleşmeli Açıktan (TKHK)",
                "2023 MÜFETTİŞ YARDIMCISI",
                "2577/28",
                "2577/52",
                "4/B Sözleşmeli KPSS",
                "4924 sayılı Kanuna tabi Sözleşmeli Personel",
                "657 4/B (663-45/A) Sözleşmeli Per.Alm. (2021-10)",
                "657 4/B (663-45/A) Sözleşmeli Per.Alm. (2022-11)",
                "657 4/B (663-45/A) Sözleşmeli Per.Alm. (2022-5)",
                "657 4/B (663-45/A) Sözleşmeli Per.Alm. (2023-5)",
                "657 4/B Sözleşmeli Per.Alm. (2023-5)",
                "657 4/B Sözleşmeli Personel Alımları",
                "657 4/B Sözleşmeli Personel Alımları (2019-4)",
                "657 4/B Sözleşmeli Personel Alımı (KPSS-2022/11)",
                "657 4/B Sözleşmeli Personel Alımıları (2018)",
                "657 4/B Sözleşmeli Personel Alımıları (2018-4)",
                "657 4/B Sözleşmeli Personel Alımıları (2018-5)",
                "657 4/B Sözleşmeli Personel Alımıları (2019-7)",
                "657 4/B Sözleşmeli Personel Alımıları (2020-14)",
                "657 4/B Sözleşmeli Personel Alımıları (2020-4)",
                "657 4/B Sözleşmeli Personel Alımıları (2020-5)",
                "657 4/B Sözleşmeli Personel Alımıları (2020-8)",
                "657 4/B Sözleşmeli Personel Alımıları (Bakanlık)",
                "657 4B Sözleşmeli personel açıktan alım",
                "657 4B Sözleşmeli personel açıktan alım(THSK)",
                "657 4B Sözlşmli per. açıktan (THSK)(Çevre Sağ.)",
                "açıktan atama",
                "Açıktan Atama KPSS (THSK)",
                "Açıktan Atama KPSS (THSK) aktif",
                "Başasistan Açıktan",
                "Başasistan Muvafakat (Sınav)",
                "Bilişim Personeli Sözleşmeli",
                "DUS Bakanlık adına",
                "Eğitim Görevlisi (Sınav)",
                "Eğtim Görevlisi Muvafakat (Sınav)",
                "İhtisas Şubesi Af Kanununa göre",
                "İhtisas Şubesi Af Kanununa göre-DHY",
                "K.K.T.C Yarı Süreli Fahri Asistan Onay",
                "Naklen asistanlığı kazandığından.",
                "OLAĞANÜSTÜ AÇIKTAN BAKANLIK ADINA/İHTİSAS",
                "OLAĞANÜSTÜAÇIKTAN/ İHTİSAS",
                "Özürlü Sınavı ile ilk defa açıktan atananlar",
                "Sağlık Denetçi Yardımcısı (TİTCK)",
                "Şef, Şef yardımcısı atama",
                "TUK (EĞİTİM SORUMLUSU YOK EŞ)",
                "TUK (EŞ)",
                "TUK (OLUMSUZ SİCİL)",
                "TUS - YDUS (MAZERETSİZ)",
                "TUS AÇIKTAN BİYOKİMYA - VETERİNER",
                "TUS AÇIKTAN DHY",
                "TUS AÇIKTAN DHY HAZIRLIK",
                "TUS AÇIKTAN HAZIRLIK DHY'SİZ",
                "TUS AÇIKTAN- DHY'SİZ",
                "TUS BAK.ADI. İSTİFA SONRASI DHY'Lİ",
                "TUS BAK.ADI. İSTİFA SONRASI DHY'SİZ",
                "TUS BAK.ADINA MUVAFAKAT AÇIKTAN DHY'Lİ",
                "TUS BAK.ADINA MUVAFAKAT AÇIKTAN DHY'siz",
                "TUS BAK.ADINA SÖZLEŞMELİ İSTİFA DHY'Lİ",
                "TUS BAK.ADINA SÖZLEŞMELİ İSTİFA DHY'SİZ",
                "TUS BAK.ADINA İSTİFA SONRASI DHY'Lİ",
                "TUS BAKANLIK ADINA AÇIKTAN DHY'Lİ",
                "TUS BAKANLIK ADINA AÇIKTAN DHY'SİZ",
                "TUS İSTİFA MÜSTAFA SONRASI HAZIRLIK DHY",
                "TUS İSTİFA MÜSTAFİ SONRASI DHY",
                "TUS İSTİFA MÜSTAFİ SONRASI DHY'SİZ",
                "TUS Mahkeme Kararı  Muvafakat",
                "TUS Mahkeme Kararı  Sözleşmeli",
                "TUS Mahkeme Kararı DHY'li İstifa Sonrası",
                "TUS Muvafakat AÇIKTAN DHYSİZ",
                "TUS MUVAFAKAT AÇIKTAN DHY",
                "TUS SÖZLEŞMELİ İSTİFA BAKANLIK ADINA",
                "TUS SÖZLEŞMELİ İSTİFA MÜSTAFİ SONRASI DHY'Lİ",
                "TUS SÖZLEŞMELİ İSTİFA MÜSTAFİ SONRASI DHY'SİZ",
                "TUS TÜRK SOYLU AÇIKTAN",
                "TUS TÜRK SOYLU AÇIKTAN SBA ADINA",
                "TUS veya YDUS Mahkeme Kararı  Açıktan",
                "Ürün Denetmen Yardımcılığı-2013 (TİTCK)",
                "Ürün Denetmen Yardımcılığı-2015 (TİTCK)",
                "Yabancı Uyruklu Fahri Asistan Onay",
                "YAN DAL / UZM. EĞT. PORG. / BAKANLIK ADINA",
                "YAN DAL AÇIKTAN AÇIKTAN",
                "YAN DAL İSTİFA SONRASI BAKANLIK ADINA",
                "YAN DAL İSTİFA/MÜSTAFİ SONRASI DHY",
                "YAN DAL MUVAFAKAT (92)",
                "YAN DAL MUVAFAKAT BAKANLIK ADINA (92,5)",
                "YAN DAL SÖZLEŞMELİ BAKANLIK ADINA",
                "YANDAL İSTİFA SONRASI",
                "YANDAL SOZLESMELI",
                "YDUS MAHKEME KARARI AÇIKTAN  DHY Lİ",
                "YDUS MAHKEME KARARI BAKANLIK ADINA AÇIKTAN",
                "YDUS MAHKEME KARARI BAKANLIK ADINA AÇIKTAN DHYLİ"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 4: Hareket Tipi: 7433 ile Memuriyete Geçiş
        if (selectedValue === "7433 ile Memuriyete Geçiş") {
            const optionsToAdd = [
                "7433 S.Kanun-4924 Sözl. 657’e Geçiş",
                "7433 S.Kanun-657-4/B Sözl. 657-4/A'ya Geçiş",
                "7433 S.Kanun-657-4/B Sözl. 657-4/A’ya Geçiş",
                "7433 S.Kanun-657-4/B Sözl. 657-4/A’ya Geçiş  DSS",
                "7433 S.Kanun-663 - 45A Sözl. 657-4/A ya Geçiş",
                "7433 S.Kanun-DMK 86’ıncı maddeden 657-4/A ya Geçiş",
                "7433 S.Kanun-Kamu Dışı AÇS’den 657-4/A ya Geçiş",
                "Mahkeme Kararı Uygulama"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 5: Hareket Tipi: Açıktan Atamanın Düzeltmesi
        if (selectedValue === "Açıktan Atamanın Düzeltmesi") {
            const optionsToAdd = [
                "(2577/28)657 S.K.36/9 ve 76.md. ile B.A.N.Y.13-B",
                "(2577/28)657 S.K.36/A-9,72.,76.md.ve B.A.N.Y.7.",
                "(2577/28)657 S.K.36/A-9,72.ve74.md.A.N.Y.15.md",
                "(2577/28)657 S.K.71.,76.md.ve 68.,161.md.",
                "(2577/28)657 S.K.71.,76.md.ve 68-B",
                "(2577/28)657 S.K.72 ve 76.md.ile B.A.N.Y.9.",
                "(2577/28)657 S.K.72.ve 76. maddeleri",
                "(2577/28)657 S.K.72.ve 76.md.ile B.A.N.Y.14.",
                "(2577/28)657 S.K.86.md.",
                "(2577/28)657 S.K.88.,175.md.",
                "(2577/28)657 S.K.değişik 45,71,ve 76.maddeleri",
                "(2577/28)657/76",
                "(2577/28)açıktan yüksek okul (dms-5)kpss önlisans",
                "(2577/28)DİLEKÇE 657 S.K.72.,76.md.;B.A.N.Y.(10/e)",
                "(2577/28)DİLEKÇE 657 S.K.72.ve 76.maddeleri",
                "(2577/28)DİLEKÇE 657 S.K.72.ve76.ve B.A.N.Y.7.",
                "(2577/28)EŞ 657 S.K.45,71,76.md.ve B.A.N.Y.15/a",
                "(2577/28)İht.Son.657 S.K.36/9,72,76.md.,A.N.Y.7.",
                "(2577/28)İht.Sonrası 657 S.K.36/9,72.,76.md.",
                "(2577/28)Naklen ve Terfien(68/B ve 76)",
                "(2577/28)Naklen, 657 S.K.68,76, ve 161.maddeleri",
                "(2577/28)naklen tayin (9/c)",
                "(2577/28)naklen tayin (9/d)",
                "(2577/28)naklen tayin (9/f)",
                "(2577/28)seçim için istifası sonrası atanması",
                "(2577/28)Yeni Mezun-Becayiş (9/e)",
                "(2577/28)Yeni Mezun-Eş Durumu(11/b)",
                "(2577/28)Yeni Mezun-Naklen Tayin (11/d)",
                "(2577/28)Yeni Mezun-Öğrenim Durumu",
                "(2577/28)yeni mezun-eş durumu (11/c)",
                "(2577/52)657/76",
                "2577/28",
                "2577/52",
                "7433 Sayılı Kanun Görev Yeri Düzeltme",
                "Açıktan Atama Dayanak Düzeltmesi (Kamudan Kamuya)",
                "Açıktan Atama Dayanak Düzeltmesi (Kamudışı Kamuya)",
                "AÇIKTAN GÖREVYERİ DÜZELTME DİŞHEKİMİ",
                "Görev yeri düzeltmesi",
                "il onayi düzeltme",
                "Karar iptali sicil özeti iade onayı",
                "Kişi bilgilerinin düzeltilmesi",
                "Kura dayanak ve açıklama düzeltmesi",
                "Kura görev yeri düzeltme",
                "Maas Aday Açıktan düzeltme (Prt Kura)",
                "Maas düzeltme",
                "Maas düzeltme (Pratisyen)",
                "Mahkeme / Görevlendirme İptali",
                "naklen kısmının açıktan şeklinde düzeltme onayı",
                "Namzet kısmının Asil olarak düzeltilmesi",
                "Öğrenim bilgilerinin düzeltilmesi",
                "Sağlık Ocağı Kapatılması (Pratisyen)",
                "Teşkilat Düzeltme",
                "Ünvan ve branş düzeltmesi"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 6: Hareket Tipi: Açıktan Atamanın İptali İle Karar Çıkarma
        if (selectedValue === "Açıktan Atamanın İptali İle Karar Çıkarma") {
            const optionsToAdd = [
                "Açıktan Atamanın İptali İle Karar Çıkarma",
                "UZMANLIK VERME(AÇIKTAN) 36/9,92,4576 K.H.K",
                "(2577/28)açıktan yüksek okul (dms-5)kpss önlisans",
                "(2577/28)Yeni Mezun-Eş Durumu(11/b)",
                "(2577/28)Yeni Mezun-Becayiş (9/e)",
                "(2577/28)657 S.K.36/A-9,72.ve74.md.A.N.Y.15.md",
                "ÖĞRENİM 657 S.K.36/3,(A) 6/b,45,B.A.N.Y.16.madde",
                "(2577/28)İht.Sonrası 657 S.K.36/9,72.,76.md.",
                "(2577/28)DİLEKÇE 657 S.K.72.ve 76.maddeleri",
                "(2577/28)DİLEKÇE 657 S.K.72.,76.md.;B.A.N.Y.(10/e)",
                "(2577/28)657 S.K.36/A-9,72.,76.md.ve B.A.N.Y.7.",
                "(2577/28)657 S.K.72.ve 76.md.ile B.A.N.Y.14.",
                "(2577/28)yeni mezun-eş durumu (11/c)",
                "(2577/28)naklen tayin (9/f)",
                "(2577/28)657/76",
                "(2577/28)naklen tayin (9/c)",
                "(2577/28)naklen tayin (9/d)",
                "2577/28",
                "(2577/28)Yeni Mezun-Naklen Tayin (11/d)",
                "(2577/28)seçim için istifası sonrası atanması",
                "(2577/28)İht.Son.657 S.K.36/9,72,76.md.,A.N.Y.7.",
                "(2577/28)Yeni Mezun-Öğrenim Durumu",
                "(2577/28)DİLEKÇE 657 S.K.72.ve76.ve B.A.N.Y.7.",
                "(2577/28)Naklen, 657 S.K.68,76, ve 161.maddeleri",
                "(2577/28)Naklen ve Terfien(68/B ve 76)",
                "(2577/28)657 S.K.değişik 45,71,ve 76.maddeleri",
                "(2577/28)EŞ 657 S.K.45,71,76.md.ve B.A.N.Y.15/a",
                "(2577/28)657 S.K.36/9 ve 76.md. ile B.A.N.Y.13-B",
                "(2577/28)657 S.K.72 ve 76.md.ile B.A.N.Y.9.",
                "(2577/28)657 S.K.72.ve 76. maddeleri",
                "(2577/28)657 S.K.88.,175.md.",
                "(2577/28)657 S.K.86.md.",
                "görev yeri düzeltme",
                "İptali İle Karar"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 7: Hareket Tipi: A Grubu Kadrolarına Atama / Atanma
        if (selectedValue === "A Grubu Kadrolarına Atama" || selectedValue === "A Grubu Kadrolarına Atanma") {
            const optionsToAdd = [
                "657 Sayılı Kanunun değişik 92 .Maddesine göre.",
                "A grubu kadroya açıktan atama",
                "AÇIKTAN, 657 Sk., 45 ve 36/1",
                "MERKEZ ATAMA (AB UZMAN YARDIMCISI)"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8: Hareket Tipi: Aile Hekimliğinden 4B Statüsüne Dönüş / 4/B Statüsüne Dönüş
        if (selectedValue === "Aile Hekimliğinden 4B Statüsüne Dönüş" || selectedValue === "Aile Hekimliğinden 4/B Statüsüne Dönüş") {
            const optionsToAdd = [
                "Aile Hekimliğinden 4/B Statüsüne Dönüş"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.5: Hareket Tipi: Bakanlık Güv.Sor.Değ.Kurul Kararı Sonucu
        if (selectedValue === "Bakanlık Güv.Sor.Değ.Kurul Kararı Sonucu" || selectedValue === "Bakanlık Güv. Sor.Değ.Kurul Kararı Sonucu") {
            const optionsToAdd = [
                "Açıktan Atama (Bakanlık Güv.Sor.Kurul)"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.6: Hareket Tipi: DHY (GIYAP) / DHY (Gıyap)
        if (selectedValue === "DHY (GIYAP)" || selectedValue === "DHY (Gıyap)") {
            const optionsToAdd = [
                "Devlet Hizmet Yükümlülüğü  Dilekçe",
                "DHY AÇIKTAN PRATİSYEN"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.7: Hareket Tipi: DHY Mazeret
        if (selectedValue === "DHY Mazeret") {
            const optionsToAdd = [
                "Yandal Sağlık Mazereti (Açıktan)",
                "Yandal Eş Mazereti (Açıktan)",
                "Aynı Kurada Yerleşen Eş Ataması (DHY)"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.8: Hareket Tipi: DHY Mazeret Harici
        if (selectedValue === "DHY Mazeret Harici") {
            const optionsToAdd = [
                "Kurum içi Nakil İl içi Yer Değişikliği",
                "2577/28 Mahkeme Kararı",
                "Devlet Hizmet Yükümlülüğü  Dilekçe",
                "DHY AÇIKTAN PRATİSYEN",
                "Yandal Genel Kura (Açıktan)"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.9: Hareket Tipi: Disiplin Affı Nedeniyle Atama (ihraçtan dönme)
        if (selectedValue === "Disiplin Affı Nedeniyle Atama(ihraçtan dönme)" || 
            selectedValue === "DHY Mazeret Harici Disiplin Affı Nedeniyle Atama (İhraçtan Dönme)") {
            const optionsToAdd = [
                "6495 Sayılı kanun gereği yeniden atama",
                "ATANMA (6191 S.K. GEREĞİ)"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.10: Hareket Tipi: Diyanet Vakfından Devir
        if (selectedValue === "Diyanet Vakfından Devir") {
            const optionsToAdd = [
                "İstek sonucu ilk defa",
                "İstifa Sonrası"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.11: Hareket Tipi: DMS/KPSS/ÖMSS
        if (selectedValue === "DMS/KPSS/ÖMSS") {
            const optionsToAdd = [
                "2011/1 KPSS AÇIKTAN ATAMA",
                "2012/1 KPSS AÇIKTAN (TKHK MERKEZ)",
                "2012/1 KPSS AÇIKTAN ATAMA",
                "2012/2 KPSS AÇIKTAN (YÖNETİM)",
                "2012/2 KPSS AÇIKTAN ATAMA",
                "2013/1 KPSS AÇIKTAN ATAMA (TKHK)",
                "2013/2 KPSS AÇIKTAN ATAMA (TKHK)",
                "2014 EKPSS (TKHK)",
                "2014/1 KPSS AÇIKTAN G.İ.H. (TKHK)",
                "2014/2-EKPSS (TİTCK)",
                "2014/3 KPSS AÇIKTAN (TKHK)",
                "2014/3 KPSS AÇIKTAN ATAMA (TKHK)",
                "2015/1 KPSS AÇIKTAN (TKHK)",
                "2015/1 KPSS AÇIKTAN ATAMA (TİTCK)",
                "2015/1-EKPSS (TİTCK)",
                "2015/1-EKPSS(TKHK)",
                "2015/2-EKPSS (TKHK)",
                "2016/1 EKPSS(TKHK)",
                "2016/1 EKPSS(TKHK1)",
                "2016/1 KPSS AÇIKTAN (TKHK)",
                "2016/1-EKPSS (TKHK)",
                "2016/6 KPSS AÇIKTAN ATAMA (YÖNETİM)",
                "2017- EKPSS/ Kura",
                "2018- EKPSS/Kura",
                "2577/28",
                "2577/52",
                "(2577/28) 657 S.K. 36/A-9, 72. ve 74.md. A.N.Y. 15.md",
                "(2577/28) 657 S.K. 36/A-9, 72., 76.md. ve B.A.N.Y. 7.",
                "(2577/28) 657 S.K. 36/9 ve 76.md. ile B.A.N.Y. 13-B",
                "(2577/28) 657 S.K. 71., 76.md. ve 68., 161.md.",
                "(2577/28) 657 S.K. 71., 76.md. ve 68-B",
                "(2577/28) 657 S.K. 72 ve 76.md.ile B.A.N.Y. 9.",
                "(2577/28) 657 S.K. 72. ve 76. maddeleri",
                "(2577/28) 657 S.K. 72.ve 76.md.ile B.A.N.Y. 14.",
                "(2577/28) 657 S.K. 86.md.",
                "(2577/28) 657 S.K. 88., 175.md.",
                "(2577/28) 657 S.K. değişik 45, 71, ve 76. maddeleri",
                "(2577/28) 657/76",
                "(2577/28) DİLEKÇE 657 S.K. 72. ve 76. maddeleri",
                "(2577/28) DİLEKÇE 657 S.K. 72. ve 76. ve B.A.N.Y. 7.",
                "(2577/28) DİLEKÇE 657 S.K. 72., 76.md.; B.A.N.Y.(10/e)",
                "(2577/28) EŞ 657 S.K. 45, 71, 76.md. ve B.A.N.Y. 15/a",
                "(2577/28) İht. Sonrası 657 S.K. 36/9, 72., 76.md.",
                "(2577/28) İht. Son. 657 S.K. 36/9, 72, 76.md., A.N.Y. 7.",
                "(2577/28) Naklen ve Terfien (68/B ve 76)",
                "(2577/28) Naklen, 657 S.K. 68, 76, ve 161. maddeleri",
                "(2577/28) Yeni Mezun-Becayiş (9/e)",
                "(2577/28) Yeni Mezun-Eş Durumu(11/b)",
                "(2577/28) Yeni Mezun-Naklen Tayin (11/d)",
                "(2577/28) Yeni Mezun-Öğrenim Durumu",
                "(2577/28) açıktan yüksek okul (dms-5) kpss önlisans",
                "(2577/28) naklen tayin (9/c, 9/d, 9/f)",
                "(2577/28) seçim için istifası sonrası atanması",
                "(2577/28) yeni mezun-eş durumu (11/c)",
                "(2577/52) 657/76",
                "AÇIKTAN",
                "Açıktan Atama (YSP) 2514 ve 4576 sk.a göre",
                "DİŞ TABİBİ 2005/2 KPSS YERLEŞTİRME",
                "DMS 2004 ekim / ARALIK",
                "DMS Açıktan",
                "DMS YÜKSEK OKUL AÇIKTAN",
                "EKPSS (THSK / TİTCK)",
                "EKPSS (TKHK MERKEZ / YSP)",
                "KPDS 2005",
                "KPSS 2009/3 (YÖP)",
                "KPSS 2009/6 (YSP)",
                "KPSS 2010/1 (YÖP)",
                "KPSS 2013/1 (YÖP)",
                "KPSS 2013/2 (TKHK / Yönetim)",
                "KPSS 2014/1 (Yönetim)",
                "KPSS 2014/1 açıktan atama (TKHK)",
                "KPSS 2014/2 açıktan atama (TKHK)",
                "KPSS 2014/3 (Yönetim)",
                "KPSS 2015/1 açıktan atama (TKHK)",
                "KPSS 2016/1 AÇIKTAN ATAMA (TKHK / TİTCK)",
                "KPSS 2016/2 açıktan atama (TKHK / Yönetim)",
                "KPSS 2016/6 açıktan atama (TKHK)",
                "KPSS 2016/6 AÇIKTAN ATAMA (TİTCK)",
                "KPSS AÇIKTAN ATAMA (TİTCK)",
                "KPSS LİSANS / ÖNLİSANS / SML AÇIKTAN",
                "KPSS-YÖNETİM",
                "ÖMSS 2013 Ataması (TKHK)",
                "ÖMSS SONUCU AÇIKTAN ATAMA (TKHK)",
                "SHÇEK 2013/2 (TKHK)",
                "SHÇEK 2015 / 2017 (TİTCK)",
                "YSP 2005/2 KPSS YERLEŞTİRME"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.12: Hareket Tipi: DUS
        if (selectedValue === "DUS") {
            const optionsToAdd = [
                "DUS Bakanlık adına",
                "Başasistan Açıktan",
                "Başasistan Muvafakat (Sınav)"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.13: Hareket Tipi: EKPSS
        if (selectedValue === "EKPSS") {
            const optionsToAdd = [
                "2577/28",
                "EKPSS 5510 %40 İla 49 Engelli",
                "EKPSS 5510 %50 İla 59 Engelli",
                "EKPSS 5510 %60 Ve Üzeri Engelli"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.14: Hareket Tipi: Emeklilik Sonrası
        if (selectedValue === "Emeklilik Sonrası") {
            const optionsToAdd = [
                "(2577/28) 657 S.K. 71., 76.md. ve 68., 161.md.",
                "(2577/28) DİLEKÇE 657 S.K. 72. ve 76. maddeleri",
                "(2577/28) DİLEKÇE 657 S.K. 72. ve 76. ve B.A.N.Y. 7.",
                "(2577/28) DİLEKÇE 657 S.K. 72., 76.md.; B.A.N.Y.(10/e)",
                "(2577/28) İht. Sonrası 657 S.K. 36/9, 72., 76.md.",
                "(2577/28) naklen tayin (9/c)",
                "2577/28",
                "65-72 YAŞ EMEKLİLİK SONRASI",
                "657 S.K. 72. ve 93. maddelerine göre.",
                "EMEKLİLİK ONAYI MAHKEME KARARI İLE İPTAL EDİLMESİ ÜZERİNE GÖREVE İADE",
                "Emeklilik Sonu",
                "EŞ 657 S.K. 72. madde ve B.A.N.Y. 15. maddesi",
                "Tam Gün Yasası Emeklilik Sonrası"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.15: Hareket Tipi: İhraç Sonrası Bakan Onayı İle Göreve İade
        if (selectedValue === "İhraç Sonrası Bakan Onayı İle Göreve İade" || selectedValue === "İhraç Sonrası Bakan Onayı ile Göreve İade") {
            const optionsToAdd = [
                "Açıktan Atama (Bakanlık Güv.Sor.Kurul)"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.16: Hareket Tipi: İlk Defa Açıktan Atama Kurası
        if (selectedValue === "İlk Defa Açıktan Atama Kurası") {
            const optionsToAdd = [
                "prt.kura 657 S.K.36,45,54 ve 72. madde",
                "663 - 45A Sözleşmeden 657'e Geçiş",
                "İlk Defa Açıktan Atama Kurası"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.17: Hareket Tipi: İstek sonucu ilk defa / İstek Sonucu İlk Defa
        if (selectedValue === "İstek sonucu ilk defa" || selectedValue === "İstek Sonucu İlk Defa") {
            const optionsToAdd = [
                "(2577/28) 657 S.K. 36/9 ve 76.md. ile B.A.N.Y.13-B",
                "(2577/28) 657 S.K. 36/A-9, 72. ve 74.md. A.N.Y.15.md",
                "(2577/28) 657 S.K. 36/A-9, 72., 76.md. ve B.A.N.Y.7.",
                "(2577/28) 657 S.K. 71., 76.md. ve 68-B / 68., 161.md.",
                "(2577/28) 657 S.K. 72 ve 76.md. ile B.A.N.Y. 9. / 14.",
                "(2577/28) 657 S.K. 72. ve 76. maddeleri",
                "(2577/28) 657 S.K. 88., 175.md.",
                "(2577/28) 657 S.K. değişik 45, 71, ve 76. maddeleri",
                "(2577/28) 657/76",
                "(2577/28) DİLEKÇE 657 S.K. 72. ve 76. maddeleri / B.A.N.Y. 7. / B.A.N.Y. 10/e",
                "(2577/28) EŞ 657 S.K. 45, 71, 76.md. ve B.A.N.Y. 15/a",
                "(2577/28) İht. Sonrası 657 S.K. 36/9, 72, 76.md. (A.N.Y. 7 dahil)",
                "(2577/28) Naklen ve Terfien (68/B ve 76)",
                "(2577/28) Naklen, 657 S.K. 68, 76, ve 161. maddeleri",
                "(2577/28) Yeni Mezun (Becayiş, Eş Durumu, Naklen Tayin, Öğrenim Durumu)",
                "(2577/28) açıktan yüksek okul (dms-5) kpss önlisans",
                "(2577/28) naklen tayin (9/c, 9/d, 9/f)",
                "(2577/28) seçim için istifası sonrası atanması",
                "(2577/28) yeni mezun-eş durumu (11/c)",
                "(2577/52) 657/76",
                "2006/1. DÖNEM AÇIKTAN ATAMA DİŞ TABİBİ VE ECZACI",
                "241 S.K. EK GEÇİCİ 1,2,3. MD. İSTİNADEN",
                "2577/28 ve 2577/52",
                "3713 S.K. (Terörle Mücadele / Şehit ve Malül Ataması)",
                "399 K.H.K. ile 657 S.K. 36. C/1",
                "399 S.K. Sözleşmeli Başlayış / Ayrılış",
                "4359 S.K. Geçici 7.Mad.",
                "4678 S.K. Sözleşmeli Başlayış / Ayrılış",
                "4924 Sayılı Kanun 7. Madde",
                "506 sayılı Sosyal Sigortalar Kanununa göre",
                "5286 S.K. GEÇ. 1. MD. UYARINCA PERSONEL DEVRİ",
                "5442 S.K. ve 224 No'lu Sosyalizasyon Yasası",
                "5620 Sayılı Kanun (ve 4B Sözleşmeli Statüye Geçiş)",
                "632 ve 6495 Sayılı Kanun (Sözleşmeliden Kadroya Geçiş)",
                "657 S.K. 36/3 (A) 6/B, 2595 SK. 45.md.",
                "657 S.K. 36/9, 92, 4576 K.H.K ile değişik 4. madde",
                "657 S.K. 36/A-9, 72. ve 74. mad. A.N.Y. 15 madde",
                "657 S.K. 92. maddesine göre",
                "657 SK. 76. md. (özürlüler sınavıyla)",
                "657-4/C personelin ilk defa göreve başlatılması / yeniden sözleşme",
                "663 - 45A Sözleşmeden 657'ye Geçiş (Ask. Değ. dahil)",
                "663 K.H.K. Geçici 11. maddesi (vekil-4/b)",
                "667 Sayılı OHAL Kapsamında göreve iade",
                "696 sayılı KHK (Sürekli İşçi) (Eski Hükümlü / Engelli)",
                "7433 S. Kanun (657-4/B, 4924, 663-45A, Kamu Dışı AÇS, DMK 86'dan 657-4/A'ya Geçiş)",
                "AÇIKTAN (Atama, Yedek, Özelleştirme, Döner Sermaye, SHÇEK)",
                "AÇIKTAN Özel Branşlar (92, 4576, 4.Mad. 23.Mad.)",
                "AÇIKTAN, 657 Sk., 45 ve 36/1",
                "Açıktan İhtisas kazanan 36(A) 5. Paragrafına göre (Eş dahil)",
                "Açıktan istifa sonrası ESKİ görev yeri düzeltme",
                "Açıktan yüksek okul (dms 5. dönem)",
                "BAKAN YARDIMCISI ATANMA (CUMHURBAŞKANLIĞI KARARI)",
                "BECAYİŞ 657 S.K. 36, 45, 54, 72. B.A.N.Y. 17. maddesi",
                "D.H.Y. 2514 Sayılı Kanun / DİŞ TABİBİ 2514 - 4576",
                "DİYANET VAKFINDAN DEVİR",
                "Doçentlikten Şef Yrd. / Prof'luktan Şef",
                "EKPSS 2015 / 5510 / YÖNETİM",
                "Engelli Personel Ataması",
                "EŞ DURUMU 657 S.K. 72. ve 92, B.A.N.Y. 13/B",
                "EŞ 657 S.K. 36/3, (A) 6/b, 45., B.A.N.Y. 15/a / 15/c / 15. madde",
                "EŞTÜRK VATAN. GEÇEN 657 S.K. 36/A-5-9, 45, 54, 4576 KHK",
                "İLK DEFA / İSTİFA SONRASI / TUS / KURA / UZMANLIK",
                "İŞ-KUR Sürekli İşçi Alımı (Normal, Engelli, Eski Hükümlü, Tarihli Atamalar)",
                "KIZILAY DEVİR",
                "KPSS Açıktan Atama (2010/2, 2011/1, 2011/2, 2013/1, 2013/2, 2019/2, 2020/11)",
                "MERKEZ ATAMA (AB Uzman Yard. / Sağlık Uzman Yard.)",
                "MHUY 2013 Ataması (TKHK) / Mali Hizmetler Uzman Yardımcılığı",
                "Müsterek Kararname / Cumhurbaşkanlığı Atama Kararı",
                "OKULDERECE 657 S.K. 36, 45, 54, 72. B.A.N.Y. 22. ve 2.",
                "ÖMSS 2012 Ataması (TKHK)",
                "ÖZÜRLÜ AÇIKTAN 2011-1 / 2011-2 SINAVLA",
                "Prt. Kura 657 S.K. 36, 45, 54 ve 72. madde (Sağlık Rap. dahil)",
                "SHÇEK AÇIKTAN (2013-2023 yılları arası farklı dönemler)",
                "TDUEY-İhtisas / Başasistan eski tüzük",
                "TERÖRLE MÜCADELE 657 S.K. 36/8 / 3713 S.K. / THSK",
                "THSK Yönetici Birimi (SHÇEK)",
                "TÜRK VATAN. GEÇEN 657 S.K. 36/A-5-9, 45, 54, 4576 KHK 4",
                "Vekil (Ebe / Hemşire / Öğretmen) 657 S.K. 86.md.",
                "Yeni Mezun (Naklen, Sağlık Raporu, Eş Durumu, Becayiş, Öğrenim Durumu)",
                "YÜKSEK OKUL 657 S.K. 36/3, A/5, 2595 S.K. 45 (2 Yıllık dahil)"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.18: Hareket Tipi: İstifa Sonrası Kurası
        if (selectedValue === "İstifa Sonrası Kurası") {
            const optionsToAdd = [
                "2008/1. Dönem istifa sonrası",
                "Açıktan atama",
                "İstifa sonrası",
                "İstifa sonrası açıktan atama",
                "İstifa Sonrası Açıktan Atama (Ebe-Hemşire) 2023/2",
                "Yeniden ve İstifa Sonrası Açıktan Atama (YSP)"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.19: Hareket Tipi: İşkur
        if (selectedValue === "İşkur") {
            const optionsToAdd = [
                "İŞ-KUR 216 ENGELLİ SÜREKLİ İŞÇİ ALIMI",
                "İŞ-KUR 8.000 Sürekli İşçi Alımı",
                "İŞ-KUR 10.900 Sürekli İşçi Alımı (Asıl ve Yedek)",
                "İŞ-KUR 11.317 Sürekli İşçi Alımı (Asıl ve Yedek)",
                "İŞ-KUR 1356 Engelli Sürekli İşçi Alımı (Yedek)",
                "İŞ-KUR 1468 Eski Hükümlü/TMY Sürekli İşçi Alımı",
                "İŞ-KUR 6-7 Nisan 2022 Sürekli İşçi Alımı (Yedek-2)",
                "İŞ-KUR Açıktan Engelli Sürekli İşçi Alımı (Yedek)",
                "İŞ-KUR Açıktan Sürekli İşçi Eski Hükümlü/TMY Alımı (Asıl ve Yedek)",
                "İŞ-KUR Sürekli İşçi Yedek Alımı"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.20: Hareket Tipi: Kamu Görevinden Çıkarma
        if (selectedValue === "Kamu Görevinden Çıkarma") {
            const optionsToAdd = [
                "05/03/2019-40453 BAKAN ONAYI"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.21: Hareket Tipi: KPSS
        if (selectedValue === "KPSS") {
            const optionsToAdd = [
                "4924 sayılı Kanuna tabi Sözleşmeli Personel",
                "657 4/B Sözleşmeli Personel Alımları (Bakanlık ve Genel)",
                "657 4/B (663-45/A) Sözleşmeli Per. Alm. (2023-5)",
                "657 4/B (663-45/A) Sözleşmeli Per. Alm. (2024-5)",
                "657 4/B (663-45/A) Sözleşmeli Per. Alm. (2025/4)",
                "657 4/B (663-45/A) Sözleşmeli Per. Alm. (2025/4 - ASÇ)",
                "2012/1 KPSS AÇIKTAN ATAMA",
                "2016/1 KPSS AÇIKTAN (TKHK)",
                "2017/5 4/B Sözleşmeli Açıktan (TKHK)",
                "EKPSS",
                "KPSS AÇIKTAN ATAMA",
                "Mahkeme Kararı (Sözleşmeli Personel)"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.22: Hareket Tipi: Mahkeme Kararı
        if (selectedValue === "Mahkeme Kararı") {
            const optionsToAdd = [
                "2577/28 (Genel uygulama)",
                "2577/28. maddesi gereğince (EŞ DURUMU)",
                "2577/52",
                "(2577/28) 657/76",
                "(2577/28) 657 S.K. 36/9 ve 76.md. ile B.A.N.Y.13-B",
                "(2577/28) 657 S.K. 36/A-9, 72. ve 74.md. A.N.Y.15.md",
                "(2577/28) 657 S.K. 36/A-9, 72., 76.md. ve B.A.N.Y.7.",
                "(2577/28) 657 S.K. 71., 76.md. ve 68-B",
                "(2577/28) 657 S.K. 71., 76.md. ve 68., 161.md.",
                "(2577/28) 657 S.K. 72 ve 76.md. ile B.A.N.Y.9.",
                "(2577/28) 657 S.K. 72. ve 76. maddeleri",
                "(2577/28) 657 S.K. 72. ve 76.md. ile B.A.N.Y.14.",
                "(2577/28) 657 S.K. 86.md.",
                "(2577/28) 657 S.K. 88., 175.md.",
                "(2577/28) 657 S.K. değişik 45, 71, ve 76. maddeleri",
                "(2577/28) DİLEKÇE 657 S.K. 72. ve 76. maddeleri",
                "(2577/28) DİLEKÇE 657 S.K. 72., 76.md.; B.A.N.Y.(10/e)",
                "(2577/28) DİLEKÇE 657 S.K. 72. ve 76. ve B.A.N.Y.7.",
                "(2577/28) EŞ 657 S.K. 45, 71, 76.md. ve B.A.N.Y.15/a",
                "(2577/28) İht. Son. 657 S.K. 36/9, 72, 76.md., A.N.Y.7.",
                "(2577/28) İht. Sonrası 657 S.K. 36/9, 72., 76.md.",
                "(2577/28) Naklen ve Terfien (68/B ve 76)",
                "(2577/28) Naklen, 657 S.K. 68, 76, ve 161. maddeleri",
                "(2577/28) Sözleşmeliden 657'ye",
                "(2577/28) açıktan yüksek okul (dms-5) kpss önlisans",
                "(2577/28) naklen tayin (9/c, 9/d, 9/f)",
                "(2577/28) seçim için istifası sonrası atanması",
                "(2577/28) Yeni Mezun (Becayiş, Eş Durumu, Naklen Tayin, Öğrenim Durumu)",
                "(2577/52) 657/76",
                "663-45/A Sözleşmeliden 657'e Geçiş / 2577/28",
                "Açıktan Atama",
                "Mahkeme ile yeniden Açıktan Eş Drm. atama (THSK)",
                "Mahkeme kararıyla (Genel)",
                "Mahkeme Kararı (Sözleşmeli Personel / Eş Durumu)",
                "Mahkeme Kararı Öğrenim Durumu / Sağlık Durumu",
                "Sözleşmeli Personel (Açıktan Başka Kurum)",
                "TUS veya YDUS Mahkeme Kararı Açıktan",
                "Yüksek Dsp. Kurul. İptal. Grv. İade",
                "Zorunlu Emeklilik Sonrası Mahkeme Kararı"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.23: Hareket Tipi: Memuriyetinin Askıya Alınma Sonucu Göreve İade
        if (selectedValue === "Memuriyetinin Askıya Alınma Sonucu Göreve İade") {
            const optionsToAdd = [
                "Göreve iade"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.24: Hareket Tipi: Merkez Atama
        if (selectedValue === "Merkez Atama") {
            const optionsToAdd = [
                "TUS veya YDUS Mahkeme Kararı  Açıktan",
                "TUS BAK.ADINA MUVAFAKAT AÇIKTAN DHY'Lİ",
                "Başka Kurumdan Nakil",
                "Mahkeme Kararı (Sözleşmeli Personel)"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.25: Hareket Tipi: Ohal Komisyonu Sonucu
        if (selectedValue === "Ohal Komisyonu Sonucu") {
            const optionsToAdd = [
                "Açıktan Atama (Ohal Komisyonu)"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.26: Hareket Tipi: OHAL Komisyonu Sonucu Açıktan Atama
        if (selectedValue === "OHAL Komisyonu Sonucu Açıktan Atama" || selectedValue === "Ohal Komisyonu Sonucu Açıktan Atama") {
            const optionsToAdd = [
                "Açıktan Atama (Ohal Komisyonu)"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.27: Hareket Tipi: Seçim Sonrası
        if (selectedValue === "Seçim Sonrası") {
            const optionsToAdd = [
                "SEÇİM İÇİN İSTİFA SONRASI (Genel)",
                "25. DÖNEM MİLLETVEKİLLİĞİ SEÇİMİ İÇİN İSTİFA SONRASI",
                "26. DÖNEM MİLLETVEKİLLİĞİ SEÇİMİ İÇİN İSTİFA SONRASI",
                "CUMHURBAŞKANI VE 27. DÖNEM MİLLETVEKİLLİĞİ SEÇİMİ İÇİN İSTİFA SONRASI"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.28: Hareket Tipi: SHÇEK
        if (selectedValue === "SHÇEK") {
            const optionsToAdd = [
                "AÇIKTAN (SHÇEK) / SHÇEK AÇIKTAN (Genel)",
                "Açıktan Atama",
                "SHÇEK AÇIKTAN 2018",
                "SHÇEK AÇIKTAN 2019",
                "SHÇEK AÇIKTAN 2020/2",
                "SHÇEK AÇIKTAN 2020/3",
                "SHÇEK AÇIKTAN ATAMA (26/12/2022)",
                "SHÇEK AÇIKTAN ATAMA (03/05/2023)",
                "SHÇEK AÇIKTAN ATAMA (27/09/2023)",
                "SHÇEK AÇIKTAN ATAMA (25.12.2023)",
                "SHÇEK AÇIKTAN ATAMA (22.05.2024)",
                "SHÇEK AÇIKTAN ATAMA (30.09.2024)",
                "SHÇEK ATAMASI (24.12.2024)",
                "SHÇEK ATAMASI (13.06.2025)",
                "SHÇEK ATAMASI (02.10.2025)"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.29: Hareket Tipi: Sürekli İşçi
        if (selectedValue === "Sürekli İşçi") {
            const optionsToAdd = [
                "5510 Sayılı SGK",
                "İllerin Sürekli İşçi Engelliler Alımı (Makam Onaylı)",
                "İllerin Sürekli İşçi Eski Hükümlü/TMY Alımı (Makam Onaylı)",
                "İŞ-KUR 6-7 Nisan 2022 Sürekli İşçi Alımı (Yedek-1)",
                "İŞ-KUR 1468 Eski Hükümlü/TMY Sürekli İşçi Alımı",
                "İŞ-KUR Sürekli İşçi Alımı (Genel)",
                "İŞ-KUR Sürekli İşçi Yedek Alımı",
                "Sürekli işçi askerlik sonrası hizmete alım"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.30: Hareket Tipi: TUS
        if (selectedValue === "TUS") {
            const optionsToAdd = [
                
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.31: Hareket Tipi: YDUS
        if (selectedValue === "YDUS") {
            const optionsToAdd = [
                "YANDAL SOZLESMELI",
                "YANDAL İSTİFA SONRASI",
                "YAN DAL İSTİFA SONRASI BAKANLIK ADINA",
                "YAN DAL İSTİFA/MÜSTAFİ SONRASI DHY",
                "YAN DAL SÖZLEŞMELİ BAKANLIK ADINA",
                "YAN DAL MUVAFAKAT BAKANLIK ADINA (92,5)",
                "YAN DAL MUVAFAKAT (92)",
                "YDUS MAHKEME KARARI AÇIKTAN DHY Lİ",
                "YAN DAL AÇIKTAN AÇIKTAN",
                "YDUS MAHKEME KARARI BAKANLIK ADINA AÇIKTAN DHYLİ",
                "YDUS MAHKEME KARARI BAKANLIK ADINA AÇIKTAN",
                "YAN DAL / UZM. EĞT. PORG. / BAKANLIK ADINA",
                "TUS - YDUS (MAZERETSİZ)",
                "ydus-araştırılacak"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 8.32: Hareket Tipi: Yeniden Hizmete Alınma
        if (selectedValue === "Yeniden Hizmete Alınma") {
            const optionsToAdd = [
                "Askerlik Sonrası Yeniden Hizmete Alınması",
                "Eğitim Görevlisi (Sınav)",
                "TUS Muvafakat AÇIKTAN DHYSİZ",
                "TUS BAK.ADINA MUVAFAKAT AÇIKTAN DHY'siz",
                "Sözleşmeli Personel Çalıştırımasına İlişkin Esasların Ek1 inci Maddesine Göre",
                "Zorunlu Emeklilik Sonrası Mahkeme Kararı",
                "CB ve TBMM Görev Sonrası Yeniden Hizmete Alım",
                "Eş Yurdışı Görev Sona eren Yeniden Hizmete Alım",
                "Arabulucuk Kararı İle Atama",
                "ASÇ den 45/A Sözleşmeli Statüsüne Geri Dönüş"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 9: Hareket Tipi: Cumhurbaşkanlığı Atamaları
        if (selectedValue === "Cumhurbaşkanlığı Atamaları") {
            const optionsToAdd = [
                "Cumhurbaşkanlığı Atama Kararı"
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }

        // Rule 10: Hareket Tipi: Devlet Hizmet Yükümlülüğü
        if (selectedValue === "Devlet Hizmet Yükümlülüğü") {
            const optionsToAdd = [
                
            ];

            optionsToAdd.forEach(opt => addOptionIfNotExists(dayanakSelect, opt));
        }
    });

    console.log('✅ Custom Rules initialized');
}

function addOptionIfNotExists(selectElement, optionValue) {
    let optionExists = false;
    for (let i = 0; i < selectElement.options.length; i++) {
        if (selectElement.options[i].value === optionValue) {
            optionExists = true;
            break;
        }
    }

    if (!optionExists) {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        selectElement.appendChild(option);
    }
}

function addAndSelectOption(selectElement, optionValue) {
    addOptionIfNotExists(selectElement, optionValue);
    selectElement.value = optionValue;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomRules);
} else {
    initCustomRules();
}
