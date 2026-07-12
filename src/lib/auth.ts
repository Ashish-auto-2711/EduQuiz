import { getServerSession as nextGetServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export function getServerSession() {
  return nextGetServerSession(authOptions);
}
