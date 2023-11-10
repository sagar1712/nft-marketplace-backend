import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MarketplacetModule } from 'modules/marketplace/marketplace.module'
import { SmartContractController } from './smart-contract.controller'
import { SmartContractService } from './smart-contract.service'
import { SmartContractConfigs, Tokens, TransferTransactions } from './smart-contract.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Tokens,TransferTransactions,SmartContractConfigs]), forwardRef(() => MarketplacetModule)],
  controllers: [SmartContractController],
  providers: [SmartContractService],
  exports: [SmartContractService],
})
export class SmartContractModule {}
