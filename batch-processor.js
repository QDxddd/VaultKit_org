class BatchProcessor {
    constructor() {
        this.aborted = false;
    }

    async processEncryption(filesWithPaths, passphrase, options, onProgress) {
        this.aborted = false;
        onProgress({ status: 'Создание архива...', percent: 0 });
        
        const zipBlob = await window.archiveManager.createZipFromFiles(
            filesWithPaths, 
            options.compress
        );
        
        onProgress({ status: 'Шифрование AES-256...', percent: 50 });
        
        const encrypted = await window.cryptoCore.encryptBlob(zipBlob, passphrase);
        
        onProgress({ status: 'Готово', percent: 100 });
        
        const outputName = options.outputName || 'archive';
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `${outputName}_${timestamp}.vault`;
        
        return { blob: encrypted, filename };
    }

    async processDecryption(file, passphrase, onProgress) {
        this.aborted = false;
        onProgress({ status: 'Расшифровка...', percent: 0 });
        
        const decryptedBuffer = await window.cryptoCore.decryptBlob(file, passphrase);
        const zipBlob = new Blob([decryptedBuffer], { type: 'application/zip' });
        
        onProgress({ status: 'Распаковка...', percent: 50 });
        
        const files = await window.archiveManager.extractToFiles(zipBlob);
        
        onProgress({ status: 'Готово', percent: 100 });
        
        return { files, zipBlob };
    }

    abort() {
        this.aborted = true;
    }
}

window.batchProcessor = new BatchProcessor();