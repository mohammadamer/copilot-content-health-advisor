import type {
  IContentHealthIssue,
  IContentHealthRule,
  IContentHealthRuleContext
} from '../models/ContentHealthModels';

const issue = (
  ruleId: string,
  title: string,
  severity: IContentHealthIssue['severity'],
  description: string,
  evidence: string,
  recommendation: string,
  penalty: number
): IContentHealthIssue => ({ ruleId, title, severity, description, evidence, recommendation, penalty });

export class MissingDescriptionRule implements IContentHealthRule {
  public readonly id: string = 'missing-description';

  public analyze(context: IContentHealthRuleContext): IContentHealthIssue | undefined {
    if (context.page.description.trim()) return undefined;
    return issue(this.id, 'Missing Description', 'Warning', 'This page has no description.', 'Description is empty.', 'Add a clear description explaining the page purpose.', context.config.warningPenalty ?? 15);
  }
}

export class StaleContentRule implements IContentHealthRule {
  public readonly id: string = 'stale-content';

  public analyze(context: IContentHealthRuleContext): IContentHealthIssue | undefined {
    if (!context.page.lastModifiedDateTime) return undefined;
    const ageDays = Math.floor((context.now.getTime() - new Date(context.page.lastModifiedDateTime).getTime()) / 86400000);
    if (ageDays <= (context.config.thresholdDays ?? 180)) return undefined;
    const highPriority = ageDays > 365;
    return issue(this.id, 'Potentially Stale Content', highPriority ? 'High priority' : 'Warning', 'This content may need review based on its last modification date.', `Last modified ${ageDays} days ago.`, 'Review the content for accuracy and continued relevance; older content is not automatically outdated.', highPriority ? context.config.highPenalty ?? 20 : context.config.warningPenalty ?? 10);
  }
}

export class ShortContentRule implements IContentHealthRule {
  public readonly id: string = 'short-content';

  public analyze(context: IContentHealthRuleContext): IContentHealthIssue | undefined {
    if (!context.content || context.content.wordCount >= (context.config.shortContentWords ?? 100)) return undefined;
    return issue(this.id, 'Short Content', 'Warning', 'The page contains little extracted text and is only a signal for review.', `Found ${context.content.wordCount} words.`, 'Review whether the page needs more useful context for its audience.', context.config.warningPenalty ?? 15);
  }
}

export class OutdatedYearReferenceRule implements IContentHealthRule {
  public readonly id: string = 'outdated-year-reference';

  public analyze(context: IContentHealthRuleContext): IContentHealthIssue | undefined {
    if (!context.content) return undefined;
    const threshold = context.config.oldYearThreshold ?? 2;
    const currentYear = context.now.getFullYear();
    const yearPattern = /\b(19|20)\d{2}\b/g;
    const years: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = yearPattern.exec(context.content.text)) !== null) { years.push(Number(match[0])); }
    const oldYear = years.find(year => year < currentYear - threshold);
    if (!oldYear) return undefined;
    return issue(this.id, 'Possible Old Year Reference', 'Warning', 'The page references an older year and may need review.', `Found reference to year: ${oldYear}`, 'Check whether the year reference is still accurate; it is not assumed to be wrong.', context.config.warningPenalty ?? 10);
  }
}

export class GenericTitleRule implements IContentHealthRule {
  public readonly id: string = 'generic-title';

  public analyze(context: IContentHealthRuleContext): IContentHealthIssue | undefined {
    const genericTitles = context.config.genericTitles ?? ['Information', 'New Page', 'Test', 'Untitled', 'Page', 'Document'];
    if (!genericTitles.some(title => title.toLowerCase() === context.page.title.trim().toLowerCase())) return undefined;
    return issue(this.id, 'Generic Title', 'Warning', 'The title may not clearly describe the page.', `Title is “${context.page.title}”.`, 'Use a specific title that tells readers what the page contains.', context.config.warningPenalty ?? 10);
  }
}
