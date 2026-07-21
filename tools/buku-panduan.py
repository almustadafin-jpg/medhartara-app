# -*- coding: utf-8 -*-
"""Buku Panduan Sistem Finansial & Proyek — Medhartara Production."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether, NextPageTemplate,
)
from reportlab.graphics.shapes import Drawing, Rect

LOGO = "/sessions/determined-happy-rubin/mnt/medhartara-app/public/logo.png"
OUT = "/sessions/determined-happy-rubin/mnt/medhartara-app/Buku-Panduan-Medhartara.pdf"

TINTA   = colors.HexColor("#0f172a")
ABU     = colors.HexColor("#475569")
ABU_MUD = colors.HexColor("#94a3b8")
GARIS   = colors.HexColor("#e2e8f0")
LATAR   = colors.HexColor("#f8fafc")
KUNING  = colors.HexColor("#fffbeb")
K_GARIS = colors.HexColor("#f59e0b")

ss = getSampleStyleSheet()


def S(name, **kw):
    base = kw.pop("parent", ss["Normal"])
    return ParagraphStyle(name, parent=base, **kw)


st_judul_buku = S("jb", fontName="Helvetica-Bold", fontSize=30, leading=35, textColor=TINTA)
st_sub_buku   = S("sb", fontName="Helvetica", fontSize=13, leading=19, textColor=ABU)
st_bab_no     = S("bn", fontName="Helvetica-Bold", fontSize=9, leading=12,
                  textColor=ABU_MUD, spaceAfter=3)
st_bab        = S("bab", fontName="Helvetica-Bold", fontSize=19, leading=24,
                  textColor=TINTA, spaceAfter=10)
st_h2         = S("h2", fontName="Helvetica-Bold", fontSize=12, leading=16,
                  textColor=TINTA, spaceBefore=13, spaceAfter=5)
st_h3         = S("h3", fontName="Helvetica-Bold", fontSize=10, leading=14,
                  textColor=TINTA, spaceBefore=9, spaceAfter=3)
st_p          = S("p", fontName="Helvetica", fontSize=9.5, leading=14.5,
                  textColor=TINTA, alignment=TA_JUSTIFY, spaceAfter=7)
st_li         = S("li", parent=st_p, leftIndent=13, bulletIndent=3, spaceAfter=4)
st_kecil      = S("kecil", fontName="Helvetica", fontSize=8.5, leading=12.5, textColor=ABU)
st_sel        = S("sel", fontName="Helvetica", fontSize=8.5, leading=12, textColor=TINTA)
st_sel_b      = S("selb", fontName="Helvetica-Bold", fontSize=8.5, leading=12, textColor=TINTA)
st_sel_p      = S("selp", fontName="Helvetica-Bold", fontSize=8, leading=11, textColor=colors.white)
st_catatan    = S("cat", fontName="Helvetica", fontSize=8.8, leading=13,
                  textColor=TINTA, alignment=TA_JUSTIFY)
st_toc        = S("toc", fontName="Helvetica", fontSize=10, leading=20, textColor=TINTA)


def P(t, s=st_p):
    return Paragraph(t, s)


def LI(t):
    return Paragraph(t, st_li, bulletText="•")


def NO(t, n):
    return Paragraph(t, st_li, bulletText=f"{n}.")


def kotak(judul, isi, warna=KUNING, garis=K_GARIS):
    dalam = []
    if judul:
        dalam.append(Paragraph(f"<b>{judul}</b>", st_catatan))
        dalam.append(Spacer(1, 3))
    for baris in isi:
        dalam.append(Paragraph(baris, st_catatan))
        dalam.append(Spacer(1, 3))
    t = Table([[dalam]], colWidths=[165 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), warna),
        ("LINEBEFORE", (0, 0), (0, -1), 2.2, garis),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return KeepTogether([Spacer(1, 4), t, Spacer(1, 9)])


def tabel(header, baris, lebar, align=None):
    data = [[Paragraph(h, st_sel_p) for h in header]]
    for r in baris:
        data.append([c if hasattr(c, "wrap") else Paragraph(str(c), st_sel) for c in r])
    t = Table(data, colWidths=lebar, repeatRows=1)
    gaya = [
        ("BACKGROUND", (0, 0), (-1, 0), TINTA),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, GARIS),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LATAR]),
    ]
    if align:
        for kol, a in align.items():
            gaya.append(("ALIGN", (kol, 0), (kol, -1), a))
    t.setStyle(TableStyle(gaya))
    return t


# =====================================================================
def sampul(c, d):
    c.saveState()
    c.setFillColor(colors.white)
    c.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    c.setFillColor(TINTA)
    c.rect(0, 0, A4[0], 26 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 8.5)
    c.drawString(22 * mm, 15 * mm, "PT Sarana Medhartara Semesta")
    c.setFillColor(ABU_MUD)
    c.drawRightString(A4[0] - 22 * mm, 15 * mm, "project.medhartara.com")
    c.setFillColor(K_GARIS)
    c.rect(22 * mm, A4[1] - 96 * mm, 34 * mm, 1.6, stroke=0, fill=1)
    c.restoreState()


def isi_halaman(c, d):
    c.saveState()
    c.setStrokeColor(GARIS)
    c.setLineWidth(0.5)
    c.line(22 * mm, A4[1] - 17 * mm, A4[0] - 22 * mm, A4[1] - 17 * mm)
    c.setFont("Helvetica", 7.5)
    c.setFillColor(ABU_MUD)
    c.drawString(22 * mm, A4[1] - 14.5 * mm, "BUKU PANDUAN · SISTEM FINANSIAL & PROYEK")
    c.drawRightString(A4[0] - 22 * mm, A4[1] - 14.5 * mm, "MEDHARTARA PRODUCTION")
    c.line(22 * mm, 16 * mm, A4[0] - 22 * mm, 16 * mm)
    c.setFont("Helvetica", 8)
    c.setFillColor(ABU)
    c.drawRightString(A4[0] - 22 * mm, 11 * mm, str(c.getPageNumber() - 1))
    c.restoreState()


doc = BaseDocTemplate(
    OUT, pagesize=A4,
    leftMargin=22 * mm, rightMargin=22 * mm,
    topMargin=24 * mm, bottomMargin=22 * mm,
    title="Buku Panduan Sistem Finansial & Proyek",
    author="PT Sarana Medhartara Semesta",
    subject="Panduan implementasi dan pemakaian harian",
)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
doc.addPageTemplates([
    PageTemplate(id="sampul", frames=[frame], onPage=sampul),
    PageTemplate(id="isi", frames=[frame], onPage=isi_halaman),
])

E = []
A = E.append

# ------------------------------------------------------------- SAMPUL
A(Spacer(1, 22 * mm))
img = Image(LOGO, width=44 * mm, height=37 * mm)
img.hAlign = "LEFT"
A(img)
A(Spacer(1, 26 * mm))
A(P("BUKU PANDUAN", S("k", fontName="Helvetica-Bold", fontSize=9,
                      leading=12, textColor=K_GARIS)))
A(Spacer(1, 5))
A(P("Sistem Finansial<br/>&amp; Proyek", st_judul_buku))
A(Spacer(1, 9))
A(P("Panduan menerapkan dan menjalankan sistem di<br/>"
    "PT Sarana Medhartara Semesta", st_sub_buku))
A(Spacer(1, 45 * mm))
A(P("Versi 1.0 &nbsp;·&nbsp; Juli 2026<br/>"
    "Berlaku untuk seluruh pengguna: Direktur, Admin/Finance, dan Project Manager",
    st_kecil))
A(NextPageTemplate("isi"))
A(PageBreak())

# ------------------------------------------------------------- DAFTAR ISI
A(P("Daftar Isi", st_bab))
A(Spacer(1, 4))
isi = [
    ("1", "Apa yang sistem ini kerjakan", "2"),
    ("2", "Menyiapkan sistem — sekali di awal", "3"),
    ("3", "Tiga peran dan pembagian kerjanya", "5"),
    ("4", "Alur satu proyek, dari awal sampai profit", "7"),
    ("5", "Panduan per modul", "9"),
    ("6", "Aturan yang ditegakkan sistem", "12"),
    ("7", "Menghapus: apa yang boleh, apa yang tidak", "13"),
    ("8", "Rutinitas harian, mingguan, bulanan", "14"),
    ("9", "Keamanan dan pemeliharaan", "15"),
    ("10", "Kalau ada masalah", "17"),
    ("", "Lampiran A — Daftar status dokumen", "18"),
    ("", "Lampiran B — Ceklis sebelum dipakai sungguhan", "20"),
]
baris_toc = []
for no, judul, hal in isi:
    kiri = (f"<b>{no}</b>&nbsp;&nbsp;&nbsp;{judul}" if no
            else f"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{judul}")
    baris_toc.append([Paragraph(kiri, st_toc),
                      Paragraph(hal, S("r", parent=st_toc, alignment=2))])
t = Table(baris_toc, colWidths=[150 * mm, 15 * mm])
t.setStyle(TableStyle([
    ("LINEBELOW", (0, 0), (-1, -1), 0.4, GARIS),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))
A(t)
A(Spacer(1, 12))
A(kotak("Cara memakai buku ini", [
    "Bab 1–4 dibaca semua orang, sekali saja, sebelum mulai. Isinya duduk perkara: "
    "apa yang dikerjakan sistem, siapa mengerjakan apa, dan bagaimana satu proyek mengalir "
    "dari penawaran sampai profit.",
    "Bab 5 dibuka saat butuh — cari modulnya, kerjakan langkahnya.",
    "Bab 6–10 untuk Direktur dan Admin/Finance: aturan yang ditegakkan sistem, "
    "keamanan, dan apa yang harus diawasi.",
]))
A(PageBreak())

# ------------------------------------------------------------- BAB 1
A(P("BAB SATU", st_bab_no))
A(P("Apa yang sistem ini kerjakan", st_bab))
A(P("Sistem ini menggantikan pencatatan spreadsheet yang tersebar. Satu tempat untuk "
    "pelanggan, vendor, proyek, penawaran, invoice, pembayaran, dan kas — dengan "
    "profit tiap proyek yang dihitung sendiri, bukan direkap manual di akhir bulan."))

A(P("Yang dikerjakan", st_h2))
A(LI("<b>Menyusun anggaran</b> lewat BOQ/RAB, dengan harga modal dan harga jual berdampingan "
     "supaya margin terlihat sejak awal."))
A(LI("<b>Menerbitkan penawaran dan invoice</b> bernomor otomatis, siap diekspor jadi PDF berkop."))
A(LI("<b>Mencatat pembayaran bertermin</b> dan menerbitkan kuitansi sendiri untuk tiap pembayaran."))
A(LI("<b>Mencatat kas masuk dan keluar</b>, lengkap dengan berkas bukti."))
A(LI("<b>Menghitung profit per proyek</b> secara langsung: pemasukan dikurangi pengeluaran "
     "proyek itu."))
A(LI("<b>Mencatat jejak audit</b> — siapa membuat, mengubah, menyetujui, dan kapan."))

A(P("Yang belum dikerjakan", st_h2))
A(P("Penting diketahui supaya tidak ada yang menunggu fitur yang memang tidak ada:"))
A(LI("Bukan pembukuan jurnal ganda. Ini pencatatan berbasis kas — laporannya untuk "
     "mengendalikan proyek, bukan menggantikan laporan keuangan akuntan Anda."))
A(LI("Tidak ada modul pajak lengkap. PPN hanya berupa persentase per dokumen; "
     "e-Faktur tetap terpisah."))
A(LI("Tidak terhubung ke bank atau payment gateway. Pembayaran dicatat manual disertai "
     "bukti transfer."))
A(LI("Tidak ada pengingat otomatis lewat email atau WhatsApp. Invoice jatuh tempo muncul di "
     "dashboard, tapi harus dilihat."))
A(LI("Tidak ada payroll, inventaris, atau timesheet."))

A(P("Di mana sistem ini berada", st_h2))
A(P("Aplikasi berjalan di <b>project.medhartara.com</b>, dapat dibuka dari peramban mana pun "
    "— komputer kantor, laptop di lokasi acara, maupun ponsel. Tidak ada yang perlu "
    "dipasang. Datanya tersimpan di server basis data terkelola, bukan di komputer siapa pun, "
    "sehingga laptop hilang tidak berarti data hilang."))
A(kotak("Satu hal yang harus dipahami sejak awal", [
    "Sistem ini <b>menolak</b> banyak hal yang tampak wajar: mengubah penawaran yang sudah "
    "disetujui, menghapus invoice yang sudah dibayar, mencatat pembayaran melebihi tagihan.",
    "Penolakan itu disengaja. Nomor dokumen yang bolong dan riwayat yang bisa diubah diam-diam "
    "adalah dua hal yang membuat catatan keuangan tidak bisa dipercaya. Bab 6 menjelaskan "
    "tiap aturan dan jalan keluarnya.",
]))
A(PageBreak())

# ------------------------------------------------------------- BAB 2
A(P("BAB DUA", st_bab_no))
A(P("Menyiapkan sistem — sekali di awal", st_bab))
A(P("Empat langkah berikut dikerjakan satu kali oleh pemegang akun Admin/Finance, "
    "sebelum siapa pun mulai memakai sistem untuk pekerjaan sungguhan."))

A(P("Langkah 1 — Isi identitas perusahaan", st_h2))
A(P("Menu <b>Perusahaan</b>. Data di halaman ini bukan sekadar catatan: ia yang tercetak di "
    "kop penawaran, invoice, dan kuitansi yang diterima pelanggan Anda."))
A(tabel(
    ["Kolom", "Dipakai di mana", "Wajib"],
    [
        ["Nama perusahaan", "Kop semua dokumen PDF", "Ya"],
        ["Alamat", "Kop semua dokumen PDF", "Ya"],
        ["Telepon &amp; email", "Kop semua dokumen PDF", "Sebaiknya"],
        ["NPWP", "Kop dokumen; dibutuhkan pelanggan korporat", "Sebaiknya"],
        ["Bank, nomor rekening,<br/>atas nama",
         "Blok pembayaran di invoice — tidak muncul di penawaran", "Ya"],
    ],
    [40 * mm, 95 * mm, 30 * mm]))
A(Spacer(1, 6))
A(P("Periksa ejaan nomor rekening dua kali. Kesalahan di sini ikut tercetak di setiap invoice "
    "yang keluar sampai ada yang menyadarinya.", st_kecil))

A(P("Langkah 2 — Buat akun pengguna", st_h2))
A(P("Menu <b>Pengguna</b>. Tiap orang memakai akun sendiri — jangan berbagi satu akun. "
    "Alasannya bukan kerahasiaan semata: jejak audit mencatat nama pelaku tiap tindakan, dan "
    "akun bersama membuat catatan itu tidak ada gunanya."))
A(P("Untuk tiap orang, isi nama lengkap, email, kata sandi awal, dan pilih perannya. "
    "Peran dijelaskan di Bab 3. Bila ragu, beri peran paling sempit dulu — menambah "
    "wewenang belakangan lebih mudah daripada menarik kembali yang terlanjur diberikan."))

A(P("Langkah 3 — Masukkan data awal", st_h2))
A(P("Isi <b>Pelanggan</b> dan <b>Vendor</b> yang sudah ada lebih dulu, sebelum proyek pertama "
    "dibuat. Untuk pelanggan, hanya nama yang wajib — banyak lembaga cukup dicantumkan "
    "nama resminya. Untuk vendor, nama dan kategori wajib, karena kategori inilah yang nanti "
    "mengelompokkan pengeluaran di laporan."))
A(P("Pikirkan sebentar sebelum menetapkan kategori vendor. Kategori yang konsisten "
    "(<i>Katering</i>, <i>Sewa Alat</i>, <i>Dekorasi</i>, <i>Talent</i>) membuat laporan "
    "bulanan langsung terbaca. Kategori yang dikarang tiap kali input akan menghasilkan "
    "laporan berisi puluhan baris yang artinya sama."))

A(P("Langkah 4 — Kesepakatan cara kerja", st_h2))
A(P("Ini bukan langkah teknis, tapi yang paling menentukan sistem ini terpakai atau "
    "ditinggalkan. Sepakati bertiga, tulis, dan tempel:"))
A(LI("<b>Kapan pengeluaran dicatat.</b> Anjuran: di hari yang sama, bukan dikumpulkan sampai "
     "akhir bulan. Struk hilang lebih cepat dari ingatan."))
A(LI("<b>Siapa memegang proyek mana.</b> Satu proyek satu PM. PM hanya melihat proyeknya sendiri."))
A(LI("<b>Siapa menyetujui penawaran.</b> Secara teknis Direktur dan Admin/Finance sama-sama "
     "bisa. Sepakati batasnya — misalnya di atas nilai tertentu harus Direktur."))
A(LI("<b>Bukti transaksi wajib diunggah</b> untuk pengeluaran di atas nilai tertentu. "
     "Tentukan angkanya sekarang, bukan saat diperiksa nanti."))
A(kotak("Mulai dari proyek berjalan, bukan dari arsip", [
    "Godaan terbesar saat memasang sistem baru adalah memasukkan seluruh riwayat proyek "
    "tahun-tahun sebelumnya. Jangan.",
    "Mulai dari proyek yang sedang berjalan dan yang akan datang. Riwayat lama biarkan di "
    "tempatnya. Memasukkan data lama memakan berminggu-minggu, hasilnya jarang dipakai, "
    "dan sistem keburu ditinggalkan sebelum sempat terasa gunanya.",
]))
A(PageBreak())

# ------------------------------------------------------------- BAB 3
A(P("BAB TIGA", st_bab_no))
A(P("Tiga peran dan pembagian kerjanya", st_bab))
A(P("Setiap pengguna memegang tepat satu peran. Peran menentukan menu apa yang muncul dan "
    "tindakan apa yang diizinkan. Pembatasan ini ditegakkan di basis data, bukan sekadar "
    "menyembunyikan tombol — jadi tidak bisa diakali dengan mengetik alamat halaman "
    "langsung."))

A(P("Direktur", st_h3))
A(P("Pengawas. Melihat seluruh data perusahaan: dashboard keuangan penuh, semua proyek, "
    "semua invoice, laporan, dan jejak audit. Menyetujui penawaran dan BOQ. "
    "<b>Tidak</b> mencatat transaksi, tidak menerbitkan invoice, tidak mengelola pengguna. "
    "Pemisahan ini disengaja: yang mengawasi sebaiknya bukan yang mencatat."))

A(P("Admin/Finance", st_h3))
A(P("Penggerak harian. Mengelola pelanggan dan vendor, menerbitkan invoice, mencatat "
    "pembayaran, mencatat kas masuk dan keluar, mengelola akun pengguna, dan mengatur "
    "identitas perusahaan. Peran dengan wewenang terluas — dan satu-satunya yang bisa "
    "menghapus transaksi."))

A(P("Project Manager", st_h3))
A(P("Pelaksana lapangan. Hanya melihat proyek yang ia pegang. Menyusun BOQ dan penawaran "
    "untuk proyeknya, mencatat pengeluaran proyeknya, mengunggah bukti. "
    "<b>Tidak</b> melihat invoice, kuitansi, pemasukan, atau saldo kas perusahaan."))

A(P("Ringkasan wewenang", st_h2))
A(tabel(
    ["Tindakan", "Direktur", "Admin/<br/>Finance", "Project<br/>Manager"],
    [
        ["Dashboard keuangan penuh", "Ya", "Ya", "Tidak"],
        ["Pelanggan — tambah, ubah, hapus", "Lihat saja", "Ya", "Lihat saja"],
        ["Vendor — tambah, ubah, hapus", "Lihat saja", "Ya", "Ya"],
        ["Proyek — buat &amp; ubah", "Ya", "Ya", "Proyeknya saja"],
        ["BOQ / RAB — susun", "Ya", "Ya", "Proyeknya saja"],
        ["BOQ / RAB — setujui", "Ya", "Ya", "Tidak"],
        ["Penawaran — susun", "Lihat saja", "Ya", "Proyeknya saja"],
        ["Penawaran — setujui", "Ya", "Ya", "Tidak"],
        ["Invoice — lihat &amp; terbitkan", "Lihat saja", "Ya", "Tidak"],
        ["Pembayaran &amp; kuitansi", "Lihat saja", "Ya", "Tidak"],
        ["Pemasukan", "Lihat saja", "Ya", "Tidak"],
        ["Pengeluaran — catat", "Lihat saja", "Ya", "Proyeknya saja"],
        ["Pengeluaran — hapus", "Tidak", "Ya", "Tidak"],
        ["Unggah bukti", "Ya", "Ya", "Ya"],
        ["Laporan", "Ya", "Ya", "Terbatas"],
        ["Kelola pengguna", "Tidak", "Ya", "Tidak"],
        ["Identitas perusahaan", "Ya", "Ya", "Tidak"],
        ["Jejak audit", "Ya", "Ya", "Tidak"],
    ],
    [66 * mm, 33 * mm, 33 * mm, 33 * mm],
    align={1: "CENTER", 2: "CENTER", 3: "CENTER"}))
A(Spacer(1, 8))
A(kotak("Untuk tim yang sangat kecil", [
    "Bila perusahaan hanya berisi dua orang, godaannya adalah memberi semua orang peran "
    "Admin/Finance supaya tidak ada yang terhalang. Itu menghapus satu-satunya kontrol "
    "internal yang sistem ini punya.",
    "Susunan paling ringan yang masih bermakna: <b>satu</b> Admin/Finance yang mencatat, "
    "dan <b>satu</b> Direktur yang memeriksa laporan dan jejak audit secara berkala. "
    "Yang memeriksa tidak perlu bisa mencatat.",
]))
A(PageBreak())

# ------------------------------------------------------------- BAB 4
A(P("BAB EMPAT", st_bab_no))
A(P("Alur satu proyek, dari awal sampai profit", st_bab))
A(P("Inilah jalur utama yang akan Anda tempuh puluhan kali setahun. Pahami sekali, "
    "sisanya jadi hafalan."))

langkah = [
    ("1", "Pelanggan dibuat", "Admin/Finance",
     "Cukup nama resmi lembaganya. Telepon dan email tidak wajib."),
    ("2", "Proyek dibuat", "Admin/Finance atau PM",
     "Pilih pelanggan, tetapkan PM pemegangnya, isi lokasi acara dan tanggal pelaksanaan. "
     "Kode proyek terbit sendiri. Lokasi dan tanggal ini nanti muncul otomatis di BOQ, "
     "penawaran, dan invoice — cukup diperbaiki di satu tempat."),
    ("3", "BOQ / RAB disusun", "PM",
     "Rincian pekerjaan berikut harga modal dan harga jual. Ini tempat memutuskan margin, "
     "sebelum angka apa pun sampai ke pelanggan."),
    ("4", "BOQ diajukan lalu disetujui", "PM mengajukan; Direktur atau Admin/Finance menyetujui",
     "BOQ tanpa item tidak bisa diajukan. Setelah disetujui, nilainya terkunci."),
    ("5", "Penawaran dibuat", "Admin/Finance atau PM",
     "Bisa ditarik langsung dari BOQ yang sudah disetujui — hanya harga jual yang ikut "
     "tersalin, harga modal tidak pernah keluar dari lingkungan internal."),
    ("6", "Penawaran dikirim lalu disetujui", "Direktur atau Admin/Finance",
     "Ekspor PDF, kirim ke pelanggan. Setelah pelanggan setuju, tandai Disetujui di sistem."),
    ("7", "Invoice diterbitkan", "Admin/Finance",
     "Dikonversi dari penawaran yang sudah disetujui. Seluruh item tersalin; nomor invoice "
     "terbit sendiri. Konversi hanya bisa sekali."),
    ("8", "Pembayaran dicatat", "Admin/Finance",
     "Boleh bertermin. Tiap pembayaran otomatis menerbitkan kuitansi <b>dan</b> mencatat "
     "pemasukan kas — tidak perlu dicatat dua kali."),
    ("9", "Pengeluaran proyek dicatat", "PM atau Admin/Finance",
     "Tiap biaya dikaitkan ke proyek dan vendornya, disertai bukti."),
    ("10", "Profit terbaca", "—",
     "Halaman detail proyek dan Laporan menampilkan pemasukan, pengeluaran, dan selisihnya, "
     "diperbarui saat itu juga."),
]
baris = []
for no, apa, siapa, ket in langkah:
    kiri = Paragraph(f"<b>{no}</b>", S("n", fontName="Helvetica-Bold", fontSize=13,
                                       leading=15, textColor=K_GARIS))
    kanan = [Paragraph(f"<b>{apa}</b>", st_sel_b),
             Spacer(1, 2),
             Paragraph(f"<font color='#64748b'>{siapa}</font>", st_sel),
             Spacer(1, 3),
             Paragraph(ket, st_sel)]
    baris.append([kiri, kanan])
t = Table(baris, colWidths=[11 * mm, 154 * mm])
t.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LINEBELOW", (0, 0), (-1, -2), 0.4, GARIS),
    ("LEFTPADDING", (0, 0), (0, -1), 0),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
]))
A(t)
A(Spacer(1, 10))
A(kotak("Jalur pendek", [
    "Tidak semua pekerjaan perlu BOQ. Untuk order kecil dan berulang, langkah 3 dan 4 boleh "
    "dilewati — buat penawaran langsung dari proyek.",
    "BOQ berguna ketika pekerjaannya besar, banyak vendor, atau ketika Anda perlu tahu "
    "margin sebelum menyebut harga. Untuk acara berskala penuh, jangan dilewati.",
]))
A(PageBreak())

# ------------------------------------------------------------- BAB 5
A(P("BAB LIMA", st_bab_no))
A(P("Panduan per modul", st_bab))
A(P("Buka bagian yang sedang Anda butuhkan. Tiap modul ditulis berdiri sendiri."))

A(P("Pelanggan", st_h2))
A(P("<b>Siapa:</b> Admin/Finance mengelola. Direktur dan PM hanya melihat."))
A(P("Hanya nama yang wajib. Narahubung, telepon, email, alamat, dan NPWP boleh kosong "
    "— banyak instansi cukup dicantumkan nama resminya. Alamat dan NPWP tetap "
    "sebaiknya diisi untuk pelanggan korporat, karena keduanya tercetak di invoice."))
A(P("Pelanggan hanya dapat dihapus bila belum pernah dipakai proyek, penawaran, atau invoice. "
    "Bila sudah, sistem menolak — dan itu benar: menghapusnya akan membuat dokumen lama "
    "kehilangan pemiliknya."))

A(P("Vendor", st_h2))
A(P("<b>Siapa:</b> Admin/Finance dan PM sama-sama dapat mengelola."))
A(P("Nama dan kategori wajib. Kategori dipakai untuk mengelompokkan pengeluaran di laporan, "
    "jadi jagalah konsistensinya. Nomor rekening vendor boleh disimpan untuk mempercepat "
    "pembayaran berulang."))

A(P("Proyek", st_h2))
A(P("<b>Siapa:</b> Direktur dan Admin/Finance untuk semua proyek; PM hanya proyek yang "
    "ia pegang."))
A(P("Wajib: nama proyek dan pelanggan. Sangat dianjurkan: <b>PM pemegang</b> (menentukan siapa "
    "yang bisa melihatnya), <b>lokasi acara</b>, dan <b>tanggal pelaksanaan</b>. Dua yang "
    "terakhir muncul otomatis di BOQ, penawaran, dan invoice — diisi sekali, terpakai "
    "di mana-mana."))
A(P("Status proyek: <b>Prospek</b> → <b>Berjalan</b> → <b>Selesai</b>, dengan "
    "<b>Batal</b> sebagai cabang. Perbarui status begitu keadaan berubah; dashboard "
    "menghitung “proyek berjalan” dari sini."))
A(P("Halaman detail proyek adalah tempat terbaik memeriksa kesehatan satu pekerjaan: "
    "di sana terkumpul BOQ, penawaran, invoice, seluruh biaya, dan profit berjalannya."))

A(P("BOQ / RAB", st_h2))
A(P("<b>Siapa:</b> PM menyusun untuk proyeknya; Direktur dan Admin/Finance menyetujui."))
A(P("Tiap baris memuat nama pekerjaan, deskripsi, kategori, kuantitas, satuan, jumlah hari, "
    "<b>harga modal</b>, dan <b>harga jual</b>. Kolom hari berguna untuk sewa dan tenaga "
    "harian; biarkan 1 bila tidak relevan. Subtotal dihitung kuantitas × hari × harga."))
A(P("BOQ dapat dicetak dalam dua versi:"))
A(LI("<b>Versi internal</b> — menampilkan harga modal, harga jual, dan margin. "
     "Untuk rapat internal dan persetujuan Direktur. Jangan pernah dikirim ke pelanggan."))
A(LI("<b>Versi klien</b> — hanya harga jual. Aman dilampirkan pada penawaran atau invoice."))
A(kotak("Harga modal tidak pernah bocor", [
    "Saat BOQ ditarik menjadi penawaran, hanya kolom harga jual yang tersalin. Harga modal "
    "tidak ikut ke dokumen mana pun yang keluar dari perusahaan. Ini sudah diuji khusus.",
    "Yang tetap harus Anda jaga: jangan mengekspor <b>versi internal</b> lalu mengirimkannya. "
    "Sistem tidak bisa mencegah berkas yang sudah ada di komputer Anda salah kirim.",
]))
A(P("Alur status: <b>Draft</b> → <b>Diajukan</b> → <b>Disetujui</b> atau "
    "<b>Ditolak</b> → <b>Arsip</b>. BOQ tanpa satu pun item tidak bisa diajukan. "
    "Yang sudah disetujui tidak dapat diubah nilainya; bila memang keliru, ajukan BOQ baru."))

A(P("Penawaran", st_h2))
A(P("<b>Siapa:</b> Admin/Finance dan PM menyusun; Direktur dan Admin/Finance menyetujui."))
A(P("Nomor terbit otomatis dengan pola QT-tahun-urutan dan tidak dapat diubah manual. "
    "Item dapat ditambah satu per satu atau ditarik sekaligus dari BOQ yang sudah disetujui."))
A(P("Tersedia <b>hitung mundur</b>: bila pelanggan memberi pagu — misalnya “anggaran "
    "kami 150 juta sudah termasuk pajak” — masukkan angka itu, dan sistem menghitung "
    "mundur subtotal yang diperlukan setelah diskon dan PPN. Menghemat coba-coba."))
A(P("Isi <b>nama dan jabatan penanda tangan</b> sebelum ekspor. Keduanya tercetak di blok "
    "tanda tangan PDF, lengkap dengan ruang untuk tanda tangan basah."))
A(P("Alur status: <b>Draft</b> → <b>Terkirim</b> → <b>Disetujui</b> atau "
    "<b>Ditolak</b> → <b>Dikonversi</b> menjadi invoice → <b>Arsip</b>. "
    "Hanya penawaran berstatus Draft yang boleh diubah isinya."))
A(P("Nomor rekening sengaja <b>tidak</b> dicetak di penawaran — penawaran belum tagihan.",
    st_kecil))

A(P("Invoice", st_h2))
A(P("<b>Siapa:</b> Admin/Finance menerbitkan. Direktur melihat. PM tidak melihat sama sekali."))
A(P("Cara paling aman menerbitkan invoice adalah mengonversi penawaran yang sudah disetujui: "
    "seluruh item, diskon, dan pajak tersalin persis, sehingga angka yang ditagih tidak mungkin "
    "berbeda dari yang disepakati. Satu penawaran hanya bisa dikonversi satu kali."))
A(P("Tanggal jatuh tempo wajib diisi dan tidak boleh mendahului tanggal invoice. Invoice yang "
    "lewat jatuh tempo dan belum lunas muncul dengan sendirinya di dashboard."))
A(P("PDF invoice memuat kop perusahaan, rincian item, total, <b>terbilang</b> dalam bahasa "
    "Indonesia, blok pembayaran berisi bank dan nomor rekening, catatan, serta blok "
    "tanda tangan."))
A(P("Alur status: <b>Draft</b> → <b>Terkirim</b> → <b>Sebagian Dibayar</b> → "
    "<b>Lunas</b>, dengan <b>Jatuh Tempo</b> dan <b>Batal</b> sebagai cabang. Status ini "
    "dihitung sendiri dari pembayaran yang masuk — tidak perlu diubah manual."))

A(P("Pembayaran dan kuitansi", st_h2))
A(P("<b>Siapa:</b> Admin/Finance mencatat. Direktur melihat."))
A(P("Catat tiap pembayaran dari halaman invoice: jumlah, tanggal, metode, termin ke berapa, "
    "dan catatan bila perlu. Sisa tagihan dihitung ulang saat itu juga."))
A(P("Satu pembayaran memicu tiga hal sekaligus, tanpa perlu tindakan tambahan:"))
A(NO("Status invoice diperbarui — menjadi Lunas bila sisa tagihan habis.", 1))
A(NO("Kuitansi terbit dengan nomor sendiri, siap diekspor PDF dan dikirim ke pelanggan.", 2))
A(NO("Pemasukan kas tercatat di menu Pemasukan.", 3))
A(P("Karena itu <b>jangan</b> mencatat pemasukan manual untuk pembayaran invoice — "
    "angkanya akan terhitung dua kali. Pemasukan manual hanya untuk penerimaan di luar invoice."))
A(P("Kuitansi dicetak pada kertas A5 melintang, dengan ruang khusus untuk menempel materai."))

A(P("Pemasukan dan pengeluaran", st_h2))
A(P("<b>Siapa:</b> Admin/Finance untuk keduanya; PM hanya pengeluaran pada proyeknya."))
A(P("Pengeluaran <b>wajib berkategori</b>. Kaitkan ke proyek bila memang biaya proyek; "
    "biarkan kosong untuk biaya umum kantor — tapi ingat, biaya tanpa proyek tidak "
    "masuk hitungan profit proyek mana pun."))
A(P("Baris pemasukan yang bertanda <b>gembok</b> berasal dari pembayaran invoice. Baris itu "
    "tidak dapat diubah atau dihapus dari sini; sumber kebenarannya adalah pembayaran. "
    "Bila keliru, perbaiki dari halaman invoice."))
A(P("Unggah bukti lewat tombol jepit kertas pada tiap baris. Format yang diterima JPG, PNG, "
    "WEBP, dan PDF; ukuran maksimum 5 MB. Foto struk dari ponsel biasanya sudah cukup."))

A(P("Laporan", st_h2))
A(P("<b>Siapa:</b> semua peran, dengan cakupan data sesuai peran masing-masing."))
A(P("Pilih rentang tanggal, lalu terbaca: total pemasukan, total pengeluaran, selisihnya, "
    "rekap pengeluaran per kategori, dan profit per proyek dalam periode itu. Hasilnya dapat "
    "diekspor ke CSV untuk diolah di Excel atau diserahkan ke akuntan."))
A(P("Berkas CSV memakai titik koma sebagai pemisah agar Excel berbahasa Indonesia "
    "membukanya dengan benar tanpa perlu impor manual.", st_kecil))

A(P("Jejak audit", st_h2))
A(P("<b>Siapa:</b> Direktur dan Admin/Finance."))
A(P("Mencatat pembuatan, perubahan, persetujuan, dan pembayaran — lengkap dengan pelaku, "
    "waktu, dan nilai sebelum serta sesudahnya. Catatan ini ditulis oleh basis data dan "
    "tidak dapat disunting atau dihapus oleh pengguna mana pun, termasuk Admin/Finance."))
A(P("Bagi Direktur, halaman ini adalah alat pengawasan yang paling berguna di seluruh sistem. "
    "Membukanya sekali sebulan selama lima menit sudah cukup untuk menangkap pola yang "
    "tidak wajar."))
A(PageBreak())

# ------------------------------------------------------------- BAB 6
A(P("BAB ENAM", st_bab_no))
A(P("Aturan yang ditegakkan sistem", st_bab))
A(P("Ketika sistem menolak sesuatu, ia hampir selalu benar. Tabel berikut menerjemahkan "
    "penolakan yang paling sering muncul, lengkap dengan jalan keluarnya. Simpan halaman ini "
    "dekat-dekat pada bulan-bulan pertama."))
A(Spacer(1, 4))
A(tabel(
    ["Yang Anda coba lakukan", "Mengapa ditolak", "Yang harus dilakukan"],
    [
        ["Mengubah item penawaran yang sudah dikirim atau disetujui",
         "Isi penawaran terkunci begitu keluar dari status Draft — supaya yang disepakati "
         "pelanggan tidak berubah diam-diam",
         "Kembalikan ke Draft bila baru Terkirim, atau buat penawaran baru bila sudah Disetujui"],
        ["Mengonversi penawaran yang sama dua kali",
         "Satu penawaran hanya boleh melahirkan satu invoice, agar tagihan tidak berganda",
         "Buka invoice yang sudah terbit dari penawaran itu"],
        ["Mencatat pembayaran melebihi sisa tagihan",
         "Total pembayaran tidak boleh melampaui nilai invoice",
         "Periksa sisa tagihan di halaman invoice. Bila pelanggan memang melebihkan, "
         "catat kelebihannya sebagai pemasukan tersendiri"],
        ["Mencatat pembayaran pada invoice Draft atau Batal",
         "Invoice belum atau tidak lagi berlaku sebagai tagihan",
         "Terbitkan invoice lebih dulu (ubah ke Terkirim)"],
        ["Menyimpan pengeluaran tanpa kategori",
         "Tanpa kategori, laporan pengeluaran tidak dapat dikelompokkan",
         "Isi kategori. Pakai kategori yang sudah ada bila memungkinkan"],
        ["Mengubah atau menghapus pemasukan bertanda gembok",
         "Baris itu cerminan pembayaran invoice, bukan catatan berdiri sendiri",
         "Perbaiki dari halaman invoice; baris pemasukan ikut menyesuaikan"],
        ["Menghapus pelanggan, vendor, atau proyek yang sudah dipakai",
         "Menghapusnya akan membuat dokumen lama kehilangan acuan",
         "Biarkan. Bila memang tidak dipakai lagi, tandai proyeknya Batal"],
        ["Mengajukan BOQ yang masih kosong",
         "BOQ tanpa item tidak ada yang bisa disetujui",
         "Tambahkan minimal satu item"],
        ["Mengubah nilai BOQ yang sudah disetujui",
         "Nilai yang disetujui adalah dasar penawaran — harus tetap",
         "Susun BOQ baru untuk revisinya"],
        ["Jatuh tempo lebih awal dari tanggal invoice",
         "Tanggal yang mustahil",
         "Perbaiki salah satu tanggalnya"],
    ],
    [46 * mm, 62 * mm, 57 * mm]))
A(Spacer(1, 9))
A(kotak("Bila penolakan terasa keliru", [
    "Ada kalanya aturan memang menghalangi keadaan nyata — pelanggan membatalkan setelah "
    "invoice terbit, atau nilai kontrak berubah di tengah jalan.",
    "Jalan yang benar bukan memaksa data lama berubah, melainkan <b>membatalkan</b> dokumen "
    "lama dan menerbitkan yang baru. Riwayatnya tetap utuh, dan siapa pun yang memeriksa "
    "kemudian hari bisa melihat apa yang sebenarnya terjadi.",
]))
A(PageBreak())

# ------------------------------------------------------------- BAB 7
A(P("BAB TUJUH", st_bab_no))
A(P("Menghapus: apa yang boleh, apa yang tidak", st_bab))
A(P("Sistem membedakan kesalahan ketik dari penghapusan riwayat. Yang pertama dimaafkan, "
    "yang kedua tidak."))
A(Spacer(1, 4))
A(tabel(
    ["Data", "Boleh dihapus?", "Oleh siapa"],
    [
        ["Pelanggan", "Ya, bila belum dipakai di mana pun", "Admin/Finance"],
        ["Vendor", "Ya, bila belum dipakai di mana pun", "Admin/Finance, PM"],
        ["Proyek", "Ya, bila belum punya dokumen atau transaksi",
         "Direktur, Admin/Finance,<br/>PM pemegangnya"],
        ["BOQ", "Hanya yang berstatus Draft atau Ditolak",
         "Direktur, Admin/Finance,<br/>PM pemegangnya"],
        ["Penawaran", "Hanya yang berstatus Draft", "Admin/Finance, PM penyusunnya"],
        ["Invoice", "Hanya Draft dan belum ada pembayaran", "Admin/Finance"],
        ["Transaksi kas manual", "Ya", "Admin/Finance"],
        ["Pemasukan dari pembayaran", "Tidak — hapus pembayarannya", "—"],
        ["Pembayaran", "Tidak", "—"],
        ["Kuitansi", "Tidak berdiri sendiri — ikut pembayarannya", "—"],
        ["Jejak audit", "Tidak, oleh siapa pun", "—"],
    ],
    [42 * mm, 73 * mm, 50 * mm]))
A(Spacer(1, 9))
A(P("Menghapus transaksi kas juga menghapus berkas buktinya dari penyimpanan. Bila bukti itu "
    "masih Anda perlukan, unduh dulu sebelum menghapus."))
A(kotak("Membatalkan lebih baik daripada menghapus", [
    "Untuk dokumen yang sudah terbit, sistem menyediakan status <b>Batal</b> dan <b>Arsip</b> "
    "sebagai ganti penghapusan.",
    "Nomor dokumennya tetap ada dan tidak dipakai ulang. Deretan nomor invoice yang utuh, "
    "tanpa lompatan yang tak bisa dijelaskan, adalah salah satu hal pertama yang diperiksa "
    "pemeriksa pajak maupun auditor.",
]))
A(PageBreak())

# ------------------------------------------------------------- BAB 8
A(P("BAB DELAPAN", st_bab_no))
A(P("Rutinitas harian, mingguan, bulanan", st_bab))
A(P("Sistem yang baik pun tidak berguna bila datanya tertinggal. Rutinitas berikut ringan "
    "— total kurang dari dua jam sebulan — dan itulah yang membuat angkanya "
    "layak dipercaya."))

A(P("Setiap hari", st_h2))
A(tabel(["Siapa", "Yang dikerjakan", "Perkiraan waktu"],
        [["Admin/Finance", "Catat semua kas masuk dan keluar hari itu, unggah buktinya",
          "10–15 menit"],
         ["PM", "Catat pengeluaran proyek hari itu selagi struk masih di tangan",
          "5 menit"]],
        [34 * mm, 100 * mm, 31 * mm]))

A(P("Setiap minggu", st_h2))
A(tabel(["Siapa", "Yang dikerjakan", "Perkiraan waktu"],
        [["Admin/Finance", "Periksa invoice yang mendekati atau melewati jatuh tempo, "
          "tagih yang perlu ditagih", "15 menit"],
         ["Admin/Finance", "Terbitkan invoice dari penawaran yang sudah disetujui minggu itu",
          "10 menit"],
         ["PM", "Perbarui status proyek: Prospek → Berjalan → Selesai", "5 menit"]],
        [34 * mm, 100 * mm, 31 * mm]))

A(P("Setiap bulan", st_h2))
A(tabel(["Siapa", "Yang dikerjakan", "Perkiraan waktu"],
        [["Admin/Finance", "Buka Laporan untuk bulan lalu, ekspor CSV, serahkan ke akuntan",
          "20 menit"],
         ["Admin/Finance",
          "Cocokkan saldo kas di sistem dengan mutasi rekening bank yang sebenarnya",
          "30 menit"],
         ["Direktur", "Baca laporan bulanan dan profit tiap proyek", "20 menit"],
         ["Direktur", "Buka jejak audit, telusuri sekilas perubahan yang tidak lazim",
          "5 menit"]],
        [34 * mm, 100 * mm, 31 * mm]))

A(P("Setiap akhir proyek", st_h2))
A(P("Sebelum menandai proyek <b>Selesai</b>, pastikan empat hal: seluruh invoice sudah lunas, "
    "seluruh biaya sudah tercatat, seluruh bukti sudah terunggah, dan angka profitnya masuk "
    "akal. Profit yang terlihat terlalu bagus hampir selalu berarti ada biaya yang belum "
    "dimasukkan."))

A(kotak("Pencocokan bank adalah rutinitas terpenting", [
    "Dari seluruh daftar di halaman ini, satu yang paling menentukan adalah pencocokan kas "
    "bulanan dengan mutasi rekening.",
    "Sistem ini mencatat apa yang <i>diketikkan</i> orang, bukan apa yang benar-benar terjadi "
    "di bank. Tanpa pencocokan berkala, selisih kecil menumpuk diam-diam sampai laporan "
    "kehilangan artinya.",
]))
A(PageBreak())

# ------------------------------------------------------------- BAB 9
A(P("BAB SEMBILAN", st_bab_no))
A(P("Keamanan dan pemeliharaan", st_bab))

A(P("Akun dan kata sandi", st_h2))
A(LI("Satu orang satu akun. Jangan berbagi — jejak audit jadi tidak berguna."))
A(LI("Kata sandi minimal delapan karakter, dan tidak dipakai ulang dari layanan lain."))
A(LI("Saat seseorang berhenti bekerja, <b>nonaktifkan akunnya di hari yang sama</b> lewat "
     "menu Pengguna. Ini langkah yang paling sering terlupa."))
A(LI("Beri peran sesempit mungkin. Menambah wewenang lebih mudah daripada menariknya kembali."))

A(P("Perangkat", st_h2))
A(P("Sistem dibuka lewat peramban, jadi keamanannya ikut keamanan perangkat yang dipakai. "
    "Kunci layar laptop dan ponsel dengan kata sandi. Jangan menyimpan kata sandi sistem di "
    "peramban komputer bersama. Selalu tekan <b>Keluar</b> setelah memakai komputer yang "
    "bukan milik Anda."))

A(P("Cadangan data", st_h2))
A(P("Seluruh sistem bertumpu pada satu basis data. Layanan penyimpanannya membuat cadangan "
    "harian, tetapi pada paket gratis kedalamannya terbatas."))
A(kotak("Dua hal yang belum dikerjakan dan sebaiknya segera", [
    "<b>1. Point-in-Time Recovery belum aktif.</b> Fitur ini memungkinkan pemulihan ke menit "
    "tertentu, bukan sekadar ke cadangan harian terakhir. Berbayar, tapi murah dibanding "
    "kehilangan sebulan pencatatan. Aktifkan sebelum sistem benar-benar diandalkan.",
    "<b>2. Uji keamanan peran belum pernah dijalankan.</b> Tersedia skrip berisi 32 pemeriksaan "
    "yang membuktikan tiap peran hanya melihat yang boleh dilihat. Skrip itu sudah ditulis "
    "tetapi belum pernah dijalankan, karena membutuhkan tiga akun dengan peran berbeda. "
    "Jalankan setelah ketiga akun sungguhan dibuat.",
]))
A(P("Selain itu, kebiasaan mengekspor laporan bulanan ke CSV dan menyimpannya di luar sistem "
    "adalah bentuk cadangan sederhana yang efektif — sekalipun terjadi hal terburuk, "
    "rekap bulanan Anda tetap ada."))

A(P("Kunci akses sistem", st_h2))
A(P("Aplikasi menyimpan kunci rahasia untuk berhubungan dengan basis data. Kunci itu tersimpan "
    "di pengaturan server, tidak pernah ikut ke kode program. Bila kunci tersebut pernah "
    "tertulis di catatan, riwayat percakapan, atau tangkapan layar, gantilah lewat pengaturan "
    "basis data — kemudian perbarui nilainya di pengaturan hosting."))

A(P("Memperbarui aplikasi", st_h2))
A(P("Perubahan kode yang dikirim ke penyimpanan kode akan dibangun ulang dan diterbitkan "
    "sendiri dalam waktu sekitar dua menit. Bila hasilnya bermasalah, seluruh versi sebelumnya "
    "tersimpan dan dapat dikembalikan dari panel hosting tanpa kehilangan data — basis "
    "data tidak ikut berubah."))

A(P("Batas paket gratis", st_h2))
A(P("Basis data 500 MB dan penyimpanan berkas 1 GB. Untuk satu perusahaan dengan puluhan "
    "proyek per tahun, batas ini masih sangat longgar. Yang biasanya lebih dulu penuh adalah "
    "penyimpanan bukti transaksi, bukan basis datanya — karena itu batas 5 MB per berkas "
    "diberlakukan. Foto struk dari ponsel jauh di bawah batas itu."))
A(PageBreak())

# ------------------------------------------------------------- BAB 10
A(P("BAB SEPULUH", st_bab_no))
A(P("Kalau ada masalah", st_bab))
A(Spacer(1, 2))
A(tabel(
    ["Gejala", "Kemungkinan sebab", "Yang dicoba"],
    [
        ["Tidak bisa masuk, muncul “Email atau kata sandi salah”",
         "Salah ketik, atau akun dinonaktifkan",
         "Periksa huruf besar-kecil pada email. Bila tetap gagal, minta Admin/Finance "
         "memeriksa status akun dan menyetel ulang kata sandi"],
        ["Menu yang biasa ada tiba-tiba hilang",
         "Peran akun Anda diubah",
         "Konfirmasi ke Admin/Finance. Menu memang mengikuti peran"],
        ["Halaman kosong, semua angka nol",
         "Belum ada data, atau akun belum terhubung ke perusahaan",
         "Bila baru dibuat, wajar. Bila sebelumnya ada isinya, hubungi Admin/Finance"],
        ["PDF terbuka tanpa logo",
         "Berkas logo tidak ikut terbaca oleh server",
         "Laporkan — ini masalah teknis, bukan kesalahan pemakaian"],
        ["Bukti gagal diunggah",
         "Berkas lebih dari 5 MB, atau formatnya bukan JPG/PNG/WEBP/PDF",
         "Perkecil ukuran atau ubah formatnya"],
        ["Angka profit proyek terasa terlalu besar",
         "Ada biaya yang belum dicatat, atau biaya tercatat tanpa dikaitkan ke proyek",
         "Buka detail proyek, telusuri daftar pengeluarannya"],
        ["Pemasukan terhitung dua kali",
         "Pembayaran invoice dicatat ulang sebagai pemasukan manual",
         "Hapus baris pemasukan manualnya — yang bertanda gembok adalah yang benar"],
        ["Aplikasi tidak dapat dibuka sama sekali",
         "Gangguan hosting atau jaringan",
         "Coba dari jaringan lain. Bila tetap gagal, tunggu beberapa menit — "
         "data Anda tidak hilang"],
    ],
    [45 * mm, 55 * mm, 65 * mm]))
A(Spacer(1, 10))
A(P("Sebelum melaporkan masalah", st_h2))
A(P("Sertakan empat hal ini agar tidak bolak-balik bertanya: <b>siapa</b> yang mengalaminya "
    "berikut perannya, <b>di halaman mana</b>, <b>apa yang sedang dilakukan</b> saat itu, dan "
    "<b>tangkapan layar</b> pesan kesalahannya. Pesan kesalahan sistem ini ditulis dalam "
    "bahasa Indonesia dan hampir selalu menyebutkan sebabnya."))
A(PageBreak())

# ------------------------------------------------------------- LAMPIRAN A
A(P("LAMPIRAN A", st_bab_no))
A(P("Daftar status dokumen", st_bab))

A(P("Proyek", st_h3))
A(tabel(["Status", "Artinya", "Berikutnya"],
        [["Prospek", "Belum pasti berjalan", "Berjalan, Batal"],
         ["Berjalan", "Sedang dikerjakan", "Selesai, Batal"],
         ["Selesai", "Rampung", "—"],
         ["Batal", "Tidak jadi", "—"]],
        [30 * mm, 80 * mm, 55 * mm]))

A(P("BOQ / RAB", st_h3))
A(tabel(["Status", "Artinya", "Berikutnya"],
        [["Draft", "Sedang disusun PM", "Diajukan, Arsip"],
         ["Diajukan", "Menunggu persetujuan", "Disetujui, Ditolak, kembali ke Draft"],
         ["Disetujui", "Nilai terkunci, siap ditarik ke penawaran", "Arsip"],
         ["Ditolak", "Perlu disusun ulang", "Draft, Arsip"],
         ["Arsip", "Tidak dipakai lagi", "—"]],
        [30 * mm, 80 * mm, 55 * mm]))

A(P("Penawaran", st_h3))
A(tabel(["Status", "Artinya", "Berikutnya"],
        [["Draft", "Sedang disusun — satu-satunya status yang isinya bisa diubah",
          "Terkirim, Arsip"],
         ["Terkirim", "Sudah dikirim ke pelanggan", "Disetujui, Ditolak, kembali ke Draft"],
         ["Disetujui", "Pelanggan setuju", "Dikonversi, Arsip"],
         ["Ditolak", "Pelanggan tidak setuju", "Draft, Arsip"],
         ["Dikonversi", "Sudah menjadi invoice", "—"],
         ["Arsip", "Tidak dipakai lagi", "—"]],
        [30 * mm, 80 * mm, 55 * mm]))

A(P("Invoice", st_h3))
A(tabel(["Status", "Artinya", "Berikutnya"],
        [["Draft", "Belum diterbitkan", "Terkirim, Batal"],
         ["Terkirim", "Sudah ditagihkan", "Sebagian Dibayar, Lunas, Batal"],
         ["Sebagian Dibayar", "Ada pembayaran, belum lunas", "Lunas, Terkirim, Batal"],
         ["Jatuh Tempo", "Lewat tanggal, belum lunas", "Sebagian Dibayar, Lunas, Batal"],
         ["Lunas", "Terbayar penuh", "—"],
         ["Batal", "Dibatalkan", "—"]],
        [30 * mm, 80 * mm, 55 * mm]))
A(Spacer(1, 6))
A(P("Status <b>Sebagian Dibayar</b>, <b>Lunas</b>, dan <b>Jatuh Tempo</b> dihitung sendiri "
    "oleh sistem dari pembayaran yang masuk dan tanggal berjalan — tidak diubah manual.",
    st_kecil))
A(PageBreak())

# ------------------------------------------------------------- LAMPIRAN B
A(P("LAMPIRAN B", st_bab_no))
A(P("Ceklis sebelum dipakai sungguhan", st_bab))
A(P("Centang seluruh baris berikut sebelum proyek sungguhan pertama dimasukkan."))
A(Spacer(1, 4))


def kotak_centang():
    """Kotak kosong digambar sendiri.

    Karakter Unicode U+25A1 tidak ada di font bawaan Helvetica dan
    tercetak sebagai balok hitam pekat, jadi bentuknya digambar.
    """
    d = Drawing(4.2 * mm, 4.6 * mm)
    d.add(Rect(0, 0.4 * mm, 3.6 * mm, 3.6 * mm,
               strokeColor=ABU_MUD, strokeWidth=0.8, fillColor=None))
    return d


def ceklis(judul, butir):
    hasil = [Paragraph(judul, st_h3)]
    baris_c = [[kotak_centang(), Paragraph(b, st_sel)] for b in butir]
    tt = Table(baris_c, colWidths=[8 * mm, 157 * mm])
    tt.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, GARIS),
    ]))
    hasil.append(tt)
    return hasil


for blok in [
    ceklis("Penyiapan", [
        "Identitas perusahaan terisi lengkap — nama, alamat, telepon, email, NPWP",
        "Nama bank, nomor rekening, dan atas nama sudah diperiksa <b>dua kali</b>",
        "Logo perusahaan tampil di sidebar aplikasi",
        "Akun dibuat untuk setiap orang, dengan peran masing-masing",
        "Tidak ada akun yang dipakai bersama-sama",
    ]),
    ceklis("Uji coba menyeluruh", [
        "Masuk berhasil dengan ketiga peran, dan tiap peran hanya melihat menu yang seharusnya",
        "Buat pelanggan, proyek, dan penawaran percobaan sampai selesai",
        "Ekspor PDF penawaran — <b>pastikan logo dan kop perusahaan muncul</b>",
        "Konversi ke invoice, catat pembayaran, periksa kuitansi terbit sendiri",
        "Periksa pemasukan tercatat sendiri dan tidak berganda",
        "Unggah satu bukti transaksi, lalu buka kembali dari baris transaksinya",
        "Buka Laporan, ekspor CSV, buka berkasnya di Excel",
        "Hapus seluruh data percobaan sebelum data sungguhan masuk",
    ]),
    ceklis("Kesepakatan tim", [
        "Semua orang sudah membaca Bab 1 sampai 4 buku ini",
        "Sudah disepakati kapan pengeluaran dicatat — anjuran: di hari yang sama",
        "Sudah disepakati siapa menyetujui penawaran, dan pada nilai berapa harus Direktur",
        "Sudah disepakati mulai nilai berapa bukti transaksi wajib diunggah",
        "Sudah disepakati tanggal pencocokan kas dengan mutasi bank tiap bulan",
    ]),
    ceklis("Sebelum benar-benar diandalkan", [
        "Point-in-Time Recovery diaktifkan pada layanan basis data",
        "Uji keamanan peran (32 pemeriksaan) dijalankan setelah ketiga akun sungguhan ada",
        "Kunci akses sistem diganti bila pernah tertulis di catatan atau tangkapan layar",
    ]),
]:
    for x in blok:
        A(x)
    A(Spacer(1, 7))

A(Spacer(1, 10))
A(kotak("Terakhir", [
    "Sistem ini menegakkan aturan, bukan menggantikan ketelitian. Ia dapat menolak pembayaran "
    "yang melebihi tagihan, tetapi tidak dapat mengetahui apakah angka yang Anda ketikkan "
    "memang angka yang benar.",
    "Dua kebiasaan yang menentukan segalanya: <b>catat di hari yang sama</b>, dan "
    "<b>cocokkan dengan bank setiap bulan</b>. Selebihnya sistem yang mengurus.",
], warna=LATAR, garis=TINTA))

doc.build(E)
print("selesai:", OUT)
