import { describe, expect, it } from 'vitest'
import { pickChip } from '../lib/chips'

const ALL = ['arab', 'black', 'desi', 'white', 'other']

describe('pickChip', () => {
  it('narrows from Any to just the tapped chip', () => {
    expect(pickChip(ALL, ALL, 'arab')).toEqual(['arab'])
  })

  it('adds more chips in a fixed order and removes a picked chip when tapped again', () => {
    const arabAndDesi = pickChip(pickChip(ALL, ALL, 'desi'), ALL, 'arab')
    expect(arabAndDesi).toEqual(['arab', 'desi'])
    expect(pickChip(arabAndDesi, ALL, 'arab')).toEqual(['desi'])
  })

  it('goes back to Any when the last chip is removed or every chip is picked', () => {
    expect(pickChip(['desi'], ALL, 'desi')).toEqual(ALL)
    let selected = ['arab']
    for (const option of ['black', 'desi', 'white', 'other']) selected = pickChip(selected, ALL, option)
    expect(selected).toEqual(ALL)
  })

  it('treats an empty selection as nothing picked yet', () => {
    expect(pickChip([], ALL, 'white')).toEqual(['white'])
  })
})
