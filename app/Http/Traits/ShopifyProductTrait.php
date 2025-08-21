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
            for ($i = 1; $i <= $loop; $i++) {
                [$products, $nextCursor] = $this->shopifyGraphqlProductQuery($user, $cursor);
                Log::info("Fetched Products: " . json_encode($products, JSON_PRETTY_PRINT));
                if ($products && $nextCursor) {
                    $cursor = '"' . $nextCursor . '"';
                    foreach ($products as $product) {
                        Log::info(json_encode($product, JSON_PRETTY_PRINT));
                        $product = $this->transformShopifyProductData($product);
                        if (!$this->storeData($this->arrayToObject($product), $user)) {
                            $hasErrors = true;
                        }
                    }
                }
            }
            if($hasErrors) {
                throw new \Exception("Some products could not be stored.");
            }
        } catch (\Exception $e) {
            Log::error(json_encode($e->getMessage(), JSON_PRETTY_PRINT));
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
        $query = <<<QUERY
            query {
                products(first: 250, after: $cursor,query: "published_status:published") {
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
        Log::info(json_encode($product, JSON_PRETTY_PRINT));
        DB::beginTransaction();
        try {
            $formatedData = $this->formateProductdata($product, $user);
            Log::info("Formatted Product Data: " . json_encode($formatedData, JSON_PRETTY_PRINT));
            $this->product->updateOrCreate($formatedData);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to store product: " . json_encode($product));
            Log::error("Exception: " . json_encode($e->getMessage(), JSON_PRETTY_PRINT));
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
        // dd($data);
        $node = $data->node;
        $productVariants = [];
        if (!empty($node->variants->edges)) {
            foreach ($node->variants->edges as $edge) {
                $variant = $edge->node;
                $productVariants[] = [
                    'compare_at_price' => $variant->compareAtPrice ?? null,
                    'id' => $this->extractId($variant->id),
                    'price' => $variant->price ?? null,
                    'sku' => $variant->sku ?? null,
                    'title' => $variant->title ?? null,
                    'inventory_item_id' => $this->extractId($variant->inventoryItem->id ?? null),
                    'inventory_quantity' => $variant->inventoryQuantity ?? 0,
                    'inventory_policy' => $variant->inventoryPolicy ?? 'deny',
                    'inventory_tracked' => $variant->inventoryItem->tracked ?? true,
                ];
            }
        }
        $productMedia = [];
        if (!empty($node->media->edges)) {
            foreach ($node->media->edges as $index => $edge) {
                $media = $edge->node;
                if ($media) {
                    $productMedia[] = [
                        'id' => $this->extractId($media->id),
                        // 'position' => $index + 1,
                        'preview_image' => [
                            'src' => $media->image->url ?? null,
                        ],
                    ];
                }
            }
        }
        $product = [
            // 'body_html' => $node->descriptionHtml,
            // 'handle' => $node->handle,
            'id' => $this->extractId($node->id),
            // 'product_type' => $node->productType,
            'title' => $node->title,
            'vendor' => $node->vendor,
            'published_at' => $node->publishedAt ?? null,
            'status' => strtolower($node->status),
            // 'tags' => $this->arrayToString($node->tags),
            'variants' => $productVariants,
            'media' => $productMedia,
        ];
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
