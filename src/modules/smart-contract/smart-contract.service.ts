import { BadRequestException, forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Web3 } = require('web3')
import * as abi from './abi.json'
import { Transaction as TX } from 'ethereumjs-tx'
import { TXN, TransactionStatusEnum } from './smart-contract.interface'
import { getNFTContracts, getSecondarySaleBy } from 'modules/marketplace/marketplace.repository'
import { uuid } from 'uuidv4'
import {
  getLastBlockNumber,
  getNFTsByAddress,
  getNFTsByAddressCount,
  getUsersActivities,
  getUsersActivitiesCount,
  storeNFTs,
  storeTransferTransactions,
} from './smart-contract.repository'
import { Constants } from 'helpers'
import { SaleStatusEnum } from 'modules/marketplace/marketplace.interface'
import { FilterDTO } from 'modules/marketplace/marketplace.dto'
import { MarketplaceService } from 'modules/marketplace/marketplace.service'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { SmartContractConfigs, Tokens, TransferTransactions } from './smart-contract.entity'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'

@Injectable()
export class SmartContractService {
  logger: Logger
  constructor(
    public readonly configService: ConfigService,
    private readonly http: HttpService,
    @Inject(forwardRef(() => MarketplaceService))
    public readonly marketplaceService: MarketplaceService,
    @InjectRepository(SmartContractConfigs)
    public readonly SmartContractConfigsRepository: Repository<SmartContractConfigs>,
    @InjectRepository(TransferTransactions)
    public readonly TransferTransactionsRepository: Repository<TransferTransactions>,
    @InjectRepository(Tokens)
    public readonly TokensRepository: Repository<Tokens>
  ) {
    this.logger = new Logger()
  }

  //HELPER FUNCTIONS

  getWeb3Initiated(socket: boolean) {
    if (socket) {
      const options = {
        clientConfig: { keepalive: true, keepaliveInterval: 600000 },
        reconnect: { auto: true, delay: 1000, maxAttempts: 10, onTimeout: true },
      }
      console.log('returning web')
      return new Web3(new Web3.providers.WebsocketProvider(this.configService.get('NODE_URL_WS')), options)
    }
    return new Web3(new Web3.providers.HttpProvider(this.configService.get('NODE_URL_HTTP')))
  }

  getContractConnection(contractAbi: any, contractAddress: string) {
    const web3 = this.getWeb3Initiated(false)
    return new web3.eth.Contract(contractAbi, contractAddress)
  }

  getContractSocketConnection(contractAbi: any, contractAddress: string) {
    const web3 = this.getWeb3Initiated(true)
    return new web3.eth.Contract(contractAbi, contractAddress)
  }

  async getGasPrice(): Promise<number> {
    try {
      const web3 = this.getWeb3Initiated(false)
      const onChainGasPrice = parseInt(await web3.eth.getGasPrice())
      const maxGasPrice = parseInt(this.configService.get('GAS_PRICE'))
      if (onChainGasPrice > maxGasPrice) {
        return maxGasPrice
      } else {
        return onChainGasPrice
      }
    } catch (err) {
      throw new BadRequestException(err.message)
    }
  }

  async transact(data: string, value: number, assetCon: string): Promise<TXN> {
    try {
      const ethereumPrivateKey = this.configService.get('ETHEREUM_ADMIN_PRIVATE_KEY')
      const privateKey = Buffer.from(ethereumPrivateKey, 'hex')
      const web3 = this.getWeb3Initiated(false)
      const count = await web3.eth.getTransactionCount(this.configService.get('ETHEREUM_ADMIN_PUBLIC_KEY'))
      const gasPrice = await this.getGasPrice()
      const txData = {
        nonce: web3.utils.toHex(count),
        gasLimit: parseInt(this.configService.get('GAS_LIMIT')),
        gasPrice: gasPrice,
        to: assetCon,
        from: this.configService.get('ETHEREUM_ADMIN_PUBLIC_KEY'),
        data: data,
        value: value,
      }
      const transaction = new TX(txData, { chain: this.configService.get('CHAIN'), hardfork: 'petersburg' })
      transaction.sign(privateKey)
      const serialisedTransaction = transaction.serialize().toString('hex')
      const transactionDetail = await web3.eth.sendSignedTransaction('0x' + serialisedTransaction)
      return {
        transactionHash: transactionDetail.blockHash,
        status: TransactionStatusEnum.successful,
        message: 'Successful',
      }
    } catch (error) {
      if (error.receipt.blockHash) {
        return {
          transactionHash: error.receipt.blockHash,
          status: TransactionStatusEnum.reverted,
          message: error,
        }
      } else {
        throw new Error(error)
      }
    }
  }

