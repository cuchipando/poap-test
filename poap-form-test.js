const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true, // Set to true for headless mode
    slowMo: 500 // Slows down operations by 500ms for visibility
  });
  
  // Enable video recording in the context
  const context = await browser.newContext({
    recordVideo: {
      dir: './videos',
      size: { width: 1280, height: 720 }
    }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('🎥 Video recording started...');
    console.log('Navigating to page...');
    await page.goto('https://mint.poap.studio/version-72bms/index-20/customdemoflow05', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    // Step 1: Click on "I want this" button
    console.log('Clicking "I want this" button...');
    await page.click('text="I want this"');
    
    // Wait for form to appear
    await page.waitForTimeout(1500);
    
    // Step 2: Fill in the form fields
    console.log('Filling form fields...');
    
    // Name field
    await page.fill('input[name="name"], input[placeholder*="Name"], input[placeholder*="name"]', 'Juan Carlos');
    
    // Last name field
    await page.fill('input[name="lastname"], input[name="lastName"], input[placeholder*="Last"], input[placeholder*="last"]', 'Rodríguez');
    
    // Address field
    await page.fill('input[name="address"], input[placeholder*="Address"], input[placeholder*="address"]', '123 Main Street, Apt 4B');
    
    // Select from dropdown list - "Option 1"
    console.log('Selecting from dropdown...');
    try {
      // Click the dropdown to open it
      await page.click('text="Select from the list"');
      await page.waitForTimeout(800);
      
      // Click "Option 1"
      await page.click('text="Option 1"');
      console.log('✓ Selected "Option 1" from dropdown');
      await page.waitForTimeout(500);
    } catch (error) {
      console.log('Trying alternative dropdown method...');
      try {
        const dropdown = await page.locator('select').first();
        await dropdown.selectOption({ label: 'Option 1' });
        console.log('✓ Selected "Option 1" using select element');
      } catch (e) {
        console.log('Warning: Could not select from dropdown:', e.message);
      }
    }
    
    // Email or ETH/ENS Address field
    await page.fill('input[name="email"], input[type="email"], input[placeholder*="Email"], input[placeholder*="email"], input[placeholder*="ETH"], input[placeholder*="ENS"]', 'test@example.com');
    
    // Wait a moment before submitting
    await page.waitForTimeout(500);
    
    console.log('Form filled successfully');
    
    // Step 4: Click "Test" button
    console.log('Waiting for "Test" button to be clickable...');
    
    // The "Test" button is not a <button> element, it's a clickable div/element with text "Test"
    const testButton = page.locator('text="Test"');
    
    // Wait for it to be visible and enabled
    await testButton.waitFor({ state: 'visible', timeout: 15000 });
    
    // Additional wait to ensure form validation completes
    await page.waitForTimeout(500);
    
    console.log('Clicking "Test" button...');
    await testButton.click();
    console.log('✓ Clicked "Test" button');
    
    // Wait for redirect or navigation
    console.log('Waiting for redirect...');
    try {
      // Wait for URL to change (up to 10 seconds)
      await page.waitForURL(url => url !== 'https://mint.poap.studio/version-72bms/index-20/customdemoflow05', { 
        timeout: 10000 
      });
      console.log('✓ Page redirected');
    } catch (error) {
      console.log('No URL change detected, checking for success message on same page...');
    }
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('Network not fully idle, continuing...');
    });
    
    // Additional wait to ensure everything is rendered
    await page.waitForTimeout(2000);
    
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    
    // Wait additional 9 seconds to capture the full page loading (matching previous 3x3s screenshots)
    console.log('\nCapturing page loading in video...');
    for (let i = 1; i <= 3; i++) {
      console.log(`Recording... ${i * 3} seconds after redirect`);
      await page.waitForTimeout(3000);
    }
    
    // Check for success
    console.log('\n=== VERIFICATION ===');
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check if there's a success message or if we're on a different page
    const successIndicators = [
      page.locator('text=/success/i'),
      page.locator('text=/thank/i'),
      page.locator('text=/complete/i'),
      page.locator('text=/congratulations/i'),
      page.locator('[class*="success"]'),
      page.locator('[class*="confirmation"]')
    ];
    
    let foundSuccess = false;
    for (const indicator of successIndicators) {
      if (await indicator.isVisible().catch(() => false)) {
        const text = await indicator.textContent();
        console.log('✅ SUCCESS MESSAGE FOUND:', text);
        foundSuccess = true;
        break;
      }
    }
    
    if (!foundSuccess) {
      // Check if URL changed
      if (currentUrl !== 'https://mint.poap.studio/version-72bms/index-20/customdemoflow05') {
        console.log('✅ SUCCESS: Page redirected to:', currentUrl);
        foundSuccess = true;
      }
    }
    
    // Check for error messages
    const errorSelectors = [
      'text=/error/i',
      'text=/fail/i',
      'text=/invalid/i',
      '[class*="error"]',
      '[role="alert"]'
    ];
    
    let foundError = false;
    for (const selector of errorSelectors) {
      const errorElement = page.locator(selector);
      if (await errorElement.isVisible().catch(() => false)) {
        const errorText = await errorElement.textContent();
        console.log('❌ ERROR FOUND:', errorText);
        foundError = true;
      }
    }
    
    // Final summary
    console.log('\n=== TEST SUMMARY ===');
    if (foundSuccess && !foundError) {
      console.log('✅ TEST PASSED: Form submitted successfully!');
    } else if (foundError) {
      console.log('❌ TEST FAILED: Errors found on page');
    } else {
      console.log('⚠️ TEST UNCLEAR: Could not confirm success or failure');
    }
    
    // Wait a moment before closing
    await page.waitForTimeout(1000);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:', error.message);
    console.log('\nStack trace:', error.stack);
  } finally {
    // Close the page to stop recording
    await page.close();
    
    // Wait for the video to be saved
    console.log('\n🎥 Saving video...');
    await page.video()?.path().then(videoPath => {
      console.log('✅ Video saved to:', videoPath);
    }).catch(() => {
      console.log('⚠️ Video path not available yet, it will be saved shortly');
    });
    
    await context.close();
    await browser.close();
    console.log('\n=== VIDEO RECORDING COMPLETE ===');
    console.log('Video saved in ./videos/ directory');
    console.log('Browser closed');
  }
})();
