export type CsvRow = Record<string, string>

export interface CsvDataset {
  name: string
  headers: string[]
  rows: CsvRow[]
}

export interface ColumnMapping {
  identifier: string
  quantity: string
  amount: string
  title: string
}

export type ReconciliationStatus =
  | 'matched'
  | 'missing'
  | 'under-credited'
  | 'over-credited'
  | 'unmatched'

export interface ReconciliationLine {
  identifier: string
  displayIdentifier: string
  title: string
  claimQuantity: number
  creditQuantity: number
  claimAmount: number
  creditAmount: number
  quantityDelta: number
  amountDelta: number
  status: ReconciliationStatus
}

export interface ReconciliationOptions {
  amountTolerance?: number
}
