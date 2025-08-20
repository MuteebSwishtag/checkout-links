<?php
namespace App\Jobs;

use App\Models\LinkProductVarient;
use App\Models\Products\Product;
use App\Models\Products\ProductMedia;
use App\Models\Products\ProductVarient;
use Log;
use stdClass;
use App\Models\User;
use Illuminate\Bus\Queueable;
use App\Http\Traits\ResponseTrait;
use Illuminate\Queue\SerializesModels;
use App\Http\Traits\ShopifyProductTrait;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Osiset\ShopifyApp\Objects\Values\ShopDomain;
use App\Repositories\Product\ProductRepositoryInterface;
use Osiset\ShopifyApp\Contracts\Queries\Shop as IShopQuery;

class ProductsUpdateJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, ShopifyProductTrait, ResponseTrait;

    /**
     * Shop's myshopify domain
     *
     * @var ShopDomain|string
     */
    public $shopDomain;

    /**
     * The webhook data
     *
     * @var object
     */
    public $data;

    /**
     * Create a new job instance.
     *
     * @param string   $shopDomain The shop's myshopify domain.
     * @param stdClass $data       The webhook data (JSON decoded).
     *
     * @return void
     */
    public function __construct($shopDomain, $data)
    {
        $this->shopDomain = $shopDomain;
        $this->data = $data;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle(IShopQuery $shopQuery)
    {
        $this->shopDomain = ShopDomain::fromNative($this->shopDomain);
        $shop = $shopQuery->getByDomain($this->shopDomain);
        $user = User::where('name', $shop->name)->first();
        $payload = $this->data;
        Log::info("Product Update Job started for shop: " . json_encode($payload, JSON_PRETTY_PRINT));

        // Extract product ID from webhook payload

        $productId = $payload->id ?? null;
        if (!$productId) {
            Log::error("Product ID not found in payload: " . json_encode($payload, JSON_PRETTY_PRINT));
            return;
        }

        // Fetch product record in our DB
        $product = Product::where('shopify_product_id', $productId)->first();
        if (!$product) {
            Log::error("Product not found in database for Shopify product ID: {$productId}");
            return;
        }

        // Delete related variants first
        $variantsDeleted = ProductVarient::where('product_id', $product->id)->get();

        // Get all variant IDs as an array
        $variantIds = $variantsDeleted->pluck('shopify_product_varient_id')->toArray();

        // Only attempt to delete linked variants if there are any
        if (!empty($variantIds)) {
            // Delete linked variants one by one to avoid parameter binding issues
            foreach ($variantIds as $variantId) {
                LinkProductVarient::where('variant_id', $variantId)->delete();
            }
        }

        // Delete product variants
        $variantsDeleted->each(function ($variant) {
            $variant->delete();
        });

        if ($variantsDeleted->isEmpty() && $product->variants()->count() > 0) {
            Log::error("Failed to delete product variants for product ID: {$product->id}");
            return;
        }
        // Delete related media
        $mediaDeleted = ProductMedia::where('product_id', $product->id)->delete();
        if ($mediaDeleted === false) {
            Log::error("Failed to delete product media for product ID: {$product->id}");
            return;
        }

        if (is_null($payload->published_at) || $payload->status === "draft") {
            LinkProductVarient::where('product_id', $product->id)->delete();
        }
        // Log before re-storing
        Log::info("Product Update Job started for shop:" . json_encode($payload, JSON_PRETTY_PRINT));
        // Process and store updated product data
        // $this->getProductRepository(app(ProductRepositoryInterface::class));

        // if ($this->storeData($payload, $user)) {
        //     $this->logInfo("Product Update Job Successful.");
        // } else {
        //     $this->logInfo("Product Update Job Failed.");
        // }
        $getInventoryTracked =
            $product = Product::updateOrCreate(
                ['shopify_product_id' => $payload->id],
                [
                    'title' => $payload->title,
                    'vendor' => $payload->vendor,
                    'product_type' => $payload->product_type,
                    'tags' => $payload->tags,
                    'published' => isset($payload->published_at) && $payload->published_at !== null ? 'web' : 'not_published',
                    'status' => $payload->status,
                ]
            );

        foreach ($payload->variants as $variant) {
            // gql for  inventory tracked
            $getInventoryItemId = $variant->inventory_item_id;
            $this->fetchInventoryItemFromShopify($getInventoryItemId, $user);
            $inventoryItem = $this->fetchInventoryItemFromShopify($getInventoryItemId, $user);
            ProductVarient::updateOrCreate(
                ['shopify_product_varient_id' => $variant->id],
                [
                    'product_id' => $product->id,
                    'shopify_product_varient_id' => $variant->id,
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

        // Save first image from media array
        if (!empty($payload->media) && is_array($payload->media)) {
            $firstMedia = $payload->media[0];
            ProductMedia::updateOrCreate(
                ['shopify_product_media_id' => $firstMedia->id, 'product_id' => $product->id,],
                [
                    'src' => $firstMedia->preview_image->src ?? null,
                ]
            );
        }
    }
    public function fetchInventoryItemFromShopify($inventoryItemId, User $user)
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
        // Use the user's API to make the GraphQL request
        $result = $this->arrayToObject($user->api()->graph($query));
        Log::info("Fetched inventory item: " . json_encode($result, JSON_PRETTY_PRINT));
        if (!isset($result->errors)) {
            return $result->body->data->inventoryItem ?? null;
        }
        return null;
    }
}
