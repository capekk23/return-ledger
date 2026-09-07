import type {
  ColumnMapping,
  CsvDataset,
  ReconciliationLine,
  ReconciliationOptions,
  ReconciliationStatus,
} from '../types'

interface AggregatedLine {
  identifier: string
  displayIdentifier: string
  title: string
  quantity: number
  amount: number
}

export function normalizeIdentifier(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]/g, '')
}

export function parseNumber(value: string) {
  const input = value.trim().replace(/\s/g, '')
  if (!input) return 0

  const comma = input.lastIndexOf(',')
  const dot = input.lastIndexOf('.')
  let normalized = input.replace(/[^0-9,.-]/g, '')

  if (comma > dot) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else {
    normalized = normalized.replace(/,/g, '')
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function aggregate(dataset: CsvDataset, mapping: ColumnMapping) {
  const lines = new Map<string, AggregatedLine>()

  for (const row of dataset.rows) {
    const rawIdentifier = row[mapping.identifier] ?? ''
    const identifier = normalizeIdentifier(rawIdentifier)
    if (!identifier) continue

    const existing = lines.get(identifier)
    const quantity = Math.abs(parseNumber(row[mapping.quantity] ?? '0'))
    const amount = Math.abs(parseNumber(row[mapping.amount] ?? '0'))
    const title = mapping.title ? (row[mapping.title] ?? '').trim() : ''

    if (existing) {
      existing.quantity += quantity
      existing.amount += amount
      if (!existing.title && title) existing.title = title
    } else {
      lines.set(identifier, {
        identifier,
        displayIdentifier: rawIdentifier.trim(),
        title,
        quantity,
        amount,
      })
    }
  }

  return lines
}

function statusFor(
  hasClaim: boolean,
  hasCredit: boolean,
  quantityDelta: number,
  amountDelta: number,
  tolerance: number,
): ReconciliationStatus {
  if (hasClaim && !hasCredit) return 'missing'
  if (!hasClaim && hasCredit) return 'unmatched'
  if (Math.abs(amountDelta) > tolerance) return amountDelta < 0 ? 'under-credited' : 'over-credited'
  if (quantityDelta !== 0) return quantityDelta < 0 ? 'under-credited' : 'over-credited'
  return 'matched'
}

export function reconcile(
  claims: CsvDataset,
  claimMapping: ColumnMapping,
  credits: CsvDataset,
  creditMapping: ColumnMapping,
  options: ReconciliationOptions = {},
): ReconciliationLine[] {
  const tolerance = options.amountTolerance ?? 0.01
  const claimLines = aggregate(claims, claimMapping)
  const creditLines = aggregate(credits, creditMapping)
  const identifiers = [...new Set([...claimLines.keys(), ...creditLines.keys()])].sort()

  return identifiers.map((identifier) => {
    const claim = claimLines.get(identifier)
    const credit = creditLines.get(identifier)
    const claimQuantity = claim?.quantity ?? 0
    const creditQuantity = credit?.quantity ?? 0
    const claimAmount = claim?.amount ?? 0
    const creditAmount = credit?.amount ?? 0
    const quantityDelta = creditQuantity - claimQuantity
    const amountDelta = Number((creditAmount - claimAmount).toFixed(2))

    return {
      identifier,
      displayIdentifier: claim?.displayIdentifier || credit?.displayIdentifier || identifier,
      title: claim?.title || credit?.title || 'Untitled item',
      claimQuantity,
      creditQuantity,
      claimAmount,
      creditAmount,
      quantityDelta,
      amountDelta,
      status: statusFor(Boolean(claim), Boolean(credit), quantityDelta, amountDelta, tolerance),
    }
  })
}
