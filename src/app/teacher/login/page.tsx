'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import styles from './teacher-login.module.css';

export default function TeacherLogin() {
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
        alert("Login Error: " + error.message);
      } else {
        console.log("Login successful, redirecting...");
        router.push('/teacher');
      }
    } catch (err: any) {
      alert('Unexpected Error: ' + (err.message || 'Check your internet connection'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <div className={styles.header}>
          <h2>GMMC Teacher Portal</h2>
          <p>Sign in with your email to view your assignments and enter marks.</p>
        </div>
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ram@gmmc.edu.np"
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
        <Link href="/" className={styles.backLink}>
          &larr; Back to Main Site
        </Link>
      </div>
    </div>
  );
}
