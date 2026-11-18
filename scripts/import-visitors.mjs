import { createHash } from 'node:crypto'
import { Pool } from 'pg'
import { parse } from 'csv-parse/sync'

const sheetId = '1B5EPpmRyUwxJu22qhOVuFVBEFB_SFt9Lo8bA5nA_6tc'
const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 })

function parseSheetDate(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!match) return null

  const [, dayText, monthText, yearText] = match
  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)
  if (year < 2020 || year > 2035 || month < 1 || month > 12) return null

  const check = new Date(Date.UTC(year, month - 1, day))
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function normalized(value) {
  return String(value ?? '').trim()
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
  const response = await fetch(csvUrl, { headers: { accept: 'text/csv' }, cache: 'no-store' })
  if (!response.ok) throw new Error(`Spreadsheet export failed with status ${response.status}`)

  const csvText = await response.text()
  const rows = parse(csvText, { bom: true, skip_empty_lines: true, relax_quotes: true })
  if (!Array.isArray(rows) || rows.length < 2) throw new Error('Spreadsheet contains no visitor records')

  const client = await pool.connect()
  let inserted = 0
  let skipped = 0
  try {
    const [admin] = (await client.query(`SELECT id FROM public."user" WHERE role = 'admin' ORDER BY "createdAt" LIMIT 1`)).rows
    const workspaceId = admin?.id ?? '__bootstrap__'
    await client.query('BEGIN')
    for (let index = 1; index < rows.length; index += 1) {
      const row = rows[index]
      if (!Array.isArray(row) || !normalized(row[2])) {
        skipped += 1
        continue
      }

      const visitDate = parseSheetDate(row[1]) ?? parseSheetDate(row[0])
      if (!visitDate) {
        skipped += 1
        continue
      }

      const rowHash = createHash('sha256')
        .update(`${sheetId}:${index}:${JSON.stringify(row)}`)
        .digest('hex')
      const inductionAnswer = normalized(row[12]).toLocaleLowerCase('id-ID')
      const result = await client.query(
        `INSERT INTO public.visitor_records (
          "userId", "createdByUserId", "sourceRowHash", "sourceRowIndex", "sourceTimestamp",
          "visitDate", "visitorName", gender, "arrivalTime", "plannedDepartureTime", phone,
          company, address, host, purpose, "visitorPassConfirmation", "securityInductionConfirmed",
          "guestCount", "visitorPassStatus", "visitStatus"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) ON CONFLICT ("sourceRowHash") DO NOTHING`,
        [
          workspaceId, workspaceId, rowHash, index + 1, normalized(row[0]), visitDate,
          normalized(row[2]), normalized(row[3]), normalized(row[4]), normalized(row[5]),
          normalized(row[6]), normalized(row[7]), normalized(row[8]), normalized(row[9]),
          normalized(row[10]), normalized(row[11]), inductionAnswer.startsWith('ya'),
          normalized(row[13]) || '1', 'tercatat_di_sheet', 'selesai',
        ],
      )
      inserted += result.rowCount ?? 0
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  process.stdout.write(`Visitor import complete: ${inserted} imported, ${skipped} skipped.\n`)
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    process.stderr.write(`Visitor import failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
    await pool.end()
    process.exitCode = 1
  })
