export interface SlcItemReportItem {
  id: string;
  user_email: string;
  status: string;
  identity: {
    id: string;
    title: string;
    type: string;
  };
}

export interface SlcItemReport {
  id: string;
  item_id: string;
  reason: string;
  details: string;
  resolved?: boolean;
  resolved_at?: string;
  created_at?: string;
  updated_at?: string;
  item?: SlcItemReportItem | null;
}
