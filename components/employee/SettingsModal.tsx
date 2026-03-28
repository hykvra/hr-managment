'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, KeyRound, Phone, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

interface EmployeeSettings {
  email: string
  mobile: string
  address: string
  emergency_name: string | null
  emergency_phone: string | null
  bank_name: string | null
  account_no: string | null
  ifsc: string | null
  branch_name: string | null
  account_holder: string | null
}

interface Props {
  employee: EmployeeSettings
  open: boolean
  onClose: () => void
}

function SuccessMessage({ onDone }: { onDone: () => void }) {
  return (
    <div className="py-6 text-center">
      <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
        <span className="text-green-400 text-2xl">✓</span>
      </div>
      <p className="text-white font-medium">Settings saved</p>
      <Button onClick={onDone} className="mt-4" variant="outline" size="sm">Continue</Button>
    </div>
  )
}

export function SettingsModal({ employee, open, onClose }: Props) {
  const router = useRouter()

  // Credentials
  const [newEmail, setNewEmail] = useState(employee.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Contact
  const [mobile, setMobile] = useState(employee.mobile)
  const [address, setAddress] = useState(employee.address)
  const [emergencyName, setEmergencyName] = useState(employee.emergency_name || '')
  const [emergencyPhone, setEmergencyPhone] = useState(employee.emergency_phone || '')

  // Bank
  const [bankName, setBankName] = useState(employee.bank_name || '')
  const [accountNo, setAccountNo] = useState(employee.account_no || '')
  const [ifsc, setIfsc] = useState(employee.ifsc || '')
  const [branchName, setBranchName] = useState(employee.branch_name || '')
  const [accountHolder, setAccountHolder] = useState(employee.account_holder || '')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('credentials')

  function handleClose() {
    setError('')
    setSuccess(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    onClose()
  }

  async function submit(tab: string, payload: Record<string, string>) {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/employees/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      setSuccess(true)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function saveCredentials(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (newPassword && newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    await submit('credentials', {
      new_email: newEmail,
      current_password: currentPassword,
      new_password: newPassword,
    })
  }

  async function saveContact(e: React.FormEvent) {
    e.preventDefault()
    await submit('contact', { mobile, address, emergency_name: emergencyName, emergency_phone: emergencyPhone })
  }

  async function saveBank(e: React.FormEvent) {
    e.preventDefault()
    await submit('bank', {
      bank_name: bankName, account_no: accountNo,
      ifsc, branch_name: branchName, account_holder: accountHolder,
    })
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    setError('')
    setSuccess(false)
  }

  const inputClass = 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-700 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-zinc-300" />
            </div>
            <DialogTitle className="text-white">Settings</DialogTitle>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-2">
          <TabsList className="bg-zinc-800 border border-zinc-700 w-full">
            <TabsTrigger value="credentials" className="flex-1 text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
              <KeyRound className="w-3 h-3 mr-1" /> Credentials
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex-1 text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
              <Phone className="w-3 h-3 mr-1" /> Contact
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex-1 text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
              <Building2 className="w-3 h-3 mr-1" /> Bank
            </TabsTrigger>
          </TabsList>

          {/* Credentials */}
          <TabsContent value="credentials">
            {success ? <SuccessMessage onDone={() => setSuccess(false)} /> : (
              <form onSubmit={saveCredentials} className="space-y-3 mt-3">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Email Address</Label>
                  <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" className={inputClass} />
                </div>
                <div className="border-t border-zinc-800 pt-3">
                  <p className="text-zinc-500 text-xs mb-3">Change Password (leave blank to keep current)</p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-zinc-300 text-xs">Current Password</Label>
                      <Input
                        type="password" value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="Required to change password"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-zinc-300 text-xs">New Password</Label>
                      <Input
                        type="password" value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-zinc-300 text-xs">Confirm New Password</Label>
                      <Input
                        type="password" value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
                {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</Button>
              </form>
            )}
          </TabsContent>

          {/* Contact */}
          <TabsContent value="contact">
            {success ? <SuccessMessage onDone={() => setSuccess(false)} /> : (
              <form onSubmit={saveContact} className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-zinc-300 text-xs">Mobile Number</Label>
                    <Input value={mobile} onChange={e => setMobile(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-zinc-300 text-xs">Address</Label>
                    <Input value={address} onChange={e => setAddress(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div className="border-t border-zinc-800 pt-3">
                  <p className="text-zinc-500 text-xs mb-3">Emergency Contact</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-zinc-300 text-xs">Name</Label>
                      <Input value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Full name" className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-zinc-300 text-xs">Phone</Label>
                      <Input value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="Phone number" className={inputClass} />
                    </div>
                  </div>
                </div>
                {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</Button>
              </form>
            )}
          </TabsContent>

          {/* Bank */}
          <TabsContent value="bank">
            {success ? <SuccessMessage onDone={() => setSuccess(false)} /> : (
              <form onSubmit={saveBank} className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-zinc-300 text-xs">Account Holder Name</Label>
                    <Input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-zinc-300 text-xs">Bank Name</Label>
                    <Input value={bankName} onChange={e => setBankName(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-zinc-300 text-xs">Account Number</Label>
                    <Input value={accountNo} onChange={e => setAccountNo(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 text-xs">IFSC Code</Label>
                    <Input value={ifsc} onChange={e => setIfsc(e.target.value.toUpperCase())} className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 text-xs">Branch Name</Label>
                    <Input value={branchName} onChange={e => setBranchName(e.target.value)} className={inputClass} />
                  </div>
                </div>
                {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Saving…' : 'Save Bank Details'}</Button>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
