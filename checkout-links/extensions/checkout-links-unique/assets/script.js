// Initialize checkoutConfig if it doesn't exist
window.checkoutConfig = window.checkoutConfig || {
  link_id: '',
  backendUrl: '',
  products: [],
  discount: {
    code: '',
    value: 0,
    freeShipping: false
  },
  popupMessage: {}
};

// Simple order counter for checkout links
window.orderCounter = {
  // Count completed orders for this link
  countOrder: function () {
    const linkId = window.checkoutConfig?.link_id;
    if (!linkId) return;

    // Send order count to backend
    this.sendOrderCount(linkId);

    // Store locally as backup
    this.storeLocalCount(linkId);
  },

  // Send order count to backend API
  sendOrderCount: function (linkId) {
    const backendUrl = window.checkoutConfig?.backendUrl;
    if (!backendUrl) return;

    const countData = {
      link_id: linkId,
      event_type: 'order_placed',
      timestamp: new Date().toISOString(),
      page_url: window.location.href
    };

    fetch(`${backendUrl}/api/order-count`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(countData)
    }).then(response => {
      if (response.ok) {
        console.log('Order count sent successfully for link:', linkId);
      }
    }).catch(error => {
      console.error('Failed to send order count:', error);
    });
  },

  // Store order count locally
  storeLocalCount: function (linkId) {
    try {
      const countKey = `checkout_links_count_${linkId}`;
      const currentCount = parseInt(localStorage.getItem(countKey) || '0');
      localStorage.setItem(countKey, (currentCount + 1).toString());

      console.log(`Order count for link ${linkId}: ${currentCount + 1}`);
    } catch (error) {
      console.error('Failed to store order count locally:', error);
    }
  },

  // Check if we're on thank you page and count order
  checkAndCount: function () {
    // Check if we're on thank you/order confirmation page
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;

    const isThankYouPage = currentPath.includes('/thank_you') ||
      currentPath.includes('/thank-you') ||
      currentPath.includes('/orders/') ||
      currentPath.match(/\/checkouts\/[^\/]+\/[^\/]+\/thank-you/) ||
      document.querySelector('.os-step__title') ||
      document.querySelector('[data-step="thank_you"]') ||
      document.querySelector('.order-confirmation') ||
      document.querySelector('.step__footer') ||
      currentSearch.includes('thank_you') ||
      currentSearch.includes('thank-you');

    console.log('Order Counter: Checking for thank you page...', {
      currentPath,
      currentSearch,
      isThankYouPage,
      linkId: window.checkoutConfig?.link_id
    });
    if (isThankYouPage && window.checkoutConfig?.link_id) {
      console.log('Order Counter: Thank you page detected, counting order for link:', window.checkoutConfig.link_id);
      // Add small delay to ensure page is loaded
      setTimeout(() => {
        this.countOrder();
      }, 1000);
    }
  }
};

