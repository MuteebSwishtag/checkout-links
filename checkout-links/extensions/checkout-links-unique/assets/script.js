/**
 * Checkout Links Unique Extension
 * Manages checkout popups, product selection, and cart integration
 */

// Initialize checkout configuration
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

// Add required CSS styles for the modal
(function () {
  // Add CSS for modal
  const style = document.createElement('style');
  style.textContent = `
    #orderSummaryModal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 1050;
      overflow: auto;
      align-items: center;
      justify-content: center;
    }
    #orderSummaryModal.show {
      display: flex !important;
    }
    #orderSummaryModal .modal-dialog {
      max-width: 500px;
      margin: 1.75rem auto;
      width: 100%;
    }
    #orderSummaryModal .modal-content {
      position: relative;
      background-color: #fff;
      border-radius: 0.3rem;
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5);
      padding: 20px;
    }
    .modal-open {
      overflow: hidden;
    }
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 1040;
    }
    .close-button {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 26px;
      height: 26px;
      cursor: pointer;
      color: #777;
      z-index: 10;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background-color: #f2f2f2;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid #e0e0e0;
      padding: 0;
    }
    .close-button:hover {
      color: #333;
      background-color: #e0e0e0;
      transform: scale(1.05);
    }
    .close-button:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }
    .close-button:before, .close-button:after {
      content: '';
      position: absolute;
      width: 14px;
      height: 2px;
      background-color: currentColor;
      border-radius: 1px;
      left: 50%;
      top: 50%;
      transform-origin: center;
      transition: transform 0.2s ease, background-color 0.2s ease, width 0.2s ease;
    }
    .close-button:before {
      transform: translate(-50%, -50%) rotate(45deg);
    }
    .close-button:after {
      transform: translate(-50%, -50%) rotate(-45deg);
    }
    .close-button:hover::before,
    .close-button:hover::after {
      width: 16px;
      background-color: #444;
    }
    .order-items {
      max-height: 300px;
      overflow-y: auto;
      margin: 15px 0;
    }
    .order-item {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid #eee;
    }
    .item-img-wrap {
      position: relative;
      margin-right: 15px;
    }
    .item-qty {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: #333;
      color: white;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .item-details {
      flex-grow: 1;
    }
    .product-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .product-price {
      color: #666;
    }
    .custom-checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid #ccc;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.3s, border-color 0.3s;
    }
    .product-checkbox {
      display: none;
    }
    .product-checkbox:checked + .custom-checkbox {
      background-color: var(--checkout-links-button-color, #4CAF50);
      border-color: var(--checkout-links-button-color, #4CAF50);
    }
    .checkbox-label {
      cursor: pointer;
    }
    .custom-checkbox svg {
      width: 14px;
      height: 14px;
      display: none;
    }
    .product-checkbox:checked + .custom-checkbox svg {
      display: block;
    }
    .order-total-row, .discount-row {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #eee;
      font-weight: bold;
    }
    .confirm-btn {
      display: block;
      width: 100%;
      padding: 12px;
      margin-top: 20px;
      background-color: var(--checkout-links-button-color, #4CAF50);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    .confirm-btn:hover {
      background-color: var(--checkout-links-button-hover, #45a049);
    }
    .no-thanks {
      display: block;
      text-align: center;
      margin-top: 15px;
      color: #666;
      text-decoration: none;
    }
    .no-thanks:hover {
      text-decoration: underline;
    }
    .order-title {
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 24px;
    }
    .order-desc {
      margin-bottom: 20px;
      color: #666;
    }
  `;
  document.head.appendChild(style);
})();

// Helper function to ensure theme editor disclaimer is present
window.ensureThemeEditorDisclaimer = function (modalContent) {
  // Only add disclaimer in theme editor mode
  if (!window.Shopify || !window.Shopify.designMode) return;

  if (!modalContent) {
    modalContent = document.querySelector('.modal-content');
    if (!modalContent) return;
  }

  // Check if disclaimer already exists
  let disclaimer = modalContent.querySelector('.theme-editor-disclaimer');

  if (!disclaimer) {
    disclaimer = document.createElement('div');
    disclaimer.className = 'theme-editor-disclaimer';
    disclaimer.textContent = 'This popup here is for preview only. For full functionality, please use the Checkout Links App.';

    // Insert at the top of modal content
    if (modalContent.firstChild) {
      modalContent.insertBefore(disclaimer, modalContent.firstChild);
    } else {
      modalContent.appendChild(disclaimer);
    }
  }

  return disclaimer;
};

// Load theme editor tools
(function () {
  if (window.Shopify && window.Shopify.designMode) {
    // Theme editor detected - debug tools loaded automatically
  }
})();

/**
 * Order tracking functionality
 */
window.orderCounter = {
  countOrder: function () {
    const linkId = window.checkoutConfig?.link_id;
    if (!linkId) return;

    this.sendOrderCount(linkId);
    this.storeLocalCount(linkId);
  },

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
    }).catch(error => {
      // Error handling silently fails to avoid disrupting user experience
    });
  },

  storeLocalCount: function (linkId) {
    try {
      const countKey = `checkout_links_count_${linkId}`;
      const currentCount = parseInt(localStorage.getItem(countKey) || '0');
      localStorage.setItem(countKey, (currentCount + 1).toString());
    } catch (error) {
      // Silent fail for localStorage errors
    }
  },

  checkAndCount: function () {
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

    if (isThankYouPage && window.checkoutConfig?.link_id) {
      setTimeout(() => {
        this.countOrder();
      }, 1000);
    }
  }
};

/**
 * Function to check for stored discount and apply it
 */
