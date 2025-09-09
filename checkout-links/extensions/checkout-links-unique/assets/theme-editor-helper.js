// Function to set up sample data for theme editor preview
async function setupSampleDataForThemeEditor() {
    console.log('Setting up sample data for theme editor');

    // Set up sample data for theme editor preview
    window.checkoutConfig.link_id = window.checkoutConfig.link_id || 'sample-link-id';

    // First check if there are products already set from selected_products in the schema
    const hasSelectedProducts = window.checkoutConfig.products && window.checkoutConfig.products.length > 0;
    
    // Check if products are in the theme_editor.selected_products array (this is where they'll be from schema settings)
    const hasThemeEditorProducts = window.checkoutConfig.theme_editor && 
                                  window.checkoutConfig.theme_editor.selected_products && 
                                  window.checkoutConfig.theme_editor.selected_products.length > 0;
    
    if (hasThemeEditorProducts) {
        console.log('Using products from theme editor schema settings:', window.checkoutConfig.theme_editor.selected_products);
        // Use the schema-selected products in the main products array
        window.checkoutConfig.products = window.checkoutConfig.theme_editor.selected_products;
    } else if (hasSelectedProducts) {
        console.log('Using products selected in theme editor schema:', window.checkoutConfig.products);
    }
    // Otherwise check if there is a selected collection
    else if (window.checkoutConfig.theme_editor && 
        window.checkoutConfig.theme_editor.selected_collection) {
        try {
            // For theme editor, we'll simulate products from a collection
            const collectionId = window.checkoutConfig.theme_editor.selected_collection;
            console.log('Using collection for theme editor preview:', collectionId);

            // Get collection info if available
            const collectionInfo = window.checkoutConfig.theme_editor.collection_info || { 
                id: collectionId, 
                title: 'Selected Collection' 
            };
            
            console.log('Collection info:', collectionInfo);

            // In a real implementation, you would fetch products from the collection
            // Here we'll simulate some sample products as if they came from the collection
            const sampleCollectionProducts = [
                {
                    id: 'collection-product-1',
                    title: `${collectionInfo.title} - Product 1`,
                    price: '29.99',
                    image: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png',
                    quantity: 1,
                    collection_id: collectionId
                },
                {
                    id: 'collection-product-2',
                    title: `${collectionInfo.title} - Product 2`,
                    price: '49.99',
                    image: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-2_large.png',
                    quantity: 1,
                    collection_id: collectionId
                },
                {
                    id: 'collection-product-3',
                    title: `${collectionInfo.title} - Product 3`,
                    price: '79.99',
                    image: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-3_large.png',
                    quantity: 1,
                    collection_id: collectionId
                }
            ];

            // Use the simulated collection products only if no products are already set
            if (!hasSelectedProducts) {
                window.checkoutConfig.products = sampleCollectionProducts;
                console.log('Using sample products from collection for theme editor preview:', sampleCollectionProducts);
            }
        } catch (error) {
            console.error('Error setting up collection products:', error);
            // Fall back to sample products if there are no selected products
            if (!hasSelectedProducts) {
                useSampleProducts();
            }
        }
    } else {
        // Use sample products if no collection is selected and no products are selected
        if (!hasSelectedProducts) {
            useSampleProducts();
        }
    }

    // Apply configuration settings from theme editor
    if (window.checkoutConfig.theme_editor) {
        // Set popup title and description
        if (window.checkoutConfig.theme_editor.popup_title) {
            window.checkoutConfig.popup_title = window.checkoutConfig.theme_editor.popup_title;
            // Update popupMessage as well for consistency
            window.checkoutConfig.popupMessage.heading_text = window.checkoutConfig.theme_editor.popup_title;
        }

        if (window.checkoutConfig.theme_editor.popup_description) {
            window.checkoutConfig.popup_description = window.checkoutConfig.theme_editor.popup_description;
            window.checkoutConfig.popupMessage.message_text = window.checkoutConfig.theme_editor.popup_description;
        }

        // Apply countdown timer settings
        if (window.checkoutConfig.theme_editor.show_countdown === false ||
            window.checkoutConfig.theme_editor.show_countdown === true) {
            window.checkoutConfig.show_countdown = window.checkoutConfig.theme_editor.show_countdown;
            window.checkoutConfig.popupMessage.countdown_active = window.checkoutConfig.theme_editor.show_countdown;
        }

        if (window.checkoutConfig.theme_editor.countdown_time) {
            const countdownSeconds = parseInt(window.checkoutConfig.theme_editor.countdown_time, 10) || 600;
            window.checkoutConfig.countdown_time = countdownSeconds;
            window.checkoutConfig.popupMessage.timer_text = Math.floor(countdownSeconds / 60) + " minute";
        }

        if (window.checkoutConfig.theme_editor.countdown_label) {
            window.checkoutConfig.popupMessage.copy_text = window.checkoutConfig.theme_editor.countdown_label;
        }

        // Apply checkout button settings
        if (window.checkoutConfig.theme_editor.checkout_button_text) {
            window.checkoutConfig.checkout_button_text = window.checkoutConfig.theme_editor.checkout_button_text;
            window.checkoutConfig.popupMessage.checkout_button_text = window.checkoutConfig.theme_editor.checkout_button_text;
        }

        if (window.checkoutConfig.theme_editor.close_button_text) {
            window.checkoutConfig.popupMessage.close_button_text = window.checkoutConfig.theme_editor.close_button_text;
        }

        if (window.checkoutConfig.theme_editor.direct_checkout === false ||
            window.checkoutConfig.theme_editor.direct_checkout === true) {
            window.checkoutConfig.direct_checkout = window.checkoutConfig.theme_editor.direct_checkout;
            window.checkoutConfig.popupMessage.direct_checkout = window.checkoutConfig.theme_editor.direct_checkout;
        }

        // Apply product display settings
        if (window.checkoutConfig.theme_editor.show_price === false ||
            window.checkoutConfig.theme_editor.show_price === true) {
            window.checkoutConfig.popupMessage.show_price = window.checkoutConfig.theme_editor.show_price;
        }

        if (window.checkoutConfig.theme_editor.show_order_total === false ||
            window.checkoutConfig.theme_editor.show_order_total === true) {
            window.checkoutConfig.popupMessage.show_order_total = window.checkoutConfig.theme_editor.show_order_total;
        }

        if (window.checkoutConfig.theme_editor.allow_deselect === false ||
            window.checkoutConfig.theme_editor.allow_deselect === true) {
            window.checkoutConfig.popupMessage.allow_deselect = window.checkoutConfig.theme_editor.allow_deselect;
        }

        // Apply discount settings
        if (window.checkoutConfig.theme_editor.discount_code) {
            window.checkoutConfig.discount.code = window.checkoutConfig.theme_editor.discount_code;
        }

        if (window.checkoutConfig.theme_editor.discount_value) {
            window.checkoutConfig.discount.value = parseFloat(window.checkoutConfig.theme_editor.discount_value);
        }

        console.log('Applied theme editor configuration settings:', window.checkoutConfig);
    }

    // Set up currency code
    window.checkoutConfig.currency_code = window.Shopify ? (window.Shopify.currency?.active || 'USD') : 'USD';

    // Apply button color from settings if available
    if (window.checkoutConfig.theme_editor && window.checkoutConfig.theme_editor.button_color) {
        const buttonColor = window.checkoutConfig.theme_editor.button_color;
        document.documentElement.style.setProperty('--checkout-links-button-color', buttonColor);
    }

    // Initialize UI with the sample data
    if (typeof window.updateModalContent === 'function') {
        window.updateModalContent();
    } else {
        console.warn('updateModalContent function not found. Modal may not show products correctly.');
        // Try to refresh the modal content through a global event
        const refreshEvent = new CustomEvent('refresh-checkout-modal');
        window.dispatchEvent(refreshEvent);
    }

    // Override button actions for theme editor preview
    setTimeout(() => {
        setupThemeEditorButtonActions();
    }, 1000);
}

