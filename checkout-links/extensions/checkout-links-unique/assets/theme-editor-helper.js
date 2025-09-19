/**
 * Sets up sample data for theme editor preview
 * Initializes product variants, applies theme settings, and sets up UI components
 */
async function setupSampleDataForThemeEditor() {
    // Show loading indicator if the modal is visible
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
        // Add checkout disclaimer for theme editor
        const disclaimerExists = modalContent.querySelector('.theme-editor-disclaimer');
        if (!disclaimerExists) {
            const disclaimer = document.createElement('div');
            disclaimer.className = 'theme-editor-disclaimer';
            disclaimer.textContent = 'This popup here is for preview only. For full functionality, please use the Checkout Links App.';
            if (modalContent.firstChild) {
                modalContent.insertBefore(disclaimer, modalContent.firstChild);
            } else {
                modalContent.appendChild(disclaimer);
            }
        }
        const loadingElement = document.createElement('div');
        loadingElement.id = 'theme-editor-loading';
        loadingElement.innerHTML = 'Loading preview data...';
        loadingElement.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; padding: 10px; text-align: center; z-index: 100;';
        modalContent.appendChild(loadingElement);
    }
    const allVariants = [];
    window.checkoutConfig.link_id = window.checkoutConfig.link_id || 'sample-link-id';
    // Use selected products from theme editor if available
    if (window.checkoutConfig.theme_editor?.selected_products) {
        try {
            const products = window.checkoutConfig.theme_editor.selected_products;
            // Process only the first variant of each product
            const processedProductIds = new Set();
            for (const product of products) {
                // Skip if we've already processed this product
                if (processedProductIds.has(product.id)) continue;
                console.log('Processing product for theme editor:', product);

                if (product.variants?.length > 0) {
                // console.log('Adding product variant for theme editor:', product);

                    const variant = product.variants[0];
                    allVariants.push({
                        id: variant.id,
                        title: `${product.title} - ${variant.title}`,
                        price: variant.price,
                        // ✅ Fix: use product.images[0], add https if missing
                        image: product.images?.[0]
                            ? (product.images[0].startsWith('//')
                                ? `https:${product.images[0]}`
                                : product.images[0])
                            : 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png',
                        quantity: 1,
                        inventoryQuantity: variant.inventory_quantity ?? 10,
                        productId: product.id,
                        linkVariantId: variant.id,
                    });

                    processedProductIds.add(product.id);
                }
            }
            window.checkoutConfig.products = allVariants;
        } catch (error) {
            console.error('Error setting up collection products:', error);
            useSampleProducts();
        }
    } else {
        useSampleProducts();
    }

    // Apply theme editor settings and initialize UI components
    applyThemeEditorSettings();

    // Check if we have products
    const hasProducts = window.checkoutConfig.products && window.checkoutConfig.products.length > 0;

    if (!hasProducts) {
        console.log('No products found in theme editor. Not showing popup.');
        // Close any existing modal
        if (window.forceCloseModal) {
            window.forceCloseModal();
        }
        // Remove loading indicator
        const loadingElement = document.getElementById('theme-editor-loading');
        if (loadingElement) {
            loadingElement.remove();
        }
        return; // Exit the function early
    }

    // Only proceed with showing the modal if we have products
    if (window.updateModalContent) {
        window.updateModalContent();
    }

    if (window.initializeCountdown) {
        window.initializeCountdown(window.checkoutConfig.popupMessage?.timer_text);
    }

    if (window.forceShowModal) {
        window.forceShowModal();
    }

    // Remove loading indicator
    const loadingElement = document.getElementById('theme-editor-loading');
    if (loadingElement) {
        loadingElement.remove();
    }

    // Set up button actions with slight delay to ensure DOM is ready
    setTimeout(() => {
        setupThemeEditorButtonActions();
    }, 1000);
}

/**
 * Provides sample products as fallback when no collection is set
 * @returns {Array} Sample product data
 */
function useSampleProducts() {
    console.log('Using sample products for theme editor preview');

    // Check if theme editor has explicitly requested no products
    if (window.checkoutConfig.theme_editor?.no_products === true) {
        console.log('Theme editor requested no products to be displayed');
        window.checkoutConfig.products = [];
        return [];
    }

    const placeholderImage = 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png';
    const defaultProductId = 40934823723064; // Consistent ID for theme editor testing

    window.checkoutConfig.products = [
        {
            id: defaultProductId,
            title: 'Premium T-Shirt',
            price: '29.99',
            image: placeholderImage,
            quantity: 1,
            linkVariantId: defaultProductId,
            productId: defaultProductId
        },
        {
            id: defaultProductId,
            title: 'Stylish Hoodie',
            price: '49.99',
            image: placeholderImage,
            quantity: 1,
            linkVariantId: defaultProductId,
            productId: defaultProductId
        },
        {
            id: defaultProductId,
            title: 'Designer Jeans',
            price: '79.99',
            image: placeholderImage,
            quantity: 1,
            linkVariantId: defaultProductId,
            productId: defaultProductId
        }
    ];

    return window.checkoutConfig.products;
}

