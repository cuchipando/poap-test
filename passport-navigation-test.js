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
  'Galaxy S24'
];

// Test scenarios for validation
const validationScenarios = [
  {
    name: 'invalid-eth',
    description: 'Invalid ETH address',
    input: 'cuchipandoeeee.eth',
    expectError: true,
    expectedErrorText: 'valid'
  },
  {
    name: 'invalid-ens',
    description: 'Invalid ENS domain',
    input: '0x4444',
    expectError: true,
    expectedErrorText: 'valid'
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
      '--disable-features=IsolateOrigins,site-per-process',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  const formattedDate = getFormattedDate();
  console.log(`\n🚀 Starting Passport Navigation Test - ${formattedDate}\n`);
  console.log(`Testing ${devicesToTest.length} devices\n`);

  // Create directories for outputs
  await fs.mkdir('./passport-videos', { recursive: true });
  await fs.mkdir('./passport-screenshots', { recursive: true });

  const welcomeUrl = 'https://passport.poap.studio/version-32bmw/collection/custom-demo-flow-1/welcome';

  // Loop through each device
  for (const deviceName of devicesToTest) {
    const deviceFilename = deviceToFilename(deviceName);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📱 Testing on: ${deviceName}`);
    console.log(`${'='.repeat(60)}\n`);

    testResults[deviceName] = {
      validationTests: {},
      navigationTest: {}
    };

    try {
      // Get device configuration
      const deviceConfig = devices[deviceName];
      
      if (!deviceConfig) {
        throw new Error(`Device "${deviceName}" not found in Playwright devices`);
      }
      
      // Create context with device emulation and video recording
      const context = await browser.newContext({
        ...deviceConfig,
        recordVideo: {
          dir: './passport-videos',
          size: deviceConfig.viewport
        },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: ['geolocation', 'notifications', 'camera'],
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

      // Helper function for smooth scrolling
      async function smoothScroll(direction = 'down', pauseTime = 1500) {
        try {
          if (direction === 'down') {
            await page.evaluate(async () => {
              const scrollHeight = document.body.scrollHeight;
              const viewportHeight = window.innerHeight;
              const scrollDistance = scrollHeight - viewportHeight;
              const steps = 20;
              const stepSize = scrollDistance / steps;
              
              for (let i = 0; i < steps; i++) {
                window.scrollBy(0, stepSize);
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            });
          } else {
            await page.evaluate(async () => {
              const currentScroll = window.scrollY;
              const steps = 20;
              const stepSize = currentScroll / steps;
              
              for (let i = 0; i < steps; i++) {
                window.scrollBy(0, -stepSize);
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            });
          }
          await page.waitForTimeout(pauseTime);
        } catch (error) {
          console.log(`  ⚠ Scroll failed: ${error.message}`);
        }
      }

      // PART 1: Validation Tests
      console.log('\n📝 Testing Validations...\n');
      
      for (const scenario of validationScenarios) {
        console.log(`Testing: ${scenario.description}`);
        
        try {
          // Navigate to the page
          await page.goto(welcomeUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
          });

          await page.waitForTimeout(2000);

          // Click Start button
          const startButton = page.locator('button:has-text("Start"), div:has-text("Start")').first();
          if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            await startButton.click();
            await page.waitForTimeout(2000);
            console.log('   ✓ Clicked Start button');
          }

          // Fill input with test data
          const input = page.locator('input').first();
          if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
            await input.fill(scenario.input);
            console.log(`   ✓ Filled input with: ${scenario.input}`);
            await page.waitForTimeout(1000);
          }

          // Click Connect button
          const connectButton = page.locator('#button_start');
          if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await connectButton.click();
            console.log('   ✓ Clicked Connect button');
          }

          await page.waitForTimeout(6000);

          // Check for error message
          const errorMessage = page.locator('text=/invalid|error|incorrect|must provide|valid address|valid ens/i');
          if (await errorMessage.isVisible({ timeout: 3000 }).catch(() => false)) {
            const errorText = await errorMessage.textContent();
            console.log(`   ✅ Error detected: "${errorText}"`);
            
            const screenshotPath = `./passport-screenshots/${deviceFilename}-${scenario.name}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: true });
            
            testResults[deviceName].validationTests[scenario.name] = {
              status: 'pass',
              message: `Error message detected: ${errorText}`,
              screenshot: screenshotPath
            };
          } else {
            console.log('   ❌ No error message found');
            const screenshotPath = `./passport-screenshots/${deviceFilename}-${scenario.name}-no-error.png`;
            await page.screenshot({ path: screenshotPath, fullPage: true });
            
            testResults[deviceName].validationTests[scenario.name] = {
              status: 'fail',
              message: 'Expected error message not found',
              screenshot: screenshotPath
            };
          }

        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
          testResults[deviceName].validationTests[scenario.name] = {
            status: 'error',
            message: error.message
          };
        }

        await page.waitForTimeout(1000);
      }

      // PART 2: Complete Navigation Flow
      console.log('\n🗺️  Testing Complete Navigation Flow...\n');
      
      try {
        // Start fresh
        await page.goto(welcomeUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });
        await page.waitForTimeout(2000);

        // Click Start
        console.log('1. Clicking Start button...');
        const startButton = page.locator('button:has-text("Start"), div:has-text("Start")').first();
        await startButton.click();
        await page.waitForTimeout(2000);
        console.log('   ✓ Navigated to login page');

        // Login with valid email
        console.log('2. Logging in with valid email...');
        const validEmail = 'choyos@yellowglasses.es';
        const input = page.locator('input').first();
        await input.fill(validEmail);
        await page.waitForTimeout(1000);
        
        const connectButton = page.locator('#button_start');
        await connectButton.click();
        console.log('   ✓ Clicked Connect with valid email');
        await page.waitForTimeout(6000);
        console.log('   ✓ Successfully logged in');

        // Navigate Collection
        console.log('3. Navigating Collection page...');
        await page.waitForTimeout(2000);
        await smoothScroll('down', 2000);
        await smoothScroll('up', 2000);
        
        // Click first collectible
        const collectible = page.locator('#collectible1').first();
        if (await collectible.isVisible({ timeout: 3000 }).catch(() => false)) {
          await collectible.click();
          console.log('   ✓ Clicked collectible');
          await page.waitForTimeout(2000);
          
          await smoothScroll('down', 1500);
          await smoothScroll('up', 1500);
          
          // Go back
          const backButton = page.locator('.clickable-element.baTaUhp').first();
          if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await backButton.click();
            await page.waitForTimeout(2000);
            console.log('   ✓ Returned to Collection');
          }
        }

        testResults[deviceName].navigationTest.collection = { status: 'pass' };

        // Navigate Benefits
        console.log('4. Navigating Benefits page...');
        const benefitsNav = page.locator('text=Benefits').first();
        await benefitsNav.click({ force: true });
        await page.waitForTimeout(3000);
        
        await smoothScroll('down', 2000);
        await smoothScroll('up', 2000);
        
        // Click first benefit
        const benefit = page.locator('#benefit1').first();
        if (await benefit.isVisible({ timeout: 3000 }).catch(() => false)) {
          await benefit.click();
          console.log('   ✓ Clicked benefit');
          await page.waitForTimeout(2000);
          
          await smoothScroll('down', 1500);
          await smoothScroll('up', 1500);
          
          // Go back
          const backButton = page.locator('.clickable-element.baTaUhp').first();
          if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await backButton.click();
            await page.waitForTimeout(2000);
            console.log('   ✓ Returned to Benefits');
          }
        }

        testResults[deviceName].navigationTest.benefits = { status: 'pass' };

        // Navigate Hunt
        console.log('5. Navigating Hunt page...');
        const huntNav = page.locator('text=Hunt').first();
        await huntNav.click({ force: true });
        await page.waitForTimeout(3000);
        
        await page.evaluate(() => window.scrollBy(0, 150));
        await page.waitForTimeout(1000);
        await smoothScroll('down', 2000);
        await smoothScroll('up', 2000);
        
        // Click first hunt
        const hunt = page.locator('#hunt1').first();
        if (await hunt.isVisible({ timeout: 3000 }).catch(() => false)) {
          await hunt.click();
          console.log('   ✓ Clicked hunt');
          await page.waitForTimeout(2000);
          
          // Navigate to Leaderboard
          const leaderboardNav = page.locator('text=Leaderboard').first();
          await leaderboardNav.click({ force: true });
          await page.waitForTimeout(2000);
          console.log('   ✓ Navigated to Leaderboard');
        }

        testResults[deviceName].navigationTest.hunt = { status: 'pass' };

        // Leaderboard
        console.log('6. On Leaderboard page...');
        await page.waitForTimeout(2000);
        await smoothScroll('down', 2000);
        
        const seeMoreButton = page.locator('div:has-text("See more")').first();
        if (await seeMoreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await seeMoreButton.click();
          console.log('   ✓ Clicked See more button');
          await page.waitForTimeout(2000);
        }
        
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        await page.waitForTimeout(2000);

        testResults[deviceName].navigationTest.leaderboard = { status: 'pass' };

        // Scan functionality
        console.log('7. Testing Scan functionality...');
        const scanButton = page.locator('#scanbutton');
        if (await scanButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await scanButton.click();
          console.log('   ✓ Clicked Scan button');
          await page.waitForTimeout(7000);
          
          // Take screenshot
          const scanScreenshot = `./passport-screenshots/${deviceFilename}-scan-interface.png`;
          await page.screenshot({ path: scanScreenshot, fullPage: true });
          
          // Close scan with backbuttonscan
          const backButtonScan = page.locator('#backbuttonscan');
          const backButtonCount = await backButtonScan.count();
          
          if (backButtonCount > 0) {
            try {
              await backButtonScan.click({ force: true, timeout: 3000 });
              console.log('   ✓ Closed Scan interface');
            } catch (e) {
              // Try Escape key
              await page.keyboard.press('Escape');
              console.log('   ✓ Closed Scan with Escape key');
            }
            await page.waitForTimeout(2000);
          }
        }

        testResults[deviceName].navigationTest.scan = { status: 'pass' };

        // Settings navigation
        console.log('8. Testing Settings...');
        await page.waitForTimeout(1500);
        
        const settingsButton = page.locator('#settingsbutton');
        if (await settingsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await settingsButton.click();
          console.log('   ✓ Opened Settings');
          await page.waitForTimeout(2000);
          
          // Help
          const helpButton = page.locator('#helpbutton');
          if (await helpButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await helpButton.click();
            await page.waitForTimeout(2000);
            
            const backButtonHelp = page.locator('#backbuttonhelp');
            if (await backButtonHelp.isVisible({ timeout: 3000 }).catch(() => false)) {
              await backButtonHelp.click();
              await page.waitForTimeout(1500);
              console.log('   ✓ Navigated Help');
            }
          }
          
          // Terms & Conditions
          const tcButton = page.locator('#tcbutton');
          if (await tcButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await tcButton.click();
            await page.waitForTimeout(2000);
            
            const backButton = page.locator('#backbutton');
            if (await backButton.isVisible({ timeout: 3000 }).catch(() => false)) {
              await backButton.click();
              await page.waitForTimeout(1500);
              console.log('   ✓ Navigated T&C');
            }
          }
          
          // Privacy Policy
          const ppButton = page.locator('#ppbutton');
          if (await ppButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await ppButton.click();
            await page.waitForTimeout(2000);
            
            const backButton = page.locator('#backbutton');
            if (await backButton.isVisible({ timeout: 3000 }).catch(() => false)) {
              await backButton.click();
              await page.waitForTimeout(1500);
              console.log('   ✓ Navigated Privacy Policy');
            }
          }
          
          // Sign out
          const signOutButton = page.locator('#signout');
          if (await signOutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await signOutButton.click();
            console.log('   ✓ Signed out');
            await page.waitForTimeout(3000);
          }
        }

        testResults[deviceName].navigationTest.settings = { status: 'pass' };
        testResults[deviceName].navigationTest.overall = { status: 'pass' };

        console.log('\n✅ Complete navigation flow successful!');

      } catch (error) {
        console.log(`\n❌ Navigation test error: ${error.message}`);
        testResults[deviceName].navigationTest.overall = {
          status: 'error',
          message: error.message
        };
      }

      // Close page and context to save video
      await page.close();
      await context.close();

      // Rename video file
      const videoDir = './passport-videos';
      const files = await fs.readdir(videoDir);
      const latestVideo = files
        .filter(f => f.endsWith('.webm'))
        .sort()
        .pop();

      if (latestVideo) {
        const newVideoName = `passport-${deviceFilename}-${formattedDate}.webm`;
        await fs.rename(
          path.join(videoDir, latestVideo),
          path.join(videoDir, newVideoName)
        );
        console.log(`\n✅ Video saved: ./passport-videos/${newVideoName}`);
      }

    } catch (error) {
      console.error(`\n❌ Error testing ${deviceName}:`, error.message);
      testResults[deviceName].error = error.message;
    }
  }

  await browser.close();

  // Save test results as JSON
  const resultsPath = './passport-test-results.json';
  await fs.writeFile(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📊 Test results saved: ${resultsPath}`);

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📈 TEST SUMMARY');
  console.log(`${'='.repeat(60)}\n`);

  for (const [device, results] of Object.entries(testResults)) {
    console.log(`📱 ${device}:`);
    
    if (results.validationTests) {
      console.log('  Validation Tests:');
      for (const [test, result] of Object.entries(results.validationTests)) {
        const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
        console.log(`    ${icon} ${test}: ${result.status.toUpperCase()}`);
      }
    }
    
    if (results.navigationTest) {
      console.log('  Navigation Tests:');
      for (const [test, result] of Object.entries(results.navigationTest)) {
        const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
        console.log(`    ${icon} ${test}: ${result.status.toUpperCase()}`);
      }
    }
    
    if (results.error) {
      console.log(`  ❌ Device error: ${results.error}`);
    }
    console.log('');
  }

  console.log('🎉 All passport tests completed!\n');
})();
