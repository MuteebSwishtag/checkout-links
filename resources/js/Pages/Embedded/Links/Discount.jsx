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
    // Remove dashes
    let removeDash = value.replace(/-/g, '');

    // Convert to number to validate
    const numericValue = Number(removeDash);

    // If value is greater than 100, do not update
    if (numericValue > 100) return;

    // Otherwise, update
    onDiscountValueChange(removeDash);
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
                  placeholder='20'
                  type="number"
                  autoComplete="off"
                  min={0}
                  max={100}
                  error={errors.discountValue || ''}
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
