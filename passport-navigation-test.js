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
    name: 'invalid-email',
    description: 'Invalid email format',
    input: 'not-an-email',
    expectError: true,
    expectedErrorText: 'valid email'
  },
  {
    name: 'invalid-ens',
    description: 'Invalid ENS domain',
    input: 'invalid..eth',
    expectError: true,
    expectedErrorText: 'valid ENS'
  },
  {
    name: 'invalid-eth',
    description: 'Invalid ETH address',
    input: '0xinvalid',
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
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const formattedDate = getFormattedDate();
  console.log(`\n🚀 Starting Passport Navigation Test - ${formattedDate}\n`);
  console.log(`Testing ${devicesToTest.length} devices\n`);

  // Create directories for outputs
  await fs.mkdir('./passport-videos', { recursive: true });
  await fs.mkdir('./passport-screenshots', { recursive: true });

  const passportUrl = 'https://passport.poap.studio/version-32bmw/collection/custom-demo-flow-1/collection';

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

      // PART 1: Validation Tests
      console.log('\n📝 Testing Validations...\n');
      
      for (const scenario of validationScenarios) {
        console.log(`Testing: ${scenario.description}`);
        
        try {
          await page.goto(passportUrl, {
            waitUntil: 'networkidle',
            timeout: 60000
          });

          await page.waitForTimeout(3000);

          // STEP 1: Click the initial "Start" button on welcome page
          console.log('   Looking for initial Start button...');
          const initialStartSelectors = [
            'button:has-text("Start")',
            'button:has-text("Get Started")',
            'button:has-text("Begin")',
            'a:has-text("Start")',
            '[data-action="start"]',
            'button'
          ];

          let startClicked = false;
          for (const selector of initialStartSelectors) {
            try {
              const startButton = await page.locator(selector).first();
              if (await startButton.isVisible({ timeout: 3000 })) {
                await startButton.click();
                console.log(`   ✓ Clicked initial Start button`);
                startClicked = true;
                await page.waitForTimeout(2000);
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (!startClicked) {
            console.log('   ⚠️ Could not find initial Start button, trying to continue...');
          }

          // STEP 2: Now find and fill the input field
          const inputSelectors = [
            'input[type="email"]',
            'input[placeholder*="email" i]',
            'input[placeholder*="ENS" i]',
            'input[placeholder*="ETH" i]',
            'input[placeholder*="address" i]',
            'input[type="text"]',
            'input'
          ];

          let inputFilled = false;
          for (const selector of inputSelectors) {
            try {
              const input = await page.locator(selector).first();
              if (await input.isVisible({ timeout: 3000 })) {
                await input.fill(scenario.input);
                inputFilled = true;
                console.log(`   ✓ Filled input with: ${scenario.input}`);
                await page.waitForTimeout(1000);
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (!inputFilled) {
            console.log('   ⚠️ Could not find input field');
            testResults[deviceName].validationTests[scenario.name] = {
              status: 'error',
              message: 'Input field not found'
            };
            continue;
          }

          // STEP 3: Click Continue/Submit button
          const submitSelectors = [
            'button:has-text("Continue")',
            'button:has-text("Next")',
            'button:has-text("Submit")',
            'button[type="submit"]',
            'button:not(:has-text("Start"))'
          ];

          let submitClicked = false;
          for (const selector of submitSelectors) {
            try {
              const button = await page.locator(selector).first();
              if (await button.isVisible({ timeout: 2000 })) {
                await button.click();
                submitClicked = true;
                console.log(`   ✓ Clicked Continue/Submit button`);
                break;
              }
            } catch (e) {
              continue;
            }
          }

          await page.waitForTimeout(3000);

          // STEP 4: Check for error message
          const errorKeywords = ['valid', 'invalid', 'error', 'format', 'required', 'incorrect'];
          let foundError = false;

          for (const keyword of errorKeywords) {
            try {
              const errorElement = page.getByText(keyword, { exact: false }).first();
              if (await errorElement.isVisible().catch(() => false)) {
                const errorText = await errorElement.textContent();
                foundError = true;
                console.log(`   ✅ Error detected: "${errorText}"`);
                
                // Take screenshot
                const screenshotPath = `./passport-screenshots/${deviceFilename}-${scenario.name}.png`;
                await page.screenshot({ path: screenshotPath, fullPage: true });
                
                testResults[deviceName].validationTests[scenario.name] = {
                  status: 'pass',
                  message: `Error message detected: ${errorText}`,
                  screenshot: screenshotPath
                };
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (!foundError) {
            console.log(`   ❌ No error message found`);
            testResults[deviceName].validationTests[scenario.name] = {
              status: 'fail',
              message: 'Expected error message not found'
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

      // PART 2: Navigation Test with Valid Data
      console.log('\n🗺️  Testing Navigation Flow...\n');
      
      try {
        // Start fresh
        await page.goto(passportUrl, {
          waitUntil: 'networkidle',
          timeout: 60000
        });

        await page.waitForTimeout(3000);

        // STEP 1: Click initial Start button
        console.log('Clicking initial Start button...');
        const initialStartSelectors = [
          'button:has-text("Start")',
          'button:has-text("Get Started")',
          'button:has-text("Begin")',
          'a:has-text("Start")',
          'button'
        ];

        for (const selector of initialStartSelectors) {
          try {
            const startButton = await page.locator(selector).first();
            if (await startButton.isVisible({ timeout: 3000 })) {
              await startButton.click();
              console.log('✓ Clicked initial Start button');
              await page.waitForTimeout(2000);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        // STEP 2: Enter valid email
        const timestamp = Date.now();
        const validEmail = `test${timestamp}@example.com`;
        
        console.log('Looking for input field...');
        const inputSelectors = [
          'input[type="email"]',
          'input[placeholder*="email" i]',
          'input[placeholder*="address" i]',
          'input[type="text"]',
          'input'
        ];

        let inputFound = false;
        for (const selector of inputSelectors) {
          try {
            const input = await page.locator(selector).first();
            if (await input.isVisible({ timeout: 3000 })) {
              await input.fill(validEmail);
              console.log(`✓ Entered valid email: ${validEmail}`);
              inputFound = true;
              await page.waitForTimeout(1000);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (!inputFound) {
          throw new Error('Could not find input field after clicking Start');
        }

        // STEP 3: Click Continue/Submit
        const submitSelectors = [
          'button:has-text("Continue")',
          'button:has-text("Next")',
          'button:has-text("Submit")',
          'button[type="submit"]'
        ];

        for (const selector of submitSelectors) {
          try {
            const button = await page.locator(selector).first();
            if (await button.isVisible({ timeout: 2000 })) {
              await button.click();
              console.log(`✓ Clicked Continue button`);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        await page.waitForTimeout(4000);

        const initialUrl = page.url();
        console.log(`Current URL: ${initialUrl}`);

        // Navigate to Collection section and click an item
        console.log('\n1. Testing Collection section...');
        try {
          // Look for Collection section or tab
          const collectionSelectors = [
            'text="Collection"',
            '[data-section="collection"]',
            'a:has-text("Collection")',
            'button:has-text("Collection")',
            '[aria-label*="Collection" i]'
          ];

          let collectionFound = false;
          for (const selector of collectionSelectors) {
            try {
              const collectionLink = await page.locator(selector).first();
              if (await collectionLink.isVisible({ timeout: 2000 })) {
                await collectionLink.click();
                console.log('   ✓ Clicked Collection section');
                collectionFound = true;
                await page.waitForTimeout(3000);
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (!collectionFound) {
            console.log('   ℹ️ Collection section not found or already visible');
          }

          // Click first item in collection (these are Benefits)
          const itemSelectors = [
            'article',
            '[data-testid*="item"]',
            '[data-type="benefit"]',
            'div[role="button"]',
            'a[href*="benefit"]'
          ];

          let itemClicked = false;
          for (const selector of itemSelectors) {
            try {
              const item = await page.locator(selector).first();
              if (await item.isVisible({ timeout: 2000 })) {
                await item.click();
                console.log('   ✓ Clicked item in Collection (should be a Benefit)');
                itemClicked = true;
                await page.waitForTimeout(3000);
                
                const newUrl = page.url();
                if (newUrl !== initialUrl) {
                  console.log(`   ✓ Navigated to: ${newUrl}`);
                }
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (itemClicked) {
            testResults[deviceName].navigationTest.collection = {
              status: 'pass',
              message: 'Successfully navigated Collection section'
            };
          } else {
            testResults[deviceName].navigationTest.collection = {
              status: 'fail',
              message: 'Could not click item in Collection'
            };
          }
        } catch (error) {
          console.log(`   ❌ Collection navigation error: ${error.message}`);
          testResults[deviceName].navigationTest.collection = {
            status: 'fail',
            message: error.message
          };
        }

        // Go back to main page
        console.log('\n   Going back to main page...');
        await page.goto(passportUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        // Click Start again
        for (const selector of initialStartSelectors) {
          try {
            const startButton = await page.locator(selector).first();
            if (await startButton.isVisible({ timeout: 2000 })) {
              await startButton.click();
              await page.waitForTimeout(2000);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        // Navigate to Benefits section and click an item
        console.log('\n2. Testing Benefits section...');
        try {
          const benefitsSelectors = [
            'text="Benefits"',
            '[data-section="benefits"]',
            'a:has-text("Benefits")',
            'button:has-text("Benefits")',
            '[aria-label*="Benefits" i]'
          ];

          let benefitsFound = false;
          for (const selector of benefitsSelectors) {
            try {
              const benefitsLink = await page.locator(selector).first();
              if (await benefitsLink.isVisible({ timeout: 2000 })) {
                await benefitsLink.click();
                console.log('   ✓ Clicked Benefits section');
                benefitsFound = true;
                await page.waitForTimeout(3000);
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (!benefitsFound) {
            console.log('   ℹ️ Benefits section not found or already visible');
          }

          // Click first benefit item
          const itemSelectors = [
            'article',
            '[data-testid*="benefit"]',
            '[data-type="benefit"]',
            'div[role="button"]',
            'a[href*="benefit"]'
          ];

          let itemClicked = false;
          for (const selector of itemSelectors) {
            try {
              const item = await page.locator(selector).first();
              if (await item.isVisible({ timeout: 2000 })) {
                await item.click();
                console.log('   ✓ Clicked item in Benefits');
                itemClicked = true;
                await page.waitForTimeout(3000);
                
                // Try to click an item detail within the benefit to go to collectible
                console.log('   Looking for collectible item within benefit...');
                const collectibleSelectors = [
                  'article',
                  '[data-testid*="collectible"]',
                  '[data-type="collectible"]',
                  'div[role="button"]',
                  'a[href*="collectible"]'
                ];
                
                for (const collSelector of collectibleSelectors) {
                  try {
                    const collectibleItem = await page.locator(collSelector).first();
                    if (await collectibleItem.isVisible({ timeout: 2000 })) {
                      await collectibleItem.click();
                      console.log('   ✓ Clicked collectible item from benefit detail');
                      await page.waitForTimeout(3000);
                      
                      const collectibleUrl = page.url();
                      console.log(`   ✓ At collectible: ${collectibleUrl}`);
                      break;
                    }
                  } catch (e) {
                    continue;
                  }
                }
                
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (itemClicked) {
            testResults[deviceName].navigationTest.benefits = {
              status: 'pass',
              message: 'Successfully navigated Benefits section'
            };
          } else {
            testResults[deviceName].navigationTest.benefits = {
              status: 'fail',
              message: 'Could not click item in Benefits'
            };
          }
        } catch (error) {
          console.log(`   ❌ Benefits navigation error: ${error.message}`);
          testResults[deviceName].navigationTest.benefits = {
            status: 'fail',
            message: error.message
          };
        }

        // Go back to main page
        console.log('\n   Going back to main page...');
        await page.goto(passportUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        // Click Start again
        for (const selector of initialStartSelectors) {
          try {
            const startButton = await page.locator(selector).first();
            if (await startButton.isVisible({ timeout: 2000 })) {
              await startButton.click();
              await page.waitForTimeout(2000);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        // Navigate to Hunts section and click an item
        console.log('\n3. Testing Hunts section...');
        try {
          const huntsSelectors = [
            'text="Hunts"',
            '[data-section="hunts"]',
            'a:has-text("Hunts")',
            'button:has-text("Hunts")',
            '[aria-label*="Hunts" i]'
          ];

          let huntsFound = false;
          for (const selector of huntsSelectors) {
            try {
              const huntsLink = await page.locator(selector).first();
              if (await huntsLink.isVisible({ timeout: 2000 })) {
                await huntsLink.click();
                console.log('   ✓ Clicked Hunts section');
                huntsFound = true;
                await page.waitForTimeout(3000);
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (!huntsFound) {
            console.log('   ℹ️ Hunts section not found or already visible');
          }

          // Click first hunt item
          const itemSelectors = [
            'article',
            '[data-testid*="hunt"]',
            '[data-type="hunt"]',
            'div[role="button"]',
            'a[href*="hunt"]'
          ];

          let itemClicked = false;
          for (const selector of itemSelectors) {
            try {
              const item = await page.locator(selector).first();
              if (await item.isVisible({ timeout: 2000 })) {
                await item.click();
                console.log('   ✓ Clicked item in Hunts');
                itemClicked = true;
                await page.waitForTimeout(3000);
                
                // Try to click an item detail within the hunt to go to collectible
                console.log('   Looking for collectible item within hunt...');
                const collectibleSelectors = [
                  'article',
                  '[data-testid*="collectible"]',
                  '[data-type="collectible"]',
                  'div[role="button"]',
                  'a[href*="collectible"]'
                ];
                
                for (const collSelector of collectibleSelectors) {
                  try {
                    const collectibleItem = await page.locator(collSelector).first();
                    if (await collectibleItem.isVisible({ timeout: 2000 })) {
                      await collectibleItem.click();
                      console.log('   ✓ Clicked collectible item from hunt detail');
                      await page.waitForTimeout(3000);
                      
                      const collectibleUrl = page.url();
                      console.log(`   ✓ At collectible: ${collectibleUrl}`);
                      break;
                    }
                  } catch (e) {
                    continue;
                  }
                }
                
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (itemClicked) {
            testResults[deviceName].navigationTest.hunts = {
              status: 'pass',
              message: 'Successfully navigated Hunts section'
            };
          } else {
            testResults[deviceName].navigationTest.hunts = {
              status: 'fail',
              message: 'Could not click item in Hunts'
            };
          }
        } catch (error) {
          console.log(`   ❌ Hunts navigation error: ${error.message}`);
          testResults[deviceName].navigationTest.hunts = {
            status: 'fail',
            message: error.message
          };
        }

        // Record for a few more seconds
        console.log('\n🎥 Recording final moments...');
        await page.waitForTimeout(5000);

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
