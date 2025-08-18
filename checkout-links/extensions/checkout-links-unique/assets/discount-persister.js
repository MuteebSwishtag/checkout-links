/**
 * Discount Persister
 * 
 * This script runs on cart and checkout pages to ensure discounts from checkout links
 * are properly applied and persisted when additional items are added to the cart.
 * The discount is only applied to specific products that were part of the original checkout link.
 */

(function() {
  // Run when DOM is fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on cart or checkout page
    const isCartPage = window.location.pathname.includes('/cart');
    const isCheckoutPage = window.location.pathname.includes('/checkout');
    
    if (!isCartPage && !isCheckoutPage) return;
    
    // Try to get stored discount from localStorage
    try {
      const storedDiscountJson = localStorage.getItem('checkout_links_discount');
      if (!storedDiscountJson) return;
      
      const storedDiscount = JSON.parse(storedDiscountJson);
      
      // Check if discount is expired
      const now = new Date();
      const expires = new Date(storedDiscount.expires);
      if (now > expires) {
        // Discount expired, remove it
        localStorage.removeItem('checkout_links_discount');
        return;
      }
      
      // Check if we have specific product IDs that the discount should apply to
      const specificProducts = storedDiscount.specific_products || [];
      
      // Handle checkout page - create a product-specific discount URL if needed
      if (isCheckoutPage && storedDiscount.discount_code) {
        // Check if discount is already applied in URL
        const discountInUrl = window.location.search.includes(`discount=${storedDiscount.discount_code}`);
        
        // Check if discount is already applied on page
        const discountAppliedOnPage = Array.from(document.querySelectorAll('.reduction-code__text')).some(
          el => el.textContent.includes(storedDiscount.discount_code)
        );
        
        // If discount is not applied, redirect to apply it
        if (!discountInUrl && !discountAppliedOnPage) {
          const separator = window.location.search ? '&' : '?';
          
          // Create URL with discount and specific product IDs if available
          let redirectUrl = `${window.location.href}${separator}discount=${storedDiscount.discount_code}`;
          
          // If we have specific products, add them to the URL to ensure discount only applies to them
          if (specificProducts.length > 0) {
            redirectUrl += `&discount_specific_products=${specificProducts.join(',')}`;
          }
          
          window.location.href = redirectUrl;
        }
      }
      
      // Handle cart page - show discount notice with appropriate messaging
      if (isCartPage) {
        // Create discount notice element
        const discountNotice = document.createElement('div');
        discountNotice.className = 'checkout-links-discount-notice discount-notice';
        
        // Create different messaging based on whether discount applies to specific products or all
        let noticeText = '';
        if (specificProducts.length > 0) {
          noticeText = `
            <p style="margin: 0;">Your discount code <span class="discount-code">${storedDiscount.discount_code}</span> will be applied at checkout to your checkout link products only.</p>
          `;
          
          // Optionally highlight the specific products in the cart
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
              if (variantId && specificProducts.includes(variantId)) {
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
        } else {
          noticeText = `
            <p style="margin: 0;">Your discount code <span class="discount-code">${storedDiscount.discount_code}</span> will be applied at checkout.</p>
          `;
        }
        
        discountNotice.innerHTML = noticeText;
        
        // Function to insert notice into cart
        function insertDiscountNotice() {
          // Look for common cart elements across different themes
          const cartForm = document.querySelector('form[action="/cart"], [data-action="/cart"], #cart-form, .cart');
          if (!cartForm) return false;
          
          // Try to find a good insertion point
          const insertPoints = [
            cartForm.querySelector('.cart__footer, .cart-footer, .cart-subtotal, .cart-recap, .cart__subtotal-container'),
            cartForm.querySelector('button[name="checkout"], [data-checkout-button], .checkout-button')
          ];
          
          // Try each insertion point
          for (const element of insertPoints) {
            if (element) {
              if (element.tagName === 'BUTTON') {
                element.parentNode.insertBefore(discountNotice, element);
              } else {
                element.prepend(discountNotice);
              }
              return true;
            }
          }
          
          return false;
        }
        
        // Try to insert notice, and retry a few times if the cart is still loading
        let attempts = 0;
        const maxAttempts = 5;
        
        function tryInsert() {
          if (insertDiscountNotice() || attempts >= maxAttempts) {
            return;
          }
          
          attempts++;
          setTimeout(tryInsert, 500);
        }
        
        // Start trying to insert the notice
        tryInsert();
        
        // Update checkout buttons to include discount
        setTimeout(function() {
          const checkoutButtons = document.querySelectorAll('button[name="checkout"], [data-checkout-button], .checkout-button');
          checkoutButtons.forEach(button => {
            button.addEventListener('click', function(e) {
              // Some themes use their own checkout implementation, so we don't always want to prevent default
              const directCheckout = !button.getAttribute('data-custom-checkout');
              
              if (directCheckout) {
                e.preventDefault();
                
                // Ask user if they want to clear the cart first
                const shouldClearCart = specificProducts.length > 0 && 
                  confirm("Would you like to clear your cart before checkout? This ensures only discount-eligible products remain.");
                
                if (shouldClearCart) {
                  // Show processing message
                  const originalText = button.textContent;
                  button.textContent = "Clearing cart...";
                  button.disabled = true;
                  
                  // Clear the cart first
                  fetch('/cart/clear.js', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    }
                  })
                  .then(response => {
                    if (!response.ok) throw new Error('Failed to clear cart');
                    return response.json();
                  })
                  .then(() => {
                    // After clearing, re-add just the discounted products if needed
                    if (specificProducts.length > 0) {
                      button.textContent = "Re-adding eligible products...";
                      
                      // To implement: Could fetch the original products and re-add them
                      // For now, just redirect to checkout with the discount
                      let checkoutUrl = `/checkout?discount=${storedDiscount.discount_code}`;
                      if (specificProducts.length > 0) {
                        checkoutUrl += `&discount_specific_products=${specificProducts.join(',')}`;
                      }
                      window.location.href = checkoutUrl;
                    } else {
                      // Just redirect to checkout with discount
                      window.location.href = `/checkout?discount=${storedDiscount.discount_code}`;
                    }
                  })
                  .catch(error => {
                    console.error("Error clearing cart:", error);
                    button.textContent = originalText;
                    button.disabled = false;
                    alert("There was an error clearing your cart. Please try again.");
                  });
                } else {
                  // Create checkout URL with discount without clearing cart
                  let checkoutUrl = `/checkout?discount=${storedDiscount.discount_code}`;
                  
                  // If we have specific products, add them to the URL
                  if (specificProducts.length > 0) {
                    checkoutUrl += `&discount_specific_products=${specificProducts.join(',')}`;
                  }
                  
                  window.location.href = checkoutUrl;
                }
              }
            });
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Error applying persisted discount:', error);
    }
  });
})();
