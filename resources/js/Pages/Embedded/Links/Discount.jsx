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

export default function Discount({ onDiscountChange }) {
  const [freeShipping, setFreeShipping] = useState(false);
  const [orderDiscount, setOrderDiscount] = useState(false);
  const [discountCode, setDiscountCode] = useState(false);
  const [discountValue, setDiscountValue] = useState('20');
  const [discountCodeValue, setDiscountCodeValue] = useState('');

  // Toggle handlers that properly flip the boolean values
  const handleFreeShippingToggle = () => {
    const newValue = !freeShipping;
    setFreeShipping(newValue);
    updateParent(newValue, orderDiscount, discountValue, discountCode, discountCodeValue);
  };
  
  const handleOrderDiscountToggle = () => {
    const newValue = !orderDiscount;
    setOrderDiscount(newValue);
    updateParent(freeShipping, newValue, discountValue, discountCode, discountCodeValue);
  };
  
  const handleDiscountCodeToggle = () => {
    const newValue = !discountCode;
    setDiscountCode(newValue);
    updateParent(freeShipping, orderDiscount, discountValue, newValue, discountCodeValue);
  };

  const handleDiscountValueChange = (value) => {
    setDiscountValue(value);
    updateParent(freeShipping, orderDiscount, value, discountCode, discountCodeValue);
  };

  const handleDiscountCodeValueChange = (value) => {
    setDiscountCodeValue(value);
    updateParent(freeShipping, orderDiscount, discountValue, discountCode, value);
  };

  // Function to update parent component with discount data
  const updateParent = (freeShip, orderDisc, discValue, discCode, discCodeValue) => {
    if (onDiscountChange) {
      onDiscountChange({
        freeShipping: freeShip,
        orderDiscount: orderDisc,
        discountValue: discValue,
        discountCode: discCode,
        discountCodeValue: discCodeValue
      });
    }
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
              toggled={discountCode}
              onClick={handleDiscountCodeToggle}
            />

            
          </InlineStack>

          
          {discountCode && (
            <Box>
              <TextField
                value={discountCodeValue}
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
