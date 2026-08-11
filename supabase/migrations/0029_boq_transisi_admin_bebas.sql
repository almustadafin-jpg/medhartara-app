-- =========================================================
-- 0029 — TRANSISI BOQ: ADMIN/DIREKTUR BEBAS UBAH (TERMASUK DISETUJUI)
-- Prasyarat: 0001–0028
-- =========================================================
--
-- Trigger jaga_transisi_boq masih menolak perubahan BOQ berstatus
-- 'disetujui'/'arsip' (mis. saat total berubah karena item diedit).
-- Admin/Finance & Direktur kini dibebaskan; PM tetap dibatasi.
-- =========================================================

create or replace function jaga_transisi_boq()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_item int;
  v_boleh boolean;
  v_penuh boolean := auth_role() in ('admin_finance', 'direktur');
begin
  if new.status = old.status then
    if (not v_penuh) and old.status in ('disetujui', 'arsip') then
      if new.total_jual is distinct from old.total_jual
         or new.total_modal is distinct from old.total_modal then
        raise exception 'BOQ berstatus % tidak dapat diubah.', old.status;
      end if;
    end if;
    return new;
  end if;

  if not v_penuh then
    v_boleh := case old.status
      when 'draft'     then new.status in ('diajukan', 'arsip')
      when 'diajukan'  then new.status in ('disetujui', 'ditolak', 'draft')
      when 'disetujui' then new.status in ('arsip')
      when 'ditolak'   then new.status in ('draft', 'arsip')
      else false
    end;
    if not v_boleh then
      raise exception 'Transisi status BOQ % → % tidak diizinkan.', old.status, new.status;
    end if;
  end if;

  if new.status = 'diajukan' then
    select count(*) into v_item from boq_items where boq_id = new.id;
    if v_item = 0 then
      raise exception 'BOQ harus memiliki minimal satu item sebelum diajukan.';
    end if;
  end if;

  if new.status in ('disetujui', 'ditolak') then
    new.disetujui_oleh := coalesce(auth.uid(), new.disetujui_oleh);
    new.disetujui_pada := now();
  end if;

  return new;
end; $$;
