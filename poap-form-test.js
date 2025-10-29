const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false, // Set to true for headless mode
    slowMo: 500 // Slows down operations by 500ms for visibility
  });
  
  const page = await browser.newPage();
  
  try {
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
    
    // Wait a moment before taking screenshot
    await page.waitForTimeout(500);
    
    // SCREENSHOT 1: Before submitting the form
    console.log('Taking screenshot 1: Before submitting...');
    await page.screenshot({ path: '1-before-submit.png', fullPage: true });
    console.log('✓ Screenshot 1 saved: 1-before-submit.png');
    
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
    
    // SCREENSHOT 2: Right after clicking (should show loading or immediate response)
    await page.waitForTimeout(1000); // Wait 1 second for immediate response
    console.log('Taking screenshot 2: Right after submit...');
    await page.screenshot({ path: '2-after-submit.png', fullPage: true });
    console.log('✓ Screenshot 2 saved: 2-after-submit.png');
    
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
    
    // SCREENSHOT 3: Final page after redirect
    const finalUrl = page.url();
    console.log('Taking screenshot 3: Final page...');
    console.log('Final URL:', finalUrl);
    await page.screenshot({ path: '3-final-page.png', fullPage: true });
    console.log('✓ Screenshot 3 saved: 3-final-page.png');
    
    // ADDITIONAL SCREENSHOTS: Take 3 more screenshots every 3 seconds
    console.log('\nTaking additional screenshots to capture page loading...');
    
    for (let i = 1; i <= 3; i++) {
      console.log(`Waiting 3 seconds before screenshot ${3 + i}...`);
      await page.waitForTimeout(3000);
      
      const screenshotPath = `${3 + i}-after-${i * 3}s.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`✓ Screenshot ${3 + i} saved: ${screenshotPath} (${i * 3} seconds after redirect)`);
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
    
    console.log('\n=== SCREENSHOTS SAVED ===');
    console.log('1. 1-before-submit.png - Form filled, before clicking submit');
    console.log('2. 2-after-submit.png - Right after clicking submit');
    console.log('3. 3-final-page.png - Final page after redirect');
    console.log('4. 4-after-3s.png - 3 seconds after redirect');
    console.log('5. 5-after-6s.png - 6 seconds after redirect');
    console.log('6. 6-after-9s.png - 9 seconds after redirect');
    console.log('');
    
    // Wait a moment before closing to see the final result
    await page.waitForTimeout(1000);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:', error.message);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    console.log('Error screenshot saved as error-screenshot.png');
    console.log('\nStack trace:', error.stack);
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
})();