/**
 * Applies theme editor settings to the current configuration
 */
function applyThemeEditorSettings() {
    if (!window.checkoutConfig.theme_editor) return;

    const te = window.checkoutConfig.theme_editor;

    // Popup title/description
    if (te.popup_title) {
        window.checkoutConfig.popup_title = te.popup_title;
        window.checkoutConfig.popupMessage.heading_text = te.popup_title;
    }
    if (te.popup_description) {
        window.checkoutConfig.popup_description = te.popup_description;
        window.checkoutConfig.popupMessage.message_text = te.popup_description;
    }

    // Countdown settings
    if (typeof te.show_countdown === "boolean") {
        window.checkoutConfig.show_countdown = te.show_countdown;
        window.checkoutConfig.popupMessage.countdown_active = te.show_countdown;
    } else {
        window.checkoutConfig.show_countdown = true;
        window.checkoutConfig.popupMessage.countdown_active = true;
    }

    if (te.countdown_time) {
        const countdownSeconds = parseInt(te.countdown_time, 10) || 600;
        window.checkoutConfig.countdown_time = countdownSeconds;
        window.checkoutConfig.popupMessage.timer_text =
            Math.floor(countdownSeconds / 60) + " minute";
    } else {
        window.checkoutConfig.countdown_time = 600;
        window.checkoutConfig.popupMessage.timer_text = "10 minute";
    }

    if (te.countdown_label) {
        window.checkoutConfig.popupMessage.copy_text = te.countdown_label;
    } else {
        window.checkoutConfig.popupMessage.copy_text = 'This offer will expire in:';
    }

    // Button text and behavior
    if (te.checkout_button_text) {
        window.checkoutConfig.checkout_button_text = te.checkout_button_text;
        window.checkoutConfig.popupMessage.checkout_button_text = te.checkout_button_text;
    }
    if (te.close_button_text) {
        window.checkoutConfig.popupMessage.close_button_text = te.close_button_text;
    }
    if (typeof te.direct_checkout === "boolean") {
        window.checkoutConfig.direct_checkout = te.direct_checkout;
        window.checkoutConfig.popupMessage.direct_checkout = te.direct_checkout;
    }

    // Product display options
    if (typeof te.show_price === "boolean") {
        window.checkoutConfig.popupMessage.show_price = te.show_price;
    }
    if (typeof te.show_order_total === "boolean") {
        window.checkoutConfig.popupMessage.show_order_total = te.show_order_total;
    }
    if (typeof te.allow_deselect === "boolean") {
        window.checkoutConfig.popupMessage.allow_deselect = te.allow_deselect;
    }

    // Discount settings
    if (te.discount_code) {
        window.checkoutConfig.discount.code = te.discount_code;
    }
    if (te.discount_value) {
        window.checkoutConfig.discount.value = parseFloat(te.discount_value);
    }

    // Currency
    window.checkoutConfig.currency_code = window.Shopify ? (window.Shopify.currency?.active || 'USD') : 'USD';

    // Button color
    if (te.button_color) {
        document.documentElement.style.setProperty('--checkout-links-button-color', te.button_color);
    }
}

/**
 * Sets up theme editor button actions and product selection behavior
 */
function setupThemeEditorButtonActions() {
    // Configure confirm button
    setupConfirmButton();

    // Configure close button
    setupCloseButton();
}

/**
 * Sets up the confirm (checkout) button with proper event handling
 */
