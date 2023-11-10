import { Constants, getCountBy, getManyBy, getSingleBy } from 'helpers'
import { Repository } from 'typeorm'
import { Attributes, PrimarySales, SecondarySales, SupportedTokenContracts } from './marketplace.entity'
import { OrderByEnum, OrderEnum, SaleStatusEnum } from './marketplace.interface'
import { format } from '@scaleleap/pg-format'
import { FilterDTO } from './marketplace.dto'
import { dataSource } from 'databases/data-source'

export const getSecondarySaleBy = getSingleBy(SecondarySales)
export const getSecondarySalesBy = getManyBy(SecondarySales)
export const getSecondarySaleCountBy = getCountBy(SecondarySales)
export const getSecondarySalesCountBy = getCountBy(SecondarySales)
export const getPrimarySaleBy = getSingleBy(PrimarySales)
export const getPrimarySalesBy = getManyBy(PrimarySales)
export const getSupportedNFTContractsBy = getManyBy(SupportedTokenContracts)
export const getSupportedNFTContractBy = getSingleBy(SupportedTokenContracts)
export const getAttributeBy = getSingleBy(Attributes)
export const getAttributseBy = getManyBy(Attributes)
/**** REPOSITORIES *****/

/**** SECONDARY SALE LIST ****/
export async function getStoredListedSecondarySale(
  { nftContracts, order, orderBy, limit, skip, minPrice, maxPrice, attributes, traitCount }: FilterDTO,
  status: SaleStatusEnum,
  address: string
) {
  let subString = 'true'
  if (nftContracts && nftContracts.length) {
    const nftContractsString = `'${nftContracts.join("','")}'`
    subString = `ss."nftContract" IN (${nftContractsString.toLowerCase()})`
  }

  let orderByQuery = 'listedAt'
  if (orderBy == OrderByEnum.Price) {
    orderByQuery = 'price'
  }

  if (order == OrderEnum.Ascending) {
    orderByQuery = `"${orderByQuery}" asc`
  } else {
    orderByQuery = `"${orderByQuery}" desc`
  }

  let query2 = `
    SELECT
      (ARRAY_AGG(ss."nftContract"))[1] as "nftContract",
      ss."nftId" as "nftId",
      ROUND((CAST((ARRAY_AGG(ss."price"))[1] as FLOAT) / '1000000000000000000') :: numeric, '4') as "price",
      (ARRAY_AGG(ss."seller"))[1] as "seller",
      (ARRAY_AGG(ss."buyer"))[1] as "buyer",
      (ARRAY_AGG(ss."boughtAt"))[1] as "boughtAt",
      (ARRAY_AGG(ss."saleId"))[1] as "saleId",
      (ARRAY_AGG(ss."listedAt"))[1] as "listedAt",
      (ARRAY_AGG(ss."fees"))[1] as "fees",
      (ARRAY_AGG(ss."authorFees"))[1] as "authorFees",
      (ARRAY_AGG(ss."priceToken"))[1] as "priceToken",
      CONCAT('{', string_agg(CONCAT('"', m."attribute", '":"', m."value", '"'),','), '}') as "metadata"
    FROM
      "secondary_sales" as ss
    LEFT JOIN 
      metadata as m 
    ON
      (ss."nftContract" = m."nftContract" AND ss."nftId" = m."nftId")
    WHERE
      ${subString}
    AND
      ss."status" = $1
  `

  /*let query = `
    SELECT
      "nftContract",
      "nftId",
      ROUND((CAST("price" as FLOAT) / '1000000000000000000') :: numeric, '4') as "price",
      "seller",
      "buyer",
      "boughtAt",
      "saleId",
      "listedAt",
      "fees",
      "authorFees",
      "priceToken"
    FROM
      "secondary_sales"
    WHERE
      ${subString} AND
      "status" = $1`*/
  if (address != Constants.ZeroAddress) {
    query2 = `${query2} AND ss."seller" = '${address.toLowerCase()}'`
  }
  if (minPrice >= 0) {
    query2 = `${query2} AND ss."price" >= ${minPrice * Math.pow(10, 18)}`
  }
  if (maxPrice >= 0) {
    query2 = `${query2} AND ss."price" <= ${maxPrice * Math.pow(10, 18)}`
  }
  let metadataSubstring = ''
  if (traitCount >= 0) {
    // metadataSubstring = `${metadataSubstring} AND "attribute" = 'traitCount' AND "value" = '${traitCount}' `
    query2 = `${query2} AND (m."attribute" = 'traitCount' AND m."value" = '${traitCount}')`
  }
  if (attributes && attributes.length) {
    // eslint-disable-next-line prefer-const
    for (let [index, row] of attributes.entries()) {
      row = JSON.parse(row.toString())
      // metadataSubstring = `${metadataSubstring} AND "attribute" = '${row.attribute}' AND "value" = '${row.value}' `
      if (index == attributes.length - 1) {
        metadataSubstring += `(m."attribute" = '${row.attribute}' AND m."value" = ANY('{${row.value}}'))`
      } else {
        metadataSubstring += `(m."attribute" = '${row.attribute}' AND m."value" = ANY('{${row.value}}')) OR `
      }
    }
  }

  query2 = metadataSubstring != '' ? `${query2} AND ${metadataSubstring}` : query2

  /*query = `
    SELECT 
      "q1".*,
      CONCAT('{', "q2"."metadata", '}') as "metadata"
    FROM
      ( ${query} ) as "q1"
    LEFT JOIN
      (
        SELECT 
          "nftContract", 
          "nftId", 
          string_agg(CONCAT('"', "attribute", '":"', "value", '"'),',') as "metadata"
        FROM 
          "metadata"
        WHERE 
          ${metadataSubstring} AND
          "attribute" != 'nftId'
        group by 
          "nftContract",
          "nftId"
      ) as "q2"
      ON 
        "q1"."nftContract" = "q2"."nftContract" AND
        "q1"."nftId" = "q2"."nftId"`*/
  // query = `${query} ORDER BY ${orderByQuery} LIMIT $2 OFFSET $3`
  query2 = `${query2} GROUP BY ss."nftId" , ss."nftContract" ORDER BY ${orderByQuery} LIMIT $2 OFFSET $3`
  console.log('getStoredListedSecondarySale', query2)
  const result = await (await dataSource).query(query2, [status, limit, skip])
  return result
}

