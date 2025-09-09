// Function to set up sample data for theme editor preview
async function setupSampleDataForThemeEditor() {
    console.log('Setting up sample data for theme editor');

  // Set up sample data for theme editor preview
  window.checkoutConfig.link_id = window.checkoutConfig.link_id || 'sample-link-id';

    // Check if there are selected products from the theme editor settings
    if (window.checkoutConfig.theme_editor &&
        window.checkoutConfig.theme_editor.selected_products &&
        window.checkoutConfig.theme_editor.selected_products.length > 0) {

        try {
            // Attempt to fetch the selected products from the store
            const selectedProductIds = window.checkoutConfig.theme_editor.selected_products;
            let fetchedProducts = [];

            // For theme editor, we'll simulate products based on the IDs
            fetchedProducts = selectedProductIds.map((id, index) => {
                return {
                    id: id,
                    title: `Selected Product ${index + 1}`,
                    price: ((19.99 * (index + 1)).toFixed(2)).toString(),
                    image: `https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-${index + 1}_large.png`,
                    quantity: 1
                };
            });

            // Use the fetched products
            window.checkoutConfig.products = fetchedProducts;
            console.log('Using selected products from theme editor settings:', fetchedProducts);
        } catch (error) {
            console.error('Error fetching selected products:', error);
            // Fall back to sample products
            useSampleProducts();
        }
    } else {
        // Use sample products if none are selected in the theme editor
        useSampleProducts();
    }

    // Set up currency code
    window.checkoutConfig.currency_code = window.Shopify ? (window.Shopify.currency?.active || 'USD') : 'USD';

    // Apply button color from settings if available
    if (window.checkoutConfig.theme_editor && window.checkoutConfig.theme_editor.button_color) {
        const buttonColor = window.checkoutConfig.theme_editor.button_color;
        document.documentElement.style.setProperty('--checkout-links-button-color', buttonColor);
    }

    // Initialize UI with the sample data
    updateModalContent();

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
          const directCheckout = window.checkoutConfig.popupMessage?.direct_checkout;
          alert(`This button would add the selected items to cart${directCheckout ? ' and proceed to checkout' : ''}. (Demo mode in theme editor)`);
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
