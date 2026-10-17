import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { AuthAccountType, User, UserDocument, UserStatus, roles } from 'src/users/schema/user.schema';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  /** Only provisions an explicitly configured admin account; restaurant records are user registered. */
  async onModuleInit() {
    if (['production', 'prod'].includes((process.env.NODE_ENV || 'development').toLowerCase())) return;
    if (process.env.DEMO_ADMIN_EMAIL && process.env.DEMO_ADMIN_PASSWORD) {
      await this.ensureDemoAdmin();
    }
  }

  private async ensureDemoAdmin() {
    const email = process.env.DEMO_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.DEMO_ADMIN_PASSWORD;
    if (!email || !password) {
      this.logger.warn('Configured admin account was not created: set DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD.');
      return;
    }

    const existing = await this.userModel.findOne({ email, accountType: AuthAccountType.ADMIN });
    if (existing) {
      existing.password = await bcrypt.hash(password, 12);
      existing.role = roles.ADMIN;
      existing.isVerified = true;
      existing.status = UserStatus.ACTIVE;
      await existing.save();
      this.logger.log('Configured admin credentials synchronized.');
      return;
    }

    await this.userModel.create({
      name: 'Admin User',
      email,
      password: await bcrypt.hash(password, 12),
      phone: '1000000001',
      role: roles.ADMIN,
      accountType: AuthAccountType.ADMIN,
      isVerified: true,
      status: UserStatus.ACTIVE,
      restaurantMemberships: [],
      authSessions: [],
    });
    this.logger.log('Configured admin account created.');
  }
}
