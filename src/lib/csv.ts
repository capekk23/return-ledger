import type { CsvDataset, CsvRow, ColumnMapping } from '../types'

const CANDIDATES: Record<keyof ColumnMapping, string[]> = {
  identifier: ['isbn13', 'isbn10', 'isbn', 'sku', 'productcode', 'itemcode', 'itemid', 'ean', 'upc', 'barcode', 'code'],
  quantity: ['quantityreturned', 'quantitycredited', 'returnqty', 'creditqty', 'qtyreturned', 'qtycredited', 'quantity', 'qty', 'units', 'count'],
  amount: ['expectedcredit', 'creditamount', 'lineamount', 'totalamount', 'amount', 'value', 'credit', 'total', 'net'],
  title: ['booktitle', 'producttitle', 'description', 'productname', 'itemname', 'title', 'name'],
}

function normalizedHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function detectDelimiter(text: string) {
  const sample = text.split(/\r?\n/).find((line) => line.trim()) ?? ''
  const delimiters = [',', ';', '\t']
  return delimiters.reduce((best, delimiter) => {
    const count = sample.split(delimiter).length
    return count > best.count ? { delimiter, count } : best
  }, { delimiter: ',', count: 0 }).delimiter
}

export function parseCsv(text: string, name = 'Imported CSV'): CsvDataset {
  const input = text.replace(/^\uFEFF/, '')
  const delimiter = detectDelimiter(input)
  const matrix: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const next = input[index + 1]

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim())
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell.trim())
      if (row.some((value) => value.length > 0)) matrix.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell.trim())
  if (row.some((value) => value.length > 0)) matrix.push(row)

  if (matrix.length === 0) return { name, headers: [], rows: [] }

  const headers = matrix[0].map((header, index) => header || `Column ${index + 1}`)
  const rows: CsvRow[] = matrix.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])),
  )

  return { name, headers, rows }
}

export function suggestMapping(headers: string[]): ColumnMapping {
  const find = (kind: keyof ColumnMapping) => {
    const normalized = headers.map((header) => ({ header, value: normalizedHeader(header) }))
    for (const candidate of CANDIDATES[kind]) {
      const exact = normalized.find(({ value }) => value === candidate)
      if (exact) return exact.header
    }
    for (const candidate of CANDIDATES[kind]) {
      const partial = normalized.find(({ value }) => value.includes(candidate))
      if (partial) return partial.header
    }
    return ''
  }

  return {
    identifier: find('identifier'),
    quantity: find('quantity'),
    amount: find('amount'),
    title: find('title'),
  }
}

export function toCsv(rows: Record<string, string | number>[]) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (value: string | number) => {
    const text = String(value)
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n')
}
