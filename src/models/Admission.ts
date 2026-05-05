import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdmission extends Document {
  fullName: string;
  email: string;
  phone: string;
  dob: Date;
  program: string;
  previousEducation: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: Date;
  updatedAt: Date;
}

const AdmissionSchema: Schema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  dob: { type: Date, required: true },
  program: { type: String, required: true },
  previousEducation: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
}, {
  timestamps: true,
});

export const Admission: Model<IAdmission> = mongoose.models.Admission || mongoose.model<IAdmission>('Admission', AdmissionSchema);
