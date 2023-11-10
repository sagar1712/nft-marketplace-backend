import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MarketplaceController } from './marketplace.controller'
import { MarketplaceService } from './marketplace.service'
import { SmartContractModule } from 'modules/smart-contract/smart-contract.module'
import { Attributes, PrimarySales, SecondarySales, SupportedTokenContracts } from './marketplace.entity'
import { SmartContractConfigs } from 'modules/smart-contract/smart-contract.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PrimarySales,SecondarySales,SupportedTokenContracts,Attributes,SmartContractConfigs
    ]),
    forwardRef(() => SmartContractModule),
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplacetModule {}
