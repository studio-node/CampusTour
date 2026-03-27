"""E2E: Location Management page and add-location form (cancel, no DB writes)."""

from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


def test_location_management_heading(logged_in_admin, base_url):
    driver = logged_in_admin
    driver.get(f"{base_url}/admin/locations")
    wait = WebDriverWait(driver, 25)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="location-mgmt-heading"]')))


def test_add_location_form_open_and_cancel(logged_in_admin, base_url):
    driver = logged_in_admin
    driver.get(f"{base_url}/admin/locations")
    wait = WebDriverWait(driver, 25)
    wait.until(lambda d: d.find_element(By.CSS_SELECTOR, '[data-testid="location-mgmt-add-btn"]').is_enabled())
    add_btn = wait.until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="location-mgmt-add-btn"]'))
    )
    add_btn.click()
    wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="location-form"]')))
    driver.find_element(By.CSS_SELECTOR, '[data-testid="location-form-cancel"]').click()

    def form_closed(drv) -> bool:
        return len(drv.find_elements(By.CSS_SELECTOR, '[data-testid="location-form"]')) == 0

    wait.until(form_closed)
