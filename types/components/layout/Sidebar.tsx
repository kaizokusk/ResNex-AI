'use client'
// components/layout/Sidebar.tsx

import React, { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useClerk, useUser } from '@clerk/nextjs'
import { Avatar, StatusPill, Button, Spinner } from '../ui'
import { Project } from '../../types'

interface SidebarProps {
  projects: Project[]
  loading?: boolean
  selectedId?: string
  onSelect: (id: string) => void
  onCreateProject: () => void
  myRole?: Record<string, string>
}

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--color-success)',
  draft:  'var(--color-muted)',
  review: 'var(--color-warning)',
  merged: 'var(--color-green)',
  done:   'var(--color-green)',
}

function initials(title: string) {
  return title.trim().charAt(0).toUpperCase()
}

export function Sidebar({ projects, loading, selectedId, onSelect, onCreateProject, myRole = {} }: SidebarProps) {
  const { signOut } = useClerk()
  const { user } = useUser()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: expanded ? 256 : 48,
        transition: 'width 220ms cubic-bezier(0.4,0,0.2,1)',
        minWidth: expanded ? 256 : 48,
      }}
      className="flex-shrink-0 h-screen flex flex-col bg-[#0d1018] border-r border-[#1a1f2e] overflow-hidden z-30"
    >
      {/* Brand */}
      <div className="px-3 py-5 border-b border-[#1a1f2e] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 flex-shrink-0 rounded-lg bg-gradient-to-br from-[#4f8ef7] to-[#7c6af5] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span
            className="font-bold text-[#e8eaf0] text-sm tracking-tight whitespace-nowrap overflow-hidden"
            style={{
              opacity: expanded ? 1 : 0,
              width: expanded ? 'auto' : 0,
              transition: 'opacity 160ms ease',
              fontFamily: 'Syne, sans-serif',
            }}
          >
            ResearchCollab
          </span>
        </div>
      </div>

      {/* My Personal Space */}
      <div className="px-1.5 pt-3 pb-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          title={expanded ? undefined : 'My Personal Space'}
          className="w-full text-left rounded-lg transition-all duration-150 group flex items-center gap-2.5"
          style={{ padding: expanded ? '10px 12px' : '6px' }}
        >
          <div
            className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(124,106,245,0.15)', minWidth: 24 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c6af5" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span
            className="text-sm font-medium text-[#7a839a] group-hover:text-[#e8eaf0] whitespace-nowrap overflow-hidden transition-colors"
            style={{
              opacity: expanded ? 1 : 0,
              width: expanded ? 'auto' : 0,
              transition: 'opacity 140ms ease',
            }}
          >
            My Personal Space
          </span>
        </button>
      </div>

      {/* Projects list */}
      <div className="flex-1 overflow-y-auto py-3">
        {/* Header row */}
        <div
          className="px-3 mb-2 flex items-center justify-between"
          style={{ minHeight: 20 }}
        >
          <span
            className="text-[10px] font-semibold text-[#3d4558] uppercase tracking-widest whitespace-nowrap overflow-hidden"
            style={{
              opacity: expanded ? 1 : 0,
              width: expanded ? 'auto' : 0,
              transition: 'opacity 160ms ease',
            }}
          >
            Projects
          </span>
          <button
            type="button"
            onClick={onCreateProject}
            aria-label="Create new project"
            className="touch-target-expand w-5 h-5 rounded flex items-center justify-center text-[#7a839a] hover:text-[#4f8ef7] hover:bg-[#4f8ef7]/10 transition-all flex-shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size={16} />
          </div>
        ) : projects.length === 0 ? (
          <div className="px-3 py-4 text-center">
            {expanded ? (
              <>
                <p className="text-xs text-[#3d4558]">No projects yet.</p>
                <button onClick={onCreateProject} className="text-xs text-[#4f8ef7] mt-1 hover:underline">
                  Create your first
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onCreateProject}
                aria-label="Create new project"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#3d4558] hover:text-[#4f8ef7] hover:bg-[#4f8ef7]/10 transition-all mx-auto"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 px-1.5">
            {projects.map((p, i) => {
              const isSelected = selectedId === p.id
              const statusColor = STATUS_COLOR[p.status] ?? STATUS_COLOR.draft
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelect(p.id)}
                  aria-current={isSelected ? 'page' : undefined}
                  title={expanded ? undefined : p.title}
                  className={`w-full text-left rounded-lg transition-all duration-150 group`}
                  style={{
                    background: isSelected ? 'rgba(79,142,247,0.1)' : 'transparent',
                    border: isSelected ? '1px solid rgba(79,142,247,0.2)' : '1px solid transparent',
                    padding: expanded ? '10px 12px' : '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {/* Initial circle */}
                  <div
                    className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold"
                    style={{
                      background: isSelected ? 'rgba(79,142,247,0.2)' : 'rgba(255,255,255,0.05)',
                      color: isSelected ? '#4f8ef7' : '#7a839a',
                      minWidth: 24,
                    }}
                  >
                    {initials(p.title)}
                  </div>

                  {/* Expanded text */}
                  <div
                    className="min-w-0 overflow-hidden"
                    style={{
                      opacity: expanded ? 1 : 0,
                      width: expanded ? '100%' : 0,
                      transition: 'opacity 140ms ease',
                      pointerEvents: expanded ? 'auto' : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm font-medium truncate ${isSelected ? 'text-[#e8eaf0]' : 'text-[#7a839a] group-hover:text-[#e8eaf0]'} transition-colors`}>
                        {p.title}
                      </span>
                      <span aria-hidden="true" className="flex-shrink-0 ml-2 text-[10px]" style={{ color: statusColor }}>●</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] capitalize ${isSelected ? 'text-[#4f8ef7]' : 'text-[#3d4558]'}`}>
                        {p.status}
                      </span>
                      {myRole[p.id] === 'admin' && (
                        <span className="text-[9px] bg-[#4f8ef7]/10 text-[#4f8ef7] px-1 py-0.5 rounded font-medium">
                          admin
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="px-2 py-4 border-t border-[#1a1f2e] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Avatar name={user?.fullName || user?.firstName || 'User'} src={user?.imageUrl} size={30} />
          </div>
          <div
            className="flex-1 min-w-0 overflow-hidden"
            style={{
              opacity: expanded ? 1 : 0,
              width: expanded ? '100%' : 0,
              transition: 'opacity 140ms ease',
              pointerEvents: expanded ? 'auto' : 'none',
            }}
          >
            <p className="text-xs font-medium text-[#e8eaf0] truncate">{user?.fullName || user?.firstName}</p>
            <p className="text-[10px] text-[#3d4558] truncate">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut(() => router.push('/login'))}
            aria-label="Sign out"
            style={{
              opacity: expanded ? 1 : 0,
              pointerEvents: expanded ? 'auto' : 'none',
              transition: 'opacity 140ms ease',
              flexShrink: 0,
            }}
            className="touch-target-expand text-[#3d4558] hover:text-[#ef4444] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
