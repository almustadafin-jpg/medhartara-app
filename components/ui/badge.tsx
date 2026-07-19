import { cn } from '@/lib/utils'

type Warna = 'abu' | 'hijau' | 'merah' | 'kuning' | 'biru' | 'ungu'

const GAYA: Record<Warna, string> = {
  abu: 'bg-slate-100 text-slate-600',
  hijau: 'bg-emerald-50 text-emerald-700',
  merah: 'bg-red-50 text-red-700',
  kuning: 'bg-amber-50 text-amber-700',
  biru: 'bg-blue-50 text-blue-700',
  ungu: 'bg-violet-50 text-violet-700',
}

export function Badge({
  children,
  warna = 'abu',
  className,
}: {
  children: React.ReactNode
  warna?: Warna
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        GAYA[warna],
        className
      )}
    >
      {children}
    </span>
  )
}
