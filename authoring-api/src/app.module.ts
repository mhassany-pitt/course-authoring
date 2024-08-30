import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { CoursesModule } from './courses/courses.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UserAdminModule } from './user-admin/user-admin.module';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { MasteryGridModule } from './mastery-grid/mastery-grid.module';
import { AggregateModule } from './aggregate/aggregate.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', 'public') }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${(process.env.NODE_ENV || 'development').toLowerCase()}`
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.get('MONGO_URI') }),
    }),
    TypeOrmModule.forRootAsync({
      name: 'portal_test2',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ type: 'mysql', url: config.get('PORTAL_TEST2_MYSQL_URI') }),
    }),
    TypeOrmModule.forRootAsync({
      name: 'aggregate',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ type: 'mysql', url: config.get('AGGREGATE_MYSQL_URI') }),
    }),
    TypeOrmModule.forRootAsync({
      name: 'um2',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ type: 'mysql', url: config.get('UM2_MYSQL_URI') }),
    }),
    UsersModule,
    AuthModule,
    UserAdminModule,
    CoursesModule,
    MasteryGridModule,
    AggregateModule,
  ],
  controllers: [AppController],
  providers: [AppService, ConfigService],
  exports: [AppService]
})
export class AppModule { }
