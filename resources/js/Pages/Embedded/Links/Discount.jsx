import Toggle from '@/Components/Toggle';
import { 
  Text, 
  Card, 
  Box, 
  BlockStack, 
  InlineStack, 
  TextField, 
  Checkbox 
} from '@shopify/polaris'
import React from 'react'

export default function Discount({ discountData, onFreeShippingChange, onOrderDiscountChange, onDiscountValueChange, onDiscountCodeChange, onDiscountCodeValueChange }) {
  
  // Toggle handlers that call parent functions with mutual exclusivity
  const handleFreeShippingToggle = () => {
    if (!discountData.freeShipping) {
      // Turn on free shipping and turn off others
      onFreeShippingChange(true);
      onOrderDiscountChange(false);
      onDiscountCodeChange(false);
    } else {
      // Turn off free shipping
      onFreeShippingChange(false);
    }
  };
  
  const handleOrderDiscountToggle = () => {
    if (!discountData.orderDiscount) {
      // Turn on order discount and turn off others
      onOrderDiscountChange(true);
      onFreeShippingChange(false);
      onDiscountCodeChange(false);
    } else {
      // Turn off order discount
      onOrderDiscountChange(false);
    }
  };

  const handleDiscountCodeToggle = () => {
    if (!discountData.discountCode) {
      // Turn on discount code and turn off others
      onDiscountCodeChange(true);
      onFreeShippingChange(false);
      onOrderDiscountChange(false);
    } else {
      // Turn off discount code
      onDiscountCodeChange(false);
    }
  };

  const handleDiscountValueChange = (value) => {
    onDiscountValueChange(value);
  };

  const handleDiscountCodeValueChange = (value) => {
    onDiscountCodeValueChange(value);
  };

  return (
    <BlockStack gap="400">
      {/* Free shipping Card */}
      <Card>
        <Box padding="">
          <InlineStack align="space-between" blockAlign="start">
            <Box>
              <Text variant="bodyMd" fontWeight="medium">
                Free shipping
              </Text>
              <Box paddingBlockStart="050">
                <Text variant="bodyMd" tone="subdued">
                  Add free shipping for customers
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
                  Order discount
                </Text>
                <Box paddingBlockStart="050">
                  <Text variant="bodyMd" tone="subdued">
                    Automatically apply a discount to order
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
                  value={discountData.discountValue}
                  onChange={handleDiscountValueChange}
                  suffix="%"
                  type="number"
                  autoComplete="off"
                  min={0}
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
                Use a discount code
              </Text>
              <Box paddingBlockStart="050">
                <Text variant="bodyMd" tone="subdued">
                  Add any existing discount code to order
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
              />
            </Box>
          )}
            </BlockStack>
        </Box>
      </Card>
    </BlockStack>
  )
}
