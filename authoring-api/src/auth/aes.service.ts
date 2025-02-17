import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class AESService {

    private readonly aesKey = crypto.randomBytes(32);
    private readonly aesIV = crypto.randomBytes(16);

    encrypt(text: string) {
        const cipher = crypto.createCipheriv('aes-256-cbc', this.aesKey, this.aesIV);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${this.aesIV.toString('hex')}:${encrypted}`; // Append IV for decryption
    }

    decrypt(text: string) {
        const [iv, encrypted] = text.split(':');
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.aesKey, Buffer.from(iv, 'hex'));
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
