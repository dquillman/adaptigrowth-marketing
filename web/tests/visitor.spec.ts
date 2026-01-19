import { test, expect } from '@playwright/test';

test('visitor can load app and access pricing flow', async ({ page }) => {
    // 1. App loads
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    // 2. No trial modal appears by default
    // Based on TrialModal.tsx text "Start your 14-day Pro trial"
    const trialModal = page.getByText('Start your 14-day Pro trial');
    await expect(trialModal).toBeHidden();

    // 3. Pricing page renders (or redirects to login if protected)
    // Attempt to access the pricing link/page
    await page.goto('/app/pricing');
    // Since this is a protected route and we are a visitor, it should redirect to login
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('form')).toBeVisible(); // Login form
});
