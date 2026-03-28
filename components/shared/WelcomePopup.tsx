'use client'

import { useState } from 'react'
import { PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface WelcomePopupProps {
  employeeName: string
  employeeCode: string | null
}

export function WelcomePopup({ employeeName, employeeCode }: WelcomePopupProps) {
  const [open, setOpen] = useState(true)
  const [dismissing, setDismissing] = useState(false)

  async function handleDismiss() {
    setDismissing(true)
    try {
      await fetch('/api/employees/dismiss-welcome', { method: 'POST' })
    } catch {
      // Non-critical — popup already closed locally
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="bg-zinc-900 border-zinc-700 sm:max-w-md text-center"
        // Prevent closing via overlay click or Escape
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Custom close button hidden; use the CTA instead */}
        <button
          className="absolute right-4 top-4 rounded-sm opacity-0 pointer-events-none"
          aria-hidden
        />

        <DialogHeader className="items-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <PartyPopper className="w-8 h-8 text-blue-400" />
          </div>
          <DialogTitle className="text-2xl text-white">
            Welcome, {employeeName}! 🎉
          </DialogTitle>
          <DialogDescription className="text-zinc-400 mt-2 text-base">
            Your account has been activated. We&apos;re excited to have you on board.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 p-4 bg-zinc-800 rounded-lg text-left space-y-2 text-sm">
          {employeeCode && (
            <div className="flex justify-between">
              <span className="text-zinc-400">Employee ID</span>
              <span className="text-white font-mono font-semibold">{employeeCode}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-zinc-400">Portal Access</span>
            <span className="text-green-400">Active</span>
          </div>
        </div>

        <p className="text-xs text-zinc-500 mt-2">
          You can update your profile, apply for leaves, and track your attendance from your
          dashboard.
        </p>

        <Button
          onClick={handleDismiss}
          disabled={dismissing}
          className="w-full mt-4"
          size="lg"
        >
          Get Started
        </Button>
      </DialogContent>
    </Dialog>
  )
}
