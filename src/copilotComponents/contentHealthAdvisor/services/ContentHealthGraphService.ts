import type { MSGraphClientV3 } from '@microsoft/sp-http';
import type { ContentPageType, IContentPage, IExtractedPageContent, ISelectedSite } from '../models/ContentHealthModels';

interface IGraphCollection<T> { value?: T[]; '@odata.nextLink'?: string; }
interface IGraphSite { id?: string; name?: string; displayName?: string; webUrl?: string; }
interface IGraphPage {
  id: string; title?: string; name?: string; description?: string; webUrl?: string;
  createdDateTime?: string; lastModifiedDateTime?: string; createdBy?: { user?: { displayName?: string } };
  lastModifiedBy?: { user?: { displayName?: string } }; pageLayout?: string; promotionKind?: string;
}

export interface IContentHealthGraphService {
  searchSites(query: string): Promise<ISelectedSite[]>;
  getPages(siteId: string): Promise<IContentPage[]>;
  getPageContent(siteId: string, pageId: string): Promise<IExtractedPageContent>;
}

export class ContentHealthGraphService implements IContentHealthGraphService {
  public constructor(private readonly client: MSGraphClientV3) {}

  public async searchSites(query: string): Promise<ISelectedSite[]> {
    const response: IGraphCollection<IGraphSite> = await this.client.api('/sites').search(query).select('id,name,displayName,webUrl').get();
    return (response.value ?? []).filter(site => site.id && site.webUrl).map(site => ({ siteId: site.id as string, siteUrl: site.webUrl as string, siteName: site.displayName || site.name || site.webUrl as string }));
  }

  public async getPages(siteId: string): Promise<IContentPage[]> {
    const pages: IContentPage[] = [];
    let nextUrl: string | undefined = `/sites/${encodeURIComponent(siteId)}/pages/microsoft.graph.sitePage?$select=id,title,name,description,webUrl,createdDateTime,lastModifiedDateTime,createdBy,lastModifiedBy,pageLayout,promotionKind`;
    while (nextUrl) {
      const response: IGraphCollection<IGraphPage> = await this.client.api(nextUrl).get();
      pages.push(...(response.value ?? []).map(page => ({
        id: page.id, title: page.title || page.name || 'Untitled', name: page.name || '', description: page.description || '', webUrl: page.webUrl || '',
        createdDateTime: page.createdDateTime, lastModifiedDateTime: page.lastModifiedDateTime,
        createdBy: page.createdBy?.user?.displayName, lastModifiedBy: page.lastModifiedBy?.user?.displayName,
        pageLayout: page.pageLayout, promotionKind: page.promotionKind, type: (page.promotionKind === 'newsPost' ? 'News' : 'Page') as ContentPageType
      })));
      nextUrl = response['@odata.nextLink'];
    }
    return pages;
  }

  public async getPageContent(siteId: string, pageId: string): Promise<IExtractedPageContent> {
    const page: { canvasLayout?: unknown } = await this.client.api(`/sites/${encodeURIComponent(siteId)}/pages/${encodeURIComponent(pageId)}/microsoft.graph.sitePage`).expand('canvasLayout').get();
    const text = this.extractText(page.canvasLayout);
    return { text, wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0 };
  }

  private extractText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(item => this.extractText(item)).filter(Boolean).join(' ');
    if (value && typeof value === 'object') { const record = value as Record<string, unknown>; return Object.keys(record).map((key: string) => this.extractText(record[key])).filter(Boolean).join(' '); }
    return '';
  }
}
