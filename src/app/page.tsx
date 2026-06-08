"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';

export default function Home() {
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'Google' | 'Apple' | null>(null);

  const handleSocialButtonClick = (provider: 'Google' | 'Apple') => {
    setSelectedProvider(provider);
    setShowComingSoonModal(true);
  };

  return (
    <main className={styles.container}>
      <div className={styles.content}>

        {/* Top Section: Logo + Text */}
        <div className={styles.top}>
          <div className={styles.logo}>
            <Image src="/icon-only.svg" alt="Tiwani Logo" width={41} height={40} />
          </div>

          <div className={styles.textContent}>
            <h1 className={styles.title}>Let&apos;s get started</h1>
            <p className={styles.subtitle}>
              Welcome to Tiwani. Please sign in to continue.
            </p>
          </div>
        </div>

        {/* Details Section: Social + Divider + Action */}
        <div className={styles.details}>

          <div className={styles.socialAuth}>
            <button className={styles.socialButton} onClick={() => handleSocialButtonClick('Google')}>
              <Image src="/google.svg" alt="Google" width={20} height={20} />
              Continue with Google
            </button>
            <button className={`${styles.socialButton} ${styles.appleButton}`} onClick={() => handleSocialButtonClick('Apple')}>
              <Image src="/apple.svg" alt="Apple" width={20} height={20} />
              Continue with Apple
            </button>
          </div>

          <div className={styles.divider}>
            <div className={styles.line}></div>
            <div className={styles.orText}>OR</div>
            <div className={styles.line}></div>
          </div>

          <Link href="/login" style={{ width: '100%', textDecoration: 'none' }}>
            <button className={styles.actionButton}>
              Sign in
            </button>
          </Link>

        </div>

      </div>

      <footer className={styles.footer}>
        <span className={styles.copyright}>Copyright ©2025</span>
        <a href="#" className={styles.terms}>Term of service</a>
      </footer>

      <Modal 
        isOpen={showComingSoonModal} 
        onClose={() => setShowComingSoonModal(false)}
        title={selectedProvider ? `${selectedProvider} Sign-In Coming Soon` : 'Coming Soon'}
      >
        <div style={{ padding: '1rem 0', textAlign: 'center' }}>
          <p style={{ marginBottom: '1.5rem', fontSize: '1rem', color: '#666' }}>
            {selectedProvider} sign-in is currently in development. Please use the sign-in option below.
          </p>
          <Button onClick={() => setShowComingSoonModal(false)} fullWidth>
            Got it
          </Button>
        </div>
      </Modal>
    </main>
  );
}
