"""E2E: admin sign-in reaches the admin dashboard."""

from __future__ import annotations

from helpers import login_admin


def test_admin_sign_in_reaches_dashboard(driver, base_url):
    login_admin(driver, base_url)
    assert "/admin/signin" not in driver.current_url
    assert "/admin" in driver.current_url
