import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  name: string
  error?: string
  wajib?: boolean
  petunjuk?: string
  children?: React.ReactNode
}

const KELAS_INPUT =
  'mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50'

export function Field({ label, name, error, wajib, petunjuk, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
        {wajib && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {petunjuk && !error && (
        <p className="mt-1 text-xs text-slate-400">{petunjuk}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function Input({
  className,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={cn(KELAS_INPUT, error && 'border-red-400', className)}
      {...props}
    />
  )
}

export function Textarea({
  className,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      rows={3}
      className={cn(KELAS_INPUT, error && 'border-red-400', className)}
      {...props}
    />
  )
}

export function Select({
  className,
  error,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      className={cn(KELAS_INPUT, error && 'border-red-400', className)}
      {...props}
    />
  )
}
