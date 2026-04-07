import { test, expect, Page } from "@playwright/test";

/**
 * These tests validate that only ONE stop API call fires when a countdown
 * timer completes, and that the correct UX path is taken:
 *   - Foreground (TimerView mounted): success screen, no toast
 *   - Background (TimerView not mounted): toast, no success screen
 *
 * All API calls are mocked so no real DB is needed.
 */

const HABIT_ID = 1;
const HABIT_NAME = "Guitar";
const TARGET_SECONDS = 2;

function makeHabitsResponse(activeTimer: boolean, startSecondsAgo?: number) {
  const startTime = activeTimer
    ? new Date(Date.now() - (startSecondsAgo ?? 0) * 1000).toISOString()
    : null;

  return {
    habits: [
      {
        id: HABIT_ID,
        name: HABIT_NAME,
        todaySeconds: 0,
        totalSeconds: 0,
        streak: 3,
        activeTimer: activeTimer
          ? { startTime, targetDurationSeconds: TARGET_SECONDS }
          : null,
      },
    ],
    autoStopped: null,
  };
}

const STOP_RESPONSE = { durationSeconds: TARGET_SECONDS };

/**
 * Set up API mocks. Returns a counter for stop calls.
 */
async function mockApis(
  page: Page,
  opts: { timerAlreadyExpired?: boolean } = {},
) {
  const stopCalls: { timestamp: number }[] = [];
  let timerStopped = false;

  // Mock /api/habits — returns active timer initially, no timer after stop
  await page.route("**/api/habits", async (route) => {
    if (route.request().method() === "GET") {
      if (timerStopped) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(makeHabitsResponse(false)),
        });
      } else {
        const startAgo = opts.timerAlreadyExpired
          ? TARGET_SECONDS + 5
          : 0;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(makeHabitsResponse(true, startAgo)),
        });
      }
    } else {
      await route.continue();
    }
  });

  // Mock /api/timer/stop — track calls, 404 on double-stop
  await page.route("**/api/timer/stop", async (route) => {
    stopCalls.push({ timestamp: Date.now() });
    if (timerStopped) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "No active timer" }),
      });
    } else {
      timerStopped = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STOP_RESPONSE),
      });
    }
  });

  // Mock other API calls that might fire during invalidation
  await page.route("**/api/sessions*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sessions: [] }),
    });
  });

  await page.route("**/api/rankings*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rankings: [] }),
    });
  });

  await page.route("**/api/feature-flags*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  return { stopCalls };
}

test.describe("Timer stop race condition", () => {
  test("foreground: success screen when countdown finishes on /habits, exactly one stop call", async ({
    page,
  }) => {
    const { stopCalls } = await mockApis(page);

    // Navigate to habits — timer starts with 2s remaining
    await page.goto("/habits");

    // Should see the active timer view
    await expect(page.getByText("Counting down...")).toBeVisible({
      timeout: 5000,
    });

    // Wait for countdown to complete — should show success screen
    await expect(page.getByText("Session Complete!")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole("button", { name: /back to habits/i }),
    ).toBeVisible();

    // No toast should appear (foreground path uses success screen)
    await expect(page.locator("[data-sonner-toast]")).not.toBeVisible();

    // Exactly one stop call should have been made
    expect(stopCalls.length).toBe(1);
  });

  test("background: toast when countdown finishes on non-habits page, exactly one stop call", async ({
    page,
  }) => {
    // Start with an already-expired timer
    const { stopCalls } = await mockApis(page, { timerAlreadyExpired: true });

    // Navigate to a non-habits page — CountdownAutoStop should handle it
    await page.goto("/sessions");

    // Should see a toast notification (background path)
    await expect(
      page.locator("[data-sonner-toast]").first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("[data-sonner-toast]").first(),
    ).toContainText("session was recorded");

    // No success screen (that's only for foreground)
    await expect(page.getByText("Session Complete!")).not.toBeVisible();

    // Exactly one stop call
    expect(stopCalls.length).toBe(1);
  });

  test("no double stop: navigating away mid-countdown does not cause two stop calls", async ({
    page,
  }) => {
    const { stopCalls } = await mockApis(page);

    // Start on habits — timer is counting down
    await page.goto("/habits");
    await expect(page.getByText("Counting down...")).toBeVisible({
      timeout: 5000,
    });

    // Navigate away before countdown finishes — user clicks Back then goes elsewhere
    await page.getByText("Back").click();

    // Now on habits list, but timer still active in zustand
    // CountdownAutoStop should now take over since TimerView unmounted

    // Wait for the countdown to expire
    await expect(
      page.locator("[data-sonner-toast]").first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("[data-sonner-toast]").first(),
    ).toContainText("session was recorded");

    // Should be exactly one stop call
    expect(stopCalls.length).toBe(1);
  });

  test("stopwatch mode is not affected by auto-stop", async ({ page }) => {
    const stopCalls: { timestamp: number }[] = [];

    // Mock with a stopwatch (no targetDurationSeconds)
    await page.route("**/api/habits", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            habits: [
              {
                id: HABIT_ID,
                name: HABIT_NAME,
                todaySeconds: 0,
                totalSeconds: 0,
                streak: 3,
                activeTimer: {
                  startTime: new Date(
                    Date.now() - 5000,
                  ).toISOString(),
                  targetDurationSeconds: null,
                },
              },
            ],
            autoStopped: null,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route("**/api/timer/stop", async (route) => {
      stopCalls.push({ timestamp: Date.now() });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ durationSeconds: 5 }),
      });
    });

    await page.route("**/api/feature-flags*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto("/habits");
    await expect(page.getByText("Recording...")).toBeVisible({
      timeout: 5000,
    });

    // Wait 3 seconds — stopwatch should keep running, no auto-stop
    await page.waitForTimeout(3000);
    await expect(page.getByText("Recording...")).toBeVisible();
    await expect(page.getByText("Session Complete!")).not.toBeVisible();

    // No stop calls should have been made
    expect(stopCalls.length).toBe(0);
  });
});
