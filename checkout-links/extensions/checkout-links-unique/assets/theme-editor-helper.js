// Function to set up sample data for theme editor preview
function setupSampleDataForThemeEditor() {
  // Set up sample data for theme editor preview
  window.checkoutConfig.link_id = window.checkoutConfig.link_id || 'sample-link-id';
  window.checkoutConfig.products = window.checkoutConfig.products || [
    {
      id: 'sample-product-1',
      title: 'Sample Product',
      price: '19.99',
      image: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png',
      quantity: 1
    }
  ];
  
  // Ensure discount is set up
  if (!window.checkoutConfig.discount) {
    window.checkoutConfig.discount = {
      code: 'SAMPLE10',
      value: 10,
      freeShipping: false,
      orderDiscount: true
    };
  }
  
  // Initialize UI with the sample data
  updateModalContent();
}
