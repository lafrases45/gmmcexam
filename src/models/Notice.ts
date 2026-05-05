import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotice extends Document {
  title: string;
  description: string;
  date: Date;
  fileUrl?: string; // Cloudflare R2 link
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoticeSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
  fileUrl: { type: String },
  category: { type: String, default: 'General' },
}, {
  timestamps: true,
});

export const Notice: Model<INotice> = mongoose.models.Notice || mongoose.model<INotice>('Notice', NoticeSchema);
