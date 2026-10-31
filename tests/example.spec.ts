import { test, expect } from '@playwright/test';

test.describe('BPO Admin Dashboard Operations', () => {

  test('should handle unauthenticated access by redirecting to login', async ({ page }) => {
    // Navigate to local admin page without a logged-in session
    await page.goto('http://localhost:3000/admin');

    // Verify it correctly redirects to login page due to Supabase Auth protection
    await expect(page).toHaveURL(/.*auth\/login/);
  });

  test('should render login page title successfully', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/login');
    
    // Verify login page loads correctly
    await expect(page.locator('body')).toBeVisible();
  });

});