document.addEventListener('DOMContentLoaded', function () {
  // Log window.checkoutConfig at startup for debugging
  console.log('Initial checkoutConfig:', window.checkoutConfig);
  console.log('Theme editor settings:', window.checkoutConfig?.theme_editor);

  // Try to load the theme editor helper script if we're in the theme editor
  if (window.Shopify && window.Shopify.designMode) {
    try {
      // First try to get the extension URL from the current script
      let extensionUrl = '';
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        if (script.src && script.src.includes('checkout-links-unique')) {
          extensionUrl = script.src.split('/assets/')[0];
        }
      });

      console.log('Detected extension URL:', extensionUrl);

      const helperScript = document.createElement('script');
      // If we found the extension URL, use it, otherwise fall back to placeholder
      if (extensionUrl) {
        helperScript.src = `${extensionUrl}/assets/theme-editor-helper.js`;
      } else {
        helperScript.src = 'https://cdn.shopify.com/extensions/[EXTENSION_ID]/[VERSION]/assets/theme-editor-helper.js';
      }

      helperScript.onload = function () {
        console.log('Theme editor helper script loaded successfully');
      };
      helperScript.onerror = function () {
        console.warn('Could not load theme editor helper script, falling back to built-in function');
      };
      document.head.appendChild(helperScript);
    } catch (e) {
      console.error('Error loading theme editor helper script:', e);
    }
  }

  // Immediately make sure the modal is properly hidden on page load
  const initialModalElement = document.getElementById('orderSummaryModal');
  if (initialModalElement) {
    initialModalElement.style.display = 'none';
    initialModalElement.style.visibility = 'hidden';
    initialModalElement.classList.remove('show');
    initialModalElement.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  // Apply schema settings to ensure all customizations are visible in the storefront
  function applySchemaSettings() {
    console.log('Applying schema settings to storefront popup');

    // Make sure schema settings from star_rating.liquid are applied to the popup
    if (window.checkoutConfig && window.checkoutConfig.popupMessage) {
      // Apply button color from settings
      if (window.checkoutConfig.theme_editor && window.checkoutConfig.theme_editor.button_color) {
        const buttonColor = window.checkoutConfig.theme_editor.button_color;
        document.documentElement.style.setProperty('--checkout-links-button-color', buttonColor);

        // Also directly apply to any existing buttons
        setTimeout(() => {
          const buttons = document.querySelectorAll('.confirm-btn');
          buttons.forEach(btn => {
            btn.style.backgroundColor = buttonColor;
          });
        }, 100);
      }

      // Apply text settings from theme editor
      if (window.checkoutConfig.theme_editor) {
        // Heading text
        if (window.checkoutConfig.theme_editor.popup_title) {
          console.log('Applying popup title from theme editor:', window.checkoutConfig.theme_editor.popup_title);
          window.checkoutConfig.popupMessage.heading_text = window.checkoutConfig.theme_editor.popup_title;
        }

        // Message text
        if (window.checkoutConfig.theme_editor.popup_description) {
          console.log('Applying popup description from theme editor:', window.checkoutConfig.theme_editor.popup_description);
          window.checkoutConfig.popupMessage.message_text = window.checkoutConfig.theme_editor.popup_description;
        }

        // Checkout button text
        if (window.checkoutConfig.theme_editor.checkout_button_text) {
          console.log('Applying checkout button text from theme editor:', window.checkoutConfig.theme_editor.checkout_button_text);
          window.checkoutConfig.popupMessage.checkout_button_text = window.checkoutConfig.theme_editor.checkout_button_text;
        }

        // Close button text
        if (window.checkoutConfig.theme_editor.close_button_text) {
          console.log('Applying close button text from theme editor:', window.checkoutConfig.theme_editor.close_button_text);
          window.checkoutConfig.popupMessage.close_button_text = window.checkoutConfig.theme_editor.close_button_text;
        }

        // Countdown settings
        if (window.checkoutConfig.theme_editor.show_countdown !== undefined) {
          console.log('Applying countdown visibility from theme editor:', window.checkoutConfig.theme_editor.show_countdown);
          window.checkoutConfig.popupMessage.countdown_active = window.checkoutConfig.theme_editor.show_countdown;
        }

        if (window.checkoutConfig.theme_editor.countdown_time) {
          const countdownMinutes = Math.floor(parseInt(window.checkoutConfig.theme_editor.countdown_time, 10) / 60) || 10;
          console.log('Applying countdown time from theme editor:', countdownMinutes + ' minutes');
          window.checkoutConfig.popupMessage.timer_text = countdownMinutes + " minute";
        }

        if (window.checkoutConfig.theme_editor.countdown_label) {
          console.log('Applying countdown label from theme editor:', window.checkoutConfig.theme_editor.countdown_label);
          window.checkoutConfig.popupMessage.copy_text = window.checkoutConfig.theme_editor.countdown_label;
        }

        // Display settings
        if (window.checkoutConfig.theme_editor.show_price !== undefined) {
          console.log('Applying price visibility from theme editor:', window.checkoutConfig.theme_editor.show_price);
          window.checkoutConfig.popupMessage.show_price = window.checkoutConfig.theme_editor.show_price;
        }

        if (window.checkoutConfig.theme_editor.show_order_total !== undefined) {
          console.log('Applying order total visibility from theme editor:', window.checkoutConfig.theme_editor.show_order_total);
          window.checkoutConfig.popupMessage.show_order_total = window.checkoutConfig.theme_editor.show_order_total;
        }

        if (window.checkoutConfig.theme_editor.allow_deselect !== undefined) {
          console.log('Applying deselect option from theme editor:', window.checkoutConfig.theme_editor.allow_deselect);
          window.checkoutConfig.popupMessage.allow_deselect = window.checkoutConfig.theme_editor.allow_deselect;
        }

        // Direct checkout option
        if (window.checkoutConfig.theme_editor.direct_checkout !== undefined) {
          console.log('Applying direct checkout option from theme editor:', window.checkoutConfig.theme_editor.direct_checkout);
          window.checkoutConfig.popupMessage.direct_checkout = window.checkoutConfig.theme_editor.direct_checkout;
        }
      }

      // Update the modal content to reflect current settings
      updateModalContent();
    }
  }
  // Function to apply custom CSS and brand color
  function applyBrandStylesAndCustomCSS(linkData) {
    // Apply custom CSS if available
    if (linkData.user?.settings) {
      const customCss = (Array.isArray(linkData.user.settings)
        ? linkData.user.settings.find(s => s.key === 'custom_css')?.value
        : linkData.user.settings.custom_css);
      if (customCss) {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.appendChild(document.createTextNode(customCss));
        document.head.appendChild(style);
      }
    }

    // Set confirm button background color
    const brandColor = (Array.isArray(linkData.user?.settings)
      ? linkData.user.settings.find(s => s.key === 'brand_color_hex')?.value
      : linkData.user?.settings?.brand_color_hex);
    if (brandColor) {
      setTimeout(() => {
        document.querySelectorAll('.confirm-btn').forEach(btn => {
          btn.style.background = brandColor;
        });
      }, 200); // Wait for modal to render
    }
  }

  // Get URL parameters
  function getParamsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    console.log('URL parameters:', Object.fromEntries(urlParams.entries()));
    let linkId = urlParams.get('link_id');
    let backendUrl = urlParams.get('backend_url');
    let discountCode = urlParams.get('discount_code');
    // console.log('Link ID from URL:', linkId);
    // console.log('Backend URL from URL:', backendUrl);
    // console.log('Discount code from URL:', discountCode);
    // Use fallbacks if available from hardcoded config or data attributes
    if (!linkId) {
      linkId = document.querySelector('[data-link-id]')?.dataset.linkId || '';
      // console.log('Using fallback link ID:', linkId);
    }
    if (!backendUrl) {
      backendUrl = document.querySelector('[data-backend-url]')?.dataset.backendUrl || '';
      // console.log('Using fallback backend URL:', backendUrl);
    }
    if (!discountCode) {
      discountCode = document.querySelector('[data-discount-code]')?.dataset.discountCode || '';
      // console.log('Using fallback discount code:', discountCode);
    }

    if (backendUrl) {
      try {
        backendUrl = decodeURIComponent(backendUrl);
        // Handle double encoding
        if (backendUrl.includes('%')) {
          backendUrl = decodeURIComponent(backendUrl);
        }

        // Validate URL format
        try {
          new URL(backendUrl);
        } catch (e) {
          // console.error('Invalid backend URL format after decoding:', backendUrl);
          backendUrl = '';
        }
      } catch (e) {
        // console.error('Error decoding backend URL:', e);
        backendUrl = '';
      }
    }

    if (window.checkoutConfig) {
      if (linkId) window.checkoutConfig.link_id = linkId;
      if (backendUrl) window.checkoutConfig.backendUrl = backendUrl;
      if (discountCode) window.checkoutConfig.discount.code = discountCode;
    }

    return { linkId, backendUrl, discountCode };
  }
  // Fetch link data
  async function fetchLinkData(linkId) {
    // console.log('Fetching link data for ID:', linkId);

    // Validate link ID
    if (!linkId || linkId.trim() === '') {
      // console.error('Invalid or empty link ID');
      return;
    }

    let backendUrl = window.checkoutConfig?.backendUrl;

    if (!backendUrl) {
      // console.error('No backend URL found');
      initializeUIWithFallbackData();
      return;
    }

    try {
      new URL(backendUrl); // Validate URL
      backendUrl = backendUrl.replace(/\/+$/, '');
    } catch (e) {
      // console.error('Invalid backend URL:', backendUrl);
      initializeUIWithFallbackData();
      return;
    }

    const isNgrok = backendUrl.includes('ngrok');
    const baseHeaders = {
      Accept: 'application/json',
      ...(isNgrok && { 'ngrok-skip-browser-warning': '69420' }),
    };

    const endpointsToTry = [
      // `${backendUrl}/links/${linkId}`,
      `${backendUrl}/api/links/${linkId}`,
    ];

    for (let endpoint of endpointsToTry) {
      try {
        // console.log('Requesting data from:', endpoint);

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: new Headers(baseHeaders),
          mode: 'cors',
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          const contentType = response.headers.get('content-type') || '';
          const bodyText = await response.text();

          if (contentType.includes('text/html') || bodyText.startsWith('<!DOCTYPE')) {
            // console.error('Received HTML instead of JSON. Likely an error page or interstitial.');
            continue;
          }

          // console.warn(`Request to ${endpoint} failed with status ${response.status}`);
          continue;
        }

        const responseText = await response.text();
        console.log('API response preview:', responseText);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (err) {
          // console.error('Failed to parse JSON:', err);
          throw new Error('Malformed JSON response');
        }

        if (data?.success && data?.link) {
          updateCheckoutConfig(data.link);
          applyBrandStylesAndCustomCSS(data.link);
          initializeUI();
          return;
        } else {
          // console.error('Unexpected API response structure:', data);
          throw new Error('Invalid API response format');
        }
      } catch (err) {
        // console.warn(`Error trying ${endpoint}:`, err.message);
      }
    }

    // If all attempts fail
    // console.warn('All fetch attempts failed. Falling back to test data...');
    try {
      const testData = {
        success: true,
        link: {
          id: 56,
          link_name: "Test Link",
          discount_value: "12.00",
          discount_code: "",
          free_shipping: 0,
          order_discount: 1,
          popup_message: {
            heading_text: "Order Summary",
            message_text: "Thank you for your order! Enjoy your 12% discount.",
            checkout_button_text: "Confirm",
            close_button_text: "No thanks",
            copy_text: "This offer will expire in",
            countdown_active: 1,
            show_order_total: 1,
            show_price: 1,
            timer_text: "1 minute",
            is_active: 1
          },
          linked_variants: [
            {
              id: 413,
              link_id: 56,
              product_id: 1,
              variant_id: 56,
              price: "205.79",
              variant: {
                id: 56,
                product_id: 28,
                price: "18.25",
                title: "SPORT DARK NAVY / S",
                product: {
                  id: 28,
                  title: "Men's Zone Performance Polo",
                  media: [{ src: "https://cdn.shopify.com/s/files/1/0696/1106/1496/files/122273_f_fm.jpg?v=1748601446" }]
                }
              }
            },
            {
              id: 414,
              link_id: 56,
              product_id: 2,
              variant_id: 57,
              price: "125.50",
              variant: {
                id: 57,
                product_id: 29,
                price: "22.99",
                title: "BLACK / L",
                product: {
                  id: 29,
                  title: "Women's Tech Shell Full-Zip",
                  media: [{ src: "https://cdn.shopify.com/s/files/1/0696/1106/1496/products/tech-shell-full-zip-black.jpg?v=1748601446" }]
                }
              }
            }
          ]
        }
      };

      updateCheckoutConfig(testData.link);
      initializeUI();
    } catch (fallbackErr) {
      // console.error('Fallback data failed:', fallbackErr);
      initializeUIWithFallbackData();
    }
  }

  // Update checkout config with API data
  function updateCheckoutConfig(linkData) {
    if (!window.checkoutConfig) return;

    // Get variants
    const variants = linkData.linked_variants || linkData.linkedVariants || [];
    const allVariants = [];

    if (variants && variants.length > 0) {
      variants.forEach(item => {
        if (!item.variant) return;

        const mediaItem = item.variant.product?.media?.[0];

        const tracked = !!item.variant.inventory_tracked;
        const denyPolicy = item.variant.inventory_policy === "deny";
        const available = item.variant.inventory_quantity || 0;

        // 🚫 Skip products with 0 available stock if deny + tracked
        if (tracked && denyPolicy && available <= 0) {
          return;
        }

        let qty = item.quantity || 1;
        if (tracked && denyPolicy && qty > available) {
          qty = available; // cap to available
        }

        allVariants.push({
          id: item.variant_id,
          linkVariantId: item.id,
          productId: item.product_id,
          title: `${item.variant.product.title} - ${item.variant.title}`,
          price: item.price || item.variant.price || '0.00',
          image: mediaItem?.src || '',
          quantity: qty,
          inventoryQuantity: available,
        });
      });
    }

    // Update products
    window.checkoutConfig.products = allVariants;

    // Update discount
    if (linkData.discount_value) {
      window.checkoutConfig.discount = {
        code: linkData.discount_code || '',
        value: linkData.discount_value || 0,
        freeShipping: !!linkData.free_shipping,
        orderDiscount: !!linkData.order_discount
      };
    }

    // Update popup message
    if (linkData.popup_message) {
      window.checkoutConfig.popupMessage = linkData.popup_message;
    }
  }


  // Initialize UI with fallback data
  function initializeUIWithFallbackData() {
    // Only continue if we have a link ID
    if (!window.checkoutConfig?.link_id) {
      // console.log('No link ID found, not initializing UI');
      return;
    }

    // Check if this failed because of ngrok
    const backendUrl = window.checkoutConfig?.backendUrl;
    if (backendUrl && backendUrl.includes('ngrok')) {
      // Create a ngrok helper button
      const modalContent = document.querySelector('.modal-content');
      if (modalContent) {
        const ngrokHelper = document.createElement('div');
        ngrokHelper.className = 'ngrok-helper';
        ngrokHelper.innerHTML = `
          <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center;">
            <p style="margin-bottom: 10px;">It appears you're using an ngrok URL which may require you to accept a warning page first.</p>
            <button id="open-ngrok-btn" style="padding: 8px 16px; background: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Open ngrok URL in new tab
            </button>
            <p style="margin-top: 10px; font-size: 12px;">After clicking "Visit Site" in the new tab, come back here and reload this page.</p>
          </div>
        `;
        modalContent.prepend(ngrokHelper);
        // Add event listener
        setTimeout(() => {
          const openNgrokBtn = document.getElementById('open-ngrok-btn');
          if (openNgrokBtn) {
            openNgrokBtn.addEventListener('click', () => {
              window.open(backendUrl, '_blank');
            });
          }
        }, 100);
      }
    }
    // Make sure window.checkoutConfig.products exists but can be empty
    if (!window.checkoutConfig.products) {
      window.checkoutConfig.products = [];
    }
    updateModalContent();
  }

  // Initialize UI with fetched data
  function initializeUI() {
    updateModalContent();
    if (window.checkoutConfig.popupMessage?.countdown_active &&
      window.checkoutConfig.popupMessage.timer_text) {
      initializeCountdown(window.checkoutConfig.popupMessage.timer_text);
    }
  }

  // Initialize countdown timer
  function initializeCountdown(timerText) {
    const minutesMatch = timerText.match(/(\d+)\s*minute/i);
    if (!minutesMatch) return;

    // Check if we're in the Shopify theme editor
    const isThemeEditor = window.Shopify && window.Shopify.designMode;

    // Use a shorter countdown for theme editor preview
    const minutes = isThemeEditor ? 2 : (parseInt(minutesMatch[1]) || 1);
    let secondsRemaining = minutes * 60;

    // For theme editor, shorten the time to make the countdown more obvious
    if (isThemeEditor) {
      secondsRemaining = 60; // Just 1 minute for theme editor preview
    }

    let countdownEl = document.querySelector('.countdown-timer');
    if (!countdownEl) {
      countdownEl = document.createElement('div');
      countdownEl.className = 'countdown-timer';
      const modalBody = document.querySelector('.modal-body');
      if (modalBody) {
        const orderTitle = modalBody.querySelector('.order-title');
        const orderDesc = modalBody.querySelector('.order-desc');
        if (orderDesc) {
          modalBody.insertBefore(countdownEl, orderDesc.nextSibling);
        } else if (orderTitle) {
          modalBody.insertBefore(countdownEl, orderTitle.nextSibling);
        } else {
          modalBody.prepend(countdownEl);
        }
      }
    }

    const countdownTimeEl = countdownEl.querySelector('.countdown-time') || document.createElement('div');
    if (!countdownTimeEl.parentElement) {
      countdownTimeEl.className = 'countdown-time';
      countdownEl.appendChild(countdownTimeEl);
    }

    // Create an expiration message element that will be shown when timer expires
    const expirationMessageEl = document.createElement('div');
    expirationMessageEl.className = 'expiration-message';
    expirationMessageEl.style.color = '#e74c3c';
    expirationMessageEl.style.fontWeight = 'bold';
    expirationMessageEl.style.marginTop = '10px';
    expirationMessageEl.style.display = 'none';
    expirationMessageEl.textContent = 'Offer expired! Discount no longer available.';
    countdownEl.appendChild(expirationMessageEl);

    function updateDisplay() {
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      countdownTimeEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    function handleExpiration() {
      // Remove the timer element
      countdownTimeEl.style.display = 'none';
      const countdownLabel = document.querySelector('.countdown-label');
        if (countdownLabel) {
          countdownLabel.style.display = 'none';
        }
      

    // Show expiration message
      expirationMessageEl.style.display = 'block';
      expirationMessageEl.style.color = '#e74c3c';
      expirationMessageEl.style.fontWeight = 'bold';
      expirationMessageEl.style.marginTop = '10px';
      expirationMessageEl.textContent = 'Offer expired! Discount no longer available.';

      // Remove any discount from the checkout config
      if (window.checkoutConfig.discount) {
        window.checkoutConfig.discount.code = '';
        window.checkoutConfig.discount.value = 0;
      }

      // Update UI to reflect discount removal
      const discountRowEl = document.querySelector('.discount-row');
      if (discountRowEl) {
        discountRowEl.style.display = 'none';
      }

      // Update total calculation to remove discount
      updateTotal();

      // Change the confirm button text
      const confirmBtn = document.querySelector('.confirm-btn');
      if (confirmBtn) {
        confirmBtn.textContent = 'Continue Without Discount';
      }

      // Optionally automatically add to cart without discount after a short delay
      setTimeout(() => {
        const confirmBtn = document.querySelector('.confirm-btn');
        if (confirmBtn && !confirmBtn.disabled) {
          // Trigger a click on the confirm button to add products to cart without discount
          confirmBtn.click();
        }
      }, 5000); // Wait 5 seconds before automatically proceeding
    }

    updateDisplay();
    const interval = setInterval(() => {
      secondsRemaining--;
      if (secondsRemaining <= 0) {
        clearInterval(interval);
        handleExpiration();
      } else {
        updateDisplay();
      }
    }, 1000);
  }

  // Update modal content
  function updateModalContent() {
    const modalContent = document.querySelector('.modal-content');
    if (!modalContent || !window.checkoutConfig)
      return;

    // Make function globally accessible for theme-editor-helper.js
    window.updateModalContent = updateModalContent; return;

    // Check if there are any products linked to this link
    const hasProducts = window.checkoutConfig.products && window.checkoutConfig.products.length > 0;

    if (!hasProducts) {
      // Display message when no products are linked to this link ID
      modalContent.innerHTML = `
        <span class="close-button" onclick="window.forceCloseModal(); return false;"></span>
        <div class="modal-body p-4 text-center">
          <h2 class="order-title">${window.checkoutConfig.popupMessage?.heading_text || 'Order Summary'}</h2>
          <div class="no-products-message" style="margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center;">
            <p style="margin-bottom: 15px; font-size: 16px;">No products linked with this link.</p>
            <p style="font-size: 14px; color: #666;">This link may be invalid or all products have been removed.</p>
          </div>
          <a href="#" class="no-thanks">${window.checkoutConfig.popupMessage?.close_button_text || 'No thanks'}</a>
        </div>
      `;

      // Add event listener for the close button
      const closeBtn = modalContent.querySelector('.no-thanks');
      if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          closeModal();
          window.forceCloseModal();
          return false;
        });
      }

      return; // Exit the function as we don't need to do anything else
    }

    // Calculate prices
    let subtotal = window.checkoutConfig.products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0) || 0;
    let discountAmount = 0;

    if (window.checkoutConfig.discount?.value) {
      const discountValue = parseFloat(window.checkoutConfig.discount.value) || 0;
      discountAmount = window.checkoutConfig.discount.orderDiscount
        ? subtotal * (discountValue / 100)
        : discountValue;
      discountAmount = Math.min(discountAmount, subtotal);
    }

    const total = subtotal - discountAmount;
    const currencyCode = window.checkoutConfig.currency_code || 'USD';

    // Build modal HTML
    modalContent.innerHTML = `
      <span class="close-button" onclick="window.forceCloseModal(); return false;"></span>
      <div class="modal-body">
        <h2 class="order-title">${window.checkoutConfig.popupMessage?.heading_text || 'Order Summary'}</h2>
        <p class="order-desc">${window.checkoutConfig.popupMessage?.message_text || ''}</p>
        ${window.checkoutConfig.popupMessage?.countdown_active ? `
        <div class="countdown-timer">
          <div class="countdown-label">${window.checkoutConfig.popupMessage?.copy_text || 'This offer will expire in'}</div>
          <div class="countdown-time"></div>
        </div>
        ` : ''}
        <div class="order-items scrollable">
          ${(window.checkoutConfig.products || []).map(product => `
            <div class="order-item" data-product-id="${product.id}" data-link-variant-id="${product.linkVariantId || ''}">
              <div class="item-img-wrap">
  <img
  src="${product.image}" 
  alt="${product.title}" 
  onerror="this.onerror=null;this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22%3E%3Crect x=%225%22 y=%225%22 width=%2250%22 height=%2250%22 rx=%2210%22 fill=%22%23f3f3f3%22 stroke=%22%23999%22 stroke-width=%222%22/%3E%3Ccircle cx=%2240%22 cy=%2216%22 r=%222%22 fill=%22%23999%22/%3E%3Cpath d=%22M18 42L28 32C29.5 30.5 32.5 30.5 34 32L39 37C40.5 39 43.5 39 45 37L48 34%22 stroke=%22%23999%22 stroke-width=%221.5%22 fill=%22none%22/%3E%3C/svg%3E';"
  width="60"
  height="60"
