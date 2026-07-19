'use client'

import { useEffect } from 'react'

export function Modal({
  judul,
  buka,
  onTutup,
  children,
}: {
  judul: string
  buka: boolean
  onTutup: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!buka) return
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onTutup()
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [buka, onTutup])

  if (!buka) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8">
      <div
        className="absolute inset-0"
        onClick={onTutup}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{judul}</h2>
          <button
            onClick={onTutup}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
