from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Home Page
    page.goto("http://localhost:5173")
    page.wait_for_timeout(2000)
    page.screenshot(path="jules-scratch/verification/home_page.png")

    # Media Page
    page.goto("http://localhost:5173/media")
    page.wait_for_timeout(2000)
    page.screenshot(path="jules-scratch/verification/media_page.png")

    # Navigation Page
    page.goto("http://localhost:5173/navigation")
    page.wait_for_timeout(2000)
    page.screenshot(path="jules-scratch/verification/navigation_page.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