function setupConfirmButton() {
    const confirmBtn = document.querySelector('.confirm-btn');
    if (!confirmBtn) return;

    const confirmBtnClone = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(confirmBtnClone, confirmBtn);

    if (window.checkoutConfig.theme_editor?.button_color) {
        confirmBtnClone.style.backgroundColor = window.checkoutConfig.theme_editor.button_color;
    }

    confirmBtnClone.addEventListener('click', async function (e) {
        e.preventDefault();
        const directCheckout = window.checkoutConfig.popupMessage?.direct_checkout !== false;

        // Get selected products
        const selectedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'))
            .map(checkbox => {
                const productEl = checkbox.closest('.order-item');
                return window.checkoutConfig.products.find(p =>
                    (p.id === productEl.dataset.productId) ||
                    (productEl.dataset.linkVariantId && p.linkVariantId === parseInt(productEl.dataset.linkVariantId))
                );
            })
            .filter(Boolean);

        // Filter to include only one variant per product ID
        const uniqueProducts = [];
        const productIds = new Set();

        selectedProducts.forEach(product => {
            if (!productIds.has(product.productId)) {
                productIds.add(product.productId);
                uniqueProducts.push(product);
            }
        });

        // Validate selection
        if (uniqueProducts.length === 0) {
            alert('Please select at least one product to continue');
            return;
        }

        // Prepare cart items
        const cartItems = uniqueProducts.map(product => {
            let variantId;

            if (product.linkVariantId) {
                variantId = parseInt(product.linkVariantId);
            } else if (typeof product.id === 'string' && !/^\d+$/.test(product.id)) {
                variantId = 40934823723064; // Fallback ID for compatibility
            } else {
                variantId = parseInt(product.id);
            }

            return {
                'id': variantId,
                'quantity': parseInt(product.quantity) || 1
            };
        });

        // Show loading state
        confirmBtnClone.innerHTML = 'Clearing cart... <span class="loading-dots">...</span>';
        confirmBtnClone.disabled = true;

        // Add loading dots animation
        const loadingDotsAnimation = setInterval(() => {
            const dotsElement = confirmBtnClone.querySelector('.loading-dots');
            if (dotsElement) {
                dotsElement.textContent = dotsElement.textContent === '...' ? '.' :
                    dotsElement.textContent === '.' ? '..' : '...';
            }
        }, 300);

        try {
            // Clear the existing cart
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

            // Update button state
            confirmBtnClone.innerHTML = 'Adding to cart... <span class="loading-dots">...</span>';

            // Define cart URL
            const cartUrl = '/cart/add.js';

            // Add items to cart
            const response = await fetch(cartUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    items: cartItems,
                    attributes: {
                        'checkout_link_id': window.checkoutConfig.link_id || 'theme-editor-preview',
                        'source': 'checkout-links-unique-theme-editor',
                        'discount_expired': document.querySelector('.expiration-message')?.style.display === 'block' ? 'true' : 'false'
                    }
                })
            });
            // console.log('Add to cart response:', cartItems);

            const responseData = await response.json();
            clearInterval(loadingDotsAnimation);

            if (!response.ok) {
                throw new Error(responseData.description || `Error ${response.status}: Failed to add items to cart`);
            }

            // Success handling
            confirmBtnClone.textContent = 'Added to cart!';

            // Redirect to cart or checkout
            setTimeout(() => {
                const discountCode = window.checkoutConfig.discount?.code || '';
                const discountExpired = document.querySelector('.expiration-message')?.style.display === 'block';

                if (directCheckout) {
                    let checkoutUrl = '/checkout';

                    if (discountCode && !discountExpired) {
                        const specificProductIds = cartItems.map(item => parseInt(item.id)).join(',');
                        checkoutUrl += `?discount=${encodeURIComponent(discountCode)}&discount_specific_products=${specificProductIds}`;
                    }

                    window.location.href = checkoutUrl;
                } else {
                    window.location.href = '/cart';
                }
            }, 500);
        } catch (error) {
            console.error('Error handling cart in theme editor:', error);
            clearInterval(loadingDotsAnimation);

            // Show appropriate error message
            let errorMessage = 'Error! Try again';
            if (error.message.includes('not available')) {
                errorMessage = 'Product not available in this store';
            } else if (error.message.includes('Variant')) {
                errorMessage = 'Product variant issue';
            } else if (error.message.includes('sold out')) {
                errorMessage = 'Product sold out';
            }

            confirmBtnClone.textContent = errorMessage;
            confirmBtnClone.disabled = false;

            // Notify user about demo mode limitations if applicable
            if (error.message.includes('not available') || error.message.includes('Variant')) {
                alert('Theme editor notice: The demo products cannot be added to cart in this store. This is normal in demo mode. In a real store with actual products, the checkout would work correctly.');
            }

            setTimeout(() => {
                confirmBtnClone.textContent = window.checkoutConfig.popupMessage?.checkout_button_text || 'Confirm';
            }, 3000);
        }
    });
}

/**
 * Sets up the close (no thanks) button with proper event handling
 */
function setupCloseButton() {
    const noThanksBtn = document.querySelector('.no-thanks');
    if (!noThanksBtn) return;

    const noThanksBtnClone = noThanksBtn.cloneNode(true);
    noThanksBtn.parentNode.replaceChild(noThanksBtnClone, noThanksBtn);

    noThanksBtnClone.addEventListener('click', function (e) {
        e.preventDefault();

        const closeLink = window.checkoutConfig.popupMessage?.close_button_link;
        if (closeLink && closeLink !== '#') {
            window.location.href = closeLink;
        } else if (window.forceCloseModal) {
            window.forceCloseModal();
        }

        return false;
    });
}
