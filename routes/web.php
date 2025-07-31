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
    Route::get('/search', [DashboardController::class, 'orderSeacrhfilter'])->name('search');
    Route::get('/allProducts', [ProductController::class, 'getProducts'])->name('products.all');
    Route::post('/links/save', [LinkController::class, 'saveLink'])->name('products.save');
    Route::get('/links/get', [LinkController::class, 'getLinks'])->name('links.get');
    Route::get('/links/{id}/edit', [LinkController::class, 'edit'])->name('links.edit');
    Route::put('/links/{id}/update', [LinkController::class, 'update'])->name('links.update');
    Route::delete('/links/{id}/delete', [LinkController::class, 'destroy'])->name('links.delete');
});

require __DIR__ . '/auth.php';
