import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Constants } from 'helpers'
import { AddAttributesDto, AddSupportedNFTContractDTO, FilterDTO } from './marketplace.dto'
import { MarketplaceService } from './marketplace.service'
@Controller('marketplace')
@ApiTags('Marketplace')
export class MarketplaceController {
  constructor(public readonly marketplaceService: MarketplaceService) {}

  /**** LISTENING EVENTS APIS ****/

  @Get('primary/listen-events')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'listen primary events' })
  async listenPrimarySaleEvents() {
    return await this.marketplaceService.listenPrimarySaleEvents()
  }

  @Get('secondary/listen-events')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'listen secondary' })
  async listenSecondarySaleEvents() {
    return await this.marketplaceService.listenSecondarySaleEvents()
  }

  /****SECONDARY SALE LISTING APIS */

  // ALL LISTED NFTS
  @Get('secondary/listed')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Get listed secondary sales' })
  async getListedSecondarySales(@Query() filterDTO: FilterDTO) {
    return await this.marketplaceService.getListedSecondarySales(filterDTO, Constants.ZeroAddress)
  }

  // ADDRESS SPECIFIC LISTED NFTS
  @Get('user/secondary/listed/:address')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Get users listed secondary sales' })
  async getUsersListedSecondarySales(@Query() filterDTO: FilterDTO, @Param('address') address: string) {
    return await this.marketplaceService.getListedSecondarySales(filterDTO, address)
  }

  // SOLD NFTS
  @Get('secondary/sold')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Get sold secondary sales' })
  async getSoldSecondarySales(@Query() filterDTO: FilterDTO) {
    return await this.marketplaceService.getSoldSecondarySales(filterDTO)
  }

  // SOLD NFTS PREVIOUS LIST
  @Get('secondary/previous-sales/:nftContract/:nftId')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Get all previous sales' })
  async getPreviousSales(@Query() filterDTO: FilterDTO, @Param('nftContract') nftContract: string, @Param('nftId') nftId: number) {
    return await this.marketplaceService.getPreviousSales(filterDTO, nftContract, nftId)
  }

  /****DASHBOARD APIS ****/
  @Get('secondary/dashboard-data')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Get dashboard data' })
  async getSecondarySaleDashboardData(@Query() filterDTO: FilterDTO) {
    return await this.marketplaceService.getSecondarySaleDashboardData(filterDTO)
  }

  @Get('primary/dashboard-data')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Get dashboard data ' })
  async getPrimarySaleDashboardData(@Query() filterDTO: FilterDTO) {
    return await this.marketplaceService.getPrimarySaleDashboardData(filterDTO)
  }

  /**** FILTER APIS ****/

  @Get('attributes/:nftContract')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Get attributes' })
  async getAttributes(@Param('nftContract') nftContract: string) {
    return await this.marketplaceService.getAttributes(nftContract)
  }

  //TODO: add security
  @Post('add-attributes/:nftContract')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Add attributes' })
  async addAttributes(@Param('nftContract') nftContract: string, @Body() addAttributesDto: AddAttributesDto) {
    return await this.marketplaceService.addAttributes(nftContract, addAttributesDto)
  }

  @Get('update-listed-nft-metadata')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'update listed nfts metadata' })
  async updateListedNFTsMetadata() {
    return await this.marketplaceService.updateListedNFTsMetadata()
  }

  @Get('supported-nft-contracts')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Get supported contract list' })
  async getSupportedNFTContractsList() {
    return await this.marketplaceService.getSupportedNFTContractsList()
  }

  //TODO: have to add secret key check
  @Post('add-supported-nft-contract')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'add supported contract' })
  async addSupportedNFTContract(@Body() addSupportedNFTContractDTO: AddSupportedNFTContractDTO) {
    return await this.marketplaceService.addSupportedNFTContract(addSupportedNFTContractDTO)
  }

  //TODO: have to add secret key check
  @Delete('remove-supported-nft-contract/:nftContract')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'remove supported contract list' })
  async removeSupportedNFTContract(@Param('nftContract') nftContract: string) {
    return await this.marketplaceService.removeSupportedNFTContract(nftContract)
  }

  //TODO: need to remove later
  @Get('tables-data/:table')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Get table data' })
  async getTableData(@Param('table') table: string) {
    return await this.marketplaceService.getTableData(table)
  }
}
