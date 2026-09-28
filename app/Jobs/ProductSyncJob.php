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
    public $timeout = 900; // 15 minutes (increased from 10 to allow for retries)
    public $tries = 3;
    
    /**
     * Maximum number of sync retries if count mismatch detected
     * @var int
     */
    private $maxSyncRetries = 2;
    
    /**
     * Delay in seconds before retrying sync (allows Shopify bulk operations to complete)
     * @var int
     */
    private $retryDelay = 30; // 30 seconds between retries
    
    /**
     * Maximum consecutive network failures before aborting the entire job
     * This prevents wasting time when there's a systemic network issue
     * @var int
     */
    private $maxConsecutiveNetworkFailures = 3;
    
    /**
     * Counter for consecutive network failures across users
     * @var int
     */
    private $consecutiveNetworkFailures = 0;
    
    /**
     * Test DNS resolution for a Shopify domain
     * This helps warm up the DNS cache and detect issues early
     * 
     * @param string $domain The Shopify domain to test
     * @return bool True if DNS resolves successfully, false otherwise
     */
    private function testDnsResolution(string $domain): bool
    {
        try {
            $this->logInfo("Testing DNS resolution for {$domain}...");
            $ip = gethostbyname($domain);
            
            // gethostbyname returns the input string if resolution fails
            if ($ip === $domain) {
                $this->logInfo("⚠ DNS resolution failed for {$domain}");
                return false;
            }
            
            $this->logInfo("✓ DNS resolved {$domain} to {$ip}");
            return true;
        } catch (\Exception $e) {
            $this->logInfo("⚠ DNS test exception for {$domain}: " . $e->getMessage());
            return false;
        }
    }

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
        // Install/manual syncs use 'top' queue (highest priority)
        // Batch syncs override to 'high' queue at dispatch time
        $this->onQueue('top');
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $this->getProductRepository(app(ProductRepositoryInterface::class));

        // If userId is null, sync all users
        if ($this->userId === null) {
            $users = User::where("deleted_at", null)->get();
            $syncType = $this->minutes ? "Incremental ({$this->minutes} minutes)" : "Full";
            $this->logInfo("{$syncType} product sync started for all users. Total users: " . $users->count());

            foreach ($users as $index => $user) {
                // Check if we've hit too many consecutive network failures (systemic issue)
                if ($this->consecutiveNetworkFailures >= $this->maxConsecutiveNetworkFailures) {
                    \Illuminate\Support\Facades\Log::error(
                        "Aborting {$syncType} product sync: {$this->consecutiveNetworkFailures} consecutive network failures detected. " .
                        "This indicates a systemic network issue (DNS/connectivity). Processed {$index}/{$users->count()} users before abort."
                    );
                    return; // Exit the job early to avoid wasting time
                }
                
                try {
                    // Skip partner development stores
                    if ($this->isPartnerDevelopmentStore($user)) {
                        $this->logInfo("Skipping partner development store: {$user->name}");
                        continue;
                    }
                    $this->syncUserWithRetries($user, $syncType);
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error("Error syncing user {$user->name}: " . $e->getMessage());
                }
                
                // Add a delay between users to prevent DNS thread exhaustion
                // This helps avoid "getaddrinfo() thread failed to start" errors
                if ($index < $users->count() - 1) {
                    usleep(500000); // 500ms delay between users (increased from 100ms)
                }
                
                // Add a longer pause every 20 users to allow DNS thread pool to recover
                if (($index + 1) % 20 === 0) {
                    $this->logInfo("Processed {$index}/{$users->count()} users. Pausing for DNS thread pool recovery...");
                    sleep(2); // 2 second pause every 20 users
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

        // Skip partner development stores
        if ($this->isPartnerDevelopmentStore($user)) {
            $this->logInfo("Skipping partner development store: {$user->name}");
            return;
        }

        $syncType = $this->minutes ? "Incremental ({$this->minutes} minutes)" : "Full";
        $this->syncUserWithRetries($user, $syncType);
    }
    
    /**
     * Check if the user's shop is a partner development store
     * 
     * @param User $user The user to check
     * @return bool True if partner development store, false otherwise
     */
    private function isPartnerDevelopmentStore(User $user): bool
    {
        // Skip dev store check for user 353
        
            return false;
        

        try {
            $query = <<<QUERY
                query CheckStorePlan {
                    shop {
                        id
                        name
                        myshopifyDomain
                        plan {
                            displayName
                            partnerDevelopment
                            shopifyPlus
                        }
                    }
                }
            QUERY;
            
            $result = $user->api()->graph($query);
            $result = $this->arrayToObject($result);
            
            if (isset($result->errors) && $result->errors) {
                \Illuminate\Support\Facades\Log::warning("GraphQL errors checking store plan for user {$user->name}: " . json_encode($result->errors));
                return false; // Default to processing if we can't check
            }
            
            $partnerDevelopment = $result->body->data->shop->plan->partnerDevelopment ?? false;
            
            if ($partnerDevelopment) {
                $this->logInfo("Store {$user->name} is a partner development store (Plan: " . ($result->body->data->shop->plan->displayName ?? 'Unknown') . ")");
            }
            
            // Reset consecutive network failures on successful API call
            $this->consecutiveNetworkFailures = 0;
            
            return (bool) $partnerDevelopment;
        } catch (\GuzzleHttp\Exception\ConnectException $e) {
            // Increment consecutive network failures counter
            $this->consecutiveNetworkFailures++;
            \Illuminate\Support\Facades\Log::warning("Network error checking store plan for user {$user->name}: " . $e->getMessage());
            return false; // Default to processing if network error
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Error checking store plan for user {$user->name}: " . $e->getMessage());
            return false; // Default to processing if any error
        }
    }
    
    /**
     * Sync products for a user with retry mechanism
     * 
     * @param User $user The user to sync
     * @param string $syncType Type of sync (Full or Incremental)
     */
    private function syncUserWithRetries(User $user, string $syncType): void
    {
        $this->logInfo("{$syncType} product sync started for user: " . $user->name);
        
        // Add initial warmup delay to allow DNS thread pool recovery
        // This is critical when DNS resolver is under heavy load
        sleep(1);
        
        // Test DNS resolution before attempting sync
        // This helps identify DNS issues early and warms up the DNS cache
        if (!$this->testDnsResolution($user->name)) {
            $this->logInfo("⚠ DNS pre-check failed for {$user->name}. Waiting 10s before proceeding...");
            sleep(10); // Give DNS more time to recover
            
            // Try one more time
            if (!$this->testDnsResolution($user->name)) {
                \Illuminate\Support\Facades\Log::error("DNS resolution failed for {$user->name} after warmup. Skipping sync.");
                return;
            }
        }
        
        $retryCount = 0;
        $syncSuccess = false;
        $maxNetworkRetries = 5; // Increased from 3 to 5 for better DNS recovery
        
        while ($retryCount <= $this->maxSyncRetries && !$syncSuccess) {
            if ($retryCount > 0) {
                $this->logInfo("Retry attempt {$retryCount}/{$this->maxSyncRetries} for user: {$user->name} after {$this->retryDelay} seconds delay");
                sleep($this->retryDelay); // Wait for Shopify bulk operations to complete
            }
            
            // Get expected count before sync with network error handling
            $expectedCount = 0;
            $dbCountBefore = $this->product->getByUserId($user->id)->count();
            
            for ($networkRetry = 0; $networkRetry < $maxNetworkRetries; $networkRetry++) {
                try {
                    $expectedCount = $this->getProductsCountFromShopify($user);
                    // Reset consecutive network failures on success
                    $this->consecutiveNetworkFailures = 0;
                    break; // Success, exit retry loop
                } catch (\GuzzleHttp\Exception\ConnectException $e) {
                    // Handle DNS/network errors (cURL error 6, etc.)
                    $this->logInfo("Network error (attempt {$networkRetry}/{$maxNetworkRetries}) for user {$user->name}: " . $e->getMessage());
                    if ($networkRetry < $maxNetworkRetries - 1) {
                        // Aggressive exponential backoff for DNS thread pool recovery
                        // Using longer delays: 5s, 10s, 20s, 40s
                        $sleepTime = 5 * pow(2, $networkRetry);
                        $this->logInfo("Waiting {$sleepTime}s for DNS thread pool recovery before retry...");
                        sleep($sleepTime);
                    } else {
                        // Increment consecutive network failures counter
                        $this->consecutiveNetworkFailures++;
                        \Illuminate\Support\Facades\Log::error("Max network retries reached for user {$user->name}. Skipping this user.");
                        return; // Skip this user and move to the next
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error("Unexpected error getting product count for user {$user->name}: " . $e->getMessage());
                    return; // Skip this user
                }
            }
            
            $this->logInfo("User: {$user->name} - Expected products in Shopify: {$expectedCount}, Current in DB: {$dbCountBefore}");
            
            if ($this->getProductsFromShopify($user, $this->minutes)) {
                // Verify the sync was complete
                $dbCountAfter = $this->product->getByUserId($user->id)->count();
                
                // For full sync, verify we have all products
                if (!$this->minutes) {
                    if ($dbCountAfter >= $expectedCount) {
                        $this->logInfo("✓ Sync verified: DB has {$dbCountAfter} products, Shopify has {$expectedCount}");
                        $syncSuccess = true;
                    } else {
                        $missing = $expectedCount - $dbCountAfter;
                        $this->logInfo("⚠ Incomplete sync: DB has {$dbCountAfter}, Shopify has {$expectedCount}, Missing: {$missing}");
                        
                        // Check if this is the last retry
                        if ($retryCount >= $this->maxSyncRetries) {
                            \Illuminate\Support\Facades\Log::warning("Max retries reached for user {$user->name}. {$missing} products may still be processing in Shopify bulk operations.");
                            $syncSuccess = true; // Mark as success to update timestamp and move on
                        }
                    }
                } else {
                    // Incremental sync - always mark as success
                    $syncSuccess = true;
                }
                
                // Update last sync timestamp if successful
                if ($syncSuccess) {
                    $user->last_product_sync = now();
                    $user->save();
                    $this->logInfo("{$syncType} product sync completed successfully for user: " . $user->name);
                }
            } else {
                \Illuminate\Support\Facades\Log::error("{$syncType} product sync failed for user: " . $user->name);
            }
            $retryCount++;
        }
    }
}
