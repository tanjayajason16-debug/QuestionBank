-- ============================================================
-- SEED DATA — Platform Tryout Online
-- Run after migrations. Creates demo categories, questions,
-- one tryout, and sample access codes.
-- ============================================================

-- ============================================================
-- 1. CATEGORIES
-- ============================================================
INSERT INTO categories (id, name, education_level, subject, grade) VALUES
  ('cat-sd-mat',   'Matematika SD',              'SD',               'Matematika',        NULL),
  ('cat-smp-mat',  'Matematika SMP',             'SMP',              'Matematika',        8),
  ('cat-sma-mat',  'Matematika SMA',             'SMA',              'Matematika',        11),
  ('cat-pt-mat',   'Matematika Perguruan Tinggi', 'Perguruan Tinggi', 'Matematika',        NULL),
  ('cat-bind',     'Bahasa Indonesia',           NULL,               'Bahasa Indonesia',  NULL),
  ('cat-bing',     'Bahasa Inggris',             NULL,               'Bahasa Inggris',    NULL),
  ('cat-ipa',      'IPA',                        'SMP',              'IPA',               NULL),
  ('cat-ips',      'IPS',                        'SMP',              'IPS',               NULL),
  ('cat-fisika',   'Fisika',                     'SMA',              'Fisika',            NULL),
  ('cat-kimia',    'Kimia',                      'SMA',              'Kimia',             NULL),
  ('cat-biologi',  'Biologi',                    'SMA',              'Biologi',           NULL)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. QUESTIONS — Matematika SMP (20 soal kelas 8)
