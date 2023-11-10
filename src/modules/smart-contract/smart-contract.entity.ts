import { CreatedModified } from '../../helpers'
import { Entity, Column, PrimaryColumn, Unique, Index } from 'typeorm'
import { ContractEnum, SmartContractConfigsInterface, TokensInterface, TransferTransactionsInterface } from './smart-contract.interface'

@Entity()
export class SmartContractConfigs extends CreatedModified implements SmartContractConfigsInterface {
  @PrimaryColumn()
  id: string

  @Column({ nullable: true })
  lastBlockNumber: number

  @Column({ nullable: true })
  contract: ContractEnum
}
@Entity()
@Unique(['nftContract', 'nftId', 'transactionHash', 'from', 'to', 'blockNumber', 'transactionTime'])
export class TransferTransactions extends CreatedModified implements TransferTransactionsInterface {
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

  @Index()
  @Column({
    transformer: {
      to: (value: string) => value.toLowerCase(),
      from: (value: string) => value,
    },
  })
  from: string

  @Index()
  @Column({
    transformer: {
      to: (value: string) => value.toLowerCase(),
      from: (value: string) => value,
    },
  })
  to: string

  @Column({ nullable: true })
  transactionTime: Date

  @Column({ nullable: true })
  transactionHash: string

  @Column({ nullable: true })
  blockNumber: number
}

@Entity()
@Unique(['nftContract', 'nftId'])
export class Tokens extends CreatedModified implements TokensInterface {
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

  @Index()
  @Column({
    transformer: {
      to: (value: string) => value.toLowerCase(),
      from: (value: string) => value,
    },
  })
  owner: string

  @Column({ nullable: true })
  transactionTime: Date

  @Column({ nullable: true })
  transactionHash: string

  @Column({ nullable: true })
  blockNumber: number
}
