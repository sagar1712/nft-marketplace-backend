import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MarketplacetModule } from 'modules/marketplace/marketplace.module'
import { SmartContractModule } from 'modules/smart-contract/smart-contract.module'
import { HttpModule } from '@nestjs/axios'
import { JwtModule } from '@nestjs/jwt'
import { dataSourceOptions } from 'databases/data-source'
import { ConfigModule } from '@nestjs/config'
@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    {
      ...HttpModule.register({}),
      global: true,
    },
    {
      ...JwtModule.register({ secret: process.env.JWT_SECRET }),
      global: true,
    },
    MarketplacetModule,
    SmartContractModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
