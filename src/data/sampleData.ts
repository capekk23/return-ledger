import { parseCsv, suggestMapping } from '../lib/csv'

export const sampleClaimsCsv = `Claim ref,SKU,Item description,Returned qty,Claimed amount
RET-1042,SKU-101,Recycled kraft mailers — M,10,120.00
RET-1042,SKU-204,Counter display stand,8,96.00
RET-1042,SKU-332,Ceramic planter — sage,5,62.50
RET-1042,SKU-415,Cotton tote — natural,4,72.00
RET-1042,SKU-518,Glass carafe 1L,3,45.00
RET-1042,SKU-621,Hardcover weekly planner,6,84.00`

export const sampleCreditsCsv = `Memo no,Product code,Description,Quantity credited,Credit amount
CM-8831,SKU-101,Recycled kraft mailers — M,10,120.00
CM-8831,SKU-204,Counter display stand,6,72.00
CM-8831,SKU-332,Ceramic planter — sage,5,62.50
CM-8831,SKU-415,Cotton tote — natural,5,90.00
CM-8831,SKU-999,Bamboo desk organiser,2,31.00`

export const sampleClaims = parseCsv(sampleClaimsCsv, 'Sample return claim.csv')
export const sampleCredits = parseCsv(sampleCreditsCsv, 'Sample supplier credit.csv')
export const sampleClaimMapping = suggestMapping(sampleClaims.headers)
export const sampleCreditMapping = suggestMapping(sampleCredits.headers)