-- ============================================================
INSERT INTO questions (id, category_id, grade, difficulty, question, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES

-- Algebra
('q-smp-01','cat-smp-mat',8,'easy',
 'Jika 2x + 5 = 15, maka nilai x adalah ...',
 '3','5','7','10','B',
 'Kurangi 5 dari kedua sisi: 2x = 10. Bagi dengan 2: x = 5.'),

('q-smp-02','cat-smp-mat',8,'easy',
 'Nilai dari 3(x - 2) = 12 adalah ...',
 '2','4','6','8','C',
 '3x - 6 = 12 → 3x = 18 → x = 6.'),

('q-smp-03','cat-smp-mat',8,'medium',
 'Jika x² = 49, maka nilai x yang positif adalah ...',
 '5','6','7','8','C',
 '√49 = 7, jadi x = 7.'),

('q-smp-04','cat-smp-mat',8,'medium',
 'Tentukan nilai y dari persamaan 5y - 3 = 2y + 9.',
 '2','3','4','5','C',
 '5y - 2y = 9 + 3 → 3y = 12 → y = 4.'),

('q-smp-05','cat-smp-mat',8,'hard',
 'Sistem persamaan: x + y = 10 dan x - y = 4. Nilai x adalah ...',
 '3','5','6','7','D',
 'Tambahkan kedua persamaan: 2x = 14 → x = 7.'),

-- Geometri
('q-smp-06','cat-smp-mat',8,'easy',
 'Luas persegi dengan sisi 9 cm adalah ...',
 '18 cm²','36 cm²','72 cm²','81 cm²','D',
 'Luas persegi = sisi × sisi = 9 × 9 = 81 cm².'),

('q-smp-07','cat-smp-mat',8,'easy',
 'Keliling lingkaran dengan jari-jari 7 cm adalah ... (π = 22/7)',
 '22 cm','44 cm','66 cm','88 cm','B',
 'K = 2πr = 2 × 22/7 × 7 = 44 cm.'),

('q-smp-08','cat-smp-mat',8,'medium',
 'Luas segitiga siku-siku dengan alas 8 cm dan tinggi 6 cm adalah ...',
 '14 cm²','24 cm²','48 cm²','96 cm²','B',
 'L = ½ × alas × tinggi = ½ × 8 × 6 = 24 cm².'),

('q-smp-09','cat-smp-mat',8,'medium',
 'Volume balok dengan panjang 5 cm, lebar 4 cm, dan tinggi 3 cm adalah ...',
 '12 cm³','20 cm³','60 cm³','120 cm³','C',
 'V = p × l × t = 5 × 4 × 3 = 60 cm³.'),

('q-smp-10','cat-smp-mat',8,'hard',
 'Teorema Pythagoras: Jika siku-siku dengan kaki 6 dan 8, maka hipotenusa adalah ...',
 '8','9','10','12','C',
 'c² = 6² + 8² = 36 + 64 = 100 → c = 10.'),

-- Statistika
('q-smp-11','cat-smp-mat',8,'easy',
 'Rata-rata dari data: 4, 6, 8, 10, 12 adalah ...',
 '7','8','9','10','B',
 'Rata-rata = (4+6+8+10+12)/5 = 40/5 = 8.'),

('q-smp-12','cat-smp-mat',8,'easy',
 'Median dari data: 3, 5, 7, 9, 11 adalah ...',
 '5','6','7','9','C',
 'Data sudah terurut, nilai tengah (ke-3) = 7.'),

('q-smp-13','cat-smp-mat',8,'medium',
 'Modus dari data: 2, 3, 3, 4, 5, 5, 5, 6 adalah ...',
 '3','4','5','6','C',
 'Modus adalah nilai yang paling sering muncul = 5 (muncul 3 kali).'),

('q-smp-14','cat-smp-mat',8,'medium',
 'Jangkauan (range) dari data: 15, 22, 8, 19, 11 adalah ...',
 '7','11','14','22','C',
 'Jangkauan = nilai max - nilai min = 22 - 8 = 14.'),

-- Bilangan
('q-smp-15','cat-smp-mat',8,'easy',
 'FPB dari 24 dan 36 adalah ...',
 '6','8','12','18','C',
 '24 = 2³×3, 36 = 2²×3². FPB = 2²×3 = 12.'),

('q-smp-16','cat-smp-mat',8,'easy',
 'KPK dari 4 dan 6 adalah ...',
 '8','12','16','24','B',
 'KPK = 2²×3 = 12.'),

('q-smp-17','cat-smp-mat',8,'medium',
 'Hasil dari (-8) × (-5) + 10 adalah ...',
 '30','40','50','60','C',
 '(-8)×(-5) = 40, lalu 40 + 10 = 50.'),

('q-smp-18','cat-smp-mat',8,'medium',
 'Nilai dari 2³ × 2² adalah ...',
 '10','16','32','64','C',
 '2³ × 2² = 2^(3+2) = 2⁵ = 32.'),

('q-smp-19','cat-smp-mat',8,'hard',
 'Jika a = 3 dan b = -2, nilai dari a² - 2ab + b² adalah ...',
 '1','5','25','29','C',
 'a² - 2ab + b² = (a-b)² = (3-(-2))² = 5² = 25.'),

('q-smp-20','cat-smp-mat',8,'hard',
 'Perbandingan uang Ani dan Budi adalah 3:5. Jika total Rp800.000, uang Budi adalah ...',
 'Rp200.000','Rp300.000','Rp400.000','Rp500.000','D',
 'Bagian Budi = 5/(3+5) × 800.000 = 5/8 × 800.000 = Rp500.000.')

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. QUESTIONS — Bahasa Indonesia (10 soal)
-- ============================================================
INSERT INTO questions (id, category_id, grade, difficulty, question, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES

('q-bind-01','cat-bind',8,'easy',
 'Antonim dari kata "besar" adalah ...',
 'tinggi','kecil','panjang','luas','B',
 'Antonim (lawan kata) dari "besar" adalah "kecil".'),

('q-bind-02','cat-bind',8,'easy',
 'Sinonim dari kata "pandai" adalah ...',
 'bodoh','malas','pintar','lambat','C',
 'Sinonim (persamaan kata) dari "pandai" adalah "pintar".'),

('q-bind-03','cat-bind',8,'easy',
 'Kata "membaca" berawalan me-. Kata dasar yang tepat adalah ...',
 'embaca','baca','mbaca','aca','B',
 'Kata dasar dari "membaca" adalah "baca" (me + baca).'),

('q-bind-04','cat-bind',8,'medium',
 'Kalimat manakah yang menggunakan tanda baca yang tepat?',
 'Ibu pergi kepasar','Ibu pergi ke pasar.','ibu pergi ke pasar','Ibu, pergi ke pasar','B',
 'Kalimat baku diawali huruf kapital dan diakhiri titik: "Ibu pergi ke pasar."'),

('q-bind-05','cat-bind',8,'medium',
 'Kata berimbuhan "per-an" yang tepat adalah ...',
 'permasalah','permasalahan','permasalan','pemasalahan','B',
 '"Permasalahan" adalah bentuk baku dari kata dasar "masalah" + per-an.'),

('q-bind-06','cat-bind',8,'medium',
 'Paragraf yang kalimat utamanya berada di awal disebut ...',
 'induktif','deduktif','campuran','naratif','B',
 'Paragraf deduktif memiliki kalimat utama di bagian awal paragraf.'),

('q-bind-07','cat-bind',8,'easy',
 'Ejaan yang benar untuk nama ibu kota Indonesia adalah ...',
 'jakarta','JAKARTA','Jakarta','jaKarta','C',
 'Nama kota ditulis dengan huruf kapital di awal: "Jakarta".'),

('q-bind-08','cat-bind',8,'hard',
 'Kalimat "Buku itu dibaca oleh Ani" adalah kalimat ...',
 'aktif','pasif','majemuk','tunggal','B',
 'Kalimat pasif ditandai dengan predikat yang menggunakan awalan di-, seperti "dibaca".'),

('q-bind-09','cat-bind',8,'medium',
 'Gabungan dua kalimat atau lebih yang dihubungkan dengan konjungsi disebut kalimat ...',
 'tunggal','pasif','majemuk','aktif','C',
 'Kalimat majemuk adalah gabungan dua klausa atau lebih yang dihubungkan konjungsi.'),

('q-bind-10','cat-bind',8,'hard',
 'Majas yang menyatakan sesuatu yang berlebihan disebut ...',
 'metafora','personifikasi','hiperbola','simile','C',
 'Hiperbola adalah majas yang melebih-lebihkan sesuatu dari kenyataan.')

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. QUESTIONS — IPA (5 soal)
-- ============================================================
INSERT INTO questions (id, category_id, grade, difficulty, question, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES

('q-ipa-01','cat-ipa',8,'easy',
 'Zat yang bersifat asam memiliki pH ...',
 'lebih dari 7','sama dengan 7','kurang dari 7','sama dengan 14','C',
 'Asam memiliki pH < 7, netral pH = 7, basa pH > 7.'),

('q-ipa-02','cat-ipa',8,'easy',
 'Satuan internasional untuk gaya adalah ...',
 'Joule','Watt','Newton','Pascal','C',
 'Satuan SI untuk gaya adalah Newton (N).'),

('q-ipa-03','cat-ipa',8,'medium',
 'Proses perubahan air menjadi uap disebut ...',
 'kondensasi','evaporasi','sublimasi','deposisi','B',
 'Evaporasi adalah perubahan wujud cair menjadi gas (uap).'),

('q-ipa-04','cat-ipa',8,'medium',
 'Organel sel yang berfungsi sebagai pusat kendali sel adalah ...',
 'mitokondria','ribosom','nukleus','vakuola','C',
 'Nukleus (inti sel) berfungsi sebagai pusat kendali dan mengandung DNA.'),

('q-ipa-05','cat-ipa',8,'hard',
 'Jika sebuah benda bermassa 2 kg dikenai gaya 10 N, percepatannya adalah ...',
 '2 m/s²','5 m/s²','10 m/s²','20 m/s²','B',
 'F = ma → a = F/m = 10/2 = 5 m/s².')

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. EXAM — Matematika SMP Paket 01
-- ============================================================
INSERT INTO exams (
  id, title, description, category_id, grade,
  question_count, duration_minutes, passing_score,
  selection_mode, randomize_questions, randomize_answers,
  show_explanations, allow_retake, status
) VALUES (
  'exam-demo-01',
  'Matematika SMP - Paket 01',
  'Tryout Matematika SMP kelas 8 semester 1. Mencakup aljabar, geometri, dan statistika.',
  'cat-smp-mat', 8,
  10, 30, 70,
  'manual', false, false,
  true, false, 'active'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. EXAM QUESTIONS (10 soal pertama dari bank)
-- ============================================================
INSERT INTO exam_questions (exam_id, question_id, order_index) VALUES
  ('exam-demo-01','q-smp-01',1),
  ('exam-demo-01','q-smp-02',2),
  ('exam-demo-01','q-smp-03',3),
  ('exam-demo-01','q-smp-04',4),
  ('exam-demo-01','q-smp-05',5),
  ('exam-demo-01','q-smp-06',6),
  ('exam-demo-01','q-smp-07',7),
  ('exam-demo-01','q-smp-08',8),
  ('exam-demo-01','q-smp-11',9),
  ('exam-demo-01','q-smp-15',10)
ON CONFLICT (exam_id, question_id) DO NOTHING;

-- ============================================================
-- 7. ACCESS CODES (10 kode demo)
-- ============================================================
INSERT INTO access_codes (exam_id, code, max_usage, expires_at, is_active) VALUES
  ('exam-demo-01','MAT8-DEMO1',5,  NOW() + INTERVAL '90 days', true),
  ('exam-demo-01','MAT8-DEMO2',1,  NOW() + INTERVAL '90 days', true),
  ('exam-demo-01','MAT8-DEMO3',1,  NOW() + INTERVAL '90 days', true),
  ('exam-demo-01','MAT8-DEMO4',1,  NOW() + INTERVAL '90 days', true),
  ('exam-demo-01','MAT8-DEMO5',1,  NOW() + INTERVAL '90 days', true),
  ('exam-demo-01','MAT8-TEST1',10, NOW() + INTERVAL '90 days', true),
  ('exam-demo-01','MAT8-TEST2',10, NOW() + INTERVAL '90 days', true),
  ('exam-demo-01','MAT8-TEST3',10, NOW() + INTERVAL '90 days', true),
  ('exam-demo-01','MAT8-FREE1',99, NOW() + INTERVAL '365 days', true),
  ('exam-demo-01','MAT8-COBA1',1,  NULL, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- NOTE: Admin users must be created through Supabase Auth
-- (Dashboard → Authentication → Users → Add user)
-- The handle_new_user trigger will auto-create the profile.
-- ============================================================
