import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiToken, ApiTokenDocument } from './api-token.schema';
import * as crypto from 'crypto';

export interface CreateApiTokenDto {
  name: string;
  expires_in_days?: number;
  expires_at?: string | Date;
  created_by: string;
  user_email?: string;
  roles?: string[];
}

@Injectable()
export class ApiTokensService {
  constructor(
    @InjectModel('api_tokens') private tokenModel: Model<ApiTokenDocument>,
  ) {}

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async create(dto: CreateApiTokenDto) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Token name is required');
    }

    let expiryDate: Date;
    if (dto.expires_at) {
      expiryDate = new Date(dto.expires_at);
      if (isNaN(expiryDate.getTime()) || expiryDate.getTime() <= Date.now()) {
        throw new BadRequestException('Expiry date must be a valid future date');
      }
    } else {
      const days = Number(dto.expires_in_days) || 30;
      expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    const randomHex = crypto.randomBytes(32).toString('hex');
    const rawToken = `ca_tok_${randomHex}`;
    const token_hash = this.hashToken(rawToken);
    const token_prefix = `${rawToken.slice(0, 11)}...${rawToken.slice(-4)}`;

    const roles = dto.roles && dto.roles.length > 0 ? dto.roles : ['app-admin', 'author'];
    const user_email = dto.user_email?.trim() || dto.created_by;

    const doc = await this.tokenModel.create({
      name: dto.name.trim(),
      token_hash,
      token_prefix,
      active: true,
      created_by: dto.created_by,
      user_email,
      roles,
      expires_at: expiryDate,
      last_used_at: null,
    });

    const record = doc.toObject();
    delete (record as any).token_hash;

    return {
      token: rawToken,
      record: {
        ...record,
        id: record._id.toString(),
      },
    };
  }

  async list() {
    const docs = await this.tokenModel
      .find({}, { token_hash: 0 })
      .sort({ created_at: -1 })
      .lean();

    const now = new Date();
    return docs.map((doc: any) => ({
      ...doc,
      id: doc._id.toString(),
      is_expired: now > new Date(doc.expires_at),
    }));
  }

  async revoke(id: string) {
    const deleted = await this.tokenModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException('API Token not found');
    }
    return { success: true, id };
  }

  async toggle(id: string, active?: boolean) {
    const token = await this.tokenModel.findById(id);
    if (!token) {
      throw new NotFoundException('API Token not found');
    }
    token.active = active !== undefined ? active : !token.active;
    await token.save();

    const result = token.toObject();
    delete (result as any).token_hash;
    return {
      ...result,
      id: result._id.toString(),
      is_expired: new Date() > new Date(result.expires_at),
    };
  }

  async validateToken(rawToken: string) {
    if (!rawToken || typeof rawToken !== 'string') {
      return null;
    }

    const trimmed = rawToken.trim();
    const tokenHash = this.hashToken(trimmed);

    const token = await this.tokenModel.findOne({
      token_hash: tokenHash,
      active: true,
    });

    if (!token) {
      return null;
    }

    const now = new Date();
    if (now > new Date(token.expires_at)) {
      return null;
    }

    // Update last_used_at asynchronously
    this.tokenModel
      .updateOne({ _id: token._id }, { $set: { last_used_at: now } })
      .exec()
      .catch(() => {});

    return {
      _id: token._id.toString(),
      email: token.user_email || token.created_by,
      fullname: token.name,
      roles: token.roles && token.roles.length > 0 ? token.roles : ['app-admin', 'author'],
      type: 'api-token',
      created_by: token.created_by,
    };
  }
}

