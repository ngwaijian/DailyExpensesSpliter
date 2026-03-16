import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'zh';

interface Translations {
  [key: string]: string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Navigation
    nav_dashboard: "Dashboard",
    nav_expenses: "Expenses",
    nav_balances: "Balances",
    nav_settings: "Settings",
    
    // Header
    header_select_trip: "Select Group",
    header_new_trip: "New Group",
    
    // Expense Form
    form_type_expense: "Expense",
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
    form_save: "Save Expense",
    form_add: "Add Expense",
    form_edit: "Edit Expense",
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
    form_settled_desc: "Settled expenses are recorded but don't affect balances.",
    form_sponsored_desc: "Sponsored expenses count towards the group total, but the sponsor takes on the full cost.",
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
    dash_total: "Total Expenses",
    dash_your_balance: "Your Balance",
    dash_recent: "Recent Expenses",
    dash_view_all: "View All",
    dash_summary: "Group Summary",
    dash_export: "Export Data",
    dash_export_pdf: "Export as PDF",
    dash_generating_pdf: "Generating PDF...",
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
    dash_expenses_count: "Expenses Count",
    dash_start_date: "Start Date",
    dash_end_date: "End Date",
    dash_person_breakdown: "Person Breakdown",
    dash_share: "Share",
    dash_balance: "Balance",
    dash_category_breakdown: "Category Breakdown",
    dash_amount: "Amount",
    dash_percentage: "Percentage",
    dash_detailed_expenses: "Detailed Expenses",
    dash_original: "Original",
    dash_myr: "MYR",
    
    // Planning
    plan_recurring: "Recurring",
    plan_goals: "Goals",
    
    // Balances
    bal_title: "Balances",
    bal_settled: "Settled",
    bal_owes: "owes",
    bal_gets_back: "gets back",
    bal_settle_up: "Settle Up",
    bal_mark_settled: "Mark as Settled",
    bal_settlements: "Settlements",
    bal_all_settled: "All settled up! 🎉",
    
    // Expense List
    list_no_expenses: "No expenses yet. Add one above!",
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
    list_no_match: "No expenses match your filters.",
    list_total: "Total:",
    list_sponsored_by: " by ",
    list_paid_to: "paid to",
    list_paid: "paid",
    list_sponsored: "sponsored",
    list_no_one: "No one",
    
    // Expense Details Modal
    detail_settlement: "Settlement Details",
    detail_sponsorship: "Sponsorship Details",
    detail_expense: "Expense Details",
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
    detail_confirm_delete: "Are you sure you want to delete this expense?",
    
    // Trip People & Wallet
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
    trip_new: "New Group",
    trip_rename: "Rename Group",
    trip_delete: "Delete Group",
    
