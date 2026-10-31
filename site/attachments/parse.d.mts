export declare const REPO_URL: string;

export interface Attachment {
  title?: string;
  problem?: string;
  fix?: string;
  order?: number;
  checked?: string;
  sources?: string[];
  body: string;
}

export declare function parseAttachment(text: string): Attachment;
