const { chromium, devices } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const path = require('path');
const fs = require('fs').promises;

// Add stealth plugin to playwright
chromium.use(stealth);

// Define all devices to test
const devicesToTest = [
  'iPhone SE',
  'iPhone 13 Pro',
  'iPhone 14 Pro Max',
  'Pixel 5',
  'Galaxy S9+',
  'Galaxy S21 Ultra'
];

// Test scenarios
const testScenarios = [
  {
    name: 'already-used-email',
    description: 'Already used email',
    email: 'test@example.com',
    expectError: true
  },
  {
    name: 'bad-format-email',
    description: 'Bad format email',
    email: 'notanemail',
    expectError: true
  },
  {
    name: 'invalid-eth',
    description: 'Invalid ETH address',
    email: '0xfmifeo',
    expectError: true
  },
  {
    name: 'invalid-ens',
    description: 'Invalid ENS domain',
    email: 'cuchipando..eth',
    expectError: true
  },
  {
    name: 'valid-unique-email',
    description: 'Valid unique email',
    email: null, // Will be generated with timestamp
    expectError: false
  }
];

// Generate formatted date for filenames (DD-MM-YYYY)
function getFormattedDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
}

// Convert device name to filename-friendly format
function deviceToFilename(deviceName) {
  return deviceName.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/\+/g, '-plus');
}

