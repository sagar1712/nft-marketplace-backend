/* eslint-disable @typescript-eslint/ban-types */
import { dataSource } from './databases/data-source'
import { ObjectType, EntitySchema, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export function getSingleBy<T = any>(
  table: ObjectType<T> | EntitySchema<T>
): (filter: Partial<T>, columns?: any[], sortings?) => Promise<T> {
  return async (filter, columns?, sortings?) => {
    const condition: any = {
      where: filter,
    }
    if (columns?.length > 0) {
      condition.select = columns
    }
    if (sortings) {
      condition.order = sortings
    }
    const dataSourceFinal = await dataSource
    const repository = dataSourceFinal.getRepository(table)
    // console.log('repos', repository)
    return (await repository.findOne(condition)) || undefined
  }
}

export function getManyBy<T = any>(
  table: ObjectType<T> | EntitySchema<T>
): (filter: Partial<T>, columns?: any[], sortings?) => Promise<T[]> {
  return async (filter, columns?, sortings?) => {
    const condition: any = { where: filter }
    if (columns?.length > 0) {
      condition.select = columns
    }
    if (sortings) {
      condition.order = sortings
    }
    const dataSourceFinal = await dataSource
    const repository = dataSourceFinal.getRepository(table)
    return await repository.find(condition)
  }
}

export function getCountBy<T = any>(table: ObjectType<T> | EntitySchema<T>): (filter: Partial<T>) => Promise<number> {
  return async (filter) => {
    const dataSourceFinal = await dataSource
    const repository = dataSourceFinal.getRepository(table)
    return await repository.count(filter)
  }
}

export enum Constants {
  ZeroAddress = '0x0000000000000000000000000000000000000000',
  InvalidArrayLength = -1,
  LargeLimit = 1000000,
}

export function capitalizeFirstLetter(str: string) {
  const words = str.split(' ')
  for (let i = 0; i < words.length; i++) {
    const j = words[i].toLocaleLowerCase().charAt(0).toUpperCase()
    words[i] = j + words[i].substr(1)
  }
  return words.join(' ')
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function decoratorBundle(validators: any[]) {
  return function () {
    return function (object: object, propertyName: string) {
      for (const validator of validators) new validator(object, propertyName)
    }
  }
}

export abstract class CreatedModified {
  @CreateDateColumn()
  created!: Date

  @UpdateDateColumn()
  modified!: Date
}
