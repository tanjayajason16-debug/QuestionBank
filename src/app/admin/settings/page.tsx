'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/admin/PageHeader'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog'
import { toast } from '@/components/ui/Toast'
import type { ToastPosition } from 'react-hot-toast'

type ThemeMode = 'light' | 'dark' | 'system'

type ClearTarget = 'attempts' | 'students' | 'access_codes' | 'questions' | null

export default function SettingsPage() {
  const supabase = createClient()

  // 1. Theme State
  const [theme, setTheme] = useState<ThemeMode>('light')

  // 2. Toast Position State
  const [toastPosition, setToastPosition] = useState<ToastPosition>('top-right')

  // 3. Password Form State
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [savingPassword, setSavingPassword] = useState(false)

  // 4. Clear Data State
  const [clearTarget, setClearTarget] = useState<ClearTarget>(null)
  const [confirmInput, setConfirmInput] = useState('')
  const [clearing, setClearing] = useState(false)

  // Load saved preferences
  useEffect(() => {
    const savedTheme = (localStorage.getItem('tryout_theme') as ThemeMode) || 'light'
    setTheme(savedTheme)

    const savedPos = (localStorage.getItem('tryout_toast_position') as ToastPosition) || 'top-right'
    setToastPosition(savedPos)
  }, [])

  // Apply Theme Function
  function applyTheme(newTheme: ThemeMode) {
    setTheme(newTheme)
    localStorage.setItem('tryout_theme', newTheme)

    const isDark =
      newTheme === 'dark' ||
      (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    toast.success(`Tema diubah ke mode ${newTheme === 'dark' ? 'Gelap (Dark)' : newTheme === 'light' ? 'Terang (Light)' : 'Sistem'}`)
  }

  // Apply Toast Position Function
  function applyToastPosition(newPos: ToastPosition) {
    setToastPosition(newPos)
    localStorage.setItem('tryout_toast_position', newPos)
    window.dispatchEvent(new CustomEvent('toast-position-changed', { detail: newPos }))
    toast.success(`Posisi notifikasi diubah ke: ${newPos}`)
  }

  // Handle Change Password
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}

    if (!passwordForm.newPassword) {
      errors.newPassword = 'Password baru wajib diisi'
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'Password minimal 6 karakter'
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Konfirmasi password tidak cocok'
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      return
    }

    setPasswordErrors({})
    setSavingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    })

    if (error) {
      toast.error(`Gagal mengganti password: ${error.message}`)
    } else {
      toast.success('Password admin berhasil diperbarui!')
      setPasswordForm({ newPassword: '', confirmPassword: '' })
    }
    setSavingPassword(false)
  }

  // Handle Clear Data
  async function handleExecuteClear() {
    if (!clearTarget) return

    if (confirmInput.trim().toUpperCase() !== 'HAPUS') {
      toast.error('Ketik kata "HAPUS" untuk konfirmasi penghapusan')
      return
    }

    setClearing(true)
    let err = null

    if (clearTarget === 'attempts') {
      const { error } = await supabase.from('attempts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      err = error
    } else if (clearTarget === 'students') {
      const { error } = await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      err = error
    } else if (clearTarget === 'access_codes') {
      const { error } = await supabase.from('access_codes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      err = error
    } else if (clearTarget === 'questions') {
      const { error } = await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      err = error
    }

    if (err) {
      toast.error(`Gagal membersihkan data: ${err.message}`)
    } else {
      toast.success('Data berhasil dibersihkan!')
      setClearTarget(null)
      setConfirmInput('')
    }
    setClearing(false)
  }

  const clearLabels: Record<NonNullable<ClearTarget>, { title: string; desc: string; danger: string }> = {
    attempts: {
      title: 'Hapus Semua Riwayat Ujian (Attempts)',
      desc: 'Menghapus semua data pengerjaan, nilai, dan jawaban ujian siswa tanpa menghapus data siswa atau bank soal.',
      danger: 'Semua nilai & riwayat tryout siswa akan dihapus permanen.',
    },
    students: {
      title: 'Hapus Semua Data Siswa',
      desc: 'Menghapus seluruh akun dan data profil siswa beserta seluruh riwayat ujian yang pernah dikerjakan.',
      danger: 'Semua data siswa terdaftar dan hasil ujiannya akan hilang permanen.',
    },
    access_codes: {
      title: 'Hapus Semua Kode Akses',
      desc: 'Menghapus semua kode akses tryout dari sistem.',
      danger: 'Siswa tidak akan bisa menggunakan kode akses lama lagi.',
    },
    questions: {
      title: 'Hapus Semua Bank Soal',
      desc: 'Menghapus seluruh daftar soal dari semua kategori mata pelajaran.',
      danger: 'Seluruh soal yang sudah diimpor/dibuat akan terhapus permanen.',
    },
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Pengaturan"
        description="Kelola tampilan, notifikasi, keamanan akun, dan manajemen data sistem"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. TAMPILAN / DARK & LIGHT MODE */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader
            title="Tampilan & Tema"
            description="Pilih mode tampilan tema admin panel"
          />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {/* Light Option */}
              <button
                type="button"
                onClick={() => applyTheme('light')}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-center ${
                  theme === 'light'
                    ? 'border-primary-600 bg-primary-50/50 text-primary-900 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">Mode Terang</p>
                  <p className="text-xs text-gray-500">Light theme</p>
                </div>
              </button>

              {/* Dark Option */}
              <button
                type="button"
                onClick={() => applyTheme('dark')}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-center ${
                  theme === 'dark'
                    ? 'border-primary-600 bg-primary-50/20 text-primary-600 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">Mode Gelap</p>
                  <p className="text-xs text-gray-500">Dark theme</p>
                </div>
              </button>

              {/* System Option */}
              <button
                type="button"
                onClick={() => applyTheme('system')}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-center ${
                  theme === 'system'
                    ? 'border-primary-600 bg-primary-50/50 text-primary-900 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">Sistem</p>
                  <p className="text-xs text-gray-500">Auto switch</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* 2. NOTIFIKASI TOAST SETTINGS */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader
            title="Posisi & Efek Notifikasi"
            description="Atur letak kemunculan popup notifikasi dan efek interaksi"
          />
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Pilih Posisi Notifikasi
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { pos: 'top-right', label: '↗ Kanan Atas' },
                  { pos: 'top-left', label: '↖ Kiri Atas' },
                  { pos: 'top-center', label: '↑ Tengah Atas' },
                  { pos: 'bottom-right', label: '↘ Kanan Bawah' },
                  { pos: 'bottom-left', label: '↙ Kiri Bawah' },
                  { pos: 'bottom-center', label: '↓ Tengah Bawah' },
                ].map((item) => (
                  <button
                    key={item.pos}
                    type="button"
                    onClick={() => applyToastPosition(item.pos as ToastPosition)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      toastPosition === item.pos
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 rounded-xl">
              <div className="flex items-start gap-2.5">
                <span className="text-blue-600 text-lg">💡</span>
                <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                  <p className="font-semibold mb-0.5">Fitur Notifikasi Cerdas:</p>
                  <p>• <strong>Efek Hover:</strong> Notifikasi membesar sedikit saat kursor berada di atasnya.</p>
                  <p>• <strong>Klik untuk Menutup:</strong> Klik langsung pada notifikasi untuk langsung menghilangkannya (mirip Android).</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.success('Ini contoh notifikasi sukses!')}
              >
                Tes Notifikasi Sukses
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.error('Ini contoh notifikasi error!')}
              >
                Tes Notifikasi Error
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 3. GANTI PASSWORD ADMIN */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader
            title="Keamanan & Ganti Password"
            description="Perbarui kata sandi akun admin saat ini"
          />
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input
                label="Password Baru"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Minimal 6 karakter"
                error={passwordErrors.newPassword}
                required
              />

              <Input
                label="Konfirmasi Password Baru"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Ketik ulang password baru"
                error={passwordErrors.confirmPassword}
                required
              />

              <Button
                type="submit"
                loading={savingPassword}
                className="w-full sm:w-auto"
              >
                Perbarui Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 4. CLEAR DATA / DANGER ZONE */}
        <Card className="border-red-200 dark:border-red-900/60 dark:bg-gray-800">
          <CardHeader
            title="Pembersihan Data (Clear Data)"
            description="Hapus data massal atau reset data tryout sistem"
          />
          <CardContent className="space-y-3">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl mb-4">
              <p className="text-xs font-semibold text-red-800 dark:text-red-300">
                ⚠️ Tindakan pembersihan data tidak dapat dibatalkan. Pastikan Anda telah mengekspor data yang diperlukan.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bersihkan Riwayat Ujian</p>
                <p className="text-xs text-gray-500">Hapus semua hasil attempt dan jawaban tryout</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                onClick={() => { setClearTarget('attempts'); setConfirmInput('') }}
              >
                Reset Riwayat
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Hapus Semua Siswa</p>
                <p className="text-xs text-gray-500">Hapus data seluruh siswa dan riwayat ujiannya</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                onClick={() => { setClearTarget('students'); setConfirmInput('') }}
              >
                Hapus Siswa
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Hapus Semua Kode Akses</p>
                <p className="text-xs text-gray-500">Bersihkan semua kode tryout yang telah dibuat</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                onClick={() => { setClearTarget('access_codes'); setConfirmInput('') }}
              >
                Hapus Kode
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Hapus Semua Bank Soal</p>
                <p className="text-xs text-gray-500">Kosongkan seluruh soal dari semua kategori</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                onClick={() => { setClearTarget('questions'); setConfirmInput('') }}
              >
                Hapus Soal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODAL KONFIRMASI CLEAR DATA GANDA */}
      <Dialog
        open={!!clearTarget}
        onClose={() => setClearTarget(null)}
        title={clearTarget ? clearLabels[clearTarget].title : ''}
        size="md"
      >
        {clearTarget && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-800 dark:text-red-200 text-sm">
              <p className="font-bold mb-1">Peringatan Keamanan!</p>
              <p>{clearLabels[clearTarget].desc}</p>
              <p className="mt-2 font-semibold text-xs text-red-900 dark:text-red-100 bg-red-100 dark:bg-red-900/50 px-2.5 py-1.5 rounded-lg">
                ⚠️ {clearLabels[clearTarget].danger}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Ketik kata <span className="font-mono text-red-600 font-bold">HAPUS</span> untuk melanjutkan:
              </label>
              <Input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Ketik HAPUS"
                autoFocus
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => setClearTarget(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white border-transparent"
                disabled={confirmInput.trim().toUpperCase() !== 'HAPUS'}
                loading={clearing}
                onClick={handleExecuteClear}
              >
                Saya Yakin, Hapus Permanen
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
