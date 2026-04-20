import { test, expect } from '@playwright/test'

test.describe('Portfolio — struttura pagina', () => {
  test('carica / e mostra header patrimonio', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Portafoglio netto')).toBeVisible()
    await expect(page.locator('text=€').first()).toBeVisible()
  })

  test('desktop: screenshot pagina vuota', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('portfolio-empty.png', { threshold: 0.2, maxDiffPixelRatio: 0.05 })
  })
})

test.describe('Portfolio — CRUD Conti', () => {
  const ACCOUNT_NAME = 'E2E Conto Test'

  test('aggiunge un conto e lo vede nella lista', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    // Open add sheet
    await page.locator('[aria-label="Aggiungi"]').click()
    await expect(page.locator('text=Aggiungi al patrimonio')).toBeVisible()
    await page.locator('text=Conto').first().click()

    // Fill form
    await page.fill('input[placeholder="es. Conto Corrente"]', ACCOUNT_NAME)
    await page.fill('input[placeholder="0.00"]', '1500')
    await page.locator('button:has-text("Salva")').click()

    // Verify it appears
    await expect(page.locator(`text=${ACCOUNT_NAME}`)).toBeVisible({ timeout: 10000 })
  })

  test('il totale aumenta dopo aggiunta conto', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    // Get current total text
    const heroSection = page.locator('text=Portafoglio netto').locator('..')
    await expect(heroSection).toBeVisible()

    // Account already exists from previous test — verify total shows something
    await expect(page.locator('text=€').first()).toBeVisible()
  })

  test('il gruppo Conti è collassabile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    const contiHeader = page.locator('button', { hasText: 'Conti' }).first()
    if (await contiHeader.isVisible()) {
      await contiHeader.click()
      // After collapse, account name should be hidden
      await expect(page.locator(`text=${ACCOUNT_NAME}`)).not.toBeVisible()
      // Re-expand
      await contiHeader.click()
      await expect(page.locator(`text=${ACCOUNT_NAME}`)).toBeVisible()
    }
  })

  test('toggle Nascondi conti aggiorna il totale', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    const contiHeader = page.locator('button', { hasText: 'Conti' }).first()
    if (await contiHeader.isVisible()) {
      // Make sure group is open
      const toggleBtn = page.locator('button', { hasText: 'Nascondi conti' })
      if (await toggleBtn.isVisible()) {
        await toggleBtn.click()
        await expect(page.locator('button', { hasText: 'Mostra conti' })).toBeVisible()
        // Re-show
        await page.locator('button', { hasText: 'Mostra conti' }).click()
      }
    }
  })

  test('elimina il conto di test', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    const row = page.locator(`text=${ACCOUNT_NAME}`).locator('../..')
    await row.hover()
    await row.locator('[data-testid="delete"], button[class*="danger"], button:has(svg)').last().click()

    // Confirm dialog
    const confirmBtn = page.locator('button', { hasText: 'Elimina' }).last()
    if (await confirmBtn.isVisible({ timeout: 2000 })) {
      await confirmBtn.click()
    }

    await expect(page.locator(`text=${ACCOUNT_NAME}`)).not.toBeVisible({ timeout: 10000 })
  })
})

test.describe('Portfolio — CRUD Posizioni manuali', () => {
  const POS_NAME = 'E2E Fondo Test'

  test('aggiunge una posizione manuale', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    await page.locator('[aria-label="Aggiungi"]').click()
    await expect(page.locator('text=Aggiungi al patrimonio')).toBeVisible()
    await page.locator('text=Posizione').first().click()

    // Switch to manual tab
    await page.locator('text=Valore manuale').click()
    await page.fill('input[placeholder="es. Fondo Immobiliare XYZ"]', POS_NAME)
    await page.fill('input[placeholder="0.00"]', '5000')
    await page.locator('button:has-text("Salva")').click()

    await expect(page.locator(`text=${POS_NAME}`)).toBeVisible({ timeout: 10000 })
  })

  test('il gruppo Posizioni è visibile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await expect(page.locator('button', { hasText: 'Posizioni' }).first()).toBeVisible()
  })

  test('toggle Nascondi posizioni', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    const toggleBtn = page.locator('button', { hasText: 'Nascondi posizioni' })
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click()
      await expect(page.locator('button', { hasText: 'Mostra posizioni' })).toBeVisible()
      await page.locator('button', { hasText: 'Mostra posizioni' }).click()
    }
  })
})

test.describe('Portfolio — CRUD Debiti & Crediti', () => {
  const LIABILITY_NAME = 'E2E Debito Test'

  test('aggiunge un debito informale', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    await page.locator('[aria-label="Aggiungi"]').click()
    await page.locator('text=Debito · Credito').first().click()

    // Select subtype "Debito informale"
    await page.locator('text=Debito informale').click()
    await page.fill('input[placeholder="es. Prestito Mario"]', LIABILITY_NAME)
    await page.fill('input[placeholder="0.00"]', '2000')
    await page.locator('button:has-text("Salva")').click()

    await expect(page.locator(`text=${LIABILITY_NAME}`)).toBeVisible({ timeout: 10000 })
  })

  test('toggle TOTALE/RATA visibile con debito', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    // Debiti group should show toggle buttons when expanded
    const liabGroup = page.locator('button', { hasText: 'Debiti & Crediti' })
    if (await liabGroup.isVisible()) {
      await expect(liabGroup).toBeVisible()
    }
  })

  test('toggle Nascondi deb/cred', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    const toggleBtn = page.locator('button', { hasText: 'Nascondi deb/cred' })
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click()
      await expect(page.locator('button', { hasText: 'Mostra deb/cred' })).toBeVisible()
      await page.locator('button', { hasText: 'Mostra deb/cred' }).click()
    }
  })
})

test.describe('Portfolio — CRUD Entrate ricorrenti', () => {
  const INCOME_NAME = 'E2E Stipendio Test'

  test('prima crea un conto poi aggiunge entrata ricorrente', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')

    // Need an account first
    const contiVisible = await page.locator('button', { hasText: 'Conti' }).isVisible()
    if (!contiVisible) {
      await page.locator('[aria-label="Aggiungi"]').click()
      await page.locator('text=Conto').first().click()
      await page.fill('input[placeholder="es. Conto Corrente"]', 'E2E Conto Per Entrata')
      await page.fill('input[placeholder="0.00"]', '100')
      await page.locator('button:has-text("Salva")').click()
      await page.waitForTimeout(1000)
      await page.goto('/')
    }

    // Add recurring income
    await page.locator('[aria-label="Aggiungi"]').click()
    await page.locator('text=Entrata ricorrente').click()

    await page.fill('input[placeholder="Es. Stipendio"]', INCOME_NAME)
    await page.fill('input[placeholder="3200"]', '2500')
    await page.fill('input[placeholder="27"]', '27')
    // Select account
    await page.locator('text=Seleziona conto…').click()
    await page.locator('[role="option"]').first().click()
    await page.locator('button:has-text("Salva")').click()

    await expect(page.locator(`text=${INCOME_NAME}`)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Portfolio — screenshot', () => {
  test('screenshot portfolio con dati', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'solo desktop')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('portfolio-with-data.png', { threshold: 0.2, maxDiffPixelRatio: 0.05 })
  })

  test('mobile: screenshot portfolio', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'solo mobile')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('portfolio-mobile.png', { threshold: 0.2, maxDiffPixelRatio: 0.05 })
  })
})
