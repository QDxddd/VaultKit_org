class FileHandler {
    constructor() {
        this.items = [];
        this.selectedIndices = new Set();
        this.structure = new Map();
    }

    addFromFileList(fileList) {
        const files = Array.from(fileList);
        for (const file of files) {
            if (!this.structure.has(file.name)) {
                this.structure.set(file.name, file);
            }
        }
        this.refreshList();
    }

    addFromDirectory(fileList) {
        for (const file of fileList) {
            const path = file.webkitRelativePath || file.name;
            this.structure.set(path, file);
        }
        this.refreshList();
    }

    refreshList() {
        this.items = Array.from(this.structure.entries()).map(([path, file]) => ({
            path,
            file,
            size: file.size,
            name: path.split('/').pop()
        }));
        this.selectedIndices.clear();
        this.notifyChange();
    }

    getItems() {
        return this.items;
    }

    getSelected() {
        return this.items.filter((_, i) => this.selectedIndices.has(i));
    }

    toggleSelect(index) {
        if (this.selectedIndices.has(index)) {
            this.selectedIndices.delete(index);
        } else {
            this.selectedIndices.add(index);
        }
        this.notifyChange();
    }

    selectAll() {
        for (let i = 0; i < this.items.length; i++) {
            this.selectedIndices.add(i);
        }
        this.notifyChange();
    }

    removeSelected() {
        const newStructure = new Map();
        for (let i = 0; i < this.items.length; i++) {
            if (!this.selectedIndices.has(i)) {
                newStructure.set(this.items[i].path, this.items[i].file);
            }
        }
        this.structure = newStructure;
        this.refreshList();
    }

    clear() {
        this.structure.clear();
        this.selectedIndices.clear();
        this.items = [];
        this.notifyChange();
    }

    getTotalSize() {
        return this.items.reduce((sum, item) => sum + item.size, 0);
    }

    getFileCount() {
        return this.items.length;
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    getFlatFiles() {
        return this.items.map(item => item.file);
    }

    getFilesWithPaths() {
        return this.items.map(item => ({ file: item.file, path: item.path }));
    }

    onChange(callback) {
        this._callback = callback;
    }

    notifyChange() {
        if (this._callback) this._callback();
    }
}

window.fileHandler = new FileHandler();