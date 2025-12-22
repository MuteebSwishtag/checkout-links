<?php

/**
 * PRODUCT SYNC - QUICK REFERENCE EXAMPLES
 * 
 * How to use the new incremental sync functionality in your existing code
 */

namespace App\Examples;

use App\Jobs\ProductSyncJob;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class ProductSyncExamples
{
    /**
     * Example 1: Dispatch Full Sync (Original Behavior)
     * Use this for initial sync or complete refresh
     */
    public function fullSyncExample()
    {
        $userId = 1;
        
        // This behaves exactly like your original code
        ProductSyncJob::dispatch($userId);
        
        Log::info("Full product sync dispatched for user: {$userId}");
    }

    /**
     * Example 2: Dispatch 10-Minute Incremental Sync
     * Use this for frequent updates (recommended for scheduled jobs)
     */
    public function incrementalSync10Minutes()
    {
        $userId = 1;
        
        // Only sync products updated in last 10 minutes
        ProductSyncJob::dispatch($userId, 10);
        
        Log::info("10-minute incremental sync dispatched for user: {$userId}");
    }

    /**
     * Example 3: Dispatch 30-Minute Incremental Sync
     * Use this for less frequent but broader incremental updates
     */
    public function incrementalSync30Minutes()
    {
        $userId = 1;
        
        // Only sync products updated in last 30 minutes
        ProductSyncJob::dispatch($userId, 30);
        
        Log::info("30-minute incremental sync dispatched for user: {$userId}");
    }

    /**
     * Example 4: Smart Sync - Auto-decide Full vs Incremental
     * Based on last sync time
     */
    public function smartSync($userId)
    {
        $user = User::find($userId);
        
        if (!$user) {
            Log::error("User not found: {$userId}");
            return;
        }
        
        // If never synced or last sync was more than 1 hour ago, do full sync
        if (!$user->last_product_sync || 
            $user->last_product_sync->diffInMinutes(now()) > 60) {
            Log::info("Performing FULL sync for user: {$userId}");
            ProductSyncJob::dispatch($userId);
        } else {
            // Otherwise, do incremental sync for last 10 minutes
            Log::info("Performing INCREMENTAL sync for user: {$userId}");
            ProductSyncJob::dispatch($userId, 10);
        }
    }

    /**
     * Example 5: Batch Sync for Multiple Users
     * Useful for scheduled tasks
     */
    public function batchSyncAllUsers($incremental = true)
    {
        $users = User::all();
        
        foreach ($users as $user) {
            if ($incremental) {
                // Incremental sync for all users
                ProductSyncJob::dispatch($user->id, 10)->delay(now()->addSeconds(5));
            } else {
                // Full sync for all users
                ProductSyncJob::dispatch($user->id)->delay(now()->addSeconds(10));
            }
        }
        
        $syncType = $incremental ? 'incremental' : 'full';
        Log::info("Batch {$syncType} sync dispatched for " . count($users) . " users");
    }

    /**
     * Example 6: Sync with Custom Time Window
     * Flexible time window based on your needs
     */
    public function customTimeWindowSync($userId, $minutes)
    {
        // Sync products updated in last $minutes
        ProductSyncJob::dispatch($userId, $minutes);
        
        Log::info("Custom {$minutes}-minute sync dispatched for user: {$userId}");
    }

    /**
     * Example 7: Controller Method for API Endpoint
     * Add this to your ProductController or similar
     */
    public function syncProductsEndpoint(\Illuminate\Http\Request $request)
    {
        $user = auth()->user();
        $syncType = $request->input('type', 'incremental'); // 'full' or 'incremental'
        $minutes = $request->input('minutes', 10); // default 10 minutes
        
        if ($syncType === 'full') {
            ProductSyncJob::dispatch($user->id);
            $message = 'Full product sync initiated';
        } else {
            ProductSyncJob::dispatch($user->id, $minutes);
            $message = "Incremental product sync initiated (last {$minutes} minutes)";
        }
        
        return response()->json([
            'success' => true,
            'message' => $message,
            'last_sync' => $user->last_product_sync
        ]);
    }

    /**
     * Example 8: Check Last Sync Status
     */
    public function checkLastSync($userId)
    {
        $user = User::find($userId);
        
        if (!$user) {
            return ['error' => 'User not found'];
        }
        
        if (!$user->last_product_sync) {
            return [
                'status' => 'never_synced',
                'message' => 'Products have never been synced for this user',
                'recommendation' => 'Run full sync'
            ];
        }
        
        $minutesSinceLastSync = $user->last_product_sync->diffInMinutes(now());
        
        if ($minutesSinceLastSync > 60) {
            return [
                'status' => 'outdated',
                'last_sync' => $user->last_product_sync,
                'minutes_ago' => $minutesSinceLastSync,
                'recommendation' => 'Run full sync'
            ];
        } else {
            return [
                'status' => 'up_to_date',
                'last_sync' => $user->last_product_sync,
                'minutes_ago' => $minutesSinceLastSync,
                'recommendation' => 'Use incremental sync'
            ];
        }
    }

    /**
     * Example 9: Schedule in Laravel Task Scheduler
     * Add this to app/Console/Kernel.php in schedule() method
     */
    public function scheduleExample()
    {
        /* Add to app/Console/Kernel.php:

        protected function schedule(Schedule $schedule)
        {
            // Run incremental sync every 10 minutes for all active users
            $schedule->call(function () {
                $users = User::where('status', 'active')->get();
                foreach ($users as $user) {
                    ProductSyncJob::dispatch($user->id, 10);
                }
            })->everyTenMinutes();

            // Run full sync once daily at 2 AM
            $schedule->call(function () {
                $users = User::where('status', 'active')->get();
                foreach ($users as $user) {
                    ProductSyncJob::dispatch($user->id);
                }
            })->dailyAt('02:00');
        }

        */
    }

    /**
     * Example 10: Test Sync in Tinker
     */
    public function tinkerExamples()
    {
        /* Run in php artisan tinker:

        // Full sync
        \App\Jobs\ProductSyncJob::dispatch(1);

        // Incremental sync (10 minutes)
        \App\Jobs\ProductSyncJob::dispatch(1, 10);

        // Check last sync time
        $user = \App\Models\User::find(1);
        $user->last_product_sync;

        // Minutes since last sync
        $user->last_product_sync->diffInMinutes(now());
 
        */
    }
}
