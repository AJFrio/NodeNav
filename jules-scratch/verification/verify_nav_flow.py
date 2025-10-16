from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the app
        page.goto("http://localhost:5173/navigation", wait_until="networkidle")

        # Click the search icon to expand the input
        # This is a bit brittle, but there's no other good selector
        search_button = page.locator('div > button[type="button"]')
        search_button.wait_for(timeout=60000)
        time.sleep(1) # Small delay to ensure button is clickable
        search_button.click()

        # Enter a destination
        search_input = page.locator('input[placeholder="Search..."]')
        search_input.wait_for(timeout=10000)
        search_input.fill("Boulder")
        search_input.press("Enter")

        # Click the first result
        first_result = page.locator('ul > li:first-child')
        first_result.wait_for(timeout=10000)
        first_result.click()

        # Wait for the Begin Drive button to appear
        begin_drive_button = page.locator('button:has-text("Begin Drive")')
        begin_drive_button.wait_for(timeout=10000)
        page.screenshot(path="jules-scratch/verification/01_begin_drive_prompt.png")

        # Click Begin Drive
        begin_drive_button.click()

        # Wait for the Stop Trip button to appear
        stop_trip_button = page.locator('button:has-text("Stop Trip")')
        stop_trip_button.wait_for(timeout=10000)
        page.screenshot(path="jules-scratch/verification/02_trip_active.png")

        # Click Stop Trip
        stop_trip_button.click()

        # Go to the home page to verify map sync
        page.goto("http://localhost:5173/", wait_until="networkidle")
        page.wait_for_selector('.mapboxgl-canvas', timeout=60000)
        page.screenshot(path="jules-scratch/verification/03_home_page_map.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)