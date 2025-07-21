<?php

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
    Route::get('/search', [DashboardController::class, 'orderSeacrhfilter'])->name('search');

});

require __DIR__ . '/auth.php';
