export type JobSite = {
  id: number;
  name: string;
  urls: string[];
  queryParamsToRemove?: string[];
  created_at: Date;
};

export type Link = {
  id: string;
  url: string;
  title: string;
  user_id: string;
  created_at: Date;
};

export type JobType = "remote" | "hybrid" | "onsite";
export type Job = {
  id: string;
  user_id: string;
  externalId: string;
  externalUrl: string;
  siteId: number;

  title: string;
  companyName: string;
  companyLogo?: string;

  jobType?: JobType;
  location?: string;
  salary?: string;
  tags?: string[];

  archived: boolean;

  created_at: Date;
  updated_at: Date;
};

/**
 * Supabase database schema.
 */
export type DbSchema = {
  public: {
    Tables: {
      sites: {
        Row: JobSite;
        Insert: Pick<JobSite, "name" | "urls">;
        Update: never;
      };
      links: {
        Row: Link;
        Insert: Pick<Link, "url" | "title">;
        Update: never;
      };
      jobs: {
        Row: Job;
        Insert: Pick<
          Job,
          | "siteId"
          | "externalId"
          | "externalUrl"
          | "title"
          | "companyName"
          | "companyLogo"
          | "location"
          | "salary"
          | "tags"
          | "jobType"
          | "archived"
        >;
        Update: Pick<Job, "archived">;
      };
    };
    Views: {};
    Functions: {};
  };
};
