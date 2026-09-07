import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('ReturnLedger app', () => {
  it('renders a working sample reconciliation', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '5 exceptions need attention' })).toBeInTheDocument()
    expect(screen.getByText('€202.00', { selector: '.summary-card strong' })).toBeInTheDocument()
    expect(screen.getByText('SKU-204', { selector: 'td strong' })).toBeInTheDocument()
    expect(screen.queryByText('SKU-101', { selector: 'td strong' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /All lines/ }))
    expect(screen.getByText('SKU-101', { selector: 'td strong' })).toBeInTheDocument()
  })

  it('explains the privacy model and exposes required mapping labels', () => {
    render(<App />)
    expect(screen.getByText(/Your files are read in this browser tab/)).toBeInTheDocument()
    const source = screen.getByRole('region', { name: 'Return claim' })
    expect(within(source).getByLabelText(/SKU or ISBN/)).toBeRequired()
    expect(within(source).getByLabelText(/Quantity/)).toBeRequired()
  })
})
