import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en';

interface Translations {
  [key: string]: string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Navigation
    nav_dashboard: "Dashboard",
    nav_expenses: "Entries",
    nav_balances: "Balances",
    nav_settings: "Settings",
    nav_planning: "Planning",
    plan_budgets: "Budgets",
    plan_goals: "Goals",
    plan_recurring: "Recurring",
    
    // Header
    header_select_trip: "Select Account",
    header_new_trip: "New Account",
    
    // Expense Form
    form_type_expense: "Entry",
    form_type_settlement: "Settlement",
    form_type_sponsorship: "Sponsorship",
    form_desc: "Description",
    form_desc_placeholder: "Dinner at Sushi Zanmai...",
    form_desc_settlement: "Settlement",
    form_date: "Date",
    form_category: "Category",
    form_amount: "Amount",
    form_paid_by: "Paid By",
    form_split_among: "Split Among",
    form_memo: "Memo / Notes (Optional)",
    form_memo_placeholder: "Add any extra details...",
    form_location: "Location (Optional)",
    form_location_placeholder: "Search location...",
    form_cancel: "Cancel",
    form_save: "Save Entry",
    form_add: "Add Entry",
    form_edit: "Edit Entry",
    form_split_equally: "Split Equally",
    form_split_unequally: "Split Unequally",
    form_sponsored_by: "Sponsored By",
    form_who_received: "Who received?",
    form_beneficiaries: "Beneficiaries",
    form_all: "All",
    form_none: "None",
    form_add_people_first: "Add people first",
    form_split_method: "Split Method",
    form_equally: "Equally",
    form_exact_amounts: "Exact Amounts",
    form_percentages: "Percentages",
    form_shares: "Shares",
    form_mark_sponsored: "Mark as Sponsored",
    form_settled_desc: "Settled entries are recorded but don't affect balances.",
    form_sponsored_desc: "Sponsored entries count towards the group total, but the sponsor takes on the full cost.",
    form_assign_shares: "Assign shares (Max: {maxShares}). Set to 0 to exclude.",
    form_remaining_shares: "Remaining: {remainingShares}",
    form_split_remaining: "Split Remaining",
    form_clear: "Clear",
    form_total: "Total:",
    form_reset: "Reset",
    form_update_entry: "Update Entry",
    form_save_entry: "Save Entry",
    form_select_person: "Select a person",
    form_coordinates: "Coordinates attached:",
    form_suggested_settlement: "Suggested full settlement:",
    form_pinned_location: "Pinned Location",
    form_pinned: "Pinned",
    form_pin: "Pin",
    form_use_current_location: "Use current location",
    form_search_location: "Search location",
    
    // Categories
    "cat_🍽️ Meals & Dining": "Meals & Dining",
    "cat_🏨 Accommodation": "Accommodation",
    "cat_🚕 Transport & Fuel": "Transport & Fuel",
    "cat_✈️ Flights": "Flights",
    "cat_🎢 Activities & Tours": "Activities & Tours",
    "cat_🛍️ Shopping": "Shopping",
    "cat_🍻 Drinks & Nightlife": "Drinks & Nightlife",
    "cat_📝 General / Other": "General / Other",
    
    // Dashboard
    dash_total: "Total Entries",
    dash_your_balance: "Your Balance",
    dash_recent: "Recent Entries",
    dash_view_all: "View All",
    dash_summary: "Financial Summary",
    dash_export: "Export Data",
    dash_export_pdf: "Export as Image",
    dash_generating_pdf: "Generating Image...",
    dash_export_csv: "Export as CSV",
    dash_total_spent: "Total Spent",
    dash_per_person: "Per Person",
    dash_breakdown: "Breakdown",
    dash_category: "Category",
    dash_person: "Person",
    dash_no_data: "No data available",
    dash_no_people: "No people added",
    dash_paid: "Paid:",
    dash_exported: "Exported",
    dash_people: "People",
    dash_expenses_count: "Entries Count",
    dash_start_date: "Start Date",
    dash_end_date: "End Date",
    dash_person_breakdown: "Person Breakdown",
    dash_share: "Share",
    dash_balance: "Balance",
    dash_category_breakdown: "Category Breakdown",
    dash_amount: "Amount",
    dash_percentage: "Percentage",
    dash_detailed_entries: "Detailed Entries",
    dash_original: "Original",
    dash_myr: "MYR",
    
