/**
 * Parser for PostgREST select strings, e.g.
 *   '*, hotel:hotels!hotel_id(id, name), room_types!inner(base_price), booking_meal_plans(*)'
 *
 * Supported item forms: `*`, `column`, `alias:column`, and embedded resources
 * `[alias:]table[!hint][!inner](...)` where hint is an FK column or constraint name.
 */

export interface SelectColumn {
  /** Output key */
  alias: string
  /** Source column, or '*' for all columns */
  column: string
}

export interface SelectEmbed {
  alias: string
  table: string
  hint: string | null
  inner: boolean
  select: SelectSpec
}

export interface SelectSpec {
  columns: SelectColumn[]
  embeds: SelectEmbed[]
}

/** Splits on commas that are not nested inside parentheses or double quotes. */
export function splitTopLevel(input: string, separator = ','): string[] {
  const parts: string[] = []
  let depth = 0
  let quoted = false
  let current = ''
  for (const ch of input) {
    if (ch === '"') quoted = !quoted
    if (!quoted) {
      if (ch === '(') depth++
      else if (ch === ')') depth--
      else if (ch === separator && depth === 0) {
        parts.push(current)
        current = ''
        continue
      }
    }
    current += ch
  }
  parts.push(current)
  return parts.map((p) => p.trim()).filter((p) => p.length > 0)
}

export function parseSelect(input: string | null | undefined): SelectSpec {
  const spec: SelectSpec = { columns: [], embeds: [] }
  const source = (input ?? '*').replace(/\s+/g, ' ').trim() || '*'

  for (const item of splitTopLevel(source)) {
    const open = item.indexOf('(')
    if (open === -1) {
      const [alias, column] = item.includes(':') ? item.split(':').map((s) => s.trim()) : [item, item]
      // Casts (`amount::text`) are not supported by Firestore; keep the bare column name
      const bare = column.split('::')[0]
      spec.columns.push({ alias: alias.split('::')[0], column: bare })
      continue
    }

    if (!item.endsWith(')')) throw new Error(`Invalid select item: ${item}`)
    const head = item.slice(0, open).trim()
    const inner = item.slice(open + 1, -1)

    let alias: string | null = null
    let target = head
    const colon = head.indexOf(':')
    if (colon !== -1) {
      alias = head.slice(0, colon).trim()
      target = head.slice(colon + 1).trim()
    }

    const [table, ...modifiers] = target.split('!').map((s) => s.trim())
    let hint: string | null = null
    let isInner = false
    for (const mod of modifiers) {
      if (mod === 'inner') isInner = true
      else if (mod === 'left') isInner = false
      else hint = mod
    }

    spec.embeds.push({
      alias: alias ?? table,
      table,
      hint,
      inner: isInner,
      select: parseSelect(inner),
    })
  }

  if (spec.columns.length === 0 && spec.embeds.length === 0) {
    spec.columns.push({ alias: '*', column: '*' })
  }
  return spec
}
