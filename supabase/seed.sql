-- Seed data awal. Jalankan SETELAH 0001 & 0002.
insert into companies (nama, npwp, alamat, telepon, email, bank_nama, bank_rekening, bank_atas_nama)
values ('Medhartara Production', '01.234.567.8-901.000',
        'Jl. Raya Kebayoran No. 88, Jakarta Selatan', '021-7654321', 'halo@medhartara.id',
        'BCA', '1234567890', 'PT Medhartara Production')
on conflict do nothing;

-- Setelah membuat user via Supabase Auth (Dashboard > Authentication > Add user),
-- profil otomatis dibuat trigger handle_new_user dengan peran default 'pm'.
-- Naikkan peran secara manual:
--   update users_profile set role = 'direktur'      where id = '<uuid>';
--   update users_profile set role = 'admin_finance' where id = '<uuid>';
