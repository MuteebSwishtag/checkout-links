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
    public function getProductsFromShopify(User $user)
    {
        Log::info('Fetching products from Shopify for user ID: ' . $user->id);
        try {
            $productCount = $this->getProductsCountFromShopify($user);
            Log::info('Total Products Count: ' . $productCount);
            $cursor = 'null';
            $loop = ceil($productCount / 250);
            $hasErrors = false;
            $processedCount = 0;
            
            for ($i = 1; $i <= $loop; $i++) {
                [$products, $nextCursor] = $this->shopifyGraphqlProductQuery($user, $cursor);
                
                if ($products && $nextCursor) {
                    $cursor = '"' . $nextCursor . '"';
                    
                    // Process in smaller chunks to avoid memory issues
                    $chunks = array_chunk($products, 50);
                    foreach ($chunks as $chunkIndex => $chunk) {
                        foreach ($chunk as $product) {
                            $product = $this->transformShopifyProductData($product);
                            if (!$this->storeData($this->arrayToObject($product), $user)) {
                                $hasErrors = true;
                            }
                            $processedCount++;
                        }
                        
                        // Log progress every 50 products
                        Log::info("Processed $processedCount/$productCount products");
                        
                        // Clear memory periodically
                        if ($chunkIndex % 5 === 0) {
                            gc_collect_cycles();
                        }
                    }
                }
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
                productsCount{
                    count
                }
            }
        QUERY;
        $result = $this->arrayToObject($user->api()->graph($query));
        if ($result->errors) {
            return 0;
        } else {
            return $result->body->data->productsCount->count;
        }
    }
    public function shopifyGraphqlProductQuery($user, $cursor)
    {
        // Fetch ALL products (active, draft, archived) to properly sync status changes
        $query = <<<QUERY
            query {
                products(first: 250, after: $cursor) {
                    edges {
                        node {
                            id
                            title
                            vendor
                            status
                            publishedAt
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
        // Disable query logging to improve performance
        DB::connection()->disableQueryLog();
        
        DB::beginTransaction();
        try {
            $formatedData = $this->formateProductdata($product, $user);
            $this->product->updateOrCreate($formatedData);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to store product ID: " . ($product->id ?? 'unknown'));
            Log::error("Exception: " . $e->getMessage());
            return false;
        }
        DB::commit();
        return true;
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
}
