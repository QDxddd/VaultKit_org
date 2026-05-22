class ArchiveManager {
    constructor() {
        this.jszip = JSZip;
    }

    async createZipFromFiles(filesWithPaths, compress = true) {
        const zip = new JSZip();
        
        for (const { file, path } of filesWithPaths) {
            const data = await file.arrayBuffer();
            zip.file(path, data, { compression: compress ? 'DEFLATE' : 'STORE' });
        }
        
        return zip.generateAsync({ 
            type: 'blob',
            compression: compress ? 'DEFLATE' : 'STORE',
            compressionOptions: { level: 6 }
        });
    }

    async extractZip(zipBlob) {
        const zip = await JSZip.loadAsync(zipBlob);
        const files = [];
        
        for (const [path, entry] of Object.entries(zip.files)) {
            if (!entry.dir) {
                const blob = await entry.async('blob');
                files.push({ path, blob, entry });
            }
        }
        
        return files;
    }

    async extractToFiles(zipBlob) {
        const files = await this.extractZip(zipBlob);
        const fileList = [];
        
        for (const { path, blob } of files) {
            const name = path.split('/').pop();
            const file = new File([blob], name, { type: blob.type });
            Object.defineProperty(file, 'webkitRelativePath', { value: path });
            fileList.push(file);
        }
        
        return fileList;
    }
}

window.archiveManager = new ArchiveManager();