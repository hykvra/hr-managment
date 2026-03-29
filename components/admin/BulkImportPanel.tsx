'use client'

import { useState, useRef } from 'react'
import { Upload, Download, CheckCircle, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PreviewRow = {
  first_name: string
  last_name: string
  email: string
  mobile: string
  base_salary: string
  department?: string
  joining_date?: string
  employment_type?: string
  _error?: string
}

type ImportResult = {
  imported: number
  skipped: number
  skipped_emails: string[]
  errors: string[]
}

function parseCsv(text: string): PreviewRow[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const rows: PreviewRow[] = []

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parse (handles basic quoted fields)
    const vals: string[] = []
    let cur = ''
    let inQuotes = false
    for (const ch of lines[i]) {
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { vals.push(cur.trim()); cur = '' }
      else cur += ch
    }
    vals.push(cur.trim())

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = vals[idx] || '' })

    const preview: PreviewRow = {
      first_name: row.first_name || row.firstname || '',
      last_name:  row.last_name  || row.lastname  || '',
      email:      row.email      || '',
      mobile:     row.mobile     || row.phone     || '',
      base_salary: row.base_salary || row.salary  || '',
      department:  row.department  || '',
      joining_date: row.joining_date || row.join_date || '',
      employment_type: row.employment_type || row.type || '',
    }

    // Basic validation
    if (!preview.first_name || !preview.email || !preview.base_salary) {
      preview._error = 'Missing required fields'
    }
    rows.push(preview)
  }
  return rows
}

function downloadTemplate() {
  const csv = [
    'first_name,last_name,email,mobile,base_salary,department,joining_date,employment_type',
    'Rahul,Sharma,rahul@example.com,9876543210,25000,Operations,2024-01-15,regular',
    'Priya,Patel,priya@example.com,9876543211,30000,Sales,2024-02-01,regular',
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'employees_import_template.csv'; a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  onClose?: () => void
}

export function BulkImportPanel({ onClose }: Props) {
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [apiError, setApiError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    setResult(null); setApiError('')
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setPreview(parseCsv(text))
    }
    reader.readAsText(f)
  }

  const validRows = preview.filter(r => !r._error)
  const errorRows = preview.filter(r => r._error)

  async function handleImport() {
    if (validRows.length === 0) return
    setImporting(true); setApiError('')
    try {
      const res = await fetch('/api/admin/employees/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: validRows.map(r => ({
            first_name: r.first_name,
            last_name: r.last_name,
            email: r.email,
            mobile: r.mobile,
            base_salary: Number(r.base_salary),
            department: r.department || undefined,
            joining_date: r.joining_date || undefined,
            employment_type: r.employment_type || undefined,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setApiError(data.error || 'Import failed'); return }
      setResult(data)
      setPreview([])
      if (fileRef.current) fileRef.current.value = ''
    } finally { setImporting(false) }
  }

  function reset() {
    setPreview([]); setFileName(''); setResult(null); setApiError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-zinc-800/60 rounded-lg p-3 space-y-2">
        <p className="text-zinc-300 text-xs font-medium">Import Employees from CSV</p>
        <ul className="text-zinc-500 text-[10px] space-y-0.5 list-disc ml-3">
          <li>Required columns: <span className="font-mono text-zinc-400">first_name, last_name, email, mobile, base_salary</span></li>
          <li>Optional: <span className="font-mono text-zinc-400">department, joining_date (YYYY-MM-DD), employment_type</span></li>
          <li>Default password: <span className="font-mono text-zinc-400">Welcome@1234</span> — employees should change on first login</li>
          <li>Existing emails are skipped automatically. Max 200 rows per import.</li>
        </ul>
        <Button size="sm" variant="outline"
          className="h-7 text-[10px] border-zinc-700 gap-1 text-zinc-300"
          onClick={downloadTemplate}>
          <Download className="w-3 h-3" /> Download Template
        </Button>
      </div>

      {/* File upload */}
      {!result && (
        <div className="flex items-center gap-3">
          <label className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2 h-9 bg-zinc-800 border border-zinc-700 border-dashed rounded-md px-3 hover:border-blue-500/50 transition-colors">
              <Upload className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-500 text-xs">{fileName || 'Click to select CSV file…'}</span>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </label>
          {preview.length > 0 && (
            <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-zinc-500" onClick={reset}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-zinc-400 text-xs">
              <span className="text-green-400">{validRows.length} valid</span>
              {errorRows.length > 0 && <span className="text-red-400 ml-2">{errorRows.length} error{errorRows.length > 1 ? 's' : ''}</span>}
            </p>
            <Button
              size="sm"
              className="h-7 text-[10px] bg-green-600 hover:bg-green-700 gap-1"
              disabled={importing || validRows.length === 0}
              onClick={handleImport}
            >
              <Upload className="w-3 h-3" />
              {importing ? `Importing ${validRows.length}…` : `Import ${validRows.length} Employee${validRows.length > 1 ? 's' : ''}`}
            </Button>
          </div>

          <div className="max-h-52 overflow-y-auto rounded-lg border border-zinc-700">
            <table className="w-full text-[10px]">
              <thead className="bg-zinc-800 sticky top-0">
                <tr>
                  {['Name', 'Email', 'Mobile', 'Salary', 'Dept', 'Type'].map(h => (
                    <th key={h} className="px-2 py-1.5 text-left text-zinc-400 font-medium">{h}</th>
                  ))}
                  <th className="px-2 py-1.5 text-left text-zinc-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className={`border-t border-zinc-800 ${row._error ? 'bg-red-500/5' : ''}`}>
                    <td className="px-2 py-1.5 text-zinc-200">{row.first_name} {row.last_name}</td>
                    <td className="px-2 py-1.5 text-zinc-400 truncate max-w-[120px]">{row.email}</td>
                    <td className="px-2 py-1.5 text-zinc-400">{row.mobile}</td>
                    <td className="px-2 py-1.5 text-zinc-300">₹{Number(row.base_salary || 0).toLocaleString('en-IN')}</td>
                    <td className="px-2 py-1.5 text-zinc-500">{row.department || '—'}</td>
                    <td className="px-2 py-1.5 text-zinc-500 capitalize">{row.employment_type || 'regular'}</td>
                    <td className="px-2 py-1.5">
                      {row._error
                        ? <span className="text-red-400">{row._error}</span>
                        : <span className="text-green-400">✓</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {apiError && <p className="text-xs text-red-400">{apiError}</p>}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-green-400 font-semibold text-sm">Import Complete</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-green-500/10 border border-green-500/20 rounded p-2 text-center">
              <p className="text-2xl font-bold text-green-400">{result.imported}</p>
              <p className="text-zinc-400 text-[10px]">Imported</p>
            </div>
            <div className="bg-zinc-700/50 border border-zinc-700 rounded p-2 text-center">
              <p className="text-2xl font-bold text-zinc-300">{result.skipped}</p>
              <p className="text-zinc-400 text-[10px]">Skipped (existing)</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-red-400 text-xs">
                <AlertCircle className="w-3 h-3" /> {result.errors.length} row error{result.errors.length > 1 ? 's' : ''}:
              </div>
              {result.errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-[10px] text-zinc-500 ml-4">{e}</p>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700" onClick={reset}>
              Import More
            </Button>
            {onClose && (
              <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={onClose}>
                Done
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
