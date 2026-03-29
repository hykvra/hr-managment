'use client'

import { IdCard } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  firstName: string
  lastName: string
  employeeCode: string | null
  department: string | null
  shiftName: string | null
  joiningDate: string
  profilePhoto: string | null
  companyName: string
  companyColor: string
}

export function IDCardButton({
  firstName, lastName, employeeCode, department,
  shiftName, joiningDate, profilePhoto, companyName, companyColor,
}: Props) {
  function printIDCard() {
    const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase()
    const joinedStr = new Date(joiningDate).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })

    const photoHtml = profilePhoto
      ? `<img src="${profilePhoto}" alt="Photo" style="width:80px;height:80px;object-fit:cover;border-radius:50%;border:3px solid ${companyColor}" />`
      : `<div style="width:80px;height:80px;border-radius:50%;background:#374151;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:bold;color:#9ca3af;border:3px solid ${companyColor}">${initials}</div>`

    const html = `<!DOCTYPE html><html><head><title>ID Card</title>
<style>
@page { size: 54mm 85.6mm; margin: 0 }
* { margin: 0; padding: 0; box-sizing: border-box }
body { font-family: Arial, sans-serif; width: 54mm; height: 85.6mm; overflow: hidden }
.card { width: 54mm; height: 85.6mm; display: flex; flex-direction: column; align-items: center }
.top { background: ${companyColor}; width: 100%; padding: 10px 8px 14px; text-align: center; color: white }
.company { font-size: 11px; font-weight: bold; letter-spacing: 0.5px }
.body { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 12px 8px 8px; background: white; width: 100% }
.photo { margin-bottom: 8px }
.name { font-size: 12px; font-weight: bold; color: #111; text-align: center }
.code { font-size: 10px; color: #6b7280; font-family: monospace; margin-top: 2px }
.dept { font-size: 9px; color: #374151; margin-top: 3px; text-align: center }
.divider { width: 80%; height: 1px; background: #e5e7eb; margin: 8px 0 }
.info { width: 100%; font-size: 8px; color: #6b7280 }
.info-row { display: flex; justify-content: space-between; margin-bottom: 3px }
.info-row .lbl { color: #9ca3af }
.bottom { background: ${companyColor}; width: 100%; padding: 6px; text-align: center }
.bottom p { font-size: 7px; color: rgba(255,255,255,0.8) }
</style></head><body>
<div class="card">
  <div class="top"><div class="company">${companyName.toUpperCase()}</div></div>
  <div class="body">
    <div class="photo">${photoHtml}</div>
    <div class="name">${firstName} ${lastName}</div>
    ${employeeCode ? `<div class="code">#${employeeCode}</div>` : ''}
    ${department ? `<div class="dept">${department}</div>` : ''}
    <div class="divider"></div>
    <div class="info">
      ${shiftName ? `<div class="info-row"><span class="lbl">Shift</span><span>${shiftName}</span></div>` : ''}
      <div class="info-row"><span class="lbl">Joined</span><span>${joinedStr}</span></div>
    </div>
  </div>
  <div class="bottom"><p>Authorized ID Card — ${companyName}</p></div>
</div>
</body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) { win.onload = () => { win.print(); URL.revokeObjectURL(url) } }
    else URL.revokeObjectURL(url)
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs border-zinc-700 text-zinc-300 hover:text-white gap-1"
      onClick={printIDCard}
      title="Print ID Card"
    >
      <IdCard className="w-3 h-3" /> ID Card
    </Button>
  )
}
