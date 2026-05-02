import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { email, firstName } = await req.json();

  try {
// En la línea 10 de tu archivo route.ts aproximadamente
const data = await resend.contacts.create({
  email: email,
  firstName: firstName,
  unsubscribed: false,
  audienceId: '4ea06198-d057-4102-a2a5-5470ad6ee187', // El que sacaste de "General"
});

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}