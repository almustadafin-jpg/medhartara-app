export function PageHeader({
  judul,
  deskripsi,
  aksi,
}: {
  judul: string
  deskripsi?: string
  aksi?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{judul}</h1>
        {deskripsi && <p className="mt-1 text-sm text-slate-500">{deskripsi}</p>}
      </div>
      {aksi}
    </div>
  )
}
