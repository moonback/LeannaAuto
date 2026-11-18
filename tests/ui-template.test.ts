import {describe,it,expect} from "vitest";
import {dashboardHtml} from "../src/ui/template.js";

describe("dashboard UI composition",()=>{
 it("composes the sidebar, design system, client and page shell",()=>{
  expect(dashboardHtml).toContain('id="appSidebar"');
  expect(dashboardHtml).toContain('id="themeToggle"');
  expect(dashboardHtml).toContain('id="commandOverlay"');
  expect(dashboardHtml).toContain('id="universeCanvas"');
  expect(dashboardHtml).not.toContain("__LEANNAAUTO_");
 });
 it("keeps every navigation target connected to a page section",()=>{
  const navigation=dashboardHtml.match(/<nav aria-label="Navigation principale">([\\s\\S]*?)<\\/nav>/)?.[1]??"";
  const pages=[...navigation.matchAll(/page\\('([^']+)'/g)].map(match=>match[1]);
  const sections=[...dashboardHtml.matchAll(/<section\\b[^>]*id="([^"]+)"/g)].map(match=>match[1]);
  expect(pages.length).toBeGreaterThan(0);
  expect(pages.every(page=>sections.includes(page))).toBe(true);
 });
 it("ships a syntactically valid browser client and unique static element IDs",()=>{
  const script=dashboardHtml.match(/<script>([\\s\\S]*?)<\\/script>/)?.[1];
  expect(script).toBeTruthy();
  expect(()=>new Function(script!)).not.toThrow();
  const markup=dashboardHtml.replace(/<script>[\\s\\S]*?<\\/script>/g,"").replace(/<style>[\\s\\S]*?<\\/style>/g,"");
  const ids=[...markup.matchAll(/\\bid="([^"]+)"/g)].map(match=>match[1]);
  expect(new Set(ids).size).toBe(ids.length);
 });
});
