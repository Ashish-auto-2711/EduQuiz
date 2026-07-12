import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_MEDIA_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_MEDIA_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'image/jpeg', 'image/png', 'image/webp'];

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const uploadType = formData.get('type') as string | null; // 'profile-image', 'quiz-image', 'question-media', 'ad-banner'
    const targetId = formData.get('id') as string | null; // userId, quizId, questionId, etc.

    if (!file || !uploadType) {
      return NextResponse.json(
        { error: 'File and upload type are required' },
        { status: 400 }
      );
    }

    // 1. Determine file size and type validations
    const fileType = file.type;
    const fileSize = file.size;

    if (uploadType === 'profile-image' || uploadType === 'quiz-image' || uploadType === 'ad-banner') {
      if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
        return NextResponse.json(
          { error: 'Only JPG, PNG, and WEBP formats are supported' },
          { status: 400 }
        );
      }
      if (fileSize > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: 'Images must be smaller than 5MB' },
          { status: 400 }
        );
      }
    } else if (uploadType === 'question-media') {
      if (!ALLOWED_MEDIA_TYPES.includes(fileType)) {
        return NextResponse.json(
          { error: 'Unsupported format. Supported: JPG, PNG, WEBP, MP3, WAV' },
          { status: 400 }
        );
      }
      if (fileSize > MAX_MEDIA_SIZE) {
        return NextResponse.json(
          { error: 'Question media must be smaller than 10MB' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }

    // 2. Define the subfolder path structure strictly per PRD rules
    let relativePath = '';
    const baseUploadsDir = path.join(process.cwd(), 'public', 'uploads');

    if (uploadType === 'profile-image') {
      const userId = targetId || (session.user as any).id;
      relativePath = `profile-images/${userId}`;
    } else if (uploadType === 'quiz-image') {
      if (!targetId) return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
      relativePath = `quiz-images/${targetId}`;
    } else if (uploadType === 'question-media') {
      if (!targetId) return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
      relativePath = `question-media/${targetId}`;
    } else if (uploadType === 'ad-banner') {
      relativePath = 'admin-uploads/ads';
    }

    const absoluteTargetDir = path.join(baseUploadsDir, relativePath);

    // Create folder structure if it doesn't exist
    if (!fs.existsSync(absoluteTargetDir)) {
      fs.mkdirSync(absoluteTargetDir, { recursive: true });
    }

    // 3. Generate unique filenames (UUID + original extension)
    const ext = path.extname(file.name) || '.png';
    const uuid = crypto.randomUUID();
    const finalFilename = `${uuid}${ext}`;
    const absoluteFilePath = path.join(absoluteTargetDir, finalFilename);

    // Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(absoluteFilePath, buffer);

    // Public URL to store in the DB
    const fileUrl = `/uploads/${relativePath}/${finalFilename}`;

    return NextResponse.json({
      message: 'File uploaded successfully',
      url: fileUrl,
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