// Helper function to use sample products
function useSampleProducts() {
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
          quantity: 1
      },
      {
          id: 'sample-product-3',
          title: 'Designer Jeans',
          price: '79.99',
          image: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-3_large.png',
          quantity: 1
    }
  ];
}

// Set up the theme editor button actions
function setupThemeEditorButtonActions() {
    // Find confirm button and override its click event for theme editor
    const confirmBtn = document.querySelector('.confirm-btn');
    if (confirmBtn) {
        // Remove existing event listeners (if any)
        const confirmBtnClone = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(confirmBtnClone, confirmBtn);

        // Apply button color if specified
        if (window.checkoutConfig.theme_editor && window.checkoutConfig.theme_editor.button_color) {
            confirmBtnClone.style.backgroundColor = window.checkoutConfig.theme_editor.button_color;
        }

        // Add a demo-only click handler
        confirmBtnClone.addEventListener('click', function (e) {
            e.preventDefault();
            
            // Get all checked products
            const checkedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'));
            const selectedProductCount = checkedProducts.length;
            
            // Get direct checkout setting
            const directCheckout = window.checkoutConfig.popupMessage?.direct_checkout;
            
            if (selectedProductCount === 0) {
                alert('Please select at least one product to continue.');
                return false;
            }
            
            const productNames = checkedProducts.map(checkbox => {
                const productTitle = checkbox.closest('.order-item').querySelector('.product-title').textContent;
                return productTitle;
            }).join(', ');
            
            alert(`This would add ${selectedProductCount} product(s) to your cart: ${productNames}${directCheckout ? ' and proceed to checkout' : ''}. (Demo mode in theme editor)`);
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
}
