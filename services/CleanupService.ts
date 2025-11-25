import { collection, query, where, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CleanupSettings {
  autoDeleteCompletedTasks: boolean;
  taskRetentionHours: number; // Default: 24 hours
  autoDeleteOldExpenses: boolean;
  expenseRetentionDays: number; // Default: 30 days
  lastCleanupDate?: string;
}

export const DEFAULT_CLEANUP_SETTINGS: CleanupSettings = {
  autoDeleteCompletedTasks: true,
  taskRetentionHours: 24,
  autoDeleteOldExpenses: false, // Off by default for expenses
  expenseRetentionDays: 30,
};

export class CleanupService {
  // Get cleanup settings from AsyncStorage
  static async getCleanupSettings(): Promise<CleanupSettings> {
    try {
      const settings = await AsyncStorage.getItem('cleanupSettings');
      if (settings) {
        return JSON.parse(settings);
      }
      return DEFAULT_CLEANUP_SETTINGS;
    } catch (error) {
      console.error('Error getting cleanup settings:', error);
      return DEFAULT_CLEANUP_SETTINGS;
    }
  }

  // Save cleanup settings to AsyncStorage
  static async saveCleanupSettings(settings: CleanupSettings): Promise<void> {
    try {
      await AsyncStorage.setItem('cleanupSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving cleanup settings:', error);
    }
  }

  // Delete completed tasks older than the retention period
  static async cleanupCompletedTasks(userId: string, retentionHours: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - retentionHours);

      const q = query(
        collection(db, 'todos'),
        where('userId', '==', userId),
        where('completed', '==', true)
      );

      const snapshot = await getDocs(q);
      let deletedCount = 0;

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        // Check if completedAt exists and is older than retention period
        if (data.completedAt) {
          const completedAt = data.completedAt.toDate();
          
          if (completedAt <= cutoffTime) {
            await deleteDoc(doc(db, 'todos', docSnapshot.id));
            deletedCount++;
          }
        }
      }

      console.log(`Cleaned up ${deletedCount} completed tasks`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up completed tasks:', error);
      return 0;
    }
  }

  // Delete old expenses older than the retention period
  static async cleanupOldExpenses(userId: string, retentionDays: number = 30): Promise<number> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setDate(cutoffTime.getDate() - retentionDays);

      const q = query(
        collection(db, 'expenses'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      let deletedCount = 0;

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        // Check if createdAt exists and is older than retention period
        if (data.createdAt) {
          const createdAt = data.createdAt.toDate();
          
          if (createdAt <= cutoffTime) {
            await deleteDoc(doc(db, 'expenses', docSnapshot.id));
            deletedCount++;
          }
        }
      }

      console.log(`Cleaned up ${deletedCount} old expenses`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old expenses:', error);
      return 0;
    }
  }

  // Run automatic cleanup based on settings
  static async runAutoCleanup(userId: string): Promise<{ tasks: number; expenses: number }> {
    const settings = await this.getCleanupSettings();
    const results = { tasks: 0, expenses: 0 };

    // Check if we should run cleanup (once per day)
    const lastCleanup = settings.lastCleanupDate ? new Date(settings.lastCleanupDate) : null;
    const now = new Date();
    
    if (lastCleanup) {
      const hoursSinceLastCleanup = (now.getTime() - lastCleanup.getTime()) / (1000 * 60 * 60);
      // Run cleanup only if it's been more than 6 hours since last cleanup
      if (hoursSinceLastCleanup < 6) {
        console.log('Cleanup already ran recently, skipping...');
        return results;
      }
    }

    // Cleanup completed tasks if enabled
    if (settings.autoDeleteCompletedTasks) {
      results.tasks = await this.cleanupCompletedTasks(userId, settings.taskRetentionHours);
    }

    // Cleanup old expenses if enabled
    if (settings.autoDeleteOldExpenses) {
      results.expenses = await this.cleanupOldExpenses(userId, settings.expenseRetentionDays);
    }

    // Update last cleanup date
    settings.lastCleanupDate = now.toISOString();
    await this.saveCleanupSettings(settings);

    return results;
  }

  // Bulk delete all completed tasks (regardless of age)
  static async bulkDeleteAllCompletedTasks(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'todos'),
        where('userId', '==', userId),
        where('completed', '==', true)
      );

      const snapshot = await getDocs(q);
      let deletedCount = 0;

      for (const docSnapshot of snapshot.docs) {
        await deleteDoc(doc(db, 'todos', docSnapshot.id));
        deletedCount++;
      }

      console.log(`Bulk deleted ${deletedCount} completed tasks`);
      return deletedCount;
    } catch (error) {
      console.error('Error bulk deleting completed tasks:', error);
      return 0;
    }
  }

  // Bulk delete all expenses older than specified days
  static async bulkDeleteOldExpenses(userId: string, olderThanDays: number): Promise<number> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setDate(cutoffTime.getDate() - olderThanDays);

      const q = query(
        collection(db, 'expenses'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      let deletedCount = 0;

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        if (data.createdAt) {
          const createdAt = data.createdAt.toDate();
          
          if (createdAt <= cutoffTime) {
            await deleteDoc(doc(db, 'expenses', docSnapshot.id));
            deletedCount++;
          }
        }
      }

      console.log(`Bulk deleted ${deletedCount} old expenses`);
      return deletedCount;
    } catch (error) {
      console.error('Error bulk deleting old expenses:', error);
      return 0;
    }
  }

  // Get statistics about cleanable items
  static async getCleanupStats(userId: string): Promise<{
    completedTasks: number;
    oldExpenses: number;
    oldestCompletedTask?: Date;
    oldestExpense?: Date;
  }> {
    try {
      const stats = {
        completedTasks: 0,
        oldExpenses: 0,
        oldestCompletedTask: undefined as Date | undefined,
        oldestExpense: undefined as Date | undefined,
      };

      // Get completed tasks
      const tasksQuery = query(
        collection(db, 'todos'),
        where('userId', '==', userId),
        where('completed', '==', true)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      stats.completedTasks = tasksSnapshot.size;

      // Find oldest completed task
      tasksSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.completedAt) {
          const completedAt = data.completedAt.toDate();
          if (!stats.oldestCompletedTask || completedAt < stats.oldestCompletedTask) {
            stats.oldestCompletedTask = completedAt;
          }
        }
      });

      // Get old expenses (older than 30 days)
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', userId)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      expensesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.createdAt) {
          const createdAt = data.createdAt.toDate();
          if (createdAt <= thirtyDaysAgo) {
            stats.oldExpenses++;
          }
          if (!stats.oldestExpense || createdAt < stats.oldestExpense) {
            stats.oldestExpense = createdAt;
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      return {
        completedTasks: 0,
        oldExpenses: 0,
      };
    }
  }
}
