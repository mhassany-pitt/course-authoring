export type ContentDto = {
  id: number;
  type: string;
  short_name: string;
  name: string;
  description: string;
  url: string;
  domain_id: string;
  domain_name: string;
  provider_id: string;
  provider_name: string;
  author_id: string;
  author_name: string;
  creation_date: string;
  problem_statement?: string;
  code?: string;
  preview_url?: any;
  metadata?: any;
}
