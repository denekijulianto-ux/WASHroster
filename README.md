# Roster WASH PMI

Aplikasi web roster relawan & staf WASH: pendaftaran dengan verifikasi email,
Mode Admin (dengan password) dan Mode Anggota, alert penugasan via email/WhatsApp,
seleksi kandidat, pengumuman anggota terpilih, kartu ID penugasan, dan laporan
pasca penugasan. Tampilan menyesuaikan HP (navigasi bawah).

- **Frontend:** HTML + JavaScript (Vite), tanpa framework.
- **Backend:** [Supabase](https://supabase.com): database Postgres, login email (kode verifikasi), penyimpanan foto, realtime.
- **Hosting:** situs statis biasa (Vercel, Netlify, atau Cloudflare Pages).

## Cara kerja login

| Peran | Cara masuk | Yang bisa dilakukan |
|---|---|---|
| Anggota | Email aktif → kode verifikasi dikirim ke email → isi formulir pendaftaran | Lihat profil sendiri, alert tersedia, penugasan berlangsung, pengumuman, kartu ID sendiri, kirim laporan |
| Admin | Email + **password** | Semua hal di atas, plus tambah/hapus anggota, buat alert, seleksi kandidat, pengumuman, impor/ekspor, kelola admin |

Hak admin dijaga di server: database hanya memberi akses admin bila akun tercatat
di tabel `admins` **dan** sesi masuk dengan password. Admin yang masuk dengan kode
email saja tetap diperlakukan sebagai anggota sampai memasukkan password.

---

## Langkah pemasangan

### 1. Buat proyek Supabase
1. Daftar di https://supabase.com, lalu **New project**. Pilih region **Southeast Asia (Singapore)**.
2. Simpan password database di tempat aman.

### 2. Pasang database
1. Buka **SQL Editor → New query**.
2. Tempel seluruh isi `supabase/schema.sql`, lalu tekan **Run**.
   File ini membuat tabel, aturan akses, fungsi server, bucket foto `photos`, dan realtime.
   Aman dijalankan ulang bila nanti ada pembaruan.

### 3. Atur login email
1. **Authentication → Sign In / Providers → Email**: pastikan *Enable Email provider* aktif.
2. **Authentication → Emails → Templates → Magic Link**: ganti isinya supaya memuat kode, misalnya:

   ```html
   <h2>Kode masuk Roster WASH PMI</h2>
   <p>Kode verifikasi Anda:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>Atau tekan tautan ini untuk langsung masuk: <a href="{{ .ConfirmationURL }}">Masuk ke Roster WASH</a></p>
   <p>Abaikan email ini bila Anda tidak meminta kode.</p>
   ```

   Lakukan hal yang sama untuk template **Confirm signup**.
3. **Authentication → URL Configuration**: isi **Site URL** dengan alamat aplikasi
   setelah di-hosting (misalnya `https://roster-wash.vercel.app`). Tambahkan alamat yang
   sama ke **Redirect URLs**, dan `http://localhost:5173` untuk uji coba di komputer.
4. **Penting untuk pemakaian sungguhan: SMTP sendiri.** Pengirim email bawaan Supabase
   hanya untuk uji coba (dibatasi beberapa email per jam). Buka
   **Authentication → Emails → SMTP Settings** dan isi dengan layanan seperti
   Resend, Brevo, atau Mailgun. Pakai alamat pengirim dari domain organisasi Anda.

### 4. Buat admin pertama
1. **Authentication → Users → Add user → Create new user**: isi email dan password admin,
   lalu centang **Auto Confirm User**.
2. Di **SQL Editor**, jalankan (ganti emailnya):

   ```sql
   insert into public.admins (user_id, email)
   select id, lower(email) from auth.users where lower(email) = 'admin@contoh.id';
   ```

3. Admin berikutnya ditunjuk dari dalam aplikasi lewat **Kelola admin**. Orangnya harus
   sudah pernah masuk sekali dengan kode email. Setelah ditunjuk, ia menekan
   **Mode Admin** dan membuat password sendiri.

### 5. Jalankan di komputer (opsional)
```bash
cp .env.example .env      # isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
npm install
npm run dev               # buka http://localhost:5173
```
URL dan *anon key* ada di **Project Settings → API**. *Anon key* memang aman diletakkan
di aplikasi web karena semua akses dijaga aturan database. Jangan pernah memakai
*service_role key* di aplikasi ini.

### 6. Hosting (contoh: Vercel)
1. Simpan proyek ini di GitHub.
2. Di https://vercel.com: **Add New → Project**, lalu pilih repositori ini.
3. Framework: **Vite**, build command `npm run build`, output directory `dist`.
4. **Environment Variables**: isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
5. Deploy. Salin alamatnya ke **Site URL** dan **Redirect URLs** Supabase (langkah 3.3).

Netlify dan Cloudflare Pages memakai pengaturan yang sama (build `npm run build`, folder `dist`).

### 7. Pindahkan data lama
Di aplikasi lama (artifact claude.ai), buka tab **Laporan** atau **Anggota Roster**,
tekan **Ekspor .xlsx**, lalu di aplikasi baru pakai **Impor Excel / CSV**. Anggota yang
nanti mendaftar dengan email yang sama otomatis tersambung ke data impornya, tanpa dobel.

---

## Sinkron Google Sheets
Di Mode Admin, tombol **Google Sheets** membaca spreadsheet (misalnya hasil Google Form)
setiap kali admin membuka aplikasi, lalu tiap 10 menit selama aplikasi terbuka. Agar bisa
dibaca, spreadsheet harus dibagikan **"Siapa saja yang memiliki link" (Pelihat)**. Artinya
siapa pun yang memegang link bisa melihat isinya, jadi simpan link itu hanya di antara admin.
Anggota dicocokkan lewat email/nomor WA, dan data yang diisi anggota sendiri tidak ditimpa.

## Keamanan & privasi
- Anggota hanya bisa membaca data dirinya, daftar alert, dan nama/foto anggota yang **terpilih**
  (untuk pengumuman & penugasan berlangsung).
- Foto profil disimpan di bucket publik `photos` dengan nama file acak. Foto bisa dibuka oleh
  siapa pun yang tahu URL lengkapnya, tetapi URL itu tidak bisa ditebak.
- Email dan nomor WA anggota hanya terlihat oleh admin.
- Tombol Email/WhatsApp membuka aplikasi email/WA admin dengan pesan yang sudah terisi.
  Pesan terkirim setelah admin menekan kirim di aplikasi tersebut.

## Struktur proyek
```
index.html                 tampilan & gaya (dibuat dari tools/artifact-source.html)
src/app.js                 logika aplikasi (dibuat oleh tools/build_from_artifact.py)
supabase/schema.sql        database, aturan akses, fungsi server
tools/artifact-source.html sumber tampilan (versi artifact)
tools/backend.part.js      koneksi Supabase, login, kelola admin
tools/build_from_artifact.py  menyusun index.html + src/app.js dari dua file di atas
tools/test/                uji tampilan dengan backend tiruan
```
Setelah mengubah `tools/artifact-source.html` atau `tools/backend.part.js`, jalankan
`python3 tools/build_from_artifact.py` agar `index.html` dan `src/app.js` diperbarui.

### Uji tampilan (untuk pengembang)
```bash
MOCK=1 npx vite --port 5179 &
node tools/test/e2e.cjs     # butuh Playwright
```
Uji ini memakai backend tiruan di browser (`tools/test/mock-supabase.js`), bukan Supabase sungguhan.