/**** SECONDARY SALE COUNT ****/
export async function getSecondarySalesCount(
  { nftContracts, minPrice, maxPrice, attributes, traitCount }: FilterDTO,
  status: SaleStatusEnum,
  address: string
) {
  let subString = 'true'
  if (nftContracts && nftContracts.length) {
    const nftContractsString = `'${nftContracts.join("','")}'`
    subString = `ss."nftContract" IN (${nftContractsString.toLowerCase()})`
  }

  let query2 = `
    SELECT COUNT(*) as "totalSales" FROM (SELECT
      COUNT(*) as "totalSales"
    FROM
      "secondary_sales" as ss
    LEFT JOIN 
      metadata as m 
    ON
      (ss."nftContract" = m."nftContract" AND ss."nftId" = m."nftId")
    WHERE
      ${subString}
    AND
      ss."status" = $1
  `

  /*let query = `
    SELECT
      "nftContract",
      "nftId",
      ROUND((CAST("price" as FLOAT) / '1000000000000000000') :: numeric, '4') as "price",
      "seller",
      "buyer",
      "boughtAt",
      "saleId",
      "listedAt",
      "fees",
      "authorFees",
      "priceToken"
    FROM
      "secondary_sales"
    WHERE
      ${subString} AND
      "status" = $1`*/
  if (address != Constants.ZeroAddress) {
    query2 = `${query2} AND ss."seller" = '${address.toLowerCase()}'`
  }
  if (minPrice >= 0) {
    query2 = `${query2} AND ss."price" >= ${minPrice * Math.pow(10, 18)}`
  }
  if (maxPrice >= 0) {
    query2 = `${query2} AND ss."price" <= ${maxPrice * Math.pow(10, 18)}`
  }
  let metadataSubstring = ''
  if (traitCount >= 0) {
    // metadataSubstring = `${metadataSubstring} AND "attribute" = 'traitCount' AND "value" = '${traitCount}' `
    query2 = `${query2} AND (m."attribute" = 'traitCount' AND m."value" = '${traitCount}')`
  }
  if (attributes && attributes.length) {
    // eslint-disable-next-line prefer-const
    for (let [index, row] of attributes.entries()) {
      row = JSON.parse(row.toString())
      // metadataSubstring = `${metadataSubstring} AND "attribute" = '${row.attribute}' AND "value" = '${row.value}' `
      if (index == attributes.length - 1) {
        metadataSubstring += `(m."attribute" = '${row.attribute}' AND m."value" = ANY('{${row.value}}'))`
      } else {
        metadataSubstring += `(m."attribute" = '${row.attribute}' AND m."value" = ANY('{${row.value}}')) OR `
      }
    }
  }

  query2 = metadataSubstring != '' ? `${query2} AND ${metadataSubstring}` : query2

  /*query = `
    SELECT 
      "q1".*,
      CONCAT('{', "q2"."metadata", '}') as "metadata"
    FROM
      ( ${query} ) as "q1"
    LEFT JOIN
      (
        SELECT 
          "nftContract", 
          "nftId", 
          string_agg(CONCAT('"', "attribute", '":"', "value", '"'),',') as "metadata"
        FROM 
          "metadata"
        WHERE 
          ${metadataSubstring} AND
          "attribute" != 'nftId'
        group by 
          "nftContract",
          "nftId"
      ) as "q2"
      ON 
        "q1"."nftContract" = "q2"."nftContract" AND
        "q1"."nftId" = "q2"."nftId"`*/
  // query = `${query} ORDER BY ${orderByQuery} LIMIT $2 OFFSET $3`
  query2 = `${query2} GROUP BY ss."nftId", ss."nftContract") as innerquery`
  console.log('getSecondarySalesCount', query2)
  const [result] = await (await dataSource).query(query2, [status])
  return result.totalSales
}

