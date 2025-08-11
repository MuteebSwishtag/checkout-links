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
        if($this->storeData($payload , $user)){
            // Extract checkout link ID from note attributes and update the placed order count
            $this->updateLinkOrderCount($payload);
            $this->logInfo("Order Create Job Successfully Completed");
        }
        else{
            $this->logInfo("Order Create Job Failed");
        }
    }

    /**
     * Extract checkout link ID from note attributes and update the placed order count
     * 
     * @param object $payload The order data payload
     * @return void
     */
    private function updateLinkOrderCount($payload)
    {
        // Check if note_attributes exist in the payload
        if (!empty($payload->note_attributes)) {
            $checkoutLinkId = null;
            // Look for the checkout_link_id in note_attributes
            foreach ($payload->note_attributes as $attribute) {
                Log::info("Processing note attribute: {$attribute->name} with value: {$attribute->value}");
                if ($attribute->name === 'checkout_link_id') {
                    $checkoutLinkId = $attribute->value;
                    break;
                }
            }

            log(`Checkout Link ID: {$checkoutLinkId}`);
            // If we found a checkout_link_id, update the Link record
            if ($checkoutLinkId) {
                $link = Link::find($checkoutLinkId);
                if ($link) {
                    // Increment the placed_order count by 1
                    $link->increment('placed_order', 1);
                    $this->logInfo("Updated placed order count for link ID: {$checkoutLinkId}");
                } else {
                    $this->logInfo("Link not found with ID: {$checkoutLinkId}");
                }
            } else {
                $this->logInfo("No checkout_link_id found in order note attributes");
            }
        } else {
            $this->logInfo("No note_attributes found in order payload");
        }
    }
}
