import { Controller, Get, HttpCode, HttpStatus, Param, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { FilterDTO } from 'modules/marketplace/marketplace.dto'
import { SmartContractService } from './smart-contract.service'
@Controller('smart-contract')
@ApiTags('SmartContract')
export class SmartContractController {
  constructor(public readonly smartContractService: SmartContractService) {}

  @Get('gas-price')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Get gas price' })
  async getGasPrice() {
    return await this.smartContractService.getGasPrice()
  }

  @Get('nft-details/:nftContract/:nftId')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Get nft details' })
  async getNFTDetails(@Param('nftContract') nftContract: string, @Param('nftId') nftId: number) {
    return await this.smartContractService.getNFTDetails(nftContract, nftId)
  }

  @Get('mint-details/:nftContract')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Get nft details' })
  async getNFTMintingDetails(@Param('nftContract') nftContract: string) {
    return await this.smartContractService.getNFTMintingDetails(nftContract)
  }

  @Get('user-nfts/:address')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Get nfts' })
  async getUsersNFTs(@Param('address') address: string, @Query() filterDTO: FilterDTO) {
    return await this.smartContractService.getUsersNFTs(address, filterDTO)
  }

  @Get('user/activities/:address')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Get users activities' })
  async getUserActivities(@Param('address') address: string, @Query() filterDTO: FilterDTO) {
    return await this.smartContractService.getUsersActivities(address, filterDTO.limit, filterDTO.skip)
  }

  @Get('eth-price')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Get eth price' })
  async getETHPrice() {
    return await this.smartContractService.getETHPrice()
  }
}
