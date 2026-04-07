import "server-only"

function escapeCsvCell(value: string | number | null | undefined) {
  const stringValue = value == null ? "" : String(value)

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`
  }

  return stringValue
}

export function buildCsv(rows: Array<Array<string | number | null | undefined>>) {
  return rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")).join("\n")
}
