import { cn } from '@/lib/utils'

export function Tabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-slate-200 bg-white', className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
      {children}
    </thead>
  )
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn('px-4 py-3 font-medium', className)}>{children}</th>
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-slate-700', className)}>{children}</td>
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn('border-b border-slate-100 last:border-0', className)}>{children}</tr>
}

export function KondisiKosong({ pesan, kolom }: { pesan: string; kolom: number }) {
  return (
    <tr>
      <td colSpan={kolom} className="px-4 py-12 text-center text-sm text-slate-400">
        {pesan}
      </td>
    </tr>
  )
}
