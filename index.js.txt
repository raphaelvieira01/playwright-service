import express from "express";
import { chromium } from "playwright";

const app = express();
app.use(express.json());

app.post("/read", async (req, res) => {
  const { url, user, password } = req.body;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle" });

  // LOGIN BÁSICO (ajustaremos se necessário)
  await page.fill('input[type="email"]', user);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);

  const content = await page.content();

  await browser.close();

  res.json({ content });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Playwright service running");
});
