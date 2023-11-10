import { Constants, CreatedModified } from '../../helpers'
import { Entity, Column, PrimaryColumn, Unique } from 'typeorm'
import {
  SecondarySalesInterface,
  SaleStatusEnum,
  PrimarySalesInterface,
  MetaDataInterface,
  NFTContractTypeEnum,
  SupportedNFTContractsInterface,
  AttributesInterface,
  AttributeTypeEnum,
} from './marketplace.interface'
@Entity()
export class SecondarySales extends CreatedModified implements SecondarySalesInterface {
  @PrimaryColumn()
  id: string

  @Column({
    transformer: {
      to: (value: string) => value.toLowerCase(),
      from: (value: string) => value,
    },
  })
  nftContract: string

  @Column({ nullable: true, type: 'bigint' })
  nftId: number

  @Column({
    transformer: {
      to: (value: string) => value.toLowerCase(),
      from: (value: string) => value,
    },
  })
  seller: string

  @Column({ nullable: true })
  listedAt: Date

  @Column({ type: 'bigint' })
  price: string

  @Column({ nullable: true })
  fees: number

  @Column({ nullable: true })
  authorFees: number

  @Column({
    transformer: {
      to: (value: string) => value.toLowerCase(),
      from: (value: string) => value,
    },
  })
  priceToken: string

  @Column({ nullable: true })
  saleId: number

  @Column({ nullable: true })
  boughtAt: Date

  @Column({
    default: Constants.ZeroAddress,
    transformer: {
      to: (value: string) => (value ? value.toLowerCase() : Constants.ZeroAddress.toLowerCase()),
      from: (value: string) => value,
    },
  })
  buyer: string

  @Column({ nullable: true })
  status: SaleStatusEnum
}
@Entity()
export class PrimarySales extends CreatedModified implements PrimarySalesInterface {
  @PrimaryColumn()
  id: string

  @Column({
    transformer: {
      to: (value: string) => value.toLowerCase(),
      from: (value: string) => value,
    },
  })
  nftContract: string

  @Column({
    default: Constants.ZeroAddress,
    transformer: {
      to: (value: string) => (value ? value.toLowerCase() : Constants.ZeroAddress.toLowerCase()),
      from: (value: string) => value,
    },
  })
  buyer: string

  @Column({ nullable: true })
  boughtAt: Date

  @Column({ type: 'bigint' })
  price: string

  @Column({ nullable: true })
  totalUnits: number

  @Column({ nullable: true })
  fees: number

  @Column({
    transformer: {
      to: (value: string) => value.toLowerCase(),
      from: (value: string) => value,
    },
  })
  priceToken: string
}

@Entity()
@Unique(['nftContract', 'nftId', 'attribute'])
export class Metadata extends CreatedModified implements MetaDataInterface {
  @PrimaryColumn()
  id: string

  @Column({
    transformer: {
      to: (value: string) => value.toLowerCase(),
      from: (value: string) => value,
    },
  })
  nftContract: string

  @Column({ type: 'bigint' })
  nftId: number

  @Column()
  attribute: string

  @Column()
  value: string
}

@Entity()
@Unique(['nftContract', 'attribute'])
export class Attributes extends CreatedModified implements AttributesInterface {
  @PrimaryColumn()
  id: string

  @Column({
    transformer: {
      to: (value: string) => value.toLowerCase(),
      from: (value: string) => value,
    },
  })
  nftContract: string

  @Column()
  attribute: string

  @Column()
  type: AttributeTypeEnum
}

@Entity()
@Unique(['nftContract'])
export class SupportedTokenContracts extends CreatedModified implements SupportedNFTContractsInterface {
  @PrimaryColumn()
  id: string

  @Column({
    transformer: {
      to: (value: string) => value.toLowerCase(),
      from: (value: string) => value,
    },
  })
  nftContract: string

  @Column()
  nftContractType: NFTContractTypeEnum

  @Column()
  isRemoved: boolean
}
