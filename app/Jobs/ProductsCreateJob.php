<?php namespace App\Jobs;

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
use Illuminate\Support\Facades\Log;


class ProductsCreateJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, ResponseTrait , ShopifyProductTrait;

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
        Log::info("Products Create Job Payload: " . json_encode($payload, JSON_PRETTY_PRINT));

        $this->getProductRepository(app(ProductRepositoryInterface::class));

        // Enrich payload with inventory tracking information
        if (isset($payload->variants) && is_array($payload->variants)) {
            foreach ($payload->variants as &$variant) {
                if (isset($variant->inventory_item_id)) {
                    $inventoryItem = $this->fetchInventoryItemFromShopify($variant->inventory_item_id, $user);
                    $variant->inventory_tracked = $inventoryItem->tracked ?? false;
                    Log::info("Fetched inventory tracking for variant {$variant->id}: " . ($variant->inventory_tracked ? 'true' : 'false'));
                }
            }
            unset($variant); // Break reference
        }

        // Shopify webhooks often don't include media in payload - fetch from API if empty
        if ((empty($payload->media) || $payload->media == []) && (empty($payload->images) || $payload->images == [])) {
            Log::info("Media is empty in webhook payload, fetching from Shopify API for product ID: " . $payload->id);
            $productMedia = $this->fetchProductMediaFromShopify($payload->id, $user);
            if ($productMedia) {
                $payload->media = $productMedia;
                Log::info("Fetched " . count($productMedia) . " media items from Shopify API");
            } else {
                Log::info("No media found for product ID: " . $payload->id);
            }
        } elseif (isset($payload->images) && is_array($payload->images) && !empty($payload->images)) {
            // Transform webhook 'images' field to 'media' format if images exist
            $payload->media = [];
            $firstImage = $payload->images[0];
            $payload->media[] = (object)[
                'id' => $firstImage->id ?? null,
                'preview_image' => (object)[
                    'src' => $firstImage->src ?? null,
                ]
            ];
            Log::info("Transformed images to media format for product: " . ($payload->title ?? 'unknown'));
        }

        if($this->storeData($payload , $user )){
            Log::info("Product Create Job Successfull for shop: " . json_encode($payload, JSON_PRETTY_PRINT));
            $this->logData("Product Create Job Successfull.");
        }else{
            $this->logData("Product Create Job Failed");
        }
    }
}