  //FUNCTION TO GET METADATA BASED ON NFT CONTRACT AND NFT ID
  async getMetadata(nftContract: string, nftId: number): Promise<any> {
    try {
      const contract = this.getContractConnection(abi.nft, nftContract)
      const tokenURI = await contract.methods.tokenURI(nftId).call()
      this.logger.log('tokenURI', JSON.stringify(tokenURI))
      const { data: metadata } = await this.http.get(tokenURI, { headers: {} }).toPromise()
      this.logger.log('metadata fetched', JSON.stringify(metadata))
      metadata.name = metadata.name || ''
      metadata.image = metadata.image || ''
      metadata.description = metadata.description || ''
      const marketplaceSpecificMetadata = await this.marketplaceService.getMarketplaceSpecificMetadata(nftContract, metadata)
      return marketplaceSpecificMetadata
    } catch (err) {
      this.logger.error('metadata fetched error', JSON.stringify(err))
      return { name: '', image: '', description: '' }
    }
  }

  async getOwner(nftContract: string, nftId: number): Promise<any> {
    try {
      const contract = this.getContractConnection(abi.nft, nftContract)
      const owner = await contract.methods.ownerOf(nftId).call()
      return owner.toLowerCase()
    } catch (err) {
      return Constants.ZeroAddress
    }
  }

  // FUNCTION TO GET ALL DETAILS OF AN NFT
  async getNFTDetails(nftContract: string, nftId: number): Promise<any> {
    nftContract = nftContract.toLowerCase()
    let isListed = false
    let price = 0
    try {
      const metadata = await this.getMetadata(nftContract, nftId)
      const contract = this.getContractConnection(abi.nft, nftContract)
      let owner: any = Constants.ZeroAddress
      let maxSupply = this.configService.get('DEFAULT_MAX_SUPPLY')
      const nftSaleDetails = await getSecondarySaleBy({ nftContract, nftId, status: SaleStatusEnum.Unsold })
      try {
        owner = await this.getOwner(nftContract, nftId)
        maxSupply = await contract.methods.MAX_SUPPLY().call()
      } catch (err) {}
      if (nftSaleDetails) {
        isListed = true
        price = parseFloat(nftSaleDetails.price) / Math.pow(10, 18)
        owner = nftSaleDetails.seller
      }
      return { metadata, owner, maxSupply, isListed, price }
    } catch (err) {
      return { metadata: {}, owner: Constants.ZeroAddress, maxSupply: this.configService.get('DEFAULT_MAX_SUPPLY'), isListed, price }
    }
  }

  // FUNCTION TO GET NFT COUNT DETAILS OF AN NFT CONTRACT
  async getNFTMintingDetails(nftContract: string): Promise<any> {
    try {
      const contract = this.getContractConnection(abi.nft, nftContract)
      let totalSupply = 0
      let maxSupply = parseInt(this.configService.get('DEFAULT_MAX_SUPPLY'))
      try {
        totalSupply = parseInt(await contract.methods.totalSupply().call())
        maxSupply = parseInt(await contract.methods.MAX_SUPPLY().call())
      } catch (err) {
        console.log(err)
      }
      return { totalSupply, maxSupply }
    } catch (err) {
      return { totalSupply: 0, maxSupply: parseInt(this.configService.get('DEFAULT_MAX_SUPPLY')) }
    }
  }

  //TODO: CAN BE REPLACE BY DATABASE
  //FUNCTION TO GET LIST OF ALL NFTS OF THE USER
  async getUsersNFTs(address: string, { nftContracts, limit, skip }: FilterDTO): Promise<any> {
    try {
      address = address.toLowerCase()
      const allNftContracts = await getNFTContracts()
      const storeActivityTasks = []
      for (const row of allNftContracts) {
        storeActivityTasks.push(this.storeTransactions(row.nftContract))
      }
      await Promise.all(storeActivityTasks)
      this.logger.log('161', new Date().toString())
      const totalNFTs = await getNFTsByAddressCount(address, nftContracts)
      const nfts = await getNFTsByAddress(address, nftContracts, limit, skip)
      this.logger.log('163', new Date().toString())
      this.logger.log('169', new Date().toString())
      const getMetadataTasks = []
      for (const nft of nfts) {
        getMetadataTasks.push(this.getWrappedMetadata(nft))
      }
      const nftsWithMetadata = await Promise.all(getMetadataTasks)
      this.logger.log('178', new Date().toString())
      return { totalNFTs, nfts: nftsWithMetadata }
    } catch (err) {
      throw new BadRequestException(err)
    }
  }

