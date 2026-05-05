import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, email, phone, query, program } = data;

    // Log the enquiry (in production, use nodemailer to send email)
    console.log('--- New Program Inquiry ---');
    console.log(`Program: ${program}`);
    console.log(`From: ${name} (${email})`);
    console.log(`Phone: ${phone}`);
    console.log(`Message: ${query}`);
    console.log('---------------------------');

    // MOCK EMAIL SENDING LOGIC
    // await transporter.sendMail({ ... });

    return NextResponse.json({ success: true, message: 'Inquiry sent successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to send inquiry' }, { status: 500 });
  }
}
