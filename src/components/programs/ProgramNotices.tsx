import React from 'react';
import { createClient } from '@/lib/supabase/server';
import styles from '../../app/programs/[slug]/program.module.css';

interface ProgramNoticesProps {
  category: string;
}

const ProgramNotices = async ({ category }: ProgramNoticesProps) => {
  let notices = [];
  
  try {
    const supabase = await createClient();
    
    // Fetch notices for the specific program category OR general notices
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .or(`category.eq.${category},category.eq.General`)
      .order('date', { ascending: false })
      .limit(5);

    if (error) throw error;
    notices = data || [];

  } catch (error) {
    console.error("Supabase fetch failed in ProgramNotices:", error);
    return (
      <div className={styles.textBlock}>
        <p>Program notices are currently unavailable. Please check the main notices page.</p>
      </div>
    );
  }

  if (notices.length === 0) {
    return (
      <div className={styles.textBlock}>
        <p>No recent notices for this program. Please check back later.</p>
      </div>
    );
  }

  return (
    <div className={styles.noticeList}>
      {notices.map((notice, index) => (
        <div key={notice.id} className={styles.noticeItem}>
          <div className={styles.noticeDate}>
            <span>{new Date(notice.date).getDate()}</span>
            <span>{new Date(notice.date).toLocaleString('default', { month: 'short' })}</span>
          </div>
          <div className={styles.noticeDetails}>
            <h4>{notice.title}</h4>
            <p>{notice.description.substring(0, 100)}...</p>
            {notice.file_url && (
              <a href={notice.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                View Attachment
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProgramNotices;
