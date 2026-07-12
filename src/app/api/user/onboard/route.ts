import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SkillLevel } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { username, favoriteSubjects, skillLevel, bio, image } = await req.json();

    if (!username || !skillLevel) {
      return NextResponse.json(
        { error: 'Username and skill level are required' },
        { status: 400 }
      );
    }

    // Clean username (alphanumeric, lowercase, no spaces)
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 alphanumeric characters' },
        { status: 400 }
      );
    }

    // Verify username uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    // Validate skill level
    if (!Object.values(SkillLevel).includes(skillLevel as SkillLevel)) {
      return NextResponse.json(
        { error: 'Invalid skill level selected' },
        { status: 400 }
      );
    }

    // Update user record
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username: cleanUsername,
        favoriteSubjects: Array.isArray(favoriteSubjects) ? favoriteSubjects : [],
        skillLevel: skillLevel as SkillLevel,
        bio: bio || null,
        image: image || undefined,
      },
    });

    return NextResponse.json({
      message: 'Onboarding completed successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        favoriteSubjects: updatedUser.favoriteSubjects,
        skillLevel: updatedUser.skillLevel,
        role: updatedUser.role,
      },
    });
  } catch (err: any) {
    console.error('Onboarding API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
