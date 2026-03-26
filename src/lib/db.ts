import Dexie, { Table } from 'dexie';
import { Trip } from '../types';

export interface AppSettings {
  id: string;
  currentTripId: string;
  unsyncedTripIds: string[];
  githubToken: string;
}

export class AppDatabase extends Dexie {
  trips!: Table<Trip, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('SplitWalletDB');
    this.version(1).stores({
      trips: 'id, lastUpdated',
      settings: 'id'
    });
  }
}

export const db = new AppDatabase();
