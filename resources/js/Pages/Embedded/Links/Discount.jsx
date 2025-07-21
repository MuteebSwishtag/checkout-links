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
import React, { useState } from 'react'

export default function Discount() {
  const [freeShipping, setFreeShipping] = useState(false);
  const [orderDiscount, setOrderDiscount] = useState(false);
  const [discountCode, setDiscountCode] = useState(false);
  const [discountValue, setDiscountValue] = useState('20');
  const [discountCodeValue, setDiscountCodeValue] = useState('');

  // Toggle handlers that properly flip the boolean values
  const handleFreeShippingToggle = () => setFreeShipping(!freeShipping);
  const handleOrderDiscountToggle = () => setOrderDiscount(!orderDiscount);
  const handleDiscountCodeToggle = () => setDiscountCode(!discountCode);

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
            {/* <Checkbox
              checked={freeShipping}
              onChange={setFreeShipping}
              ariaLabel="Enable free shipping"
            /> */}
             <Toggle
               toggled={freeShipping}
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
                toggled={orderDiscount}
                onClick={handleOrderDiscountToggle}
              />
            </InlineStack>

           
            {orderDiscount && (
              <Box>
                <TextField
                  value={discountValue}
                  onChange={setDiscountValue}
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
              toggled={discountCode}
              onClick={handleDiscountCodeToggle}
            />

            
          </InlineStack>

          
          {discountCode && (
            <Box>
              <TextField
                value={discountCodeValue}
                onChange={setDiscountCodeValue}
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
