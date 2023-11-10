export interface SecondarySalesInterface {
  id?: string
  nftContract: string
  nftId: number
  seller: string
  listedAt: Date
  price: string
  fees: number
  authorFees: number
  priceToken?: string
  saleId: number
  boughtAt?: Date
  buyer?: string
  status?: SaleStatusEnum
}
export interface PrimarySalesInterface {
  id?: string
  nftContract: string
  buyer?: string
  boughtAt?: Date
  price: string
  totalUnits: number
  fees: number
  priceToken: string
}

export enum SaleStatusEnum {
  Sold = 1,
  Unsold = 2,
  Removed = 3,
}

export enum OrderByEnum {
  DateTime = 1,
  Price = 2,
}

export enum OrderEnum {
  Ascending = 1,
  Descending = 2,
}
export interface MetaDataInterface {
  nftContract: string
  nftId: number
  attribute: string
  value: string
}
export interface AttributesInterface {
  id: string
  nftContract: string
  attribute: string
  type: AttributeTypeEnum
}

export enum NFTContractTypeEnum {
  Avatar = 1,
  RealState = 2,
  Item = 3,
}

export interface SupportedNFTContractsInterface {
  id: string
  nftContract: string
  nftContractType: NFTContractTypeEnum
  isRemoved: boolean
}

export enum AttributeTypeEnum {
  General = 1,
  Trait = 2,
  Stat = 3,
}
