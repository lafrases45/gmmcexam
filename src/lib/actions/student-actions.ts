'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getBatches() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('admission_batches')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching batches:", error)
    return []
  }
  return data || []
}

export async function createBatch(name: string, students: any[], appendMode = false) {
  const supabase = await createClient()

  let batchId: string

  // 1. Get or Create Batch
  const { data: existing } = await supabase
    .from('admission_batches')
    .select('id')
    .eq('name', name)
    .maybeSingle()

  if (existing) {
    batchId = existing.id
  } else {
    // Create a new batch if it doesn't exist
    const { data: newBatch, error: batchError } = await supabase
      .from('admission_batches')
      .insert([{ name, total_students: students.length }])
      .select()
      .single()
    
    if (batchError || !newBatch) throw new Error(batchError?.message || 'Failed to create batch')
    batchId = newBatch.id
  }

  // 2. Prepare student records
  const studentRecords = students.map(s => ({
    batch_id: batchId,
    name: s.name,
    gender: s.gender || 'Unknown',
    ethnic_group: s.ethnic_group || 'Unknown',
    tu_regd_no: s.tu_regd_no || '',
    roll_no: s.roll_no || '',
    section: s.section || '',
    batch_year: s.batch_year || null,
    major: s.major || ''
  }))

  // 3. Upsert students (replaces old data with new ones if roll_no matches)
  const { error: studentError } = await supabase
    .from('admission_students')
    .upsert(studentRecords, { onConflict: 'roll_no' })

  if (studentError) {
    throw new Error(studentError.message)
  }

  // 4. Recalculate total students for the batch to ensure accuracy
  const { count, error: countError } = await supabase
    .from('admission_students')
    .select('*', { count: 'exact', head: true })
    .eq('batch_id', batchId)

  if (!countError) {
    await supabase
      .from('admission_batches')
      .update({ total_students: count || 0 })
      .eq('id', batchId)
  }

  revalidatePath('/admin/students')
  revalidatePath('/admin/admission-analysis')
  return { id: batchId }
}


export async function deleteBatch(id: string) {
  const supabase = await createClient()
  
  // admission_students should cascade delete, but we explicitly delete to be safe
  await supabase.from('admission_students').delete().eq('batch_id', id)
  
  const { error } = await supabase
    .from('admission_batches')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  
  revalidatePath('/admin/students')
  revalidatePath('/admin/admission-analysis')
}

export async function getStudentsByBatch(batchId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('admission_students')
    .select('*')
    .eq('batch_id', batchId)
    .order('name', { ascending: true })

  if (error) {
    console.error("Error fetching students by batch:", error)
    return []
  }
  return data || []
}

export async function deleteStudent(studentId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('admission_students')
    .delete()
    .eq('id', studentId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/students')
}

export async function promoteStudents(sourceBatchId: string, newBatchName: string, studentIds: string[]) {
  const supabase = await createClient()

  // 1. Fetch students to promote
  const { data: sourceStudents, error: fetchError } = await supabase
    .from('admission_students')
    .select('*')
    .in('id', studentIds)

  if (fetchError) throw new Error(fetchError.message)
  if (!sourceStudents || sourceStudents.length === 0) throw new Error("No students found to promote")

  // 2. Create new batch
  const { data: newBatch, error: batchError } = await supabase
    .from('admission_batches')
    .insert([{ name: newBatchName, total_students: sourceStudents.length }])
    .select()
    .single()

  if (batchError || !newBatch) throw new Error(batchError?.message || "Failed to create new batch")

  // 3. Insert students into new batch
  const studentRecords = sourceStudents.map(s => ({
    batch_id: newBatch.id,
    name: s.name,
    gender: s.gender,
    ethnic_group: s.ethnic_group,
    tu_regd_no: s.tu_regd_no,
    roll_no: s.roll_no,
    section: s.section,
    batch_year: s.batch_year,
    major: s.major || ''
  }))

  const { error: insertError } = await supabase
    .from('admission_students')
    .insert(studentRecords)

  if (insertError) {
    await supabase.from('admission_batches').delete().eq('id', newBatch.id)
    throw new Error(insertError.message)
  }

  revalidatePath('/admin/students')
  revalidatePath('/admin/admission-analysis')
  return newBatch
}

export async function saveNameKnowledge(data: { name_key: string, gender: string, ethnic_group: string }[]) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('name_knowledge_base')
    .upsert(data, { onConflict: 'name_key' })
  
  if (error) {
    console.error("Save Knowledge Error:", error)
    throw error
  }
}

export async function getNameKnowledge() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('name_knowledge_base')
    .select('*')
  
  if (error) {
    console.error("Get Knowledge Error:", error)
    throw error
  }
  return data || []
}
