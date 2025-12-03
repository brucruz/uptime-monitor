import { trace } from "@opentelemetry/api";
import { Browser, chromium, Page } from "playwright";
import { config } from "../config";

export interface BrowserCheckResult {
  url: string;
  check_type: string;
  success: boolean;
  latency_ms: number;
  error_message: string | null;
  checked_at: Date;
  trace_id: string;
}

let browser: Browser | null = null;

async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browser;
}

export async function runBrowserCheck(): Promise<BrowserCheckResult> {
  const checked_at = new Date();
  const span = trace.getActiveSpan();
  const trace_id = span?.spanContext().traceId ?? "";
  const url = config.target.loginUrl;
  const check_type = "login_verification";
  const email = config.target.email;
  const password = config.target.password;

  let page: Page | null = null;
  try {
    const startTime = Date.now();
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.goto(url, { timeout: 10000 });
    await page.fill('input[name="email_address"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('input[type="submit"]');
    await page.waitForSelector("div.dashboard-container", { timeout: 10000 });
    const latency_ms = Date.now() - startTime;
    return {
      url,
      check_type,
      success: true,
      latency_ms,
      error_message: null,
      checked_at,
      trace_id,
    };
  } catch (error) {
    return {
      url,
      check_type: "login_verification",
      success: false,
      latency_ms: 0,
      error_message: error instanceof Error ? error.message : "Unknown error",
      checked_at,
      trace_id,
    };
  } finally {
    if (page) {
      await page.close();
      page = null;
    }
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
