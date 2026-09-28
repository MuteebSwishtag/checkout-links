<?php

use App\Http\Controllers\LinkController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DashboardController;
use Inertia\Inertia;
use Osiset\ShopifyApp\Contracts\Queries\Shop;
use Osiset\ShopifyApp\Messaging\Jobs\WebhookInstaller;
use Osiset\ShopifyApp\Objects\Values\ShopDomain;
use Osiset\ShopifyApp\Util;
use App\Models\User;
use App\Http\Controllers\AppProxyController;


Route::group(['middleware' => ['verify.embedded', 'verify.shopify','billable']], function () {

    Route::get('/', [DashboardController::class, 'index'])->name('home');
    // Route::get('/products-approvals', inertia('Products/Approvals'))->name('products.approvals');
      Route::get('/links', function () {
        return Inertia::render('Embedded/Links/Links');
    })->name('links');
    Route::get('/links/create', function () {
        return Inertia::render('Embedded/Links/CreateLink');
    })->name('links.create');
    Route::get('/how-it-works', function () {
        return Inertia::render('Embedded/HowItWorks');
    })->name('how-it-works');
    Route::get('/settings', function () {
        return Inertia::render('Embedded/Settings');
    })->name('settings');
    Route::get('/plans', function () {
        abort_unless(auth()->user()->isFreemium() === false, 403);

        return Inertia::render('Embedded/Plans');
    })->name('plans');
    Route::get('/search', [DashboardController::class, 'orderSeacrhfilter'])->name('search');
    Route::get('/theme-status', [DashboardController::class, 'theme_setting_status'])->name('theme.status');
    Route::get('/api/theme-status-check', [DashboardController::class, 'checkThemeStatus'])->name('theme.status.check');
    Route::get('/allProducts', [ProductController::class, 'getProducts'])->name('products.all');
    Route::post('/products/sync', [ProductController::class, 'syncProducts'])->name('products.sync');
    Route::post('/links/save', [LinkController::class, 'saveLink'])->name('products.save');
    Route::get('/links/get', [LinkController::class, 'getLinks'])->name('links.get');
    Route::get('/links/generate-unique-id', [LinkController::class, 'generateUniqueId'])->name('links.generateUniqueId');
    // Route::get('/links/decrypt/{encryptedId}', [LinkController::class, 'decryptLinkId'])->name('links.decrypt');
    Route::get('/links/{id}/edit', [LinkController::class, 'edit'])->name('links.edit');
    Route::put('/links/{id}/update', [LinkController::class, 'update'])->name('links.update');
    Route::delete('/links/{id}/delete', [LinkController::class, 'destroy'])->name('links.delete');
    Route::post('/settings/save', [ProductController::class, 'save'])->name('settings.save');
    

    // Route to fetch settings for the current user
    Route::get('/settings/get', [ProductController::class, 'settingsGet'])->name('settings.get');
    Route::get('/settings/app-block/get', [DashboardController::class, 'getAppBlock'])->name('settings.app-block.get');
    Route::post('/settings/app-block/enable', [DashboardController::class, 'enableAppBlock'])->name('settings.app-block.enable');
});

// Public debug routes for testing - no authentication required
Route::get('/debug/link/{id}', [LinkController::class, 'getLinkData']);
Route::get('/debug/test', function () {
    return response()->json(['success' => true, 'message' => 'Debug route is working']);
});

// Protected sync routes - require API token and rate limiting
Route::middleware(['verify.sync', 'throttle:10,1440'])->group(function () {
    Route::get('/batchSyncAllUsers', [ProductController::class, 'batchSyncAllUsers'])->name('batch.sync.all.users');
    Route::get('/allUsersSync', [ProductController::class, 'allUsersSync'])->name('all.users.sync');
});

// Route::get('/checkout', function () {
//     Log::info('Checkout route accessed');
// })->name('checkout');
Route::get('/checkout/{id}', [LinkController::class, 'openCheckoutLink'])->name('checkout.handle');
Route::get('/links/reactivate-all/{id}', [LinkController::class, 'reactivateAllLinks'])->name('links.reactivateAll');

// Reinstall webhooks for all users (excludes role_id filtering)
Route::get('/jobs-result2', function (Shop $shopModel) {

    $results = [];

    $users = User::all();

    foreach ($users as $user) {
        try {
            $shopName = ShopDomain::fromNative($user->name);
            $shop = $shopModel->getByDomain($shopName);

            if (!$shop) {
                $results[] = [
                    'user_id' => $user->id,
                    'status' => 'failed',
                    'message' => 'Shop not found'
                ];
                continue;
            }

            $shopId = $shop->getId();

            // Dispatch webhook installation job
            WebhookInstaller::dispatch(
                $shopId,
                Util::getShopifyConfig('webhooks')
            );

            $results[] = [
                'user_id' => $user->id,
                'status' => 'success',
                'message' => 'Webhook reinstalled'
            ];

        } catch (\Exception $e) {
            $results[] = [
                'user_id' => $user->id,
                'status' => 'error',
                'message' => $e->getMessage()
            ];
        }
    }

    return response()->json([
        'success' => true,
        'total_users' => $users->count(),
        'results' => $results
    ]);
});

Route::get('/CheckoutLinksProxy', [AppProxyController::class, 'index'])->middleware('auth.proxy');


require __DIR__ . '/auth.php';
