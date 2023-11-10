import { Controller, Get, Res } from '@nestjs/common'
import { AppService } from './app.service'
import { Response } from 'express'
import * as path from 'path'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(@Res() res: Response) {
    res.sendFile(path.resolve(__dirname + './../index.html'))
  }
}
