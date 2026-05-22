class CryptoCore {
    constructor() {
        this.ALGO = 'AES-GCM';
        this.ITERATIONS = 120000;
        this.KEY_LEN = 256;
    }

    async deriveKey(passphrase, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            enc.encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: this.ITERATIONS, hash: 'SHA-256' },
            keyMaterial,
            { name: this.ALGO, length: this.KEY_LEN },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async encrypt(data, passphrase) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(passphrase, salt);
        const encrypted = await crypto.subtle.encrypt({ name: this.ALGO, iv }, key, data);
        const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        result.set(salt, 0);
        result.set(iv, salt.length);
        result.set(new Uint8Array(encrypted), salt.length + iv.length);
        return result.buffer;
    }

    async decrypt(encryptedBuffer, passphrase) {
        const data = new Uint8Array(encryptedBuffer);
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 28);
        const ciphertext = data.slice(28);
        const key = await this.deriveKey(passphrase, salt);
        return crypto.subtle.decrypt({ name: this.ALGO, iv }, key, ciphertext);
    }

    async encryptBlob(blob, passphrase) {
        const buffer = await blob.arrayBuffer();
        const encrypted = await this.encrypt(buffer, passphrase);
        return new Blob([encrypted], { type: 'application/octet-stream' });
    }

    async decryptBlob(blob, passphrase) {
        const buffer = await blob.arrayBuffer();
        return this.decrypt(buffer, passphrase);
    }

    assessStrength(passphrase) {
        let score = 0;
        if (passphrase.length >= 8) score += 25;
        if (passphrase.length >= 12) score += 15;
        if (/[A-Z]/.test(passphrase)) score += 20;
        if (/[a-z]/.test(passphrase)) score += 10;
        if (/[0-9]/.test(passphrase)) score += 15;
        if (/[^A-Za-z0-9]/.test(passphrase)) score += 15;
        return Math.min(100, score);
    }

    generatePassphrase(length = 16) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
        let result = '';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        for (let i = 0; i < length; i++) {
            result += chars[array[i] % chars.length];
        }
        return result;
    }
}

window.cryptoCore = new CryptoCore();