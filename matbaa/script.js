document.addEventListener('DOMContentLoaded', () => {

    // --- Elements ---
    const inputs = {
        title: document.getElementById('coverTitleInput'),
        subtitle: document.getElementById('coverSubtitleInput'),
        year: document.getElementById('coverYearInput'),
        themeColor: document.getElementById('themeColorInput'),
        logo: document.getElementById('logoUpload'),
        headerText: document.getElementById('headerTextInput'),
        footerText: document.getElementById('footerTextInput'),
        pageNumbers: document.getElementById('pageNumbersCheck'),
        margin: document.getElementById('marginSlider'),
        prefaceToggle: document.getElementById('showPreface'),
        tocToggle: document.getElementById('showToc'),
        fileInput: document.getElementById('fileInput'),
        printBtn: document.getElementById('printBtn'),
        // Typography
        fontFamily: document.getElementById('fontFamilySelect'),
        headerSize: document.getElementById('headerSizeSlider')
    };

    const preview = {
        title: document.getElementById('previewTitle'),
        subtitle: document.getElementById('previewSubtitle'),
        year: document.getElementById('previewYear'),
        logo: document.getElementById('previewLogo'),
        pages: document.querySelectorAll('.a4-page'),
        contentPages: document.querySelectorAll('.content-page'),
        prefacePage: document.getElementById('prefacePage'),
        tocPage: document.getElementById('tocPage'),
        mainBody: document.getElementById('mainBody')
    };

    // --- State & Config ---
    const config = {
        color: '#2c3e50'
    };

    // --- Event Listeners ---

    // 1. Cover Settings
    inputs.title.addEventListener('input', (e) => {
        preview.title.textContent = e.target.value;
    });

    inputs.subtitle.addEventListener('input', (e) => {
        preview.subtitle.textContent = e.target.value;
    });

    inputs.year.addEventListener('input', (e) => {
        preview.year.textContent = e.target.value;
    });

    inputs.themeColor.addEventListener('input', (e) => {
        config.color = e.target.value;
        document.documentElement.style.setProperty('--theme-color', config.color);
    });

    inputs.logo.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                // Replace icon with image
                preview.logo.innerHTML = `<img src="${event.target.result}" alt="Logo">`;
            };
            reader.readAsDataURL(file);
        }
    });

    // 1.5 Typography Settings
    inputs.fontFamily.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--main-font', e.target.value);
    });

    inputs.headerSize.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--header-scale', e.target.value);
    });

    // 2. Layout Settings
    inputs.headerText.addEventListener('input', (e) => {
        document.querySelectorAll('.page-header').forEach(el => {
            el.textContent = e.target.value || 'Üst Bilgi'; // Default if empty?
        });
    });

    inputs.footerText.addEventListener('input', (e) => {
        document.querySelectorAll('.footer-text').forEach(el => {
            el.textContent = e.target.value;
        });
    });

    inputs.pageNumbers.addEventListener('change', (e) => {
        const display = e.target.checked ? 'block' : 'none';
        document.querySelectorAll('.page-num').forEach(el => {
            el.style.display = display;
        });
    });

    inputs.margin.addEventListener('input', (e) => {
        const val = e.target.value + 'mm';
        document.documentElement.style.setProperty('--page-margin', val);
    });

    // 3. Section Toggles
    inputs.prefaceToggle.addEventListener('change', (e) => {
        preview.prefacePage.style.display = e.target.checked ? 'flex' : 'none';
        // Note: For print, if display is none, it won't print, which is correct.
    });

    inputs.tocToggle.addEventListener('change', (e) => {
        preview.tocPage.style.display = e.target.checked ? 'flex' : 'none';
    });

    // --- Pagination Logic ---
    function createNewPage(pageNum) {
        const pageId = `generatedPage_${pageNum}`;
        const pageHTML = `
            <div class="a4-page content-page generated-page" id="${pageId}">
                <header class="page-header">${inputs.headerText.value || 'Üst Bilgi'}</header>
                <div class="page-body editable-content" contenteditable="true"></div>
                <footer class="page-footer">
                    <span class="footer-text">${inputs.footerText.value || 'Alt Bilgi'}</span>
                    <span class="page-num" style="display: ${inputs.pageNumbers.checked ? 'block' : 'none'}">${pageNum}</span>
                </footer>
            </div>
        `;
        return pageHTML;
    }

    async function paginateContent(rawHTML) {
        // 1. Clear existing generated content pages
        const existingPages = document.querySelectorAll('.generated-page');
        existingPages.forEach(p => p.remove());

        // Also clear the default main content page if we are loading new content
        const defaultPage = document.getElementById('mainContentPage');
        if (defaultPage) defaultPage.remove();

        // 2. Parse HTML string
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHTML, 'text/html');
        // Use childNodes to capture text nodes, comments, etc., not just Elements
        const nodes = Array.from(doc.body.childNodes);

        // 3. Start with Page 1
        let currentPageNum = 1;
        let currentPageId = `generatedPage_${currentPageNum}`;

        // Insert first page after TOC
        document.getElementById('tocPage').insertAdjacentHTML('afterend', createNewPage(currentPageNum));

        let currentPageEl = document.getElementById(currentPageId);
        let currentBody = currentPageEl.querySelector('.page-body');

        // 4. Iterate and append
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            // Clone the node
            const clone = node.cloneNode(true);

            // Append to current page
            currentBody.appendChild(clone);

            // Check overflow
            // We use a small buffer (1px) to avoid precision issues
            if (currentBody.scrollHeight > currentBody.clientHeight + 1) {

                // If this is the *only* child and it overflows, we can't do much (it fits nowhere)
                // Unless we implement word-breaking. 
                // Currently, we just accept it if it's the first item on a fresh page.
                if (currentBody.childNodes.length === 1) {
                    // It's too big for one page, let it overflow (or we could warn)
                    console.warn('Item is too large for a single page:', clone);
                    continue;
                }

                // If it's not the only child, move it to next page
                currentBody.removeChild(clone);

                // Create new page
                currentPageNum++;
                currentPageId = `generatedPage_${currentPageNum}`;
                currentPageEl.insertAdjacentHTML('afterend', createNewPage(currentPageNum));

                // Update references
                currentPageEl = document.getElementById(currentPageId);
                currentBody = currentPageEl.querySelector('.page-body');

                // Re-append to the new page
                currentBody.appendChild(clone);

                // Double check: if it still overflows on the new page (and it's now the first item),
                // it will hit the (currentBody.childNodes.length === 1) check in the next iteration 
                // (conceptually, though here we just appended it). 
                // To be strictly correct, we should re-check here, but for this simplified logic 
                // let's assume if it overflows a fresh page, it's just a huge element.
            }
        }

        updatePageNumbers();
    }

    function updatePageNumbers() {
        const pages = document.querySelectorAll('.generated-page .page-num');
        pages.forEach((el, index) => {
            el.textContent = index + 1;
        });
    }

    // 4. File Import Logic
    inputs.fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = file.name;
        const extension = fileName.split('.').pop().toLowerCase();

        try {
            let contentHTML = '';

            if (extension === 'txt') {
                const text = await file.text();
                // Wrap in paragraphs to help pagination
                contentHTML = text.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br>').join('');

            } else if (extension === 'docx') {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
                contentHTML = result.value;

            } else if (['xlsx', 'xls'].includes(extension)) {
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                contentHTML = XLSX.utils.sheet_to_html(worksheet);

            } else if (extension === 'pdf') {
                alert("PDF formatı desteklenmiyor. Lütfen Word veya TXT kullanın.");
                return;
            } else {
                alert('Desteklenmeyen dosya formatı: ' + extension);
                return;
            }

            if (contentHTML) {
                // Clean unwanted patterns like [ ] or [12] (citations)
                // User Request: "cümle sonlarında [91], [17] gibi formatlar... tüm textleri kaldır."
                // Regex matches: 
                // \s*  : optional whitespace before
                // \[   : literal [
                // \s*  : optional space inside
                // \d*  : optional numbers inside (matches [] and [123])
                // \s*  : optional space inside
                // \]   : literal ]
                contentHTML = contentHTML.replace(/\s*\[\s*\d*\s*\]/g, '');

                await paginateContent(`<h3>${fileName}</h3>` + contentHTML);
            }

        } catch (err) {
            console.error(err);
            alert("Dosya yüklenirken bir hata oluştu: " + err.message);
        }

        inputs.fileInput.value = '';
    });

    // 5. Print Action
    inputs.printBtn.addEventListener('click', () => {
        window.print();
    });

});