    // Balances
    bal_title: "Balances",
    bal_settled: "Settled",
    bal_owes: "owes",
    bal_gets_back: "gets back",
    bal_settle_up: "Settle Up",
    bal_mark_settled: "Mark as Settled",
    bal_settlements: "Settlements",
    bal_all_settled: "All settled up! 🎉",
    
    // Entry List
    list_no_expenses: "No entries yet. Add one above!",
    list_filters: "Filters & Sort",
    list_search: "Search",
    list_search_placeholder: "Search description, person, location...",
    list_category: "Category",
    list_all_categories: "All Categories",
    list_sponsorships: "Sponsorships",
    list_settlements: "Settlements",
    list_from: "From",
    list_to: "To",
    list_sort_by: "Sort By",
    list_date_desc: "Date (Newest First)",
    list_date_asc: "Date (Oldest First)",
    list_amount_desc: "Amount (Highest First)",
    list_amount_asc: "Amount (Lowest First)",
    list_reset_filters: "Reset Filters",
    list_no_match: "No entries match your filters.",
    list_total: "Total:",
    list_sponsored_by: " by ",
    list_paid_to: "paid to",
    list_paid: "paid",
    list_sponsored: "sponsored",
    list_no_one: "No one",
    
    // Entry Details Modal
    detail_settlement: "Settlement Details",
    detail_sponsorship: "Sponsorship Details",
    detail_expense: "Entry Details",
    detail_date: "Date",
    detail_category: "Category",
    detail_paid_by: "Paid By",
    detail_sponsored_by: "Sponsored By",
    detail_split_details: "Split Details",
    detail_split_type: "Split Type",
    detail_unequal: "Unequal",
    detail_location: "Location",
    detail_open_maps: "Open in Maps",
    detail_edit: "Edit",
    detail_delete: "Delete",
    detail_confirm_delete: "Are you sure you want to delete this entry?",
    
    // Account People & Wallet
    trip_people: "People",
    trip_name_placeholder: "Name",
    trip_no_people: "No people added yet.",
    trip_wallet: "Currency Wallet",
    trip_cur_placeholder: "CUR",
    trip_foreign_placeholder: "Foreign",
    trip_myr_placeholder: "MYR",
    trip_log_exchange: "Log Exchange",
    trip_avg_rate: "Avg:",
    trip_no_exchanges: "No exchanges logged. Rate 1:1.",
    trip_new: "New Account",
    trip_rename: "Rename Account",
    trip_delete: "Delete Account",
    
    // App
    app_new_trip_prompt: "New Account Name:",
    app_delete_trip_confirm: "Delete current account?",
    app_rename_trip_prompt: "Rename Account:",
    app_delete_expense_confirm: "Delete this entry?",
    app_person_exists: "A person with this name already exists.",
    app_remove_person_confirm: "Remove ",
    app_sync_data: "Sync Data",
    app_theme: "Theme:",
    nav_people: "People",
    app_add_new_entry: "Add New Entry",
    
    // Settings
    set_language: "Language",
    set_theme: "Theme",
    set_currency: "Base Currency",
    set_sync_desc: "Sync your data across devices using a GitHub Gist.\n1. Create a Personal Access Token (Gist scope).\n2. Create a private Gist and paste its ID here.",
    set_github_token: "GitHub Token",
    set_gist_id: "Gist ID",
    set_pull_data: "Pull Data",
    set_push_data: "Push Data",
    set_unsaved_changes: "You have unsaved local changes",
    set_offline: "You are offline. Changes saved locally.",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    setLanguageState('en');
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState('en');
    localStorage.setItem('sw_language', 'en');
  };

  const t = (key: string, fallback?: string) => {
    return translations[language]?.[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
