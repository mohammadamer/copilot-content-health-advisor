import * as React from 'react';
import { FluentProvider, IdPrefixProvider, webDarkTheme, webLightTheme, Button, Card, Field, Input, Subtitle2, Text, Title2, makeStyles, tokens } from '@fluentui/react-components';
import { Search24Regular, Open24Regular } from '@fluentui/react-icons';
import type { IContentHealthAdvisorProps } from './IContentHealthAdvisorProps';
import type { IContentHealthResult, ISelectedSite } from '../models/ContentHealthModels';
import { ContentHealthAnalyzer } from '../analyzers';
import { GenericTitleRule, MissingDescriptionRule, OutdatedYearReferenceRule, ShortContentRule, StaleContentRule } from '../rules';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, padding: tokens.spacingHorizontalM, maxWidth: '1100px' },
  header: { display: 'flex', justifyContent: 'space-between', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' },
  search: { display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'end', flexWrap: 'wrap' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: tokens.spacingHorizontalM },
  stat: { padding: tokens.spacingVerticalM },
  table: { display: 'grid', gap: tokens.spacingVerticalXS },
  row: { display: 'grid', gridTemplateColumns: 'minmax(180px, 2fr) 80px 80px 130px minmax(180px, 1fr)', gap: tokens.spacingHorizontalS, alignItems: 'center', padding: tokens.spacingVerticalS, borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  error: { color: tokens.colorPaletteRedForeground1 }
});

const analyzer = new ContentHealthAnalyzer([new MissingDescriptionRule(), new StaleContentRule(), new GenericTitleRule(), new ShortContentRule(), new OutdatedYearReferenceRule()]);

