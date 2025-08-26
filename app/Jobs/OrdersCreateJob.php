<?php

namespace App\Jobs;

use Log;
use stdClass;
use App\Models\User;
use App\Models\Link;
use App\Http\Traits\ResponseTrait;
use App\Http\Traits\ShopifyOrderTrait;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Osiset\ShopifyApp\Objects\Values\ShopDomain;
use App\Repositories\Order\OrderRepositoryInterface;
use Osiset\ShopifyApp\Contracts\Queries\Shop as IShopQuery;

class OrdersCreateJob implements ShouldQueue
{
     use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, ResponseTrait , ShopifyOrderTrait;

    /**
     * Create a new job instance.
     *  @var ShopDomain|string
     */
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
     */
    public function handle(IShopQuery $shopQuery)
    {
        $this->shopDomain = ShopDomain::fromNative($this->shopDomain);
        $shop = $shopQuery->getByDomain($this->shopDomain);
        $user = User::where('name', $shop->name)->first();
        $payload = $this->data;
        $this->getOrderRepository(app(OrderRepositoryInterface::class));
        // if($this->storeData($payload , $user)){
        //     // Extract checkout link ID from note attributes and update the placed order count

        //     $this->logInfo("Order Create Job Successfully Completed");
        // }
        // else{
        //     $this->logInfo("Order Create Job Failed");
        // }
        Log::info("payload: " . json_encode($payload, JSON_PRETTY_PRINT));
        $this->updateLinkOrderCount($payload);
    }

    /**
     * Extract checkout link ID from note attributes and update the placed order count
     * 
     * @param object $payload The order data payload
     * @return void
     */
    private function updateLinkOrderCount($payload)
{
    try {
        $checkoutLinkId = null;

        // Case 1: Look in note_attributes
        if (!empty($payload->note_attributes)) {
            foreach ($payload->note_attributes as $attribute) {
                if ($attribute->name === 'checkout_link_id') {
                    $checkoutLinkId = $attribute->value;
                    break;
                }
            }
        }

        // Case 2: Look in note (only if draft order)
        if (!$checkoutLinkId && !empty($payload->note) && $payload->source_name === 'shopify_draft_order') {
            if (preg_match('/Checkout Link:\s*(\d+)/i', $payload->note, $matches)) {
                $checkoutLinkId = $matches[1];
                Log::info("Extracted Checkout Link ID from note: {$checkoutLinkId}");
            }
        }

        // Case 3: Look in line_items properties
        if (!$checkoutLinkId && !empty($payload->line_items)) {
            foreach ($payload->line_items as $item) {
                if (!empty($item->properties)) {
                    foreach ($item->properties as $property) {
                        if ($property->name === 'Order placed' && is_numeric($property->value)) {
                            $checkoutLinkId = $property->value;
                            Log::info("Extracted Checkout Link ID from line item property: {$checkoutLinkId}");
                            break 2;
                        }
                    }
                }
            }
        }

        // Update Link model if ID found
        if ($checkoutLinkId) {
            $link = Link::find($checkoutLinkId);
            if ($link) {
                $link->increment('placed_order', 1);
                Log::info("✅ Updated placed order count for link ID: {$checkoutLinkId}");
            } else {
                Log::warning("❌ Link not found with ID: {$checkoutLinkId}");
            }
        } else {
            Log::warning("⚠️ No checkout_link_id found in order payload");
        }
    } catch (\Exception $e) {
        Log::error("Exception in updateLinkOrderCount: " . $e->getMessage(), [
            'trace' => $e->getTraceAsString()
        ]);
    }
}

}
