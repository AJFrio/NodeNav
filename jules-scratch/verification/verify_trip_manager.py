from playwright.sync_api import sync_playwright
import time
import socket

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def run(playwright):
    port = 5173
    retries = 10
    for i in range(retries):
        if is_port_in_use(port):
            break
        print(f"Waiting for dev server to start... ({i+1}/{retries})")
        time.sleep(2)
    else:
        raise Exception("Dev server did not start in time.")

    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Go to the home page
    page.goto(f"http://localhost:{port}")
    page.wait_for_load_state("load")

    # Click the navigation icon to go to the navigation page
    page.click('button[title="Navigation"]')
    page.wait_for_load_state("load")

    # Click the search icon to show the directions input
    page.click('button:has(svg)', force=True)

    # Type a search query and press Enter
    page.type('input[placeholder="Search..."]', 'Boulder')
    page.press('input[placeholder="Search..."]', 'Enter')

    # Wait for the search results to appear
    page.wait_for_selector('ul > li:first-child')

    # Click on the first destination in the list
    page.click('ul > li:first-child')

    # Take a screenshot for debugging
    page.screenshot(path="jules-scratch/verification/debug_screenshot.png")

    # Wait for the TripManager component to be visible
    page.wait_for_selector('[data-testid="trip-manager"]')

    # Take a screenshot of the TripManager component
    page.screenshot(path="jules-scratch/verification/trip-manager.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)