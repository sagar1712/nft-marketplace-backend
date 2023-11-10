import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { INestApplication } from '@nestjs/common'
import { MarketplacetModule } from 'modules/marketplace/marketplace.module'
import { SmartContractModule } from 'modules/smart-contract/smart-contract.module'

export function setupSwagger(app: INestApplication) {
  const options = new DocumentBuilder().setTitle('REVOG MARKETPLACE BACKEND DOCUMENTATION').setVersion('8').addBearerAuth().build()

  const document = SwaggerModule.createDocument(app, options, {
    include: [MarketplacetModule, SmartContractModule],
  })
  SwaggerModule.setup('documentation', app, document)
}
