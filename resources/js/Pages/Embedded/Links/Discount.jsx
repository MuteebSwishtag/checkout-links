import Toggle from '@/Components/Toggle';
import {
  Text,
  Card,
  Box,
  BlockStack,
  InlineStack,
  TextField,
  Checkbox,
  Banner
} from '@shopify/polaris'
import React from 'react'

export default function Discount({
  discountData,
  errors = {},
  onFreeShippingChange,
  onOrderDiscountChange,
  onDiscountValueChange,
  onDiscountCodeChange,
  onDiscountCodeValueChange
}) {

  // Toggle handlers that call parent functions with mutual exclusivity
  const handleFreeShippingToggle = () => {
    if (!discountData.freeShipping) {
      // Turn on free shipping, turn off others and reset their values
      onFreeShippingChange(true);
      onOrderDiscountChange(false);
      onDiscountCodeChange(false);
      onDiscountValueChange('');        // reset discount value
      onDiscountCodeValueChange('');    // reset discount code
    } else {
      // Turn off free shipping
      onFreeShippingChange(false);
    }
  };

  const handleOrderDiscountToggle = () => {
    if (!discountData.orderDiscount) {
      // Turn on order discount, turn off others and reset their values
      onOrderDiscountChange(true);
      onFreeShippingChange(false);
      onDiscountCodeChange(false);
      onDiscountCodeValueChange('');    // reset discount code
    } else {
      // Turn off order discount
      onOrderDiscountChange(false);
      onDiscountValueChange('');
    }
  };

  const handleDiscountCodeToggle = () => {
    if (!discountData.discountCode) {
      // Turn on discount code, turn off others and reset their values
      onDiscountCodeChange(true);
      onFreeShippingChange(false);
      onOrderDiscountChange(false);
      onDiscountValueChange('');        // reset discount value
    } else {
      // Turn off discount code
      onDiscountCodeChange(false);
      onDiscountCodeValueChange('');
    }
  };

  const handleDiscountValueChange = (value) => {
    // Remove dashes and any non-numeric characters except empty string
    let cleanValue = value.replace(/-/g, '').replace(/[^0-9]/g, '');

    // If empty, allow it (user might be clearing the field)
    if (cleanValue === '') {
      onDiscountValueChange('');
      return;
    }

    // Remove leading zeros
    cleanValue = cleanValue.replace(/^0+/, '');
    
    // If still empty after removing zeros, set to empty
    if (cleanValue === '') {
      onDiscountValueChange('');
      return;
    }

    // Convert to number to validate
    const numericValue = Number(cleanValue);

    // Only allow integers from 1 to 100
    if (numericValue < 1 || numericValue > 100) return;

    // Update with the integer value
    onDiscountValueChange(cleanValue);
  };


  const handleDiscountCodeValueChange = (value) => {
    onDiscountCodeValueChange(value);
  };

  return (
    <BlockStack gap="400">
      {/* Display any general discount errors */}
      {errors && errors.general && errors.general !== '' && (
        <Banner status="critical">{errors.general}</Banner>
      )}

      {/* Free shipping Card */}
      <Card>
        <Box padding="">
          <InlineStack align="space-between" blockAlign="start">
            <Box>
              <Text variant="bodyMd" fontWeight="medium">
                <p className='text-black font-bold'>Free shipping</p>
              </Text>
              <Box paddingBlockStart="050">
                <Text variant="bodyMd" tone="subdued">
                  <p className='text-black font-normal'>Add free shipping for customers</p>
                </Text>
              </Box>
            </Box>

            <Toggle
              toggled={discountData.freeShipping}
              onClick={handleFreeShippingToggle}
            />
          </InlineStack>
        </Box>
      </Card>

      {/* Order discount Card */}
      <Card>
        <Box padding="100">
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="start">
              <Box>
                <Text variant="bodyMd" fontWeight="medium">
                  <p className='text-black font-bold'>Order discount</p>
                </Text>
                <Box paddingBlockStart="050">
                  <Text variant="bodyMd" tone="subdued">
                    <p className='text-black font-normal'>Automatically apply a discount to order</p>
                  </Text>
                </Box>
              </Box>

              <Toggle
                toggled={discountData.orderDiscount}
                onClick={handleOrderDiscountToggle}
              />
            </InlineStack>


            {discountData.orderDiscount && (
              <Box>
                <TextField
                  value={discountData.discountValue || ''}
                  onChange={handleDiscountValueChange}
                  suffix="%"
                  placeholder='Enter value 1-100'
                  type="text"
                  autoComplete="off"
                  error={errors.discountValue || ''}
                  helpText="Enter a whole number between 1 and 100"
                />
              </Box>
            )}
          </BlockStack>
        </Box>
      </Card>


      <Card>
        <Box padding="100">
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="start">
              <Box>
                <Text variant="bodyMd" fontWeight="medium">
                  <p className='text-black font-bold'>Use a discount code</p>
                </Text>
                <Box paddingBlockStart="050">
                  <Text variant="bodyMd" tone="subdued">
                    <p className='text-black font-normal'>Add any existing discount code to order</p>
                  </Text>
                </Box>
              </Box>

              <Toggle
                toggled={discountData.discountCode}
                onClick={handleDiscountCodeToggle}
              />


            </InlineStack>


            {discountData.discountCode && (
              <Box>
                <TextField
                  value={discountData.discountCodeValue}
                  onChange={handleDiscountCodeValueChange}
                  placeholder="Enter discount code"
                  autoComplete="off"
                  min={0}
                  error={errors.discountCodeValue || ''}
                />
              </Box>
            )}
          </BlockStack>
        </Box>
      </Card>
    </BlockStack>
  )
}
