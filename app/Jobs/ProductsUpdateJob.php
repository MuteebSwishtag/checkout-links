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
        Log::info("Product Update Job started for shop: " . json_encode($payload, JSON_PRETTY_PRINT));
        // Process and store updated product data
        $this->getProductRepository(app(ProductRepositoryInterface::class));
        if ($this->storeData($payload, $user)) {
            $this->logInfo("Product Update Job Successful.");
        } else {
            $this->logInfo("Product Update Job Failed.");
        }
    }
}
