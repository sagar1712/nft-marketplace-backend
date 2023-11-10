import { IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AddressDTO {
  @ApiProperty()
  @IsString()
  address: string
}