export default function ContentHealthAdvisor(props: IContentHealthAdvisorProps): React.ReactElement {
  const { hostContext, graphService, initialSite, strings, bridge } = props;
  const styles = useStyles();
  const [siteQuery, setSiteQuery] = React.useState('');
  const [pageQuery, setPageQuery] = React.useState('');
  const [pageFilter, setPageFilter] = React.useState('All');
  const [sortDescending, setSortDescending] = React.useState(false);
  const [sites, setSites] = React.useState<ISelectedSite[]>([initialSite]);
  const [selectedSite, setSelectedSite] = React.useState<ISelectedSite | undefined>();
  const [results, setResults] = React.useState<IContentHealthResult[]>([]);
  const [selectedResult, setSelectedResult] = React.useState<IContentHealthResult | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const theme = hostContext.theme === 'dark' ? webDarkTheme : webLightTheme;

  const searchSites = async (): Promise<void> => {
    setError('');
    try { setSites(await graphService.searchSites(siteQuery.trim() || '*')); }
    catch { setError(strings.SiteSelectionError); }
  };

  const analyzeSite = async (): Promise<void> => {
    if (!selectedSite) return;
    setLoading(true); setError(''); setResults([]); setSelectedResult(undefined);
    try { setResults((await graphService.getPages(selectedSite.siteId)).map(page => analyzer.analyze(page))); }
    catch { setError(strings.AnalysisError); }
    finally { setLoading(false); }
  };

  const analyzeContent = async (result: IContentHealthResult): Promise<void> => {
    if (!selectedSite) return;
    try { const content = await graphService.getPageContent(selectedSite.siteId, result.page.id); const updated = analyzer.analyze(result.page, content); setResults(current => current.map(item => item.page.id === updated.page.id ? updated : item)); setSelectedResult(updated); }
    catch { setSelectedResult({ ...result, status: 'Analysis incomplete', error: strings.AnalysisError }); }
  };

  const totalScore = results.length ? Math.round(results.reduce((total, result) => total + result.score, 0) / results.length) : 0;
  const visibleResults = results.filter(result => (pageFilter === 'All' || result.status === pageFilter || result.page.type === pageFilter) && result.page.title.toLowerCase().includes(pageQuery.toLowerCase())).sort((left, right) => (sortDescending ? right.score - left.score : left.score - right.score));
  return <IdPrefixProvider value="copilot-component-"><FluentProvider theme={theme} targetDocument={props.targetDocument} style={{ minHeight: '100%' }}><div className={styles.root}>
    <div className={styles.header}><div><Title2>{strings.SelectSiteLabel}</Title2><Text block>{props.message}</Text></div><Button icon={<Search24Regular />} onClick={searchSites}>{strings.SearchSitesLabel}</Button></div>
    <div className={styles.search}><Field label={strings.SiteSearchPlaceholder}><Input value={siteQuery} onChange={(_, data) => setSiteQuery(data.value)} placeholder={strings.SiteSearchPlaceholder} /></Field><Button appearance="primary" onClick={searchSites}>{strings.SearchSitesLabel}</Button></div>
    {sites.length > 0 && <Field label={strings.SelectSiteLabel}><select value={selectedSite?.siteId || ''} onChange={event => { const site = sites.find(item => item.siteId === event.target.value); setSelectedSite(site); setResults([]); setSelectedResult(undefined); }}><option value="">{strings.SelectSiteLabel}</option>{sites.map(site => <option key={site.siteId} value={site.siteId}>{site.siteName} - {site.siteUrl}</option>)}</select></Field>}
    {selectedSite && <Card><Subtitle2>{selectedSite.siteName}</Subtitle2><Text block>{selectedSite.siteUrl}</Text><Button appearance="primary" onClick={analyzeSite} disabled={loading}>{loading ? 'Loading...' : strings.AnalyzeSiteLabel}</Button></Card>}
    {error && <Text className={styles.error}>{error}</Text>}
    {selectedSite && results.length > 0 && <><div className={styles.stats}><Card className={styles.stat}><Subtitle2>{strings.ScoreLabel}</Subtitle2><Title2>{totalScore}/100</Title2></Card><Card className={styles.stat}><Subtitle2>{strings.PagesAnalyzedLabel}</Subtitle2><Title2>{results.length}</Title2></Card>{(['Healthy', 'Needs Attention', 'High Priority'] as const).map(status => <Card className={styles.stat} key={status}><Subtitle2>{status}</Subtitle2><Title2>{results.filter(result => result.status === status).length}</Title2></Card>)}</div><Text>{'This score is calculated using configurable content health rules. It is not an official Microsoft Copilot Readiness Score.'}</Text>
      <div className={styles.search}><Input value={pageQuery} onChange={(_, data) => setPageQuery(data.value)} placeholder="Search pages" /><select value={pageFilter} onChange={event => setPageFilter(event.target.value)}>{['All', 'Healthy', 'Needs Attention', 'High Priority', 'News', 'Page'].map(filter => <option key={filter}>{filter}</option>)}</select><Button onClick={() => setSortDescending(value => !value)}>Sort by score</Button></div><div className={styles.table}><div className={styles.row}><Subtitle2>Title</Subtitle2><Subtitle2>Type</Subtitle2><Subtitle2>Score</Subtitle2><Subtitle2>Status</Subtitle2><Subtitle2>Actions</Subtitle2></div>{visibleResults.map(result => <div className={styles.row} key={result.page.id}><Text>{result.page.title}</Text><Text>{result.page.type}</Text><Text>{result.score}</Text><Text>{result.status}</Text><span><Button appearance="subtle" onClick={() => setSelectedResult(result)}>Details</Button><Button icon={<Open24Regular />} appearance="subtle" onClick={() => bridge.openLinkAsync(result.page.webUrl)} /><Button appearance="subtle" onClick={() => analyzeContent(result)}>{strings.AnalyzeContentLabel}</Button></span></div>)}</div></>}
    {selectedResult && <Card><Title2>{selectedResult.page.title}</Title2><Text block>{selectedResult.score}/100 - {selectedResult.status}</Text>{selectedResult.error && <Text className={styles.error}>{selectedResult.error}</Text>}{selectedResult.issues.map(issue => <Text block key={issue.ruleId}>{issue.title}: -{issue.penalty}. {issue.evidence} {issue.recommendation}</Text>)}{!selectedResult.analyzedContent && <Button onClick={() => analyzeContent(selectedResult)}>{strings.AnalyzeContentLabel}</Button>}<Button onClick={() => bridge.sendFollowUpMessageAsync([{ type: 'text', text: `Explain the health issues for ${selectedResult.page.title} using only this selected site's analysis.` }])}>{strings.FollowUpButtonLabel}</Button></Card>}
  </div></FluentProvider></IdPrefixProvider>;
}