function checkAndApplyStoredDiscount() {
  try {
    // Check if we're on cart or checkout page
    const isCartPage = window.location.pathname.includes('/cart');
    const isCheckoutPage = window.location.pathname.includes('/checkout');

    if (isCartPage || isCheckoutPage) {
      console.log('On cart/checkout page, checking for stored discount');

      // Check if we have a stored discount
      const storedDiscountJson = localStorage.getItem('checkout_links_discount');
      if (storedDiscountJson) {
        console.log('Found stored discount:', storedDiscountJson);
        const storedDiscount = JSON.parse(storedDiscountJson);

        // Check if discount is expired
        const now = new Date();
        const expires = new Date(storedDiscount.expires);
        if (now > expires) {
          // Discount expired, remove it
          console.log('Discount expired, removing from storage');
          localStorage.removeItem('checkout_links_discount');
          return;
        }

        // Get specific product IDs if they exist
        const specificProducts = storedDiscount.specific_products || [];
        const hasSpecificProducts = specificProducts.length > 0;

        // Apply discount to checkout
        if (isCheckoutPage && storedDiscount.discount_code) {
          // Check if discount is already applied (look for discount code in URL or page content)
          const discountInUrl = window.location.search.includes(`discount=${encodeURIComponent(storedDiscount.discount_code)}`) ||
            window.location.pathname.includes(`/discount/${storedDiscount.discount_code}`);
          const discountInPage = document.body.textContent.includes(storedDiscount.discount_code);

          if (!discountInUrl && !discountInPage) {
            console.log('Discount not applied yet, redirecting to apply:', storedDiscount.discount_code);

            // Choose the appropriate discount URL format based on the discount code
            let redirectUrl;

            if (storedDiscount.discount_code.includes('FREESHIP') || storedDiscount.free_shipping) {
              // For free shipping codes, use the /discount/CODE format which is more reliable
              // First check if we're already at checkout
              if (window.location.pathname.startsWith('/checkout')) {
                // We're at checkout, add the discount code to the path
                const baseCheckoutUrl = window.location.pathname.split('/discount/')[0].split('?')[0];
                redirectUrl = `${baseCheckoutUrl}/discount/${encodeURIComponent(storedDiscount.discount_code)}`;

                // Preserve any other query parameters
                const currentSearch = new URLSearchParams(window.location.search);
                currentSearch.delete('discount'); // Remove any existing discount parameter
                const searchString = currentSearch.toString();

                if (searchString || hasSpecificProducts) {
                  redirectUrl += '?';
                  if (searchString) {
                    redirectUrl += searchString;
                  }
                  if (hasSpecificProducts) {
                    redirectUrl += (searchString ? '&' : '') + `discount_specific_products=${specificProducts.join(',')}`;
                  }
                }
              } else {
                // We're not at checkout yet, redirect to checkout with discount
                redirectUrl = `/checkout/discount/${encodeURIComponent(storedDiscount.discount_code)}`;
                if (hasSpecificProducts) {
                  redirectUrl += `?discount_specific_products=${specificProducts.join(',')}`;
                }
              }
            } else {
              // For regular discount codes, try the query parameter approach
              const separator = window.location.search ? '&' : '?';
              redirectUrl = `${window.location.href}${separator}discount=${encodeURIComponent(storedDiscount.discount_code)}`;
              if (hasSpecificProducts) {
                redirectUrl += `&discount_specific_products=${specificProducts.join(',')}`;
              }
            }

            console.log('Redirecting to apply discount:', redirectUrl);
            window.location.href = redirectUrl;
          } else {
            console.log('Discount already applied in URL or page');
          }
        }

        // If on cart page, make sure visual indicators show discount is applied
        if (isCartPage) {
          // Wait for cart to fully load
          setTimeout(() => {
            console.log('Adding discount indicator to cart page');
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
      } else {
        console.log('No stored discount found');
      }
    }
  } catch (e) {
    console.error('Error checking/applying stored discount:', e);
  }
}

/**
 * Helper function to highlight specific products in the cart
 */
function highlightSpecificProducts(productIds) {
  setTimeout(() => {
    console.log('Highlighting specific products in cart:', productIds);
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
        console.log('Found matching product in cart:', variantId);
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

document.addEventListener('DOMContentLoaded', function () {
  // Check for stored discount and apply it if we're on the cart or checkout page
  checkAndApplyStoredDiscount();

  // Initialize modal behavior and hide any visible modals
  const initialModalElement = document.getElementById('orderSummaryModal');
  if (initialModalElement) {
    initialModalElement.style.display = 'none';
    initialModalElement.style.visibility = 'hidden';
    initialModalElement.classList.remove('show');
    initialModalElement.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  /**
   * Applies schema settings to storefront popup
   */
  function applySchemaSettings() {
    if (window.checkoutConfig && window.checkoutConfig.popupMessage) {
      // Apply button color from settings
      if (window.checkoutConfig.theme_editor && window.checkoutConfig.theme_editor.button_color) {
        document.documentElement.style.setProperty('--checkout-links-button-color', window.checkoutConfig.theme_editor.button_color);
      }

      // Update the modal content to reflect current settings
      window.updateModalContent();
    }
  }

  /**
   * Applies custom CSS and brand colors
   */
  function applyBrandStylesAndCustomCSS(linkData) {
    // Extract settings from different possible locations
    let customCss = null;
    let brandColor = null;

    // Check in linkData.user.settings (based on the actual data structure from logs)
    if (linkData.user?.settings) {
      // Properly handle the settings array structure we've seen in the logs
      if (Array.isArray(linkData.user.settings)) {
        const cssEntry = linkData.user.settings.find(s => s.key === 'custom_css');
        if (cssEntry && cssEntry.value) {
          customCss = cssEntry.value;
        }

        const colorEntry = linkData.user.settings.find(s => s.key === 'brand_color_hex');
        if (colorEntry && colorEntry.value) {
          brandColor = colorEntry.value;
        }
      } else if (typeof linkData.user.settings === 'object') {
        // Fallback for object format
        customCss = linkData.user.settings.custom_css;
        brandColor = linkData.user.settings.brand_color_hex;
      }
    }

    // Check in linkData.settings if not found
    if (!customCss && linkData.settings) {
      if (Array.isArray(linkData.settings)) {
        const cssEntry = linkData.settings.find(s => s.key === 'custom_css');
        if (cssEntry && cssEntry.value) {
          customCss = cssEntry.value;
        }
      } else if (typeof linkData.settings === 'object') {
        customCss = linkData.settings.custom_css;
      }
    }

    // Check in popup_message if not found
    if (!customCss && linkData.popup_message?.custom_css) {
      customCss = linkData.popup_message.custom_css;
    }

    console.log('Custom CSS found:', customCss ? 'Yes' : 'No');

    // Apply custom CSS if available
    if (customCss) {
      // console.log('Applying custom CSS to modal', customCss);

      if (customCss) {
        // console.log('Applying custom CSS to modal - length:', customCss.length);
        // console.log('First 100 chars of CSS:', customCss.substring(0, 100));
      // Create a style element
        const styleElement = document.createElement('style');

        // Make sure the modal has our identifier class
        const modalElement = document.getElementById('orderSummaryModal');
        if (modalElement && !modalElement.classList.contains('checkout-links-popup')) {
          modalElement.classList.add('checkout-links-popup');
        }

        // List of all our modal-specific class prefixes and IDs for better targeting
        const modalSpecificSelectors = [
          '#orderSummaryModal',
          '.modal-',
          '.order-',
          '.item-',
          '.product-',
          '.confirm-btn',
          '.no-thanks',
          '.countdown-',
          '.discount-',
          '.total-',
          '.checkbox-',
          '.custom-checkbox',
          '.theme-editor-disclaimer',
          '.checkout-links-'
        ];

        // Process the CSS to scope it properly
        let scopedCss = '';
        try {
          // Split CSS into rules
          const cssRules = customCss.split('}');

          for (let i = 0; i < cssRules.length; i++) {
            const rule = cssRules[i].trim();
            if (!rule) continue;

            // Split into selector and declaration parts
            const ruleMatch = rule.split('{');
            if (ruleMatch.length !== 2) continue;

            const selectors = ruleMatch[0].split(',');
            const declarations = ruleMatch[1].trim();

            // Process each selector
            const scopedSelectors = selectors.map(selector => {
              selector = selector.trim();

              // If this is targeting the body or html, we need special handling
              if (selector === 'body' || selector === 'html') {
                return `#orderSummaryModal ${selector}`;
              }

              // Check if this selector is already specific to our modal elements
              const isModalSpecific = modalSpecificSelectors.some(prefix =>
                selector === prefix || selector.startsWith(prefix) || selector.includes(prefix)
              );

              // For selectors already targeting our modal elements, don't add additional scoping
              if (isModalSpecific) {
                return selector;
              }

              // If selector has :root, replace it with our modal ID
              if (selector.includes(':root')) {
                return selector.replace(':root', '#orderSummaryModal');
              }

              // For all other selectors, scope them to our modal
              return `#orderSummaryModal ${selector}`;
            });

            // Rebuild the rule with properly scoped selectors
            scopedCss += scopedSelectors.join(', ') + ' {' + declarations + '}\n';
          }
        } catch (error) {
          console.error('Error processing custom CSS:', error);
          // If parsing fails, use the original CSS
          scopedCss = customCss;
        }

        // Apply the scoped CSS
        styleElement.textContent = scopedCss;
        document.head.appendChild(styleElement);

        // Log for debugging
        // console.log('Applied custom CSS to modal');
        // console.log('First 100 chars of processed CSS:', scopedCss.substring(0, 100));
      }
    }

    // Set confirm button background color
    // Try to get brand color if not already found
    if (!brandColor) {
      // Check in linkData.settings - using the same array structure we saw in logs
      if (linkData.settings) {
        if (Array.isArray(linkData.settings)) {
          const colorEntry = linkData.settings.find(s => s.key === 'brand_color_hex');
          if (colorEntry && colorEntry.value) {
            brandColor = colorEntry.value;
          }
        } else if (typeof linkData.settings === 'object') {
          brandColor = linkData.settings.brand_color_hex;
        }
      }

      // Check in popup_message
      if (!brandColor && linkData.popup_message?.brand_color_hex) {
        brandColor = linkData.popup_message.brand_color_hex;
      }

      // Fallback to theme color
      if (!brandColor && window.checkoutConfig?.theme_editor?.button_color) {
        brandColor = window.checkoutConfig.theme_editor.button_color;
      }
    }

    // console.log('Brand color found:', brandColor || 'No');

    if (brandColor) {
      setTimeout(() => {
        const confirmBtn = document.querySelector('.confirm-btn');
        if (confirmBtn) {
          // console.log('Applying brand color to confirm button:', brandColor);
          confirmBtn.style.backgroundColor = brandColor;
        }
      }, 200);
    }
  }

  /**
   * Gets URL parameters and updates configuration
   */
  function getParamsFromUrl() {
    // console.log('Checking URL parameters');
    const urlParams = new URLSearchParams(window.location.search);
    let linkId = urlParams.get('link_id');
    let backendUrl = urlParams.get('backend_url');
    let discountCode = urlParams.get('discount_code');

    // console.log('URL params:', { linkId, backendUrl, discountCode });

    // Use fallbacks if available from hardcoded config or data attributes
    if (!linkId) {
      const dataLinkElement = document.querySelector('[data-link-id]');
      linkId = dataLinkElement?.dataset.linkId || '';
      // console.log('Using data-link-id fallback:', linkId, 'from element:', dataLinkElement);
    }
    if (!backendUrl) {
      backendUrl = document.querySelector('[data-backend-url]')?.dataset.backendUrl || '';
      // console.log('Using data-backend-url fallback:', backendUrl);
    }
    if (!discountCode) {
      discountCode = document.querySelector('[data-discount-code]')?.dataset.discountCode || '';
      // console.log('Using data-discount-code fallback:', discountCode);
    }

    if (backendUrl) {
      try {
        // Normalize backend URL
        const url = new URL(backendUrl);
        backendUrl = url.toString().replace(/\/+$/, '');
        // console.log('Normalized backend URL:', backendUrl);
      } catch (e) {
        console.log('Invalid backend URL, using as-is:', backendUrl);
      }
    }

    if (window.checkoutConfig) {
      if (linkId) {
        window.checkoutConfig.link_id = linkId;
        // console.log('Updated checkoutConfig.link_id:', linkId);
      }
      if (backendUrl) {
        window.checkoutConfig.backendUrl = backendUrl;
        // console.log('Updated checkoutConfig.backendUrl:', backendUrl);
      }

      // Make sure we properly handle the discount code
      if (discountCode) {
        // Always create a proper discount object
        if (!window.checkoutConfig.discount) {
          window.checkoutConfig.discount = {
            code: discountCode,
            value: parseFloat(discountCode) || 0,
            freeShipping: discountCode.includes('FREESHIP'),
            orderDiscount: true
          };
          console.log('Created checkoutConfig.discount:', window.checkoutConfig.discount);
        } else {
          window.checkoutConfig.discount.code = discountCode;
          // Try to extract numeric value from discount code if it contains numbers
          const numericMatch = discountCode.match(/(\d+(\.\d+)?)/);
          if (numericMatch) {
            window.checkoutConfig.discount.value = parseFloat(numericMatch[0]) || 0;
          }
          console.log('Updated checkoutConfig.discount:', window.checkoutConfig.discount);
        }

    // Store the discount in localStorage immediately for persistence
        try {
          localStorage.setItem('checkout_links_discount', JSON.stringify({
            link_id: window.checkoutConfig.link_id,
            discount_code: discountCode,
            discount_value: window.checkoutConfig.discount.value || 0,
            order_discount: window.checkoutConfig.discount.orderDiscount || true,
            free_shipping: window.checkoutConfig.discount.freeShipping || false,
            specific_products: [], // Will be populated when products are added to cart
            expires: new Date(new Date().getTime() + (24 * 60 * 60 * 1000)).toISOString() // 24 hours from now
          }));
          console.log('Stored initial discount in localStorage');
        } catch (e) {
          console.error('Failed to store discount in localStorage:', e);
        }
      }
    } else {
      console.log('Warning: window.checkoutConfig is not available');
    }

    return { linkId, backendUrl, discountCode };
  }

  /**
   * Fetches link data from backend
   */
  async function fetchLinkData(linkId) {
    // Validate link ID
    if (!linkId || linkId.trim() === '') {
      initializeUIWithFallbackData();
      return;
    }

    let backendUrl = window.checkoutConfig?.backendUrl;

    if (!backendUrl) {
      initializeUIWithFallbackData();
      return;
    }

    try {
      new URL(backendUrl); // Validate URL
      backendUrl = backendUrl.replace(/\/+$/, '');
    } catch (e) {
      initializeUIWithFallbackData();
      return;
    }

    const isNgrok = backendUrl.includes('ngrok');
    const baseHeaders = {
      Accept: 'application/json',
      ...(isNgrok && { 'ngrok-skip-browser-warning': '69420' }),
    };

    const endpoint = `${backendUrl}/api/links/${linkId}`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: baseHeaders
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched link data from API:', data);

      if (data.success && data.link) {
        console.log('Valid link data received:', data.link);

        updateCheckoutConfig(data.link);
        initializeUI();
        return;
      }

      throw new Error('Invalid data structure');
    } catch (err) {
    // Use fallback data if API call fails
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
    }
  }

  /**
   * Updates checkout configuration with API data
   */
  function updateCheckoutConfig(linkData) {
    if (!window.checkoutConfig) return;

    // Store the original link data for reference
    window.checkoutConfig.link = linkData;
    console.log('Fetched link data:', linkData);

    // Try to apply custom CSS as early as possible if link data has user settings
    if (linkData.user?.settings) {
      console.log('Link data has user settings, attempting early CSS application');
      setTimeout(() => applyBrandStylesAndCustomCSS(linkData), 0);
    }

    // Get variants
    const variants = linkData.linked_variants || linkData.linkedVariants || [];
    const allVariants = [];

    if (variants && variants.length > 0) {
      variants.forEach(item => {
        const variant = item.variant || {};
        const product = variant.product || {};
        // console.log('Processing variant:', variant, 'Product:', product);

        allVariants.push({
          id: variant.shopify_product_varient_id,
          title: `${product.title || 'Product'} - ${variant.title || 'Variant'}`,
          price: item.price || variant.price || '0.00',
          image: product.media && product.media[0] ? product.media[0].src : '',
          quantity: 1,
          productId: product.id,
          linkVariantId: variant.shopify_product_varient_id

        });
      });
    }

    // Update products
    window.checkoutConfig.products = allVariants;

    // Update discount - be more careful with this
    console.log('Processing discount from link data:', {
      discount_code: linkData.discount_code,
      discount_value: linkData.discount_value,
      free_shipping: linkData.free_shipping,
      order_discount: linkData.order_discount
    });

    // Only update discount if we have a value and don't already have a discount code from URL params
    if (linkData.discount_code || linkData.discount_value) {
      const existingCode = window.checkoutConfig.discount?.code;

      // If we already have a discount code from the URL, keep that but update other properties
      if (existingCode && existingCode !== linkData.discount_code) {
        console.log('Keeping existing discount code from URL:', existingCode);
        window.checkoutConfig.discount = {
          code: existingCode, // Keep existing code
          value: linkData.discount_value || window.checkoutConfig.discount?.value || 0,
          freeShipping: !!linkData.free_shipping,
          orderDiscount: !!linkData.order_discount
        };
      } else {
        // No existing code or same code, use what's in the link data
        window.checkoutConfig.discount = {
          code: linkData.discount_code || existingCode || '',
          value: linkData.discount_value || 0,
          freeShipping: !!linkData.free_shipping,
          orderDiscount: !!linkData.order_discount
        };
      }

      console.log('Updated discount config:', window.checkoutConfig.discount);
    }

    // Update popup message
    if (linkData.popup_message) {
      window.checkoutConfig.popupMessage = linkData.popup_message;

      // Convert database numeric values to proper booleans
      if (typeof linkData.popup_message.allow_deselect !== 'undefined') {
        window.checkoutConfig.popupMessage.allow_deselect = !!linkData.popup_message.allow_deselect;
        console.log('Converted allow_deselect from', linkData.popup_message.allow_deselect, 'to', window.checkoutConfig.popupMessage.allow_deselect);
      }
      if (typeof linkData.popup_message.countdown_active !== 'undefined') {
        window.checkoutConfig.popupMessage.countdown_active = !!linkData.popup_message.countdown_active;
      }
      if (typeof linkData.popup_message.show_price !== 'undefined') {
        window.checkoutConfig.popupMessage.show_price = !!linkData.popup_message.show_price;
      }
      if (typeof linkData.popup_message.show_order_total !== 'undefined') {
        window.checkoutConfig.popupMessage.show_order_total = !!linkData.popup_message.show_order_total;
      }
      if (typeof linkData.popup_message.is_active !== 'undefined') {
        window.checkoutConfig.popupMessage.is_active = !!linkData.popup_message.is_active;
      }

      // Store countdown settings
      if (linkData.popup_message.countdown_active) {
        window.checkoutConfig.countdown_active = !!linkData.popup_message.countdown_active;
      }

      // Extract countdown time from timer_text if needed
      if (linkData.popup_message.timer_text) {
        const minutesMatch = linkData.popup_message.timer_text.match(/(\d+)\s*minute/i);
        if (minutesMatch && minutesMatch[1]) {
          const minutes = parseInt(minutesMatch[1], 10);
          if (!isNaN(minutes)) {
            window.checkoutConfig.countdown_time = minutes * 60;
          }
        }
      }

      // Use specific countdown time if provided
      if (linkData.popup_message.countdown_time) {
        window.checkoutConfig.countdown_time = parseInt(linkData.popup_message.countdown_time, 10);
      }
    }
  }

  /**
   * Initializes UI with fallback data
   */
  function initializeUIWithFallbackData() {
    // Only continue if we have a link ID
    if (!window.checkoutConfig?.link_id) {
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
          <p style="color: red; margin-top: 15px;">⚠️ Ngrok connection required</p>
          <p style="font-size: 12px; margin: 5px 0;">Please allow connections to ngrok.io in your browser</p>
        `;
        modalContent.appendChild(ngrokHelper);
      }
    }

    // Ensure products array exists
    if (!window.checkoutConfig.products) {
      window.checkoutConfig.products = [];
    }

    // Apply brand styles and custom CSS if link data exists
    if (window.checkoutConfig.link) {
      applyBrandStylesAndCustomCSS(window.checkoutConfig.link);
    }

    window.updateModalContent();

    // Show the modal - this is needed for the popup to appear
    showModal();
  }

  /**
   * Initializes UI with fetched data
   */
  function initializeUI() {
    // Save original link countdown time before updateModalContent potentially changes it
    const originalCountdownTime = window.checkoutConfig.countdown_time;
    const originalCountdownActive = window.checkoutConfig.countdown_active;

    // Apply brand styles and custom CSS before updating modal content
    if (window.checkoutConfig.link) {
      applyBrandStylesAndCustomCSS(window.checkoutConfig.link);
    }

    // Update the modal content
    window.updateModalContent();

    // Restore original countdown settings from link if they exist
    if (originalCountdownTime) {
      window.checkoutConfig.countdown_time = originalCountdownTime;
    }

    if (originalCountdownActive !== undefined) {
      window.checkoutConfig.countdown_active = originalCountdownActive;
    }

    // Initialize countdown with link settings
    if (window.checkoutConfig.popupMessage?.countdown_active) {
      window.initializeCountdown(window.checkoutConfig.popupMessage.timer_text);
    }

    // Show the modal - this is needed for the popup to appear
    showModal();
  }

  /**
   * Initializes countdown timer
   */
  window.initializeCountdown = function (timerText) {
    // Try to match minutes from text
    const minutesMatch = timerText ? timerText.match(/(\d+)\s*minute/i) : null;

    // Check if we're in the Shopify theme editor
    const isThemeEditor = window.Shopify && window.Shopify.designMode;

    // Get seconds from countdown configuration
    let secondsRemaining;

    // Priority order for countdown time:
    // 1. window.checkoutConfig.countdown_time (directly from link data)
    // 2. Extract from timer_text
    // 3. Default fallback (600 seconds/10 minutes)

    if (window.checkoutConfig.countdown_time) {
      secondsRemaining = parseInt(window.checkoutConfig.countdown_time);
    } else if (minutesMatch && minutesMatch[1]) {
      const minutes = parseInt(minutesMatch[1], 10);
      secondsRemaining = !isNaN(minutes) ? minutes * 60 : 600;
    } else {
      secondsRemaining = 600; // Default: 10 minutes
    }

    let countdownEl = document.querySelector('.countdown-timer');
    if (!countdownEl) {
      countdownEl = document.createElement('div');
      countdownEl.className = 'countdown-timer';
      const modalBody = document.querySelector('.modal-body');
      if (modalBody) {
        modalBody.insertBefore(countdownEl, modalBody.firstChild);
      }
    }

    // Find existing countdown time element or create a new one
    let countdownTimeEl = countdownEl.querySelector('.countdown-time');
    if (!countdownTimeEl) {
      countdownTimeEl = document.createElement('div');
      countdownTimeEl.className = 'countdown-time';
      countdownEl.appendChild(countdownTimeEl);
    }

    // Check if expiration message already exists, create only if it doesn't
    let expirationMessageEl = countdownEl.querySelector('.expiration-message');
    if (!expirationMessageEl) {
      expirationMessageEl = document.createElement('div');
      expirationMessageEl.className = 'expiration-message';
      expirationMessageEl.style.color = '#e74c3c';
      expirationMessageEl.style.fontWeight = 'bold';
      expirationMessageEl.style.marginTop = '10px';
      expirationMessageEl.style.display = 'none';
      expirationMessageEl.textContent = 'Offer expired! Discount no longer available.';
      countdownEl.appendChild(expirationMessageEl);
    }

    // Style countdown elements
    countdownEl.style.alignItems = 'center';
    countdownEl.style.margin = '15px 0';
    countdownEl.style.padding = '10px';

    // Check for and potentially create the countdown label
    let countdownLabel = countdownEl.querySelector('.countdown-label');
    if (!countdownLabel) {
      countdownLabel = document.createElement('div');
      countdownLabel.className = 'countdown-label';
      countdownLabel.textContent = window.checkoutConfig.popupMessage?.copy_text || 'This offer will expire in:';
      countdownEl.insertBefore(countdownLabel, countdownEl.firstChild);
    }

    // Style countdown label
    countdownLabel.style.fontSize = '15px';
    countdownLabel.style.color = '#666';

    function updateDisplay() {
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;

      countdownTimeEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      countdownTimeEl.style.display = 'block';
      countdownEl.style.display = 'flex';
    }

    function handleExpiration() {
      // Remove the timer element
      countdownTimeEl.style.display = 'none';

      // We already have reference to countdownLabel
      if (countdownLabel) {
        countdownLabel.style.display = 'none';
      }

      // Show expiration message
      expirationMessageEl.style.display = 'block';

      // Remove any discount from the checkout config
      if (window.checkoutConfig.discount) {
        window.checkoutConfig.discount.expired = true;
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
        confirmBtn.textContent = "Proceed Without Discount";
      }
    }

    // Initial display
    updateDisplay();

    // Style countdown time
    if (countdownTimeEl) {
      countdownTimeEl.style.fontSize = '18px';
      countdownTimeEl.style.fontWeight = 'bold';
      countdownTimeEl.style.color = '#000';
    }

    // Clear any existing intervals to prevent multiple timers
    if (window.countdownInterval) {
      clearInterval(window.countdownInterval);
    }

    // Update timer every second
    window.countdownInterval = setInterval(() => {
      secondsRemaining--;
      if (secondsRemaining <= 0) {
        clearInterval(window.countdownInterval);
        handleExpiration();
      } else {
        updateDisplay();
      }
    }, 1000);
  };

  /**
   * Updates modal content
   */
  window.updateModalContent = function () {
    const modalContent = document.querySelector('.modal-content');
    if (!modalContent || !window.checkoutConfig) return;

    // Save the disclaimer element if we're in theme editor
    const isThemeEditor = window.Shopify && window.Shopify.designMode;
    let disclaimerElement = null;
    if (isThemeEditor) {
      disclaimerElement = modalContent.querySelector('.theme-editor-disclaimer');
    }

    // Check if there are products linked to this link
    const hasProducts = window.checkoutConfig.products && window.checkoutConfig.products.length > 0;

    if (!hasProducts) {
      // Display message when no products are linked
      modalContent.innerHTML = `
        <button type="button" class="close-button" onclick="window.forceCloseModal(); return false;" aria-label="Close popup"></button>
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
          window.forceCloseModal();
          return false;
        });
      }
      return;
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
      <div class="modal-body">
        <h2 class="order-title">${window.checkoutConfig.popupMessage?.heading_text || 'Order Summary'}</h2>
        <p class="order-desc">${window.checkoutConfig.popupMessage?.message_text || ''}</p>
        ${window.checkoutConfig.popupMessage?.countdown_active ? `
        <div class="countdown-timer" style="display: flex !important;  align-items: center; margin: 15px 0; padding: 15px; ">
          <div class="countdown-label" style="font-size: 16px; color: #333; margin-bottom: 5px; font-weight: 500;">${window.checkoutConfig.popupMessage?.copy_text || 'This offer will expire in:'}</div>
          <div class="countdown-time" style="font-size: 16px; font-weight: bold; color: #000; font-family: monospace; margin-bottom: 5px;"></div>
        </div>
        ` : ''}
        <div class="order-items scrollable">
          ${(window.checkoutConfig.products || []).map(product => `
            <div class="order-item" data-product-id="${product.id}" data-link-variant-id="${product.linkVariantId || ''}">
              <div class="item-img-wrap">
                <img
                  src="${product.image}" 
                  alt="${product.title}" 
                  onerror="this.onerror=null;this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22 viewBox=%220 0 50 50%22%3E%3Crect x=%225%22 y=%225%22 width=%2240%22 height=%2240%22 rx=%2210%22 fill=%22%23f3f3f3%22 stroke=%22%23999%22 stroke-width=%222%22/%3E%3Ccircle cx=%2235%22 cy=%2216%22 r=%222%22 fill=%22%23999%22/%3E%3Cpath d=%22M18 35L25 28C26.5 26.5 29.5 26.5 31 28L35 32C36.5 34 39.5 34 41 32L43 30%22 stroke=%22%23999%22 stroke-width=%221.5%22 fill=%22none%22/%3E%3C/svg%3E';"
                  width="50"
                  height="50"
                />
                <div class="item-qty">${product.quantity}</div>
              </div>
              <div class="item-details">
                <div class="product-title">${product.title}</div>
                ${window.checkoutConfig.popupMessage?.show_price ? `<div class="product-price">$${(parseFloat(product.price) || 0).toFixed(2)}</div>` : ''}
              </div>
              ${window.checkoutConfig.popupMessage?.allow_deselect === false ? '' : `
              <div class="item-check">
                <label class="checkbox-label">
                  <input type="checkbox" checked class="product-checkbox" data-price="${product.price}" data-quantity="${product.quantity || 1}">
                  <div class="custom-checkbox">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                  </div>
                </label>
              </div>`}
            </div>
          `).join('')}
        </div>
        ${window.checkoutConfig.popupMessage?.show_order_total ? `
        <div class="order-total-row">
          <div class="total-label" style="font-weight: bold; font-size: 24px;">Total</div>
          <div class="total-amount" style="font-weight: bold; font-size: 24px;">
             $<span class="total-value" style="font-weight: bold; font-size: 24px;" >${total.toFixed(2)}</span>
          </div>
        </div>
        <div class="discount-info" style="font-size: 12px; color: #000; margin: 16px 0px; display: flex; align-items: center; gap: 5px;">
            <svg width="24" height="24" viewBox="0 0 32 32" id="tag">
            <path fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M29 14.17V3H17.83a2 2 0 0 0-1.42.59L3 17l12 12 13.41-13.41a2 2 0 0 0 .59-1.42Z"></path>
            <circle cx="23" cy="9" r="2"></circle>
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

    // Apply button color if specified in settings
    if (window.checkoutConfig.theme_editor && window.checkoutConfig.theme_editor.button_color) {
      const confirmButton = document.querySelector('.confirm-btn');
      if (confirmButton) {
        confirmButton.style.backgroundColor = window.checkoutConfig.theme_editor.button_color;
      }
    }

    // Initialize countdown if active
    if (window.checkoutConfig.popupMessage?.countdown_active) {
      window.initializeCountdown(window.checkoutConfig.popupMessage?.timer_text);
    }

    // Ensure the theme editor disclaimer is present when in theme editor mode
    if (typeof window.ensureThemeEditorDisclaimer === 'function') {
      window.ensureThemeEditorDisclaimer(modalContent);
    }

    // Setup event listeners
    attachEventListeners();
  };

  /**
   * Helper function to handle maximum quantity errors
   */
  async function handleMaxQuantityError(cartItems, confirmBtn) {
    try {
      // Get current cart
      const cartResponse = await fetch('/cart.js', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!cartResponse.ok) {
        throw new Error('Could not retrieve cart information');
      }

      const cart = await cartResponse.json();

      // Redirect to cart since we can't add more of these items
      confirmBtn.textContent = 'Redirecting to cart...';
      closeModal();
      setTimeout(() => {
        window.location.href = '/cart';
      }, 300);

    } catch (error) {
      confirmBtn.textContent = 'Error updating cart';
      setTimeout(() => {
        confirmBtn.textContent = window.checkoutConfig.popupMessage?.checkout_button_text || 'Confirm';
      }, 3000);
    }
  }

  /**
   * Adds items to cart with error handling
   */
  async function addItemsToCart(cartItems, confirmBtn) {
    try {
      // Clear the existing cart
      console.log('Clearing cart before adding new items', cartItems);
      confirmBtn.textContent = 'Clearing cart...';

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

      // Add selected items to cart
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
          console.log('Storing discount in localStorage:', window.checkoutConfig.discount.code);

          // Extract proper product IDs
          const productIds = cartItems.map(item => {
            // Make sure we have a valid number for the ID
            const id = typeof item.id === 'string' && item.id.includes('-')
              ? item.id.split('-')[0] // Handle potential key format like "123456-1"
              : item.id;
            return parseInt(id) || null;
          }).filter(Boolean); // Remove any null values

          localStorage.setItem('checkout_links_discount', JSON.stringify({
            link_id: window.checkoutConfig.link_id,
            discount_code: window.checkoutConfig.discount.code,
            discount_value: window.checkoutConfig.discount.value,
            order_discount: window.checkoutConfig.discount.orderDiscount,
            free_shipping: window.checkoutConfig.discount.freeShipping,
            specific_products: productIds, // Store the specific product IDs
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
        console.log('Direct checkout enabled:', directCheckout, 'Discount code:', discountCode, 'Discount expired:', discountExpired);

        if (directCheckout) {
          if (discountCode && !discountExpired) {
            window.location.href = `/checkout?discount=${encodeURIComponent(discountCode)}`;
          } else {
            window.location.href = '/checkout';
          }
        } else {
          window.location.href = '/cart';
        }
      }, 300);

    } catch (error) {
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

  /**
   * Attaches event listeners to modal elements
   */
  function attachEventListeners() {
    // Update total when checkboxes change
    document.querySelectorAll('.product-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', function () {
        updateTotal();
      });
    });

    // Confirm button click
    const confirmBtn = document.querySelector('.confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        let selectedProducts;

        // If allow_deselect is false, select all products automatically
        if (window.checkoutConfig.popupMessage?.allow_deselect === false) {
          selectedProducts = window.checkoutConfig.products || [];
        } else {
          // Otherwise, get only checked products
          selectedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'))
            .map(checkbox => {
              const productEl = checkbox.closest('.order-item');
              return window.checkoutConfig.products.find(p =>
                (p.id === productEl.dataset.productId) ||
                (productEl.dataset.linkVariantId && p.linkVariantId === parseInt(productEl.dataset.linkVariantId))
              );
            })
            .filter(Boolean);
        }

        if (selectedProducts.length === 0) {
          alert('Please select at least one product to continue');
          return;
        }

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processing...';

        // Prepare cart items format for Shopify
        const cartItems = selectedProducts.map(product => {
          // Log each product being added to cart for debugging
          console.log('Preparing to add to cart:', product);

          // Determine the correct ID to use - prefer linkVariantId which is the actual variant ID in Shopify
          let productId = product.linkVariantId || product.id;

          // Make sure we have a valid number
          if (typeof productId === 'string') {
            // Try to parse it as a number
            productId = parseInt(productId) || productId;
          }

          return {
            id: productId,
            quantity: parseInt(product.quantity) || 1
          };
        });

        // Log the cart items being sent to the addItemsToCart function
        console.log('Cart items for checkout:', cartItems);

        await addItemsToCart(cartItems, confirmBtn);
      });
    }

    // No thanks button
    const noThanksBtn = document.querySelector('.no-thanks');
    if (noThanksBtn) {
      noThanksBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.forceCloseModal();
        return false;
      });
    }

    updateTotal();
  }

  /**
   * Updates total calculation based on selected products
   */
  function updateTotal() {
    const totalValueEl = document.querySelector('.total-value');
    if (!totalValueEl) return;

    let subtotal = 0;
    let checkedProducts = [];

    // If allow_deselect is false, calculate total for all products
    if (window.checkoutConfig.popupMessage?.allow_deselect === false) {
      subtotal = (window.checkoutConfig.products || []).reduce((sum, product) => {
        const price = parseFloat(product.price) || 0;
        const quantity = parseInt(product.quantity) || 1;
        return sum + (price * quantity);
      }, 0);
      checkedProducts = window.checkoutConfig.products || [];
    } else {
      // Calculate subtotal from checked products
      checkedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'));
      checkedProducts.forEach(checkbox => {
        const price = parseFloat(checkbox.dataset.price) || 0;
        const quantity = parseInt(checkbox.dataset.quantity) || 1;
        subtotal += price * quantity;
      });
    }

    // Calculate discount if applicable
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
    }

    // Update total displayed value
    const total = subtotal - discount;
    totalValueEl.textContent = total.toFixed(2);

    // Update discount amount if applicable
    const discountAmountEl = document.querySelector('.discount-amount');
    if (discountAmountEl && hasValidDiscount) {
      discountAmountEl.textContent = `-$${discount.toFixed(2)}`;
    }

    // Update confirm button state
    const confirmBtn = document.querySelector('.confirm-btn');
    if (confirmBtn) {
      let hasCheckedProducts;

      if (window.checkoutConfig.popupMessage?.allow_deselect === false) {
        // When allow_deselect is false, always consider products as selected
        hasCheckedProducts = (window.checkoutConfig.products || []).length > 0;
      } else {
        // For normal behavior, check if any checkboxes are checked
        hasCheckedProducts = checkedProducts.length > 0;
      }

      confirmBtn.disabled = !hasCheckedProducts;
      confirmBtn.style.opacity = hasCheckedProducts ? '1' : '0.6';
    }
  }

  /**
   * Closes the modal
   */
  function closeModal() {
    const modalElement = document.getElementById('orderSummaryModal');
    if (!modalElement) return;

    modalElement.style.display = 'none';
    modalElement.style.visibility = 'hidden';
    modalElement.style.opacity = '0';
    modalElement.classList.remove('show');
    modalElement.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');

    // Remove any backdrops
    const backdrops = document.querySelectorAll('.modal-backdrop, #simple-modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());

    return false;
  }

  /**
   * Shows the modal
   */
  function showModal() {
    // Only show modal if we have a valid link ID
    if (!window.checkoutConfig?.link_id) {
      console.log('No valid link ID found, not showing modal');
      return;
    }

    // Check if we're in the Shopify theme editor and we have products
    const isThemeEditor = window.Shopify && window.Shopify.designMode;
    const hasProducts = window.checkoutConfig.products && window.checkoutConfig.products.length > 0;

    // Don't show modal in theme editor if no products are selected
    if (isThemeEditor && !hasProducts) {
      console.log('No products selected in theme editor. Not showing popup.');
      // Close any existing modal
      const existingModal = document.getElementById('orderSummaryModal');
      if (existingModal && existingModal.classList.contains('show')) {
        window.forceCloseModal();
      }
      return;
    }

    // Check if modal element exists, create it if it doesn't
    let modalElement = document.getElementById('orderSummaryModal');
    if (!modalElement) {
      console.log('Modal element not found, creating it now');
      modalElement = document.createElement('div');
      modalElement.id = 'orderSummaryModal';
      modalElement.className = 'modal fade';
      modalElement.setAttribute('tabindex', '-1');
      modalElement.setAttribute('role', 'dialog');
      modalElement.setAttribute('aria-labelledby', 'orderSummaryModalLabel');
      modalElement.setAttribute('aria-hidden', 'true');

      // Add modal HTML structure
      modalElement.innerHTML = `
        <div class="modal-dialog modal-dialog-centered" role="document">
          <div class="modal-content">
            <!-- Content will be populated by updateModalContent() -->
          </div>
        </div>
      `;

      // Add modal to document body
      document.body.appendChild(modalElement);

      // Create backdrop if it doesn't exist
      if (!document.querySelector('.modal-backdrop')) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);
      }

      // Call updateModalContent to populate the modal
      window.updateModalContent();
    }

    // Ensure theme editor disclaimer is present when in theme editor mode
    if (isThemeEditor && typeof window.ensureThemeEditorDisclaimer === 'function') {
      const modalContent = modalElement.querySelector('.modal-content');
      if (modalContent) {
        window.ensureThemeEditorDisclaimer(modalContent);
      }
    }

    // Make sure styles are applied BEFORE showing the modal
    if (window.checkoutConfig?.link && !modalElement.hasAttribute('data-styles-applied')) {
      console.log('Applying styles from showModal function');
      applyBrandStylesAndCustomCSS(window.checkoutConfig.link);
      modalElement.setAttribute('data-styles-applied', 'true');

      // Small delay to ensure styles are processed before showing
      setTimeout(() => {
        // Now show the modal
        modalElement.classList.add('show');
        modalElement.classList.add('checkout-links-popup'); // Add scoping class for custom CSS
        modalElement.style.display = 'flex';
        modalElement.style.visibility = 'visible';
        modalElement.style.opacity = '1';
        modalElement.style.zIndex = '1050';
        modalElement.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        console.log('Modal displayed with styles applied');
      }, 10);
    } else {
      // Show the modal directly if styles already applied
      modalElement.classList.add('show');
      modalElement.classList.add('checkout-links-popup'); // Add scoping class for custom CSS
      modalElement.style.display = 'flex';
      modalElement.style.visibility = 'visible';
      modalElement.style.opacity = '1';
      modalElement.style.zIndex = '1050';
      modalElement.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      console.log('Modal displayed successfully');
    }
    
    // Add backdrop click event listener
    modalElement.addEventListener('click', function(e) {
      // Only close if clicked on the modal backdrop (not on modal content)
      if (e.target === modalElement) {
        window.forceCloseModal();
      }
    });
    
    console.log('Modal displayed successfully');
  }

  /**
   * Global functions for external access
   */
  window.forceCloseModal = function () {
    closeModal();
    return false;
  };

  window.forceShowModal = function () {
    // Check if we're in theme editor and have products
    const isThemeEditor = window.Shopify && window.Shopify.designMode;
    const hasProducts = window.checkoutConfig.products && window.checkoutConfig.products.length > 0;

    // Don't show modal in theme editor if no products are selected
    if (isThemeEditor && !hasProducts) {
      console.log('No products selected in theme editor. Not showing popup.');
      // Close any existing modal
      const existingModal = document.getElementById('orderSummaryModal');
      if (existingModal && existingModal.classList.contains('show')) {
        window.forceCloseModal();
      }
      return;
    }

    // Save original link countdown settings before updateModalContent
    const originalCountdownTime = window.checkoutConfig.countdown_time;
    const originalCountdownActive = window.checkoutConfig.countdown_active;

    // Update modal content
    window.updateModalContent();

    // Restore original countdown settings if they exist
    if (originalCountdownTime) {
      window.checkoutConfig.countdown_time = originalCountdownTime;
    }

    if (originalCountdownActive !== undefined) {
      window.checkoutConfig.countdown_active = originalCountdownActive;
    }

    // Initialize countdown if needed
    if (window.checkoutConfig.popupMessage?.countdown_active) {
      window.initializeCountdown(window.checkoutConfig.popupMessage?.timer_text);
    }

    // Show the modal
    showModal();
    return false;
  };

  /**
   * Event listeners for modal
   */
  document.addEventListener('DOMContentLoaded', function () {
    // Add CSS for the close button
    const styleSheet = document.createElement("link");
    styleSheet.rel = "stylesheet";
    styleSheet.href = "https://cdn.shopify.com/extensions/[EXTENSION_ID]/[VERSION]/assets/styles.css";
    document.head.appendChild(styleSheet);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('orderSummaryModal')?.classList.contains('show')) {
      window.forceCloseModal();
    }
  });

  /**
   * Sets up sample data for theme editor preview
   */
  function setupSampleDataForThemeEditor() {
    // Only set link_id if it doesn't exist
    window.checkoutConfig.link_id = window.checkoutConfig.link_id || 'sample-link-id';

    // Set up currency code if not already set
    window.checkoutConfig.currency_code = window.checkoutConfig.currency_code || (window.Shopify ? (window.Shopify.currency?.active || 'USD') : 'USD');

    // Ensure popup message object exists
    window.checkoutConfig.popupMessage = window.checkoutConfig.popupMessage || {};

    // Apply theme editor settings if available
    if (window.checkoutConfig.theme_editor) {
      // Apply theme editor settings to popupMessage
      const te = window.checkoutConfig.theme_editor;

      if (te.popup_title) window.checkoutConfig.popupMessage.heading_text = te.popup_title;
      if (te.popup_description) window.checkoutConfig.popupMessage.message_text = te.popup_description;
      if (te.countdown_time) window.checkoutConfig.countdown_time = parseInt(te.countdown_time, 10);
      if (te.checkout_button_text) window.checkoutConfig.popupMessage.checkout_button_text = te.checkout_button_text;
      if (te.close_button_text) window.checkoutConfig.popupMessage.close_button_text = te.close_button_text;

      if (typeof te.show_countdown === 'boolean') window.checkoutConfig.popupMessage.countdown_active = te.show_countdown;
      if (typeof te.show_price === 'boolean') window.checkoutConfig.popupMessage.show_price = te.show_price;
      if (typeof te.show_order_total === 'boolean') window.checkoutConfig.popupMessage.show_order_total = te.show_order_total;
      if (typeof te.allow_deselect === 'boolean') window.checkoutConfig.popupMessage.allow_deselect = te.allow_deselect;
    }

    // Fill in missing fields with defaults
    window.checkoutConfig.popupMessage.is_active = window.checkoutConfig.popupMessage.is_active ?? true;
    window.checkoutConfig.popupMessage.heading_text = window.checkoutConfig.popupMessage.heading_text || "Complete Your Order";
    window.checkoutConfig.popupMessage.message_text = window.checkoutConfig.popupMessage.message_text || "Add these recommended products to your cart before checkout. Limited time offer!";
    window.checkoutConfig.popupMessage.countdown_active = window.checkoutConfig.popupMessage.countdown_active ?? true;
    window.checkoutConfig.popupMessage.timer_text = window.checkoutConfig.popupMessage.timer_text || "10 minute";
    window.checkoutConfig.popupMessage.copy_text = window.checkoutConfig.popupMessage.copy_text || "This offer expires in:";
    // Only set allow_deselect to true if it's null or undefined (not if it's false)
    if (typeof window.checkoutConfig.popupMessage.allow_deselect === 'undefined' || window.checkoutConfig.popupMessage.allow_deselect === null) {
      window.checkoutConfig.popupMessage.allow_deselect = true;
    }
    window.checkoutConfig.popupMessage.show_price = window.checkoutConfig.popupMessage.show_price ?? true;
    window.checkoutConfig.popupMessage.show_order_total = window.checkoutConfig.popupMessage.show_order_total ?? true;
    window.checkoutConfig.popupMessage.checkout_button_text = window.checkoutConfig.popupMessage.checkout_button_text || "Add to Cart";
    window.checkoutConfig.popupMessage.close_button_text = window.checkoutConfig.popupMessage.close_button_text || "No Thanks";
    window.checkoutConfig.popupMessage.close_button_link = window.checkoutConfig.popupMessage.close_button_link || "#";

    // Initialize UI with the settings
    window.updateModalContent();

    // Show the modal - this is needed for the popup to appear
    showModal();
  }

  // Initialize application
  const { linkId } = getParamsFromUrl();
  console.log('Starting initialization with linkId:', linkId);
  console.log('Current checkoutConfig:', window.checkoutConfig.popupMessage.allow_deselect);

  // Check if we're in the Shopify theme editor
  const isThemeEditor = window.Shopify && window.Shopify.designMode;
  console.log('Is in Shopify theme editor:', isThemeEditor);

  if (linkId) {
    console.log('Fetching link data for ID:', linkId);
    fetchLinkData(linkId);
  } else if (isThemeEditor) {
    console.log('Setting up sample data for theme editor');
    setupSampleDataForThemeEditor();
  } else {
    console.log('No link ID found and not in theme editor');
  }

  // Check for order completion
  window.orderCounter.checkAndCount();

  // Automatically show the modal if there's a link ID in the URL
  // We need a small delay to make sure everything is properly loaded
  setTimeout(() => {
    if (window.checkoutConfig && window.checkoutConfig.link_id) {
      console.log('Showing modal after timeout with link ID:', window.checkoutConfig.link_id);
      showModal();
    } else {
      console.log('Not showing modal after timeout - no link ID in checkoutConfig');
    }
  }, 1000);
});

// Add a global function to manually show the modal for debugging
window.debugShowModal = function () {
  console.log('Manual debug trigger for showModal()');
  // Create a default link ID if none exists
  if (!window.checkoutConfig || !window.checkoutConfig.link_id) {
    console.log('No link ID found, creating a default one for debugging');
    if (!window.checkoutConfig) {
      window.checkoutConfig = {};
    }
    window.checkoutConfig.link_id = 'debug-link-id';
  }

  // Make sure we have a modal element
  let modalElement = document.getElementById('orderSummaryModal');
  if (!modalElement) {
    console.log('Creating modal element for debugging');
    modalElement = document.createElement('div');
    modalElement.id = 'orderSummaryModal';
    modalElement.className = 'modal fade';
    modalElement.setAttribute('role', 'dialog');

    // Add basic structure
    modalElement.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5>Debug Modal</h5>
          </div>
          <div class="modal-body">
            <p>This is a debug modal created manually.</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalElement);
  }

  // Show the modal
  showModal();

  return 'Modal debug function executed. Check console for logs.';
};
