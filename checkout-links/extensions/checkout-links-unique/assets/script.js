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

document.addEventListener('DOMContentLoaded', function() {
  // Immediately make sure the modal is properly hidden on page load
  const initialModalElement = document.getElementById('orderSummaryModal');
  if (initialModalElement) {
    initialModalElement.style.display = 'none';
    initialModalElement.style.visibility = 'hidden';
    initialModalElement.classList.remove('show');
    initialModalElement.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  // Get URL parameters
  function getParamsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
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
      `${backendUrl}/links/${linkId}`,
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
        // console.log('API response preview:', responseText);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (err) {
          // console.error('Failed to parse JSON:', err);
          throw new Error('Malformed JSON response');
        }

        if (data?.success && data?.link) {
          updateCheckoutConfig(data.link);
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
    
    // Update products
    const variants = linkData.linked_variants || linkData.linkedVariants || [];
    const allVariants = [];

    variants.forEach(item => {
      if (!item.variant) return;

      const mediaItem = item.variant.product?.media?.[0];

      allVariants.push({
        id: item.variant_id,
        linkVariantId: item.id,
        productId: item.product_id,
        title: `${item.variant.product.title} - ${item.variant.title}`,
        price: item.price || item.variant.price || '0.00',
        image: mediaItem?.src || '',
        quantity: 1 // Default quantity for all variants
      });
    });
    
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
    
    const minutes = parseInt(minutesMatch[1]) || 1;
    let secondsRemaining = minutes * 60;
    
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
    
    function updateDisplay() {
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      countdownTimeEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    
    updateDisplay();
    const interval = setInterval(() => {
      secondsRemaining--;
      if (secondsRemaining <= 0) {
        clearInterval(interval);
        // Optional: Close the modal when timer expires
        // closeModal();
      } else {
        updateDisplay();
      }
    }, 1000);
  }

  // Update modal content
  function updateModalContent() {
    const modalContent = document.querySelector('.modal-content');
    if (!modalContent || !window.checkoutConfig) return;
    
    // Calculate prices
    let subtotal = window.checkoutConfig.products?.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0) || 0;
    let discountAmount = 0;
    
    if (window.checkoutConfig.discount?.value) {
      const discountValue = parseFloat(window.checkoutConfig.discount.value) || 0;
      discountAmount = window.checkoutConfig.discount.orderDiscount 
        ? subtotal * (discountValue / 100)
        : discountValue;
      discountAmount = Math.min(discountAmount, subtotal);
    }
    
    const total = subtotal - discountAmount;
    const currencyCode = window.checkoutConfig.currency_code || 'AUD';
    
    // Build modal HTML
    modalContent.innerHTML = `
      <div class="modal-body p-4">
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
                <img src="${product.image}" alt="${product.title}" onerror="this.onerror=null;this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22100%22%20height%3D%22100%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20fill%3D%22%23f8f9fa%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E%3Ctext%20fill%3D%22%23999%22%20font-family%3D%22Arial%2CSans%22%20font-size%3D%2212%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2250%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E'">
                <div class="item-qty">1</div>
              </div>
              <div class="item-details">
                <div class="product-title">${product.title}</div>
                ${window.checkoutConfig.popupMessage?.show_price ? `<div class="product-price">$${(parseFloat(product.price) || 0).toFixed(2)}</div>` : ''}
              </div>
              <div class="item-check">
                <label class="checkbox-label">
                  <input type="checkbox" ${window.checkoutConfig.popupMessage?.allow_deselect === false ? 'disabled' : ''} checked class="product-checkbox" data-price="${product.price}">
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
            <span class="total-value">$${total.toFixed(2)}</span>
          </div>
        </div>
        ` : ''}
        <button class="confirm-btn">${window.checkoutConfig.popupMessage?.checkout_button_text || 'Confirm'}</button>
        <a href="#" class="no-thanks" onclick="window.forceCloseModal(); return false;">${window.checkoutConfig.popupMessage?.close_button_text || 'No thanks'}</a>
      </div>
    `;
    
    attachEventListeners();
  }

  // Attach event listeners
  function attachEventListeners() {
    // Update total when checkboxes change
    document.querySelectorAll('.product-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', function(e) {
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
      confirmBtn.addEventListener('click', () => {
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
        
        // console.log('Selected products to add to cart:', selectedProducts);
        
        // If no products are selected, show a message and prevent adding to cart
        if (selectedProducts.length === 0) {
          alert('Please select at least one product to continue');
          return;
        }
        
        // Prepare items for cart addition - ONLY checked items
        // console.log('Preparing items for cart addition:', selectedProducts);
        const cartItems = selectedProducts.map(product => ({
          'id': parseInt(product.id),
          'quantity': 1
        }));
        
        // Show loading state
        confirmBtn.textContent = 'Adding to cart...';
        confirmBtn.disabled = true;
        
        // Get the discount code either from URL or from config
        const discountCode = window.checkoutConfig.discount?.code || '';
        // console.log('Using discount code for cart:', discountCode);
        
        // Add to cart using Shopify AJAX API
        fetch(window.Shopify.routes?.root ? `${window.Shopify.routes.root}cart/add.js` : '/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 
            items: cartItems,
          })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          // console.log('Products added to cart:', data);
          
          // Reset button state
          confirmBtn.textContent = window.checkoutConfig.popupMessage?.checkout_button_text || 'Confirm';
          confirmBtn.disabled = false;
          
          // Close modal and redirect to cart page
          closeModal();
          setTimeout(() => {
            // If we have a discount code, redirect to checkout with discount applied
            const discountCode = window.checkoutConfig.discount?.code || '';
            if (discountCode) {
              // console.log('Redirecting to checkout with discount:', discountCode);
              window.location.href = `/checkout?discount=${encodeURIComponent(discountCode)}`;
            } else {
              // console.log('Redirecting to checkout without discount');
              window.location.href = '/checkout';
            }
          }, 300);
        })
        .catch(error => {
          // console.error('Error adding products to cart:', error);
          
          // Show error on button
          confirmBtn.textContent = 'Failed! Try again';
          confirmBtn.disabled = false;
          
          // Reset button text after 3 seconds
          setTimeout(() => {
            confirmBtn.textContent = window.checkoutConfig.popupMessage?.checkout_button_text || 'Confirm';
          }, 300);
        });
      });
    }
    
    // No thanks button
    const noThanksBtn = document.querySelector('.no-thanks');
    if (noThanksBtn) {
      noThanksBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        // console.log('No thanks button clicked');
        
        // First try our regular closeModal
        closeModal();
        
        // Then use the global force close
        if (window.forceCloseModal) {
          window.forceCloseModal();
        }
        
        // Force close with direct manipulation as a fallback
        setTimeout(function() {
          // console.log('Force closing with direct DOM manipulation');
          const modal = document.getElementById('orderSummaryModal');
          if (modal) {
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
            modal.style.opacity = '0';
            modal.setAttribute('aria-hidden', 'true');
            modal.classList.remove('show');
            
            // Try the most aggressive approach - remove from DOM
            try {
              const parent = modal.parentNode;
              if (parent) {
                parent.removeChild(modal);
              }
            } catch(e) {
              // console.error('Failed to remove modal from DOM:', e);
            }
          }
          
          // Remove any backdrops
          document.querySelectorAll('.modal-backdrop, #simple-modal-backdrop').forEach(el => el.remove());
          
          // Reset body
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        }, 50);
        
        return false;
      });
    }
    
    updateTotal();
  }

  // Update total calculation
  function updateTotal() {
    const totalValueEl = document.querySelector('.total-value');
    if (!totalValueEl) return;
    
    // Get only checked products for calculation
    let subtotal = Array.from(document.querySelectorAll('.product-checkbox:checked'))
      .reduce((sum, checkbox) => sum + (parseFloat(checkbox.dataset.price) || 0), 0);
    
    // console.log('Calculated subtotal from checked products:', subtotal);
    
    let discount = 0;
    if (window.checkoutConfig.discount?.value) {
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
      discountAmountEl.textContent = `-$${discount.toFixed(2)}`;
    }
    
    // Update the confirm button state based on checked products
    const confirmBtn = document.querySelector('.confirm-btn');
    if (confirmBtn) {
      const hasCheckedProducts = document.querySelectorAll('.product-checkbox:checked').length > 0;
      confirmBtn.disabled = !hasCheckedProducts;
      confirmBtn.style.opacity = hasCheckedProducts ? '1' : '0.6';
      
      // Change button text if no products are selected
      confirmBtn.textContent = hasCheckedProducts 
        ? (window.checkoutConfig.popupMessage?.checkout_button_text || 'Confirm')
        : 'Select products to continue';
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
    } catch(e) {
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
      // console.log('Cannot show modal: No link ID');
      return;
    }
    
    const modalElement = document.getElementById('orderSummaryModal');
    if (!modalElement) return;
    
    modalElement.classList.add('show');
    modalElement.style.display = 'flex';
    modalElement.style.visibility = 'visible';
    modalElement.style.opacity = '1';
    modalElement.style.zIndex = '1050';
    modalElement.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    
    // Don't create backdrop if we're using the modal's own background
    if (!document.getElementById('simple-modal-backdrop') && false) { // disabled backdrop creation
      const backdrop = document.createElement('div');
      backdrop.id = 'simple-modal-backdrop';
      backdrop.className = 'modal-backdrop fade show';
      document.body.appendChild(backdrop);
    }
  }

  // Add a global closeModal function that can be called from anywhere
  window.forceCloseModal = function() {
    // console.log('Force close modal called from global scope');
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
      } catch(e) {
        // console.error('Failed to remove modal from DOM:', e);
      }
    }
    
    document.querySelectorAll('.modal-backdrop, #simple-modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // As a last resort, reload the page
    // Uncomment this if needed:
    // setTimeout(function() { window.location.reload(); }, 100);
    
    return false; // Prevent default
  };

  // Event listeners for modal
  document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('orderSummaryModal');
    if (modal) {
      modal.addEventListener('click', function(e) {
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
    document.body.addEventListener('click', function(e) {
      if (e.target.classList.contains('no-thanks-btn') || 
          e.target.closest('.no-thanks-btn')) {
        // console.log('No thanks button clicked via body delegate');
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

  // Initialize
  const { linkId, discountCode } = getParamsFromUrl();
  if (linkId) {
    fetchLinkData(linkId).then(() => {
      // After fetching data, ensure discount code from URL takes precedence
      if (discountCode) {
        // console.log('Setting discount code from URL parameter:', discountCode);
        window.checkoutConfig.discount.code = discountCode;
      }
      // Show modal after data is loaded
      showModal();
    }).catch(() => {
      // Don't show modal on error but ensure backdrop is removed
      // console.log('Error fetching link data, not showing modal');
      ensureModalAndBackdropRemoved();
    });
  } else {
    // If no link ID, don't show the modal and ensure backdrop is removed
    // console.log('No link ID found, modal will not be displayed');
    ensureModalAndBackdropRemoved();
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
});
