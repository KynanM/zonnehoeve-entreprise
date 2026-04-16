import { test, expect } from '@playwright/test';

test('Digital Guide Chat Flow', async ({ page }) => {
  // Mock API respons voor de init calls
  await page.route('**/api/chat/threads', async route => {
    await route.fulfill({ json: [] });
  });
  
  await page.route('**/api/documents', async route => {
    await route.fulfill({ json: [] });
  });

  await page.route('**/api/documents/updates/recent*', async route => {
    await route.fulfill({ json: [] });
  });

  // Mock de stream response
  await page.route('**/api/chat/', async route => {
    const streamContent = "__log_id__:1\n__sources__:test.pdf#page=1\nHallo, testbericht!";
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: streamContent,
    });
  });

  await page.goto('/gids');
  
  // Wacht op inladen
  const input = page.getByPlaceholder('Stel een vraag over Zonnehoeve...');
  await expect(input).toBeVisible();
  
  // Stuur bericht
  await input.fill('Hallo test');
  await input.press('Enter');

  // Verwacht dat de test antwoord zichtbaar is in the DOM ergens
  await expect(page.getByText('Hallo, testbericht!')).toBeVisible({ timeout: 5000 });
});
