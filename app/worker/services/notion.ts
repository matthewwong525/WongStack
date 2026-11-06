// Generated from schema/services/notion/openapi.json by scripts/company-api.mjs record; do not edit by hand.
// Type a service's answer with it, such as `body as Notion…Answer`: wiki/stack/testing.md#service-examples
export type NotionSearchRequest = {
  query?: string;
  filter?: {
    property?: "object";
    value?: "page" | "data_source" | "database";
  };
  sort?: {
    direction?: "ascending" | "descending";
    timestamp?: "last_edited_time";
  };
  start_cursor?: string;
  page_size?: number;
};

export type NotionSearchAnswer = {
  object: string;
  results: ({
    object: "page" | "database" | "data_source";
    id: string;
    url?: string;
    last_edited_time?: string;
    properties?: Record<string, unknown>;
  })[];
  next_cursor: string | null;
  has_more: boolean;
  type: string;
  page_or_database: Record<string, unknown>;
  request_id: string;
};
