import { BadRequestException, forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
// eslint-disable-next-line @typescript-eslint/no-var-requires
import * as abi from './../smart-contract/abi.json'
import { uuid } from 'uuidv4'
import { SmartContractService } from 'modules/smart-contract/smart-contract.service'
import { getSmartContractConfigs } from 'modules/smart-contract/smart-contract.repository'
import { ContractEnum, SecondarySaleEvents, SmartContractConfigsInterface } from 'modules/smart-contract/smart-contract.interface'
import {
  AttributeTypeEnum,
  PrimarySalesInterface,
  SaleStatusEnum,
  SecondarySalesInterface,
  SupportedNFTContractsInterface,
} from './marketplace.interface'
import {
  getAttributseBy,
  getData,
  getNFTContractAttributes,
  getPreviousSecondarySales,
  getPrimarySaleBy,
  getPrimarySaleDashboardDataFromDB,
  getSecondarySaleBy,
  getSecondarySaleCountBy,
  getSecondarySaleDashboardDataFromDB,
  getSecondarySalesBy,
  getSecondarySalesCount,
  getStoredListedSecondarySale,
  getSupportedNFTContractBy,
  getSupportedNFTContractsBy,
  removeExistingAttributes,
  removeExistingMetadata,
  storeAttributesWithQuery,
  storeMetadataWithQuery,
} from './marketplace.repository'
import { Constants, sleep } from 'helpers'
import { AddAttributesDto, AddSupportedNFTContractDTO, FilterDTO } from './marketplace.dto'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Attributes, PrimarySales, SecondarySales, SupportedTokenContracts } from './marketplace.entity'
import { Repository } from 'typeorm'
import { SmartContractConfigs } from 'modules/smart-contract/smart-contract.entity'

@Injectable()
export class MarketplaceService {
  logger: Logger
  constructor(
    public readonly configService: ConfigService,
    @Inject(forwardRef(() => SmartContractService))
    public readonly smartContractService: SmartContractService,
    @InjectRepository(SmartContractConfigs)
    public readonly smartContractConfigsRepository: Repository<SmartContractConfigs>,
    @InjectRepository(SecondarySales)
    public readonly secondarySalesRepository: Repository<SecondarySales>,
    @InjectRepository(PrimarySales)
    public readonly primarySalesRepository: Repository<PrimarySales>,
    @InjectRepository(SupportedTokenContracts)
    public readonly supportedNFTContractsRepository: Repository<SupportedTokenContracts>,
    @InjectRepository(Attributes)
    public readonly attributesRepository: Repository<Attributes>
  ) {
    this.logger = new Logger()
  }

