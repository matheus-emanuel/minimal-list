import { test, expect } from '@playwright/test'

test.describe('Admin access control (AT-003, AT-004)', () => {
  test('a regular user is redirected away from /admin', async ({ page }) => {
    const email = process.env.E2E_TEST_USER_EMAIL
    const password = process.env.E2E_TEST_USER_PASSWORD
    test.skip(!email || !password, 'E2E_TEST_USER_EMAIL/PASSWORD not configured')

    await page.goto('/login')
    await page.getByPlaceholder('Email').fill(email!)
    await page.getByPlaceholder('Senha').fill(password!)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL('/')

    await page.goto('/admin')
    await expect(page).toHaveURL('/')
  })

  test('a sysadmin can create a course that immediately appears publicly', async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL
    const password = process.env.E2E_ADMIN_PASSWORD
    test.skip(!email || !password, 'E2E_ADMIN_EMAIL/PASSWORD not configured')

    await page.goto('/login')
    await page.getByPlaceholder('Email').fill(email!)
    await page.getByPlaceholder('Senha').fill(password!)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL('/')

    await page.goto('/admin')
    const title = `E2E Course ${Date.now()}`
    await page.getByPlaceholder('Título').fill(title)
    await page.getByPlaceholder('URL').fill('https://example.com/course')
    await page.getByPlaceholder('Categoria').fill('E2E')
    await page.getByRole('button', { name: 'Adicionar curso' }).click()
    await expect(page.getByText(title)).toBeVisible()

    await page.goto('/')
    await expect(page.getByText(title)).toBeVisible()
  })
})
