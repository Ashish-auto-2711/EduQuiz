import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Return 200 for security reasons, so attackers don't know who has an account
      return NextResponse.json({
        message: 'If the email exists, a reset link will be sent shortly',
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: tokenExpiry,
      },
    });

    // Output reset link to console for developer testing/verification
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
    console.log(`\n==================================================`);
    console.log(`PASSWORD RESET REQUEST FOR: ${user.email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`==================================================\n`);

    return NextResponse.json({
      message: 'If the email exists, a reset link will be sent shortly',
      // Return token in non-production environments to allow testing easily
      token: process.env.NODE_ENV !== 'production' ? token : undefined,
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
