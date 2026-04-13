<?php

namespace App\Jobs;

use App\Models\User;
use App\Http\Traits\ResponseTrait;
use App\Http\Traits\ShopifyOrderTrait;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use App\Repositories\Order\OrderRepositoryInterface;

class OrderSyncJob implements ShouldQueue
{
    use Queueable, ShopifyOrderTrait, ResponseTrait;

    /**
     * Create a new job instance.
     */

    protected $userId;
    protected $minutes;

    /**
     * @param int $userId The user ID to sync orders for
     * @param int|null $minutes If provided, only sync orders updated in the last X minutes (incremental sync)
     */
    public function __construct($userId, $minutes = null)
    {
        $this->userId = $userId;
        $this->minutes = $minutes;
        // Sync jobs use 'top' queue for highest priority
        $this->onQueue('top');
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $this->getOrderRepository(app(OrderRepositoryInterface::class));

        // If userId is null, sync all users
        if ($this->userId === null) {
            $users = User::all();
            $syncType = $this->minutes ? "Incremental ({$this->minutes} minutes)" : "Full";
            $this->logInfo("{$syncType} order sync started for all users. Total users: " . $users->count());

            foreach ($users as $user) {
                $this->logInfo("{$syncType} order sync started for user: " . $user->name);

                if ($this->getOrdersFromShopify($user, $this->minutes)) {
                    // Update last sync timestamp
                    $user->last_order_sync = now();
                    $user->save();
                    $this->logInfo("{$syncType} order sync completed successfully for user: " . $user->name);
                } else {
                    \Illuminate\Support\Facades\Log::error("{$syncType} order sync failed for user: " . $user->name);
                }
            }

            $this->logInfo("{$syncType} order sync completed for all users.");
            return;
        }

        // Single user sync
        $user = User::find($this->userId);

        if (!$user) {
            \Illuminate\Support\Facades\Log::error('User not found with ID: ' . $this->userId);
            return;
        }

        $syncType = $this->minutes ? "Incremental ({$this->minutes} minutes)" : "Full";
        $this->logInfo("{$syncType} order sync started for user: " . $user->name);

        if ($this->getOrdersFromShopify($user, $this->minutes)) {
            // Update last sync timestamp
            $user->last_order_sync = now();
            $user->save();

            $this->logInfo("{$syncType} order sync completed successfully for user ID: " . $this->userId);
        } else {
            \Illuminate\Support\Facades\Log::error("{$syncType} order sync failed for user ID: " . $this->userId);
        }
    }
}
