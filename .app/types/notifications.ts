export type NotificationCategory = 
  | 'task' 
  | 'fleet' 
  | 'inventory' 
  | 'system' 
  | 'mention' 
  | 'approval'
  | 'hr'
  | 'crm'
  | 'finance';

export type NotificationScope = 'user' | 'role' | 'company';

export interface Notification {
  id: string;
  company_id: string;
  actor_id?: string;
  actor_name?: string;
  actor_avatar?: string;
  category: NotificationCategory;
  scope: NotificationScope;
  title: string;
  content?: string;
  metadata: any;
  created_at: string;
  is_read: boolean;
  read_at?: string;
  is_archived: boolean;
  archived_at?: string;
}

export interface NotificationState {
  unreadCount: number;
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
}
