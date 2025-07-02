"use client";

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from '@/hooks/use-supabase';
import bcrypt from 'bcryptjs';
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SupabaseClient } from '@supabase/supabase-js';

export function LoginForm({
  className,
  onForceChangePassword,
  ...props
}: React.ComponentProps<"div"> & { onForceChangePassword?: () => void }) {
  const supabase = useSupabase() as SupabaseClient;
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (isRegister) {
      // Registration: hash password and insert user with name
      const hash = await bcrypt.hash(password, 10);
      const { error: insertError } = await supabase
        .from('users')
        .insert([{ email, password_hash: hash, name }]);
      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }
      setIsRegister(false);
      setName("");
      setEmail("");
      setPassword("");
      setLoading(false);
      alert('Registration successful! Please log in.');
    } else {
      // Login: fetch user and compare password
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      if (fetchError || !user) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }
      // Prevent admin or super-admin from logging in here
      if (user.role === 'admin' || user.role === 'super-admin') {
        setError('Admin accounts must use the admin login page.');
        setLoading(false);
        return;
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }
      // Store session (for demo: localStorage)
      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }));
      
      setLoading(false);
      if (user.must_change_password && onForceChangePassword) {
        onForceChangePassword();
      } else {
        router.push('/dashboard');
      }
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>{isRegister ? 'Register a new account' : 'Login to your account'}</CardTitle>
          <CardDescription>
            {isRegister ? 'Enter your details to register.' : 'Enter your email below to login to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              {isRegister && (
                <div className="grid gap-3">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              {error && <div className="text-destructive text-sm">{error}</div>}
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (isRegister ? 'Registering...' : 'Logging in...') : (isRegister ? 'Register' : 'Login')}
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              {isRegister ? (
                <>
                  Already have an account?{' '}
                  <a href="#" className="underline underline-offset-4" onClick={e => { e.preventDefault(); setIsRegister(false); }}>
                    Login
                  </a>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <a href="#" className="underline underline-offset-4" onClick={e => { e.preventDefault(); setIsRegister(true); }}>
                    Sign up
                  </a>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
