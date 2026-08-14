# Platform Tryout Online

Aplikasi ujian/tryout online berbasis Next.js 14 + Supabase. Mendukung manajemen soal, kode akses, timer server-side, penilaian otomatis, dan analitik.

---

## Fitur Utama

### Admin
- Dashboard statistik (soal, tryout, siswa, nilai rata-rata, tingkat kelulusan)
- Bank soal dengan CRUD lengkap + impor CSV massal + pratinjau
- Manajemen kategori soal
- Pembuatan tryout (manual/acak, timer, nilai kelulusan, jadwal)
- Pemilihan soal manual (checkbox) atau acak (auto-pilih)
- Generator kode akses bulk (prefiks, batas penggunaan, tanggal kadaluarsa)
- Halaman hasil dengan filter + ekspor CSV
- Analitik per-tryout dengan analisis per-soal (% jawaban benar)
- Manajemen siswa

### Siswa (tanpa login)
- Input biodata + kode tryout → validasi server-side
- Antarmuka ujian dengan timer server-authoritative
- Autosave jawaban (400ms debounce)
- Tandai soal untuk ditinjau
- Navigator soal dengan status (dijawab/belum/ditandai)
- Auto-submit saat waktu habis
- Halaman hasil dengan skor, lulus/tidak, dan tinjauan jawaban (opsional)

### Keamanan
- Jawaban benar tidak pernah dikirim ke browser siswa
- Penilaian 100% server-side via fungsi PostgreSQL
- Timer dikontrol server (expires_at di DB)
- RLS (Row Level Security) aktif pada semua tabel
- API student menggunakan service role key, tidak pernah diekspos ke client

---

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Framework | Next.js 14 (App Router) |
| Bahasa | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Deployment | Vercel |

---

## Setup Lokal

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/tryout-platform.git
cd tryout-platform
npm install
```

### 2. Buat Proyek Supabase

1. Kunjungi [supabase.com](https://supabase.com) → **New Project**
2. Simpan **Project URL**, **Anon Key**, dan **Service Role Key**

### 3. Jalankan Migrasi Database

Di **Supabase Dashboard → SQL Editor**, jalankan file-file berikut secara berurutan:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_functions.sql
```

Opsional — untuk data demo:

```
supabase/seed.sql
```

### 4. Buat Admin User Pertama

Di **Supabase Dashboard → Authentication → Users → Add user**:
- Email: `admin@sekolah.com`
- Password: pilih password kuat
- Trigger `handle_new_user` akan otomatis membuat profil admin

### 5. Konfigurasi Environment

Salin `.env.local.example` menjadi `.env.local` dan isi nilainya:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> ⚠️ **JANGAN** commit `.env.local` ke Git. File ini sudah ada di `.gitignore`.

### 6. Jalankan Dev Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## Deploy ke Vercel

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "Initial commit: Tryout Platform"
git remote add origin https://github.com/YOUR_USERNAME/tryout-platform.git
git push -u origin main
```

### 2. Import di Vercel

1. Buka [vercel.com](https://vercel.com) → **Add New Project**
2. Import repository dari GitHub
3. Framework akan terdeteksi otomatis sebagai **Next.js**

### 3. Tambahkan Environment Variables

Di **Vercel Dashboard → Project → Settings → Environment Variables**, tambahkan:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase Anda |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key dari Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (rahasia!) |
| `NEXT_PUBLIC_APP_URL` | URL deployment Vercel (contoh: `https://tryout.vercel.app`) |

### 4. Deploy

Klik **Deploy**. Vercel akan build dan deploy otomatis.

Setelah deploy, setiap push ke branch `main` akan trigger deployment baru secara otomatis.

---

## Struktur Proyek

