'use client'
// components/latex/ConflictBanner.tsx — shown when another member is editing the active file

interface Props {
  userName: string
  fileName: string
}

export function ConflictBanner({ userName, fileName }: Props) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-[#f59e0b]/10 border-b border-[#f59e0b]/20 flex-shrink-0">
      <span className="text-[10px] text-[#f59e0b] font-mono">
        ⚠ <strong>{userName}</strong> is also editing <strong>{fileName}</strong> — changes may conflict
      </span>
    </div>
  )
}