/**** PREVIOUS SALES OF NFT ****/
export async function getPreviousSecondarySales(
  limit: number,
  skip: number,
  orderBy: OrderByEnum,
  order: OrderEnum,
  nftContract: string,
  nftId: number
) {
  let orderByQuery = 'listedAt'
  if (orderBy == OrderByEnum.Price) {
    orderByQuery = 'price'
  }

  if (order == OrderEnum.Ascending) {
    orderByQuery = `"${orderByQuery}" asc`
  } else {
    orderByQuery = `"${orderByQuery}" desc`
  }
  const query = `
    SELECT
      ROUND((CAST("price" as FLOAT) / '1000000000000000000') :: numeric, '4') as "price",
      "seller",
      "buyer",
      "boughtAt",
      "saleId",
      "listedAt",
      "status",
      "priceToken",
      "fees",
      "authorFees"
    FROM
      "secondary_sales"
    WHERE
      "nftContract" = $1 AND
      "nftId" = $2 AND 
      "status" = $5
    ORDER BY
      ${orderByQuery}
    LIMIT $3 OFFSET $4`
  console.log('query', query)
  const result = await (await dataSource).query(query, [nftContract, nftId, limit, skip, SaleStatusEnum.Sold])
  return result
}

/****DASHBOARD DATA QUERIES ****/

export async function getSecondarySaleDashboardDataFromDB(nftContracts: string[]) {
  let subString = 'true'
  if (nftContracts && nftContracts.length) {
    const nftContractsString = `'${nftContracts.join("','")}'`
    subString = `"nftContract" IN (${nftContractsString.toLowerCase()})`
  }
  const query = `
    SELECT
      SUM(CASE WHEN "boughtAt" >= NOW() - interval '1' DAY AND "status" = $1 then "price" else '0' end) as "lastTwentyFourHoursVolume",
      SUM(CASE WHEN "boughtAt" >= NOW() - interval '7' DAY AND "status" = $1 then "price" else '0' end) as "lastSevenDaysVolume",
      SUM(CASE WHEN "boughtAt" >= NOW() - interval '30' DAY AND "status" = $1 then "price" else '0' end) as "lastThirtyDaysVolume",
      COUNT(CASE WHEN "boughtAt" >= NOW() - interval '1' DAY AND "status" = $1 then "id" end) as "lastTwentyFourHoursSold",
      COUNT(CASE WHEN "boughtAt" >= NOW() - interval '7' DAY AND "status" = $1 then "id" end) as "lastSevenDaysSold",
      COUNT(CASE WHEN "boughtAt" >= NOW() - interval '30' DAY AND "status" = $1 then "id" end) as "lastThirtyDaysSold",
      COUNT(CASE WHEN "listedAt" >= NOW() - interval '1' DAY AND "status" = $2 then "id" end) as "lastTwentyFourHoursUnsold",
      COUNT(CASE WHEN "listedAt" >= NOW() - interval '7' DAY AND "status" = $2 then "id" end) as "lastSevenDaysUnsold",
      COUNT(CASE WHEN "listedAt" >= NOW() - interval '30' DAY AND "status" = $2 then "id" end) as "lastThirtyDaysUnsold"
    FROM
      "secondary_sales"
    WHERE
      ${subString}`
  console.log('query', query)
  const [result] = await (await dataSource).query(query, [SaleStatusEnum.Sold, SaleStatusEnum.Unsold])
  return result
}

