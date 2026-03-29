'use client'

import { useState, useEffect, useCallback } from 'react'
import { Upload, FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Doc = {
  id: string
  doc_type: string
  doc_name: string | null
  file_url: string
  file_size: number | null
  uploaded_at: string
}

const DOC_TYPES = [
  'Aadhaar Card', 'PAN Card', 'Passport', 'Driving License',
  'Educational Certificate', 'Experience Letter', 'Offer Letter',
  'Bank Passbook', 'Photo', 'Other',
]

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface Props {
  employeeId: string
  isOwnProfile?: boolean
}

export function DocumentsPanel({ employeeId, isOwnProfile = false }: Props) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState(DOC_TYPES[0])
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  const apiBase = isOwnProfile ? '/api/employees/documents' : `/api/admin/employees/${employeeId}/documents`

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(apiBase)
      if (res.ok) {
        const { documents } = await res.json()
        setDocs(documents || [])
      }
    } finally { setLoading(false) }
  }, [apiBase])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  async function handleUpload() {
    if (!file) { setError('Please select a file'); return }
    if (file.size > 10 * 1024 * 1024) { setError('File too large. Max 10 MB.'); return }

    setUploading(true); setError(''); setUploadProgress(10)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const ext = file.name.split('.').pop()
      const fileName = `${employeeId}/${Date.now()}-${docType.replace(/\s+/g, '-')}.${ext}`

      setUploadProgress(30)

      // Upload to Supabase Storage
      const formData = new FormData()
      formData.append('', file)

      const uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/employee-documents/${fileName}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${supabaseKey}`, 'x-upsert': 'false' },
          body: file,
        }
      )

      setUploadProgress(70)

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}))
        throw new Error(errData.error || 'Upload failed')
      }

      const fileUrl = `${supabaseUrl}/storage/v1/object/public/employee-documents/${fileName}`

      setUploadProgress(90)

      // Save document record
      const saveUrl = isOwnProfile ? '/api/employees/documents' : '/api/employees/documents'
      const saveRes = await fetch(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_type: docType,
          doc_name: file.name,
          file_url: fileUrl,
          file_size: file.size,
        }),
      })

      if (!saveRes.ok) throw new Error('Failed to save document record')

      setUploadProgress(100)
      setFile(null)
      // Reset file input
      const inp = document.getElementById('doc-file-input') as HTMLInputElement
      if (inp) inp.value = ''
      await fetchDocs()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  function getDocIcon(type: string) {
    if (type.includes('Photo')) return '🖼️'
    if (type.includes('Aadhaar') || type.includes('PAN') || type.includes('Passport')) return '🪪'
    if (type.includes('Certificate') || type.includes('Letter')) return '📄'
    return '📎'
  }

  return (
    <div className="space-y-3">
      {/* Upload section */}
      <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
        <p className="text-zinc-400 text-xs font-medium">Upload Document</p>
        <div className="flex gap-2 flex-wrap items-end">
          <div className="space-y-1 flex-1 min-w-[140px]">
            <label className="text-zinc-500 text-xs">Document Type</label>
            <select value={docType} onChange={e => { setDocType(e.target.value); setError('') }}
              className="w-full h-8 bg-zinc-900 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1 flex-1 min-w-[160px]">
            <label className="text-zinc-500 text-xs">File (PDF, JPG, PNG — max 10 MB)</label>
            <input id="doc-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={e => { setFile(e.target.files?.[0] || null); setError('') }}
              className="w-full h-8 bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-md px-2 focus:outline-none file:mr-2 file:text-[10px] file:bg-zinc-700 file:text-zinc-300 file:border-0 file:rounded file:px-2 file:py-0.5 cursor-pointer" />
          </div>
          <Button size="sm" className="h-8 text-xs gap-1 shrink-0 bg-blue-600 hover:bg-blue-700"
            disabled={uploading || !file} onClick={handleUpload}>
            <Upload className="w-3 h-3" />
            {uploading ? `Uploading ${uploadProgress}%…` : 'Upload'}
          </Button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {uploading && (
          <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
      </div>

      {/* Document list */}
      {loading && <div className="text-zinc-500 text-xs">Loading documents…</div>}
      {!loading && docs.length === 0 && (
        <div className="bg-zinc-800 rounded-lg px-4 py-5 text-center">
          <FileText className="w-7 h-7 text-zinc-600 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">No documents uploaded yet</p>
        </div>
      )}
      {docs.length > 0 && (
        <div className="space-y-1.5">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 bg-zinc-800 rounded-lg px-3 py-2.5">
              <span className="text-lg shrink-0">{getDocIcon(doc.doc_type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-200 text-xs font-medium">{doc.doc_type}</p>
                <p className="text-zinc-500 text-[10px] truncate">{doc.doc_name || '—'}{doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="p-1 text-zinc-500 hover:text-blue-400 transition-colors" title="View / Download">
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
