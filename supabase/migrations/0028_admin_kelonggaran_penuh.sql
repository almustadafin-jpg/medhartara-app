-- =========================================================
-- 0028 — KELONGGARAN PENUH UNTUK ADMIN/FINANCE
-- Prasyarat: 0001–0027
-- =========================================================
--
-- Admin/Finance kini bebas mengedit & menghapus penawaran, BOQ, dan invoice
-- pada status apa pun (alur cetak-manual, tanpa kirim/approve wajib).
--
-- PENGAMAN: invoice yang sudah memiliki pembayaran tercatat TIDAK boleh
-- diubah nilainya maupun dihapus — melindungi jejak kas & kuitansi.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Transisi status penawaran — admin bebas
-- ---------------------------------------------------------
create or replace function jaga_transisi_quotation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_jumlah_item int;
  v_boleh boolean := false;
  v_admin boolean := auth_role() = 'admin_finance';
begin
  if new.status = old.status then
    if (not v_admin) and old.status in ('dikonversi','arsip','disetujui') then
      if new.diskon_persen is distinct from old.diskon_persen
         or new.pajak_persen is distinct from old.pajak_persen
         or new.customer_id  is distinct from old.customer_id then
        raise exception 'Penawaran berstatus % tidak dapat diubah.', old.status;
      end if;
    end if;
    return new;
  end if;

  if not v_admin then
    v_boleh := case old.status
      when 'draft'      then new.status in ('terkirim','arsip')
      when 'terkirim'   then new.status in ('disetujui','ditolak','draft')
      when 'disetujui'  then new.status in ('dikonversi','arsip')
      when 'ditolak'    then new.status in ('arsip','draft')
      else false
    end;
    if not v_boleh then
      raise exception 'Transisi status % → % tidak diizinkan.', old.status, new.status;
    end if;

    if new.status = 'terkirim' then
      select count(*) into v_jumlah_item from quotation_items where quotation_id = new.id;
      if v_jumlah_item = 0 then
        raise exception 'Penawaran harus memiliki minimal satu item sebelum dikirim.';
      end if;
      if coalesce(new.total, 0) <= 0 then
        raise exception 'Total penawaran harus lebih besar dari nol.';
      end if;
    end if;
  end if;

  if new.status in ('disetujui','ditolak') then
    new.disetujui_oleh := coalesce(auth.uid(), new.disetujui_oleh);
    new.disetujui_pada := now();
  end if;

  return new;
end; $$;

-- ---------------------------------------------------------
-- 2. Transisi status invoice — admin bebas; nilai terlindungi bila ada bayar
-- ---------------------------------------------------------
create or replace function jaga_transisi_invoice()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_jumlah_item int;
  v_boleh boolean;
  v_admin boolean := auth_role() = 'admin_finance';
  v_ada_bayar boolean := exists (select 1 from payments p where p.invoice_id = new.id);
begin
  -- Invoice ber-pembayaran: nilai (total/diskon/pajak) tak boleh berubah.
  if v_ada_bayar
     and (new.total is distinct from old.total
          or new.diskon_persen is distinct from old.diskon_persen
          or new.pajak_persen is distinct from old.pajak_persen) then
    raise exception 'Invoice yang sudah ada pembayaran tidak dapat diubah nilainya.';
  end if;

  if new.status = old.status then
    if (not v_admin) and old.status in ('lunas', 'batal') then
      if new.total is distinct from old.total
         or new.diskon_persen is distinct from old.diskon_persen
         or new.pajak_persen is distinct from old.pajak_persen then
        raise exception 'Invoice berstatus % tidak dapat diubah.', old.status;
      end if;
    end if;
    return new;
  end if;

  if not v_admin then
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
  end if;

  return new;
end; $$;

-- ---------------------------------------------------------
-- 3. Item penawaran — admin bebas status; PM hanya draft
-- ---------------------------------------------------------
drop policy if exists quotation_items_write on quotation_items;
create policy quotation_items_write on quotation_items for all to authenticated
  using (
    exists (select 1 from quotations q where q.id = quotation_items.quotation_id
      and (auth_role() = 'admin_finance' or (auth_role() = 'pm' and q.status = 'draft')))
  )
  with check (
    exists (select 1 from quotations q where q.id = quotation_items.quotation_id
      and (auth_role() = 'admin_finance' or (auth_role() = 'pm' and q.status = 'draft')))
  );

