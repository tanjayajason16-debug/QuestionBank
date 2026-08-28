'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog'
import {
  Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
} from '@/components/ui/Table'
import { toast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import type { Category } from '@/types/database'

const EDUCATION_LEVELS = ['SD', 'SMP', 'SMA', 'SMK', 'Perguruan Tinggi']

interface FormState {
  name: string
  education_level: string
  subject: string
  grade: string
}

const empty: FormState = { name: '', education_level: '', subject: '', grade: '' }

export default function CategoriesPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<FormState>(empty)
  const [errors, setErrors] = useState<Partial<FormState>>({})

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    setCategories(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(empty)
    setErrors({})
    setShowForm(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({
      name: cat.name,
      education_level: cat.education_level ?? '',
      subject: cat.subject ?? '',
      grade: cat.grade?.toString() ?? '',
    })
    setErrors({})
    setShowForm(true)
  }

  function validate(): boolean {
    const e: Partial<FormState> = {}
    if (!form.name.trim()) e.name = 'Nama kategori wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      education_level: form.education_level || null,
      subject: form.subject.trim() || null,
      grade: form.grade ? parseInt(form.grade) : null,
    }

    if (editing) {
      const { error } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', editing.id)
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Kategori berhasil diperbarui')
        setShowForm(false)
        load()
      }
    } else {
      const { error } = await supabase
        .from('categories')
        .insert(payload)
      if (error) {
        toast.error(error.code === '23505' ? 'Nama kategori sudah ada' : error.message)
      } else {
        toast.success('Kategori berhasil ditambahkan')
        setShowForm(false)
        load()
      }
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', deleteTarget.id)
    if (error) {
      toast.error('Gagal menghapus. Kategori mungkin sedang digunakan.')
    } else {
      toast.success('Kategori berhasil dihapus')
      setDeleteTarget(null)
      load()
    }
    setDeleting(false)
  }

  return (
    <div>
      <PageHeader
        title="Kategori"
        description="Kelola kategori soal"
        actions={
          <Button onClick={openCreate} icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }>
            Tambah Kategori
          </Button>
        }
      />

      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Nama</TableHeader>
            <TableHeader>Jenjang</TableHeader>
            <TableHeader>Mata Pelajaran</TableHeader>
            <TableHeader>Kelas</TableHeader>
            <TableHeader>Dibuat</TableHeader>
            <TableHeader className="w-24">Aksi</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6}>
                <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Memuat...</div>
              </TableCell>
            </TableRow>
          ) : categories.length === 0 ? (
            <TableEmpty colSpan={6} message="Belum ada kategori" />
          ) : (
            categories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{cat.name}</span>
                </TableCell>
                <TableCell className="text-gray-600 dark:text-gray-400">{cat.education_level ?? '-'}</TableCell>
                <TableCell className="text-gray-600 dark:text-gray-400">{cat.subject ?? '-'}</TableCell>
                <TableCell className="text-gray-600 dark:text-gray-400">{cat.grade ? `Kelas ${cat.grade}` : '-'}</TableCell>
                <TableCell className="text-xs text-gray-400 dark:text-gray-500">{formatDate(cat.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(cat)}
                      className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors"
                      aria-label="Edit kategori"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(cat)}
                      className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      aria-label="Hapus kategori"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Form Dialog */}
      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Kategori' : 'Tambah Kategori'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nama Kategori"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="contoh: Matematika SMP"
            error={errors.name}
            required
            autoFocus
          />
          <Select
            label="Jenjang Pendidikan"
            value={form.education_level}
            onChange={(e) => setForm({ ...form, education_level: e.target.value })}
            options={EDUCATION_LEVELS.map((l) => ({ value: l, label: l }))}
            placeholder="Pilih jenjang (opsional)"
          />
          <Input
            label="Mata Pelajaran"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="contoh: Matematika"
          />
          <Input
            label="Kelas"
            type="number"
            min={1}
            max={13}
            value={form.grade}
            onChange={(e) => setForm({ ...form, grade: e.target.value })}
            placeholder="contoh: 8"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button variant="outline" onClick={() => setShowForm(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {editing ? 'Simpan Perubahan' : 'Tambah Kategori'}
          </Button>
        </div>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Kategori"
        message={`Hapus kategori "${deleteTarget?.name}"? Soal dalam kategori ini mungkin akan terpengaruh.`}
        confirmLabel="Hapus"
        loading={deleting}
      />
    </div>
  )
}
