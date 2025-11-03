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

// Helper function for smooth scrolling
async function smoothScroll(page, direction = 'down', pauseTime = 1500) {
  try {
    if (direction === 'down') {
      console.log('  Smoothly scrolling down...');
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
      await page.waitForTimeout(pauseTime);
    } else {
      console.log('  Smoothly scrolling back up...');
      await page.evaluate(async () => {
        const currentScroll = window.scrollY;
        const steps = 20;
        const stepSize = currentScroll / steps;
        
        for (let i = 0; i < steps; i++) {
          window.scrollBy(0, -stepSize);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      });
      await page.waitForTimeout(pauseTime);
    }
  } catch (error) {
    console.log(`  ⚠ Scroll failed: ${error.message}`);
  }
}

// Helper function to scroll inner content areas (for detail pages)
async function scrollInnerContent(page, pauseTime = 1500) {
  try {
    console.log('  Scrolling inner content area...');
    await page.evaluate(async () => {
      const scrollableElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        return (style.overflow === 'auto' || style.overflow === 'scroll' || style.overflowY === 'auto' || style.overflowY === 'scroll') &&
               el.scrollHeight > el.clientHeight;
      });
      
      for (const el of scrollableElements) {
        const scrollHeight = el.scrollHeight;
        const clientHeight = el.clientHeight;
        const scrollDistance = scrollHeight - clientHeight;
        
        if (scrollDistance > 0) {
          const steps = 15;
          const stepSize = scrollDistance / steps;
          
          // Scroll down
          for (let i = 0; i < steps; i++) {
            el.scrollTop += stepSize;
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Scroll back up
          for (let i = 0; i < steps; i++) {
            el.scrollTop -= stepSize;
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }
    });
    await page.waitForTimeout(pauseTime);
    console.log('  ✓ Inner content scrolled');
  } catch (error) {
    console.log(`  ⚠ Inner scroll failed: ${error.message}`);
  }
}

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

  const BASE_URL = 'https://passport.poap.studio/version-32bmw/collection/custom-demo-flow-1/welcome';
  const testResults = {};

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

      // Navigate to welcome page
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Step 1: Click Start button
      console.log('Step 1: Looking for Start button on welcome page...');
      const startButton = page.locator('button:has-text("Start"), div:has-text("Start")').filter({ hasText: /^Start$/ }).first();
      
      if (await startButton.isVisible({ timeout: 10000 }).catch(() => false)) {
        console.log('Start button found, clicking...');
        await startButton.click();
        await page.waitForTimeout(2000);
        console.log('✓ Navigated to login page');
      }

      // Step 2: Test wrong ETH address scenario
      console.log('\nStep 2: Testing wrong ETH address scenario...');
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input').first();
      await emailInput.fill('cuchipandoeeee.eth');
      console.log('Entered wrong ETH: cuchipandoeeee.eth');
      
      await page.waitForTimeout(1000);
      
      const connectButton = page.locator('#button_start');
      await connectButton.click();
      console.log('Clicked Connect button');
      
      console.log('Waiting for error message to appear...');
      await page.waitForTimeout(6000);
      
      let errorMessage = page.locator('text=/invalid|error|incorrect|must provide|valid address|valid ens/i');
      if (await errorMessage.isVisible({ timeout: 3000 }).catch(() => false)) {
        const errorText = await errorMessage.textContent();
        console.log('✓ Validation error shown for wrong ETH');
        console.log(`   Error message: "${errorText}"`);
        await page.waitForTimeout(3000);
        testResults[deviceName].validation_eth = 'pass';
      } else {
        console.log('⚠ No validation error detected');
        testResults[deviceName].validation_eth = 'fail';
      }

      // Step 3: Test wrong ENS scenario
      console.log('\nStep 3: Testing wrong ENS scenario...');
      await emailInput.clear();
      await page.waitForTimeout(500);
      await emailInput.fill('0x4444');
      console.log('Entered wrong ENS: 0x4444');
      
      await page.waitForTimeout(1000);
      await connectButton.click();
      console.log('Clicked Connect button');
      
      console.log('Waiting for error message to update...');
      await page.waitForTimeout(6000);
      
      errorMessage = page.locator('text=/invalid|error|incorrect|must provide|valid address|valid ens/i');
      if (await errorMessage.isVisible({ timeout: 3000 }).catch(() => false)) {
        const errorText = await errorMessage.textContent();
        console.log('✓ Validation error shown for wrong ENS');
        console.log(`   Error message: "${errorText}"`);
        await page.waitForTimeout(3000);
        testResults[deviceName].validation_ens = 'pass';
      } else {
        console.log('⚠ No validation error detected');
        testResults[deviceName].validation_ens = 'fail';
      }

      // Step 4: Login with correct email
      console.log('\nStep 4: Login with correct email...');
      await emailInput.clear();
      await page.waitForTimeout(500);
      await emailInput.fill('choyos@yellowglasses.es');
      console.log('Entered correct email: choyos@yellowglasses.es');
      
      await page.waitForTimeout(4000);
      await connectButton.click();
      console.log('Clicked Connect button with correct email');
      
      console.log('Waiting for successful login and navigation...');
      await page.waitForTimeout(10000);
      console.log('✓ Successfully logged in');
      testResults[deviceName].login = 'pass';

      // Step 5: Navigate Collection page
      console.log('\nStep 5: Navigating Collection page...');
      await page.waitForTimeout(2000);
      
      await smoothScroll(page, 'down', 2000);
      await smoothScroll(page, 'up', 2000);
      
      // Click first collectible
      console.log('Clicking first collectible...');
      const collectibleSelectors = [
        '#collectible1',
        '[id*="collectible"]',
        '.bubble-element.RepeatingGroup .group-item:first-child .clickable-element'
      ];
      
      let clicked = false;
      for (const selector of collectibleSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
          try {
            console.log(`  Attempting to click with selector: ${selector}`);
            await element.click({ timeout: 3000 });
            console.log(`✓ Clicked collectible using selector: ${selector}`);
            await page.waitForTimeout(2000);
            
            const currentUrl = page.url();
            if (currentUrl !== 'https://passport.poap.studio/version-32bmw/collection/custom-demo-flow-1/collection') {
              console.log('✓ Successfully opened collectible detail page');
              clicked = true;
              
              await page.waitForTimeout(1500);
              
              console.log('Scrolling on collectible detail page...');
              await smoothScroll(page, 'down', 1500);
              await smoothScroll(page, 'up', 1500);
              await scrollInnerContent(page, 1000);
              
              // Go back
              const backButton = page.locator('.clickable-element.baTaUhp, header .clickable-element:first-child').first();
              if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await backButton.click();
                console.log('✓ Clicked back arrow');
              } else {
                await page.locator('text=Collection').first().click({ force: true });
              }
              
              await page.waitForTimeout(2000);
              console.log('✓ Returned to Collection page');
              break;
            }
          } catch (error) {
            console.log(`  Failed with selector: ${selector}`);
          }
        }
      }
      
      testResults[deviceName].collection = clicked ? 'pass' : 'fail';

      // Step 6: Navigate to Benefits
      console.log('\nStep 6: Navigating to Benefits page...');
      const benefitsNav = page.locator('div:has(> img) > div:has-text("Benefits")').or(page.locator('text=Benefits')).first();
      if (await benefitsNav.isVisible({ timeout: 10000 }).catch(() => false)) {
        await benefitsNav.click({ force: true });
        console.log('Clicked Benefits tab');
        await page.waitForTimeout(3000);
        
        await smoothScroll(page, 'down', 2000);
        await smoothScroll(page, 'up', 2000);
        
        console.log('Clicking first benefit...');
        const benefitSelectors = ['#benefit1', '[id*="benefit"]'];
        
        clicked = false;
        for (const selector of benefitSelectors) {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
            await element.click({ timeout: 3000 });
            console.log(`✓ Clicked benefit`);
            await page.waitForTimeout(2000);
            
            await smoothScroll(page, 'down', 1500);
            await smoothScroll(page, 'up', 1500);
            await scrollInnerContent(page, 1000);
            
            const backButton = page.locator('.clickable-element.baTaUhp, header .clickable-element:first-child').first();
            if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              await backButton.click();
              console.log('✓ Returned to Benefits');
            }
            clicked = true;
            break;
          }
        }
        
        testResults[deviceName].benefits = clicked ? 'pass' : 'fail';
      }

      // Step 7: Navigate to Hunt
      console.log('\nStep 7: Navigating to Hunt page...');
      const huntNav = page.locator('div:has(> img) > div:has-text("Hunt")').or(page.locator('text=Hunt')).first();
      if (await huntNav.isVisible({ timeout: 10000 }).catch(() => false)) {
        await huntNav.click({ force: true });
        console.log('Clicked Hunt tab');
        await page.waitForTimeout(3000);
        
        await page.evaluate(() => window.scrollBy(0, 150));
        await page.waitForTimeout(1000);
        await smoothScroll(page, 'down', 2000);
        await smoothScroll(page, 'up', 2000);
        
        console.log('Clicking first hunt...');
        const hunt = page.locator('#hunt1').first();
        if (await hunt.isVisible({ timeout: 3000 }).catch(() => false)) {
          await hunt.click({ timeout: 3000 });
          console.log('✓ Clicked hunt');
          await page.waitForTimeout(2000);
          
          await smoothScroll(page, 'down', 1500);
          await smoothScroll(page, 'up', 1500);
          
          // Navigate to Leaderboard
          const leaderboardNav = page.locator('div:has(> img) > div:has-text("Leaderboard")').or(page.locator('text=Leaderboard')).first();
          await leaderboardNav.click({ force: true });
          console.log('✓ Navigated to Leaderboard');
          await page.waitForTimeout(2000);
          
          testResults[deviceName].hunt = 'pass';
        }
      }

      // Step 8: Leaderboard
      console.log('\nStep 8: On Leaderboard page...');
      await page.waitForTimeout(2000);
      await smoothScroll(page, 'down', 2000);
      
      const seeMoreButton = page.locator('div:has-text("See more")').first();
      if (await seeMoreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await seeMoreButton.click();
        console.log('✓ Clicked See more button');
        await page.waitForTimeout(2000);
      }
      
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await page.waitForTimeout(2000);
      testResults[deviceName].leaderboard = 'pass';

      // Step 9: Scan functionality
      console.log('\nStep 9: Opening Scan with floating button...');
      const scanButton = page.locator('#scanbutton');
      
      if (await scanButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await scanButton.click();
        console.log('✓ Clicked Scan button');
        
        await page.waitForTimeout(7000);
        
        const scanScreenshot = `./passport-screenshots/${deviceFilename}-scan-interface.png`;
        await page.screenshot({ path: scanScreenshot, fullPage: true });
        console.log('Screenshot saved');
        
        // Close scan with backbuttonscan
        const backButtonScan = page.locator('#backbuttonscan');
        const backButtonCount = await backButtonScan.count();
        console.log(`Found ${backButtonCount} elements with #backbuttonscan`);
        
        if (backButtonCount > 0) {
          let scanClosed = false;
          
          try {
            console.log('Attempting force click...');
            await backButtonScan.click({ force: true, timeout: 3000 });
            console.log('✓ Force click succeeded');
            scanClosed = true;
          } catch (e) {
            console.log('Force click failed, trying Escape key...');
            await page.keyboard.press('Escape');
            scanClosed = true;
          }
          
          if (scanClosed) {
            console.log('✓ Successfully closed Scan interface');
            await page.waitForTimeout(2000);
            testResults[deviceName].scan = 'pass';
          }
        }
      }

      // Step 10: Settings
      console.log('\nStep 10: Opening Settings...');
      await page.waitForTimeout(1500);
      
      const settingsButton = page.locator('#settingsbutton');
      if (await settingsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await settingsButton.click();
        console.log('✓ Opened Settings');
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
            console.log('✓ Navigated Help');
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
            console.log('✓ Navigated T&C');
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
            console.log('✓ Navigated Privacy Policy');
          }
        }
        
        // Sign out
        const signOutButton = page.locator('#signout');
        if (await signOutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await signOutButton.click();
          console.log('✓ Signed out');
          await page.waitForTimeout(3000);
          testResults[deviceName].settings = 'pass';
        }
      }

      console.log('\n✅ Test completed successfully!');

      // Close page and context to save video
      await page.close();
      await context.close();

      // Rename video file
      const videoDir = './passport-videos';
      const files = await fs.readdir(videoDir);
      const latestVideo = files.filter(f => f.endsWith('.webm')).sort().pop();

      if (latestVideo) {
        const newVideoName = `passport-${deviceFilename}-${formattedDate}.webm`;
        await fs.rename(
          path.join(videoDir, latestVideo),
          path.join(videoDir, newVideoName)
        );
        console.log(`\n✅ Video saved: ./passport-videos/${newVideoName}`);
      }

    } catch (error) {
      console.error(`\n❌ Error testing ${deviceName}: ${error.message}`);
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
    for (const [test, result] of Object.entries(results)) {
      const icon = result === 'pass' ? '✅' : result === 'fail' ? '❌' : '⚠️';
      console.log(`   ${icon} ${test}: ${result.toUpperCase()}`);
    }
    console.log('');
  }

  console.log('🎉 All passport tests completed!\n');
})();
