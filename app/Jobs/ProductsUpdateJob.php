<?php

namespace App\Jobs;

use App\Models\LinkProductVarient;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\ProductVarient;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Osiset\ShopifyApp\Objects\Values\ShopDomain;
use Osiset\ShopifyApp\Contracts\Queries\Shop as IShopQuery;
use App\Http\Traits\ResponseTrait;
use App\Http\Traits\ShopifyProductTrait;

class ProductsUpdateJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, ShopifyProductTrait, ResponseTrait;

    public $shopDomain;
    public $data;
    public $timeout = 600;
    public $tries = 3;

    public function __construct($shopDomain, $data)
    {
        $this->shopDomain = $shopDomain;
        $this->data = $data;
    }

    public function handle(IShopQuery $shopQuery)
    {
        $this->shopDomain = ShopDomain::fromNative($this->shopDomain);
        $shop = $shopQuery->getByDomain($this->shopDomain);
        $user = User::where('name', $shop->name)->first();
        $payload = $this->data;

        $productId = $payload->id ?? null;
        if (!$productId) {
            Log::error("Product ID missing in webhook payload");
            return;
        }

        DB::transaction(function () use ($payload, $user, $productId) {
            // Update or create product
            $product = Product::updateOrCreate(
                ['shopify_product_id' => $productId, 'user_id' => $user->id],
                [
                    'title' => $payload->title,
                    'vendor' => $payload->vendor,
                    'product_type' => $payload->product_type,
                    'tags' => $payload->tags,
                    'published' => $payload->published_at ? 'web' : 'not_published',
                    'status' => $payload->status,
                ]
            );

            /**
             * Variants Sync
             */
            $shopifyVariantIds = collect($payload->variants ?? [])->pluck('id')->toArray();

            foreach ($payload->variants as $variant) {
                $inventoryItem = $this->fetchInventoryItemFromShopify($variant->inventory_item_id, $user);

                ProductVarient::updateOrCreate(
                    ['shopify_product_varient_id' => $variant->id],
                    [
                        'product_id' => $product->id,
                        'shopify_inventory_item_id' => $variant->inventory_item_id,
                        'title' => $variant->title,
                        'price' => $variant->price,
                        'inventory_quantity' => $variant->inventory_quantity,
                        'inventory_policy' => $variant->inventory_policy,
                        'inventory_tracked' => $inventoryItem->tracked ?? false,
                        'compare_at_price' => $variant->compare_at_price,
                    ]
                );
            }

            // Remove variants that no longer exist in Shopify
            ProductVarient::where('product_id', $product->id)
                ->whereNotIn('shopify_product_varient_id', $shopifyVariantIds)
                ->delete();

            // Clean up link variants if product is draft/unpublished
            if (is_null($payload->published_at) || $payload->status === "draft") {
                LinkProductVarient::where('product_id', $product->id)->delete();
            }

            ProductMedia::where('product_id', $product->id)->delete(); // ✅ delete all old

            // Handle both 'media' (GraphQL) and 'images' (webhook) formats
            $firstMedia = null;
            if (isset($payload->media) && !empty($payload->media)) {
                $firstMedia = $payload->media[0];
            } elseif (isset($payload->images) && !empty($payload->images)) {
                $firstImage = $payload->images[0];
                $firstMedia = (object)[
                    'id' => $firstImage->id ?? null,
                    'preview_image' => (object)[
                        'src' => $firstImage->src ?? null,
                    ]
                ];
            }

            if ($firstMedia) {
                ProductMedia::create([
                    'product_id' => $product->id,
                    'shopify_product_media_id' => $firstMedia->id,
                    'src' => $firstMedia->preview_image->src ?? $firstMedia->src ?? null,
                ]);
            }
        });
        Log::info("Product sync completed successfully for Shopify product ID: {$productId}");
    }

    private function fetchInventoryItemFromShopify($inventoryItemId, User $user)
    {
        $query = <<<GQL
                query {
                    inventoryItem(id: "gid://shopify/InventoryItem/{$inventoryItemId}") {
                        id
                        tracked
                        sku
                    }
                }
                GQL;

        $result = $this->arrayToObject($user->api()->graph($query));
        Log::info("Fetched inventory item for ID {$inventoryItemId}: " . json_encode($result));
        if (empty($result->errors)) {
            return $result->body->data->inventoryItem ?? null;
        }
        Log::warning("Failed to fetch inventory item {$inventoryItemId}");
        return null;
    }
}
  