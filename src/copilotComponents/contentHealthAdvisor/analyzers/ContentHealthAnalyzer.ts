import type {
  ContentHealthStatus,
  IContentHealthResult,
  IContentHealthRule,
  IContentHealthRuleConfig,
  IContentHealthRuleContext,
  IExtractedPageContent,
  IContentPage
} from '../models/ContentHealthModels';

export class ContentHealthAnalyzer {
  public constructor(
    private readonly rules: IContentHealthRule[],
    private readonly config: IContentHealthRuleConfig = {}
  ) {}

  public analyze(page: IContentPage, content?: IExtractedPageContent, now: Date = new Date()): IContentHealthResult {
    const context: IContentHealthRuleContext = { page, content, config: this.config, now };
    const issues = this.rules.filter(rule => this.config.enabled !== false && this.config[rule.id] !== false).map(rule => rule.analyze(context)).filter((item): item is NonNullable<typeof item> => Boolean(item));
    const score = Math.max(0, Math.min(100, 100 - issues.reduce((total, item) => total + item.penalty, 0)));
    const status: ContentHealthStatus = score >= 80 ? 'Healthy' : score >= 50 ? 'Needs Attention' : 'High Priority';
    return { page, score, status, issues, analyzedContent: Boolean(content) };
  }
}
