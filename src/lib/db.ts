import Dexie, { Table } from 'dexie';
import { Ledger } from '../types';

export interface AppSettings {
  id: string;
  currentLedgerId: string;
  unsyncedLedgerIds: string[];
  githubToken: string;
}

export class AppDatabase extends Dexie {
  ledgers!: Table<Ledger, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('SplitWalletDB');
    this.version(1).stores({
      ledgers: 'id, lastUpdated',
      settings: 'id'
    });
  }
}

export const db = new AppDatabase();
