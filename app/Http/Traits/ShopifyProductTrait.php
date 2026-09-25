<?php

namespace App\Http\Traits;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use App\Repositories\Product\ProductRepositoryInterface;
use Illuminate\Support\Facades\Log;

trait ShopifyProductTrait
{
    protected $product;
    public function getProductRepository(ProductRepositoryInterface $product)
    {
        $this->product = $product;
    }
    public function getProductsFromShopify(User $user, $minutes = null)
    {
        $syncType = $minutes ? "incremental (last {$minutes} minutes)" : "full";
        Log::info("Starting {$syncType} product sync for user ID: " . $user->id);

        // Get initial product count from Shopify for verification
        $expectedProductCount = $this->getProductsCountFromShopify($user);
        Log::info("Expected total products from Shopify: {$expectedProductCount}");

        try {
            // Disable query logging to improve performance
            DB::connection()->disableQueryLog();
            
            $cursor = 'null';
            $hasErrors = false;
            $processedCount = 0;
            $syncedProductIds = []; // Track all product IDs from Shopify
            $failedProducts = []; // Track failed products for detailed reporting
            
            // Calculate timestamp ONCE at the start for incremental sync
            $syncTimestamp = null;
            if ($minutes) {
                $syncTimestamp = \Carbon\Carbon::now()->subMinutes($minutes)->toIso8601ZuluString();
                Log::info("Incremental sync timestamp (fixed for entire sync): {$syncTimestamp}");
            }

            // For full sync, calculate expected loops based on product count
            if (!$minutes) {
                $loop = ceil($expectedProductCount / 250);
                Log::info("Expected API calls for full sync: {$loop} (250 products per page)");
            } else {
                // For incremental sync, loop until no more pages
                $loop = PHP_INT_MAX;
            }

            // Batch size for commits
            $batchSize = 50;
            $currentBatch = [];
            $totalProcessed = 0;

            for ($i = 1; $i <= $loop; $i++) {
                [$products, $nextCursor] = $this->shopifyGraphqlProductQuery($user, $cursor, $syncTimestamp);

                // Break if no products returned
                if (!$products || count($products) === 0) {
                    Log::info('No more products to sync');
                    break;
                }

                Log::info("Processing batch {$i}: " . count($products) . " products");

                // Track successes and failures in this batch
                $batchSuccessCount = 0;
                $batchFailCount = 0;

                // Process all products in this batch (regardless of whether there's a next page)
                foreach ($products as $product) {
                    $product = $this->transformShopifyProductData($product);
                    // Track the product ID
                    $syncedProductIds[] = $product['id'];
                    
                    // Add to current batch for processing
                    $currentBatch[] = $this->arrayToObject($product);
                    
                    // When batch size is reached, process the batch with a single transaction
                    if (count($currentBatch) >= $batchSize) {
                        $result = $this->processBatch($currentBatch, $user, $failedProducts);
                        $processedCount += $result['success'];
                        $batchSuccessCount += $result['success'];
                        $batchFailCount += $result['failed'];
                        if ($result['failed'] > 0) {
                            $hasErrors = true;
                        }
                        $totalProcessed += count($currentBatch);
                        $currentBatch = []; // Reset batch
                        
                        Log::info("Committed batch of {$batchSize} products. Total processed: {$totalProcessed}");
                    }
                }

                Log::info("Batch {$i} completed: {$batchSuccessCount} succeeded, {$batchFailCount} failed");

                // If there's a next page, update cursor for the next iteration
                if ($nextCursor !== null) {
                    $cursor = '"' . $nextCursor . '"';
                } else {
                    // No more pages, exit the loop
                    Log::info('Reached last page of products');
                    break;
                }
            }
            
            // Process any remaining products in the last batch
            if (count($currentBatch) > 0) {
                $result = $this->processBatch($currentBatch, $user, $failedProducts);
                $processedCount += $result['success'];
                if ($result['failed'] > 0) {
                    $hasErrors = true;
                }
                Log::info("Committed final batch of " . count($currentBatch) . " products");
            }

            // Verify product count for full sync
            $totalSyncedFromShopify = count($syncedProductIds);
            Log::info("Completed {$syncType} sync. Fetched {$totalSyncedFromShopify} products from Shopify, Processed {$processedCount} successfully");
            
            // Check if we got all products from Shopify
            if (!$minutes && $totalSyncedFromShopify < $expectedProductCount) {
                $missingCount = $expectedProductCount - $totalSyncedFromShopify;
                Log::warning("Product count mismatch! Expected: {$expectedProductCount}, Fetched: {$totalSyncedFromShopify}, Missing: {$missingCount}");
                Log::warning("This may indicate Shopify is still processing bulk updates. The products will be synced in the next sync cycle.");
                // Don't throw error - this is expected with bulk operations
            } elseif (!$minutes && $totalSyncedFromShopify === $expectedProductCount) {
                Log::info("✓ Product count verified: All {$expectedProductCount} products were fetched from Shopify");
            }
            
            // Log summary
            $failedCount = count($syncedProductIds) - $processedCount;
            if ($hasErrors) {
                Log::warning("Sync completed with errors: {$processedCount} succeeded, {$failedCount} failed out of " . count($syncedProductIds) . " total products");
                if (!empty($failedProducts)) {
                    Log::warning("Failed product IDs: " . implode(', ', array_slice($failedProducts, 0, 10)) . (count($failedProducts) > 10 ? '... and ' . (count($failedProducts) - 10) . ' more' : ''));
                }
            } else {
                Log::info("Sync completed successfully: All {$processedCount} products synced without errors");
            }

            // Delete products that are no longer in Shopify
            if (!$minutes) {
                // Full sync: Delete products not in the synced list
                $deletedCount = $this->deleteRemovedProducts($user, $syncedProductIds);
                Log::info("Deleted {$deletedCount} products that no longer exist in Shopify");
            } else {
                // Incremental sync: Verify and delete products that no longer exist in Shopify
                $deletedCount = $this->verifyAndDeleteRemovedProducts($user);
                Log::info("Verified and deleted {$deletedCount} products that no longer exist in Shopify");
            }

            if($hasErrors) {
                throw new \Exception("Some products could not be stored.");
            }
            
            Log::info("Product sync completed: $processedCount products processed");
        } catch (\Exception $e) {
            Log::error("Product sync error: " . $e->getMessage());
            return false;
        }
        return true;
    }
    public function getProductsCountFromShopify($user)
    {
        $query = <<<QUERY
            query{
                productsCount(limit:null){
                    count
                }
            }
        QUERY;
        
        // Let network exceptions bubble up to be handled by the caller
        // This allows for proper retry logic with exponential backoff
        $result = $this->arrayToObject($user->api()->graph($query));
        
        if ($result->errors) {
            Log::warning("GraphQL errors getting product count for user {$user->name}: " . json_encode($result->errors));
            return 0;
        } else {
            return $result->body->data->productsCount->count;
        }
    }
    public function shopifyGraphqlProductQuery($user, $cursor, $syncTimestamp = null)
    {
        // Build query filter to fetch ALL products (active, draft, archived)
        // CRITICAL: Without explicit status filter, Shopify defaults to status:active only!
        $queryFilter = ', query: "status:active,draft,archived';
        
        if ($syncTimestamp) {
            // Incremental sync: combine status filter with updated_at filter
            $queryFilter .= ' AND updated_at:>\'' . $syncTimestamp . '\'';
            Log::info('Incremental sync with status and timestamp filters');
        } else {
            // Full sync: just include all statuses
            Log::info('Full sync with all statuses (active, draft, archived)');
        }
        
        $queryFilter .= '"';
        Log::info('Query filter: ' . $queryFilter);

        // Fetch ALL products (active, draft, archived) to properly sync status changes
        $query = <<<QUERY
            query {
                products(first: 250, after: $cursor{$queryFilter}) {
                    edges {
                        node {
                            id
                            title
                            vendor
                            status
                            publishedAt
                            updatedAt
                            variants(first: 250) {
                                edges {
                                    node {
                                        id
                                        inventoryItem{
                                            id
                                            tracked
                                        }
                                        title
                                        price
                                        inventoryQuantity
                                        compareAtPrice
                                        inventoryPolicy
                                    }
                                }
                            }
                            media(first: 1) {
                                edges {
                                    node {
                                        ... on MediaImage {
                                            id
                                            image {
                                                url
                                            }
                                        }
                                    }
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
            $products = $result->body->data->products->edges;
            Log::info("Fetched Products: " . json_encode($products, JSON_PRETTY_PRINT));
            $cursor = $result->body->data->products->pageInfo->endCursor;
            return [$products, $cursor];
        }
    }
    public function storeData($product, User $user)
    {
        try {
            $formatedData = $this->formateProductdata($product, $user);
            $result = $this->product->updateOrCreate($formatedData);
            
            // Log successful update with status
            Log::debug("Successfully stored product ID: {$product->id}, Title: {$product->title}, Status: {$product->status}");
            return true;
        } catch (\Exception $e) {
            Log::error("Failed to store product ID: " . ($product->id ?? 'unknown'));
            Log::error("Product Title: " . ($product->title ?? 'unknown'));
            Log::error("Exception Type: " . get_class($e));
            Log::error("Exception Message: " . $e->getMessage());
            Log::error("Stack Trace: " . $e->getTraceAsString());
            return false;
        }
    }
    /**
     * Process a batch of products within a single transaction
     * 
     * @param array $batch Array of products to process
     * @param User $user The user
     * @param array &$failedProducts Reference to array tracking failed product IDs
     * @return array Array with 'success' and 'failed' counts
     */
    protected function processBatch(array $batch, User $user, array &$failedProducts): array
    {
        $successCount = 0;
        $failedCount = 0;
        
        DB::beginTransaction();
        try {
            foreach ($batch as $product) {
                try {
                    if ($this->storeData($product, $user)) {
                        $successCount++;
                    } else {
                        $failedCount++;
                        $failedProducts[] = $product->id ?? 'unknown';
                    }
                } catch (\Exception $e) {
                    // Log individual product error but continue processing batch
                    Log::error("Error processing product in batch: " . ($product->id ?? 'unknown') . " - " . $e->getMessage());
                    $failedCount++;
                    $failedProducts[] = $product->id ?? 'unknown';
                }
            }
            
            // Commit the entire batch
            DB::commit();
            
            return ['success' => $successCount, 'failed' => $failedCount];
        } catch (\Exception $e) {
            // If batch commit fails, rollback and mark all as failed
            DB::rollBack();
            Log::error("Batch commit failed: " . $e->getMessage());
            
            foreach ($batch as $product) {
                $failedProducts[] = $product->id ?? 'unknown';
            }
            
            return ['success' => 0, 'failed' => count($batch)];
        }
    }

    public function formateProductdata($product, $user)
    {
        $formatedProduct = [
            'user_id' => $user->id,
            'shopify_product_id' => $product->id,
            'title' => $product->title,
            'published' => isset($product->published_at) && $product->published_at !== null ? 'web' : 'not_published',
            'vendor' => $product->vendor,
            'status' => $product->status,
            'variants' => $this->formateProductvarientData($product->variants),
            'media' => $this->formateProductMedia($product->media)
        ];
        return $formatedProduct;
    }
    public function formateProductvarientData($variants)
    {
        $productVarients = [];
        foreach ($variants as $varient) {
            $productVarients[] = [
                'product_id' => $varient->product_id ?? null, // optional, set if available
                'shopify_product_varient_id' => $varient->id,
                'shopify_inventory_item_id' => $varient->inventory_item_id,
                'title' => $varient->title,
                'price' => $varient->price,
                'inventory_quantity' => $varient->inventory_quantity,
                'inventory_policy' => $varient->inventory_policy ?? 'deny',
                'inventory_tracked' => $varient->inventory_tracked ?? true,
                'compare_at_price' => $varient->compare_at_price
            ];
        }
        return $productVarients;
    }
    public function formateProductMedia($media)
    {
        $productMedia = [];
        Log::info(json_encode($media, JSON_PRETTY_PRINT));
        foreach ($media as $image) {
            $productMedia[] = [
                'product_id' => $image->product_id ?? null, // optional, set if available
                'shopify_product_media_id' => $image->id,
                'src' => $image->preview_image->src ?? null,
            ];
        }
        return $productMedia;
    }
    public function deleteProduct($productId)
    {
        DB::beginTransaction();
        try {
            $product = $this->product->getByShopifyId($productId);
            // $product->variants()->delete();
            // $product->media()->delete();
            $this->product->delete($product->id);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error(json_encode($e->getMessage(), JSON_PRETTY_PRINT));
            return false;
        }
        DB::commit();
        return true;
    }

    /**
     * Delete products from database that no longer exist in Shopify (Full Sync)
     * 
     * @param User $user The user whose products to check
     * @param array $syncedProductIds Array of product IDs that exist in Shopify
     * @return int Number of products deleted
     */
    public function deleteRemovedProducts(User $user, array $syncedProductIds)
    {
        DB::beginTransaction();
        try {
            // Get all products for this user from the database
            $dbProducts = $this->product->getByUserId($user->id);
            
            $deletedCount = 0;
            foreach ($dbProducts as $dbProduct) {
                // If the product ID is not in the synced list, it means it was deleted from Shopify
                if (!in_array($dbProduct->shopify_product_id, $syncedProductIds)) {
                    Log::info("Deleting product ID {$dbProduct->shopify_product_id} (DB ID: {$dbProduct->id}) - no longer exists in Shopify");
                    $this->product->delete($dbProduct->id);
                    $deletedCount++;
                }
            }
            
            DB::commit();
            return $deletedCount;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error deleting removed products: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Verify and delete products from database that no longer exist in Shopify (Incremental Sync)
     * This method queries Shopify to verify if products still exist before deleting
     * 
     * @param User $user The user whose products to check
     * @return int Number of products deleted
     */
    public function verifyAndDeleteRemovedProducts(User $user)
    {
        $deletedCount = 0;
        
        try {
            // Get all products for this user from the database
            $dbProducts = $this->product->getByUserId($user->id);
            $totalProducts = count($dbProducts);
            
            if ($totalProducts === 0) {
                return 0;
            }
            
            Log::info("Verifying {$totalProducts} products against Shopify for user ID: {$user->id}");
            
            // Build product IDs for batch verification
            $productIds = $dbProducts->pluck('shopify_product_id')->toArray();
            
            // Query Shopify in batches to check which products still exist
            $batchSize = 50; // Process 50 products at a time
            $batches = array_chunk($productIds, $batchSize);
            
            foreach ($batches as $batchIndex => $batch) {
                $existingIds = $this->verifyProductsExistInShopify($user, $batch);
                
                // Find products that don't exist in Shopify
                $missingIds = array_diff($batch, $existingIds);
                
                if (!empty($missingIds)) {
                    DB::beginTransaction();
                    try {
                        foreach ($missingIds as $missingId) {
                            $dbProduct = $dbProducts->firstWhere('shopify_product_id', $missingId);
                            if ($dbProduct) {
                                Log::info("Deleting product ID {$missingId} (DB ID: {$dbProduct->id}) - verified as deleted from Shopify");
                                $this->product->delete($dbProduct->id);
                                $deletedCount++;
                            }
                        }
                        DB::commit();
                    } catch (\Exception $e) {
                        DB::rollBack();
                        Log::error("Error deleting batch of products: " . $e->getMessage());
                    }
                }
                
                Log::info("Verified batch " . ($batchIndex + 1) . "/" . count($batches) . " - Found {$deletedCount} deleted products so far");
            }
            
            return $deletedCount;
        } catch (\Exception $e) {
            Log::error("Error verifying and deleting removed products: " . $e->getMessage());
            return $deletedCount;
        }
    }

    /**
     * Verify which products from a list still exist in Shopify
     * 
     * @param User $user The user
     * @param array $productIds Array of product IDs to verify
     * @return array Array of product IDs that still exist
     */
    public function verifyProductsExistInShopify(User $user, array $productIds)
    {
        try {
            // Build the query filter with product IDs
            $idFilters = array_map(function($id) {
                return "id:{$id}";
            }, $productIds);
            $queryFilter = implode(' OR ', $idFilters);
            
            $query = <<<QUERY
                query {
                    products(first: 250, query: "$queryFilter") {
                        edges {
                            node {
                                id
                            }
                        }
                    }
                }
QUERY;
            
            $result = $this->arrayToObject($user->api()->graph($query));
            
            // Check for errors in the response
            if (isset($result->errors) && $result->errors) {
                $errorDetails = is_bool($result->errors) ? 'Query returned error flag' : json_encode($result->errors);
                Log::error("Error verifying products in Shopify for user {$user->id}: " . $errorDetails);
                Log::error("Query attempted with " . count($productIds) . " product IDs");
                
                // Return empty array instead of assuming all exist, to be safer during incremental deletes
                return [];
            }
            
            // Check if response body exists
            if (!isset($result->body->data->products)) {
                Log::error("Invalid response structure when verifying products for user {$user->id}");
                return [];
            }
            
            // Extract the product IDs that exist
            $existingIds = [];
            if (isset($result->body->data->products->edges)) {
                foreach ($result->body->data->products->edges as $edge) {
                    if (isset($edge->node->id)) {
                        $existingIds[] = $this->extractId($edge->node->id);
                    }
                }
            }
            
            return $existingIds;
        } catch (\Exception $e) {
            Log::error("Exception verifying products in Shopify: " . $e->getMessage());
            return $productIds; // Assume all exist if query fails
        }
    }
    public function transformShopifyProductData($data): array
    {
        // Handle both object and array formats
        $node = is_object($data) ? ($data->node ?? $data) : (object)($data['node'] ?? $data);
        
        $productVariants = [];
        
        // Handle variants - check multiple possible structures
        $variantEdges = null;
        if (isset($node->variants->edges)) {
            $variantEdges = $node->variants->edges;
        } elseif (isset($node->variants) && is_array($node->variants)) {
            $variantEdges = $node->variants;
        }
        
        if ($variantEdges) {
            foreach ($variantEdges as $edge) {
                // Handle both edge->node format and direct variant format
                $variant = isset($edge->node) ? $edge->node : (is_object($edge) ? $edge : (object)$edge);
                
                // Get inventory item - handle nested structure
                $inventoryItem = $variant->inventoryItem ?? $variant->inventory_item ?? null;
                $inventoryItemId = null;
                $inventoryTracked = true;
                
                if ($inventoryItem) {
                    $inventoryItemId = $inventoryItem->id ?? null;
                    $inventoryTracked = $inventoryItem->tracked ?? true;
                }
                
                $productVariants[] = [
                    'compare_at_price' => $variant->compareAtPrice ?? $variant->compare_at_price ?? null,
                    'id' => $this->extractId($variant->id ?? ''),
                    'price' => $variant->price ?? null,
                    'sku' => $variant->sku ?? null,
                    'title' => $variant->title ?? null,
                    'inventory_item_id' => $this->extractId($inventoryItemId ?? ''),
                    'inventory_quantity' => $variant->inventoryQuantity ?? $variant->inventory_quantity ?? 0,
                    'inventory_policy' => $variant->inventoryPolicy ?? $variant->inventory_policy ?? 'DENY',
                    'inventory_tracked' => $inventoryTracked,
                ];
            }
        }
        
        Log::info("Transformed variants count: " . count($productVariants));
        
        $productMedia = [];
        
        // Handle media - check multiple possible structures
        $mediaEdges = null;
        if (isset($node->media->edges)) {
            $mediaEdges = $node->media->edges;
        } elseif (isset($node->media) && is_array($node->media)) {
            $mediaEdges = $node->media;
        }
        
        if ($mediaEdges) {
            foreach ($mediaEdges as $index => $edge) {
                $media = isset($edge->node) ? $edge->node : (is_object($edge) ? $edge : (object)$edge);
                if ($media) {
                    $imageUrl = null;
                    if (isset($media->image->url)) {
                        $imageUrl = $media->image->url;
                    } elseif (isset($media->preview_image->src)) {
                        $imageUrl = $media->preview_image->src;
                    } elseif (isset($media->src)) {
                        $imageUrl = $media->src;
                    }
                    
                    $productMedia[] = [
                        'id' => $this->extractId($media->id ?? ''),
                        'preview_image' => [
                            'src' => $imageUrl,
                        ],
                    ];
                }
            }
        }
        
        $product = [
            'id' => $this->extractId($node->id ?? ''),
            'title' => $node->title ?? '',
            'vendor' => $node->vendor ?? '',
            'published_at' => $node->publishedAt ?? $node->published_at ?? null,
            'status' => strtolower($node->status ?? 'active'),
            'variants' => $productVariants,
            'media' => $productMedia,
        ];
        
        Log::info("Transformed product: " . $product['title'] . " with " . count($productVariants) . " variants");
        
        return $product;
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

    public function fetchInventoryItemFromShopify($inventoryItemId, User $user)
    {
        $query = <<<GQL
        query {
            inventoryItem(id: "gid://shopify/InventoryItem/{$inventoryItemId}") {
                id
                tracked
                sku
                inventoryLevel(locationId: "gid://shopify/Location/#{$user->location_id}") {
                    available
                    incoming
                    locationId
                }
            }
        }
        GQL;

        // Use the user's API to make the GraphQL request
        $result = $this->arrayToObject($user->api()->graph($query));
        if (!isset($result->errors)) {
            return $result->body->data->inventoryItem ?? null;
        }

        return null;
    }

    public function fetchProductMediaFromShopify($productId, User $user)
    {
        $query = <<<GQL
        query {
            product(id: "gid://shopify/Product/{$productId}") {
                id
                media(first: 1) {
                    edges {
                        node {
                            ... on MediaImage {
                                id
                                image {
                                    url
                                }
                            }
                        }
                    }
                }
            }
        }
        GQL;

        $result = $this->arrayToObject($user->api()->graph($query));
        Log::info("Fetched product media for product ID {$productId}: " . json_encode($result, JSON_PRETTY_PRINT)); 
        
        if (!isset($result->errors) && isset($result->body->data->product->media->edges)) {
            $mediaEdges = $result->body->data->product->media->edges;
            
            if (!empty($mediaEdges)) {
                $media = [];
                foreach ($mediaEdges as $edge) {
                    if (isset($edge->node)) {
                        $media[] = (object)[
                            'id' => $this->extractId($edge->node->id ?? ''),
                            'preview_image' => (object)[
                                'src' => $edge->node->image->url ?? null,
                            ]
                        ];
                    }
                }
                return $media;
            }
        }

        Log::warning("Failed to fetch product media for product ID: {$productId}");
        return null;
    }
}
