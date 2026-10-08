export type Job = {
  id: string;            // `${source}:${originalId}`
  source: "himalayas" | "remotive" | "remoteok";
  title: string;
  company: string;
  url: string;           // link back to the source listing (required by their terms)
  location: string;      // free text, "" if unknown
  tags: string[];
  description: string;   // plain text
  salary?: string;
  postedAt?: string;     // ISO date
};

export type RankedJob = Job & { similarity: number };

export type Evaluation = {
  jobId: string;
  fitScore: number;
  locationEligible: "yes" | "no" | "unclear";
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
  redFlags: string[];
};

export type Letter = {
  jobId: string;
  text: string;
  approved: boolean;
  attempts: number;     // how many drafts were written
  reviewedAt: number;   // which attempt was last reviewed
  feedback: string[];
};
