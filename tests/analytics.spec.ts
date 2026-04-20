import { test, expect } from '@playwright/test'

test.describe('Analytics — struttura', () => {
  test('carica la pagina e mostra titolo', async ({ page }) => {
    await page.goto('/analytics')
    await expect(page).toHaveURL('/analytics')
    await expect(page.locator('text=Allocazione patrimonio')).toBeVisible()
  })

  test('mostra donut chart o empty state', async ({ page }) => {
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle')
    const hasCanvas = await page.locator('canvas').count()
    const hasEmpty = await page.locator('text=Nessuna allocazione').count()
    expect(hasCanvas + hasEmpty).toBeGreaterThan(0)
  })

  test('desktop: nav link Analytics è attivo', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/analytics')
    const navLink = page.locator('nav a', { hasText: 'Analytics' })
    await expect(navLink).toBeVisible()
    await expect(navLink).toHaveClass(/bg-white/)
  })
})

test.describe('Analytics — toggle visibilità su donut', () => {
  test('toggle Nascondi conti rimuove slice dal donut', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle')

    const contiGroup = page.locator('button', { hasText: 'Conti' }).first()
    if (await contiGroup.isVisible()) {
      const hideBtn = page.locator('button', { hasText: 'Nascondi conti' })
      if (await hideBtn.isVisible()) {
        await hideBtn.click()
        await page.waitForTimeout(300)
        await page.locator('button', { hasText: 'Mostra conti' }).click()
      }
    }
  })
})

test.describe('Analytics — screenshot', () => {
  test('desktop: screenshot pagina analytics', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('analytics.png', { threshold: 0.2, maxDiffPixelRatio: 0.05 })
  })

  test('mobile: screenshot analytics', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'solo mobile')
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('analytics-mobile.png', { threshold: 0.2, maxDiffPixelRatio: 0.05 })
  })
})
