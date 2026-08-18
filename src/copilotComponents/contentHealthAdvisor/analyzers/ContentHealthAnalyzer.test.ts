import { ContentHealthAnalyzer } from './ContentHealthAnalyzer';
import { GenericTitleRule, MissingDescriptionRule, OutdatedYearReferenceRule, ShortContentRule, StaleContentRule } from '../rules';
import type { IContentPage } from '../models/ContentHealthModels';

const page: IContentPage = { id: '1', title: 'Page', name: 'page.aspx', description: ' ', webUrl: 'https://contoso.sharepoint.com/sites/demo/sitepages/page.aspx', lastModifiedDateTime: '2020-01-01T00:00:00Z', type: 'Page' };
const rules = [new MissingDescriptionRule(), new StaleContentRule(), new GenericTitleRule(), new ShortContentRule(), new OutdatedYearReferenceRule()];

describe('ContentHealthAnalyzer', () => {
  it('calculates penalties and keeps scores within bounds', () => {
    const result = new ContentHealthAnalyzer(rules).analyze(page, { text: 'Reference year 2022', wordCount: 3 }, new Date('2026-01-01T00:00:00Z'));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.status).toBe('High Priority');
    expect(result.issues.map(issue => issue.ruleId)).toEqual(expect.arrayContaining(['missing-description', 'stale-content', 'generic-title', 'short-content', 'outdated-year-reference']));
  });

  it('does not run content rules before deep analysis', () => {
    const result = new ContentHealthAnalyzer(rules).analyze(page, undefined, new Date('2026-01-01T00:00:00Z'));
    expect(result.issues.map(issue => issue.ruleId)).not.toContain('short-content');
    expect(result.issues.map(issue => issue.ruleId)).not.toContain('outdated-year-reference');
  });
});
