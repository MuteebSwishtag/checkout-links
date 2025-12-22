<?php

namespace App\Jobs;

use App\Models\User;
use App\Http\Traits\ResponseTrait;
use App\Http\Traits\ShopifyProductTrait;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use App\Repositories\Product\ProductRepositoryInterface;

class ProductSyncJob implements ShouldQueue
{
    use Queueable, ShopifyProductTrait, ResponseTrait;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 600;
     // 10 minutes
    public $tries = 3;

    /**
     * Create a new job instance.
     */

    protected $userId;
    protected $minutes;

    /**
     * @param int $userId The user ID to sync products for
     * @param int|null $minutes If provided, only sync products updated in the last X minutes (incremental sync)
     */
    public function __construct($userId, $minutes = null)
    {
        $this->userId = $userId;
        $this->minutes = $minutes;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $this->getProductRepository(app(ProductRepositoryInterface::class));

        // If userId is null, sync all users
        if ($this->userId === null) {
            $users = User::all();
            $syncType = $this->minutes ? "Incremental ({$this->minutes} minutes)" : "Full";
            $this->logInfo("{$syncType} product sync started for all users. Total users: " . $users->count());

            foreach ($users as $user) {
                $this->logInfo("{$syncType} product sync started for user: " . $user->name);

                if ($this->getProductsFromShopify($user, $this->minutes)) {
                    // Update last sync timestamp
                    $user->last_product_sync = now();
                    $user->save();
                    $this->logInfo("{$syncType} product sync completed successfully for user: " . $user->name);
                } else {
                    \Illuminate\Support\Facades\Log::error("{$syncType} product sync failed for user: " . $user->name);
                }
            }

            $this->logInfo("{$syncType} product sync completed for all users.");
            return;
        }

        // Single user sync
        $user = User::find($this->userId);

        if (!$user) {
            \Illuminate\Support\Facades\Log::error('User not found with ID: ' . $this->userId);
            return;
        }

        $syncType = $this->minutes ? "Incremental ({$this->minutes} minutes)" : "Full";
        $this->logInfo("{$syncType} product sync started for user: " . $user->name);

        if ($this->getProductsFromShopify($user, $this->minutes)) {
            // Update last sync timestamp
            $user->last_product_sync = now();
            $user->save();

            $this->logInfo("{$syncType} product sync completed successfully for user ID: " . $this->userId);
        } else {
            \Illuminate\Support\Facades\Log::error("{$syncType} product sync failed for user ID: " . $this->userId);
        }
    }
}
