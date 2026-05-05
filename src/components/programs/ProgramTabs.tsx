'use client';

import React, { useState, useEffect } from 'react';
import styles from '../../app/programs/[slug]/program.module.css';

interface TabItem {
  id: string;
  label: string;
  icon: string;
}

interface ProgramTabsProps {
  items: TabItem[];
}

const ProgramTabs = ({ items }: ProgramTabsProps) => {
  const [activeTab, setActiveTab] = useState(items[0].id);

  // Sync active tab with scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      
      for (const item of items) {
        const element = document.getElementById(item.id);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveTab(item.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [items]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 120,
        behavior: 'smooth'
      });
      setActiveTab(id);
    }
  };

  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabsWrapper}>
        {items.map((item) => (
          <button
            key={item.id}
            className={`${styles.tabButton} ${activeTab === item.id ? styles.activeTab : ''}`}
            onClick={() => scrollToSection(item.id)}
          >
            <span className={styles.tabIcon}>{item.icon}</span>
            <span className={styles.tabLabel}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProgramTabs;
