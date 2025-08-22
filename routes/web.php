<?php

use App\Http\Controllers\LinkController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DashboardController;
use Inertia\Inertia;

Route::group(['middleware' => ['verify.embedded', 'verify.shopify']], function () {

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
    Route::get('/search', [DashboardController::class, 'orderSeacrhfilter'])->name('search');
    Route::get('/allProducts', [ProductController::class, 'getProducts'])->name('products.all');
    Route::post('/links/save', [LinkController::class, 'saveLink'])->name('products.save');
    Route::get('/links/get', [LinkController::class, 'getLinks'])->name('links.get');
    Route::get('/links/generate-unique-id', [LinkController::class, 'generateUniqueId'])->name('links.generateUniqueId');
    // Route::get('/links/decrypt/{encryptedId}', [LinkController::class, 'decryptLinkId'])->name('links.decrypt');
    Route::get('/links/{id}/edit', [LinkController::class, 'edit'])->name('links.edit');
    Route::put('/links/{id}/update', [LinkController::class, 'update'])->name('links.update');
    Route::delete('/links/{id}/delete', [LinkController::class, 'destroy'])->name('links.delete');
    Route::post('/settings/save', [ProductController::class, 'save'])
        ->name('settings.save');
});

// Public debug routes for testing - no authentication required
Route::get('/debug/link/{id}', [LinkController::class, 'getLinkData']);
Route::get('/debug/test', function () {
    return response()->json(['success' => true, 'message' => 'Debug route is working']);
});

// Route::get('/checkout', function () {
//     Log::info('Checkout route accessed');
// })->name('checkout');
Route::get('/checkout/{id}', [LinkController::class, 'openCheckout'])->name('checkout.handle');

require __DIR__ . '/auth.php';
