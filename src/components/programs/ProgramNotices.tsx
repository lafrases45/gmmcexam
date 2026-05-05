import React from 'react';
import { Notice } from '@/models/Notice';
import dbConnect from '@/lib/db';
import styles from '../../app/programs/[slug]/program.module.css';

interface ProgramNoticesProps {
  category: string;
}

const ProgramNotices = async ({ category }: ProgramNoticesProps) => {
  let notices = [];
  
  try {
    await dbConnect();
    notices = await Notice.find({ 
      $or: [
        { category: category },
        { category: 'General' }
      ]
    })
    .sort({ date: -1 })
    .limit(5);
  } catch (error) {
    console.error("Database connection failed in ProgramNotices:", error);
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
        <div key={index} className={styles.noticeItem}>
          <div className={styles.noticeDate}>
            <span>{new Date(notice.date).getDate()}</span>
            <span>{new Date(notice.date).toLocaleString('default', { month: 'short' })}</span>
          </div>
          <div className={styles.noticeDetails}>
            <h4>{notice.title}</h4>
            <p>{notice.description.substring(0, 100)}...</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProgramNotices;
