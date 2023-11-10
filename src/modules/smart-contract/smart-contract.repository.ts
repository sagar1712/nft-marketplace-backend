import { format } from '@scaleleap/pg-format'
import { getSingleBy } from 'helpers'
import {SmartContractConfigs } from './smart-contract.entity'
import { dataSource } from 'databases/data-source'
export const getSmartContractConfigs = getSingleBy(SmartContractConfigs)

export async function getLastBlockNumber(nftContract: string) {
  const sql = `
    SELECT 
      MAX("blockNumber") as "lastBlockNumber" 
    FROM
      "transfer_transactions" 
    WHERE
      "nftContract" = $1`
  const [result] = await (await dataSource).query(sql, [nftContract])
  return result.lastBlockNumber || 0
}

export async function storeTransferTransactions(values: any) {
  const sql = `
    INSERT INTO 
      "transfer_transactions" 
      ("id", "nftContract", "nftId", "from", "to", "transactionTime", "transactionHash", "blockNumber") 
    VALUES
      %L
    ON CONFLICT ("nftContract", "nftId", "transactionHash", "from", "to", "blockNumber", "transactionTime") 
    DO NOTHING`

  const result = await (await dataSource).query(format(sql, values))
  return result
}

export async function storeNFTs(values: any) {
  const sql = `
    INSERT INTO 
      "tokens" 
      ("id", "nftContract", "nftId", "owner", "transactionTime", "transactionHash", "blockNumber") 
    VALUES
      %L
    ON CONFLICT ("nftContract","nftId") 
    DO UPDATE 
    SET 
      "owner" = EXCLUDED."owner", 
      "transactionTime" = EXCLUDED."transactionTime", 
      "transactionHash" = EXCLUDED."transactionHash",
      "blockNumber" = EXCLUDED."blockNumber"`
  const result = await (await dataSource).query(format(sql, values))
  return result
}

export async function getUsersActivities(address: string, limit: number, skip: number) {
  const sql = `
    SELECT 
      "nftContract",
      "nftId",
      "from",
      "to",
      "transactionTime"
    FROM 
      "transfer_transactions" 
    WHERE
      "from" = $1 OR "to" = $1
    ORDER BY
      "transactionTime" desc
    LIMIT $2 OFFSET $3 `

  const result = await (await dataSource).query(sql, [address, limit, skip])
  return result
}

export async function getNFTsByAddress(address: string, nftContracts: string[], limit: number, skip: number) {
  let subString = 'true'
  if (nftContracts && nftContracts.length) {
    const nftContractsString = `'${nftContracts.join("','")}'`
    subString = `"nftContract" IN (${nftContractsString.toLowerCase()})`
  }
  const sql = `
    SELECT 
      "nftContract",
      "nftId",
      "transactionTime"
    FROM 
      "tokens" 
    WHERE
      ${subString} AND
      "owner" = $1
    ORDER BY
      "transactionTime" desc
    LIMIT $2 OFFSET $3 `

  const result = await (await dataSource).query(sql, [address, limit, skip])
  return result
}

export async function getNFTsByAddressCount(address: string, nftContracts: string[]) {
  let subString = 'true'
  if (nftContracts && nftContracts.length) {
    const nftContractsString = `'${nftContracts.join("','")}'`
    subString = `"nftContract" IN (${nftContractsString.toLowerCase()})`
  }
  const sql = `
    SELECT 
      COUNT(*) as "totalNFTs"
    FROM 
      "tokens" 
    WHERE
      ${subString} AND
      "owner" = $1`

  const [result] = await (await dataSource).query(sql, [address])
  return result.totalNFTs || 0
}

export async function getUsersActivitiesCount(address: string) {
  const sql = `
    SELECT 
      COUNT(*) as "totalActivities"
    FROM 
      "transfer_transactions" 
    WHERE
      "from" = $1 OR "to" = $1`

  const [result] = await (await dataSource).query(sql, [address])
  return result.totalActivities || 0
}