/>
  <div class="item-qty">${product.quantity}</div>
</div>
              <div class="item-details">
                <div class="product-title">${product.title}</div>
                ${window.checkoutConfig.popupMessage?.show_price ? `<div class="product-price">$${(parseFloat(product.price) || 0).toFixed(2)}</div>` : ''}
              </div>
              <div class="item-check">
                <label class="checkbox-label">
                  <input type="checkbox" ${window.checkoutConfig.popupMessage?.allow_deselect === false ? 'disabled' : ''} checked class="product-checkbox" data-price="${product.price}" data-quantity="${product.quantity || 1}">
                  <div class="custom-checkbox">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                  </div>
                </label>
              </div>
            </div>
          `).join('')}
        </div>
        ${window.checkoutConfig.discount?.value ? `
        <div class="discount-row">
          <div class="discount-label">Discount ${window.checkoutConfig.discount.code ? `(${window.checkoutConfig.discount.code})` : ''}</div>
          <div class="discount-amount">-$${discountAmount.toFixed(2)}</div>
        </div>

        ` : ''}
        ${window.checkoutConfig.popupMessage?.show_order_total ? `
        <div class="order-total-row">
          <div class="total-label">Total</div>
          <div class="total-amount">
            <span class="total-currency">${currencyCode}</span>
            <span class="total-value">${total.toFixed(2)}</span>
          </div>
          
        </div>
        <div class="discount-info" style="font-size: 12px; color: #000; margin: 16px  0px; display: flex; align-items: center; gap: 5px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
              <path d="M12.79 21L3 11.21V2H11.21L21 11.79L12.79 21ZM4 3V10.59L12.79 19.38L19.38 12.79L10.59 4H4ZM6.5 8C7.33 8 8 7.33 8 6.5S7.33 5 6.5 5 5 5.67 5 6.5 5.67 8 6.5 8Z" fill="currentColor"/>
            </svg>
            ${window.checkoutConfig.discount.code && window.checkoutConfig.discount.code.startsWith('FREESHIP')
        ? 'Free Shipping'
        : `Includes ${window.checkoutConfig.discount.orderDiscount ? window.checkoutConfig.discount.value + '% OFF' : '$' + window.checkoutConfig.discount.value + ' OFF'}`}
          </div>
        </div>
        ` : ''}
        <button class="confirm-btn">${window.checkoutConfig.popupMessage?.checkout_button_text || 'Confirm'}</button>
        <a href="${window.checkoutConfig.popupMessage?.close_button_link || '#'}" class="no-thanks">${window.checkoutConfig.popupMessage?.close_button_text || 'No thanks'}</a>
      </div>
    `;

    // Helper to sanitize and validate URLs
    function sanitizeAndValidateUrl(url) {
      if (!url) return '';
      // Remove unwanted backslashes
      url = url.replace(/\\+/g, '');
      // Basic validation
      try {
        new URL(url);
        return url;
      } catch (e) {
        return '';
      }
    }

    // Locate the close button and ensure it opens in a new window
    function checkLinkExists(url, callback) {
      // Create request object
      const request = new XMLHttpRequest();

      // Use asynchronous request (true as third parameter)
      request.open('HEAD', url, true);

      // Set timeout to avoid long waits
      request.timeout = 5000;

      // Handle response
      request.onreadystatechange = function () {
        if (request.readyState === 4) {
          // Check if URL exists based on status code
          if (request.status === 200) {
            callback(true); // URL exists
          } else {
            callback(false); // URL doesn't exist or other error
          }
        }
      };

      // Handle timeout
      request.ontimeout = function () {
        callback(false);
      };

      // Handle network errors
      request.onerror = function () {
        callback(false);
      };

      // Send the request
      try {
        request.send();
      } catch (error) {
        callback(false);
      }
    }

    // You can implement this with the "No thanks" button in your existing code:
    const noThanksBtn = document.querySelector('.no-thanks');

    // Async function to check and redirect
    async function checkAndRedirect(url) {
      try {
        // Try to fetch HEAD request (may fail for CORS, but we ignore errors)
        await fetch(url, { method: 'HEAD', mode: 'no-cors' });
        // If no error, attempt redirect
        window.location.href = url;
      } catch {
        // If unreachable, just close modal
        closeModal();
      }
    }

    if (noThanksBtn) {
      noThanksBtn.addEventListener('click', function (e) {
        e.preventDefault();
        let targetUrl = this.getAttribute('href');
        if (targetUrl && targetUrl.trim() !== '') {
          checkAndRedirect(targetUrl);
        } else {
          closeModal();
        }
      });
    }

    // Apply button color if specified in settings
    if (window.checkoutConfig.theme_editor && window.checkoutConfig.theme_editor.button_color) {
      const confirmButton = document.querySelector('.confirm-btn');
      if (confirmButton) {
        confirmButton.style.backgroundColor = window.checkoutConfig.theme_editor.button_color;
      }
    }

    // Call your other listener setup if needed
    attachEventListeners();
  }

  // Helper function to add items to cart with error handling
  async function addItemsToCart(cartItems, confirmBtn) {
    try {
      // First, clear the existing cart to ensure a fresh start
      confirmBtn.textContent = 'Clearing cart...';

      // Clear the cart using the /cart/clear endpoint
      const clearResponse = await fetch('/cart/clear.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!clearResponse.ok) {
        throw new Error(`Failed to clear cart: ${clearResponse.status}`);
      }

      confirmBtn.textContent = 'Adding to cart...';
      // Now add the selected items to the cart
      const response = await fetch(window.Shopify.routes?.root ? `${window.Shopify.routes.root}cart/add.js` : '/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          items: cartItems,
          attributes: {
            'checkout_link_id': window.checkoutConfig.link_id,
            'source': 'checkout-links-unique',
            'discount_expired': document.querySelector('.expiration-message')?.style.display === 'block' ? 'true' : 'false',
            // Add any other cart-level attributes
          }
        })
      });

      if (!response.ok) {
        // Handle specific error responses
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: 'Unknown error occurred' };
        }

        const error = new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      const data = await response.json();
      // console.log('Products added to cart:', data);

      // Store cart session data for potential order counting and discount persistence
      if (window.checkoutConfig?.link_id) {
        // Store in session storage for immediate use
        sessionStorage.setItem('checkout_links_session', JSON.stringify({
          link_id: window.checkoutConfig.link_id,
          cart_created: new Date().toISOString(),
          items: cartItems,
          discount_expired: document.querySelector('.expiration-message')?.style.display === 'block' ? true : false
        }));

        // Also store discount information in localStorage for persistence
        if (window.checkoutConfig.discount && window.checkoutConfig.discount.code && !document.querySelector('.expiration-message')?.style.display === 'block') {
          localStorage.setItem('checkout_links_discount', JSON.stringify({
            link_id: window.checkoutConfig.link_id,
            discount_code: window.checkoutConfig.discount.code,
            discount_value: window.checkoutConfig.discount.value,
            order_discount: window.checkoutConfig.discount.orderDiscount,
            free_shipping: window.checkoutConfig.discount.freeShipping,
            specific_products: cartItems.map(item => parseInt(item.id)), // Store the specific product IDs
            expires: new Date(new Date().getTime() + (24 * 60 * 60 * 1000)).toISOString() // 24 hours from now
          }));
        }
      }

      // Reset button state
      confirmBtn.textContent = window.checkoutConfig.popupMessage?.checkout_button_text || 'Confirm';
      confirmBtn.disabled = false;

      // Close modal and redirect to cart page
      closeModal();
      setTimeout(() => {
        // Check if timer has expired
        const discountExpired = document.querySelector('.expiration-message')?.style.display === 'block';

        // Check if we should direct to checkout or cart
        const directCheckout = window.checkoutConfig.popupMessage?.direct_checkout !== false;

        // If we have a discount code and the timer hasn't expired, redirect to checkout with discount applied
        const discountCode = window.checkoutConfig.discount?.code || '';
        if (directCheckout) {
          if (discountCode && !discountExpired) {
            // Get the specific product IDs that the discount applies to
            const specificProductIds = cartItems.map(item => parseInt(item.id)).join(',');

            // Redirect to checkout with discount applied to specific products
            window.location.href = `/checkout?discount=${encodeURIComponent(discountCode)}&discount_specific_products=${specificProductIds}`;
          } else {
            // console.log('Redirecting to checkout without discount');
            window.location.href = '/checkout';
          }
        } else {
          // If direct checkout is disabled, redirect to cart page
          window.location.href = '/cart';
        }
      }, 300);

    } catch (error) {
      // console.error('Error adding products to cart:', error);

      // Reset button state first
      confirmBtn.disabled = false;

      // Handle specific error cases
      if (error.status === 422) {
        if (error.message && error.message.includes('maximum quantity')) {
          // Handle maximum quantity error - try updating cart instead
          confirmBtn.textContent = 'Updating cart...';
          await handleMaxQuantityError(cartItems, confirmBtn);
        } else if (error.data && error.data.description) {
          // Show the specific error description from Shopify
          confirmBtn.textContent = error.data.description;
          setTimeout(() => {
            confirmBtn.textContent = window.checkoutConfig.popupMessage?.checkout_button_text || 'Confirm';
          }, 3000);
        } else {
          // Generic 422 error
          confirmBtn.textContent = 'Unable to add to cart';
          setTimeout(() => {
            confirmBtn.textContent = window.checkoutConfig.popupMessage?.checkout_button_text || 'Confirm';
          }, 3000);
        }
      } else if (error.status === 404) {
        confirmBtn.textContent = 'Product not found';
        setTimeout(() => {
          confirmBtn.textContent = window.checkoutConfig.popupMessage?.checkout_button_text || 'Confirm';
        }, 3000);
      } else {
        // Generic error handling
        confirmBtn.textContent = 'Failed! Try again';
        setTimeout(() => {
          confirmBtn.textContent = window.checkoutConfig.popupMessage?.checkout_button_text || 'Confirm';
        }, 3000);
      }
    }
  }

  // Helper function to handle maximum quantity errors by updating existing cart items
  async function handleMaxQuantityError(cartItems, confirmBtn) {
    try {
      // Get current cart state
      const cartResponse = await fetch('/cart.js');
      const currentCart = await cartResponse.json();

      // Check which items are already in cart and update quantities
      const updates = {};
      let hasUpdates = false;

      for (const item of cartItems) {
        const existingItem = currentCart.items.find(cartItem =>
          cartItem.variant_id === item.id || cartItem.id === item.id
        );

        if (existingItem) {
          // Item exists, update quantity (ensure we don't exceed max)
          const newQuantity = Math.min(existingItem.quantity + item.quantity, 10); // Assuming max 10
          if (newQuantity !== existingItem.quantity) {
            updates[existingItem.key] = newQuantity;
            hasUpdates = true;
          }
        }
      }

      if (hasUpdates) {
        // Update cart with new quantities
        const updateResponse = await fetch('/cart/update.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ updates })
        });

        if (updateResponse.ok) {
          confirmBtn.textContent = 'Cart updated!';
          setTimeout(() => {
            closeModal();
            window.location.href = '/cart';
          }, 1500);
        } else {
          throw new Error('Failed to update cart');
        }
      } else {
        // Items are already at maximum quantity
        confirmBtn.textContent = 'Items already in cart';
        setTimeout(() => {
          closeModal();
          window.location.href = '/cart';
        }, 1500);
      }

    } catch (updateError) {
      // console.error('Error updating cart:', updateError);
      confirmBtn.textContent = 'Already in cart - view cart';
      setTimeout(() => {
        closeModal();
        window.location.href = '/cart';
      }, 2000);
    }
  }

  // Attach event listeners
  function attachEventListeners() {
    // Check if we're in the Shopify theme editor
    const isThemeEditor = window.Shopify && window.Shopify.designMode;

    // Update total when checkboxes change
    document.querySelectorAll('.product-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', function (e) {
        // Update the appearance of the product row based on checked status
        const productRow = this.closest('.order-item');
        if (productRow) {
          if (this.checked) {
            productRow.style.opacity = '1';
          } else {
            productRow.style.opacity = '0.6';
          }
        }

        // Update totals
        updateTotal();
      });
    });

    // Confirm button click
    const confirmBtn = document.querySelector('.confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        // Special handling for theme editor
        if (isThemeEditor) {
          // Get only the checked products
          const checkedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'));
          const selectedProductCount = checkedProducts.length;
          
          if (selectedProductCount === 0) {
            alert('Please select at least one product to continue.');
            return;
          }
          
          // Get product names for better feedback
          const productNames = checkedProducts.map(checkbox => {
            const productTitle = checkbox.closest('.order-item').querySelector('.product-title').textContent;
            return productTitle;
          }).join(', ');
          
          // Get direct checkout setting
          const directCheckout = window.checkoutConfig.popupMessage?.direct_checkout;
          
          alert(`This would add ${selectedProductCount} product(s) to your cart: ${productNames}${directCheckout ? ' and proceed to checkout' : ''}. (Demo mode in theme editor)`);
          return;
        }

        // Get only the checked products
        const selectedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'))
          .map(checkbox => {
            const productEl = checkbox.closest('.order-item');
            return window.checkoutConfig.products.find(p =>
              (p.id === productEl.dataset.productId) ||
              (productEl.dataset.linkVariantId && p.linkVariantId === parseInt(productEl.dataset.linkVariantId))
            );
          })
          .filter(Boolean); // Remove any undefined values

        // If no products are selected, show a message and prevent adding to cart
        if (selectedProducts.length === 0) {
          alert('Please select at least one product to continue');
          return;
        }

        // Prepare items for cart addition - ONLY checked items
        const cartItems = selectedProducts.map(product => ({
          'id': parseInt(product.id),
          'quantity': parseInt(product.quantity) || 1
        }));

        // Show loading state
        confirmBtn.textContent = 'Clearing cart...';
        confirmBtn.disabled = true;

        try {
          // First clear the existing cart
          const clearResponse = await fetch('/cart/clear.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          if (!clearResponse.ok) {
            throw new Error(`Failed to clear cart: ${clearResponse.status}`);
          }

          // Now add the new items
          confirmBtn.textContent = 'Adding to cart...';

          // Add to cart using Shopify AJAX API
          addItemsToCart(cartItems, confirmBtn);
        } catch (error) {
          console.error('Error clearing cart:', error);
          confirmBtn.textContent = 'Error clearing cart. Please try again.';
          confirmBtn.disabled = false;
          setTimeout(() => {
            confirmBtn.textContent = window.checkoutConfig.popupMessage?.checkout_button_text || 'Confirm';
          }, 3000);
        }
      });
    }

    // No thanks button
    const noThanksBtn = document.querySelector('.no-thanks');
    if (noThanksBtn) {
      noThanksBtn.addEventListener('click', function (e) {
        // Special handling for theme editor
        if (isThemeEditor) {
          e.preventDefault();
          alert('This button would close the popup. (Demo mode in theme editor)');
          return false;
        }

        // Check if there's a specified link in the popup message settings
        const closeLink = window.checkoutConfig.popupMessage?.close_button_link;

        if (closeLink && closeLink !== '#') {
          e.preventDefault();
          window.location.href = closeLink;
          return false;
        }

        // Don't prevent default behavior - allow the redirect to happen
        // First close the modal
        closeModal();

        // Then use the global force close to ensure it's hidden
        if (window.forceCloseModal) {
          window.forceCloseModal();
        }
      });
    } updateTotal();
  }

  // Update total calculation
  function updateTotal() {
    const totalValueEl = document.querySelector('.total-value');
    if (!totalValueEl) return;

    // Get only checked products for calculation
    let subtotal = 0;

    // Get the checked products
    const checkedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'));
    checkedProducts.forEach(checkbox => {
      const price = parseFloat(checkbox.dataset.price) || 0;
      const quantity = parseInt(checkbox.dataset.quantity) || 1;
      subtotal += price * quantity;
    });

    // console.log('Calculated subtotal from checked products:', subtotal);

    let discount = 0;
    let hasValidDiscount = false;

    // Check if discount is still valid (not expired)
    const expirationMessage = document.querySelector('.expiration-message');
    const discountExpired = expirationMessage && expirationMessage.style.display === 'block';

    if (window.checkoutConfig.discount?.value && !discountExpired) {
      hasValidDiscount = true;
      const discountValue = parseFloat(window.checkoutConfig.discount.value) || 0;
      discount = window.checkoutConfig.discount.orderDiscount
        ? subtotal * (discountValue / 100)
        : discountValue;
      discount = Math.min(discount, subtotal);
      // console.log('Applied discount:', discount);
    }

    // Update the total displayed value
    const total = subtotal - discount;
    totalValueEl.textContent = total.toFixed(2);

    // Update discount amount if applicable
    const discountAmountEl = document.querySelector('.discount-amount');
    if (discountAmountEl) {
      if (hasValidDiscount) {
        discountAmountEl.textContent = `-$${discount.toFixed(2)}`;
        discountAmountEl.closest('.discount-row').style.display = '';
      } else {
        discountAmountEl.closest('.discount-row').style.display = 'none';
      }
    }

    // Update the confirm button state based on checked products
    const confirmBtn = document.querySelector('.confirm-btn');
    if (confirmBtn) {
      const hasCheckedProducts = document.querySelectorAll('.product-checkbox:checked').length > 0;
      confirmBtn.disabled = !hasCheckedProducts;
      confirmBtn.style.opacity = hasCheckedProducts ? '1' : '0.6';

      // Change button text if no products are selected
      if (!hasCheckedProducts) {
        confirmBtn.textContent = 'Select products to continue';
      } else if (discountExpired && hasCheckedProducts) {
        confirmBtn.textContent = 'Continue Without Discount';
      } else {
        confirmBtn.textContent = window.checkoutConfig.popupMessage?.checkout_button_text || 'Confirm';
      }
    }
  }

  // Modal functions
  function closeModal() {
    // console.log('Closing modal - using direct DOM manipulation');
    const modalElement = document.getElementById('orderSummaryModal');
    if (!modalElement) return;

    // Force hide with multiple approaches
    modalElement.style.display = 'none';
    modalElement.style.visibility = 'hidden';
    modalElement.style.opacity = '0';
    modalElement.classList.remove('show');
    modalElement.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');

    // Remove any backdrops
    const backdrops = document.querySelectorAll('.modal-backdrop, #simple-modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());

    // Direct HTML modification as a last resort
    try {
      modalElement.outerHTML = modalElement.outerHTML.replace('display: block', 'display: none');
    } catch (e) {
      // console.error('Failed to modify HTML directly:', e);
    }

    // Try removing from DOM and reattaching
    try {
      const parent = modalElement.parentNode;
      const next = modalElement.nextSibling;
      parent.removeChild(modalElement);
      setTimeout(() => {
        parent.insertBefore(modalElement, next);
        modalElement.style.display = 'none';
        modalElement.style.visibility = 'hidden';
      }, 50);
    } catch (e) {
      // console.error('Error manipulating DOM:', e);
    }

    // Force browser to reflow
    void modalElement.offsetHeight;

    return false; // Prevent default behavior
  }

  function showModal() {
    // Only show modal if we have a valid link ID
    if (!window.checkoutConfig?.link_id) {
      console.log('Cannot show modal: No link ID');
      return;
    }

    const modalElement = document.getElementById('orderSummaryModal');
    if (!modalElement) {
      console.log('Modal element not found');
      return;
    }

    // Force the modal to be visible with multiple approaches
    modalElement.classList.add('show');
    modalElement.style.display = 'flex';
    modalElement.style.visibility = 'visible';
    modalElement.style.opacity = '1';
    modalElement.style.zIndex = '1050';
    modalElement.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    // Log to confirm the modal is being shown
    console.log('Modal should be visible now:', {
      classList: modalElement.classList.contains('show'),
      display: modalElement.style.display,
      visibility: modalElement.style.visibility,
      zIndex: modalElement.style.zIndex
    });

    // Don't create backdrop if we're using the modal's own background
    if (!document.getElementById('simple-modal-backdrop') && false) { // disabled backdrop creation
      const backdrop = document.createElement('div');
      backdrop.id = 'simple-modal-backdrop';
      backdrop.className = 'modal-backdrop fade show';
      document.body.appendChild(backdrop);
    }
  }

  // Add a global closeModal function that can be called from anywhere
  window.forceCloseModal = function () {
    console.log('Force close modal called from global scope');
    const modal = document.getElementById('orderSummaryModal');
    if (modal) {
      modal.style.display = 'none';
      modal.style.visibility = 'hidden';
      modal.classList.remove('show');

      // Try the most aggressive approach - remove from DOM
      try {
        const parent = modal.parentNode;
        if (parent) {
          parent.removeChild(modal);
        }
      } catch (e) {
        console.error('Failed to remove modal from DOM:', e);
      }
    }

    document.querySelectorAll('.modal-backdrop, #simple-modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    return false; // Prevent default
  };

  // Add a global function to force show the modal
  window.forceShowModal = function () {
    console.log('Force show modal called from global scope');
    const modal = document.getElementById('orderSummaryModal');
    if (modal) {
      // Force the modal to be visible with multiple approaches
      modal.classList.add('show');
      modal.style.display = 'flex !important';
      modal.style.visibility = 'visible !important';
      modal.style.opacity = '1';
      modal.style.zIndex = '1050';
      document.body.classList.add('modal-open');

      // Force display with !important via attribute
      modal.setAttribute('style', 'display: flex !important; visibility: visible !important; opacity: 1 !important; z-index: 1050 !important;');

      return true;
    }
    return false;
  };

  // Event listeners for modal
  document.addEventListener('DOMContentLoaded', function () {
    // Check for stored discount and apply it if we're on the cart or checkout page
    checkAndApplyStoredDiscount();

    // Listen for custom refresh event from theme-editor-helper.js
    window.addEventListener('refresh-checkout-modal', function () {
      console.log('Refresh checkout modal event received');
      updateModalContent();
    });

    // Add CSS for the close button
    const styleSheet = document.createElement("link");
    styleSheet.rel = "stylesheet";
    styleSheet.href = "https://cdn.shopify.com/extensions/[EXTENSION_ID]/[VERSION]/assets/styles.css";
    document.head.appendChild(styleSheet);

    const modal = document.getElementById('orderSummaryModal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === this) {
          // console.log('Backdrop clicked');
          e.preventDefault();
          e.stopPropagation();
          closeModal();
          window.forceCloseModal(); // Call both methods
          return false;
        }
      });
    }

    // Add direct click handlers to the No Thanks button
    document.body.addEventListener('click', function (e) {
      if (e.target.classList.contains('close-button')) {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
        window.forceCloseModal();
        return false;
      }
    });
  });

  document.addEventListener('click', e => {
    if (e.target.classList.contains('no-thanks-btn')) {
      // console.log('No thanks button clicked via delegate');
      closeModal();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('orderSummaryModal')?.classList.contains('show')) {
      closeModal();
    }
  });

  // Function to set up sample data for theme editor preview
  function setupSampleDataForThemeEditor() {
    console.log('Setting up sample data for theme editor (internal function)');
    
    // Only set link_id if it doesn't exist
    window.checkoutConfig.link_id = window.checkoutConfig.link_id || 'sample-link-id';
    
    // First check if there are products in the theme editor settings
    const hasThemeEditorProducts = window.checkoutConfig.theme_editor &&
      window.checkoutConfig.theme_editor.selected_products &&
      window.checkoutConfig.theme_editor.selected_products.length > 0;

    if (hasThemeEditorProducts) {
      console.log('Using products from theme editor schema settings:', window.checkoutConfig.theme_editor.selected_products);
      // Use the schema-selected products in the main products array
      window.checkoutConfig.products = window.checkoutConfig.theme_editor.selected_products;
      return; // Exit function since we found products
    }

    // Check if products are already set from schema
    const hasProductsFromSchema = window.checkoutConfig.products && window.checkoutConfig.products.length > 0;
    console.log('Products from schema available:', hasProductsFromSchema);
    
    // Only set products if they don't exist and weren't set via schema or theme editor
    if (!hasProductsFromSchema) {
      console.log('No products from schema, using sample products');
      window.checkoutConfig.products = [
        {
          id: 'sample-product-1',
          title: 'Premium T-Shirt',
          price: '29.99',
          image: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png',
          quantity: 1
        },
        {
          id: 'sample-product-2',
          title: 'Stylish Hoodie',
          price: '49.99',
          image: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-2_large.png',
          quantity: 2
        },
        {
          id: 'sample-product-3',
          title: 'Designer Jeans',
          price: '79.99',
          image: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-3_large.png',
          quantity: 1
        }
      ];
    } else {
      console.log('Using products from schema:', window.checkoutConfig.products);
    }    // Set up currency code if not already set
    window.checkoutConfig.currency_code = window.checkoutConfig.currency_code || (window.Shopify ? (window.Shopify.currency?.active || 'USD') : 'USD');

    // Only set discount if it doesn't exist
    if (!window.checkoutConfig.discount || !window.checkoutConfig.discount.code) {
      window.checkoutConfig.discount = window.checkoutConfig.discount || {};
      window.checkoutConfig.discount.code = window.checkoutConfig.discount.code || 'SAMPLE20OFF';
      window.checkoutConfig.discount.value = window.checkoutConfig.discount.value || 20;
      window.checkoutConfig.discount.freeShipping = window.checkoutConfig.discount.freeShipping || true;
      window.checkoutConfig.discount.orderDiscount = window.checkoutConfig.discount.orderDiscount || true;
    }

    // IMPORTANT: Only set popup message properties if they don't exist from schema
    // This ensures schema settings take precedence
    window.checkoutConfig.popupMessage = window.checkoutConfig.popupMessage || {};

    // Apply theme editor settings first
    if (window.checkoutConfig.theme_editor) {
      console.log('Applying theme editor settings to popup:', window.checkoutConfig.theme_editor);

      // Heading text
      if (window.checkoutConfig.theme_editor.popup_title) {
        window.checkoutConfig.popupMessage.heading_text = window.checkoutConfig.theme_editor.popup_title;
      }

      // Message text
      if (window.checkoutConfig.theme_editor.popup_description) {
        window.checkoutConfig.popupMessage.message_text = window.checkoutConfig.theme_editor.popup_description;
      }

      // Countdown settings
      if (window.checkoutConfig.theme_editor.show_countdown !== undefined) {
        window.checkoutConfig.popupMessage.countdown_active = window.checkoutConfig.theme_editor.show_countdown;
      }

      if (window.checkoutConfig.theme_editor.countdown_time) {
        const countdownMinutes = Math.floor(parseInt(window.checkoutConfig.theme_editor.countdown_time, 10) / 60) || 10;
        window.checkoutConfig.popupMessage.timer_text = countdownMinutes + " minute";
      }

      if (window.checkoutConfig.theme_editor.countdown_label) {
        window.checkoutConfig.popupMessage.copy_text = window.checkoutConfig.theme_editor.countdown_label;
      }

      // Button text
      if (window.checkoutConfig.theme_editor.checkout_button_text) {
        window.checkoutConfig.popupMessage.checkout_button_text = window.checkoutConfig.theme_editor.checkout_button_text;
      }

      if (window.checkoutConfig.theme_editor.close_button_text) {
        window.checkoutConfig.popupMessage.close_button_text = window.checkoutConfig.theme_editor.close_button_text;
      }

      // Display settings
      if (window.checkoutConfig.theme_editor.show_price !== undefined) {
        window.checkoutConfig.popupMessage.show_price = window.checkoutConfig.theme_editor.show_price;
      }

      if (window.checkoutConfig.theme_editor.show_order_total !== undefined) {
        window.checkoutConfig.popupMessage.show_order_total = window.checkoutConfig.theme_editor.show_order_total;
      }

      if (window.checkoutConfig.theme_editor.allow_deselect !== undefined) {
        window.checkoutConfig.popupMessage.allow_deselect = window.checkoutConfig.theme_editor.allow_deselect;
      }
    }

    // Then fill in missing fields with defaults
    window.checkoutConfig.popupMessage.is_active = window.checkoutConfig.popupMessage.is_active ?? true;
    window.checkoutConfig.popupMessage.heading_text = window.checkoutConfig.popupMessage.heading_text || "Complete Your Order";
    window.checkoutConfig.popupMessage.message_text = window.checkoutConfig.popupMessage.message_text || "Add these recommended products to your cart before checkout. Limited time offer!";
    window.checkoutConfig.popupMessage.countdown_active = window.checkoutConfig.popupMessage.countdown_active ?? true;
    window.checkoutConfig.popupMessage.timer_text = window.checkoutConfig.popupMessage.timer_text || "10 minute";
    window.checkoutConfig.popupMessage.copy_text = window.checkoutConfig.popupMessage.copy_text || "This offer expires in:";
    window.checkoutConfig.popupMessage.allow_deselect = window.checkoutConfig.popupMessage.allow_deselect ?? true;
    window.checkoutConfig.popupMessage.show_price = window.checkoutConfig.popupMessage.show_price ?? true;
    window.checkoutConfig.popupMessage.show_order_total = window.checkoutConfig.popupMessage.show_order_total ?? true;
    window.checkoutConfig.popupMessage.checkout_button_text = window.checkoutConfig.popupMessage.checkout_button_text || "Add to Cart";
    window.checkoutConfig.popupMessage.close_button_text = window.checkoutConfig.popupMessage.close_button_text || "No Thanks";
    window.checkoutConfig.popupMessage.close_button_link = window.checkoutConfig.popupMessage.close_button_link || "#";

    console.log('Final popup configuration after applying schema settings:', window.checkoutConfig.popupMessage);

    // Initialize UI with the settings
    updateModalContent();

    // Override button actions for theme editor preview
    setTimeout(() => {
      // Find confirm button and override its click event for theme editor
      const confirmBtn = document.querySelector('.confirm-btn');
      if (confirmBtn) {
        // Remove existing event listeners (if any)
        const confirmBtnClone = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(confirmBtnClone, confirmBtn);

        // Add a demo-only click handler
        confirmBtnClone.addEventListener('click', function (e) {
          e.preventDefault();
          alert('This button would add the selected items to cart. (Demo mode in theme editor)');
          return false;
        });
      }

      // Find no thanks button and override its click event for theme editor
      const noThanksBtn = document.querySelector('.no-thanks');
      if (noThanksBtn) {
        // Remove existing event listeners (if any)
        const noThanksBtnClone = noThanksBtn.cloneNode(true);
        noThanksBtn.parentNode.replaceChild(noThanksBtnClone, noThanksBtn);

        // Add a demo-only click handler
        noThanksBtnClone.addEventListener('click', function (e) {
          e.preventDefault();
          alert('This button would close the popup. (Demo mode in theme editor)');
          return false;
        });
      }
    }, 1000); // Wait for the modal to be fully rendered
  }

  // Initialize
  const { linkId, discountCode } = getParamsFromUrl();
  console.log('Init with link ID:', linkId, 'and discount code:', discountCode);

  // Check if we're in the Shopify theme editor
  const isThemeEditor = window.Shopify && window.Shopify.designMode;
  console.log('Is in theme editor:', isThemeEditor);

  if (linkId) {
    fetchLinkData(linkId).then(() => {
      // After fetching data, ensure discount code from URL takes precedence
      if (discountCode) {
        console.log('Setting discount code from URL parameter:', discountCode);
        window.checkoutConfig.discount.code = discountCode;
      }

      // Apply schema settings to ensure all customizations are applied
      applySchemaSettings();

      // Ensure the modal HTML is in the correct state before showing
      const modalElement = document.getElementById('orderSummaryModal');
      if (modalElement) {
        // Reset first
        modalElement.style.display = 'none';
        modalElement.style.visibility = 'hidden';
        modalElement.classList.remove('show');

        // Delay a bit to ensure modal content is ready, then show
        setTimeout(showModal, 200);
      }

      // Make sure modal content is populated before showing
      if (modalElement && !modalElement.querySelector('.modal-content').children.length) {
        console.log('Modal content is empty, updating content before showing');
        updateModalContent();
      }

      // Double-check modal visibility after a short delay
      setTimeout(() => {
        const modalCheck = document.getElementById('orderSummaryModal');
        if (modalCheck && (modalCheck.style.display !== 'flex' || modalCheck.style.visibility !== 'visible')) {
          console.log('Modal still not visible, forcing display');
          modalCheck.style.display = 'flex !important';
          modalCheck.style.visibility = 'visible !important';
          modalCheck.classList.add('show');
        }
      }, 500);

      // Initialize order counting
      window.orderCounter.checkAndCount();
    }).catch((error) => {
      // Log detailed error
      console.error('Error fetching link data:', error);

      if (isThemeEditor) {
        // In theme editor, show sample data even on error
        console.log('In theme editor - showing sample modal despite fetch error');

        // First apply schema settings
        applySchemaSettings();

        // Then apply sample data for missing fields only
        setupSampleDataForThemeEditor();

        setTimeout(() => {
          showModal();
        }, 500);
      } else {
        // Don't show modal on error but ensure backdrop is removed
        ensureModalAndBackdropRemoved();
      }
    });
  } else if (isThemeEditor) {
    // In theme editor, set up sample data and preview
    console.log('In theme editor, checking for setupSampleDataForThemeEditor function');

    // First apply schema settings if available
    applySchemaSettings();

    // Then use the external helper function if available, otherwise use the local one
    if (typeof window.setupSampleDataForThemeEditor === 'function') {
      console.log('Using external setupSampleDataForThemeEditor function');
      window.setupSampleDataForThemeEditor();
    } else if (typeof setupSampleDataForThemeEditor === 'function') {
      console.log('Using local setupSampleDataForThemeEditor function');
      setupSampleDataForThemeEditor();
    } else {
      console.warn('Sample data function not found, but needed for theme editor preview');
    }

    // Show the modal after settings are applied
    setTimeout(showModal, 500);
  } else {
    // If no link ID and not in theme editor, don't show the modal
    console.log('No link ID found, modal will not be displayed');
    ensureModalAndBackdropRemoved();

    // Still check for order counting in case link_id is in session
    const sessionData = sessionStorage.getItem('checkout_links_session');
    if (sessionData) {
      try {
        const data = JSON.parse(sessionData);
        if (data.link_id) {
          window.checkoutConfig.link_id = data.link_id;
          window.orderCounter.checkAndCount();
        }
      } catch (e) {
        console.error('Failed to parse session data:', e);
      }
    }
  }

  // Make sure we don't block the page if modal isn't shown
  function ensureModalAndBackdropRemoved() {
    const modalElement = document.getElementById('orderSummaryModal');
    if (modalElement) {
      modalElement.style.display = 'none';
      modalElement.style.visibility = 'hidden';
      modalElement.style.opacity = '0';
      modalElement.style.zIndex = '-1';
      modalElement.setAttribute('aria-hidden', 'true');
    }

    // Remove any backdrops
    document.querySelectorAll('.modal-backdrop, #simple-modal-backdrop').forEach(el => el.remove());

    // Reset body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }


  // Function to check for stored discount and apply it
  function checkAndApplyStoredDiscount() {
    try {
      // Check if we're on cart or checkout page
      const isCartPage = window.location.pathname.includes('/cart');
      const isCheckoutPage = window.location.pathname.includes('/checkout');

      if (isCartPage || isCheckoutPage) {
        // Check if we have a stored discount
        const storedDiscountJson = localStorage.getItem('checkout_links_discount');
        if (storedDiscountJson) {
          const storedDiscount = JSON.parse(storedDiscountJson);

          // Check if discount is expired
          const now = new Date();
          const expires = new Date(storedDiscount.expires);
          if (now > expires) {
            // Discount expired, remove it
            localStorage.removeItem('checkout_links_discount');
            return;
          }

          // Get specific product IDs if they exist
          const specificProducts = storedDiscount.specific_products || [];
          const hasSpecificProducts = specificProducts.length > 0;

          // Apply discount to checkout
          if (isCheckoutPage && storedDiscount.discount_code) {
            // Check if discount is already applied (look for discount code in URL or page content)
            const discountInUrl = window.location.search.includes(`discount=${storedDiscount.discount_code}`);
            const discountInPage = document.body.textContent.includes(storedDiscount.discount_code);

            if (!discountInUrl && !discountInPage) {
              // Redirect to apply discount
              const separator = window.location.search ? '&' : '?';

              // Create URL with product-specific parameters if needed
              let redirectUrl = `${window.location.href}${separator}discount=${storedDiscount.discount_code}`;
              if (hasSpecificProducts) {
                redirectUrl += `&discount_specific_products=${specificProducts.join(',')}`;
              }

              window.location.href = redirectUrl;
            }
          }

          // If on cart page, make sure visual indicators show discount is applied
          if (isCartPage) {
            // Wait for cart to fully load
            setTimeout(() => {
              const discountNotice = document.createElement('div');
              discountNotice.className = 'checkout-links-discount-notice';
              discountNotice.style.padding = '10px';
              discountNotice.style.margin = '10px 0';
              discountNotice.style.backgroundColor = '#f8f9fa';
              discountNotice.style.border = '1px solid #ddd';
              discountNotice.style.borderRadius = '4px';
              discountNotice.style.fontSize = '14px';

              // Different messaging based on whether discount is for specific products or not
              if (hasSpecificProducts) {
                discountNotice.innerHTML = `
                  <p style="margin: 0; font-weight: bold;">Your discount code <span style="color: #28a745;">${storedDiscount.discount_code}</span> will be applied at checkout to your checkout link products only.</p>
                `;

                // Optionally highlight the specific products in the cart
                highlightSpecificProducts(specificProducts);
              } else {
                discountNotice.innerHTML = `
                  <p style="margin: 0; font-weight: bold;">Your discount code <span style="color: #28a745;">${storedDiscount.discount_code}</span> will be applied at checkout.</p>
                `;
              }

              // Find a good place to insert this notice
              const cartForm = document.querySelector('form[action="/cart"]');
              if (cartForm) {
                const subtotalRow = cartForm.querySelector('.cart__subtotal') ||
                  cartForm.querySelector('.cart-subtotal') ||
                  cartForm.querySelector('.totals');
                if (subtotalRow) {
                  subtotalRow.parentNode.insertBefore(discountNotice, subtotalRow);
                } else {
                  const checkoutButton = cartForm.querySelector('button[name="checkout"]');
                  if (checkoutButton) {
                    checkoutButton.parentNode.insertBefore(discountNotice, checkoutButton);
                  }
                }
              }
            }, 1000);
          }
        }
      }
    } catch (e) {
      console.error('Error checking/applying stored discount:', e);
    }
  }

  // Helper function to highlight specific products in the cart
  function highlightSpecificProducts(productIds) {
    setTimeout(() => {
      // Find all cart items
      const cartItems = document.querySelectorAll('.cart-item, .cart__item, .cart_item, [data-cart-item]');
      cartItems.forEach(item => {
        // Try to find the variant ID in this cart item
        const variantIdEl = item.querySelector('[data-variant-id], [name*="id"][value]');
        let variantId = null;

        if (variantIdEl) {
          variantId = parseInt(variantIdEl.dataset?.variantId || variantIdEl.value);
        } else {
          // Try to extract from the item's data attributes or class
          const itemId = item.dataset.variantId || item.dataset.id || item.dataset.cartItemKey;
          if (itemId) {
            // Extract numbers only
            const matches = itemId.match(/\d+/);
            if (matches) {
              variantId = parseInt(matches[0]);
            }
          }
        }

        // If this is one of our specific products, highlight it
        if (variantId && productIds.includes(variantId)) {
          // Add a visual indicator
          const indicator = document.createElement('div');
          indicator.className = 'checkout-link-product-indicator';
          indicator.style.background = '#f0f9ff';
          indicator.style.border = '1px solid #bde3ff';
          indicator.style.borderRadius = '3px';
          indicator.style.padding = '2px 6px';
          indicator.style.fontSize = '11px';
          indicator.style.marginTop = '4px';
          indicator.style.display = 'inline-block';
          indicator.textContent = 'Discount applies to this product';

          // Find a good place to append this
          const priceEl = item.querySelector('.cart-item__price, .product-price, .cart__item-price-container');
          if (priceEl) {
            priceEl.appendChild(indicator);
          } else {
            const itemDetails = item.querySelector('.cart-item__details, .cart-item__content, .cart__item-details');
            if (itemDetails) {
              itemDetails.appendChild(indicator);
            }
          }
        }
      });
    }, 500);
  }
});
