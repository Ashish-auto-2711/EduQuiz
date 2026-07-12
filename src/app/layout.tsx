import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/providers/SessionProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EduQuiz — Premium Learning & Quiz Platform',
  description: 'Practice high-quality quizzes, track your performance, climb the leaderboards, and excel in your exams!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased dark">
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-950 text-slate-100`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