  /**** EVENTS LISTENING FUNCTIONS ****/
  async listenSecondarySaleEvents(): Promise<any> {
    try {
      const { contractConnection, options, smartContractConfigs } = await this.getSecondarySaleConnection()

      const event = contractConnection.events.allEvents(options)
      event.on('connected', (connectionData) => {
        console.log('connected', connectionData)
      })
      event.on('data', async (data) => {
        // console.log('data', data)
        if (data.event == SecondarySaleEvents.AddedToMarketplace) {
          await sleep(1000)
          data.returnValues.listedAt = new Date(parseInt(data.returnValues.listedAt) * 1000)
          await Promise.all([
            this.storeSecondarySale(data.returnValues),
            this.storeMetadata(data.returnValues.nftContract, data.returnValues.nftId),
          ])
        } else if (data.event == SecondarySaleEvents.PriceUpdated) {
          await sleep(4000)
          await this.storePriceUpdate(data.returnValues)
        } else if (data.event == SecondarySaleEvents.RemovedFromMarketplace) {
          await sleep(8000)
          await this.storeSecondarySaleRemoval(data.returnValues)
        } else if (data.event == SecondarySaleEvents.Buy) {
          await sleep(12000)
          data.returnValues.boughtAt = new Date(parseInt(data.returnValues.boughtAt) * 1000)
          await this.buySecondarySale(data.returnValues)
        }
        await this.smartContractConfigsRepository.update(smartContractConfigs.id, { lastBlockNumber: data.blockNumber })
        options.fromBlock = data.blockNumber
      })

      event.on('error', (error) => {
        console.log('Reconnecting', error)
        this.listenSecondarySaleEvents()
      })
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async listenPrimarySaleEvents(): Promise<any> {
    try {
      const { contractConnection, options, smartContractConfigs } = await this.getPrimarySaleConnection()
      console.log('222222222222222')
      const event = contractConnection.events.Buy(options)
      event.on('connected', (connectionData) => {
        console.log('connected', connectionData)
      })
      event.on('data', async (data) => {
        data.returnValues.boughtAt = new Date(parseInt(data.returnValues.boughtAt) * 1000)
        await this.storePrimarySale(data.returnValues)
        await this.smartContractConfigsRepository.update(smartContractConfigs.id, { lastBlockNumber: data.blockNumber })
        options.fromBlock = data.blockNumber
      })
      event.on('error', (error) => {
        console.log('error', error)
        this.listenPrimarySaleEvents()
      })
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  /**** SECONDARY SALE STORE AND UPDATE FUNCTIONS *****/
  async storeSecondarySale({ nftContract, nftId, seller, listedAt, price, fees, authorFees, saleId, priceToken }: SecondarySalesInterface) {
    try {
      this.logger.log('storing secondary sale')
      const saleExist = await getSecondarySaleBy({ nftContract, nftId: Number(nftId), saleId: Number(saleId) })
      if (saleExist) return
      const saleDetail: SecondarySalesInterface = {
        id: uuid(),
        nftContract,
        nftId,
        seller,
        listedAt,
        price,
        fees,
        authorFees,
        priceToken,
        saleId,
        status: SaleStatusEnum.Unsold,
      }
      await this.secondarySalesRepository.insert(saleDetail)
      this.logger.log('secondary sale sotred')
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async storePriceUpdate({ nftContract, saleId, price, priceToken }: SecondarySalesInterface) {
    try {
      const saleExist = await getSecondarySaleBy({ nftContract, saleId })
      if (!saleExist) return
      await this.secondarySalesRepository.update(saleExist.id, { price, priceToken })
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async storeSecondarySaleRemoval({ nftContract, saleId }: SecondarySalesInterface) {
    try {
      const saleExist = await getSecondarySaleBy({ nftContract, saleId })
      if (!saleExist) return
      await this.secondarySalesRepository.update(saleExist.id, { status: SaleStatusEnum.Removed })
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async buySecondarySale({ nftContract, buyer, saleId, boughtAt }: SecondarySalesInterface) {
    try {
      const saleExist = await getSecondarySaleBy({ nftContract, saleId: Number(saleId) })
      if (!saleExist) return
      await this.secondarySalesRepository.update(saleExist.id, { buyer, boughtAt, status: SaleStatusEnum.Sold })
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  /**** PRIMARY SALE STORE AND UPDATE FUNCTIONS *****/

  async storePrimarySale({ nftContract, buyer, boughtAt, price, totalUnits, fees, priceToken }: PrimarySalesInterface) {
    try {
      const saleExist = await getPrimarySaleBy({ nftContract, buyer, boughtAt })
      if (saleExist) return
      const saleDetail: PrimarySalesInterface = {
        id: uuid(),
        nftContract,
        buyer,
        boughtAt,
        price,
        totalUnits,
        fees,
        priceToken,
      }
      await this.primarySalesRepository.insert(saleDetail)
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  /**** SECONDARY SALE LISTING FUNCTIONS ****/

  async getListedSecondarySales(filterDTO: FilterDTO, address: string) {
    try {
      const totalListedSales = await getSecondarySalesCount(filterDTO, SaleStatusEnum.Unsold, address)
      this.logger.log('Totalsales', JSON.stringify(totalListedSales))
      const listedSales = await this.getSecondarySales(filterDTO, SaleStatusEnum.Unsold, address)
      this.logger.log('listedSales', JSON.stringify(listedSales))
      return {
        totalListedSales,
        listedSales,
      }
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async getSoldSecondarySales(filterDTO: FilterDTO) {
    try {
      const totalSoldSales = await getSecondarySalesCount(filterDTO, SaleStatusEnum.Sold, Constants.ZeroAddress)
      const soldSales = await this.getSecondarySales(filterDTO, SaleStatusEnum.Sold, Constants.ZeroAddress)
      return {
        soldSales,
        totalSoldSales,
      }
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async getPreviousSales({ limit, skip, orderBy, order }: FilterDTO, nftContract: string, nftId: number) {
    try {
      nftContract = nftContract.toLowerCase()
      const previousSales = await getPreviousSecondarySales(limit, skip, orderBy, order, nftContract, nftId)
      const metadata = await this.smartContractService.getMetadata(nftContract, nftId)
      return {
        ...metadata,
        previousSales,
      }
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  /**** DASHBOARD FUNCTIONS ****/
  async getSecondarySaleDashboardData({ nftContracts }: FilterDTO) {
    try {
      const dashboardData = await getSecondarySaleDashboardDataFromDB(nftContracts)
      dashboardData.lastTwentyFourHoursVolume = dashboardData.lastTwentyFourHoursVolume / Math.pow(10, 18)
      dashboardData.lastSevenDaysVolume = dashboardData.lastSevenDaysVolume / Math.pow(10, 18)
      dashboardData.lastThirtyDaysVolume = dashboardData.lastThirtyDaysVolume / Math.pow(10, 18)
      return dashboardData
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async getPrimarySaleDashboardData({ nftContracts }: FilterDTO) {
    try {
      //NEED TO CHANGE IN FUTURE IF MORE PRICE TOKEN WILL BE ADDED
      const dashboardData = await getPrimarySaleDashboardDataFromDB(nftContracts)
      dashboardData.lastTwentyFourHoursVolume = dashboardData.lastTwentyFourHoursVolume / Math.pow(10, 18)
      dashboardData.lastSevenDaysVolume = dashboardData.lastSevenDaysVolume / Math.pow(10, 18)
      dashboardData.lastThirtyDaysVolume = dashboardData.lastThirtyDaysVolume / Math.pow(10, 18)
      return dashboardData
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  /**** HELPER FUNCTIONS ****/

  async getSecondarySaleConnection() {
    let smartContractConfigs = await getSmartContractConfigs({ contract: ContractEnum.SecondarySale })
    if (!smartContractConfigs) {
      const smartContractConfigDetails: SmartContractConfigsInterface = {
        id: uuid(),
        contract: ContractEnum.SecondarySale,
        lastBlockNumber: 0,
      }
      await this.smartContractConfigsRepository.insert(smartContractConfigDetails)
      smartContractConfigs = await getSmartContractConfigs({ contract: ContractEnum.SecondarySale })
    }
    const contractConnection = await this.smartContractService.getContractSocketConnection(
      abi.secondarySale,
      this.configService.get('SECONDARY_SALE_CONTRACT')
    )
    const options = {
      filter: {
        value: [],
      },
      fromBlock: smartContractConfigs.lastBlockNumber,
    }
    return {
      contractConnection,
      options,
      smartContractConfigs,
    }
  }

  async getPrimarySaleConnection() {
    let smartContractConfigs = await getSmartContractConfigs({ contract: ContractEnum.PrimarySale })
    console.log('121212121212', smartContractConfigs)
    if (!smartContractConfigs) {
      const smartContractConfigDetails: SmartContractConfigsInterface = {
        id: uuid(),
        contract: ContractEnum.PrimarySale,
        lastBlockNumber: 0,
      }
      await this.smartContractConfigsRepository.insert(smartContractConfigDetails)
      smartContractConfigs = await getSmartContractConfigs({ contract: ContractEnum.PrimarySale })
    }

    const contractConnection = await this.smartContractService.getContractSocketConnection(
      abi.primarySale,
      this.configService.get('PRIMARY_SALE_CONTRACT')
    )
    const options = {
      filter: {
        value: [],
      },
      fromBlock: smartContractConfigs.lastBlockNumber,
    }
    console.log('111111111111')
    return {
      contractConnection,
      options,
      smartContractConfigs,
    }
  }

  async getSecondarySales(filterDTO: FilterDTO, status: SaleStatusEnum, address: string) {
    try {
      const listedSecondarySales = await getStoredListedSecondarySale(filterDTO, status, address)
      this.logger.log('listedSecondarySales', JSON.stringify(listedSecondarySales.length))
      const reshapedData = []

      for (const sale of listedSecondarySales) {
        //const metadata = await this.smartContractService.getMetadata(sale.nftContract, sale.nftId)
        const saleMetadata = JSON.parse(sale.metadata)
        const rarity = saleMetadata.rarity
        this.logger.log('saleMetada', JSON.stringify(saleMetadata))
        this.logger.log('rarity', JSON.stringify(rarity))
        delete sale.metadata

        saleMetadata['attributes'] = []
        const traitsArray = []
        for (const attribute in saleMetadata) {
          const traits = {}
          if (!['name', 'image', 'description', 'rarity', 'traitCount', 'attributes'].includes(attribute)) {
            traits['trait_type'] = attribute
            traits['value'] = saleMetadata[attribute]
            traitsArray.push(traits)
          }
        }
        saleMetadata['attributes'] = traitsArray
        reshapedData.push({
          name: saleMetadata.name,
          image: saleMetadata.image,
          description: saleMetadata.description,
          rarity: rarity ? rarity : '',
          attributes: saleMetadata.attributes ? saleMetadata.attributes : [],
          ...sale,
        })
      }
      this.logger.log('Reshaped data', JSON.stringify(reshapedData))
      return reshapedData
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async fetchAndReshapeMetadata(nftContract: string, nftId: number) {
    try {
      nftContract = nftContract.toLowerCase()
      await removeExistingMetadata(nftContract, nftId)
      const metadata = await this.smartContractService.getMetadata(nftContract, nftId)
      // this.logger.log('metadata', JSON.stringify(metadata))
      return this.formatMetadata(metadata, nftContract, nftId)
    } catch (err) {
      return {
        nftId,
        nftContract,
        traitCount: 0,
      }
    }
  }

  formatMetadata(metadata: any, nftContract: string, nftId: number) {
    try {
      nftContract = nftContract.toLowerCase()
      const metadataToInsert = []
      const existingAttributes = {}
      for (const key in metadata) {
        if (key != 'attributes' || typeof metadata[key] != 'object') {
          existingAttributes[key] = true
          metadataToInsert.push([uuid(), nftContract, nftId, key, metadata[key]])
        }
      }
      if (metadata.attributes && metadata.attributes.length) {
        for (const data of metadata.attributes) {
          if (!existingAttributes[data.trait_type]) {
            existingAttributes[data.trait_type] = true
            metadataToInsert.push([uuid(), nftContract, nftId, data.trait_type, data.value])
          }
        }
      }
      metadataToInsert.push([uuid(), nftContract, nftId, 'traitCount', Object.keys(existingAttributes).length])
      return metadataToInsert
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async storeMetadata(nftContract: string, nftId: number) {
    try {
      nftContract = nftContract.toLowerCase()
      this.logger.log('storing metadata')
      await removeExistingMetadata(nftContract, nftId)
      const metadata = await this.smartContractService.getMetadata(nftContract, nftId)
      this.logger.log('metadat', JSON.stringify(metadata))
      const metadataToInsert = await this.formatMetadata(metadata, nftContract, nftId)
      //this.logger.log('metadata to insetr', JSON.stringify(metadataToInsert))
      await storeMetadataWithQuery(metadataToInsert)
      this.logger.log('metadata stored succesfully')
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  /**** FILTER FUNCTIONS ****/
  async getAttributes(nftContract: string) {
    try {
      //NEED TO CHANGE IN FUTURE IF MORE PRICE TOKEN WILL BE ADDED
      const attributes = await getNFTContractAttributes(nftContract.toLowerCase())
      const reshapedData = {}
      for (const row of attributes)
        if (reshapedData[row.attribute] && reshapedData[row.attribute].indexOf(row.value) == Constants.InvalidArrayLength) {
          reshapedData[row.attribute].push(row.value)
        } else if (!reshapedData[row.attribute]) {
          reshapedData[row.attribute] = [row.value]
        }
      return reshapedData
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async addAttributes(nftContract: string, { attributes }: AddAttributesDto) {
    try {
      nftContract = nftContract.toLowerCase()
      await removeExistingAttributes(nftContract)
      const existingAttributes = {}
      const attributesToInsert = []
      for (const data of attributes) {
        let type = AttributeTypeEnum.General
        if (data.type in AttributeTypeEnum) {
          type = data.type
        }
        if (!existingAttributes[data.attribute]) {
          existingAttributes[data.attribute] = true
          attributesToInsert.push([uuid(), nftContract, data.attribute, type])
        }
      }
      this.logger.log('attributes to insetr', JSON.stringify(attributesToInsert))
      await storeAttributesWithQuery(attributesToInsert)
      return 'Succesfully added'
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async getMarketplaceSpecificMetadata(nftContract: string, metadata: any) {
    try {
      const attributes = await getAttributseBy({ nftContract })
      if (attributes.length && metadata.attributes && metadata.attributes.length) {
        const reshapedAttributes = {}
        for (const row of attributes) {
          reshapedAttributes[row.attribute] = row.type
        }
        for (const row of metadata.attributes) {
          row.type = reshapedAttributes[row.attribute] || AttributeTypeEnum.General
        }
      }
      return metadata
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }
  /**** OTHER FUNCTIONS *****/

  async updateListedNFTsMetadata() {
    try {
      // 104
      const totalListedNFTs = await getSecondarySaleCountBy({ status: SaleStatusEnum.Unsold })
      this.logger.log('totalListedNFTs', JSON.stringify(totalListedNFTs))
      // [{}]
      const listedNFTs = await getSecondarySalesBy({ status: SaleStatusEnum.Unsold })
      this.logger.log('listedNFTs', JSON.stringify(listedNFTs))
      const singleRoundLimit = 100
      //2
      const totalRounds: number = Math.ceil(totalListedNFTs / 100)
      this.logger.log('totalRounds', JSON.stringify(totalRounds))
      const metadataInsertionTask = []
      for (let roundIndex = 1; roundIndex <= totalRounds; roundIndex++) {
        const start = (roundIndex - 1) * singleRoundLimit
        const end = roundIndex * singleRoundLimit < totalListedNFTs ? roundIndex * singleRoundLimit : totalListedNFTs
        console.log('starend', start, 'ddddd', end)
        const metadataTasks = []
        for (let index = start; index < end; index++) {
          metadataTasks.push(this.fetchAndReshapeMetadata(listedNFTs[index].nftContract, listedNFTs[index].nftId))
        }
        let dataToInsert = await Promise.all(metadataTasks)
        this.logger.log('dataToInsert', JSON.stringify(dataToInsert))
        dataToInsert = Array.prototype.concat.apply([], dataToInsert)
        this.logger.log('dataToInsert2', JSON.stringify(dataToInsert))
        metadataInsertionTask.push(storeMetadataWithQuery(dataToInsert))
      }
      await Promise.all(metadataInsertionTask)
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async getSupportedNFTContractsList() {
    try {
      const supportedNFTContractsList = await getSupportedNFTContractsBy({ isRemoved: false })
      return supportedNFTContractsList
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async addSupportedNFTContract({ nftContract, nftContractType }: AddSupportedNFTContractDTO) {
    try {
      const existingDetails = await await getSupportedNFTContractBy({ nftContract })
      if (existingDetails) {
        await this.supportedNFTContractsRepository.update(existingDetails.id, { nftContractType, isRemoved: false })
      } else {
        const supportedNFTContract: SupportedNFTContractsInterface = {
          id: uuid(),
          nftContract,
          nftContractType,
          isRemoved: false,
        }
        await this.supportedNFTContractsRepository.insert(supportedNFTContract)
      }
      return { message: 'Successfully added' }
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async removeSupportedNFTContract(nftContract: string) {
    try {
      const existingDetails = await await getSupportedNFTContractBy({ nftContract })
      if (!existingDetails) {
        throw new BadRequestException('Invalid nft Contract')
      }
      await this.supportedNFTContractsRepository.update(existingDetails.id, { isRemoved: true })
      return { message: 'Successfully Removed' }
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async getTableData(table: string): Promise<any[]> {
    try {
      const data = await getData(table)
      return data
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }
}
