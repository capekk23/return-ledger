import { describe, expect, it } from 'vitest'
import { parseCsv, suggestMapping } from './csv'
import { normalizeIdentifier, parseNumber, reconcile } from './reconcile'

function mapped(csv: string) {
  const dataset = parseCsv(csv)
  return { dataset, mapping: suggestMapping(dataset.headers) }
}

describe('reconcile', () => {
  it('classifies all supported outcomes deterministically', () => {
    const claims = mapped(`SKU,Qty,Amount,Description
MATCH,2,20,Matched
UNDER,3,30,Short
OVER,2,20,Extra
MISSING,1,11,Absent`)
    const credits = mapped(`Product code,Quantity credited,Credit amount,Description
MATCH,2,20,Matched
UNDER,2,20,Short
OVER,3,30,Extra
OTHER,1,9,Mystery`)

    const results = reconcile(claims.dataset, claims.mapping, credits.dataset, credits.mapping)
    expect(Object.fromEntries(results.map((line) => [line.identifier, line.status]))).toEqual({
      MATCH: 'matched',
      MISSING: 'missing',
      OTHER: 'unmatched',
      OVER: 'over-credited',
      UNDER: 'under-credited',
    })
  })

  it('groups duplicates and normalizes identifiers', () => {
    const claims = mapped('ISBN,Qty,Amount\n978-1 4028-9462-6,1,5\n9781402894626,2,10')
    const credits = mapped('SKU,Qty,Credit amount\n9781402894626,3,15')
    const [line] = reconcile(claims.dataset, claims.mapping, credits.dataset, credits.mapping)
    expect(line).toMatchObject({ identifier: '9781402894626', claimQuantity: 3, claimAmount: 15, status: 'matched' })
  })

  it('uses amount before quantity when discrepancy signals conflict', () => {
    const claims = mapped('SKU,Qty,Amount\nA,4,40')
    const credits = mapped('SKU,Qty,Amount\nA,3,45')
    expect(reconcile(claims.dataset, claims.mapping, credits.dataset, credits.mapping)[0].status).toBe('over-credited')
  })

  it('allows one cent of amount tolerance', () => {
    const claims = mapped('SKU,Qty,Amount\nA,1,10.00')
    const credits = mapped('SKU,Qty,Amount\nA,1,10.01')
    expect(reconcile(claims.dataset, claims.mapping, credits.dataset, credits.mapping)[0].status).toBe('matched')
  })
})

describe('number and identifier normalization', () => {
  it('parses currency and decimal conventions', () => {
    expect(parseNumber('€1,234.56')).toBe(1234.56)
    expect(parseNumber('1.234,56 €')).toBe(1234.56)
    expect(parseNumber('(bad value)')).toBe(0)
  })

  it('normalizes case, spaces and hyphens', () => {
    expect(normalizeIdentifier(' sku- 12-a ')).toBe('SKU12A')
  })
})