```
src/
├── app/
│   ├── admin/                  # Admin panel (protected)
│   │   ├── analytics/          # Halaman analitik
│   │   ├── access-codes/       # Manajemen kode akses
│   │   ├── categories/         # Manajemen kategori
│   │   ├── login/              # Halaman login admin
│   │   ├── questions/          # Bank soal
│   │   ├── results/            # Hasil tryout
│   │   ├── students/           # Data siswa
│   │   ├── tryouts/            # Manajemen tryout
│   │   │   ├── create/         # Buat tryout baru (2-step)
│   │   │   └── [id]/edit/      # Edit tryout
│   │   ├── layout.tsx          # Layout admin + auth guard
│   │   └── page.tsx            # Dashboard
│   ├── api/
│   │   └── tryout/
│   │       ├── validate-code/  # POST: validasi kode + buat attempt
│   │       └── attempt/[id]/
│   │           ├── route.ts    # GET: soal exam (tanpa jawaban benar)
│   │           ├── answer/     # POST: autosave jawaban
│   │           ├── submit/     # POST: submit + penilaian
│   │           └── result/     # GET: hasil + tinjauan
│   ├── tryout/                 # Halaman siswa
│   │   ├── page.tsx            # Landing: biodata + kode akses
│   │   └── exam/[id]/
│   │       ├── instructions/   # Petunjuk ujian
│   │       ├── page.tsx        # Interface ujian
│   │       └── result/         # Halaman hasil
│   ├── globals.css
│   ├── layout.tsx              # Root layout (I18n + Toast)
│   └── page.tsx                # Redirect ke /tryout
├── components/
│   ├── admin/
│   │   ├── Sidebar.tsx
│   │   ├── PageHeader.tsx
│   │   ├── questions/          # QuestionForm, QuestionPreview, CsvImport
│   │   └── tryouts/            # TryoutForm, QuestionSelector
│   └── ui/                     # Button, Input, Table, Dialog, Badge, dll
├── lib/
│   ├── csv/validateImport.ts   # Validasi & parsing CSV impor soal
│   ├── i18n/                   # Terjemahan ID/EN + context
│   ├── supabase/               # client, server, admin, middleware
│   └── utils.ts                # Helper (cn, formatDate, dll)
├── middleware.ts               # Proteksi route /admin
└── types/
    └── database.ts             # TypeScript types dari skema DB

supabase/
├── migrations/
│   ├── 001_initial_schema.sql  # Tabel, trigger, index
│   ├── 002_rls_policies.sql    # RLS policies + is_admin()
│   └── 003_functions.sql       # grade_attempt(), get_exam_analytics()
└── seed.sql                    # Data demo (kategori, soal, tryout, kode)
```

---

## URL Halaman

| URL | Deskripsi |
|---|---|
| `/` | Redirect ke `/tryout` |
| `/tryout` | Halaman landing siswa |
| `/tryout/exam/[id]/instructions` | Petunjuk ujian |
| `/tryout/exam/[id]` | Interface ujian |
| `/tryout/exam/[id]/result` | Hasil & tinjauan jawaban |
| `/admin/login` | Login admin |
| `/admin` | Dashboard admin |
| `/admin/categories` | Manajemen kategori |
| `/admin/questions` | Bank soal |
| `/admin/tryouts` | Daftar tryout |
| `/admin/tryouts/create` | Buat tryout baru |
| `/admin/tryouts/[id]/edit` | Edit tryout |
| `/admin/access-codes` | Kode akses |
| `/admin/students` | Data siswa |
| `/admin/results` | Hasil tryout |
| `/admin/analytics` | Analitik |

---

## Bahasa / Language

Aplikasi mendukung dua bahasa: **Indonesia (default)** dan **Inggris**.

Untuk mengganti bahasa, klik tombol **ID / EN** di pojok sidebar admin atau halaman landing siswa. Preferensi disimpan di localStorage.

Untuk menambah bahasa baru, tambahkan entri di `src/lib/i18n/translations.ts` dan daftarkan tipe `Locale` di baris terakhir file tersebut.

---

## Format CSV Impor Soal

| Kolom | Wajib | Keterangan |
|---|---|---|
| `category` | ✓ | Harus sama persis dengan nama kategori di database |
| `grade` | ✓ | Angka 1–13 |
| `difficulty` | ✓ | `easy`, `medium`, atau `hard` |
| `question` | ✓ | Teks pertanyaan |
| `image_url` | — | URL gambar (opsional) |
| `option_a` | ✓ | Teks opsi A |
| `option_b` | ✓ | Teks opsi B |
| `option_c` | ✓ | Teks opsi C |
| `option_d` | ✓ | Teks opsi D |
| `correct_answer` | ✓ | `A`, `B`, `C`, atau `D` |
| `explanation` | ✓ | Penjelasan jawaban benar |

Template CSV tersedia di halaman Bank Soal → Impor CSV → Unduh Template.

---

## Lisensi

MIT
