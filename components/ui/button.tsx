'use client'

import { useFormStatus } from 'react-dom'
import { cn } from '@/lib/utils'

type Varian = 'utama' | 'sekunder' | 'bahaya' | 'halus'

const GAYA: Record<Varian, string> = {
  utama: 'bg-slate-900 text-white hover:bg-slate-800',
  sekunder: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  bahaya: 'border border-red-300 bg-white text-red-700 hover:bg-red-50',
  halus: 'text-slate-600 hover:bg-slate-100',
}

export function Button({
  varian = 'utama',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { varian?: Varian }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition',
        'disabled:cursor-not-allowed disabled:opacity-60',
        GAYA[varian],
        className
      )}
      {...props}
    />
  )
}

/** Tombol submit yang otomatis nonaktif saat form diproses. */
export function TombolSimpan({
  label = 'Simpan',
  labelProses = 'Menyimpan…',
  varian = 'utama',
  className,
}: {
  label?: string
  labelProses?: string
  varian?: Varian
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" varian={varian} disabled={pending} className={className}>
      {pending ? labelProses : label}
    </Button>
  )
}