    // App
    app_new_trip_prompt: "New Group Name:",
    app_delete_trip_confirm: "Delete current group?",
    app_rename_trip_prompt: "Rename Group:",
    app_delete_expense_confirm: "Delete this expense?",
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
  },
  zh: {
    // Navigation
    nav_dashboard: "概览",
    nav_expenses: "记账",
    nav_balances: "结算",
    nav_settings: "设置",
    
    // Header
    header_select_trip: "选择账本",
    header_new_trip: "新建账本",
    
    // Expense Form
    form_type_expense: "支出",
    form_type_settlement: "还款",
    form_type_sponsorship: "赞助",
    form_desc: "描述",
    form_desc_placeholder: "例如：晚餐、打车...",
    form_desc_settlement: "还款",
    form_date: "日期",
    form_category: "类别",
    form_amount: "金额",
    form_paid_by: "付款人",
    form_split_among: "分摊人",
    form_memo: "备注 (可选)",
    form_memo_placeholder: "添加额外信息...",
    form_location: "地点 (可选)",
    form_location_placeholder: "搜索地点...",
    form_cancel: "取消",
    form_save: "保存",
    form_add: "添加记录",
    form_edit: "编辑记录",
    form_split_equally: "平分",
    form_split_unequally: "不平分",
    form_sponsored_by: "赞助人",
    form_who_received: "收款人",
    form_beneficiaries: "受益人",
    form_all: "全选",
    form_none: "全不选",
    form_add_people_first: "请先添加成员",
    form_split_method: "分摊方式",
    form_equally: "平分",
    form_exact_amounts: "具体金额",
    form_percentages: "百分比",
    form_shares: "份额",
    form_mark_sponsored: "标记为赞助",
    form_settled_desc: "已结算的支出会被记录，但不影响余额。",
    form_sponsored_desc: "赞助的支出计入账本总额，但由赞助人承担全部费用。",
    form_assign_shares: "分配份额（最大：{maxShares}）。设置为0以排除。",
    form_remaining_shares: "剩余：{remainingShares}",
    form_split_remaining: "平分剩余",
    form_clear: "清空",
    form_total: "总计:",
    form_reset: "重置",
    form_update_entry: "更新记录",
    form_save_entry: "保存记录",
    form_select_person: "选择人员",
    form_coordinates: "已附加坐标:",
    form_suggested_settlement: "建议全额结算:",
    form_pinned_location: "已定位地点",
    form_pinned: "已定位",
    form_pin: "定位",
    form_use_current_location: "使用当前位置",
    form_search_location: "搜索地点",
    
    // Categories
    "cat_🍽️ Meals & Dining": "餐饮美食",
    "cat_🏨 Accommodation": "住宿酒店",
    "cat_🚕 Transport & Fuel": "交通加油",
    "cat_✈️ Flights": "航班机票",
    "cat_🎢 Activities & Tours": "活动观光",
    "cat_🛍️ Shopping": "购物消费",
    "cat_🍻 Drinks & Nightlife": "饮品夜生活",
    "cat_📝 General / Other": "其他支出",
    
    // Dashboard
    dash_total: "总支出",
    dash_your_balance: "你的余额",
    dash_recent: "最近记录",
    dash_view_all: "查看全部",
    dash_summary: "账本总结",
    dash_export: "导出数据",
    dash_export_pdf: "导出 PDF",
    dash_generating_pdf: "正在生成 PDF...",
    dash_export_csv: "导出 CSV",
    dash_total_spent: "总支出",
    dash_per_person: "人均支出",
    dash_breakdown: "明细",
    dash_category: "分类",
    dash_person: "人员",
    dash_no_data: "暂无数据",
    dash_no_people: "暂无人员",
    dash_paid: "已付:",
    dash_exported: "导出时间",
    dash_people: "人数",
    dash_expenses_count: "支出笔数",
    dash_start_date: "开始日期",
    dash_end_date: "结束日期",
    dash_person_breakdown: "人员明细",
    dash_share: "应付",
    dash_balance: "余额",
    dash_category_breakdown: "分类明细",
    dash_amount: "金额",
    dash_percentage: "百分比",
    dash_detailed_expenses: "详细支出列表",
    dash_original: "原币种",
    dash_myr: "马币",
    
    // Planning
    plan_recurring: "定期支出",
    plan_goals: "目标",
    
    // Balances
    bal_title: "结算",
    bal_settled: "已结清",
    bal_owes: "欠",
    bal_gets_back: "应收",
    bal_settle_up: "去结账",
    bal_mark_settled: "标记为已结清",
    bal_settlements: "结算方案",
    bal_all_settled: "全部结清啦！🎉",
    
    // Expense List
    list_no_expenses: "暂无支出。在上方添加一笔吧！",
    list_filters: "筛选与排序",
    list_search: "搜索",
    list_search_placeholder: "搜索描述、人员、地点...",
    list_category: "分类",
    list_all_categories: "所有分类",
    list_sponsorships: "赞助",
    list_settlements: "结算",
    list_from: "从",
    list_to: "至",
    list_sort_by: "排序方式",
    list_date_desc: "日期 (从新到旧)",
    list_date_asc: "日期 (从旧到新)",
    list_amount_desc: "金额 (从高到低)",
    list_amount_asc: "金额 (从低到高)",
    list_reset_filters: "重置筛选",
    list_no_match: "没有符合筛选条件的支出。",
    list_total: "总计:",
    list_sponsored_by: " 由 ",
    list_paid_to: "付给",
    list_paid: "支付",
    list_sponsored: "赞助",
    list_no_one: "无",
    
    // Expense Details Modal
    detail_settlement: "结算详情",
    detail_sponsorship: "赞助详情",
    detail_expense: "支出详情",
    detail_date: "日期",
    detail_category: "分类",
    detail_paid_by: "支付人",
    detail_sponsored_by: "赞助人",
    detail_split_details: "分摊详情",
    detail_split_type: "分摊方式",
    detail_unequal: "不均等",
    detail_location: "地点",
    detail_open_maps: "在地图中打开",
    detail_edit: "编辑",
    detail_delete: "删除",
    detail_confirm_delete: "确定要删除这笔支出吗？",
    
    // Trip People & Wallet
    trip_people: "人员",
    trip_name_placeholder: "姓名",
    trip_no_people: "暂无人员。",
    trip_wallet: "货币钱包",
    trip_cur_placeholder: "币种",
    trip_foreign_placeholder: "外币",
    trip_myr_placeholder: "马币",
    trip_log_exchange: "记录汇率",
    trip_avg_rate: "平均:",
    trip_no_exchanges: "暂无汇率记录。默认 1:1。",
    trip_new: "新建账本",
    trip_rename: "重命名账本",
    trip_delete: "删除账本",
    
    // App
    app_new_trip_prompt: "新账本名称:",
    app_delete_trip_confirm: "删除当前账本？",
    app_rename_trip_prompt: "重命名账本:",
    app_delete_expense_confirm: "删除这笔支出？",
    app_person_exists: "已存在同名人员。",
    app_remove_person_confirm: "移除 ",
    app_sync_data: "同步数据",
    app_theme: "主题:",
    nav_people: "人员",
    app_add_new_entry: "添加新记录",
    
    // Settings
    set_language: "语言 (Language)",
    set_theme: "主题",
    set_currency: "主货币",
    set_sync_desc: "使用 GitHub Gist 在设备间同步数据。\n1. 创建一个 Personal Access Token (Gist 权限)。\n2. 创建一个私有 Gist 并将其 ID 粘贴到此处。",
    set_github_token: "GitHub Token",
    set_gist_id: "Gist ID",
    set_pull_data: "拉取数据",
    set_push_data: "推送数据",
    set_unsaved_changes: "您有未保存的本地更改",
    set_offline: "您处于离线状态。更改已保存在本地。",
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
    const saved = localStorage.getItem('sw_language') as Language;
    if (saved && (saved === 'en' || saved === 'zh')) {
      setLanguageState(saved);
    } else {
      // Auto-detect based on browser
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.includes('zh')) {
        setLanguageState('zh');
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('sw_language', lang);
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
