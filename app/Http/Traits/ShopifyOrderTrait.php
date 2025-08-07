<?php

namespace App\Http\Traits;

use App\Models\Link;
use Carbon\Carbon;

use App\Models\User;
use App\Http\Traits\ResponseTrait;
use Illuminate\Support\Facades\DB;
use App\Repositories\Order\OrderRepositoryInterface;
use Carbon\CarbonInterval;
use Illuminate\Support\Facades\Log;

trait ShopifyOrderTrait
{
    use ResponseTrait;
    protected $order;
    public function getOrderRepository(OrderRepositoryInterface $order)
    {
        $this->order = $order;
    }
    public function getOrdersFromShopify(User $user)
    {
        try {
            $orderCount = $this->getOrdersCountFromShopify($user);
            $cursor = 'null';
            $loop = ceil($orderCount / 250);
            $hasErrors = false;
            for ($i = 1; $i <= $loop; $i++) {
                [$orders, $nextCursor] = $this->shopifyGraphqlOrderQuery($user, $cursor);
                if ($orders && $nextCursor) {
                    $cursor = '"' . $nextCursor . '"';
                    foreach ($orders as $order) {
                        $order = $this->transformShopifyOrderData($order);
                        Log::info("Order Data: " . json_encode($order, JSON_PRETTY_PRINT));
                        if (!$this->storeData($this->arrayToObject($order), $user)) {
                            $hasErrors = true;
                        }
                    }
                }
            }
            if ($hasErrors) {
                throw new \Exception("Some Orders could not be stored.");
            }
        } catch (\Exception $e) {
            Log::error(json_encode($e->getMessage(), JSON_PRETTY_PRINT));
            return false;
        }
        return true;
    }
    public function getOrdersCountFromShopify($user)
    {
        $query = <<<QUERY
            query{
                ordersCount(limit: 2000){
                    count
                    precision
                }
            }
        QUERY;
        $result = $this->arrayToObject($user->api()->graph($query));
        Log::info("Orders Count Query Result: " . json_encode($result, JSON_PRETTY_PRINT));
        if ($result->errors) {
            return 0;
        } else {
            return $result->body->data->ordersCount->count;
        }
    }
    public function shopifyGraphqlOrderQuery($user, $cursor)
    {
        $query = <<<QUERY
            query {
                orders(first: 250, after: $cursor) {
                    edges {
                        node {
                            id
                            email
                            displayFinancialStatus
                            displayFulfillmentStatus
                            name
                            note
                            phone
                            subtotalPriceSet{
                                shopMoney {
                                    amount
                                }
                            }
                            tags
                            totalDiscountsSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalOutstandingSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalPriceSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalShippingPriceSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalTaxSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalTipReceivedSet{
                                shopMoney {
                                    amount
                                }
                            }
                            totalWeight
                            customer {
                                id
                                email
                                firstName
                                lastName
                                phone
                            }
                            lineItems(first: 250) {
                                edges {
                                    node {
                                        id
                                        originalUnitPriceSet {
                                            shopMoney {
                                                amount
                                            }
                                        }
                                        quantity
                                        sku
                                        title
                                        totalDiscountSet {
                                            shopMoney {
                                                amount
                                            }
                                        }
                                        variant {
                                            id
                                        }
                                    }
                                }
                            }
                            shippingAddress {
                                firstName
                                lastName
                                address1
                                phone
                                city
                                zip
                                province
                                country
                                company
                                countryCodeV2
                                provinceCode
                            }
                            fulfillments(first: 250){
                                id
                                location{
                                    id
                                }
                                name
                                service{
                                    type
                                }
                                displayStatus
                                status
                                trackingInfo{
                                    company
                                    number
                                    url
                                }
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        QUERY;
        $result = $this->arrayToObject($user->api()->graph($query));
        if ($result->errors) {
            return [null, null];
        } else {
            $orders = $result->body->data->orders->edges;
            $cursor = $result->body->data->orders->pageInfo->endCursor;
            return [$orders, $cursor];
        }
    }
    public function storeData($order, User $user, $update = false)
    {
        DB::beginTransaction();
        try {
            $formatedData = $this->formateOrderData($order, $user);
            if ($update) {
                $order = $this->order->getByShopifyId($order->id);
                if (!$order) {
                    Log::info("Order May be deleted: " . json_encode($order, JSON_PRETTY_PRINT));
                    return true;
                }
            }
            $this->order->updateOrCreate($formatedData);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to store Order: " . json_encode($order));
            Log::error("Exception: " . json_encode($e->getMessage(), JSON_PRETTY_PRINT));
            return false;
        }
        DB::commit();
        return true;
    }
    public function formateOrderData($order, $user)
    {
        $formatedOrder = [
            "shopify_order_id" => $order->id,
            "user_id" => $user->id,
            "contact_email" => $order->contact_email,
            "email" => $order->email,
            "financial_status" => strtoupper($order->financial_status) ?? 'UNPAID',
            "fulfillment_status" => $order->fulfillment_status ? strtoupper($order->fulfillment_status) : 'UNFULFILLED',
            "name" => $order->name,
            "note" => $order->note,
            "phone" => $order->phone,
            "subtotal_price" => $order->subtotal_price,
            "tags" => $order->tags,
            "total_discounts" => $order->total_discounts,
            "total_line_items_price" => $order->total_line_items_price,
            "total_outstanding" => $order->total_outstanding,
            "total_price" => $order->total_price,
            "total_shipping_price" => $order->total_shipping_price_set->shop_money->amount ?? 0,
            "total_tax" => $order->total_tax,
            "total_tip_received" => $order->total_tip_received,
            "total_weight" => $order->total_weight,
            "customer" => $this->formateOrderCustomerData($order->customer),
            "line_items" => $this->formateOrderLineItemsData($order->line_items),
            "shipping_address" => $this->formateOrderShippingAddressData($order->shipping_address),
            "fulfillments" => $this->formateOrderFulfillmentsData($order->fulfillments)
        ];
        return $formatedOrder;
    }
    public function formateOrderCustomerData($customer)
    {
        if (!$customer) {
            return null;
        }
        $orderCustomer = [
            "shopify_customer_id" => $customer->id,
            "email" => $customer->email,
            "first_name" => $customer->first_name,
            "last_name" => $customer->last_name,
            "phone" => $customer->phone,
        ];
        return $orderCustomer;
    }
    public function formateOrderLineItemsData($lineItems)
    {
        $orderLineItems = [];
        foreach ($lineItems as $item) {
            $orderLineItems[] = [
                "shopify_order_lineitem_id" => $item->id,
                "price" => $item->price,
                "quantity" => $item->quantity,
                "sku" => $item->sku,
                "title" => $item->title,
                "total_discount" => $item->total_discount,
                "shopify_product_variant_id" => $item->variant_id,
            ];
        }
        return $orderLineItems;
    }
    public function formateOrderShippingAddressData($shippingAddress)
    {
        if (!$shippingAddress) {
            return null;
        }
        $orderShippingAddress = [
            "first_name" => $shippingAddress->first_name,
            "last_name" => $shippingAddress->last_name,
            "address1" => $shippingAddress->address1,
            "phone" => $shippingAddress->phone,
            "city" => $shippingAddress->city,
            "zip" => $shippingAddress->zip,
            "province" => $shippingAddress->province,
            "country" => $shippingAddress->country,
            "company" => $shippingAddress->company,
            "country_code" => $shippingAddress->country_code,
            "province_code" => $shippingAddress->province_code
        ];
        return $orderShippingAddress;
    }
    public function formateOrderFulfillmentsData($fulfillment)
    {
        $orderFulfillments = [];
        foreach ($fulfillment as $fulfill) {
            $orderFulfillments[] = [
                "shopify_order_fulfillment_id" => $fulfill->id,
                "shopify_order_fulfillment_location_id" => $fulfill->location_id,
                "name" => $fulfill->name,
                "service" => strtoupper($fulfill->service),
                "shipment_status" => strtoupper($fulfill->shipment_status),
                "status" => strtoupper($fulfill->status),
                "tracking_company" => $fulfill->tracking_company,
                "tracking_number" => $fulfill->tracking_number,
                "tracking_url" => $fulfill->tracking_url,
            ];
        }
        return $orderFulfillments;
    }
    public function deleteOrder($orderId)
    {
        DB::beginTransaction();
        try {
            $order = $this->order->getByShopifyId($orderId);
            $this->order->delete($order->id);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error(json_encode($e->getMessage(), JSON_PRETTY_PRINT));
            return false;
        }
        DB::commit();
        return true;
    }
    public function transformShopifyOrderData($data): array
    {
        $node = $data->node;
        $orderLineItems = [];
        if (!empty($node->lineItems->edges)) {
            foreach ($node->lineItems->edges as $edge) {
                $lineItem = $edge->node;
                $orderLineItems[] = [
                    'id' => $this->extractId($lineItem->id),
                    'price' => $lineItem->originalUnitPriceSet->shopMoney->amount ?? null,
                    'quantity' => $lineItem->quantity ?? null,
                    'sku' => $lineItem->sku ?? null,
                    'title' => $lineItem->title ?? null,
                    'total_discount' => $lineItem->totalDiscountSet->shopMoney->amount ?? 0,
                    'variant_id' => $lineItem->variant?->id ? $this->extractId($lineItem->variant->id) : null,
                ];
            }
        }
        $fulfillments = [];
        if (!empty($node->fulfillments)) {
            foreach ($node->fulfillments as $fulfillment) {
                $fulfillments[] = [
                    "id" => $this->extractId($fulfillment->id),
                    "location_id" => $this->extractId($fulfillment->location->id ?? null),
                    "name" => $fulfillment->name,
                    "service" => $fulfillment->service->type,
                    "shipment_status" => $fulfillment->displayStatus,
                    "status" => $fulfillment->status,
                    "tracking_company" => $fulfillment->trackingInfo[0]->company,
                    "tracking_number" => $fulfillment->trackingInfo[0]->number,
                    "tracking_url" => $fulfillment->trackingInfo[0]->url,
                ];
            }
        }
        $customer = $node->customer;
        if (!empty($customer)) {
            $customer = [
                'id' => $this->extractId($customer->id),
                "email" => $customer->email ?? null,
                "first_name" => $customer->firstName ?? null,
                "last_name" => $customer->lastName ?? null,
                "phone" => $customer->phone ?? null,
            ];
        }
        $shippingAddress = $node->shippingAddress;
        if (!empty($shippingAddress)) {
            $shippingAddress = [
                "first_name" => $shippingAddress->firstName,
                "last_name" => $shippingAddress->lastName,
                "address1" => $shippingAddress->address1,
                "phone" => $shippingAddress->phone,
                "city" => $shippingAddress->city,
                "zip" => $shippingAddress->zip,
                "province" => $shippingAddress->province,
                "country" => $shippingAddress->country,
                "company" => $shippingAddress->company,
                "country_code" => $shippingAddress->countryCodeV2,
                "province_code" => $shippingAddress->provinceCode
            ];
        }
        $order = [
            'id' => $this->extractId($node->id),
            "contact_email" => $node->email,
            "email" => $node->email,
            "financial_status" => $node->displayFinancialStatus,
            "fulfillment_status" => $node->displayFulfillmentStatus,
            "name" => $node->name,
            "note" => $node->note,
            "phone" => $node->phone,
            "subtotal_price" => $node->subtotalPriceSet->shopMoney->amount ?? 0,
            "tags" => $this->arrayToString($node->tags),
            "total_discounts" => $node->totalDiscountsSet->shopMoney->amount ?? 0,
            "total_line_items_price" => 0,
            "total_outstanding" => $node->totalOutstandingSet->shopMoney->amount ?? 0,
            "total_price" => $node->totalPriceSet->shopMoney->amount ?? 0,
            "total_shipping_price" => $node->totalShippingPriceSet->shopMoney->amount ?? 0,
            "total_tax" => $node->totalTaxSet->shopMoney->amount ?? 0,
            "total_tip_received" => $node->totalTipReceivedSet->shopMoney->amount ?? 0,
            "total_weight" => $node->totalWeight,
            'line_items' => $orderLineItems,
            'customer' => $customer,
            'shipping_address' => $shippingAddress,
            'fulfillments' => $fulfillments,
        ];
        return $order;
    }
    public function arrayToObject($data)
    {
        return json_decode(json_encode($data));
    }
    public function arrayToString($data)
    {
        if (is_array($data)) {
            if (empty($data)) {
                return '';
            } else {
                return implode(',', $data);
            }
        }
        return $data;
    }
    public function extractId($id)
    {
        $arr = explode('/', $id);
        return end($arr);
    }

    /**
     * Create a draft order in Shopify based on link data using GraphQL
     * 
     * @param int $linkId The ID of the link
     * @param array $customerData Customer information for the order
     * @return array|null The draft order data with invoice URL or null on failure
     */
    public function createDraftOrder($linkId, $customerData = [])
    {
        try {
            // Get the link with its products and popup message
            $link = Link::with(['popupMessage', 'linkedVariants.variant.product', 'user'])
                ->findOrFail($linkId);

            // If link not found or has no user, return null
            if (!$link || !$link->user) {
                Log::error("Link not found or has no associated user", ['link_id' => $linkId]);
                return null;
            }

            // Initialize line items array for GraphQL
            $lineItemsInput = [];

            // Add all linked product variants to the order
            foreach ($link->linkedVariants as $linkedVariant) {
                $variant = $linkedVariant->variant;
                Log::info("Variant" . json_encode($variant, JSON_PRETTY_PRINT));
                if (!$variant)
                    continue;

                $lineItemInput = [
                    'variantId' => 'gid://shopify/ProductVariant/' . $variant->shopify_product_varient_id,
                    'quantity' => 1
                ];

                // If custom price is set in the link, override the variant price
                if ($linkedVariant->price) {
                    $lineItemInput['customAttributes'] = [
                        ['key' => '_override_price', 'value' => (string) $linkedVariant->price]
                    ];
                }
                $lineItemsInput[] = $lineItemInput;
            }
            // If no line items, return null
            if (empty($lineItemsInput)) {
                Log::error("No valid line items found for link", ['link_id' => $linkId]);
                return null;
            }

            // Build the mutation for creating a draft order
            $mutation = $this->buildDraftOrderCreateMutation(
                $lineItemsInput,
                $link->link_name,
                $customerData,
                $link->discount_code,
                $link->discount_value,
                $link->free_shipping,
                $link->order_discount
            );

            // Execute the GraphQL mutation
            $result = $this->arrayToObject($link->user->api()->graph($mutation));

            // Log the complete response for debugging
            Log::info("Draft Order Create Response", ['response' => json_encode($result, JSON_PRETTY_PRINT)]);

            // Check for errors
            if (!empty($result->errors)) {
                Log::error("Failed to create draft order via GraphQL", [
                    'errors' => $result->errors,
                    'link_id' => $linkId
                ]);
                return null;
            }

            // Check if the response has the expected structure
            if (
                !isset($result->body) || !isset($result->body->data) ||
                !isset($result->body->data->draftOrderCreate) ||
                !isset($result->body->data->draftOrderCreate->draftOrder)
            ) {
                Log::error("Unexpected response structure from Shopify API", [
                    'result' => $result,
                    'link_id' => $linkId
                ]);
                return null;
            }

            // Extract draft order data
            $draftOrder = $result->body->data->draftOrderCreate->draftOrder;

            if (!$draftOrder) {
                \Illuminate\Support\Facades\Log::error("Draft order creation failed but no error returned", [
                    'result' => $result,
                    'link_id' => $linkId
                ]);
                return null;
            }
            // Increment the placed_order count for the link
            $link->increment('placed_order');

            // Return the draft order data with invoice URL
            return [
                'draft_order_id' => $this->extractId($draftOrder->id),
                'invoice_url' => $draftOrder->invoiceUrl,
                'status' => $draftOrder->status,
                'total_price' => is_object($draftOrder->totalPrice) ? $draftOrder->totalPrice->amount : $draftOrder->totalPrice
            ];
        } catch (\Exception $e) {
            Log::error("Exception when creating draft order: " . $e->getMessage(), [
                'link_id' => $linkId,
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Build the GraphQL mutation for creating a draft order
     * 
     * @param array $lineItems Line items data
     * @param string $linkName Name of the link for order note
     * @param array $customerData Customer information
     * @param string|null $discountCode Discount code
     * @param float|null $discountValue Discount value
     * @param bool $freeShipping Whether to apply free shipping
     * @param float|null $orderDiscount Order-level discount amount
     * @return string The GraphQL mutation string
     */
    private function buildDraftOrderCreateMutation($lineItems, $linkName, $customerData, $discountCode, $discountValue, $freeShipping, $orderDiscount)
    {
        // Build the input object as an array first
        $input = [];
        log::info("building draft order create mutation" . json_encode($discountValue, JSON_PRETTY_PRINT));

        // Add line items
        $input['lineItems'] = $lineItems;

        // Add note
        $input['note'] = "Created from Checkout Link: $linkName";

        // Add customer if provided
        if (!empty($customerData)) {
            $input['customerId'] = $customerData['id'] ?? null;
        }

        // Add discount if specified
        if ($discountCode && $discountValue > 0) {
            // Add a discount as a custom line item with negative price
            $discountLineItem = [
                "title" => "Discount ($discountCode)",
                "price" => [
                    "amount" => (-1 * $discountValue),
                    "currencyCode" => "USD" // You might want to make this dynamic
                ],
                "quantity" => 1
            ];
            $input['lineItems'][] = $discountLineItem;
        }

        // Apply free shipping if enabled
        if ($freeShipping) {
            $input['shippingLine'] = [
                "title" => "Free Shipping",
                "price" => ["amount" => "0.0", "currencyCode" => "USD"]
            ];
        }

        // Apply order discount if specified
        // Order discount must be a float for Shopify GraphQL API
        $floatDiscountValue = (float) ($discountValue ?? 0);
        // log::info("Order Discount Value: " . json_encode($floatDiscountValue, JSON_PRETTY_PRINT));
        if ($orderDiscount && $orderDiscount > 0) {
            $floatDiscountValue = (float) ($discountValue ?? 0);
            $input['appliedDiscount'] = [
                "description" => "Order Discount",
                "value" => $floatDiscountValue, // Raw float value
                "valueType" => "FIXED_AMOUNT"
            ];
        }

        // Format the input variables correctly for GraphQL
        $inputParams = [];
        foreach ($input as $key => $value) {
            if ($key === 'lineItems') {
                $items = [];
                foreach ($value as $item) {
                    $itemStr = '{';
                    foreach ($item as $itemKey => $itemValue) {
                        if ($itemKey === 'price' && is_array($itemValue)) {
                            $itemStr .= "$itemKey: {amount: \"{$itemValue['amount']}\", currencyCode: {$itemValue['currencyCode']}}, ";
                        } elseif ($itemKey === 'customAttributes' && is_array($itemValue)) {
                            $attrsStr = '[';
                            foreach ($itemValue as $attr) {
                                $attrsStr .= "{key: \"{$attr['key']}\", value: \"{$attr['value']}\"},";
                            }
                            $attrsStr .= ']';
                            $itemStr .= "$itemKey: $attrsStr, ";
                        } else {
                            // Add quotes for string values
                            if (is_string($itemValue)) {
                                $itemStr .= "$itemKey: \"$itemValue\", ";
                            } else {
                                $itemStr .= "$itemKey: $itemValue, ";
                            }
                        }
                    }
                    $itemStr = rtrim($itemStr, ', ') . '}';
                    $items[] = $itemStr;
                }
                $inputParams[] = "$key: [" . implode(', ', $items) . "]";
            } else if ($key === 'shippingLine') {
                $shippingStr = "{";
                foreach ($value as $shippingKey => $shippingValue) {
                    if ($shippingKey === 'price' && is_array($shippingValue)) {
                        $shippingStr .= "$shippingKey: {amount: \"{$shippingValue['amount']}\", currencyCode: {$shippingValue['currencyCode']}}, ";
                    } else {
                        $shippingStr .= "$shippingKey: \"$shippingValue\", ";
                    }
                }
                $shippingStr = rtrim($shippingStr, ', ') . "}";
                $inputParams[] = "$key: $shippingStr";
            } else if ($key === 'appliedDiscount') {
                $discountStr = "{";
                foreach ($value as $discountKey => $discountValue) {
                    if ($discountKey === 'valueType') {
                        $discountStr .= "$discountKey: $discountValue, ";
                    } elseif ($discountKey === 'value') {
                        // Send value as unquoted number
                        $discountStr .= "$discountKey: $discountValue, ";
                    } else {
                        $discountStr .= "$discountKey: \"$discountValue\", ";
                    }
                }
                $discountStr = rtrim($discountStr, ', ') . "}";
                $inputParams[] = "$key: $discountStr";
            }
        }

        // Join all input fields
        $inputString = implode(", ", $inputParams);

        // Build the complete mutation
        $mutation = <<<GRAPHQL
        mutation {
            draftOrderCreate(input: {
                $inputString
            }) {
                draftOrder {
                    id
                    name
                    status
                    invoiceUrl
                    totalPrice
                    subtotalPrice
                    totalTax
                }
                userErrors {
                    field
                    message
                }
            }
        }
        GRAPHQL;
        return $mutation;
    }

    public function createDiscountOnShopify($link)
    {
        $link = Link::with('popupMessage')->find($link->id);
        if (!$link->popupMessage || !$link->popupMessage->timer_text) {
            throw new \Exception("Timer text is missing in popupMessage.");
        }

        // Ensure discount_value exists if needed
        if ($link->discount_code || $link->order_discount) {
            if (empty($link->discount_value)) {
                throw new \Exception("Discount value is missing.");
            }
        }

        $mutation = <<<GRAPHQL
                mutation CreateDiscountCode(\$basicCodeDiscount: DiscountCodeBasicInput!) {
                discountCodeBasicCreate(basicCodeDiscount: \$basicCodeDiscount) {
                    codeDiscountNode {
                    id
                    codeDiscount {
                        ... on DiscountCodeBasic {
                        title
                        startsAt
                        endsAt
                        codes(first: 1) {
                            nodes {
                            code
                            }
                        }
                        customerGets {
                            value {
                            ... on DiscountPercentage {
                                percentage
                            }
                            }
                        }
                        }
                    }
                    }
                    userErrors {
                    field
                    message
                    }
                }
                }
GRAPHQL;


        // Start and End Times
        $startsAt = Carbon::now()->utc()->format('Y-m-d\TH:i:s\Z');
        $endsAt = Carbon::now()
            ->add(CarbonInterval::fromString($link->popupMessage->timer_text))
            ->utc()
            ->format('Y-m-d\TH:i:s\Z');

        // Discount Code
        // with  4 digit random uniquecode
        $code = ($link->discount_value ?? 0) . 'FORYOU' . $link->id . strtoupper(substr(md5(mt_rand()), 0, 4));
        $percentage = floatval($link->discount_value ?? 0) / 100;

        if ($percentage < 0.01 || $percentage > 1.0) {
            throw new \Exception("Discount percentage must be between 1 and 100.");
        }

        // Mutation Variables
        $variables = [
            "basicCodeDiscount" => [
                "title" => ($link->discount_value ?? 0) . "% off selected items",
                "code" => $code,
                "startsAt" => $startsAt,
                "endsAt" => $endsAt,
                "customerSelection" => [
                    "all" => true
                ],
                "customerGets" => [
                    "value" => [
                        "percentage" => $percentage,
                    ],
                    "items" => [
                        "all" => true
                    ]
                ],
                "usageLimit" => 100,
                "appliesOncePerCustomer" => true
            ]
        ];
        $response = $link->user->api()->graph($mutation, $variables);
        return $this->arrayToObject($response);
    }

    public function createFreeShippingOnShopify($link)
    {
        $mutation = <<<GRAPHQL
        mutation CreateFreeShippingDiscount(\$freeShippingCodeDiscount: DiscountCodeFreeShippingInput!) {
            discountCodeFreeShippingCreate(freeShippingCodeDiscount: \$freeShippingCodeDiscount) {
                codeDiscountNode {
                    id
                    codeDiscount {
                        ... on DiscountCodeFreeShipping {
                            title
                            startsAt
                            endsAt
                            maximumShippingPrice {
                                amount
                            }
                            customerSelection {
                                ... on DiscountCustomerAll {
                                    allCustomers
                                }
                            }
                            destinationSelection {
                                ... on DiscountCountryAll {
                                    allCountries
                                }
                            }
                            minimumRequirement {
                                ... on DiscountMinimumSubtotal {
                                    greaterThanOrEqualToSubtotal {
                                        amount
                                    }
                                }
                            }
                            codes(first: 2) {
                                nodes {
                                    code
                                }
                            }
                        }
                    }
                }
                userErrors {
                    field
                    code
                    message
                }
            }
        }
    GRAPHQL;

        $startsAt = Carbon::now()->utc()->format('Y-m-d\TH:i:s\Z');
        $endsAt = Carbon::now()->addDays(7)->utc()->format('Y-m-d\TH:i:s\Z'); // Optional: define end date

        // Generate a unique code for free shipping
        $code = "FREESHIP" . $link->id.strtoupper(substr(md5(mt_rand()), 0, 4));

        $variables = [
            "freeShippingCodeDiscount" => [
                "startsAt" => $startsAt,
                "endsAt" => $endsAt,
                "appliesOncePerCustomer" => false,
                "title" => "Free Shipping",
                "code" => $code,
                "minimumRequirement" => [
                    "subtotal" => [
                        "greaterThanOrEqualToSubtotal" => 20
                    ]
                ],
                "customerSelection" => [
                    "all" => true
                ],
                "destination" => [
                    "all" => true
                ]
            ]
        ];

        $response = $link->user->api()->graph($mutation, $variables);

        return $this->arrayToObject($response);
    }

}
