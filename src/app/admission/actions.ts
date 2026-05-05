'use server';

import connectToDatabase from '@/lib/db';
import { Admission } from '@/models/Admission';

export async function submitAdmissionForm(formData: FormData) {
  try {
    await connectToDatabase();
    
    const data = {
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      dob: formData.get('dob'),
      program: formData.get('program'),
      previousEducation: formData.get('previousEducation'),
    };
    
    const newAdmission = new Admission(data);
    await newAdmission.save();
    
    return { success: true, message: 'Your application has been received successfully!' };
  } catch (error: any) {
    if (error.message && error.message.includes('MONGODB_URI')) {
      return { success: false, message: 'Database string not configured yet. Set MONGODB_URI in your environment.' };
    }
    return { success: false, message: 'Failed to submit application. Please verify your details.' };
  }
}