export async function getPrimarySaleDashboardDataFromDB(nftContracts: string[]) {
  let subString = 'true'
  if (nftContracts && nftContracts.length) {
    const nftContractsString = `'${nftContracts.join("','")}'`
    subString = `"nftContract" IN (${nftContractsString.toLowerCase()})`
  }
  const query = `
    SELECT
      SUM(CASE WHEN "boughtAt" >= NOW() - interval '1' DAY then "price" else '0' end) as "lastTwentyFourHoursVolume",
      SUM(CASE WHEN "boughtAt" >= NOW() - interval '7' DAY then "price" else '0' end) as "lastSevenDaysVolume",
      SUM(CASE WHEN "boughtAt" >= NOW() - interval '30' DAY then "price" else '0' end) as "lastThirtyDaysVolume",
      SUM(CASE WHEN "boughtAt" >= NOW() - interval '1' DAY then "totalUnits" else '0' end) as "lastTwentyFourHoursSold",
      SUM(CASE WHEN "boughtAt" >= NOW() - interval '7' DAY then "totalUnits" else '0' end) as "lastSevenDaysSold",
      SUM(CASE WHEN "boughtAt" >= NOW() - interval '30' DAY then "totalUnits" else '0' end) as "lastThirtyDaysSold",
      COUNT(CASE WHEN "boughtAt" >= NOW() - interval '1' DAY then "id" end) as "lastTwentyFourHoursSale",
      COUNT(CASE WHEN "boughtAt" >= NOW() - interval '7' DAY then "id" end) as "lastSevenDaysSale",
      COUNT(CASE WHEN "boughtAt" >= NOW() - interval '30' DAY then "id" end) as "lastThirtyDaysSale"
    FROM
      "primary_sales"
    WHERE
      ${subString}`
  console.log('query', query)
  const [result] = await (await dataSource).query(query, [])
  return result
}

/*** METADATA QUERIES ****/
export async function storeMetadataWithQuery(values: any) {
  const sql = `
    INSERT INTO 
      "metadata" 
      ("id", "nftContract", "nftId", "attribute", "value") 
    VALUES
      %L
    ON CONFLICT ("nftContract","nftId","attribute") 
    DO UPDATE SET "value" = EXCLUDED.value`

  const result = await (await dataSource).query(format(sql, values))
  return result
}

export async function removeExistingMetadata(nftContract: string, nftId: number) {
  const sql = `
    DELETE FROM 
      "metadata" 
    WHERE
      "nftContract" = $1 AND
      "nftId" = $2`

  const result = await (await dataSource).query(sql, [nftContract, nftId])
  return result
}

/**** ATTRIBUTES QUERIES */

export async function removeExistingAttributes(nftContract: string) {
  const sql = `
    DELETE FROM 
      "attributes" 
    WHERE
      "nftContract" = $1`

  const result = await (await dataSource).query(sql, [nftContract])
  return result
}

export async function storeAttributesWithQuery(values: any) {
  const sql = `
    INSERT INTO 
      "attributes" 
      ("id", "nftContract", "attribute", "type") 
    VALUES
      %L
    ON CONFLICT ("nftContract","attribute") 
    DO UPDATE SET "type" = EXCLUDED.type`

  const result = await (await dataSource).query(format(sql, values))
  return result
}
/**** FILTER QUERIES ****/
export async function getNFTContractAttributes(nftContract: string) {
  const subString = `"attribute" NOT IN ('name','description','image','traitCount')`
  const query = `
    SELECT
      attribute,
      value
    FROM
      "metadata"
    WHERE
      "nftContract" = $1 AND
      ${subString}`
  console.log('query', query)
  const result = await (await dataSource).query(query, [nftContract])
  return result
}

/**** OTHER QUERIES ****/
export async function getNFTContracts() {
  const query = `
    SELECT
     distinct "nftContract"
    FROM
      "primary_sales"`
  console.log('query', query)
  const result = await (await dataSource).query(query, [])
  return result
}

export async function getData(table: string) {
  const sql = `
          SELECT 
              *
          FROM
              "${table}"
          ORDER BY
            "created" desc`

  const result = await (await dataSource).query(sql, [])
  return result
}
