'use client';

import { useFormStatus } from 'react-dom';
import { useActionState, useEffect } from 'react';
import { login } from '@/app/actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Signing In...' : 'Sign In'}
      <LogIn className="ml-2 h-4 w-4" />
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(login, undefined);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (state?.success) {
      toast({
        title: 'Success!',
        description: state.message,
      });
      localStorage.setItem('is_admin', 'true');
      router.push('/');
    }
  }, [state, router, toast]);

  return (
    <Card className="w-full max-w-sm">
      <form action={formAction}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Static Gallery</CardTitle>
          <CardDescription>Enter your credentials to access the gallery.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="admin"
              required
              defaultValue="admin"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
            />
          </div>
          {state?.message && !state.success && (
             <Alert variant="destructive" className="mt-4">
               <AlertDescription>{state.message}</AlertDescription>
             </Alert>
           )}
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
