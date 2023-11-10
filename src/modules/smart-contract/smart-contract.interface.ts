export interface SmartContractConfigsInterface {
  id: string
  contract: ContractEnum
  lastBlockNumber: number
}

export enum ContractEnum {
  PrimarySale = 1,
  SecondarySale = 2,
}

export enum TransactionStatusEnum {
  successful = 1,
  reverted = 2,
}

export interface TXN {
  transactionHash: string
  status: TransactionStatusEnum
  message: string
}

export enum SecondarySaleEvents {
  AddedToMarketplace = 'AddedToMarketplace',
  RemovedFromMarketplace = 'RemovedFromMarketplace',
  PriceUpdated = 'PriceUpdated',
  Buy = 'Buy',
}
export interface TransferTransactionsInterface {
  id: string
  nftContract: string
  nftId: number
  from: string
  to: string
  transactionTime: Date
  transactionHash: string
  blockNumber: number
}
export interface TokensInterface {
  id: string
  nftContract: string
  nftId: number
  owner: string
  transactionTime: Date
  transactionHash: string
}