  // FUNCTION TO STORE ALL TRANSFER TRANSACTIONS
  async storeTransactions(nftContract: string): Promise<any> {
    try {
      nftContract = nftContract.toLowerCase()
      const lastBlockNumber = await getLastBlockNumber(nftContract)
      const baseURL = this.configService.get('ETHERSCAN_BASE_API')
      const apiKey = this.configService.get('ETHERSCAN_API_KEY')
      const url = `${baseURL}/api?module=account&action=tokennfttx&contractaddress=${nftContract}&page=1&offset=1000&sort=desc&apikey=${apiKey}&startblock=${lastBlockNumber}`
      this.logger.log('url', url)
      const { data: transfers } = await this.http.get(url, { headers: {} }).toPromise()
      const transactionDataToInsert = []
      const nftsDataToInsert = []
      const addedNFTIds = []
      const transferTransactions = transfers.result
      this.logger.log('txnd1', JSON.stringify(transferTransactions.length))
      this.logger.log('txnd2', JSON.stringify(transferTransactions[1]))
      this.logger.log('txnd3', JSON.stringify(transferTransactions[2]))
      for (const txn of transferTransactions) {
        if (addedNFTIds.indexOf(txn.tokenID) < 0) {
          addedNFTIds.push(txn.tokenID)
          nftsDataToInsert.push([
            uuid(),
            nftContract,
            txn.tokenID,
            txn.to.toLowerCase(),
            new Date(parseInt(txn.timeStamp) * 1000),
            txn.hash,
            txn.blockNumber,
          ])
        }
        transactionDataToInsert.push([
          uuid(),
          nftContract,
          txn.tokenID,
          txn.from.toLowerCase(),
          txn.to.toLowerCase(),
          new Date(parseInt(txn.timeStamp) * 1000),
          txn.hash,
          txn.blockNumber,
        ])
      }
      this.logger.log('addednftid', JSON.stringify(addedNFTIds))
      if (transactionDataToInsert.length) {
        this.logger.log('transactionDataToInsert', JSON.stringify(transactionDataToInsert.length))
        this.logger.log('nftsDataToInsert', JSON.stringify(nftsDataToInsert.length))
        await Promise.all([storeNFTs(nftsDataToInsert), storeTransferTransactions(transactionDataToInsert)])
      }
      return { message: 'Inserted succesfully' }
    } catch (err) {
      throw new BadRequestException(err)
    }
  }

  //FUNCTION TO GET THE ACTIVITIES OF THE USER
  async getUsersActivities(address: string, limit: number, skip: number): Promise<any> {
    try {
      this.logger.log('220', JSON.stringify(new Date()))
      address = address.toLowerCase()
      const nftContracts = await getNFTContracts()
      const storeActivityTasks = []
      for (const row of nftContracts) {
        storeActivityTasks.push(this.storeTransactions(row.nftContract))
      }
      await Promise.all(storeActivityTasks)
      const userActivities = await getUsersActivities(address, limit, skip)
      const totalActivities = await getUsersActivitiesCount(address)
      let activitiesToSend = []
      const metadataTasks = []
      for (const activity of userActivities) {
        metadataTasks.push(this.getWrappedMetadata(activity))
      }
      activitiesToSend = await Promise.all(metadataTasks)
      return { totalActivities, activities: activitiesToSend }
    } catch (err) {
      throw new BadRequestException(err)
    }
  }

  async getETHPrice(): Promise<any> {
    try {
      const url = `${this.configService.get('COINBASE_API')}?currency=ETH`
      const { data: result } = await this.http.get(url, { headers: {} }).toPromise()
      return result.data.rates.USD
    } catch (err) {
      throw new BadRequestException(err)
    }
  }

  // FUNCTION TO WRAP OTHER DETAILS WITH METADATA
  async getWrappedMetadata(contractDetails: any): Promise<any> {
    try {
      const metadata = await this.getMetadata(contractDetails.nftContract, contractDetails.nftId)
      return {
        ...contractDetails,
        ...metadata,
      }
    } catch (err) {
      this.logger.error('error', err)
      return { ...contractDetails }
    }
  }

  async getWrappedOwner(contractDetails: any): Promise<any> {
    try {
      const owner = await this.getOwner(contractDetails.nftContract, contractDetails.nftId)
      return {
        ...contractDetails,
        owner,
      }
    } catch (err) {
      this.logger.error('error', err)
      return { ...contractDetails, owner: Constants.ZeroAddress }
    }
  }
}
