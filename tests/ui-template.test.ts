import {describe,it,expect} from "vitest";
import {dashboardHtml} from "../src/ui/template.js";

describe("dashboard UI composition",()=>{
 it("composes the sidebar, design system, client and page shell",()=>{
  expect(dashboardHtml).toContain('id="appSidebar"');
  expect(dashboardHtml).toContain('id="themeToggle"');
  expect(dashboardHtml).toContain('id="commandOverlay"');
  expect(dashboardHtml).toContain('id="universeCanvas"');
  expect(dashboardHtml).toContain('id="tokenAdminControls"');
  expect(dashboardHtml).toContain('id="rotateAdminToken"');
  expect(dashboardHtml).toContain('id="rotateOperatorToken"');
  expect(dashboardHtml).toContain('id="revokeOperatorToken"');
  expect(dashboardHtml).toContain('id="inferenceQuotaForm"');
  expect(dashboardHtml).not.toContain("__LEANNAAUTO_");
 });
 it("keeps every navigation target connected to a page section",()=>{
  const navigation=dashboardHtml.split('<nav aria-label="Navigation principale">')[1]?.split('</nav>')[0]??"";
  const pages=[...navigation.matchAll(new RegExp("page\\('([^']+)'","g"))].map(match=>match[1]);
  const sections=[...dashboardHtml.matchAll(new RegExp('<section\\b[^>]*id="([^"]+)"','g'))].map(match=>match[1]);
  expect(pages.length).toBeGreaterThan(0);
  expect(pages.every(page=>sections.includes(page))).toBe(true);
 });
 it("ships a syntactically valid browser client and unique static element IDs",()=>{
  const scriptStart=dashboardHtml.indexOf("<script>")+8;
  const scriptEnd=dashboardHtml.indexOf("</script>",scriptStart);
  const script=dashboardHtml.slice(scriptStart,scriptEnd);
  expect(scriptEnd).toBeGreaterThan(scriptStart);
  expect(()=>new Function(script)).not.toThrow();
  const markup=dashboardHtml.slice(0,dashboardHtml.indexOf("<script>"));
  const ids=[...markup.matchAll(new RegExp('\\bid="([^"]+)"','g'))].map(match=>match[1]);
  expect(new Set(ids).size).toBe(ids.length);
 });
});
