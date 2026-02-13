import { LoginForm } from '@/components/login-form';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function LoginPage() {
  if (cookies().get('is_admin')?.value === 'true') {
    redirect('/');
  }
  return (
    <main className="flex h-full w-full items-center justify-center bg-background p-4">
      <LoginForm />
    </main>
  );
}
