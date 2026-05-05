'use server';

import { createClient } from '@/lib/supabase/server';

export async function submitAdmissionForm(formData: FormData) {
  try {
    const supabase = await createClient();
    
    const data = {
      full_name: formData.get('fullName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      dob: formData.get('dob') as string,
      program: formData.get('program') as string,
      previous_education: formData.get('previousEducation') as string,
      status: 'Pending'
    };
    
    const { error } = await supabase
      .from('online_admissions')
      .insert([data]);

    if (error) throw error;
    
    return { success: true, message: 'Your application has been received successfully!' };
  } catch (error: any) {
    console.error('Admission Submission Error:', error);
    return { success: false, message: 'Failed to submit application. Please verify your details.' };
  }
}
