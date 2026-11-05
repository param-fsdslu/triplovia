/**
 * Who issues booking invoices, and how they're numbered. Details match the Company Information
 * on the Terms page. Have your accountant confirm the legal name and SAC codes before relying on
 * these invoices for GST filing.
 */
export const INVOICE_ISSUER = {
  name: 'Triplovia',
  addressLines: [
    'First floor, 612, Honnavar Areangadi Road, Near BSNL Office',
    'Hosakuli, Uttara Kannada, Karnataka - 581334',
  ],
  gstin: '29AAZFT3826C1ZO',
  /** Decides CGST + SGST (same state as the property) or IGST */
  state: 'Karnataka',
  stateCode: '29',
  email: 'triplovia@gmail.com',
  phone: '+91 91138 87712',
} as const

/**
 * Invoice numbers: PREFIX/FY/serial, e.g. "TRV/26-27/00001" — one consecutive series per Indian
 * financial year (April–March), at most 16 characters as GST rules require.
 */
export const INVOICE_PREFIX = 'TRV'
export const INVOICE_SERIAL_DIGITS = 5

/** SAC codes printed on invoice lines; empty = printed as "-" */
export const INVOICE_SAC = {
  accommodation: '996311',
  meals: '',
  serviceCharge: '',
} as const
