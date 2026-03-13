'use client'
// components/project/ModerationAlerts.tsx
// Feature 1: Admin-only moderation alerts panel

import { useState, useEffect, useCallback } from 'react'
import { Card, Button, Badge, Avatar, Spinner } from '../ui'

interface ModerationAlert {
  id: string
  flaggedMsg: string
  reason: string
  severity: 'low' | 'medium' | 'high'
  createdAt: string
  reporter?: { id: string; full_name: string; avatar_url?: string }
}

const SEVERITY_COLORS = {
  low: 'gray',
  medium: 'blue',
  high: 'red',
} as const

export function ModerationAlerts({ projectId }: { projectId: string }) {
  const [alerts, setAlerts] = useState<ModerationAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/moderation-alerts`)
      if (res.ok) setAlerts(await res.json())
    } catch (e) {
      console.error('[ModerationAlerts] fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchAlerts()
    // Poll every 60 seconds
    const interval = setInterval(fetchAlerts, 60000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  async function markReviewed(alertId: string) {
    setReviewing(alertId)
    try {
      const res = await fetch(`/api/projects/${projectId}/moderation-alerts/${alertId}`, {
        method: 'PATCH',
      })
      if (res.ok) setAlerts((prev) => prev.filter((a) => a.id !== alertId))
    } catch (e) {
      console.error('[ModerationAlerts] review error:', e)
    } finally {
      setReviewing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size={20} />
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3ecf8e" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#e8eaf0]">No unreviewed alerts</p>
          <p className="text-xs text-[#7a839a]">The group chat is clean.</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {alerts.map((alert) => (
        <Card key={alert.id}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              {alert.reporter && (
                <Avatar name={alert.reporter.full_name} src={alert.reporter.avatar_url} size={28} />
              )}
              <div>
                <p className="text-sm font-medium text-[#e8eaf0]">
                  {alert.reporter?.full_name || 'Unknown user'}
                </p>
                <p className="text-xs text-[#7a839a]">
                  {new Date(alert.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <Badge color={SEVERITY_COLORS[alert.severity]}>
              {alert.severity}
            </Badge>
          </div>

          <div className="bg-[#1a0010] border border-[#f43f5e]/20 rounded-lg px-3 py-2 mb-3">
            <p className="text-xs text-[#f43f5e] font-mono leading-relaxed">"{alert.flaggedMsg}"</p>
          </div>

          <p className="text-xs text-[#7a839a] mb-4">
            <span className="font-medium text-[#c8cad0]">Reason:</span> {alert.reason}
          </p>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => markReviewed(alert.id)}
            loading={reviewing === alert.id}
            className="w-full"
          >
            Mark Reviewed
          </Button>
        </Card>
      ))}
    </div>
  )
}

// Hook to get unreviewed alert count for the badge
export function useModerationAlertCount(projectId: string, isAdmin: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isAdmin) return

    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/moderation-alerts`)
        if (res.ok) {
          const alerts = await res.json()
          setCount(alerts.length)
        }
      } catch {}
    }

    fetchCount()
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
  }, [projectId, isAdmin])

  return count
}
