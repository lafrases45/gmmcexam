'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/store/useToastStore';
import styles from './login.module.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Login Error: " + error.message);
      } else {
        console.log("Login successful, redirecting...");
        toast.success("Welcome back!");
        router.push('/admin');
      }
    } catch (err: any) {
      toast.error('Unexpected Error: ' + (err.message || 'Check your internet connection'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <div className={styles.header}>
          <h2>GMMC Admin Portal</h2>
          <p>Sign in with your email to access the system</p>
        </div>
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. teacher@gmmc.edu.np"
              required 
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" disabled={loading} className={styles.btnPrimary}>
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
        <a href="/" className={styles.backLink}>
          &larr; Back to Main Site
        </a>
      </div>
    </div>
  );
}
