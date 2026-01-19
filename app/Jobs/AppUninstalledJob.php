<?php
namespace App\Jobs;

use App\Models\Product;
use App\Models\ProductVarient as ProductVariant;
use App\Models\Setting;
use App\Models\User;
use App\Models\Link;
use App\Models\LinkProductVarient;
use App\Models\PopupMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Osiset\ShopifyApp\Actions\CancelCurrentPlan;
use Osiset\ShopifyApp\Contracts\Commands\Shop as IShopCommand;
use Osiset\ShopifyApp\Contracts\Queries\Shop as IShopQuery;
use Osiset\ShopifyApp\Messaging\Events\AppUninstalledEvent;
use Osiset\ShopifyApp\Objects\Values\ShopDomain;
use Osiset\ShopifyApp\Util;
use stdClass;
use Illuminate\Support\Facades\Log;

/**
 * Webhook job responsible for handling when the app is uninstalled.
 */
class AppUninstalledJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * The shop domain.
     *
     * @var ShopDomain|string
     */
    protected $domain;

    /**
     * The webhook data.
     *
     * @var object
     */
    protected $data;

    /**
     * Create a new job instance.
     *
     * @param string   $domain The shop domain.
     * @param stdClass $data   The webhook data (JSON decoded).
     *
     * @return void
     */
    public function __construct(string $domain, stdClass $data)
    {
        $this->domain = $domain;
        $this->data = $data;
    }

    /**
     * Execute the job.
     *
     * @param IShopCommand $shopCommand The commands for shops.
     * @param IShopQuery   $shopQuery   The querier for shops.
     *
     * @return bool
     */
    public function handle(
        IShopCommand $shopCommand,
        IShopQuery $shopQuery
    ): bool {
        // Convert the domain
        $this->domain = ShopDomain::fromNative($this->domain);

        // Get the shop
        $shop = $shopQuery->getByDomain($this->domain);
        $user = User::where('name', $shop->name)->first();

        if ($user) {
            // Set user as not synced
            $user->product_sync = false;
            $user->order_sync = false;
            $user->save();

            // Delete user's links and related data
            Link::where('user_id', $user->id)->get()->each(function ($link) {
                // Delete popup messages
                $link->popupMessage()->delete();
                // Delete linked variants
                $link->linkedVariants()->delete();
            });
            Link::where('user_id', $user->id)->delete();


            // Delete products and their variants/media
            Product::where('user_id', $user->id)->with(['variants', 'media'])->get()->each(function ($product) {
                $product->variants()->delete();
                $product->media()->delete();
            });
            Product::where('user_id', $user->id)->delete();

            // Delete settings
            Setting::where('user_id', $user->id)->delete();
        }

        $shopId = $shop->getId();

        // Purge shop of token, plan, etc.
        $shopCommand->clean($shopId);

        // Check freemium mode
        if (Util::getShopifyConfig('billing_freemium_enabled') === true) {
            // Add the freemium flag to the shop
            $shopCommand->setAsFreemium($shopId);
        }

        // Soft delete the shop.
        $shopCommand->softDelete($shopId);
        Log::info("Shop with ID  has been soft deleted.");

        event(new AppUninstalledEvent($shop));

        return true;
    }
}
