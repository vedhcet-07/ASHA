import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { Button, Input, FormControl, FormLabel } from '@/components/ui';
import { Mail, Lock, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('leader@demo.asha');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const reduce = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast({ title: 'Logged in successfully', status: 'success' });
      navigate('/dashboard');
    } catch {
      toast({ title: 'Login failed', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FormControl isRequired>
        <FormLabel isRequired>Email</FormLabel>
        <div className="relative">
          <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
            placeholder="you@asha.org"
          />
        </div>
      </FormControl>
      <FormControl isRequired>
        <FormLabel isRequired>Password</FormLabel>
        <div className="relative">
          <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9"
            placeholder="••••••••"
          />
        </div>
      </FormControl>

      <Button
        type="submit"
        fullWidth
        size="lg"
        isLoading={isLoading}
        rightIcon={!isLoading ? <ArrowRight size={18} /> : undefined}
      >
        Sign In
      </Button>

      <p className="text-center text-xs text-muted">
        Demo roles: <span className="font-medium text-ink">leader@demo.asha</span>,{' '}
        <span className="font-medium text-ink">member@demo.asha</span>,{' '}
        <span className="font-medium text-ink">buyer@demo.asha</span>
      </p>

      <RouterLink
        to="/select-role"
        className={reduce ? 'text-center text-sm text-accent' : 'text-center text-sm text-accent transition-colors hover:text-accent/80'}
      >
        Explore demo personas →
      </RouterLink>
    </form>
  );
};