-- ---------------------------------------------------------
-- 4. Item invoice — admin, kecuali invoice ber-pembayaran
-- ---------------------------------------------------------
drop policy if exists invoice_items_write on invoice_items;
create policy invoice_items_write on invoice_items for all to authenticated
  using (
    auth_role() = 'admin_finance'
    and exists (select 1 from invoices i where i.id = invoice_items.invoice_id)
    and not exists (select 1 from payments p where p.invoice_id = invoice_items.invoice_id)
  )
  with check (
    auth_role() = 'admin_finance'
    and exists (select 1 from invoices i where i.id = invoice_items.invoice_id)
    and not exists (select 1 from payments p where p.invoice_id = invoice_items.invoice_id)
  );

-- ---------------------------------------------------------
-- 5. Hapus penawaran — admin bebas status; PM draft miliknya
-- ---------------------------------------------------------
drop policy if exists quotations_delete on quotations;
create policy quotations_delete on quotations for delete to authenticated
  using (
    company_id = auth_company_id()
    and (
      auth_role() = 'admin_finance'
      or (auth_role() = 'pm' and status = 'draft' and created_by = auth.uid())
    )
  );

-- ---------------------------------------------------------
-- 6. Hapus invoice — admin bebas status, kecuali ada pembayaran
-- ---------------------------------------------------------
drop policy if exists invoices_delete on invoices;
create policy invoices_delete on invoices for delete to authenticated
  using (
    company_id = auth_company_id()
    and auth_role() = 'admin_finance'
    and not exists (select 1 from payments p where p.invoice_id = invoices.id)
  );

-- ---------------------------------------------------------
-- 7. Item BOQ — admin/direktur bebas status; PM draft/ditolak/diajukan
-- ---------------------------------------------------------
drop policy if exists boq_items_write on boq_items;
create policy boq_items_write on boq_items for all to authenticated
  using (
    exists (select 1 from boq b where b.id = boq_items.boq_id
      and (
        auth_role() in ('direktur', 'admin_finance')
        or (auth_role() = 'pm' and b.status in ('draft','ditolak','diajukan')
            and (is_pm_of(b.project_id) or (b.project_id is null and b.created_by = auth.uid())))
      ))
  )
  with check (
    exists (select 1 from boq b where b.id = boq_items.boq_id
      and (
        auth_role() in ('direktur', 'admin_finance')
        or (auth_role() = 'pm' and b.status in ('draft','ditolak','diajukan'))
      ))
  );

-- ---------------------------------------------------------
-- 8. Hapus BOQ — admin/direktur bebas status; PM draft/ditolak miliknya
-- ---------------------------------------------------------
drop policy if exists boq_delete on boq;
create policy boq_delete on boq for delete to authenticated
  using (
    company_id = auth_company_id()
    and (
      auth_role() in ('direktur', 'admin_finance')
      or (auth_role() = 'pm' and status in ('draft','ditolak')
          and (is_pm_of(project_id) or (project_id is null and created_by = auth.uid())))
    )
  );

-- ---------------------------------------------------------
-- 9. Konversi penawaran→invoice dari status apa pun (kecuali sudah final)
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

  if v_q.status in ('dikonversi','batal','arsip') then
    raise exception 'Penawaran berstatus % tidak dapat dikonversi.', v_q.status;
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

  insert into invoice_items (invoice_id, deskripsi, kuantitas, satuan, harga_satuan, urutan)
  select v_invoice, deskripsi, kuantitas, satuan, harga_satuan, urutan
    from quotation_items where quotation_id = p_quotation order by urutan;

  update quotations set status = 'dikonversi' where id = p_quotation;

  return v_invoice;
end; $$;

revoke execute on function konversi_penawaran_ke_invoice(uuid, date) from anon;

-- ---------------------------------------------------------
-- 10. Hapus penawaran melepas invoice turunannya (bukan memblokir)
-- ---------------------------------------------------------
alter table invoices drop constraint if exists invoices_quotation_id_fkey;
alter table invoices
  add constraint invoices_quotation_id_fkey
  foreign key (quotation_id) references quotations(id) on delete set null;
