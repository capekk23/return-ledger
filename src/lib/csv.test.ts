import { describe, expect, it } from 'vitest'
import { parseCsv, suggestMapping, toCsv } from './csv'

describe('parseCsv', () => {
  it('handles quoted commas, escaped quotes, and CRLF', () => {
    const data = parseCsv('SKU,Description,Qty\r\nA-1,"Box, large",2\r\nA-2,"A ""quoted"" item",1\r\n')
    expect(data.headers).toEqual(['SKU', 'Description', 'Qty'])
    expect(data.rows).toHaveLength(2)
    expect(data.rows[0].Description).toBe('Box, large')
    expect(data.rows[1].Description).toBe('A "quoted" item')
  })

  it('detects semicolon and tab delimiters', () => {
    expect(parseCsv('SKU;Qty;Amount\nA;2;4,50').rows[0].Amount).toBe('4,50')
    expect(parseCsv('SKU\tQty\tAmount\nA\t2\t4.50').headers).toEqual(['SKU', 'Qty', 'Amount'])
  })
})

describe('suggestMapping', () => {
  it('recognises common custom headings', () => {
    expect(suggestMapping(['Product Code', 'Quantity Credited', 'Net Value', 'Item Name'])).toEqual({
      identifier: 'Product Code',
      quantity: 'Quantity Credited',
      amount: 'Net Value',
      title: 'Item Name',
    })
  })
})

describe('toCsv', () => {
  it('escapes values correctly', () => {
    expect(toCsv([{ sku: 'A-1', note: 'Missing, supplier said "no"' }])).toBe(
      'sku,note\nA-1,"Missing, supplier said ""no"""',
    )
  })
})
