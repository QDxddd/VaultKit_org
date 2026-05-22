(function() {
    const elements = {
        password: document.getElementById('password'),
        togglePassword: document.getElementById('togglePassword'),
        generatePassword: document.getElementById('generatePassword'),
        meterFill: document.getElementById('meterFill'),
        meterText: document.getElementById('meterText'),
        dropzone: document.getElementById('dropzone'),
        fileInput: document.getElementById('fileInput'),
        folderInput: document.getElementById('folderInput'),
        selectFiles: document.getElementById('selectFiles'),
        selectFolder: document.getElementById('selectFolder'),
        filelist: document.getElementById('filelist'),
        removeSelected: document.getElementById('removeSelected'),
        selectAll: document.getElementById('selectAll'),
        stats: document.getElementById('stats'),
        processBtn: document.getElementById('processBtn'),
        progress: document.getElementById('progress'),
        progressFill: document.getElementById('progressFill'),
        progressStatus: document.getElementById('progressStatus'),
        progressPercent: document.getElementById('progressPercent'),
        preserveStructure: document.getElementById('preserveStructure'),
        compressFirst: document.getElementById('compressFirst'),
        outputName: document.getElementById('outputName'),
        clearAllBtn: document.getElementById('clearAllBtn'),
        clearHistory: document.getElementById('clearHistory'),
        historyList: document.getElementById('historyList'),
        modeBtns: document.querySelectorAll('.mode-btn')
    };

    let currentMode = 'encrypt';
    let history = [];

    function saveHistory() {
        localStorage.setItem('vaultkit_history', JSON.stringify(history.slice(0, 20)));
    }

    function loadHistory() {
        const saved = localStorage.getItem('vaultkit_history');
        if (saved) {
            history = JSON.parse(saved);
        }
        renderHistory();
    }

    function addHistoryEntry(action, details, success = true) {
        const entry = {
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            action,
            details,
            success
        };
        history.unshift(entry);
        if (history.length > 20) history.pop();
        saveHistory();
        renderHistory();
    }

    function renderHistory() {
        if (!elements.historyList) return;
        
        if (history.length === 0) {
            elements.historyList.innerHTML = '<div class="history-empty">—</div>';
            return;
        }
        
        elements.historyList.innerHTML = history.map(h => `
            <div class="history-item">
                ${h.time} — ${h.action} ${h.success ? '✓' : '✗'}
                <span style="color:#4a4a4a">${h.details}</span>
            </div>
        `).join('');
    }

    function updateFileList() {
        const items = window.fileHandler.getItems();
        
        if (items.length === 0) {
            elements.filelist.innerHTML = '<div class="file-item" style="justify-content:center;color:#4a4a4a">Нет файлов</div>';
            elements.stats.textContent = '0 файлов';
            return;
        }
        
        elements.stats.textContent = `${items.length} файлов (${window.fileHandler.formatSize(window.fileHandler.getTotalSize())})`;
        
        elements.filelist.innerHTML = items.map((item, idx) => `
            <div class="file-item ${window.fileHandler.selectedIndices.has(idx) ? 'selected' : ''}" data-index="${idx}">
                <input type="checkbox" class="file-check" ${window.fileHandler.selectedIndices.has(idx) ? 'checked' : ''}>
                <span class="file-icon">${item.path.includes('/') ? '📁' : '📄'}</span>
                <span class="file-name" title="${item.path}">${item.path.length > 50 ? '...' + item.path.slice(-47) : item.path}</span>
                <span class="file-size">${window.fileHandler.formatSize(item.size)}</span>
            </div>
        `).join('');
        
        document.querySelectorAll('.file-item').forEach(el => {
            const idx = parseInt(el.dataset.index);
            const checkbox = el.querySelector('.file-check');
            
            el.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    window.fileHandler.toggleSelect(idx);
                    updateFileList();
                }
            });
            
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    if (checkbox.checked) {
                        window.fileHandler.selectedIndices.add(idx);
                    } else {
                        window.fileHandler.selectedIndices.delete(idx);
                    }
                    window.fileHandler.notifyChange();
                    updateFileList();
                });
            }
        });
        
        elements.removeSelected.disabled = window.fileHandler.selectedIndices.size === 0;
    }

    function updateStrength() {
        const pass = elements.password.value;
        const score = window.cryptoCore.assessStrength(pass);
        elements.meterFill.style.width = `${score}%`;
        
        if (score < 25) elements.meterText.textContent = 'Слабый';
        else if (score < 50) elements.meterText.textContent = 'Средний';
        else if (score < 75) elements.meterText.textContent = 'Хороший';
        else elements.meterText.textContent = 'Сильный';
        
        updateProcessButton();
    }

    function updateProcessButton() {
        const hasFiles = window.fileHandler.getFileCount() > 0;
        const hasPassword = elements.password.value.trim().length > 0;
        elements.processBtn.disabled = !(hasFiles && hasPassword);
    }

    async function process() {
        const passphrase = elements.password.value;
        if (!passphrase || window.fileHandler.getFileCount() === 0) return;
        
        elements.processBtn.disabled = true;
        elements.progress.hidden = false;
        elements.progressFill.style.width = '0%';
        
        const filesWithPaths = window.fileHandler.getFilesWithPaths();
        const outputName = elements.outputName.value.trim() || 'archive';
        const compress = elements.compressFirst.checked;
        
        try {
            if (currentMode === 'encrypt') {
                const result = await window.batchProcessor.processEncryption(
                    filesWithPaths,
                    passphrase,
                    { outputName, compress },
                    ({ status, percent }) => {
                        elements.progressStatus.textContent = status;
                        elements.progressFill.style.width = `${percent}%`;
                        elements.progressPercent.textContent = `${percent}%`;
                    }
                );
                
                saveAs(result.blob, result.filename);
                addHistoryEntry('Шифрование', `${window.fileHandler.getFileCount()} файлов → ${result.filename}`, true);
                
            } else {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.vault';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) {
                        elements.progress.hidden = true;
                        elements.processBtn.disabled = false;
                        return;
                    }
                    
                    const result = await window.batchProcessor.processDecryption(
                        file,
                        passphrase,
                        ({ status, percent }) => {
                            elements.progressStatus.textContent = status;
                            elements.progressFill.style.width = `${percent}%`;
                            elements.progressPercent.textContent = `${percent}%`;
                        }
                    );
                    
                    if (result.files.length === 1 && result.files[0].path === result.files[0].name) {
                        saveAs(result.zipBlob, file.name.replace(/\.vault$/, '.zip'));
                        addHistoryEntry('Дешифрование', `${file.name} → ZIP архив`, true);
                    } else {
                        const zipBlob = await window.archiveManager.createZipFromFiles(
                            result.files.map(f => ({ file: f, path: f.webkitRelativePath || f.name })),
                            false
                        );
                        saveAs(zipBlob, file.name.replace(/\.vault$/, '_extracted.zip'));
                        addHistoryEntry('Дешифрование', `${file.name} → ${result.files.length} файлов`, true);
                    }
                };
                input.click();
            }
            
            setTimeout(() => {
                elements.progress.hidden = true;
                elements.progressFill.style.width = '0%';
                if (currentMode === 'encrypt') {
                    window.fileHandler.clear();
                    updateFileList();
                }
            }, 1500);
            
        } catch (err) {
            console.error(err);
            elements.progressStatus.textContent = 'Ошибка: неверный пароль или повреждённый файл';
            addHistoryEntry(currentMode === 'encrypt' ? 'Шифрование' : 'Дешифрование', 'Ошибка', false);
            setTimeout(() => {
                elements.progress.hidden = true;
            }, 3000);
        } finally {
            elements.processBtn.disabled = false;
            updateProcessButton();
        }
    }

    function setupDragAndDrop() {
        elements.dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            elements.dropzone.classList.add('drag-over');
        });
        
        elements.dropzone.addEventListener('dragleave', () => {
            elements.dropzone.classList.remove('drag-over');
        });
        
        elements.dropzone.addEventListener('drop', async (e) => {
            e.preventDefault();
            elements.dropzone.classList.remove('drag-over');
            
            const items = e.dataTransfer.items;
            const files = [];
            
            const readDir = async (entry, basePath = '') => {
                const reader = entry.createReader();
                const entries = await new Promise((resolve) => {
                    reader.readEntries(resolve);
                });
                
                for (const ent of entries) {
                    const path = basePath ? `${basePath}/${ent.name}` : ent.name;
                    if (ent.isFile) {
                        const file = await new Promise((res) => ent.file(res));
                        Object.defineProperty(file, 'webkitRelativePath', { value: path });
                        files.push(file);
                    } else if (ent.isDirectory) {
                        await readDir(ent, path);
                    }
                }
            };
            
            for (let i = 0; i < items.length; i++) {
                const entry = items[i].webkitGetAsEntry();
                if (entry) {
                    if (entry.isDirectory) {
                        await readDir(entry);
                    } else {
                        const file = items[i].getAsFile();
                        if (file) files.push(file);
                    }
                }
            }
            
            if (files.length) {
                window.fileHandler.clear();
                for (const file of files) {
                    const path = file.webkitRelativePath || file.name;
                    window.fileHandler.structure.set(path, file);
                }
                window.fileHandler.refreshList();
                updateFileList();
            }
        });
    }

    elements.selectFiles.addEventListener('click', () => elements.fileInput.click());
    elements.selectFolder.addEventListener('click', () => elements.folderInput.click());
    
    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            window.fileHandler.addFromFileList(e.target.files);
            updateFileList();
        }
        e.target.value = '';
    });
    
    elements.folderInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            window.fileHandler.addFromDirectory(e.target.files);
            updateFileList();
        }
        e.target.value = '';
    });
    
    elements.selectAll.addEventListener('click', () => {
        window.fileHandler.selectAll();
        updateFileList();
    });
    
    elements.removeSelected.addEventListener('click', () => {
        window.fileHandler.removeSelected();
        updateFileList();
    });
    
    elements.clearAllBtn.addEventListener('click', () => {
        window.fileHandler.clear();
        updateFileList();
    });
    
    elements.clearHistory.addEventListener('click', () => {
        history = [];
        saveHistory();
        renderHistory();
    });
    
    elements.togglePassword.addEventListener('click', () => {
        const type = elements.password.type === 'password' ? 'text' : 'password';
        elements.password.type = type;
        elements.togglePassword.classList.toggle('hidden');
    });
    
    elements.generatePassword.addEventListener('click', () => {
        const newPass = window.cryptoCore.generatePassphrase(20);
        elements.password.value = newPass;
        updateStrength();
    });
    
    elements.processBtn.addEventListener('click', process);
    
    elements.modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            
            const processSpan = elements.processBtn.querySelector('span');
            if (processSpan) {
                processSpan.textContent = currentMode === 'encrypt' ? '▶ Начать шифрование' : '▶ Выбрать .vault файл';
            }
            
            updateProcessButton();
        });
    });
    
    window.fileHandler.onChange(() => {
        updateFileList();
        updateProcessButton();
    });
    
    elements.password.addEventListener('input', updateStrength);
    
    setupDragAndDrop();
    loadHistory();
    updateStrength();
    updateFileList();
})();