import { NestFactory } from '@nestjs/core'
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { setupSwagger } from './swagger'
import * as compression from 'compression'
// import * as RateLimit from 'express-rate-limit'
import * as helmet from 'helmet'
import * as morgan from 'morgan'
import { ValidationPipe } from '@nestjs/common'
import * as path from 'path'
import { ConfigService } from '@nestjs/config'
require('newrelic')
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), {
    cors: true,
    logger: ['error', 'warn', 'debug', 'log'],
  })
  app.enable('trust proxy') // only if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
  app.use(helmet.default())
  app.use(compression())
  app.use(morgan('combined'))
  const configService =  new ConfigService()
  setupSwagger(app)

  app.setBaseViewsDir(path.join(__dirname, '..', 'templates'))
  app.setViewEngine('ejs')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      dismissDefaultMessages: false,
      validationError: {
        target: false,
      },
    })
  )
  await app.listen(configService.get('PORT'))
  console.log('Server running at port', configService.get('PORT'))
}
bootstrap()
