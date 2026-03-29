import { Cake, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Alert = {
  type: 'birthday' | 'anniversary'
  employee_id: string
  first_name: string
  last_name: string
  employee_code: string | null
  profile_photo: string | null
  days_away: number
  years?: number
}

interface Props {
  today: Alert[]
  upcoming: Alert[]
}

function initials(first: string, last: string) {
  return `${first[0] || ''}${last[0] || ''}`.toUpperCase()
}

function AlertRow({ alert }: { alert: Alert }) {
  const isBirthday = alert.type === 'birthday'
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-full bg-zinc-700 overflow-hidden shrink-0 border border-zinc-600">
        {alert.profile_photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={alert.profile_photo} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-400">
            {initials(alert.first_name, alert.last_name)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-zinc-200 text-xs font-medium truncate">
          {alert.first_name} {alert.last_name}
          {alert.employee_code && <span className="text-zinc-600 ml-1 font-mono text-[10px]">#{alert.employee_code}</span>}
        </p>
        <p className="text-zinc-500 text-[10px]">
          {isBirthday ? '🎂 Birthday' : `🎉 ${alert.years}-year anniversary`}
          {alert.days_away === 0 ? ' — Today!' : ` — in ${alert.days_away} day${alert.days_away > 1 ? 's' : ''}`}
        </p>
      </div>
      {isBirthday
        ? <Cake className="w-3.5 h-3.5 text-pink-400 shrink-0" />
        : <Star className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
      }
    </div>
  )
}

export function CelebrationsWidget({ today, upcoming }: Props) {
  const all = [...today, ...upcoming.slice(0, 8)]
  if (all.length === 0) return null

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm text-zinc-200 font-semibold flex items-center gap-2">
          🎊 Upcoming Celebrations
          {today.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 font-medium">
              {today.length} today!
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2.5">
        {all.map(a => <AlertRow key={`${a.type}-${a.employee_id}`} alert={a} />)}
      </CardContent>
    </Card>
  )
}
