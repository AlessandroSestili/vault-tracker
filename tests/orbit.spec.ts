import { test, expect } from '@playwright/test'

test.describe('Orbit — struttura pagina (#18)', () => {
  test('carica /insights e mostra il canvas 3D o empty state', async ({ page }) => {
    await page.goto('/insights')
    await expect(page).toHaveURL('/insights')
    await page.waitForLoadState('networkidle')
    const hasCanvas = await page.locator('canvas').count()
    const hasEmpty = await page.locator('text=Nessun dato').count()
    expect(hasCanvas + hasEmpty).toBeGreaterThan(0)
  })

  test('mostra badge Beta', async ({ page }) => {
    await page.goto('/insights')
    await expect(page.locator('text=Beta')).toBeVisible()
  })

  test('desktop: nav link Orbit è visibile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/insights')
    const navLink = page.locator('nav a[href="/insights"]')
    await expect(navLink).toBeVisible()
  })

  test('desktop: screenshot pagina insights', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/insights')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot('insights.png', { threshold: 0.2, maxDiffPixelRatio: 0.05 })
  })

  test('mobile: screenshot insights', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'solo mobile')
    await page.goto('/insights')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    await expect(page).toHaveScreenshot('insights-mobile.png', { threshold: 0.2, maxDiffPixelRatio: 0.05 })
  })
})
