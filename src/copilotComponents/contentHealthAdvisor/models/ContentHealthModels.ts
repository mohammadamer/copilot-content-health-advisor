export interface ISelectedSite {
  siteId: string;
  siteUrl: string;
  siteName: string;
}

export type ContentPageType = 'Page' | 'News';
export type ContentHealthStatus = 'Healthy' | 'Needs Attention' | 'High Priority' | 'Analysis incomplete';
export type ContentHealthSeverity = 'Warning' | 'High priority';

export interface IContentPage {
  id: string;
  title: string;
  name: string;
  description: string;
  webUrl: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  createdBy?: string;
  lastModifiedBy?: string;
  pageLayout?: string;
  promotionKind?: string;
  type: ContentPageType;
}

export interface IExtractedPageContent {
  text: string;
  wordCount: number;
}

export interface IContentHealthIssue {
  ruleId: string;
  title: string;
  severity: ContentHealthSeverity;
  description: string;
  evidence: string;
  recommendation: string;
  penalty: number;
}

export interface IContentHealthResult {
  page: IContentPage;
  score: number;
  status: ContentHealthStatus;
  issues: IContentHealthIssue[];
  analyzedContent: boolean;
  error?: string;
}

export interface IContentHealthRuleConfig {
  [ruleId: string]: boolean | number | string[] | undefined;
  enabled?: boolean;
  warningPenalty?: number;
  highPenalty?: number;
  thresholdDays?: number;
  shortContentWords?: number;
  oldYearThreshold?: number;
  genericTitles?: string[];
}

export interface IContentHealthRuleContext {
  page: IContentPage;
  content?: IExtractedPageContent;
  config: IContentHealthRuleConfig;
  now: Date;
}

export interface IContentHealthRule {
  readonly id: string;
  analyze(context: IContentHealthRuleContext): IContentHealthIssue | undefined;
}
