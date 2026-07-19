-- =========================================================
-- FASE 4 — INVOICE & PEMBAYARAN
-- Prasyarat: 0001–0004
-- =========================================================

-- ---------------------------------------------------------
-- 1. HITUNG ULANG TOTAL INVOICE
--    Sama seperti penawaran: nilai dari klien tidak dipercaya.
-- ---------------------------------------------------------
create or replace function hitung_total_invoice(p_invoice uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_subtotal numeric(15,2);
  v_diskon   numeric(5,2);
  v_pajak    numeric(5,2);
  v_dasar    numeric(15,2);
begin
  select coalesce(sum(kuantitas * harga_satuan), 0)
    into v_subtotal from invoice_items where invoice_id = p_invoice;

  select diskon_persen, pajak_persen into v_diskon, v_pajak
    from invoices where id = p_invoice;
  if not found then return; end if;

  v_dasar := v_subtotal - (v_subtotal * coalesce(v_diskon, 0) / 100);

  update invoices
     set subtotal = v_subtotal,
         total    = v_dasar + (v_dasar * coalesce(v_pajak, 0) / 100)
   where id = p_invoice;
end; $$;

create or replace function trg_invoice_total_dari_item()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform hitung_total_invoice(coalesce(new.invoice_id, old.invoice_id));
  return null;
end; $$;

drop trigger if exists trg_invoice_items_total on invoice_items;
create trigger trg_invoice_items_total
  after insert or update or delete on invoice_items
  for each row execute function trg_invoice_total_dari_item();

create or replace function trg_invoice_total_dari_induk()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.diskon_persen is distinct from old.diskon_persen
     or new.pajak_persen is distinct from old.pajak_persen then
    perform hitung_total_invoice(new.id);
  end if;
  return null;
end; $$;

drop trigger if exists trg_invoices_total on invoices;
create trigger trg_invoices_total after update on invoices
  for each row execute function trg_invoice_total_dari_induk();

-- ---------------------------------------------------------
-- 2. CEGAH OVERPAYMENT
--    Total pembayaran tidak boleh melebihi total invoice.
-- ---------------------------------------------------------
create or replace function jaga_pembayaran()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total   numeric(15,2);
  v_status  invoice_status;
  v_dibayar numeric(15,2);
begin
  select total, status into v_total, v_status
    from invoices where id = new.invoice_id;

  if not found then
    raise exception 'Invoice tidak ditemukan.';
  end if;

  if v_status in ('draft', 'batal') then
    raise exception 'Invoice berstatus % tidak dapat menerima pembayaran.', v_status;
  end if;

  select coalesce(sum(jumlah), 0) into v_dibayar
    from payments
   where invoice_id = new.invoice_id
     and (tg_op = 'INSERT' or id <> new.id);

  if v_dibayar + new.jumlah > v_total + 0.005 then
    raise exception
      'Pembayaran melebihi sisa tagihan. Sisa: %, diminta: %.',
      to_char(v_total - v_dibayar, 'FM999G999G999G990D00'),
      to_char(new.jumlah, 'FM999G999G999G990D00');
  end if;

  -- Nomor termin otomatis bila tidak diisi.
  if new.termin_ke is null then
    select coalesce(max(termin_ke), 0) + 1 into new.termin_ke
      from payments where invoice_id = new.invoice_id;
  end if;

  return new;
end; $$;

drop trigger if exists trg_payments_jaga on payments;
create trigger trg_payments_jaga before insert or update on payments
  for each row execute function jaga_pembayaran();

-- ---------------------------------------------------------
-- 3. STATUS INVOICE OTOMATIS DARI PEMBAYARAN
--    Catatan: `jatuh_tempo` TIDAK disimpan — bergantung tanggal
--    berjalan, jadi dihitung saat dibaca lewat view (§5).
-- ---------------------------------------------------------
create or replace function segarkan_status_invoice(p_invoice uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_total   numeric(15,2);
  v_dibayar numeric(15,2);
  v_status  invoice_status;
begin
  select total, status into v_total, v_status from invoices where id = p_invoice;
  if not found or v_status in ('draft', 'batal') then return; end if;

  select coalesce(sum(jumlah), 0) into v_dibayar
    from payments where invoice_id = p_invoice;

  update invoices
     set status = case
           when v_dibayar >= v_total - 0.005 then 'lunas'::invoice_status
           when v_dibayar > 0                then 'sebagian_dibayar'::invoice_status
           else 'terkirim'::invoice_status
         end
   where id = p_invoice;
end; $$;

create or replace function trg_status_dari_pembayaran()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform segarkan_status_invoice(coalesce(new.invoice_id, old.invoice_id));
  return null;
end; $$;

drop trigger if exists trg_payments_status on payments;
create trigger trg_payments_status
  after insert or update or delete on payments
  for each row execute function trg_status_dari_pembayaran();

-- ---------------------------------------------------------
-- 4. STATE MACHINE INVOICE  (§9.2)
-- ---------------------------------------------------------
create or replace function jaga_transisi_invoice()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_jumlah_item int;
  v_boleh boolean;
begin
  if new.status = old.status then
    if old.status in ('lunas', 'batal') then
      if new.total is distinct from old.total
         or new.diskon_persen is distinct from old.diskon_persen
         or new.pajak_persen is distinct from old.pajak_persen then
        raise exception 'Invoice berstatus % tidak dapat diubah.', old.status;
      end if;
    end if;
    return new;
  end if;

  v_boleh := case old.status
    when 'draft'            then new.status in ('terkirim', 'batal')
    when 'terkirim'         then new.status in ('sebagian_dibayar', 'lunas', 'batal')
    when 'sebagian_dibayar' then new.status in ('lunas', 'terkirim', 'batal')
    when 'jatuh_tempo'      then new.status in ('sebagian_dibayar', 'lunas', 'batal')
    when 'lunas'            then false
    when 'batal'            then false
    else false
  end;

  if not v_boleh then
    raise exception 'Transisi status invoice % → % tidak diizinkan.', old.status, new.status;
  end if;

  if new.status = 'terkirim' and old.status = 'draft' then
    select count(*) into v_jumlah_item from invoice_items where invoice_id = new.id;
    if v_jumlah_item = 0 then
      raise exception 'Invoice harus memiliki minimal satu item sebelum diterbitkan.';
    end if;
    if coalesce(new.total, 0) <= 0 then
      raise exception 'Total invoice harus lebih besar dari nol.';
    end if;
  end if;

  return new;
end; $$;

drop trigger if exists trg_invoices_transisi on invoices;
create trigger trg_invoices_transisi before update on invoices
  for each row execute function jaga_transisi_invoice();

-- ---------------------------------------------------------
-- 5. VIEW RINGKASAN
--    `status_efektif` menambahkan 'jatuh_tempo' berdasarkan
--    tanggal hari ini, tanpa menyimpannya di tabel.
-- ---------------------------------------------------------
create or replace view invoice_ringkas
with (security_invoker = on) as
select
  i.*,
  coalesce(p.dibayar, 0)                          as total_dibayar,
  greatest(i.total - coalesce(p.dibayar, 0), 0)   as sisa_tagihan,
  case
    when i.status in ('draft', 'batal', 'lunas') then i.status
    when i.jatuh_tempo < current_date            then 'jatuh_tempo'::invoice_status
    else i.status
  end                                             as status_efektif
from invoices i
left join (
  select invoice_id, sum(jumlah) as dibayar
    from payments group by invoice_id
) p on p.invoice_id = i.id;

-- ---------------------------------------------------------
-- 6. KONVERSI PENAWARAN → INVOICE  (atomik)
--    SECURITY DEFINER, tapi peran diperiksa eksplisit di dalam.
-- ---------------------------------------------------------
create or replace function konversi_penawaran_ke_invoice(
  p_quotation uuid,
  p_jatuh_tempo date default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_q        quotations%rowtype;
  v_invoice  uuid;
  v_nomor    text;
  v_tempo    date;
begin
  if auth_role() is distinct from 'admin_finance' then
    raise exception 'Hanya Admin/Finance yang dapat menerbitkan invoice.';
  end if;

  select * into v_q from quotations where id = p_quotation;
  if not found then
    raise exception 'Penawaran tidak ditemukan.';
  end if;

  if v_q.company_id is distinct from auth_company_id() then
    raise exception 'Penawaran bukan milik perusahaan Anda.';
  end if;

  if v_q.status <> 'disetujui' then
    raise exception 'Hanya penawaran berstatus disetujui yang dapat dikonversi (saat ini: %).', v_q.status;
  end if;

  if exists (select 1 from invoices where quotation_id = p_quotation) then
    raise exception 'Penawaran ini sudah pernah dikonversi menjadi invoice.';
  end if;

  v_tempo := coalesce(p_jatuh_tempo, current_date + 30);
  v_nomor := next_document_number(v_q.company_id, 'invoice', 'INV');

  insert into invoices (
    company_id, nomor, quotation_id, customer_id, project_id, status,
    tanggal, jatuh_tempo, diskon_persen, pajak_persen, catatan, created_by
  ) values (
    v_q.company_id, v_nomor, v_q.id, v_q.customer_id, v_q.project_id, 'draft',
    current_date, v_tempo, v_q.diskon_persen, v_q.pajak_persen, v_q.catatan, auth.uid()
  ) returning id into v_invoice;

  -- Salin item apa adanya; total dihitung ulang trigger.
  insert into invoice_items (invoice_id, deskripsi, kuantitas, satuan, harga_satuan, urutan)
  select v_invoice, deskripsi, kuantitas, satuan, harga_satuan, urutan
    from quotation_items where quotation_id = p_quotation order by urutan;

  update quotations set status = 'dikonversi' where id = p_quotation;

  return v_invoice;
end; $$;

revoke execute on function konversi_penawaran_ke_invoice(uuid, date) from anon;

-- ---------------------------------------------------------
-- 7. AUDIT LOG invoice & pembayaran
-- ---------------------------------------------------------
create or replace function catat_audit_invoice()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs (company_id, actor_id, aksi, entity_type, entity_id, data_lama, data_baru)
  values (
    new.company_id, auth.uid(),
    case when tg_op = 'INSERT' then 'create' else 'update' end,
    'invoice', new.id,
    case when tg_op = 'UPDATE'
         then jsonb_build_object('status', old.status, 'total', old.total) end,
    jsonb_build_object('nomor', new.nomor, 'status', new.status, 'total', new.total)
  );
  return null;
end; $$;

drop trigger if exists trg_invoices_audit on invoices;
create trigger trg_invoices_audit after insert or update on invoices
  for each row execute function catat_audit_invoice();

create or replace function catat_audit_pembayaran()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs (company_id, actor_id, aksi, entity_type, entity_id, data_baru)
  values (
    new.company_id, auth.uid(), 'pay', 'payment', new.id,
    jsonb_build_object('invoice_id', new.invoice_id, 'jumlah', new.jumlah, 'termin', new.termin_ke)
  );
  return null;
end; $$;

drop trigger if exists trg_payments_audit on payments;
create trigger trg_payments_audit after insert on payments
  for each row execute function catat_audit_pembayaran();

-- ---------------------------------------------------------
-- 8. Indeks
-- ---------------------------------------------------------
create index if not exists idx_invoices_status      on invoices(status);
create index if not exists idx_invoices_jatuh_tempo on invoices(jatuh_tempo);

-- ---------------------------------------------------------
-- 9. Verifikasi
-- ---------------------------------------------------------
-- Overpayment (harus gagal):
--   insert into payments (company_id, invoice_id, jumlah)
--   values ((select company_id from invoices where id='<id>'), '<id>', 999999999999);
-- Konversi ganda (harus gagal pada percobaan kedua):
--   select konversi_penawaran_ke_invoice('<id-penawaran-disetujui>');