// Test results storage
const testResults = {};

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const formattedDate = getFormattedDate();
  console.log(`\n🚀 Starting multi-device test suite - ${formattedDate}\n`);
  console.log(`Testing ${devicesToTest.length} devices with ${testScenarios.length} scenarios each\n`);

  // Create directories for outputs
  await fs.mkdir('./videos', { recursive: true });
  await fs.mkdir('./screenshots', { recursive: true });

  // Loop through each device
  for (const deviceName of devicesToTest) {
    const deviceFilename = deviceToFilename(deviceName);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📱 Testing on: ${deviceName}`);
    console.log(`${'='.repeat(60)}\n`);

    testResults[deviceName] = {};

    try {
      // Get device configuration
      const deviceConfig = devices[deviceName];
      
      // Create context with device emulation and video recording
      const context = await browser.newContext({
        ...deviceConfig,
        recordVideo: {
          dir: './videos',
          size: deviceConfig.viewport
        },
        // Additional stealth settings
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: ['geolocation', 'notifications'],
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });

      // Add stealth measures
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
      });

      const page = await context.newPage();

      // Run all test scenarios
      for (let i = 0; i < testScenarios.length; i++) {
        const scenario = testScenarios[i];
        const testNumber = i + 1;
        
        console.log(`\n📝 Test ${testNumber}/${testScenarios.length}: ${scenario.description}`);
        
        // Generate unique email for the last test
        let emailToUse = scenario.email;
        if (scenario.email === null) {
          const timestamp = Date.now();
          emailToUse = `test${timestamp}@example.com`;
        }
        
        console.log(`   Email: ${emailToUse}`);

        const originalUrl = 'https://mint.poap.studio/version-72bms/index-20/customdemoflow05';

        try {
          // Navigate to the page
          await page.goto(originalUrl, {
            waitUntil: 'networkidle',
            timeout: 60000
          });

          await page.waitForTimeout(2000);

          // Click "I want this" button
          await page.click('text="I want this"');
          await page.waitForTimeout(1500);

          // Fill form fields
          await page.fill('input[name="name"], input[placeholder*="Name"], input[placeholder*="name"]', 'Juan Carlos');
          await page.fill('input[name="lastname"], input[name="lastName"], input[placeholder*="Last"], input[placeholder*="last"]', 'Rodríguez');
          await page.fill('input[name="address"], input[placeholder*="Address"], input[placeholder*="address"]', '123 Main Street, Apt 4B');

          // Select from dropdown
          try {
            await page.click('text="Select from the list"');
            await page.waitForTimeout(800);
            await page.click('text="Option 1"');
            await page.waitForTimeout(500);
          } catch (error) {
            try {
              const dropdown = await page.locator('select').first();
              await dropdown.selectOption({ label: 'Option 1' });
            } catch (e) {
              console.log('   ⚠️ Warning: Could not select from dropdown');
            }
          }

          // Fill email field
          await page.fill('input[name="email"], input[type="email"], input[placeholder*="Email"], input[placeholder*="email"], input[placeholder*="ETH"], input[placeholder*="ENS"]', emailToUse);
          await page.waitForTimeout(500);

          // Click Test button
          const testButton = page.locator('text="Test"');
          await testButton.waitFor({ state: 'visible', timeout: 15000 });
          await page.waitForTimeout(500);
          await testButton.click();

          // Wait to see if URL changes (redirect) or stays (error)
          let redirected = false;
          try {
            await page.waitForURL(url => url !== originalUrl, { 
              timeout: 10000 
            });
            redirected = true;
          } catch (error) {
            redirected = false;
          }

          const currentUrl = page.url();

          // Determine test result
          let testResult;
          if (scenario.expectError) {
            // We expected an error
            if (!redirected && currentUrl === originalUrl) {
              testResult = 'PASS - Error detected (no redirect)';
              console.log(`   ✅ ${testResult}`);
              
              // Take screenshot of the error
              const screenshotPath = `./screenshots/${deviceFilename}-${scenario.name}.png`;
              await page.screenshot({ path: screenshotPath, fullPage: true });
              console.log(`   📸 Screenshot saved: ${screenshotPath}`);
              
              testResults[deviceName][scenario.name] = {
                status: 'pass',
                message: 'Error detected as expected (form did not redirect)',
                screenshot: screenshotPath
              };
            } else {
              testResult = 'FAIL - Expected error but form submitted';
              console.log(`   ❌ ${testResult}`);
              testResults[deviceName][scenario.name] = {
                status: 'fail',
                message: 'Form redirected when it should have shown an error'
              };
            }
          } else {
            // We expected success
            if (redirected) {
              testResult = 'PASS - Form submitted successfully';
              console.log(`   ✅ ${testResult}`);
              console.log(`   🔗 Redirected to: ${currentUrl}`);
              
              // Wait for page to load
              await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
              
              // Record for 9 seconds after redirect
              console.log('   🎥 Recording for 9 seconds after redirect...');
              for (let j = 1; j <= 3; j++) {
                await page.waitForTimeout(3000);
              }
              
              testResults[deviceName][scenario.name] = {
                status: 'pass',
                message: 'Form submitted successfully and redirected',
                redirectUrl: currentUrl
              };
            } else {
              testResult = 'FAIL - Expected success but got error';
              console.log(`   ❌ ${testResult}`);
              
              // Take screenshot of unexpected error
              const screenshotPath = `./screenshots/${deviceFilename}-${scenario.name}-unexpected-error.png`;
              await page.screenshot({ path: screenshotPath, fullPage: true });
              
              testResults[deviceName][scenario.name] = {
                status: 'fail',
                message: 'Form did not redirect when it should have succeeded',
                screenshot: screenshotPath
              };
            }
          }

        } catch (error) {
          console.log(`   ❌ ERROR: ${error.message}`);
          testResults[deviceName][scenario.name] = {
            status: 'error',
            message: error.message
          };
        }

        // Wait before next test
        await page.waitForTimeout(2000);
      }

      // Close page and context to save video
      await page.close();
      await context.close();

      // Rename video file to include device name and date
      const videoDir = './videos';
      const files = await fs.readdir(videoDir);
      const latestVideo = files
        .filter(f => f.endsWith('.webm'))
        .sort()
        .pop();

      if (latestVideo) {
        const newVideoName = `${deviceFilename}-${formattedDate}.webm`;
        await fs.rename(
          path.join(videoDir, latestVideo),
          path.join(videoDir, newVideoName)
        );
        console.log(`\n✅ Video saved: ./videos/${newVideoName}`);
      }

    } catch (error) {
      console.error(`\n❌ Error testing ${deviceName}:`, error.message);
      testResults[deviceName].error = error.message;
    }
  }

  await browser.close();

  // Save test results as JSON for n8n
  const resultsPath = './test-results.json';
  await fs.writeFile(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📊 Test results saved: ${resultsPath}`);

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📈 TEST SUMMARY');
  console.log(`${'='.repeat(60)}\n`);

  for (const [device, results] of Object.entries(testResults)) {
    console.log(`📱 ${device}:`);
    for (const [test, result] of Object.entries(results)) {
      if (test !== 'error') {
        const statusIcon = result.status === 'pass' ? '✅' : '❌';
        console.log(`   ${statusIcon} ${test}: ${result.status.toUpperCase()}`);
      }
    }
    console.log('');
  }

  console.log('🎉 All tests completed!\n');
})();
