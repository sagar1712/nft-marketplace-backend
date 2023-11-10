import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { AttributeTypeEnum, NFTContractTypeEnum, OrderByEnum, OrderEnum } from './marketplace.interface'
import { Type } from 'class-transformer'

export class AddressDTO {
  @ApiProperty()
  @IsString()
  address: string
}
export class FilterDTO {
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  nftContracts: string[]

  @ApiPropertyOptional()
  @IsOptional()
  limit: number

  @ApiPropertyOptional()
  @IsOptional()
  skip: number

  @ApiPropertyOptional()
  @IsOptional()
  orderBy: OrderByEnum

  @ApiPropertyOptional()
  @IsOptional()
  order: OrderEnum

  @ApiPropertyOptional()
  @IsOptional()
  traitCount: number

  @ApiPropertyOptional()
  @IsOptional()
  minPrice: number

  @ApiPropertyOptional()
  @IsOptional()
  maxPrice: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @Type(() => AttributesDTO)
  attributes: AttributesDTO[]
}

export class AddAttributesDto {
  @ApiProperty()
  @IsArray()
  @Type(() => AttributeTypeDto)
  attributes: AttributeTypeDto[]
}
export class AttributeTypeDto {
  @IsString()
  attribute: string

  @IsNumber()
  type: AttributeTypeEnum
}
export class AttributesDTO {
  @IsString()
  attribute: string

  @IsString()
  value: string
}

export class AddSupportedNFTContractDTO {
  @IsString()
  @ApiProperty()
  nftContract: string

  @IsNumber()
  @ApiProperty()
  nftContractType: NFTContractTypeEnum
}
